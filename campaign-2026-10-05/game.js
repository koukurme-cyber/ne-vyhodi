import {
  Engine
} from './engine.js';
import {
  chapters,
  lines,
  isCombat,
  canFinish
} from './chapters.js';
const $ = id => document.getElementById(id),
  canvas = $('game'),
  ctx = canvas.getContext('2d');
const images = {},
  keys = {},
  W = 1280,
  H = 720,
  G = 600;
let camera = 0,
  ready = false,
  started = false,
  last = 0,
  toastT = 0,
  soundOn = false,
  audio = null,
  frame = 0,
  deathShown = false;

function sound(kind) {
  if (!soundOn) return;
  try {
    audio ||= new(window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(),
      gain = audio.createGain();
    o.connect(gain);
    gain.connect(audio.destination);
    o.type = kind === 'shot' ? 'sawtooth' : 'sine';
    const freq = {
      shot: 140,
      hurt: 80,
      step: 450,
      hide: 260,
      jump: 620,
      hit: 210,
      stamp: 330
    } [kind] || 300;
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, audio.currentTime + .1);
    gain.gain.setValueAtTime(.03, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12);
    o.start();
    o.stop(audio.currentTime + .13);
  } catch {}
}

function notify(text, seconds = 4) {
  if (!text) return;
  $('toast').textContent = text;
  $('toast').style.display = 'block';
  toastT = seconds;
}
const engine = new Engine(notify, sound);
engine.input = keys;
const aliases = {
  book: 'room-book',
  door: 'room-door_closed',
  rurik: 'npc-rurik-idle',
  vendor: 'npc-vendor',
  clerk: 'npc-clerk-idle',
  somna: 'npc-somna-somna1',
  bus: 'world-electric_bus',
  pilgrims: 'world-pilgrims',
  tram: 'world-tram',
  bench: 'world-bench',
  newspaper: 'world-newspaper',
  parcel: 'item-parcel',
  fish: 'item-fish',
  caviar: 'item-caviar'
};
const names = new Set([...chapters.map(c => c.bg), ...Object.values(aliases), 'cat', 'receipt', 'neighbor',
  'neighbor-talk', 'world-crate', 'shadow1', 'shadow2', 'shadow3', 'monster', 'gramophone', 'cage',
  'cabinet', 'shoot-up', 'shoot-crouch-down', 'shoot-straight', 'player-idle-idle_01',
  'player-walk-walk_01', 'player-walk-walk_02', 'player-run-run_01', 'player-run-run_02',
  'player-run-run_03', 'player-jump-jump_01', 'player-crouch-crouch_01', 'player-hide-hide_01'
]);
async function preload() {
  const failures = [];
  let count = 0;
  await Promise.all([...names].map(name => new Promise(resolve => {
    const im = new Image();
    im.onload = () => {
      images[name] = im;
      $('loading').textContent = `Рисунки: ${++count}/${names.size}`;
      resolve();
    };
    im.onerror = () => {
      failures.push(name);
      resolve();
    };
    im.src = new URL(`assets/${name}.webp`, import.meta.url).href;
  })));
  if (failures.length) {
    $('loading').textContent = `Не загрузились рисунки: ${failures.join(', ')}. Обновите страницу.`;
    return;
  }
  ready = true;
  $('start').disabled = false;
  $('loading').textContent = 'Готово. На телефоне удобно играть горизонтально.';
  if (engine.load()) $('continue').hidden = false;
}
$('start').disabled = true;
preload();

function drawImage(name, x, y, w, h, flip = false, alpha = 1) {
  const im = images[aliases[name] || name];
  if (!im) return;
  if (!h) h = w * im.height / im.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x - camera, y - h);
  if (flip) {
    ctx.translate(w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-w / 2, 0);
  }
  ctx.drawImage(im, -w / 2, 0, w, h);
  ctx.restore();
}

