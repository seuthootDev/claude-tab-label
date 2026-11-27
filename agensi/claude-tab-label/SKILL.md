---
name: claude-tab-label
description: Installs, checks and troubleshoots claude-tab-label, which labels every Claude Code terminal tab and status line with what that session is working on now (its latest prompt) instead of the first prompt. Use when the user runs several Claude Code sessions at once and loses track of which tab is doing what, or wants to set up, debug or remove the labels.
summary: Know what each Claude Code terminal is working on now, not what you asked first. No API calls, free and open source (MIT).
version: 0.1.0
tags: [claude-code, terminal, tabs, productivity, hooks, statusline]
keywords: [multiple claude code sessions, terminal tab title, which tab is which, session name, rename session, status line label]
use_cases:
  - Tell several Claude Code terminals apart at a glance
  - Show the current task, not the first prompt, in the tab title
  - Colour-code each session in the tab title and status line
docs_url: https://github.com/seuthootDev/claude-tab-label#readme
---

# claude-tab-label

claude-tab-label is a free, open-source (MIT) npm CLI for **Claude Code only**. It adds:

- a **tab title** with the session's latest real prompt behind a per-session coloured square, e.g. `🟩 fix refund rounding test`
- a **status line** row with the same colour, the session name (from `/rename`) and the latest prompt, shown above any existing status line

It makes no API calls and uses no tokens.

Source: https://github.com/seuthootDev/claude-tab-label

It relies on Claude Code hooks (`terminalSequence`) and the status line, so it does not work in Cursor, Copilot or other agents. If the user is not using Claude Code, say so and stop.

## Install

1. Check that `node --version` is 18 or newer, and tell the user if it isn't.
2. Tell the user that `init` edits their Claude Code `settings.json`: it backs it up, puts the label in front of the status line (an existing one is kept and runs underneath), and adds `UserPromptSubmit` and `SessionStart` hooks. **Ask before running it.**
3. Run:
   ```sh
   npx claude-tab-label init
   ```
   If the user keeps settings somewhere else, add `--settings <path>`. `$CLAUDE_CONFIG_DIR/settings.json` is used when that variable is set.
4. Tell the user to restart Claude Code. The tab title changes after their next prompt.

## How labels are picked

- Each prompt replaces the label with its first non-empty line.
- Short replies (under 6 characters, e.g. `ok`, `ㅇㅇ`, `계속해`) and slash commands keep the current label.
- The first prompt of a session always counts.
- `CLAUDE_TAB_LABEL_MIN_CHARS=<n>` changes the threshold.
- `CLAUDE_TAB_LABEL_ASCII=1` uses a plain-text tag (e.g. `[G]`) instead of the coloured-square emoji, for terminals that cannot show emoji. The status line keeps its ANSI colour.
- `CLAUDE_TAB_LABEL_SHOW_DIR=1` puts the last folder of the session's working directory in front of the tab title (e.g. `🟩 api · fix refund rounding test`). The status line is unchanged.
- For a fixed name, the user can run Claude Code's built-in `/rename <name>`. It appears in bold in the status line.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| The coloured square shows as a blank box or `?` in the tab title. | Set `CLAUDE_TAB_LABEL_ASCII=1` to use a plain-text tag (`[G]`, `[B]`, ...) instead of the emoji. |
| Tab title switches back to Claude Code's own title | Start Claude Code with `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1`. |
| No title change in tmux or over SSH | They may drop title sequences. For tmux, `set -g set-titles on`. |
| Nothing changes at all | Claude Code was not restarted after `init`, or the session is non-interactive (`claude -p`, Agent SDK), where `terminalSequence` is ignored. |
| The old status line disappeared | It should run underneath. Check that `statusLine.command` in settings.json ends with `--after '<original command>'`. |

Labels are stored in `~/.claude-tab-label/sessions/` (first line of the latest qualifying prompt only) and deleted after 14 days. Nothing leaves the machine.

## Works with claude-gh-guard

It can run alongside claude-gh-guard or any other status line. Each tool wraps the status line it finds, so either install order works.

## Uninstall

```sh
npx claude-tab-label uninstall
```

This removes the hooks and restores the original status line.

## Issues and feedback

Report bugs or ask for features at https://github.com/seuthootDev/claude-tab-label/issues
