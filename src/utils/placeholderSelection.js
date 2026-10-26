/**
 * placeholderSelection.js
 *
 * To the user a placeholder this tool wrote (`<no powershell equivalent:
 * interactive>`, `<unknown flag: -lz>`) is one thing, not forty characters.
 * Erasing takes it in one keystroke, so there is never half a placeholder left
 * behind for the other windows to translate.
 */

import { WRITTEN_PLACEHOLDER } from "../translator/index.js";

const EVERY_PLACEHOLDER = new RegExp(WRITTEN_PLACEHOLDER, "g");

/**
 * The selection Backspace/Delete should act on so that a placeholder goes as a
 * whole: a caret takes the placeholder it is inside of or right next to, and a
 * selection that cuts through placeholders grows to cover them.
 *
 * @param {string} text      text of the window being edited
 * @param {number} start     selection start (equal to `end` for a caret)
 * @param {number} end       selection end
 * @param {boolean} forward  true for Delete, false for Backspace
 * @returns {{start: number, end: number} | null} null when no placeholder is
 *          involved and the key should do what it always does
 */
export function selectionToErase(text, start, end, forward) {
    let from = start;
    let to = end;

    for (const match of text.matchAll(EVERY_PLACEHOLDER)) {
        const first = match.index;
        const last = first + match[0].length;
        const caretTouches = forward ? first <= start && start < last : first < start && start <= last;
        const touched = start === end ? caretTouches : first < end && start < last;
        if (touched) {
            from = Math.min(from, first);
            to = Math.max(to, last);
        }
    }

    return from === start && to === end ? null : { start: from, end: to };
}
