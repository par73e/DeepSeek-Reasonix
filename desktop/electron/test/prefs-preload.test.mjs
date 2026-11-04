import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadPrefs, savePrefs, registerPrefs } = require("../src/prefs.js");
const source = fs.readFileSync(new URL("../src/preload.js", import.meta.url), "utf8");

function launch(file, storage) {
  const handlers = {};
  registerPrefs({ on: (name, fn) => { handlers[name] = fn; } }, () => file, () => true);
  const send = (name, arg) => {
    const event = {};
    handlers[name]?.(event, arg);
    return event.returnValue;
  };
  let tick;
  const localStorage = {
    get length() { return storage.size; },
    key: (i) => [...storage.keys()][i] ?? null,
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  vm.runInNewContext(source, {
    require: () => ({ contextBridge: { exposeInMainWorld() {} }, ipcRenderer: { sendSync: send, send } }),
    process: { argv: [], platform: process.platform }, localStorage,
    setInterval: (fn) => { tick = fn; }, window: { addEventListener() {} },
  });
  return () => tick();
}

test("a reused loopback origin restores the latest preferences from another launch", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rx-preload-prefs-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "window-prefs.json");
  const firstOrigin = new Map([["unrelated", "keep"]]);
  const first = launch(file, firstOrigin);
  firstOrigin.set("rx-theme", "dark");
  firstOrigin.set("rx-weight", "heavy");
  first();

  const secondOrigin = new Map();
  const second = launch(file, secondOrigin);
  assert.equal(secondOrigin.get("rx-theme"), "dark");
  secondOrigin.set("rx-theme", "light");
  secondOrigin.set("rx-weight", "normal");
  second();

  const restarted = launch(file, firstOrigin);
  assert.equal(firstOrigin.get("rx-theme"), "light");
  assert.equal(firstOrigin.get("rx-weight"), "normal");
  assert.equal(firstOrigin.get("unrelated"), "keep");
  restarted();
  assert.deepEqual(loadPrefs(file), { "rx-theme": "light", "rx-weight": "normal" });
});

test("a first launch can adopt existing page preferences without importing unrelated storage", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rx-preload-prefs-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "window-prefs.json");
  const storage = new Map([["rx-theme", "dark"], ["unrelated", "keep"]]);
  launch(file, storage)();
  assert.deepEqual(loadPrefs(file), { "rx-theme": "dark" });
  savePrefs(file, { "rx-theme": "light" });
  launch(file, storage)();
  assert.deepEqual(loadPrefs(file), { "rx-theme": "light" });
});
