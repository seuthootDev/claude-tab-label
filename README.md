# claude-tab-label

![claude-tab-label: know what each Claude Code terminal is working on now](assets/social-preview.png)

[![npm version](https://img.shields.io/npm/v/claude-tab-label)](https://www.npmjs.com/package/claude-tab-label)
[![CI](https://github.com/seuthootDev/claude-tab-label/actions/workflows/ci.yml/badge.svg)](https://github.com/seuthootDev/claude-tab-label/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/claude-tab-label)](https://www.npmjs.com/package/claude-tab-label)
[![license](https://img.shields.io/npm/l/claude-tab-label)](LICENSE)

Tell your Claude Code terminals apart.

Running several Claude Code sessions at once, it's easy to lose track of which tab is doing what. Claude Code titles a session from its first prompt, but half an hour later that tab may be working on something else entirely.

claude-tab-label keeps every tab labelled with what it is working on **now**:

- **Tab title**: your latest real prompt, behind a coloured square that stays the same for the whole session, e.g. `🟩 fix refund rounding test`
- **Status line**: the same colour and label, plus the session name if you set one with `/rename`, above your existing status line

It needs no API calls or tokens, and has zero runtime dependencies. Node >= 18.

## Install

```sh
npx claude-tab-label init
```

or

```sh
npm i -g claude-tab-label && claude-tab-label init
```

Then restart Claude Code.

`init`:

- copies the CLI to `~/.claude-tab-label/bin/cli.mjs`
- backs up your `settings.json`
- puts the label in front of your status line; an existing status line is kept and runs underneath it via `--after '<original>'`
- adds a `UserPromptSubmit` and a `SessionStart` hook

The settings file is `$CLAUDE_CONFIG_DIR/settings.json` if that variable is set, else `~/.claude/settings.json`. Use `--settings <path>` to override.

`claude-tab-label uninstall` removes the hooks and restores your original status line.

## What counts as a label

Each prompt you send replaces the label with its first non-empty line, except:

- **short replies** under 6 characters, such as `ok`, `yes`, `ㅇㅇ` or `계속해`, which keep the current label
- **slash commands** such as `/compact`

The first prompt of a session always counts, so a new tab is labelled right away. Change the threshold with `CLAUDE_TAB_LABEL_MIN_CHARS` (for example `4` if you write short Korean or Chinese prompts).

Set `CLAUDE_TAB_LABEL_SHOW_DIR=1` to put the project folder in front of the label, e.g. `🟩 api · fix refund rounding test`, so tabs from different repos stay apart. The label is shortened to keep the whole title within 30 characters. The status line is unchanged.

To give a session a fixed name of your own, use Claude Code's built-in `/rename <name>`. It shows up in bold in the status line next to the latest prompt.

## How it works

- The `UserPromptSubmit` hook stores the label in `~/.claude-tab-label/sessions/<session-id>.json` and returns an OSC 0 title sequence in the [`terminalSequence`](https://code.claude.com/docs/en/hooks) field. Claude Code writes it to the terminal for the hook, which also works on Windows.
- The `SessionStart` hook restores the label when you resume a session.
- The status line reads the same file. The colour comes from a hash of the session id, so it never changes during a session.
- Session files untouched for 14 days are deleted.

## Works with claude-gh-guard

It can run alongside [claude-gh-guard](https://github.com/seuthootDev/claude-gh-guard), or any other status line. Each tool wraps the status line it finds, so you can install them in either order and both stay visible.

## Troubleshooting

- **The tab title switches back to Claude Code's own title.** Start Claude Code with `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` so it stops updating the title itself.
- **The coloured square shows as a blank box or ? in the tab title.** Set `CLAUDE_TAB_LABEL_ASCII=1` to use a plain-text tag (`[G]`, `[B]`, ...) instead of the emoji badge, in the tab title and the status line. The status line keeps its ANSI colour.
- **No title change inside tmux or over SSH.** Those may drop title sequences, depending on their configuration (for tmux, `set -g set-titles on`).
- **`claude -p` and the Agent SDK.** Claude Code ignores `terminalSequence` outside interactive sessions, so only the status file is updated.

## Privacy

Only the first line of your latest qualifying prompt is stored, in your home folder, and nothing leaves your machine.

## License

MIT
