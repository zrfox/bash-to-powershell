# translator

Tokenizer → parser → renderer for the shell windows. No network, no model, no
buffering: one keystroke in, one string out for every other window.

```
text  ──tokenize(text, shell)──►  tokens
      ──parse(text, shell)─────►  tree  (shell independent: ids + raw text)
      ──render(tree, target)───►  text for one window
```

| file            | job |
| --------------- | --- |
| `tokenizer.js`  | text → words and separators; quotes, escapes, `\|` `&&` `\|\|` `;` `&`, newlines |
| `parser.js`     | tokens → segments; finds the command, then resolves its flags |
| `dictionary.js` | the only place `commands.json` / `languages.json` are indexed |
| `renderer.js`   | tree → text in a target shell, including the `<...>` placeholders |
| `index.js`      | `parse`, `render`, `translate(text, from, to)` |

`parse` runs once per keystroke in the window the user is typing in; each other
window calls `render(tree, itsShell)`. Adding a fourth window costs one
`render`, not another parse.

## Rules

1. **Segments.** A line is split on the PowerShell 7 separators `|`, `&&`,
   `||`, `;`, `&` and on newlines. Bash spells these the same way, so one table
   serves both shells. A separator inside quotes is text.
2. **Command first.** The first token a segment's *source* shell recognises, by
   primary name **or alias**, becomes the command. Tokens before it produce no
   output (`sudo ls -a` → `Get-ChildItem -Force`), and a segment with no known
   command produces nothing at all (`foo -x` → ``). A separator whose
   neighbouring segment produced nothing is dropped with it, so no dangling
   `|` is ever printed. A trailing `&` is kept, because it means "background"
   rather than "I am still typing".
3. **Arguments pass through.** Anything that does not start with a flag prefix
   is the user's own text (paths, patterns, directory names) and is copied
   verbatim, quotes included.
4. **Flags are resolved inside their command, never in a global map.** `-n` is
   `number-lines` for `cat`, `line-numbers` for `grep`, `no-clobber` for `mv`
   and `numeric-sort` for `sort`. The same flag id may have different spellings
   per command (`ls -R` but `cp -r`) and the renderer uses the spelling that
   belongs to that command in the target shell.
5. **Bundles.** `ls -la` expands only in shells with `bundledShortFlags`
   (bash). Every letter must be a flag of that command; one bad letter makes
   the whole token unknown (`ls -lz` → `<unknown flag: -lz>`), never a partial
   translation.
6. **Case follows `languages.json`.** `caseSensitive: true` (bash) compares
   exactly, so `LS` is not `ls` and `-R` is not `-r`. `caseSensitive: false`
   (PowerShell) folds case for commands, aliases and parameters.
7. **Placeholders instead of silence.**
   - `<no TARGET equivalent: FLAG-ID>` – recognised flag, target shell has none
   - `<no TARGET equivalent: COMMAND-ID>` – recognised command, no counterpart
   - `<unknown flag: TOKEN>` – flag-shaped token the command does not define
8. **Placeholders are read back, not copied.** A window that shows a
   translation can be edited, and then its text is the input. A
   `<no SHELL equivalent: FLAG-ID>` after a command is that flag again, so
   every other window gets its own spelling of it or its own placeholder,
   never this window's: `Remove-Item <no powershell equivalent: interactive>`
   → `rm -i`. `<unknown flag: TOKEN>` travels back unchanged.

## Data shape

`commands.json` is the whole dictionary; adding a command or a flag needs no
code change.

```jsonc
{
  "id": "list-directory",                 // stable id, used in placeholders
  "description": "List directory contents",
  "shells": {
    "bash":       { "command": "ls", "aliases": ["dir", "vdir"] },
    "powershell": { "command": "Get-ChildItem", "aliases": ["ls", "dir", "gci"] }
  },
  "flags": [
    { "id": "recursive",                  // shared id = the translation pair
      "description": "Recurse into subdirectories",
      "shells": {
        "bash": ["-R", "--recursive"],    // first spelling is what we print
        "powershell": ["-Recurse"]        // a missing shell = no equivalent
      } }
  ]
}
```

`languages.json` carries the per-shell switches the translator reads:
`caseSensitive`, `escapeChar`, `flagPrefixes`, `bundledShortFlags`.

## Out of scope (on purpose)

Variable expansion, globs, redirections (`>`, `2>&1`), subshells/grouping,
flags that take values (`-TotalCount 5` – the flag is recognised, the value is
just passed along as an argument), PowerShell parameter abbreviation (`-Rec`),
command substitution, line continuations. Those tokens are passed through
unchanged rather than guessed at; they are the cases the future AI toggle is
meant to handle.