function text(str, x, y, size = 20, color = '#f6edd7') {
  ctx.font = `${size}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(str, x - camera, y);
}

function receipt(e) {
  const stage = e.hp > 10 ? 0 : e.hp > 5 ? 1 : 2;
  drawImage('receipt', e.x, e.y, 145 + stage * 12, 240 + stage * 8, false, .95);
  text(`Пени: ${Math.floor(e.time*37)} ₽`, e.x, e.y - 270, 16, '#e8bea0');
}

function drawCat(x) {
  drawImage('cat', x, 600, 78, 42);
}

function render() {
  const s = engine.state,
    c = engine.chapter;
  camera = Math.max(0, Math.min(c.width - W, s.x - 460));
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#18212b';
  ctx.fillRect(0, 0, W, H);
  const bg = images[c.bg];
  if (bg) {
    const tileW = 1280;
    for (let i = Math.floor(camera / tileW); i <= Math.floor((camera + W) / tileW); i++) ctx.drawImage(bg, i *
      tileW - camera, 0, tileW, 720);
  }
  ctx.fillStyle = '#0b12171f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#15191b4a';
  ctx.fillRect(0, 600, W, 120);
  if (['stealth', 'chase', 'light'].includes(c.type)) {
    for (const x of engine.shelters) {
      drawImage('bench', x, 600, 190, 110);
      drawCat(x + 30);
      if (Math.abs(s.x - x) < 85) text(s.hidden ? 'В укрытии · действие — выйти' : 'Укрытие · действие', x,
        450, 17);
    }
  }
  if (c.type === 'platform') {
    for (const p of engine.puddles) {
      ctx.save();
      ctx.fillStyle = '#5484a37a';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2 - camera, 610, p.w / 2, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a1bfcf';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2 - camera, 610, p.w / 2 - 10, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (c.type === 'light') {
    for (const x of engine.lights) {
      if (Math.sin(s.time * 1.3 + x) > .5) {
        ctx.fillStyle = '#fff4b825';
        ctx.beginPath();
        ctx.moveTo(x - camera, 0);
        ctx.lineTo(x - camera - 100, 600);
        ctx.lineTo(x - camera + 100, 600);
        ctx.fill();
      }
    }
  }
  c.steps.forEach((step, i) => {
    const [kind, x, label] = step;
    if (x < camera - 700 || x > camera + W + 700) return;
    if (c.type === 'fish' && i === 2) return;
    const size = kind === 'bus' || kind === 'tram' ? 670 : kind === 'pilgrims' ? 400 : kind === 'door' ?
      115 : kind === 'bench' ? 160 : kind === 'book' || kind === 'newspaper' || kind === 'fish' ||
      kind === 'caviar' ? 65 : kind === 'monster' ? 200 : 100;
    if ((kind === 'bus' || kind === 'tram') && s.step >= 1) {
      const bx = s.vehicleX || x;
      drawImage(kind, bx, 560, size);
      if (kind === 'bus') text('Это электробус', bx, 330, 23);
    } else if (kind === 'pilgrims' && s.step >= 1) {
      drawImage(kind, Math.min(x, (s.vehicleX || 1100) - 500) + Math.sin(s.time * 3) * 3, 600, size);
    } else if (c.type === 'fish' && ((kind === 'fish' && s.step > 0 && s.step < 3) || (kind ===
        'caviar' && s.step >= 2))) {} else drawImage(kind, x, kind === 'book' || kind === 'newspaper' ||
      kind === 'fish' || kind === 'caviar' ? 590 : 600, size);
    if (i === s.step) {
      text('◆', x, 380, 19, '#d5ba70');
      if (Math.abs(s.x - x) < 105 && !isCombat(c)) text(label, x, 350, 18);
    }
  });
  for (const n of engine.npcs) {
    drawImage(n.chase ? 'neighbor-talk' : 'neighbor', n.x, 600, 85, 145, n.face < 0);
    if (n.chase) {
      text('!', n.x, 420, 28, '#f0ab70');
      if (!n.said) {
        n.said = true;
        const idx = (s.index + n.home / 1300 | 0) % lines.length;
        engine.say(`npc-line-${idx}`, lines[idx], 3.5);
      }
    }
  }
  for (const e of s.enemies) {
    if (e.kind === 'receipt') receipt(e);
    else drawImage(e.kind, e.x, e.y, e.w, e.h, s.x < e.x);
    ctx.fillStyle = '#1c2228';
    ctx.fillRect(e.x - camera - e.w / 2, e.y - e.h - 12, e.w, 5);
    ctx.fillStyle = '#c9a16b';
    ctx.fillRect(e.x - camera - e.w / 2, e.y - e.h - 12, e.w * e.hp / e.maxHp, 5);
  }
  if (c.type === 'fight' && s.step === 0) {
    drawImage('monster', 2200, 600, 220, 260, s.x < 2200);
    text(s.time % 3.2 < 1.25 ? 'ЗАМАХ' : 'ПАУЗА · можно ударить', 2200, 290, 20);
    text(`Тень: ${9-s.kills}`, 2200, 320, 17);
  }
  const moving = !!keys.left !== !!keys.right;
  let pose = s.hidden ? 'player-hide-hide_01' : s.y < 600 ? 'player-jump-jump_01' : s.crouch ?
    'player-crouch-crouch_01' : moving ? keys.run ? `player-run-run_0${1+Math.floor(s.time*11)%3}` :
    `player-walk-walk_0${1+Math.floor(s.time*8)%2}` : 'player-idle-idle_01';
  let heroW = s.crouch ? 104 : 101,
    heroH = s.crouch ? 112 : 145;
  if (c.type === 'shooter') {
    pose = keys.up ? 'shoot-up' : keys.down ? 'shoot-crouch-down' : 'shoot-straight';
    heroW = keys.down ? 146 : 114;
    heroH = keys.down ? 120 : 174;
  }
  drawImage(pose, s.x, s.y, heroW, heroH, s.face < 0, s.invuln > 0 && Math.floor(s.time * 12) % 2 ? .4 : 1);
  if (c.type === 'fish' && s.step > 0) {
    if (s.step < 3) drawImage('fish', s.x + s.face * 38, s.y - 65, 58);
    if (s.step >= 2) drawImage('caviar', s.x + s.face * 25, s.y - 38, 42);
  }
  if (c.type === 'post' && s.step >= 2) drawImage('parcel', s.x + s.face * 32, s.y - 48, 55);
  for (const b of s.bullets) {
    ctx.strokeStyle = '#ffdf9d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - camera - b.vx * .018, b.y - b.vy * .018);
    ctx.lineTo(b.x - camera, b.y);
    ctx.stroke();
  }
  for (const b of s.enemyShots) {
    ctx.fillStyle = '#caa097';
    ctx.beginPath();
    ctx.arc(b.x - camera, b.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.type === 'post' && s.step === 2) {
    ctx.fillStyle = '#17232dde';
    ctx.fillRect(460, 70, 360, 90);
    ctx.fillStyle = '#52656b';
    ctx.fillRect(485, 110, 310, 12);
    ctx.fillStyle = '#84ac85';
    ctx.fillRect(485 + 310 * .36, 110, 310 * .28, 12);
    ctx.fillStyle = '#ffdda2';
    ctx.fillRect(485 + 310 * (s.time % 2.4) / 2.4 - 3, 104, 6, 24);
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'center';
    ctx.font = '17px Georgia';
    ctx.fillText(`Штемпели ${s.stamps}/3 · ошибки ${s.misses}/3`, 640, 96);
  }
  text(canFinish(s, c) ? 'ВЫХОД →' : 'Сначала завершите дела', c.width - 170, 460, 18);
  const st = c.steps[s.step];
  $('chapter').textContent = c.title;
  $('objective').textContent = c.type === 'shooter' ?
    `${st&&s.step===0?st[2]+' · ':''}Проходы ${s.arena}/${c.arenas} · ${s.enemies.length?'рассейте тени':s.step<c.steps.length&&s.arena>=c.arenas?'заберите квитанцию / закройте чемодан':'идите дальше'}` :
    st ? st[2] : 'Дойдите до выхода справа';
  $('health').textContent =
    `Бег ${Math.round(engine.stamina)} · Силы ${'●'.repeat(s.hp)}${'○'.repeat(5-s.hp)}`;
  $('time').textContent =
    `${Math.floor(engine.total/60)}:${String(Math.floor(engine.total%60)).padStart(2,'0')}`;
  $('action').textContent = c.type === 'shooter' ? 'Огонь' : c.type === 'fight' && s.step === 0 ? 'Удар' :
    'Действие';
}

function overlay(title, body, buttons) {
  const box = $('overlay');
  box.hidden = false;
  box.replaceChildren();
  const section = document.createElement('section'),
    h = document.createElement('h2'),
    p = document.createElement('p');
  h.textContent = title;
  p.textContent = body;
  section.append(h, p);
  for (const [label, fn] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    section.append(b, document.createTextNode(' '));
  }
  box.append(section);
}

function resume() {
  engine.paused = false;
  $('overlay').hidden = true;
  for (const k in keys) keys[k] = false;
  deathShown = false;
  last = performance.now();
}

function start(load = false) {
  if (!ready) return;
  if (!load) {
    engine.seen.clear();
    engine.total = 0;
    engine.unlocked = 0;
    engine.enter(0);
  } else engine.load();
  started = true;
  resume();
}
$('start').onclick = () => start();
$('continue').onclick = () => start(true);

function pause() {
  if (!started) return;
  engine.paused = true;
  engine.save();
  overlay('Пауза', 'Прогресс сохранён на этом устройстве.', [
    ['Продолжить', resume],
    ['Повторить главу', () => {
      engine.enter(engine.state.index);
      resume();
    }]
  ]);
}
$('pause').onclick = pause;
$('sound').onclick = () => {
  soundOn = !soundOn;
  $('sound').textContent = soundOn ? 'Звук вкл.' : 'Звук выкл.';
  sound('step');
};
$('chapters').onclick = () => {
  if (!ready) return;
  engine.paused = true;
  overlay('Главы', 'Открытые главы можно переиграть.', [
    ['Вернуться', () => started ? resume() : location.reload()]
  ]);
  const list = document.createElement('div');
  list.className = 'chapter-list';
  chapters.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = c.title;
    b.disabled = i > engine.unlocked;
    b.onclick = () => {
      engine.enter(i);
      started = true;
      resume();
    };
    list.append(b);
  });
  $('overlay').firstChild.append(list);
};
const map = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Enter: 'action',
  KeyE: 'action',
  KeyF: 'attack',
  KeyB: 'block'
};
addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (engine.paused && started) resume();
    else pause();
    return;
  }
  if (map[e.code]) {
    if (engine.paused) return;
    e.preventDefault();
    keys[map[e.code]] = true;
  }
});
addEventListener('keyup', e => {
  if (map[e.code]) {
    e.preventDefault();
    keys[map[e.code]] = false;
  }
});
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if (started && !engine.paused) pause();
});
for (const b of document.querySelectorAll('[data-key]')) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys[b.dataset.key] = true;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, () =>
    keys[b.dataset.key] = false);
}

function tick(t) {
  const dt = Math.min(.05, Math.max(0, (t - last) / 1000));
  last = t;
  engine.update(dt);
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $('toast').style.display = 'none';
  }
  if (ready) render();
  if (started && engine.state.dead && !deathShown) {
    deathShown = true;
    overlay('Попробовать ещё раз',
      'Повтор начнётся с последнего завершённого действия или открытого прохода.', [
        ['Повторить', () => {
          engine.retry();
          resume();
        }],
        ['Главы', () => $('chapters').click()]
      ]);
  }
  if (started && engine.state.done && !deathShown) {
    deathShown = true;
    const index = engine.state.index;
    if (index === chapters.length - 1) {
      overlay('НИЧЕГО НЕ ПРОИЗОШЛО',
        `Газета куплена. Вы вернулись в комнату. Время: ${Math.floor(engine.total/60)} мин.`, [
          ['Пройти заново', () => start(false)],
          ['Главы', () => $('chapters').click()]
        ]);
    } else overlay('Проход открыт', chapters[index + 1].title, [
      ['Дальше', () => {
        engine.enter(index + 1);
        resume();
      }]
    ]);
  }
  frame = requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

export {
  engine,
  render
};
