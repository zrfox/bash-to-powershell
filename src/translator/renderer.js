/**
 * renderer.js
 *
 * Replays a parse tree into a target shell.
 *
 * Placeholders (the honest part of the tool - a translation that cannot be
 * made is shown, never silently dropped):
 *   <no TARGET equivalent: FLAG-ID>   recognised flag, target shell has none
 *   <no TARGET equivalent: COMMAND-ID> recognised command, target shell has none
 *   <unknown flag: TOKEN>             flag-shaped token the source command
 *                                     does not define
 *
 * Separator spacing follows the way the separators are normally written:
 *   `;` hugs the word before it, `|`, `&&`, `||` and `&` get a space on each
 *   side, and a newline stays a newline. A separator next to a segment that
 *   produced no output is dropped, so `foo -x | ls -a` does not leave a
 *   dangling pipe.
 */

import { getCommandWord, getFlagToken, isKnownShell } from "./dictionary.js";
import {
    ITEM_OPERATOR,
    NODE_ARGUMENT,
    NODE_COMMAND,
    NODE_FLAG,
    NODE_UNKNOWN_FLAG,
} from "./parser.js";

const noEquivalent = (shell, id) => `<no ${shell} equivalent: ${id}>`;
const unknownFlag = raw => `<unknown flag: ${raw}>`;

function renderNode(node, targetShell) {
    switch (node.type) {
        case NODE_COMMAND:
            return getCommandWord(node.id, targetShell) ?? noEquivalent(targetShell, node.id);
        case NODE_FLAG:
            return getFlagToken(node.commandId, node.id, targetShell) ?? noEquivalent(targetShell, node.id);
        case NODE_UNKNOWN_FLAG:
            return unknownFlag(node.raw);
        case NODE_ARGUMENT:
            return node.raw;
        default:
            return "";
    }
}

function renderSegment(segment, targetShell) {
    return segment.nodes
        .map(node => renderNode(node, targetShell))
        .filter(part => part.length > 0)
        .join(" ");
}

function joinWith(operator) {
    if (operator === "\n") return "\n";
    if (operator === ";") return "; ";
    return ` ${operator} `;
}

/**
 * @param {{shell: string, items: Array}} parsed tree from parse()
 * @param {string} targetShell shell to write the command line in
 * @returns {string}
 */
export function render(parsed, targetShell) {
    if (!parsed || !Array.isArray(parsed.items) || !isKnownShell(targetShell)) return "";

    let output = "";
    let pendingOperator = null;

    for (const item of parsed.items) {
        if (item.type === ITEM_OPERATOR) {
            // Remember the most recent separator; it is only written once the
            // next segment turns out to have something to say.
            if (output.length > 0) pendingOperator = item.value;
            continue;
        }

        const text = renderSegment(item, targetShell);
        if (text.length === 0) continue;

        if (output.length === 0) {
            output = text;
        } else {
            output += joinWith(pendingOperator ?? ";") + text;
        }
        pendingOperator = null;
    }

    // A trailing `|`, `&&` or `;` is either incomplete (still being typed) or
    // redundant, so it is dropped. A trailing `&` is different: it is the
    // background operator in both shells and carries meaning, so it is kept.
    if (pendingOperator === "&" && output.length > 0) output += " &";

    return output;
}
