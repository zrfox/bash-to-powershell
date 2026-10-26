/**
 * tokenizer.js
 *
 * Splits a command line into words and separators.
 *
 * Scope (deliberately small - this is a quick reference tool, not a shell):
 *   - whitespace splits words
 *   - single and double quotes keep their contents together as ONE word and
 *     the quotes stay in the token, because the output window should show the
 *     line the way the user would type it
 *   - the separators are PowerShell 7's statement/pipeline separators:
 *     `|`, `&&`, `||`, `;`, `&` and a newline. Bash uses the same spellings,
 *     so one table serves both shells.
 *   - a separator inside quotes is just text (`grep -i "a | b"`)
 *   - the shell's escape character (`\` in bash, backtick in PowerShell)
 *     protects the next character from being read as a quote or separator
 *
 * Not handled on purpose: redirections (`>`, `2>&1`), subshells/grouping,
 * globs, variable expansion, here-strings, line continuations. Those tokens
 * are not treated as separators; they simply flow through as arguments.
 */

import { escapeCharOf } from "./dictionary.js";

export const TOKEN_WORD = "word";
export const TOKEN_OPERATOR = "operator";

/** PowerShell 7 separators, longest first so `&&` wins over `&`. */
export const OPERATORS = ["&&", "||", "|", ";", "&"];

const QUOTES = ["'", '"'];

/**
 * Our own output, e.g. `<no powershell equivalent: number-lines>`. When a user
 * edits a window that is showing a translation, that text becomes the new
 * source, so a placeholder has to survive the trip back as one opaque token
 * instead of being re-read as `<no`, `powershell`, ... , `-lz>`.
 */
const PLACEHOLDER = /^<[^<>\n]*>/;

/**
 * Exactly the two placeholders the renderer writes, as opposed to any other
 * `<...>` the user may have typed (`< in.txt >`). The group is the id named by
 * `<no SHELL equivalent: ID>`; `<unknown flag: TOKEN>` names none.
 */
export const WRITTEN_PLACEHOLDER = /<(?:no [^\s<>]+ equivalent: ([^<>\n]+)|unknown flag: [^<>\n]+)>/;

const isWhitespace = char => char === " " || char === "\t" || char === "\r";

function operatorAt(input, index) {
    for (const operator of OPERATORS) {
        if (input.startsWith(operator, index)) return operator;
    }
    return null;
}

/**
 * @param {string} input  raw text from an input window
 * @param {string} shell  shell the text was typed in (selects the escape char)
 * @returns {Array<{type: string, value: string, start: number, end: number,
 *                  quoted?: boolean, unterminated?: boolean,
 *                  placeholder?: boolean, placeholderId?: string}>}
 */
export function tokenize(input, shell) {
    const tokens = [];
    if (typeof input !== "string" || input.length === 0) return tokens;

    const escapeChar = escapeCharOf(shell);
    let index = 0;

    while (index < input.length) {
        const char = input[index];

        if (isWhitespace(char)) {
            index += 1;
            continue;
        }

        // A newline separates statements in both shells; keep it so the
        // translation can be laid out over the same number of lines.
        if (char === "\n") {
            tokens.push({ type: TOKEN_OPERATOR, value: "\n", start: index, end: index + 1 });
            index += 1;
            continue;
        }

        const operator = operatorAt(input, index);
        if (operator) {
            tokens.push({
                type: TOKEN_OPERATOR,
                value: operator,
                start: index,
                end: index + operator.length,
            });
            index += operator.length;
            continue;
        }

        if (char === "<") {
            const placeholder = PLACEHOLDER.exec(input.slice(index));
            if (placeholder) {
                tokens.push({
                    type: TOKEN_WORD,
                    value: placeholder[0],
                    start: index,
                    end: index + placeholder[0].length,
                    placeholder: true,
                    placeholderId: WRITTEN_PLACEHOLDER.exec(placeholder[0])?.[1],
                });
                index += placeholder[0].length;
                continue;
            }
        }

        tokens.push(readWord(input, index, escapeChar));
        index = tokens[tokens.length - 1].end;
    }

    return tokens;
}

/**
 * Reads one word starting at `start`. A word ends at unquoted whitespace, a
 * newline or the start of a separator, so `ls|grep` is three tokens while
 * `"a | b"` is one.
 */
function readWord(input, start, escapeChar) {
    let index = start;
    let quoted = false;
    let unterminated = false;

    while (index < input.length) {
        const char = input[index];

        if (escapeChar && char === escapeChar && index + 1 < input.length) {
            index += 2; // the escaped character is part of this word, whatever it is
            continue;
        }

        if (QUOTES.includes(char)) {
            quoted = true;
            const closed = readQuoted(input, index, char, escapeChar);
            index = closed.end;
            unterminated = unterminated || closed.unterminated;
            continue;
        }

        if (isWhitespace(char) || char === "\n" || operatorAt(input, index)) break;

        index += 1;
    }

    const token = {
        type: TOKEN_WORD,
        value: input.slice(start, index),
        start,
        end: index,
    };
    if (quoted) token.quoted = true;
    if (unterminated) token.unterminated = true;
    return token;
}

/**
 * Consumes a quoted run starting at the opening quote. An unterminated quote
 * (the user is still typing) swallows the rest of the line instead of throwing.
 */
function readQuoted(input, openIndex, quoteChar, escapeChar) {
    const singleQuoted = quoteChar === "'";
    let index = openIndex + 1;

    while (index < input.length) {
        const char = input[index];

        // Single quotes are literal in both shells, so escapes only apply to
        // double quoted runs.
        if (!singleQuoted && escapeChar && char === escapeChar && index + 1 < input.length) {
            index += 2;
            continue;
        }

        if (char === quoteChar) {
            // PowerShell escapes a quote by doubling it ('' or ""); bash does
            // not, but treating '' as "closed then reopened" gives the same
            // token either way, so this stays shell agnostic.
            return { end: index + 1, unterminated: false };
        }

        index += 1;
    }

    return { end: input.length, unterminated: true };
}
