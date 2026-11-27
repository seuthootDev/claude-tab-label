import path from "node:path";
import type { Deps } from "../deps.ts";
import { badge, clean, DEFAULT_MIN_CHARS, labelFrom, shorten } from "../label.ts";
import { loadState, pruneStates, saveState, validSessionId } from "../state.ts";

export const TITLE_CHARS = 30;

/** OSC 0 sets the tab and window title; Claude Code only accepts it via the `terminalSequence` field. */
export function titleSequence(sessionId: string, label: string, ascii = false, dir = ""): string {
  const folder = clean(dir);
  let text = shorten(clean(label), TITLE_CHARS);
  if (folder) {
    // Keep the whole label part within TITLE_CHARS: the folder plus " · " eats
    // into the label's budget. A folder that leaves no room replaces the label.
    const budget = TITLE_CHARS - Array.from(folder).length - 3;
    text = budget > 0 ? `${folder} · ${shorten(clean(label), budget)}` : shorten(folder, TITLE_CHARS);
  }
  return `\x1b]0;${ascii ? badge(sessionId).ascii : badge(sessionId).emoji} ${text}\x07`;
}

function minChars(d: Deps): number {
  const n = Number(d.env.CLAUDE_TAB_LABEL_MIN_CHARS);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MIN_CHARS;
}

/**
 * Runs as a UserPromptSubmit and SessionStart hook. Returns the hook's stdout: JSON with a
 * `terminalSequence`, or "" to leave the title alone. Never blocks the prompt.
 */
export function runHook(stdin: string, d: Deps): string {
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(stdin);
  } catch {
    return "";
  }
  const id = input.session_id;
  if (!validSessionId(id)) return "";
  const prev = loadState(d, id);

  let label: string | null = null;
  if (input.hook_event_name === "UserPromptSubmit") {
    const prompt = typeof input.prompt === "string" ? input.prompt : "";
    // The first prompt always counts, even a short one, so a new session gets a label.
    label = labelFrom(prompt, prev ? minChars(d) : 0);
    if (label) {
      saveState(d, id, { label });
      try {
        pruneStates(d);
      } catch {
        // housekeeping is best-effort
      }
    }
  }
  // Short replies and resumed sessions re-send the label we already have, in case something reset the title.
  label ??= prev?.label ?? null;
  const showDir = d.env.CLAUDE_TAB_LABEL_SHOW_DIR === "1";
  const cwd = typeof input.cwd === "string" ? input.cwd : "";
  const dir = showDir && cwd ? path.basename(cwd) : "";
  return label ? JSON.stringify({ terminalSequence: titleSequence(id, label, d.env.CLAUDE_TAB_LABEL_ASCII === "1", dir) }) : "";
}
