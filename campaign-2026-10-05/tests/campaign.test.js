import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Engine
} from '../engine.js';
import {
  chapters,
  canFinish,
  hitSegment
} from '../chapters.js';
const storage = new Map();
globalThis.localStorage = {
  getItem: k => storage.get(k),
  setItem: (k, v) => storage.set(k, v)
};
test('All 24 chapters can complete through their actions, with combat gates', () => {
  const e = new Engine();
  for (let index = 0; index < chapters.length; index++) {
    e.enter(index);
    e.paused = false;
    const c = e.chapter,
      s = e.state;
    if (c.type === 'shooter') {
      s.x = c.steps.at(-1)[1];
      assert.equal(canFinish(s, c), false);
      e.action();
      assert.equal(s.step, 0);
      s.x = c.steps[0][1];
      e.action();
      assert.equal(s.step, 1);
      s.arena = c.arenas;
      s.enemies = [];
    }
    if (c.type === 'fight') {
      s.x = 2200;
      for (let j = 0; j < 9; j++) {
        s.time = 1.5;
        e.action();
      }
      assert.equal(s.kills, 9);
    }
    while (s.step < c.steps.length) {
      const step = c.steps[s.step];
      s.x = step[1];
      if (c.type === 'post' && s.step === 2) {
        for (let j = 0; j < 3; j++) {
          s.time = 1.2;
          s.cooldown = 0;
          e.action();
        }
      } else e.action();
    }
    assert.equal(canFinish(s, c), true, c.id);
    s.x = c.width - 80;
    e.update(.016);
    assert.equal(s.done, true, c.id);
  }
});
test('Combat bullets physically hit enemies and advance one arena', () => {
  const e = new Engine();
  e.enter(12);
  e.paused = false;
  const s = e.state;
  s.step = 1;
  s.x = 1100;
  s.enemies = [{
    x: 1300,
    y: 600,
    w: 80,
    h: 160,
    hp: 1,
    maxHp: 1,
    kind: 'shadow1',
    time: 0,
    cd: 5,
    ground: true
  }];
  e.fire();
  for (let i = 0; i < 30; i++) e.update(.016);
  assert.equal(s.kills, 1);
  assert.equal(s.arena, 1);
  assert.equal(s.enemies.length, 0);
});
test('Death, shelter immunity and retry restore checkpoint', () => {
  const e = new Engine();
  e.enter(2);
  const s = e.state;
  s.hidden = true;
  e.damage(5);
  assert.equal(s.hp, 5);
  s.hidden = false;
  s.x = 1900;
  s.step = 1;
  e.checkpoint();
  e.damage(5);
  assert.equal(s.dead, true);
  e.retry();
  assert.equal(e.state.x, 1900);
  assert.equal(e.state.step, 1);
  assert.equal(e.state.hp, 5);
});
test('Post office successes and misses have separate outcomes', () => {
  const e = new Engine();
  e.enter(7);
  const s = e.state;
  s.step = 2;
  s.x = e.chapter.steps[2][1];
  for (let i = 0; i < 3; i++) {
    s.time = 0;
    s.cooldown = 0;
    e.action();
  }
  assert.equal(s.step, 2);
  assert.equal(s.stamps, 0);
  assert.equal(s.misses, 0);
  for (let i = 0; i < 3; i++) {
    s.time = 1.2;
    s.cooldown = 0;
    e.action();
  }
  assert.equal(s.step, 3);
});
test('Once-only lines survive reload and checkpoint preserves arena progress', () => {
  storage.clear();
  let count = 0;
  const e = new Engine(() => count++);
  e.enter(12);
  e.state.x = 3100;
  e.state.arena = 3;
  e.state.step = 1;
  e.checkpoint();
  e.say('rurik', 'Спрашивай.');
  e.say('rurik', 'Спрашивай.');
  assert.equal(count, 1);
  const next = new Engine(() => count++);
  assert.equal(next.load(), true);
  assert.equal(next.state.x, 3100);
  assert.equal(next.state.arena, 3);
  next.say('rurik', 'Спрашивай.');
  assert.equal(count, 1);
});
test('Diagonal projectile collision uses full segment and rejects misses', () => {
  const e = {
    x: 500,
    y: 450,
    w: 80,
    h: 150
  };
  assert.equal(hitSegment({
    x: 200,
    y: 500
  }, {
    x: 700,
    y: 300
  }, e), true);
  assert.equal(hitSegment({
    x: 200,
    y: 100
  }, {
    x: 700,
    y: 100
  }, e), false);
});
test('Every referenced raster asset exists', async () => {
  const fs = await import('node:fs');
  const p = new URL('../assets/', import.meta.url);
  for (const c of chapters) assert.ok(fs.existsSync(new URL(c.bg + '.webp', p)), c.bg);
});
test('Actual spawned ground targets can be hit by a straight shot', () => {
  const e = new Engine();
  e.enter(12);
  e.paused = false;
  const s = e.state;
  s.step = 1;
  s.x = 1100;
  e.spawnArena();
  const target = s.enemies.find(x => x.ground);
  const initial = target.hp;
  e.fire();
  for (let i = 0; i < 12; i++) e.update(.016);
  assert.ok(target.hp < initial);
});
