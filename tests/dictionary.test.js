import assert from "node:assert/strict";
import test from "node:test";

import commands from "../src/data/commands.json" with { type: "json" };
import languages from "../src/data/languages.json" with { type: "json" };
import {
    expandBundledFlags,
    getCommandWord,
    getFlagToken,
    lookupCommandId,
    lookupFlagId,
} from "../src/translator/dictionary.js";

const spellings = value => (Array.isArray(value) ? value : [value]);
const fold = (token, shell) => (languages[shell].caseSensitive ? token : token.toLowerCase());

/* ------------------------------------------------------------ lookup rules */

test("commands resolve by primary name and by alias, per shell", () => {
    assert.equal(lookupCommandId("ls", "bash"), "list-directory");
    assert.equal(lookupCommandId("vdir", "bash"), "list-directory");
    assert.equal(lookupCommandId("Get-ChildItem", "powershell"), "list-directory");
    assert.equal(lookupCommandId("GCI", "powershell"), "list-directory");
    // A PowerShell spelling is not a bash command and vice versa.
    assert.equal(lookupCommandId("Get-ChildItem", "bash"), null);
    assert.equal(lookupCommandId("LS", "bash"), null);
});

test("flags are resolved per command, never from a global map", () => {
    assert.equal(lookupFlagId("view-file", "-n", "bash"), "number-lines");
    assert.equal(lookupFlagId("search-text", "-n", "bash"), "line-numbers");
    assert.equal(lookupFlagId("move-files", "-n", "bash"), "no-clobber");
    assert.equal(lookupFlagId("sort-lines", "-n", "bash"), "numeric-sort");
    assert.equal(lookupFlagId("change-directory", "-n", "bash"), null);

    // Same id, different spelling per command: ls -R vs cp -r.
    assert.equal(getFlagToken("list-directory", "recursive", "bash"), "-R");
    assert.equal(getFlagToken("copy-files", "recursive", "bash"), "-r");
    assert.equal(getFlagToken("list-directory", "recursive", "powershell"), "-Recurse");
});

test("a missing target spelling is reported as null, not guessed", () => {
    assert.equal(getFlagToken("view-file", "number-lines", "powershell"), null);
    assert.equal(getCommandWord("list-directory", "cmd"), null);
});

test("bundles only expand for shells that allow them and only when every letter fits", () => {
    assert.deepEqual(expandBundledFlags("list-directory", "-la", "bash"), ["long-format", "all-files"]);
    assert.equal(expandBundledFlags("list-directory", "-lz", "bash"), null);
    assert.equal(expandBundledFlags("list-directory", "--all", "bash"), null);
    assert.equal(expandBundledFlags("remove-files", "-rf", "powershell"), null);
});

test("mkdir maps to PowerShell 7's mkdir, not New-Item", () => {
    assert.equal(getCommandWord("create-directory", "powershell"), "mkdir");
    assert.equal(lookupCommandId("New-Item", "powershell"), null);
    assert.equal(lookupCommandId("md", "powershell"), "create-directory");
});

/* --------------------------------------------------------- data integrity  */

test("every command has an id, a description and at least one shell", () => {
    for (const command of commands) {
        assert.equal(typeof command.id, "string", JSON.stringify(command).slice(0, 60));
        assert.equal(typeof command.description, "string", command.id);
        assert.ok(Object.keys(command.shells ?? {}).length > 0, command.id);
        assert.ok(Array.isArray(command.flags), command.id);
    }
});

test("command ids are unique", () => {
    const ids = commands.map(command => command.id);
    assert.equal(new Set(ids).size, ids.length);
});

test("no command spelling is claimed by two commands in the same shell", () => {
    const seen = new Map(); // `${shell}:${token}` -> commandId
    for (const command of commands) {
        for (const [shell, entry] of Object.entries(command.shells)) {
            assert.ok(languages[shell], `${command.id} uses unknown shell ${shell}`);
            for (const spelling of [entry.command, ...(entry.aliases ?? [])]) {
                const key = `${shell}:${fold(spelling, shell)}`;
                assert.equal(seen.get(key), undefined, `${spelling} claimed by ${seen.get(key)} and ${command.id}`);
                seen.set(key, command.id);
            }
        }
    }
});

test("flag ids and flag spellings are unique inside a command", () => {
    for (const command of commands) {
        const ids = new Set();
        const tokens = new Set();
        for (const flag of command.flags) {
            assert.equal(ids.has(flag.id), false, `${command.id} repeats flag ${flag.id}`);
            ids.add(flag.id);
            for (const [shell, value] of Object.entries(flag.shells)) {
                assert.ok(languages[shell], `${command.id}/${flag.id} uses unknown shell ${shell}`);
                for (const spelling of spellings(value)) {
                    const key = `${shell}:${fold(spelling, shell)}`;
                    assert.equal(tokens.has(key), false, `${command.id} repeats ${spelling} (${shell})`);
                    tokens.add(key);
                }
            }
        }
    }
});

test("flag spellings start with one of their shell's flag prefixes", () => {
    for (const command of commands) {
        for (const flag of command.flags) {
            for (const [shell, value] of Object.entries(flag.shells)) {
                for (const spelling of spellings(value)) {
                    const ok = languages[shell].flagPrefixes.some(prefix => spelling.startsWith(prefix));
                    assert.ok(ok, `${command.id}/${flag.id}: "${spelling}" is not a ${shell} flag`);
                }
            }
        }
    }
});

test("every shell in languages.json carries the settings the translator reads", () => {
    for (const [shell, settings] of Object.entries(languages)) {
        assert.equal(typeof settings.caseSensitive, "boolean", shell);
        assert.equal(typeof settings.escapeChar, "string", shell);
        assert.ok(Array.isArray(settings.flagPrefixes), shell);
        assert.equal(typeof settings.bundledShortFlags, "boolean", shell);
    }
});
