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
  const touch = { left: false, right: false, run: false };
  const actionButton = document.getElementById('action');
  const statusEl = document.getElementById('status');
  const assets = {};
  let ready = false;
  let endTimer;
  let cameraX = 0;
  let compact = false;

  function resize() {
    compact = matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    canvas.width = compact ? 720 : 960;
    canvas.height = 540;
  }
  resize();
  window.addEventListener('resize', resize);

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }

  async function loadAssets() {
    try {
      const images = await Promise.all([
        loadImage('assets/courtyard.png'),
        loadImage('assets/passage.png'),
        loadImage('assets/street.png'),
        loadImage('assets/characters.png')
      ]);
      assets.backgrounds = images.slice(0, 3);
      assets.characters = images[3];
      // Trim transparent atlas padding once; keep all poses at the same scale.
      assets.frames = [];
      const cellW = assets.characters.width / 3;
      const cellH = assets.characters.height / 2;
      for (let row = 0; row < 2; row++) {
        const frames = [];
        for (let col = 0; col < 3; col++) {
          const scratch = document.createElement('canvas');
          scratch.width = Math.round(cellW);
          scratch.height = Math.round(cellH);
          const c = scratch.getContext('2d', { willReadFrequently: true });
          c.drawImage(assets.characters, col * cellW, row * cellH, cellW, cellH, 0, 0, scratch.width, scratch.height);
          const data = c.getImageData(0, 0, scratch.width, scratch.height).data;
          let left = scratch.width, right = 0, top = scratch.height, bottom = 0;
          for (let y = 0; y < scratch.height; y++) for (let x = 0; x < scratch.width; x++) {
            if (data[(y * scratch.width + x) * 4 + 3] > 32) {
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          frames.push({ image: scratch, left, top, width: right - left + 1, height: bottom - top + 1 });
        }
        assets.frames.push(frames);
      }
      ready = true;
      reset();
    } catch (error) {
      screenTitle.textContent = 'ДВОР НЕ ЗАГРУЗИЛСЯ';
      screenText.textContent = 'Попробуйте загрузить его ещё раз.';
      restartButton.textContent = 'Повторить';
      screenEl.hidden = false;
      console.error('Asset loading failed:', error.message);
    }
  }

  const neighborLine = 'Иосиф Александрович, я тут стих написала';
  const levels = [
    {
      name: 'Двор', width: 960, exit: 914,
      objective: 'Пройдите к арке. Соседка хочет прочесть свой стих.',
      ending: 'Из двора. Это было опрометчиво.',
      hides: [{ x: 278, w: 70, label: 'тёмный подъезд' }, { x: 623, w: 80, label: 'ниша у арки' }],
      enemies: [{ x: 548, dir: 1, min: 446, max: 760, speed: 54 }]
    },
    {
      name: 'Проходной двор', width: 1280, exit: 1234,
      objective: 'Соседка идёт навстречу. Пропустите её в тёмном подъезде.',
      ending: 'Ещё один двор. У людей по-прежнему есть что сказать.',
      hides: [{ x: 256, w: 80, label: 'тёмный подъезд' }, { x: 627, w: 90, label: 'дверь мастерской' }, { x: 960, w: 85, label: 'ниша у прохода' }],
      enemies: [{ x: 790, dir: -1, min: 160, max: 1120, speed: 62 }]
    },
    {
      name: 'Улица', width: 1600, exit: 1534,
      objective: 'Две соседки. Дождитесь просвета и уходите к дальнему подъезду.',
      ending: 'Вы добрались. Сегодня вас никто не прочёл.',
      hides: [{ x: 240, w: 96, label: 'подъезд' }, { x: 672, w: 112, label: 'боковая дверь' }, { x: 1056, w: 112, label: 'тёмная ниша' }],
      enemies: [
        { x: 580, dir: -1, min: 120, max: 790, speed: 64 },
        { x: 1460, dir: 1, min: 500, max: 1510, speed: 54, line: 'Иосиф Александрович! Всего на минутку!' }
      ]
    }
  ];
  let levelIndex = 0;
  let hideSpots = levels[0].hides;
  const levelTitle = document.getElementById('level-title');
  const objectiveEl = document.getElementById('objective');
  const speechEl = document.getElementById('speech');
  const levelButtons = [...document.querySelectorAll('[data-level]')];

  function selectLevel(index) {
    if (!ready) return;
    levelIndex = clamp(index, 0, levels.length - 1);
    reset();
  }

  function continueRun() {
    if (!ready) { loadAssets(); return; }
    if (world.state === 'won') selectLevel(levelIndex === levels.length - 1 ? 0 : levelIndex + 1);
    else reset();
  }

  const world = {
    state: 'play',
    time: 0,
    shake: 0,
    player: null,
    npc: null,
    npcs: [],
    lastPrompt: ''
  };

  function reset() {
    clearTimeout(endTimer);
    clearInput();
    world.lastPrompt = '';
    cameraX = 0;
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
    const level = levels[levelIndex];
    hideSpots = level.hides;
    world.npcs = level.enemies.map(enemy => ({
      ...enemy, y: GROUND, state: 'patrol', detect: 0,
      lastSeenX: enemy.x, searchTimer: 0, lostSight: 0,
      walkPhase: 0, speechTimer: 0, spoke: false,
      line: enemy.line || neighborLine
    }));
    world.npc = world.npcs[0];
    levelTitle.textContent = `${levelIndex + 1} / ${levels.length} · ${level.name}`;
    objectiveEl.textContent = level.objective;
    speechEl.textContent = '';
    levelButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === levelIndex));
    });
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
    if (!ready || world.state !== 'play') return;
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
    if (!ready || world.state !== 'play') return;
    world.time += dt;
    const p = world.player;

    let move = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA') || touch.left) move -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD') || touch.right) move += 1;

    if (!p.hidden) {
      const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.run;
      const speed = running ? 206 : 142;
      p.vx = move * speed;
      if (move !== 0) {
        p.facing = Math.sign(move);
        p.walkPhase += dt * (running ? 12 : 8);
      }
      p.x = clamp(p.x + p.vx * dt, 32, levels[levelIndex].width - 28);
    }

    for (const n of world.npcs) {
      updateNpc(n, dt);
      if (world.state !== 'play') break;
    }
    if (world.state === 'play' && p.x > levels[levelIndex].exit) win();

    const spot = nearHideSpot();
    actionButton.disabled = !p.hidden && !spot;
    actionButton.textContent = p.hidden ? 'Выйти' : 'Спрятаться';
    if (p.hidden) setPrompt(compact ? 'Вы в укрытии' : 'E — выйти из укрытия');
    else if (spot) setPrompt(compact ? spot.label : `E — спрятаться: ${spot.label}`);
    else setPrompt('');
  }

  function updateNpc(n, dt) {
    const p = world.player;
    n.speechTimer = Math.max(0, n.speechTimer - dt);
    const playerVisible = !p.hidden;
    const inFront = (p.x - n.x) * n.dir > -8;
    const visionRange = n.state === 'chase' ? 300 : 218;
    const closeEnough = dist(p.x, n.x) < visionRange;
    const canSee = playerVisible && inFront && closeEnough;

    if (n.state === 'patrol') {
      const speed = n.speed;
      n.x += n.dir * speed * dt;
      n.walkPhase += dt * 5.2;
      if (n.x > n.max && n.dir > 0) n.dir = -1;
      if (n.x < n.min && n.dir < 0) n.dir = 1;

      n.detect = canSee ? clamp(n.detect + dt * 2.6, 0, 1) : clamp(n.detect - dt * 2.2, 0, 1);
      if (canSee) n.lastSeenX = p.x;
      if (n.detect >= 1) n.state = 'chase';
    } else if (n.state === 'chase') {
      if (playerVisible && dist(p.x, n.x) < visionRange) {
        n.lostSight = 0;
        n.dir = p.x >= n.x ? 1 : -1;
        n.lastSeenX = p.x;
        n.x += n.dir * 124 * dt;
        n.walkPhase += dt * 10;
        if (dist(p.x, n.x) < 31) lose(n);
      } else {
        n.lostSight += dt;
        if (p.hidden || n.lostSight > .65) {
          n.state = 'search';
          n.detect = 0;
          n.searchTimer = 1.7;
        } else {
          n.x += n.dir * Math.min(124 * dt, dist(n.x, n.lastSeenX));
          n.walkPhase += dt * 10;
        }
      }
    } else if (n.state === 'search') {
      const dx = n.lastSeenX - n.x;
      if (Math.abs(dx) > 8) {
        n.dir = Math.sign(dx);
        n.x += n.dir * Math.min(74 * dt, Math.abs(dx));
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

    if (canSee && n.detect > .3 && !n.spoke) {
      n.speechTimer = 3.8;
      n.spoke = true;
      speechEl.textContent = n.line;
    }
    if (n.state === 'patrol' && n.detect === 0 && n.speechTimer === 0) n.spoke = false;
  }

  function setPrompt(text) {
    if (text === world.lastPrompt) return;
    world.lastPrompt = text;
    promptEl.hidden = !text;
    promptEl.textContent = text;
  }

  function lose(n) {
    world.state = 'lost';
    world.shake = 1;
    screenTitle.textContent = 'РАЗГОВОР';
    screenText.textContent = `«${n.line}»`;
    restartButton.textContent = 'Уйти молча';
    clearInput();
    endTimer = setTimeout(() => { if (world.state === 'lost') screenEl.hidden = false; }, 250);
  }

  function win() {
    world.state = 'won';
    clearInput();
    screenTitle.textContent = 'ВЫ ВЫШЛИ';
    screenText.textContent = levels[levelIndex].ending;
    restartButton.textContent = levelIndex < levels.length - 1 ? 'Дальше' : 'Сначала';
    screenEl.hidden = false;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!ready) return;
    const level = levels[levelIndex];
    const viewWidth = compact ? 600 : W;
    const zoom = canvas.width / viewWidth;
    const viewHeight = canvas.height / zoom;
    const targetCamera = clamp(world.player.x - (compact ? 190 : 320), 0, level.width - viewWidth);
    cameraX += (targetCamera - cameraX) * .12;
    const cameraY = compact ? GROUND - viewHeight * .78 : 0;
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);
    if (world.shake > 0) {
      ctx.translate(Math.sin(performance.now() * .08) * 3 * world.shake, 0);
      world.shake *= .92;
    }
    ctx.drawImage(assets.backgrounds[levelIndex], 0, 0, level.width, H);
    drawMarkers();
    world.npcs.forEach(drawVision);
    world.npcs.forEach(n => drawCharacter(n, 1));
    if (!world.player.hidden) drawCharacter(world.player, 0);
    else {
      ctx.fillStyle = '#e0d5b4';
      ctx.font = '16px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('•', world.player.x, GROUND - 72);
      ctx.textAlign = 'left';
    }
    // Snow is decorative and does not participate in collision or visibility.
    ctx.fillStyle = '#e0e4e066';
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + world.time * (7 + i % 4)) % level.width;
      const y = (i * 83 + world.time * (18 + i % 7)) % H;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 2);
    }
    ctx.restore();
    drawSpeech(viewWidth, zoom);
    drawHud();
  }

  function drawMarkers() {
    ctx.textAlign = 'center';
    ctx.font = '14px Arial';
    hideSpots.forEach(spot => {
      const near = nearHideSpot() === spot;
      ctx.fillStyle = near ? '#e8dbc2' : '#bbbcb4';
      ctx.fillText(near ? 'УКРЫТИЕ' : '···', spot.x + spot.w / 2, GROUND + 26);
      if (near) {
        ctx.strokeStyle = '#e8dbc299';
        ctx.lineWidth = 1;
        ctx.strokeRect(spot.x + 5, GROUND - 126, spot.w - 10, 122);
      }
    });
    ctx.fillStyle = '#dfccb0';
    ctx.fillText('ВЫХОД', levels[levelIndex].exit - 27, GROUND + 26);
    ctx.textAlign = 'left';
  }

  function drawVision(n) {
    if (n.state === 'search') return;
    const range = n.state === 'chase' ? 150 : 218;
    const gradient = ctx.createLinearGradient(n.x, 0, n.x + range * n.dir, 0);
    gradient.addColorStop(0, n.state === 'chase' ? '#b75f3633' : '#dbc9a11f');
    gradient.addColorStop(1, '#dbc9a100');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(n.x + 10 * n.dir, GROUND - 115);
    ctx.lineTo(n.x + range * n.dir, GROUND - 170);
    ctx.lineTo(n.x + range * n.dir, GROUND - 15);
    ctx.closePath();
    ctx.fill();
  }

  function drawCharacter(entity, row) {
    const moving = row === 0 ? Math.abs(entity.vx) > 0 : (entity.state !== 'search' || dist(entity.x, entity.lastSeenX) > 8);
    const index = moving ? [1, 0, 2, 0][Math.floor(entity.walkPhase * .6) % 4] : 0;
    const frame = assets.frames[row][index];
    const height = row === 0 ? 149 : 137;
    const scale = height / Math.max(...assets.frames[row].map(f => f.height));
    const width = frame.width * scale;
    const h = frame.height * scale;
    ctx.fillStyle = '#10151966';
    ellipse(entity.x, GROUND + 2, 22, 5);
    ctx.save();
    ctx.translate(entity.x, GROUND);
    if ((row === 0 ? entity.facing : entity.dir) < 0) ctx.scale(-1, 1);
    ctx.drawImage(frame.image, frame.left, frame.top, frame.width, frame.height, -width / 2, -h, width, h);
    ctx.restore();
    if (row === 1) {
      const label = entity.state === 'chase' ? '!' : entity.state === 'search' ? '?' : entity.detect > .08 ? '…' : '';
      ctx.fillStyle = entity.state === 'chase' ? '#ecc2a6' : '#e2dac9';
      ctx.font = 'bold 26px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(label, entity.x, GROUND - 157);
      ctx.textAlign = 'left';
      if (entity.state === 'patrol' && entity.detect > .01) {
        ctx.fillStyle = '#101519'; ctx.fillRect(entity.x - 26, GROUND - 172, 52, 5);
        ctx.fillStyle = '#c58b62'; ctx.fillRect(entity.x - 26, GROUND - 172, 52 * entity.detect, 5);
      }
    }
  }

  function drawSpeech(viewWidth, zoom) {
    const speaking = world.npcs.filter(n => n.speechTimer > 0 && n.x > cameraX - 100 && n.x < cameraX + viewWidth + 100);
    speaking.forEach((n, index) => {
      const width = Math.min(canvas.width - 24, compact ? 390 : 310);
      const x = clamp((n.x - cameraX) * zoom - width / 2, 12, canvas.width - width - 12);
      const y = 86 + index * 86;
      ctx.font = compact ? '20px Georgia' : '17px Georgia';
      const lines = [];
      let line = '';
      n.line.split(' ').forEach(word => {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > width - 28) { lines.push(line); line = word; }
        else line = next;
      });
      if (line) lines.push(line);
      const lineHeight = compact ? 26 : 22;
      const height = lines.length * lineHeight + 24;
      ctx.fillStyle = '#ebe1cc';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#262623';
      lines.forEach((text, i) => ctx.fillText(text, x + 14, y + 25 + i * lineHeight));
      ctx.fillStyle = '#ebe1cc';
      ctx.beginPath();
      const tip = clamp((n.x - cameraX) * zoom, x + 15, x + width - 15);
      ctx.moveTo(tip - 8, y + height); ctx.lineTo(tip, y + height + 11); ctx.lineTo(tip + 8, y + height); ctx.fill();
    });
  }

  function drawHud() {
    const status = world.player.hidden ? 'В укрытии' : world.npcs.some(n => n.state === 'chase') ? 'Заметили. Уходите.' : world.npcs.some(n => n.state === 'search') ? 'Соседка ищет вас' : 'Не вступайте в разговор';
    if (statusEl.textContent !== status) statusEl.textContent = status;
    ctx.fillStyle = '#10171bcc';
    ctx.fillRect(18, 18, 255, 40);
    ctx.fillStyle = '#e0d7c2';
    ctx.font = '17px Georgia';
    ctx.fillText(status, 30, 44);
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
    if (!document.hidden) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) action();
  }, { passive: false });
  window.addEventListener('keyup', e => keys.delete(e.code));
  restartButton.addEventListener('click', continueRun);
  levelButtons.forEach(button => button.addEventListener('click', () => selectLevel(Number(button.dataset.level))));

  function clearInput() {
    keys.clear();
    Object.keys(touch).forEach(key => { touch[key] = false; });
    document.querySelectorAll('.control.active').forEach(el => el.classList.remove('active'));
    if (world.player) world.player.vx = 0;
  }
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => { clearInput(); last = performance.now(); });

  function bindHold(id, prop) {
    const el = document.getElementById(id);
    const pointers = new Set();
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      pointers.add(e.pointerId);
      el.setPointerCapture(e.pointerId);
      touch[prop] = true;
      el.classList.add('active');
    });
    const off = e => {
      pointers.delete(e.pointerId);
      touch[prop] = pointers.size > 0;
      el.classList.toggle('active', touch[prop]);
    };
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
  }
  bindHold('left', 'left');
  bindHold('right', 'right');
  bindHold('run', 'run');
  actionButton.addEventListener('pointerdown', e => { e.preventDefault(); action(); });

  screenTitle.textContent = 'НЕ ВЫХОДИ';
  screenText.textContent = 'Открываем двор…';
  restartButton.textContent = 'Повторить';
  screenEl.hidden = false;
  reset();
  screenEl.hidden = false;
  loadAssets();
  requestAnimationFrame(frame);
})();
