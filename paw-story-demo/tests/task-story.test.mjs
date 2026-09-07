import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repository = new URL("../../", import.meta.url);
const read = path => readFile(new URL(path, repository), "utf8");

test("synthetic task has distinct rejection and retention checks, and a next-work handoff", async () => {
  const story = JSON.parse(await read("showcase/task-story.v1.json"));
  assert.equal(story.dataMode, "synthetic-preview-only");
  assert.equal(story.checkLabels.length, 3);
  for (const candidate of [story.rejected, story.kept]) {
    assert.equal(candidate.checks.length, story.checkLabels.length);
    assert.ok(candidate.checks.every(value => typeof value === "boolean"));
  }
  assert.ok(story.rejected.checks.some(value => !value));
  assert.ok(story.kept.checks.every(Boolean));
  assert.match(story.incident, /pawos-projection-plan\.md/);
  assert.match(story.nextResponse, /pawos-projection-plan\.md/);
  assert.match(story.memory, /候选 A.*拒绝.*候选 B/);
  const fixture = await read("control-center-web/src/features/agent/preview-data.ts");
  const stages = await read("control-center-web/src/paw-os/showcase/memory-flow-script.ts");
  assert.match(fixture, /text: taskStory.nextPrompt/);
  assert.match(fixture, /text: taskStory.nextResponse/);
  const recallText = stages.match(/readyText: '(继续[^']+)'/)?.[1];
  assert.ok(recallText && story.nextPrompt.includes(recallText), "recall playback waits for text in the shared task");
});
