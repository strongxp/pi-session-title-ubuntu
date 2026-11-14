"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeGeneratedTitle,
  normalizeSettings,
  isValidPromptTemplate,
  renderPrompt,
  resolveThinkingLevel,
  selectModel,
} = require("../title-engine.cjs");

test("settings accept only supported values and bound the prompt", () => {
  const value = normalizeSettings({
    enabled: false,
    modelKey: " provider/model ",
    thinkingLevel: "high",
    promptTemplate: `{{userPrompt}}${"x".repeat(20_100)}`,
  });
  assert.equal(value.enabled, false);
  assert.equal(value.modelKey, "provider/model");
  assert.equal(value.thinkingLevel, "high");
  assert.match(value.promptTemplate, /{{userPrompt}}/);
  assert.ok(!value.promptTemplate.includes("x".repeat(20_100)));
  assert.equal(normalizeSettings({ thinkingLevel: "turbo" }).thinkingLevel, "off");
  assert.equal(isValidPromptTemplate("Title: {{userPrompt}}"), true);
  assert.equal(isValidPromptTemplate("Title only"), false);
  assert.equal(isValidPromptTemplate(`{{userPrompt}}${"x".repeat(20_000)}`), false);
  assert.match(normalizeSettings({ promptTemplate: "No context" }).promptTemplate, /{{userPrompt}}/);
});

test("model selection prefers a configured model, then session, then default", () => {
  const models = [
    { key: "p/one", isDefault: false },
    { key: "p/two", isDefault: true },
  ];
  assert.equal(selectModel(models, "p/one", "p/two").key, "p/one");
  assert.equal(selectModel(models, "missing/model", "p/two").key, "p/two");
  assert.equal(selectModel(models, "missing/model", "missing/session").key, "p/two");
  assert.equal(selectModel([], "", ""), null);
});

test("prompt placeholders are substituted and unsupported thinking falls back to off", () => {
  assert.equal(
    renderPrompt("Task: {{userPrompt}} / {{assistantReply}}", {
      userPrompt: "Fix the startup bug",
      assistantReply: "Changed startup ordering",
    }),
    "Task: Fix the startup bug / Changed startup ordering",
  );
  assert.equal(resolveThinkingLevel("high", { thinkingLevels: ["off", "low"] }), "off");
  assert.equal(resolveThinkingLevel("low", { thinkingLevels: ["off", "low"] }), "low");
});

test("generated title text is normalized and limited to 80 Unicode characters", () => {
  assert.equal(normalizeGeneratedTitle('Title: “Fix startup ordering.”'), "Fix startup ordering");
  assert.equal(Array.from(normalizeGeneratedTitle("界".repeat(90))).length, 80);
  assert.equal(normalizeGeneratedTitle("   "), "");
});
