import assert from "node:assert/strict";
import test from "node:test";

import { parse, render, tokenize, translate, WRITTEN_PLACEHOLDER } from "../src/translator/index.js";
import { selectionToErase } from "../src/utils/placeholderSelection.js";

const other = shell => (shell === "bash" ? "powershell" : "bash");

/* ------------------------------------------- placeholders are read back */

test("rm -i comes back from PowerShell as rm -i", () => {
    assert.equal(translate("rm -i", "bash", "powershell"), "Remove-Item <no powershell equivalent: interactive>");
    assert.equal(translate("Remove-Item <no powershell equivalent: interactive>", "powershell", "bash"), "rm -i");
});

test("a no-equivalent placeholder is translated back into the flag it names", () => {
    for (const [shell, input] of [
        ["bash", "rm -i notes.txt"],
        ["bash", "cat -n"],
        ["bash", "grep -i 'a | b' file"],
        ["bash", "ls -l -a | sort -n"],
        ["powershell", "Get-ChildItem -Force -Directory"],
        ["powershell", "Get-Content -Tail 5 log.txt"],
    ]) {
        const there = translate(input, shell, other(shell));
        assert.match(there, /<no \w+ equivalent: /, input);
        assert.equal(translate(there, other(shell), shell), input);
    }
});

test("the flag comes back in the spelling of the command it belongs to", () => {
    assert.equal(translate("Get-ChildItem <no powershell equivalent: recursive>", "powershell", "bash"), "ls -R");
    assert.equal(translate("Copy-Item <no powershell equivalent: recursive> a b", "powershell", "bash"), "cp -r a b");
});

test("only the id matters, not the shell the placeholder names", () => {
    assert.equal(translate("Remove-Item <no bash equivalent: interactive>", "powershell", "bash"), "rm -i");
    assert.equal(
        translate("rm <no powershell equivalent: interactive>", "bash", "powershell"),
        "Remove-Item <no powershell equivalent: interactive>",
    );
});

test("a shell with no spelling either prints its own placeholder, never a copy", () => {
    const parsed = parse("Remove-Item <no powershell equivalent: interactive>", "powershell");
    assert.equal(render(parsed, "cmd"), "<no cmd equivalent: remove-files> <no cmd equivalent: interactive>");
    assert.equal(render(parsed, "powershell"), "Remove-Item <no powershell equivalent: interactive>");
    // pwd has no such flag at all: still this window's own placeholder.
    assert.equal(
        translate("Get-Location <no powershell equivalent: interactive>", "powershell", "bash"),
        "pwd <no bash equivalent: interactive>",
    );
});

test("an unknown-flag placeholder and the user's own <...> still travel unchanged", () => {
    assert.equal(translate("Get-ChildItem <unknown flag: -lz> /tmp", "powershell", "bash"), "ls <unknown flag: -lz> /tmp");
    assert.equal(translate("cat < in.txt > out.txt", "bash", "powershell"), "Get-Content < in.txt > out.txt");
    assert.equal(translate("echo <b>", "bash", "powershell"), "Write-Output <b>");
});

test("a placeholder before the command is dropped like any other leading word", () => {
    assert.equal(translate("<no powershell equivalent: interactive> Remove-Item x", "powershell", "bash"), "rm x");
    assert.equal(translate("<no powershell equivalent: interactive>", "powershell", "bash"), "");
});

test("the tokenizer reports the id a placeholder names", () => {
    const [, placeholder] = tokenize("Remove-Item <no powershell equivalent: interactive>", "powershell");
    assert.equal(placeholder.placeholderId, "interactive");
    assert.equal(tokenize("<unknown flag: -lz>", "bash")[0].placeholderId, undefined);
    assert.equal(tokenize("cat < in.txt >", "bash")[1].placeholderId, undefined);
});

test("everything the renderer writes in angle brackets is a written placeholder", () => {
    const outputs = [
        translate("ls -l -z", "bash", "powershell"),
        translate("Get-ChildItem -Directory", "powershell", "bash"),
        translate("ls -a", "bash", "cmd"),
    ];
    for (const output of outputs) {
        const written = output.match(/<[^<>]*>/g);
        assert.ok(written.length > 0, output);
        for (const placeholder of written) assert.match(placeholder, WRITTEN_PLACEHOLDER);
    }
});

/* ------------------------------------------ placeholders are erased whole */

const PLACEHOLDER = "<no powershell equivalent: interactive>";
const TEXT = `Remove-Item ${PLACEHOLDER} notes.txt`;
const START = TEXT.indexOf(PLACEHOLDER);
const END = START + PLACEHOLDER.length;
const WHOLE = { start: START, end: END };

test("Backspace takes the placeholder right behind or around the caret", () => {
    assert.deepEqual(selectionToErase(TEXT, END, END, false), WHOLE);
    for (let caret = START + 1; caret < END; caret += 1) {
        assert.deepEqual(selectionToErase(TEXT, caret, caret, false), WHOLE);
    }
    // Right in front of it, or further along, Backspace is an ordinary Backspace.
    assert.equal(selectionToErase(TEXT, START, START, false), null);
    assert.equal(selectionToErase(TEXT, END + 1, END + 1, false), null);
});

test("Delete takes the placeholder right in front of or around the caret", () => {
    for (let caret = START; caret < END; caret += 1) {
        assert.deepEqual(selectionToErase(TEXT, caret, caret, true), WHOLE);
    }
    assert.equal(selectionToErase(TEXT, END, END, true), null);
    assert.equal(selectionToErase(TEXT, START - 1, START - 1, true), null);
});

test("a selection that cuts through a placeholder grows to cover it", () => {
    assert.deepEqual(selectionToErase(TEXT, 5, START + 4, false), { start: 5, end: END });
    assert.deepEqual(selectionToErase(TEXT, END - 4, END + 3, true), { start: START, end: END + 3 });
    assert.deepEqual(selectionToErase(TEXT, START + 3, START + 9, false), WHOLE);
    // A selection that already takes it whole, or misses it, is left alone.
    assert.equal(selectionToErase(TEXT, START, END, false), null);
    assert.equal(selectionToErase(TEXT, 0, TEXT.length, false), null);
    assert.equal(selectionToErase(TEXT, 0, START, false), null);
});

test("each placeholder is erased on its own, whichever kind it is", () => {
    const unknown = "<unknown flag: -lz>";
    const text = `ls ${unknown}${PLACEHOLDER}`;
    const middle = 3 + unknown.length;
    assert.deepEqual(selectionToErase(text, middle, middle, false), { start: 3, end: middle });
    assert.deepEqual(selectionToErase(text, middle, middle, true), { start: middle, end: text.length });
});

test("text that is not a written placeholder is left to the key", () => {
    assert.equal(selectionToErase("rm -i notes.txt", 5, 5, false), null);
    assert.equal(selectionToErase("cat < in.txt >", 14, 14, false), null);
    assert.equal(selectionToErase("<no powershell equivalent: interactiv", 37, 37, false), null);
    assert.equal(selectionToErase("", 0, 0, false), null);
});
