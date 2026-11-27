import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { runHook, titleSequence } from "../src/commands/hook.ts";
import { badge } from "../src/label.ts";
import { loadState, saveState } from "../src/state.ts";
import { fakeDeps } from "./helpers.ts";

const prompt = (session_id: string, p: string) =>
  JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id, prompt: p });
const seq = (out: string) => JSON.parse(out).terminalSequence as string;

test("a prompt becomes the tab title and is remembered", () => {
  const d = fakeDeps();
  const out = runHook(prompt("s1", "환불 금액 반올림 테스트 추가해줘"), d);
  assert.equal(seq(out), `\x1b]0;${badge("s1").emoji} 환불 금액 반올림 테스트 추가해줘\x07`);
  assert.deepEqual(loadState(d, "s1"), { label: "환불 금액 반올림 테스트 추가해줘" });
});

test("the output is only the terminalSequence field (plain stdout would become context)", () => {
  const out = runHook(prompt("s1", "refactor the parser"), fakeDeps());
  assert.deepEqual(Object.keys(JSON.parse(out)), ["terminalSequence"]);
});

test("long prompts are cut and control characters cannot escape the sequence", () => {
  const out = runHook(prompt("s1", "x".repeat(100) + "\x07\x1b]52;c;evil"), fakeDeps());
  const s = seq(out);
  assert.ok(s.startsWith("\x1b]0;") && s.endsWith("\x07"));
  assert.equal(s.slice(4, -1).includes("\x07") || s.slice(4, -1).includes("\x1b"), false);
  assert.ok(s.includes("…"));
});

test("a short reply keeps the previous label", () => {
  const d = fakeDeps();
  runHook(prompt("s1", "write the migration script"), d);
  const out = runHook(prompt("s1", "ㅇㅇ"), d);
  assert.equal(seq(out), titleSequence("s1", "write the migration script"));
  assert.deepEqual(loadState(d, "s1"), { label: "write the migration script" });
});

test("the first prompt counts even when short", () => {
  const d = fakeDeps();
  runHook(prompt("s1", "hi"), d);
  assert.deepEqual(loadState(d, "s1"), { label: "hi" });
});

test("CLAUDE_TAB_LABEL_MIN_CHARS changes the threshold", () => {
  const d = fakeDeps({ env: { CLAUDE_TAB_LABEL_MIN_CHARS: "2" } });
  runHook(prompt("s1", "first task here"), d);
  runHook(prompt("s1", "버그"), d);
  assert.deepEqual(loadState(d, "s1"), { label: "버그" });
});

test("SessionStart restores the label of a resumed session", () => {
  const d = fakeDeps();
  saveState(d, "s1", { label: "old task" });
  const out = runHook(JSON.stringify({ hook_event_name: "SessionStart", session_id: "s1", source: "resume" }), d);
  assert.equal(seq(out), titleSequence("s1", "old task"));
  assert.equal(runHook(JSON.stringify({ hook_event_name: "SessionStart", session_id: "new" }), d), "");
});

test("bad input never throws and never writes outside the state folder", () => {
  const d = fakeDeps();
  assert.equal(runHook("not json", d), "");
  assert.equal(runHook(prompt("../../etc/passwd", "some prompt here"), d), "");
  assert.equal(runHook(JSON.stringify({ hook_event_name: "UserPromptSubmit" }), d), "");
  assert.equal(d.files.size, 0);
});

test("old session files are pruned", () => {
  const d = fakeDeps();
  saveState(d, "old", { label: "x" });
  d.mtimes.set(path.normalize("/home/test/.claude-tab-label/sessions/old.json"), d.now() - 15 * 86400000);
  runHook(prompt("s1", "a brand new task"), d);
  assert.equal(loadState(d, "old"), null);
  assert.ok(loadState(d, "s1"));
});

test("CLAUDE_TAB_LABEL_ASCII=1 uses a text tag instead of the emoji", () => {
  const d = fakeDeps({ env: { CLAUDE_TAB_LABEL_ASCII: "1" } });
  const out = runHook(prompt("s1", "fix refund rounding test"), d);
  assert.ok(seq(out).includes(badge("s1").ascii));
  assert.ok(!seq(out).includes(badge("s1").emoji));
});

test("titleSequence uses the ascii tag when asked", () => {
  const out = titleSequence("s1", "fix refund rounding test", true);
  assert.ok(out.includes(badge("s1").ascii));
  assert.ok(!out.includes(badge("s1").emoji));
});

test("CLAUDE_TAB_LABEL_SHOW_DIR=1 puts the project folder in front of the label", () => {
  const d = fakeDeps({ env: { CLAUDE_TAB_LABEL_SHOW_DIR: "1" } });
  const out = runHook(
    JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "fix the failing test", cwd: "/home/test/api" }),
    d,
  );
  assert.equal(seq(out), `\x1b]0;${badge("s1").emoji} api · fix the failing test\x07`);
});

test("without CLAUDE_TAB_LABEL_SHOW_DIR the title has no folder prefix", () => {
  const d = fakeDeps();
  const out = runHook(
    JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "fix the failing test", cwd: "/home/test/api" }),
    d,
  );
  assert.equal(seq(out), titleSequence("s1", "fix the failing test"));
});

test("with CLAUDE_TAB_LABEL_SHOW_DIR a long label is shortened within TITLE_CHARS", () => {
  const d = fakeDeps({ env: { CLAUDE_TAB_LABEL_SHOW_DIR: "1" } });
  const out = runHook(
    JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "x".repeat(100), cwd: "/home/test/api" }),
    d,
  );
  const s = seq(out);
  assert.ok(s.includes("api · "));
  assert.ok(s.includes("…"));
  assert.ok(Array.from(s.slice(4, -1)).length <= 32);
});
