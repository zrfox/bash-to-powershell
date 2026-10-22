#!/usr/bin/env node
/**
 * Tiny CLI around the translator, handy for checking a table of examples
 * without opening the app:
 *
 *   node scripts/translate.js bash powershell "ls -R | grep -i TODO"
 *   echo "ls -la" | node scripts/translate.js bash powershell
 */

import { shellNames, translate } from "../src/translator/index.js";

const [from, to, ...rest] = process.argv.slice(2);

if (!from || !to) {
    console.error("usage: node scripts/translate.js <fromShell> <toShell> [command]");
    console.error(`shells: ${shellNames.join(", ")}`);
    process.exit(1);
}

const run = text => {
    for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
        if (line.trim().length === 0) continue;
        console.log(translate(line, from, to));
    }
};

if (rest.length > 0) {
    run(rest.join(" "));
} else {
    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
        stdin += chunk;
    });
    process.stdin.on("end", () => run(stdin));
}
