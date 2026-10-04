import {
  chapters,
  freshState,
  isCombat,
  hitSegment,
  canFinish,
  stamp
} from './chapters.js';
export class Engine {
  constructor(notify = () => {}, sound = () => {}) {
    this.notify = notify;
    this.sound = sound;
    this.seen = new Set();
    this.total = 0;
    this.unlocked = 0;
    this.state = freshState();
    this.lastSave = 0;
    this.paused = true;
    this.input = {};
    this.npcs = [];
    this.actionLatch = false;
    this.jumpLatch = false;
    this.stamina = 7;
  }
  get chapter() {
    return chapters[this.state.index];
  }
  get shelters() {
    return Array.from({
      length: Math.floor(this.chapter.width / 1250)
    }, (_, i) => 1050 + i * 1250);
  }
  enter(index, save = true) {
    this.state = freshState(index);
    this.stamina = 7;
    this.unlocked = Math.max(this.unlocked, index);
    this.npcs = [];
    const c = this.chapter;
    if (['stealth', 'chase', 'light'].includes(c.type))
      for (let i = 0; i < Math.floor(c.width / 1300); i++) this.npcs.push({
        x: 1150 + i * 1300,
        home: 1150 + i * 1300,
        face: -1,
        chase: false,
        id: `${c.id}-${i}`,
        said: false
      });
    if (save) this.save();
  }
  say(id, text, duration = 4) {
    if (!text || this.seen.has(id)) return;
    this.seen.add(id);
    this.notify(text, duration);
    this.save();
  }
  save() {
    try {
      localStorage.setItem('ne-vyhodi-campaign-v1', JSON.stringify({
        index: this.state.index,
        unlocked: this.unlocked,
        total: this.total,
        seen: [...this.seen],
        checkpointX: this.state.checkpointX,
        checkpointStep: this.state.checkpointStep,
        arena: this.state.arena
      }));
    } catch {}
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('ne-vyhodi-campaign-v1'));
      if (!d || !Number.isInteger(d.index) || d.index < 0 || d.index >= chapters.length) return false;
      this.seen = new Set(Array.isArray(d.seen) ? d.seen : []);
      this.total = Math.max(0, Number(d.total) || 0);
      this.unlocked = Math.min(chapters.length - 1, Math.max(d.index, d.unlocked || 0));
      this.enter(d.index, false);
      const s = this.state;
      s.x = s.checkpointX = Math.max(100, Math.min(this.chapter.width - 100, d.checkpointX || 160));
      s.step = s.checkpointStep = Math.max(0, Math.min(this.chapter.steps.length, d.checkpointStep || 0));
      s.arena = Math.min(this.chapter.arenas || 0, Math.max(0, d.arena || 0));
      return true;
    } catch {
      return false;
    }
  }
  retry() {
    const s = this.state;
    const checkpoint = {
      x: s.checkpointX,
      step: s.checkpointStep,
      arena: s.arena
    };
    this.enter(s.index, false);
    Object.assign(this.state, {
      x: checkpoint.x,
      checkpointX: checkpoint.x,
      step: checkpoint.step,
      checkpointStep: checkpoint.step,
      arena: checkpoint.arena
    });
    this.paused = false;
  }
  damage(amount = 1) {
    const s = this.state;
    if (s.invuln > 0 || s.hidden || s.dead) return;
    s.hp = Math.max(0, s.hp - amount);
    s.invuln = 1.4;
    this.sound('hurt');
    if (s.hp === 0) {
      s.dead = true;
      this.paused = true;
      this.notify('Вы остановились. Можно повторить с последнего прохода.', 3);
    }
  }
  checkpoint() {
    const s = this.state;
    s.checkpointX = s.x;
    s.checkpointStep = s.step;
    this.save();
  }
  action() {
    const s = this.state,
      c = this.chapter;
    if (s.dead || s.done) return;
    if (c.type === 'shooter') {
      const step = c.steps[s.step];
      if (step && Math.abs(s.x - step[1]) < 105 && (s.step === 0 || s.arena === c.arenas && !s.enemies
          .length)) {
        s.step++;
        this.say(`${c.id}-step-${s.step}`, step[3], 5);
        this.checkpoint();
        return;
      }
      this.fire();
      return;
    }
    if (c.type === 'fight' && s.step === 0 && Math.abs(s.x - 2200) < 240) {
      const phase = s.time % 3.2;
      if (phase > 1.25 && phase < 2.85) {
        s.kills++;
        this.sound('hit');
        this.notify(`Тень отступает · ${s.kills}/9`, 1);
        if (s.kills >= 9) {
          s.arena = 1;
          s.step++;
          s.hp = 5;
          this.checkpoint();
        }
      } else this.notify('Тень замахивается. Блокируйте и дождитесь паузы.', 1.5);
      return;
    }
    const step = c.steps[s.step];
    if (step && Math.abs(s.x - step[1]) < 105) {
      if (isCombat(c) && s.step === c.steps.length - 1 && (s.arena < (c.arenas || 1) || s.enemies.length))
        return;
      if (c.type === 'post' && s.step === 2) {
        if (s.cooldown > 0) return;
        s.cooldown = .45;
        const ok = stamp(s);
        this.sound(ok ? 'stamp' : 'hurt');
        if (!ok) {
          if (s.misses >= 3) {
            s.stamps = 0;
            s.misses = 0;
            this.notify('Бланк испорчен. Возьмите чистый и попробуйте снова.', 2);
          }
          return;
        }
        if (s.stamps < 3) return;
      }
      if (c.type === 'transport' && s.step === 0) {
        s.aboard = true;
        s.vehicleX = s.x;
      }
      if (c.type === 'transport' && s.step === 1) s.aboard = false;
      s.step++;
      this.say(`${c.id}-step-${s.step}`, step[3], 5);
      this.sound('step');
      this.checkpoint();
      return;
    }
    const shelter = this.shelters.find(x => Math.abs(s.x - x) < 85);
    if (shelter !== undefined) {
      s.hidden = !s.hidden;
      this.sound('hide');
    }
  }
  fire() {
    const s = this.state;
    if (s.cooldown > 0 || s.hidden) return;
    s.cooldown = .22;
    const dy = this.input.up ? -.6 : this.input.down ? .45 : 0,
      n = Math.hypot(1, dy);
    s.bullets.push({
      x: s.x + s.face * 64,
      y: s.y - (this.input.down ? 72 : 126),
      vx: s.face * 1100 / n,
      vy: dy * 1100 / n,
      life: 1.5
    });
    this.sound('shot');
  }
  spawnArena() {
    const s = this.state,
      c = this.chapter;
    if (c.type !== 'shooter' || s.enemies.length || s.arena >= c.arenas) return;
    const center = 1200 + s.arena * (c.width - 2300) / Math.max(1, c.arenas - 1);
    if (s.x < center - 550) return;
    const boss = c.boss && s.arena === c.arenas - 1;
    const count = boss ? 1 : 3 + (s.arena % 3 === 2 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const ground = i % 2 === 0;
      const hp = boss ? 16 : 3 + (s.arena > 4 ? 1 : 0);
      s.enemies.push({
        x: center + i * 160,
        y: ground ? 600 : 390,
        w: boss ? 145 : 80,
        h: boss ? 210 : ground ? 170 : 140,
        hp,
        maxHp: hp,
        kind: boss ? 'receipt' : `shadow${1+i%3}`,
        time: i * .8,
        cd: 1 + i * .5,
        ground
      });
    }
  }
  update(dt) {
    if (this.paused) return;
    const s = this.state,
      c = this.chapter,
      k = this.input;
    this.total += dt;
    s.time += dt;
    s.invuln = Math.max(0, s.invuln - dt);
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (!k.run || s.hidden) this.stamina = Math.min(7, this.stamina + dt * .42);
    if (s.aboard) {
      const stop = c.steps[1][1];
      s.vehicleX = Math.min(stop, s.vehicleX + 170 * dt);
      s.x = s.vehicleX;
      s.y = 565;
    }
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    s.crouch = !!k.down && !isCombat(c);
    if (dir && !s.hidden && !s.aboard) {
      s.face = dir;
      const running = k.run && this.stamina > .1;
      this.stamina = Math.max(0, Math.min(7, this.stamina + dt * (running ? -1 : 0)));
      const speed = running ? 270 : s.crouch ? 105 : 175;
      const prev = s.x;
      s.x = Math.max(50, Math.min(c.width - 65, s.x + dir * speed * dt));
      if (c.type === 'platform' && s.y >= 599) {
        const puddle = this.puddles.find(p => s.x > p.x && s.x < p.x + p.w);
        if (puddle) {
          s.x = prev;
          this.damage();
        }
      }
    }
    if (k.jump && !s.aboard && !this.jumpLatch && s.y >= 600 && !s.hidden) {
      s.vy = -690;
      this.sound('jump');
    }
    this.jumpLatch = !!k.jump;
    s.vy += 1550 * dt;
    s.y = s.aboard ? 565 : Math.min(600, s.y + s.vy * dt);
    if (s.y >= 600) s.vy = 0;
    if (k.action && (c.type === 'shooter' || !this.actionLatch)) this.action();
    this.actionLatch = !!k.action;
    if (k.attack && c.type === 'fight' && s.cooldown <= 0) {
      s.cooldown = .4;
      this.action();
    }
    if (s.hidden) {
      for (const n of this.npcs) n.chase = false;
    }
    for (const n of this.npcs) {
      const dist = s.x - n.x;
      const sees = !s.hidden && !s.crouch && s.y > 500 && Math.abs(dist) < 340 && Math.sign(dist) === n
      .face;
      if (sees) n.chase = true;
      if (n.chase && !s.hidden) {
        n.face = Math.sign(dist) || 1;
        n.x += n.face * (c.type === 'chase' ? 245 : 215) * dt;
        if (Math.abs(dist) < 38 && s.y > 500) {
          this.damage();
          n.x -= n.face * 120;
        }
      } else {
        n.x += n.face * 65 * dt;
        if (Math.abs(n.x - n.home) > 220) n.face *= -1;
      }
    }
    if (c.type === 'light' && !s.hidden && !s.crouch && this.lights.some(x => Math.abs(s.x - x) < 70 && Math
        .sin(s.time * 1.3 + x) > .5)) this.damage();
    if (c.type === 'fight' && s.step === 0 && Math.abs(s.x - 2200) < 260 && s.time % 3.2 > 1 && s.time %
      3.2 < 1.25 && !k.block && s.y > 500) this.damage();
    this.spawnArena();
    for (const e of s.enemies) {
      e.time += dt;
      e.cd -= dt;
      if (e.ground) e.x += Math.sign(s.x - e.x) * 52 * dt;
      else e.y = 390 + Math.sin(e.time * 1.5) * 65;
      if (Math.abs(s.x - e.x) < 50 && Math.abs(s.y - e.y) < 170) this.damage();
      if (e.cd <= 0) {
        e.cd = Math.max(.9, 2.7 - s.arena * .12);
        const targetY = s.y - 80;
        const norm = Math.hypot(s.x - e.x, targetY - (e.y - e.h / 2));
        s.enemyShots.push({
          x: e.x,
          y: e.y - e.h / 2,
          vx: (s.x - e.x) / norm * 270,
          vy: (targetY - e.y + e.h / 2) / norm * 270,
          life: 4
        });
      }
    }
    for (const b of s.bullets) {
      const prev = {
        x: b.x,
        y: b.y
      };
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const e of s.enemies) {
        if (e.hp > 0 && b.life > 0 && hitSegment(prev, b, e)) {
          e.hp--;
          b.life = 0;
          this.sound('hit');
          if (e.hp <= 0) s.kills++;
          break;
        }
      }
    }
    const hadEnemies = s.enemies.length > 0;
    s.enemies = s.enemies.filter(e => e.hp > 0);
    if (hadEnemies && !s.enemies.length) {
      s.arena++;
      s.hp = Math.min(5, s.hp + 2);
      this.checkpoint();
      this.notify(`Проход открыт · ${s.arena}/${c.arenas}`, 1.3);
    }
    s.bullets = s.bullets.filter(b => b.life > 0);
    for (const b of s.enemyShots) {
      const p = {
        x: b.x,
        y: b.y
      };
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (hitSegment(p, b, {
          x: s.x,
          y: s.y,
          w: 38,
          h: k.down ? 70 : 140
        })) {
        this.damage();
        b.life = 0;
      }
    }
    s.enemyShots = s.enemyShots.filter(b => b.life > 0);
    if (c.type === 'shooter' && s.step === 0 && Math.abs(s.x - c.steps[0][1]) < 105 && k.action) {
      s.step = 1;
      this.say(`${c.id}-step-1`, c.steps[0][3], 5);
      this.checkpoint();
    }
    if (s.x > c.width - 140 && canFinish(s, c)) {
      s.done = true;
      this.paused = true;
      this.save();
    }
    if (this.total - this.lastSave > 10) {
      this.lastSave = this.total;
      this.save();
    }
  }
  get puddles() {
    return Array.from({
      length: Math.floor((this.chapter.width - 2500) / 850)
    }, (_, i) => ({
      x: 1900 + i * 850,
      w: 135
    }));
  }
  get lights() {
    return Array.from({
      length: Math.floor(this.chapter.width / 850)
    }, (_, i) => 1200 + i * 850);
  }
}
