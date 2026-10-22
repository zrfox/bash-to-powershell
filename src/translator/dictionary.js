/**
 * dictionary.js
 *
 * The single place where commands.json / languages.json are turned into lookup
 * tables. Everything is indexed **per shell** and, for flags, **per command**.
 *
 * Why per command: a flag token only has meaning inside the command that owns
 * it. `-n` is "number-lines" for cat, "line-numbers" for grep and "no-clobber"
 * for mv; `-R` is "recursive" for ls but `cp -R`/`cp -r` are the same flag.
 * The old global flagTokenToId map collapsed all of those into whichever entry
 * happened to be indexed last, which is the bug this module removes.
 *
 * Case folding is per shell as well: bash is caseSensitive, PowerShell is not,
 * so "Get-ChildItem", "get-childitem" and "GET-CHILDITEM" are the same token in
 * PowerShell while "LS" is not a bash command.
 */

import commandsData from "../data/commands.json" with { type: "json" };
import languagesData from "../data/languages.json" with { type: "json" };

const DEFAULT_FLAG_PREFIXES = ["-"];

/* ------------------------------------------------------------------ shells */

export const languages = languagesData;
export const shellNames = Object.keys(languagesData);

export function isKnownShell(shell) {
    return Boolean(shell) && Object.hasOwn(languagesData, shell);
}

export function isCaseSensitive(shell) {
    return languagesData[shell]?.caseSensitive === true;
}

/** Escape character of the shell ("\\" in bash, "`" in PowerShell). */
export function escapeCharOf(shell) {
    return languagesData[shell]?.escapeChar ?? null;
}

const flagPrefixesByShell = new Map(
    Object.entries(languagesData).map(([shell, settings]) => {
        const prefixes = Array.isArray(settings.flagPrefixes) && settings.flagPrefixes.length > 0
            ? [...settings.flagPrefixes]
            : [...DEFAULT_FLAG_PREFIXES];
        // Longest first so "--all" is never read as "-" + "-all".
        return [shell, prefixes.sort((a, b) => b.length - a.length)];
    }),
);

/** Prefixes that introduce a flag in this shell, longest first. */
export function flagPrefixesOf(shell) {
    return flagPrefixesByShell.get(shell) ?? DEFAULT_FLAG_PREFIXES;
}

/** True when the shell allows bundled short flags such as `ls -la`. */
export function allowsBundledShortFlags(shell) {
    return languagesData[shell]?.bundledShortFlags === true;
}

/** Normalizes a token for lookup using the shell's own case rules. */
export function foldCase(token, shell) {
    if (typeof token !== "string") return "";
    return isCaseSensitive(shell) ? token : token.toLowerCase();
}

/* ------------------------------------------------------------- json shapes */

// A flag spelling may be written as "-a" or as ["-a", "--all"]; the first entry
// is the canonical spelling used when rendering into that shell.
function spellingsOf(value) {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.filter(entry => typeof entry === "string" && entry.length > 0);
    return [];
}

function commandSpellingsOf(shellEntry) {
    if (!shellEntry || typeof shellEntry.command !== "string") return [];
    const aliases = Array.isArray(shellEntry.aliases) ? shellEntry.aliases : [];
    return [shellEntry.command, ...aliases.filter(alias => typeof alias === "string" && alias.length > 0)];
}

/* ----------------------------------------------------------------- indexes */

/** commandId -> command record from commands.json */
const commandsById = new Map();

/** shell -> Map(folded token -> commandId): primary names *and* aliases. */
const commandTokenIndex = new Map();

/** commandId -> Map(shell -> canonical command word) */
const commandWordIndex = new Map();

/** commandId -> Map(shell -> Map(folded flag token -> flagId)) */
const flagTokenIndex = new Map();

/** commandId -> Map(flagId -> Map(shell -> canonical flag token)) */
const flagWordIndex = new Map();

/**
 * commandId -> Map(shell -> Map(folded single letter -> flagId)).
 * Only single-letter, single-dash flags (`-a`) can appear inside a bundle.
 */
const shortFlagIndex = new Map();

function shellMap(index, key) {
    let map = index.get(key);
    if (!map) {
        map = new Map();
        index.set(key, map);
    }
    return map;
}

function warnData(message) {
    // Data problems should be loud in development and harmless in production.
    if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn(`[translator] ${message}`);
    }
}

