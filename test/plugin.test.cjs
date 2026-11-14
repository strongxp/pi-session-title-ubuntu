"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createPlugin } = require("../main.js");

function makeHost({ completion = { text: '"Fix session title generation"' }, update = { updated: true } } = {}) {
  const events = new Map();
  const calls = { completion: [], updates: [], settings: [], registeredCommands: [], removedCommands: [] };
  const host = {
    plugin: {
      getSettings: async () => ({
        sessionTitle: {
          enabled: true,
          modelKey: "provider/pinned",
          thinkingLevel: "high",
          promptTemplate: "Name this: {{userPrompt}} / {{assistantReply}}",
        },
      }),
      setSettings: async (value) => calls.settings.push(value),
    },
    events: {
      on: (name, handler) => events.set(name, handler),
      off: (name) => events.delete(name),
    },
    models: {
      list: async () => [
        { key: "provider/session", isDefault: false, thinkingLevels: ["off"] },
        { key: "provider/pinned", isDefault: true, thinkingLevels: ["off", "low"] },
      ],
    },
    app: { getAppearance: async () => ({ locale: "en" }) },
    session: {
      getAutoTitleContext: async ({ sessionId }) => ({
        sessionId,
        expectedTitle: "First request",
        userPrompt: "Fix startup",
        assistantReply: "Adjusted startup state",
        modelKey: "provider/session",
      }),
      setAutoTitle: async (input) => {
        calls.updates.push(input);
        return update;
      },
    },
    agent: {
      complete: async (input) => {
        calls.completion.push(input);
        return completion;
      },
    },
    commands: {
      register: async (command) => calls.registeredCommands.push(command),
      unregister: async (id) => calls.removedCommands.push(id),
    },
    ui: { openPanel: async () => {} },
  };
  return { host, events, calls };
}

test("a completed turn uses the configured prompt and model, then compare-and-sets the title", async () => {
  const { host, events, calls } = makeHost();
  const plugin = createPlugin(host);
  await plugin.onLoad();
  await events.get("session:turnEnded")({
    sessionId: "s-1",
    turnId: "t-1",
    reason: "completed",
  });

  assert.equal(calls.completion.length, 1);
  assert.equal(calls.completion[0].modelKey, "provider/pinned");
  assert.equal(calls.completion[0].thinkingLevel, "off");
  assert.match(calls.completion[0].messages[0].content, /Fix startup \/ Adjusted startup state/);
  assert.deepEqual(calls.updates, [
    {
      sessionId: "s-1",
      expectedTitle: "First request",
      title: "Fix session title generation",
    },
  ]);

  await events.get("session:turnEnded")({
    sessionId: "s-1",
    turnId: "t-1",
    reason: "completed",
  });
  assert.equal(calls.completion.length, 1);
  await plugin.onUnload();
  assert.deepEqual(calls.removedCommands, ["ubuntu-session-title.configure"]);
});

test("aborted turns do not spend a completion and disabled settings stop generation", async () => {
  const { host, events, calls } = makeHost();
  const plugin = createPlugin(host);
  await plugin.onLoad();
  await events.get("session:turnEnded")({ sessionId: "s-1", turnId: "t-1", reason: "error" });
  assert.equal(calls.completion.length, 0);

  host.plugin.getSettings = async () => ({ sessionTitle: { enabled: false } });
  await events.get("session:turnEnded")({ sessionId: "s-1", turnId: "t-2", reason: "completed" });
  assert.equal(calls.completion.length, 0);
  await plugin.onUnload();
});

test("unloading during a completion prevents a late title write", async () => {
  let finishCompletion;
  const completion = new Promise((resolve) => { finishCompletion = resolve; });
  const { host, events, calls } = makeHost({ completion });
  const plugin = createPlugin(host);
  await plugin.onLoad();
  const turn = events.get("session:turnEnded")({
    sessionId: "s-1",
    turnId: "t-1",
    reason: "completed",
  });
  while (calls.completion.length === 0) await new Promise((resolve) => setImmediate(resolve));
  await plugin.onUnload();
  finishCompletion({ text: "Late title" });
  await turn;
  assert.equal(calls.updates.length, 0);
});

test("a later completed turn retries after the first title completion fails", async () => {
  let finishFirstCompletion;
  const firstCompletion = new Promise((resolve) => { finishFirstCompletion = resolve; });
  let completionCount = 0;
  const { host, events, calls } = makeHost();
  host.agent.complete = async (input) => {
    calls.completion.push(input);
    completionCount += 1;
    if (completionCount === 1) return firstCompletion;
    return { text: "Recovered title" };
  };
  const plugin = createPlugin(host);
  await plugin.onLoad();
  const first = events.get("session:turnEnded")({ sessionId: "s-1", turnId: "t-1", reason: "completed" });
  while (completionCount === 0) await new Promise((resolve) => setImmediate(resolve));
  await events.get("session:turnEnded")({ sessionId: "s-1", turnId: "t-2", reason: "completed" });
  finishFirstCompletion({ text: " " });
  await first;
  while (completionCount < 2) await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.completion.length, 2);
  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0].title, "Recovered title");
  await plugin.onUnload();
});

test("saving a prompt template requires the user-prompt placeholder", async () => {
  const { host, calls } = makeHost();
  const plugin = createPlugin(host);
  await plugin.onLoad();
  await assert.rejects(
    plugin.onPanelInvoke("settings.save", { promptTemplate: "Generate a title" }),
    { code: "INVALID_PARAMS" },
  );
  assert.deepEqual(calls.settings, []);
  await plugin.onUnload();
});

test("the configure command follows the host locale", async () => {
  const { host, events, calls } = makeHost();
  const plugin = createPlugin(host);
  await plugin.onLoad();
  assert.equal(calls.registeredCommands.at(-1).title, "Ubuntu Session Titles: Configure");
  assert.equal(calls.registeredCommands.at(-1).id, "ubuntu-session-title.configure");

  await events.get("appearance:changed")({ locale: "zh-CN" });
  assert.equal(calls.registeredCommands.at(-1).title, "Ubuntu 会话标题：配置");
  assert.equal(calls.registeredCommands.at(-1).category, "Ubuntu 会话标题");
  await plugin.onUnload();
});

test("a fresh installation sends the Chinese default prompt using the session model", async () => {
  const { host, events, calls } = makeHost({ completion: { text: "修复 Ubuntu 启动问题" } });
  host.plugin.getSettings = async () => ({});
  const plugin = createPlugin(host);
  await plugin.onLoad();
  await events.get("session:turnEnded")({ sessionId: "s-ubuntu", turnId: "t-1", reason: "completed" });

  assert.equal(calls.completion.length, 1);
  const request = calls.completion[0];
  assert.equal(request.modelKey, "provider/session");
  assert.equal(request.thinkingLevel, "off");
  assert.match(request.messages[0].content, /使用简体中文/);
  assert.match(request.messages[0].content, /用户需求：\nFix startup/);
  assert.match(request.messages[0].content, /助手回复（如有）：\nAdjusted startup state/);
  assert.doesNotMatch(request.messages[0].content, /\{\{(?:userPrompt|assistantReply)\}\}/);
  assert.deepEqual(calls.updates, [{ sessionId: "s-ubuntu", expectedTitle: "First request", title: "修复 Ubuntu 启动问题" }]);
  await plugin.onUnload();
});
