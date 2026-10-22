import assert from "node:assert/strict";
import test from "node:test";

import { tokenize } from "../src/translator/tokenizer.js";

const values = (input, shell = "bash") => tokenize(input, shell).map(token => token.value);
const types = (input, shell = "bash") => tokenize(input, shell).map(token => token.type);

test("splits on whitespace", () => {
    assert.deepEqual(values("ls -la /tmp"), ["ls", "-la", "/tmp"]);
    assert.deepEqual(values("   ls    -la   "), ["ls", "-la"]);
    assert.deepEqual(values(""), []);
    assert.deepEqual(values("   "), []);
});

test("double quoted text is one token and keeps its quotes", () => {
    assert.deepEqual(values('grep "foo bar" file.txt'), ["grep", '"foo bar"', "file.txt"]);
});

test("single quoted text is one token and keeps its quotes", () => {
    assert.deepEqual(values("grep 'foo bar'"), ["grep", "'foo bar'"]);
});

test("separators inside quotes are text, not separators", () => {
    assert.deepEqual(values('grep "a | b && c; d"'), ["grep", '"a | b && c; d"']);
    assert.deepEqual(types('grep "a | b"'), ["word", "word"]);
});

test("PowerShell 7 separators are recognised, longest match first", () => {
    assert.deepEqual(values("a && b"), ["a", "&&", "b"]);
    assert.deepEqual(values("a || b"), ["a", "||", "b"]);
    assert.deepEqual(values("a | b"), ["a", "|", "b"]);
    assert.deepEqual(values("a ; b"), ["a", ";", "b"]);
    assert.deepEqual(values("a &"), ["a", "&"]);
    assert.deepEqual(types("a && b"), ["word", "operator", "word"]);
});

test("separators do not need surrounding whitespace", () => {
    assert.deepEqual(values("ls|grep x"), ["ls", "|", "grep", "x"]);
    assert.deepEqual(values("ls -a&&cd x"), ["ls", "-a", "&&", "cd", "x"]);
    assert.deepEqual(values("ls -a;cd x"), ["ls", "-a", ";", "cd", "x"]);
});

test("newlines separate statements", () => {
    assert.deepEqual(values("ls -a\ncd x"), ["ls", "-a", "\n", "cd", "x"]);
});

test("quotes glued to a word stay in the same token", () => {
    assert.deepEqual(values('--include="*.txt"'), ['--include="*.txt"']);
    assert.deepEqual(values("say'hello world'now"), ["say'hello world'now"]);
});

test("the shell's escape character protects the next character", () => {
    assert.deepEqual(values("echo a\\ b"), ["echo", "a\\ b"]);
    assert.deepEqual(values('echo \\"x'), ["echo", '\\"x']);
    assert.deepEqual(values("echo a`|b", "powershell"), ["echo", "a`|b"]);
    // A backtick is not an escape in bash, so the pipe still separates.
    assert.deepEqual(values("echo a`|b", "bash"), ["echo", "a`", "|", "b"]);
});

test("an unterminated quote swallows the rest of the line instead of throwing", () => {
    const tokens = tokenize("grep 'still typing", "bash");
    assert.deepEqual(tokens.map(t => t.value), ["grep", "'still typing"]);
    assert.equal(tokens[1].unterminated, true);
});

test("tokens carry the offsets they came from", () => {
    const [first, second] = tokenize("ls -a", "bash");
    assert.deepEqual([first.start, first.end], [0, 2]);
    assert.deepEqual([second.start, second.end], [3, 5]);
});

test("a placeholder written by this tool is one opaque token", () => {
    assert.deepEqual(values("Get-Content <no powershell equivalent: number-lines>"), [
        "Get-Content",
        "<no powershell equivalent: number-lines>",
    ]);
    assert.equal(tokenize("<unknown flag: -lz>", "bash")[0].placeholder, true);
    // A bare redirection is not a placeholder; it is passed along as text.
    assert.deepEqual(values("cat < in.txt"), ["cat", "<", "in.txt"]);
});
