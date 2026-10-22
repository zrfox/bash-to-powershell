import assert from "node:assert/strict";
import test from "node:test";

import { parse, render, translate } from "../src/translator/index.js";

const other = shell => (shell === "bash" ? "powershell" : "bash");
const check = (shell, input, expected) => {
    test(`[${shell}] ${input === "" ? "(empty)" : input}`, () => {
        assert.equal(translate(input, shell, other(shell)), expected);
    });
};

/* ------------------------------------------------------- the spec's table */

// [window the user types in, input, expected output in the other window]
const TABLE = [
    ["bash", "ls -R", "Get-ChildItem -Recurse"],
    ["powershell", "Get-ChildItem -Recurse", "ls -R"],
    ["powershell", "get-childitem -recurse", "ls -R"],
    ["bash", "ls -a", "Get-ChildItem -Force"],
    ["bash", "cat -n", "Get-Content <no powershell equivalent: number-lines>"],
    ["bash", "grep -n", "Select-String <no powershell equivalent: line-numbers>"],
    ["bash", "rm -r -f", "Remove-Item -Recurse -Force"],
    ["powershell", "Remove-Item -Force", "rm -f"],
    ["bash", "cd -P", "Set-Location <no powershell equivalent: physical>"],
    ["bash", "cd projects", "Set-Location projects"],
    ["bash", 'grep "foo bar"', 'Select-String "foo bar"'],
    [
        "bash",
        'grep -i "a | b" file.txt',
        'Select-String <no powershell equivalent: case-insensitive> "a | b" file.txt',
    ],
    ["bash", "ls -R | grep -r", "Get-ChildItem -Recurse | Select-String -Recurse"],
    ["powershell", 'Get-ChildItem -Recurse | Select-String "TODO"', 'ls -R | grep "TODO"'],
    ["bash", "ls -la", "Get-ChildItem <no powershell equivalent: long-format> -Force"],
    ["bash", "ls -lz", "Get-ChildItem <unknown flag: -lz>"],
    ["bash", "foo -x", ""],
    ["bash", "cd projects && ls -a", "Set-Location projects && Get-ChildItem -Force"],
    ["bash", "cd projects; ls -a", "Set-Location projects; Get-ChildItem -Force"],
    ["bash", "mkdir logs", "mkdir logs"],
];

for (const [shell, input, expected] of TABLE) check(shell, input, expected);

/* ------------------------------------------------- commands, names, aliases */

check("bash", "dir", "Get-ChildItem");
check("powershell", "gci", "ls");
check("powershell", "DEL build", "rm build");
check("powershell", "Set-Location ..", "cd ..");
check("bash", "pwd", "Get-Location");
check("bash", "clear", "Clear-Host");
check("powershell", "cls", "clear");
check("powershell", "mkdir logs", "mkdir logs");
check("bash", "echo hi", "Write-Output hi");

// Case rules: PowerShell folds case, bash does not.
check("powershell", "REMOVE-ITEM -FORCE", "rm -f");
check("bash", "LS -a", "");
check("bash", "Cat file.txt", "");

/* ---------------------------------------------------------- flag behaviour */

// The same token means different things depending on the command.
check("bash", "cat -n notes.txt", "Get-Content <no powershell equivalent: number-lines> notes.txt");
check("bash", "mv -n a b", "Move-Item <no powershell equivalent: no-clobber> a b");
check("bash", "sort -n", "Sort-Object <no powershell equivalent: numeric-sort>");

// ls -R stays -R, cp -r stays -r.
check("powershell", "Get-ChildItem -Recurse", "ls -R");
check("powershell", "Copy-Item -Recurse a b", "cp -r a b");
check("bash", "cp -R a b", "Copy-Item -Recurse a b");

// bash is case sensitive about its own flags.
check("bash", "ls -r", "Get-ChildItem <no powershell equivalent: reverse-order>");
check("bash", "rm -R tmp", "Remove-Item -Recurse tmp");

// Long bash spellings are accepted and normalised.
check("bash", "ls --all", "Get-ChildItem -Force");
check("bash", "rm --recursive --force build", "Remove-Item -Recurse -Force build");

// Unknown / unresolvable tokens.
check("bash", "ls -z", "Get-ChildItem <unknown flag: -z>");
check("powershell", "Set-Location -Recurse", "cd <unknown flag: -Recurse>");
check("powershell", "Remove-Item -rf", "rm <unknown flag: -rf>");
check("bash", "ls -", "Get-ChildItem <unknown flag: ->");
check("bash", "ls -laR", "Get-ChildItem <no powershell equivalent: long-format> -Force -Recurse");

