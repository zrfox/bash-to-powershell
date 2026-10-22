/**
 * parser.js
 *
 * Turns the token stream into a small, shell independent tree that the
 * renderer can replay into any other shell.
 *
 *   parse("ls -la | grep -n foo", "bash")
 *     -> { shell: "bash", source: "...", items: [
 *            { type: "segment", commandId: "list-directory", nodes: [...] },
 *            { type: "operator", value: "|" },
 *            { type: "segment", commandId: "search-text",   nodes: [...] } ] }
 *
 * Rules implemented here (these are the product rules, kept in one place):
 *   1. A segment is the run of words between two separators.
 *   2. The command is the first token in the segment that the *source* shell
 *      knows, by primary name or alias. Tokens before it produce no output,
 *      and a segment with no known command produces no output at all.
 *   3. A token that does not start with a flag prefix is an argument and is
 *      passed through unchanged (quotes included).
 *   4. A token that does start with a flag prefix is resolved against the
 *      current command's own flags. Bundled short flags (`-la`) are expanded
 *      only for shells that allow bundling, and only when every letter is a
 *      flag of that command; otherwise the whole token is unknown.
 *   5. Anything flag-shaped that cannot be resolved becomes an unknown-flag
 *      node, which the renderer prints as `<unknown flag: TOKEN>`.
 */

import {
    expandBundledFlags,
    isKnownShell,
    looksLikeFlag,
    lookupCommandId,
    lookupFlagId,
} from "./dictionary.js";
import { TOKEN_OPERATOR, tokenize } from "./tokenizer.js";

export const NODE_COMMAND = "command";
export const NODE_FLAG = "flag";
export const NODE_UNKNOWN_FLAG = "unknownFlag";
export const NODE_ARGUMENT = "argument";

export const ITEM_SEGMENT = "segment";
export const ITEM_OPERATOR = "operator";

function emptySegment() {
    return { type: ITEM_SEGMENT, commandId: null, nodes: [] };
}

/**
 * @param {string} input raw text of the window being typed in
 * @param {string} shell id of that window's shell ("bash", "powershell", ...)
 * @returns {{shell: string, source: string, items: Array}}
 */
export function parse(input, shell) {
    const source = typeof input === "string" ? input : "";
    const items = [];

    if (!isKnownShell(shell)) return { shell, source, items };

    let segment = emptySegment();

    for (const token of tokenize(source, shell)) {
        if (token.type === TOKEN_OPERATOR) {
            items.push(segment, { type: ITEM_OPERATOR, value: token.value });
            segment = emptySegment();
            continue;
        }
        addWord(segment, token, shell);
    }

    items.push(segment);
    return { shell, source, items };
}

function addWord(segment, token, shell) {
    const raw = token.value;

    // Rule 2: still hunting for the command that gives the rest of the segment
    // its meaning. Unknown leading words (sudo, time, a typo...) are dropped.
    if (segment.commandId === null) {
        const commandId = lookupCommandId(raw, shell);
        if (commandId) {
            segment.commandId = commandId;
            segment.nodes.push({ type: NODE_COMMAND, id: commandId, raw });
        }
        return;
    }

    // Rule 3: quoted text is never a flag, even when it starts with a dash, and
    // a placeholder this tool printed earlier travels back unchanged.
    if (token.quoted || token.placeholder || !looksLikeFlag(raw, shell)) {
        segment.nodes.push({ type: NODE_ARGUMENT, raw });
        return;
    }

    // Rule 4: resolve the flag inside this command only.
    const flagId = lookupFlagId(segment.commandId, raw, shell);
    if (flagId) {
        segment.nodes.push({ type: NODE_FLAG, id: flagId, commandId: segment.commandId, raw });
        return;
    }

    const bundled = expandBundledFlags(segment.commandId, raw, shell);
    if (bundled) {
        for (const id of bundled) {
            segment.nodes.push({ type: NODE_FLAG, id, commandId: segment.commandId, raw, bundledIn: raw });
        }
        return;
    }

    // Rule 5.
    segment.nodes.push({ type: NODE_UNKNOWN_FLAG, raw });
}
