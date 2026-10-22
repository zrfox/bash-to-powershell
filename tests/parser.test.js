import assert from "node:assert/strict";
import test from "node:test";

import { ITEM_OPERATOR, ITEM_SEGMENT, parse } from "../src/translator/parser.js";

const segments = parsed => parsed.items.filter(item => item.type === ITEM_SEGMENT);
const operators = parsed => parsed.items.filter(item => item.type === ITEM_OPERATOR).map(item => item.value);
const nodes = (input, shell = "bash") => segments(parse(input, shell))[0].nodes;

test("the first known word becomes the command of the segment", () => {
    const [segment] = segments(parse("ls -a", "bash"));
    assert.equal(segment.commandId, "list-directory");
    assert.deepEqual(segment.nodes[0], { type: "command", id: "list-directory", raw: "ls" });
});

test("aliases resolve to the same command as the primary name", () => {
    assert.equal(segments(parse("gci", "powershell"))[0].commandId, "list-directory");
    assert.equal(segments(parse("dir", "powershell"))[0].commandId, "list-directory");
    assert.equal(segments(parse("dir", "bash"))[0].commandId, "list-directory");
    assert.equal(segments(parse("del x", "powershell"))[0].commandId, "remove-files");
});

test("tokens before the command are dropped", () => {
    assert.deepEqual(nodes("sudo ls -a").map(n => n.type), ["command", "flag"]);
    assert.deepEqual(nodes("foo -x"), []);
    assert.equal(segments(parse("foo -x", "bash"))[0].commandId, null);
});

test("non-dash tokens after the command are arguments passed through unchanged", () => {
    assert.deepEqual(nodes("cd my-Dir"), [
        { type: "command", id: "change-directory", raw: "cd" },
        { type: "argument", raw: "my-Dir" },
    ]);
    assert.deepEqual(nodes('grep "foo bar" ./src').slice(1).map(n => n.raw), ['"foo bar"', "./src"]);
});

test("quoted text is an argument even when it starts with a dash", () => {
    assert.deepEqual(nodes('ls "-a"').slice(1), [{ type: "argument", raw: '"-a"' }]);
});

test("flags resolve inside the command that owns them", () => {
    assert.equal(nodes("cat -n")[1].id, "number-lines");
    assert.equal(nodes("grep -n")[1].id, "line-numbers");
    assert.equal(nodes("mv -n a b")[1].id, "no-clobber");
    assert.equal(nodes("sort -n")[1].id, "numeric-sort");
});

test("a dash token that is not a flag of this command is unknown", () => {
    assert.deepEqual(nodes("ls -z")[1], { type: "unknownFlag", raw: "-z" });
    // -Recurse belongs to Get-ChildItem, not to Set-Location
    assert.deepEqual(nodes("Set-Location -Recurse", "powershell")[1], {
        type: "unknownFlag",
        raw: "-Recurse",
    });
});

test("bundled short flags expand in bash, one bad letter poisons the token", () => {
    assert.deepEqual(nodes("ls -la").slice(1).map(n => n.id), ["long-format", "all-files"]);
    assert.deepEqual(nodes("ls -lz").slice(1), [{ type: "unknownFlag", raw: "-lz" }]);
});

test("PowerShell does not bundle", () => {
    assert.deepEqual(nodes("Remove-Item -rf", "powershell").slice(1), [
        { type: "unknownFlag", raw: "-rf" },
    ]);
});

test("case rules follow languages.json", () => {
    assert.equal(segments(parse("get-childitem -RECURSE", "powershell"))[0].commandId, "list-directory");
    assert.equal(nodes("get-childitem -RECURSE", "powershell")[1].id, "recursive");
    assert.equal(segments(parse("LS -a", "bash"))[0].commandId, null);
    // bash keeps -R and -r apart
    assert.equal(nodes("ls -R")[1].id, "recursive");
    assert.equal(nodes("ls -r")[1].id, "reverse-order");
});

test("separators start a new segment", () => {
    const parsed = parse("ls -a | grep x && cd y; pwd", "bash");
    assert.deepEqual(operators(parsed), ["|", "&&", ";"]);
    assert.deepEqual(segments(parsed).map(s => s.commandId), [
        "list-directory",
        "search-text",
        "change-directory",
        "print-working-directory",
    ]);
});

test("an unknown shell parses to nothing instead of throwing", () => {
    assert.deepEqual(parse("ls -a", "fish").items, []);
    assert.deepEqual(parse(undefined, "bash").items.length, 1);
});
