/**
 * Public surface of the translator.
 *
 * The UI only needs three things:
 *   parse(text, sourceShell)   -> tree, computed once per keystroke
 *   render(tree, targetShell)  -> text for one of the other windows
 *   translate(text, from, to)  -> both of the above, handy for tests/scripts
 *
 * Keeping parse and render apart is what lets N windows share one parse: the
 * tree is shell independent (ids plus the raw text the user typed).
 */

export { parse } from "./parser.js";
export { render } from "./renderer.js";
export { tokenize, OPERATORS, WRITTEN_PLACEHOLDER } from "./tokenizer.js";
export {
    getCommand,
    getCommandWord,
    getFlagToken,
    isKnownShell,
    languages,
    shellNames,
} from "./dictionary.js";

import { parse } from "./parser.js";
import { render } from "./renderer.js";

/** Convenience wrapper: text in `fromShell` -> text in `toShell`. */
export function translate(text, fromShell, toShell) {
    return render(parse(text, fromShell), toShell);
}
