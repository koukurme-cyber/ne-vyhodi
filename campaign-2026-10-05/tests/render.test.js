import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  chapters
} from '../chapters.js';
test('Frontend loads every sprite and renders all 24 chapters without runtime errors', async () => {
  const elements = new Map(),
    loaded = [];
  const context = new Proxy({}, {
    get: (o, k) => o[k] ?? (() => {}),
    set: (o, k, v) => (o[k] = v, true)
  });
  const make = () => ({
    style: {},
    dataset: {},
    textContent: '',
    children: [],
    addEventListener() {},
    append(...x) {
      this.children.push(...x)
    },
    replaceChildren(...x) {
      this.children = x;
      this.firstChild = x[0]
    }
  });
  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, id === 'game' ? {
        getContext: () => context
      } : make());
      return elements.get(id);
    },
    querySelectorAll: () => [],
    createElement: make,
    createTextNode: make
  };
  globalThis.window = {};
  const handlers = {};
  let nextFrame;
  globalThis.addEventListener = (name, fn) => { handlers[name] = fn; };
  globalThis.requestAnimationFrame = fn => { nextFrame = fn; return 0; };
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {}
  };
  globalThis.Image = class {
    constructor() {
      this.width = 500;
      this.height = 500;
    }
    set src(value) {
      const u = new URL(value);
      assert.ok(fs.existsSync(u), u.pathname);
      loaded.push(u.pathname);
      queueMicrotask(() => this.onload());
    }
  };
  const {
    engine,
    render
  } = await import('../game.js');
  await new Promise(resolve => setImmediate(resolve));
  // A complete keydown/keyup between frames must still trigger one action.
  engine.enter(0);
  engine.paused = false;
  engine.state.x = 450;
  const event = { code: 'Enter', repeat: false, preventDefault() {} };
  handlers.keydown(event);
  handlers.keyup(event);
  nextFrame(performance.now() + 17);
  assert.equal(engine.state.step, 1);
  nextFrame(performance.now() + 34);
  assert.equal(engine.state.step, 1);
  assert.ok(loaded.length > 35);
  assert.equal(document.getElementById('start').disabled, false);
  for (let i = 0; i < chapters.length; i++) {
    engine.enter(i);
    engine.state.x = engine.chapter.steps[0][1];
    engine.state.time = 2;
    render();
    assert.equal(document.getElementById('chapter').textContent, chapters[i].title);
  }
});
