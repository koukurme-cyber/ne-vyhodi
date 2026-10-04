(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const promptEl = document.getElementById('prompt');
  const screenEl = document.getElementById('screen');
  const screenTitle = document.getElementById('screen-title');
  const screenText = document.getElementById('screen-text');
  const restartButton = document.getElementById('restart');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 421;
  const keys = new Set();
  const touch = { left: false, right: false };

  const hideSpots = [
    { x: 278, w: 70, label: 'тёмный подъезд' },
    { x: 682, w: 58, label: 'ниша у арки' }
  ];

  const world = {
    state: 'play',
    time: 0,
    shake: 0,
    player: null,
    npc: null,
    lastPrompt: ''
  };

  function reset() {
    world.state = 'play';
    world.time = 0;
    world.shake = 0;
    world.player = {
      x: 78,
      y: GROUND,
      vx: 0,
      facing: 1,
      hidden: false,
      hiddenIn: null,
      walkPhase: 0
    };
    world.npc = {
      x: 548,
      y: GROUND,
      dir: 1,
      state: 'patrol',
      detect: 0,
      lastSeenX: 548,
      searchTimer: 0,
      walkPhase: 0
    };
    screenEl.hidden = true;
    promptEl.hidden = true;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { return Math.abs(a - b); }

  function nearHideSpot() {
    if (world.player.hidden && world.player.hiddenIn) return world.player.hiddenIn;
    return hideSpots.find(s => world.player.x > s.x - 28 && world.player.x < s.x + s.w + 28) || null;
  }

  function action() {
    if (world.state !== 'play') return;
    const p = world.player;
    if (p.hidden) {
      p.hidden = false;
      p.x = p.hiddenIn.x + p.hiddenIn.w / 2;
      p.hiddenIn = null;
      return;
    }
    const spot = nearHideSpot();
    if (spot) {
      p.hidden = true;
      p.hiddenIn = spot;
      p.vx = 0;
      p.x = spot.x + spot.w / 2;
    }
  }

  function update(dt) {
    if (world.state !== 'play') return;
    world.time += dt;
    const p = world.player;
    const n = world.npc;

    let move = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA') || touch.left) move -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD') || touch.right) move += 1;

    if (!p.hidden) {
      const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const speed = running ? 206 : 142;
      p.vx = move * speed;
      if (move !== 0) {
        p.facing = Math.sign(move);
        p.walkPhase += dt * (running ? 12 : 8);
      }
      p.x = clamp(p.x + p.vx * dt, 32, 932);
    }

    const playerVisible = !p.hidden;
    const inFront = (p.x - n.x) * n.dir > -8;
    const visionRange = n.state === 'chase' ? 300 : 218;
    const closeEnough = dist(p.x, n.x) < visionRange;
    const canSee = playerVisible && inFront && closeEnough;

    if (n.state === 'patrol') {
      const speed = 54;
      n.x += n.dir * speed * dt;
      n.walkPhase += dt * 5.2;
      if (n.x > 760) { n.x = 760; n.dir = -1; }
      if (n.x < 446) { n.x = 446; n.dir = 1; }

      n.detect = canSee ? clamp(n.detect + dt * 2.6, 0, 1) : clamp(n.detect - dt * 2.2, 0, 1);
      if (canSee) n.lastSeenX = p.x;
      if (n.detect >= 1) n.state = 'chase';
    } else if (n.state === 'chase') {
      if (playerVisible) {
        n.dir = p.x >= n.x ? 1 : -1;
        n.lastSeenX = p.x;
        n.x += n.dir * 124 * dt;
        n.walkPhase += dt * 10;
        if (dist(p.x, n.x) < 31) lose();
      } else {
        n.state = 'search';
        n.searchTimer = 1.7;
      }
    } else if (n.state === 'search') {
      const dx = n.lastSeenX - n.x;
      if (Math.abs(dx) > 8) {
        n.dir = Math.sign(dx);
        n.x += n.dir * 74 * dt;
        n.walkPhase += dt * 6.5;
      } else {
        n.searchTimer -= dt;
        if (n.searchTimer <= 0) {
          n.state = 'patrol';
          n.detect = 0;
        }
      }
      if (canSee) {
        n.detect += dt * 3;
        if (n.detect >= .45) n.state = 'chase';
      }
    }

    if (p.x > 914) win();

    const spot = nearHideSpot();
    if (p.hidden) setPrompt('E — выйти');
    else if (spot) setPrompt(`E — спрятаться: ${spot.label}`);
    else setPrompt('');
  }

  function setPrompt(text) {
    if (text === world.lastPrompt) return;
    world.lastPrompt = text;
    promptEl.hidden = !text;
    promptEl.textContent = text;
  }

  function lose() {
    world.state = 'lost';
    world.shake = 1;
    screenTitle.textContent = 'РАЗГОВОР';
    screenText.textContent = '«Вы знаете, я тут подумал…»';
    restartButton.textContent = 'Уйти молча';
    setTimeout(() => { screenEl.hidden = false; }, 250);
  }

  function win() {
    world.state = 'won';
    screenTitle.textContent = 'ВЫ ВЫШЛИ';
    screenText.textContent = 'Из двора. Это было опрометчиво.';
    restartButton.textContent = 'Вернуться';
    screenEl.hidden = false;
  }

  function draw() {
    ctx.save();
    if (world.shake > 0) {
      ctx.translate(Math.sin(world.time * 80) * 3, 0);
      world.shake *= .92;
    }

    drawBackground();
    drawHideSpots();
    drawStreetDetails();
    drawNpc(world.npc);
    drawPlayer(world.player);
    drawHud();
    ctx.restore();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#7d8585');
    grad.addColorStop(.58, '#5c6261');
    grad.addColorStop(1, '#424543');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#7d786c';
    ctx.fillRect(0, 58, 960, 338);
    ctx.fillStyle = '#6f6a61';
    ctx.fillRect(0, 58, 960, 18);
    ctx.fillStyle = '#827d73';
    ctx.fillRect(0, 155, 960, 7);

    const windows = [54,138,224,352,444,540,636,748,838];
    for (let row = 0; row < 3; row++) {
      windows.forEach((x, i) => {
        const y = 92 + row * 94 + ((i + row) % 3) * 3;
        ctx.fillStyle = '#3c4140';
        ctx.fillRect(x, y, 45, 63);
        ctx.fillStyle = ((i + row) % 5 === 0) ? '#b2a77f' : '#252a2b';
        ctx.fillRect(x + 4, y + 4, 17, 25);
        ctx.fillRect(x + 24, y + 4, 17, 25);
        ctx.fillRect(x + 4, y + 33, 17, 25);
        ctx.fillRect(x + 24, y + 33, 17, 25);
        ctx.strokeStyle = '#9b9487';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 45, 63);
      });
    }

    ctx.fillStyle = '#3a3e3c';
    ctx.fillRect(190, 76, 8, 320);
    ctx.fillStyle = '#2e3332';
    ctx.fillRect(186, 112, 16, 5);
    ctx.fillRect(186, 248, 16, 5);

    ctx.fillStyle = '#353938';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#2d302f';
    ctx.fillRect(0, GROUND + 10, W, 5);
    ctx.fillStyle = '#555956';
    ctx.fillRect(90, 474, 250, 2);
    ctx.fillRect(490, 462, 170, 2);

    ctx.fillStyle = '#20282999';
    ellipse(160, 475, 80, 11);
    ellipse(595, 492, 110, 12);

    ctx.fillStyle = '#262826';
    ctx.fillRect(822, 250, 138, 171);
    ctx.beginPath();
    ctx.arc(891, 251, 69, Math.PI, 0);
    ctx.lineTo(960, 421);
    ctx.lineTo(822, 421);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#101414';
    ctx.fillRect(847, 289, 113, 132);
    ctx.beginPath();
    ctx.arc(903, 289, 56, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#a39a81';
    ctx.font = '11px Arial';
    ctx.fillText('НА УЛИЦУ', 866, 274);
  }

  function drawHideSpots() {
    ctx.fillStyle = '#252724';
    ctx.fillRect(278, 282, 70, 139);
    ctx.fillStyle = '#161917';
    ctx.fillRect(287, 294, 52, 127);
    ctx.fillStyle = '#4e4d45';
    ctx.fillRect(342, 334, 4, 36);
    ctx.fillStyle = '#b6aa87';
    ctx.beginPath();
    ctx.arc(333, 356, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#565349';
    ctx.fillRect(682, 321, 58, 100);
    ctx.fillStyle = '#202321';
    ctx.fillRect(689, 330, 44, 91);
  }

  function drawStreetDetails() {
    ctx.fillStyle = '#4a3f32';
    ctx.fillRect(370, 385, 101, 10);
    ctx.fillRect(379, 395, 6, 26);
    ctx.fillRect(455, 395, 6, 26);
    ctx.fillStyle = '#73624e';
    ctx.fillRect(366, 369, 108, 8);

    ctx.strokeStyle = '#2a2c2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, 214); ctx.lineTo(770, 242); ctx.stroke();
    const cloth = [[150,218,34,45,'#b9b2a1'], [245,222,28,35,'#827d70'], [605,236,42,40,'#aaa38e']];
    cloth.forEach(([x,y,w,h,c]) => { ctx.fillStyle = c; ctx.fillRect(x,y,w,h); });

    ctx.save();
    ctx.translate(714, 178);
    ctx.rotate(-.03);
    ctx.fillStyle = '#4f4a43';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('НЕ ВЫХОДИ', 0, 0);
    ctx.restore();
  }

  function drawPlayer(p) {
    if (p.hidden) {
      ctx.fillStyle = '#d6d1bf88';
      ctx.fillRect(p.x - 8, 355, 5, 2);
      ctx.fillRect(p.x + 3, 355, 5, 2);
      return;
    }

    const bob = Math.sin(p.walkPhase * 2) * (Math.abs(p.vx) > 1 ? 1.4 : .35);
    const x = p.x, y = p.y + bob;
    const step = Math.sin(p.walkPhase) * 7;
    ctx.save();
    ctx.translate(x, y);
    if (p.facing < 0) ctx.scale(-1, 1);

    ctx.strokeStyle = '#202321';
    ctx.lineWidth = 8;
    line(-4, -45, -7 + step, -7);
    line(7, -45, 8 - step, -7);
    ctx.strokeStyle = '#121413';
    ctx.lineWidth = 6;
    line(-12 + step, -5, -1 + step, -5);
    line(3 - step, -5, 14 - step, -5);

    ctx.fillStyle = '#282b29';
    ctx.beginPath();
    ctx.moveTo(-20, -101); ctx.lineTo(17, -101); ctx.lineTo(25, -42); ctx.lineTo(-20, -42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3c403c';
    ctx.beginPath();
    ctx.moveTo(-14, -95); ctx.lineTo(6, -95); ctx.lineTo(15, -48); ctx.lineTo(-10, -48); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#8c6946';
    ctx.fillRect(-12, -103, 28, 6);
    ctx.fillRect(7, -98, 6, 31);

    ctx.fillStyle = '#c9b49b';
    ellipse(2, -121, 15, 19);
    ctx.fillStyle = '#47423a';
    ctx.beginPath();
    ctx.arc(-1, -137, 14, Math.PI * .95, Math.PI * 2.02);
    ctx.lineTo(17, -126); ctx.lineTo(8, -141); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#585147';
    ctx.fillRect(-14, -136, 9, 6);
    ctx.fillRect(7, -140, 8, 6);
    ctx.strokeStyle = '#272724';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-4, -123, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(9, -123, 6, 0, Math.PI * 2); ctx.stroke();
    line(2, -123, 3, -123);
    ctx.fillStyle = '#8e7462';
    ctx.fillRect(13, -113, 6, 2);

    ctx.strokeStyle = '#333733';
    ctx.lineWidth = 7;
    line(14, -91, 8, -64);
    ctx.restore();
  }

  function drawNpc(n) {
    const bob = Math.sin(n.walkPhase * 2) * 1.2;
    const step = Math.sin(n.walkPhase) * 6;
    ctx.save();
    ctx.translate(n.x, n.y + bob);
    if (n.dir < 0) ctx.scale(-1, 1);

    ctx.strokeStyle = '#332e2a';
    ctx.lineWidth = 8;
    line(-5, -43, -7 + step, -5);
    line(7, -43, 8 - step, -5);

    ctx.fillStyle = '#59483f';
    ctx.beginPath();
    ctx.moveTo(-21, -98); ctx.lineTo(18, -98); ctx.lineTo(24, -40); ctx.lineTo(-18, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#817064';
    ctx.fillRect(-19, -87, 35, 5);

    ctx.fillStyle = '#b99d84';
    ellipse(1, -118, 15, 18);
    ctx.fillStyle = '#3b342f';
    ctx.beginPath();
    ctx.arc(0, -133, 15, Math.PI, Math.PI * 2); ctx.lineTo(15, -124); ctx.lineTo(-15, -124); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b5148';
    ctx.fillRect(-18, -137, 34, 5);

    if (n.state === 'chase') {
      ctx.strokeStyle = '#6d4b3d';
      ctx.lineWidth = 6;
      line(16, -88, 31, -80);
      ctx.fillStyle = '#efe5cb';
      ctx.font = 'bold 22px Arial';
      ctx.fillText('!', 25, -145);
    } else if (n.detect > .08 || n.state === 'search') {
      ctx.fillStyle = '#ded5bf';
      ctx.font = 'bold 19px Arial';
      ctx.fillText('…', 21, -143);
    }
    ctx.restore();

    if (n.state === 'patrol' && n.detect > 0) {
      const w = 54;
      ctx.fillStyle = '#111b'; ctx.fillRect(n.x - w/2, n.y - 164, w, 5);
      ctx.fillStyle = '#b2624e'; ctx.fillRect(n.x - w/2, n.y - 164, w * n.detect, 5);
    }
  }

  function drawHud() {
    ctx.fillStyle = '#0f1110b8';
    ctx.fillRect(18, 18, 155, 45);
    ctx.fillStyle = '#d6cfbd';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('СОСТОЯНИЕ', 30, 36);
    ctx.font = '17px Georgia';
    const status = world.player.hidden ? 'не существует' : (world.npc.state === 'chase' ? 'заметили' : 'идёт');
    ctx.fillText(status, 30, 55);
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .033);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) action();
  }, { passive: false });
  window.addEventListener('keyup', e => keys.delete(e.code));
  restartButton.addEventListener('click', reset);

  function bindHold(id, prop) {
    const el = document.getElementById(id);
    const on = e => { e.preventDefault(); touch[prop] = true; el.classList.add('active'); };
    const off = e => { e.preventDefault(); touch[prop] = false; el.classList.remove('active'); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }
  bindHold('left', 'left');
  bindHold('right', 'right');
  document.getElementById('action').addEventListener('pointerdown', e => { e.preventDefault(); action(); });

  reset();
  requestAnimationFrame(frame);
})();