function indexCommand(command) {
    if (!command || typeof command.id !== "string") return;
    if (commandsById.has(command.id)) {
        warnData(`duplicate command id "${command.id}" in commands.json`);
        return;
    }
    commandsById.set(command.id, command);

    const words = shellMap(commandWordIndex, command.id);
    for (const [shell, shellEntry] of Object.entries(command.shells ?? {})) {
        if (!isKnownShell(shell)) {
            warnData(`command "${command.id}" refers to unknown shell "${shell}"`);
            continue;
        }
        const spellings = commandSpellingsOf(shellEntry);
        if (spellings.length === 0) continue;

        words.set(shell, spellings[0]);

        const tokens = shellMap(commandTokenIndex, shell);
        for (const spelling of spellings) {
            const key = foldCase(spelling, shell);
            const owner = tokens.get(key);
            if (owner && owner !== command.id) {
                warnData(`"${spelling}" in ${shell} maps to both "${owner}" and "${command.id}"; keeping "${owner}"`);
                continue;
            }
            tokens.set(key, command.id);
        }
    }

    indexFlags(command);
}

function indexFlags(command) {
    const byShell = shellMap(flagTokenIndex, command.id);
    const byFlag = shellMap(flagWordIndex, command.id);
    const bundles = shellMap(shortFlagIndex, command.id);

    for (const flag of command.flags ?? []) {
        if (!flag || typeof flag.id !== "string") continue;
        if (byFlag.has(flag.id)) {
            warnData(`duplicate flag id "${flag.id}" on command "${command.id}"`);
            continue;
        }
        const words = new Map();
        byFlag.set(flag.id, words);

        for (const [shell, value] of Object.entries(flag.shells ?? {})) {
            if (!isKnownShell(shell)) {
                warnData(`flag "${command.id}/${flag.id}" refers to unknown shell "${shell}"`);
                continue;
            }
            const spellings = spellingsOf(value);
            if (spellings.length === 0) continue;

            words.set(shell, spellings[0]);

            const tokens = shellMap(byShell, shell);
            const letters = shellMap(bundles, shell);
            for (const spelling of spellings) {
                const key = foldCase(spelling, shell);
                const owner = tokens.get(key);
                if (owner && owner !== flag.id) {
                    warnData(`"${spelling}" on ${command.id} in ${shell} maps to both "${owner}" and "${flag.id}"; keeping "${owner}"`);
                    continue;
                }
                tokens.set(key, flag.id);

                // `-a` can take part in a bundle such as `-la`; `--all` cannot.
                if (spelling.length === 2 && spelling.startsWith("-")) {
                    letters.set(foldCase(spelling.slice(1), shell), flag.id);
                }
            }
        }
    }
}

for (const command of commandsData) indexCommand(command);

/* ------------------------------------------------------------------ lookup */

export function getCommand(commandId) {
    return commandsById.get(commandId) ?? null;
}

/** Resolves a raw token to a command id using `shell`'s names and aliases. */
export function lookupCommandId(token, shell) {
    if (typeof token !== "string" || !isKnownShell(shell)) return null;
    return commandTokenIndex.get(shell)?.get(foldCase(token, shell)) ?? null;
}

/** Canonical command word for a shell, or null when the shell has no equivalent. */
export function getCommandWord(commandId, shell) {
    return commandWordIndex.get(commandId)?.get(shell) ?? null;
}

/** Resolves a flag token *inside one command*, never from a global map. */
export function lookupFlagId(commandId, token, shell) {
    if (typeof token !== "string" || !isKnownShell(shell)) return null;
    return flagTokenIndex.get(commandId)?.get(shell)?.get(foldCase(token, shell)) ?? null;
}

/** Canonical flag spelling for a shell, or null when the shell has no equivalent. */
export function getFlagToken(commandId, flagId, shell) {
    return flagWordIndex.get(commandId)?.get(flagId)?.get(shell) ?? null;
}

/**
 * Expands a bundle such as `-la` into flag ids, for shells that allow bundling.
 * Returns null when the shell does not bundle, when the token is not a bundle,
 * or when *any* letter is not a flag of this command - one bad letter makes the
 * whole token unknown (`ls -lz` is never "-l plus garbage").
 */
export function expandBundledFlags(commandId, token, shell) {
    if (!allowsBundledShortFlags(shell)) return null;
    if (typeof token !== "string") return null;
    if (!/^-[^-\s]{2,}$/.test(token)) return null;

    const letters = shortFlagIndex.get(commandId)?.get(shell);
    if (!letters) return null;

    const flagIds = [];
    for (const letter of token.slice(1)) {
        const flagId = letters.get(foldCase(letter, shell));
        if (!flagId) return null;
        flagIds.push(flagId);
    }
    return flagIds;
}

/** True when a token looks like a flag for this shell (`-x`, `--all`, `/s`). */
export function looksLikeFlag(token, shell) {
    if (typeof token !== "string" || token.length === 0) return false;
    return flagPrefixesOf(shell).some(prefix => token.startsWith(prefix));
}