// PowerShell-only flags have no bash spelling.
check("powershell", "Get-ChildItem -Force -Directory", "ls -a <no bash equivalent: directories-only>");

/* ----------------------------------------------------- arguments and quotes */

check("bash", "cd myDirectory", "Set-Location myDirectory");
check("bash", "cd ../some-dir", "Set-Location ../some-dir");
check("bash", "cp -r src/ dist/", "Copy-Item -Recurse src/ dist/");
check("bash", "echo 'hello world'", "Write-Output 'hello world'");
check("bash", `grep "it's here" file`, `Select-String "it's here" file`);
check("bash", 'ls "-a"', 'Get-ChildItem "-a"');
check("bash", "sudo ls -a", "Get-ChildItem -Force");

/* --------------------------------------------------------------- separators */

check("bash", "ls -a | grep foo | sort -r", "Get-ChildItem -Force | Select-String foo | Sort-Object -Descending");
check("bash", "ls -a || cd x", "Get-ChildItem -Force || Set-Location x");
check("bash", "ls|grep x", "Get-ChildItem | Select-String x");
check("powershell", "Get-ChildItem; Get-Location", "ls; pwd");
check("bash", "ls -a\ncd x", "Get-ChildItem -Force\nSet-Location x");
check("bash", "ls -a &", "Get-ChildItem -Force &");

// A separator next to a segment that produced nothing is dropped with it.
check("bash", "foo -x | ls -a", "Get-ChildItem -Force");
check("bash", "ls -a | foo -x", "Get-ChildItem -Force");
check("bash", "ls -a |", "Get-ChildItem -Force");
check("bash", "ls -a &&", "Get-ChildItem -Force");
check("bash", "| ls -a", "Get-ChildItem -Force");
check("bash", "ls -a | foo | cd x", "Get-ChildItem -Force | Set-Location x");

/* ----------------------------------------------------------- empty / noise */

check("bash", "", "");
check("bash", "   ", "");
check("bash", "hello world", "");
check("powershell", "Write-Host hi", "");

/* ------------------------------------------------------------ round trips */

test("round trip keeps the canonical spelling", () => {
    for (const [shell, input] of [
        ["bash", "ls -R | grep -r"],
        ["bash", "rm -r -f build"],
        ["powershell", "Get-ChildItem -Recurse"],
    ]) {
        const there = translate(input, shell, other(shell));
        assert.equal(translate(there, other(shell), shell), input);
    }
});

test("one parse feeds every window", () => {
    const parsed = parse("ls -a | grep -n TODO", "bash");
    assert.equal(
        render(parsed, "powershell"),
        "Get-ChildItem -Force | Select-String <no powershell equivalent: line-numbers> TODO",
    );
    assert.equal(render(parsed, "bash"), "ls -a | grep -n TODO");
    // A shell with no entries for these commands still renders honestly.
    assert.equal(
        render(parsed, "cmd"),
        "<no cmd equivalent: list-directory> <no cmd equivalent: all-files> | "
            + "<no cmd equivalent: search-text> <no cmd equivalent: line-numbers> TODO",
    );
});

test("unknown shells are handled without throwing", () => {
    assert.equal(translate("ls -a", "bash", "fish"), "");
    assert.equal(translate("ls -a", "fish", "bash"), "");
    assert.equal(render(null, "bash"), "");
});

test("translations survive a round trip when the user flips direction", () => {
    const cases = [
        ["bash", "cat -n", "cat <no powershell equivalent: number-lines>"],
        ["bash", "ls -lz /tmp", "ls <unknown flag: -lz> /tmp"],
        ["bash", "grep -i 'a | b' file", "grep <no powershell equivalent: case-insensitive> 'a | b' file"],
    ];
    for (const [shell, input, expectedBack] of cases) {
        const translated = translate(input, shell, other(shell));
        assert.equal(translate(translated, other(shell), shell), expectedBack);
    }
});

test("out-of-scope syntax is passed along instead of guessed at", () => {
    // redirections, globs and variables are arguments as far as we are concerned
    assert.equal(translate("cat < in.txt > out.txt", "bash", "powershell"), "Get-Content < in.txt > out.txt");
    assert.equal(translate("ls -a *.txt", "bash", "powershell"), "Get-ChildItem -Force *.txt");
    assert.equal(translate("cd $HOME", "bash", "powershell"), "Set-Location $HOME");
    // a flag that takes a value: the flag is translated, the value travels on
    assert.equal(translate("Get-Content -Tail 5 log.txt", "powershell", "bash"), "cat <no bash equivalent: tail> 5 log.txt");
});
