(() => {
  'use strict';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const stateEl = document.getElementById('state');
  const objectiveEl = document.getElementById('objective');

  const W = 1280;
  const H = 720;
  function configureCanvasQuality() {
    const cssScale = Math.max(0.5, Math.min(innerWidth / W, innerHeight / H));
    const renderScale = Math.min(2, Math.max(1, cssScale * (devicePixelRatio || 1)));
    const nextW = Math.round(W * renderScale);
    const nextH = Math.round(H * renderScale);
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW;
      canvas.height = nextH;
    }
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  configureCanvasQuality();
  addEventListener('resize', configureCanvasQuality);
  const GROUND = 620;
  const WORLD_W = 9800;
  const RURIK_X = 2880;
  const FISH_ZONE_START = 3100;
  const FISH_X = 3500;
  const FISH_ZONE_END = 3900;
  const TAXI_X = 260;
  const ROOF_ZONE_START = 5450;
  const ROOF_ZONE_END = 7050;
  const STORE_ZONE_START = 8800;
  const STORE_X = 9250;
  const CLERK_X = 9340;
  const STORE_ZONE_END = 9750;
  const GRAV = 1280;
  const MAX_ENERGY = 3;
  const GOD_MODE = true;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MOBILE_UI = matchMedia('(hover: none), (pointer: coarse), (max-width: 900px)').matches;

  let atlasImage = null;
  let playerAtlasImage = null;
  let npcAtlasImage = null;
  let rooftopImage = null;
  let archImage = null;
  let tramStopImage = null;
  let courtyardImage = null;
  let passageImage = null;
  let counterImage = null;
  let phoneImage = null;
  let caviarImage = null;
  let tramStreetImage = null;
  let courtyardArtImage = null;
  let passageArtImage = null;
  let fishSellerIdleImage = null;
  let fishSellerTalkImage = null;
  let fishStallArtImage = null;
  let clerkHandoffImage = null;
  let newsCounterImage = null;
  let brodskyPhoneImage = null;
  let brodskyCaviarImage = null;
  let climbableArchImage = null;
  const playerImages = {};
  const assetImages = {};
  const campaignArt = {};
  const campaignPlayerArt = {};
  let campaignGameplayAtlas = null;
  let campaignPostalClerkImage = null;
  const npcMaskMap = {"talker/walk/walk_04.png":[2,2,80,97],"talker/walk/walk_03.png":[85,2,79,97],"talker/walk/walk_01.png":[167,2,79,97],"talker/walk/walk_02.png":[249,2,79,97],"talker/talk/talk_taunt_02.png":[2,102,103,89],"talker/talk/talk_taunt_01.png":[108,102,103,89]};
  const playerMaskMap = {"player/interact/books_01.png":[2,2,66,90,184,252],"player/interact/newspaper_01.png":[70,2,66,90,184,252],"player/interact/suitcase_01.png":[138,2,66,90,184,252],"player/interact/gramophone_01.png":[206,2,66,90,184,252],"player/interact/pickup_01.png":[274,2,66,90,184,252],"player/crouch/crouch_01.png":[342,2,66,90,184,252],"player/crouch/crouch_walk_01.png":[2,95,66,90,184,252],"player/walk/walk_03.png":[70,95,66,90,184,252],"player/walk/walk_01.png":[138,95,66,90,184,252],"player/walk/walk_02.png":[206,95,66,90,184,252],"player/idle/idle_02.png":[274,95,66,90,184,252],"player/idle/idle_01.png":[342,95,66,90,184,252],"player/run/run_01.png":[2,188,66,90,184,252],"player/run/run_02.png":[70,188,66,90,184,252],"player/run/run_03.png":[138,188,66,91,184,252],"player/jump/jump_01.png":[206,188,66,91,184,252],"player/jump/landing_01.png":[274,188,66,91,184,252],"player/hide/hide_01.png":[342,188,66,91,184,252]};
  const atlasMap = {"world/storefront-v17.png":[2,2,1536,1024,1536,1024],"room/interior-v17.png":[1540,2,1672,941,1672,941],"world/city.jpg":[2,1028,1672,941,1672,941],"world/pilgrims.png":[1676,1028,891,600,891,600],"npc/rurik/talk.png":[2569,1028,265,358,265,358],"npc/rurik/idle.png":[2836,1028,194,357,194,357],"npc/rurik/point.png":[3032,1028,318,356,318,356],"npc/vendor.png":[3352,1028,272,343,272,343],"room/door_closed.png":[3626,1028,204,325,204,325],"talker/walk/walk_04.png":[369,1971,221,269,221,269],"talker/walk/walk_03.png":[592,1971,221,269,221,269],"talker/walk/walk_01.png":[815,1971,221,269,221,269],"talker/walk/walk_02.png":[1038,1971,221,269,221,269],"npc/clerk/idle.png":[3832,1028,156,311,156,311],"npc/clerk/talk.png":[2,1971,190,308,190,308],"player/interact/books_01.png":[2079,1971,184,252,184,252],"player/interact/newspaper_01.png":[2265,1971,184,252,184,252],"player/interact/suitcase_01.png":[2451,1971,184,252,184,252],"player/interact/gramophone_01.png":[2637,1971,184,252,184,252],"player/interact/pickup_01.png":[2823,1971,184,252,184,252],"player/crouch/crouch_01.png":[3009,1971,184,252,184,252],"player/crouch/crouch_walk_01.png":[3195,1971,184,252,184,252],"player/walk/walk_03.png":[3381,1971,184,252,184,252],"player/walk/walk_01.png":[3567,1971,184,252,184,252],"player/walk/walk_02.png":[3753,1971,184,252,184,252],"player/idle/idle_02.png":[2,2281,184,252,184,252],"player/idle/idle_01.png":[188,2281,184,252,184,252],"player/run/run_01.png":[374,2281,184,252,184,252],"player/run/run_02.png":[560,2281,184,252,184,252],"player/run/run_03.png":[746,2281,184,252,184,252],"player/jump/jump_01.png":[932,2281,184,252,184,252],"player/jump/landing_01.png":[1118,2281,184,252,184,252],"player/hide/hide_01.png":[1304,2281,184,252,184,252],"talker/talk/talk_taunt_02.png":[1490,2281,286,247,286,247],"talker/talk/talk_taunt_01.png":[1778,2281,286,247,286,247],"room/chair.png":[194,1971,173,282,173,282],"npc/fish_stall.png":[2325,2281,300,222,300,222],"world/crate.png":[2066,2281,257,236,257,236],"world/tram.png":[1261,1971,816,265,816,265],"world/newspaper.png":[2984,2281,253,204,253,204],"world/bench.png":[2627,2281,355,204,355,204],"npc/drunk/drunk3.png":[119,2535,130,145,130,145],"npc/somna/somna4.png":[1503,2535,100,140,100,140],"npc/somna/somna1.png":[1289,2535,105,140,105,140],"npc/somna/somna2.png":[1177,2535,110,140,110,140],"npc/somna/somna3.png":[1396,2535,105,140,105,140],"npc/drunk/drunk1.png":[1707,2535,80,140,80,140],"npc/drunk/drunk2.png":[1605,2535,100,140,100,140],"world/electric_bus.png":[3239,2281,816,199,816,199],"room/cigarette.png":[2,2535,115,161,115,161],"room/book.png":[1001,2535,174,141,174,141],"world/pyaterochka_sign.png":[251,2535,748,143,748,143],"world/arch.png":[1789,2535,65,72,65,72],"world/ground_1.png":[1856,2535,56,61,56,61],"world/ground_2.png":[1914,2535,53,60,53,60]};
  const sprite = name => ({ name, width: 1, height: 1 });
  const sprites = names => names.map(sprite);

  const A = {
    bg: sprite('world/city.jpg'),
    room: sprite('room/interior-v17.png'),
    storefront: sprite('world/storefront-v17.png'),
    pilgrims: sprite('world/pilgrims.png'),
    tram: sprite('world/tram.png'),
    bus: sprite('world/electric_bus.png'),
    sign: sprite('world/pyaterochka_sign.png'),
    bench: sprite('world/bench.png'),
    crate: sprite('world/crate.png'),
    arch: sprite('world/arch.png'),
    g1: sprite('world/ground_1.png'),
    g2: sprite('world/ground_2.png'),
    paper: sprite('world/newspaper.png'),
    fishStall: sprite('npc/fish_stall.png'),
    vendor: sprite('npc/vendor.png'),
    clerk: sprites(['npc/clerk/idle.png', 'npc/clerk/talk.png']),
    chair: sprite('room/chair.png'),
    door: sprite('room/door_closed.png'),
    book: sprite('room/book.png'),
    idle: sprites(['player/idle/idle_01.png', 'player/idle/idle_02.png']),
    // walk_03 has the front hand buried in the coat and breaks the silhouette.
    walk: sprites(['player/walk/walk_01.png', 'player/walk/walk_02.png']),
    run: sprites(['player/run/run_01.png', 'player/run/run_02.png', 'player/run/run_03.png']),
    jump: sprites(['player/jump/jump_01.png']),
    landing: sprites(['player/jump/landing_01.png']),
    crouch: sprites(['player/crouch/crouch_01.png']),
    hide: sprites(['player/hide/hide_01.png']),
    newspaper: sprites(['player/interact/newspaper_01.png']),
    push: sprites(['player/interact/pickup_01.png']),
    hold: sprites(['player/interact/books_01.png']),
    talkWalk: sprites([
      'talker/walk/walk_01.png',
      'talker/walk/walk_02.png',
      'talker/walk/walk_03.png',
      'talker/walk/walk_04.png'
    ]),
    talk: sprites(['talker/talk/talk_taunt_01.png', 'talker/talk/talk_taunt_02.png']),
    rurik: sprites(['npc/rurik/idle.png', 'npc/rurik/talk.png', 'npc/rurik/point.png']),
    somna: sprites([
      'npc/somna/somna1.png',
      'npc/somna/somna2.png',
      'npc/somna/somna3.png',
      'npc/somna/somna4.png'
    ]),
    drunk: sprites(['npc/drunk/drunk1.png', 'npc/drunk/drunk2.png', 'npc/drunk/drunk3.png'])
  };

  const keys = { left: 0, right: 0, run: 0, jump: 0, crouch: 0, up: 0 };
  let last = 0;
  let time = 0;
  let camX = 0;
  let paused = false;
  let won = false;
  let lost = false;
  let jumpLatch = 0;
  let crouchLatch = 0;
  let phase = 'room';
  let toast = 'ОДЕТЬСЯ И СПУСТИТЬСЯ ЗА ВЕЧЕРНЕЙ ГАЗЕТОЙ';
  let toastT = 3.4;
  let catchBubble = null;
  let catchT = 0;
  let graceT = 0;
  let dialogueQueue = [];
  let dialogueCurrent = null;
  let nearAction = false;
  let busStartTime = null;
let sleepTransition = 0;
  let evadeT = 0;
  let pushingPlatform = null;
  let obstacleGraceT = 0;
  let hurtFlashT = 0;
  let archAssist = null;
  const shownHints = new Set();
  let tutorialHint = null;

  const player = {
    x: 310,
    y: GROUND,
    vx: 0,
    vy: 0,
    face: 1,
    state: 'idle',
    anim: 0,
    hidden: false,
    hideId: null,
    contacts: 0,
    energy: MAX_ENERGY,
    checkpoint: 180,
    onSurface: true
  };

  const story = { rurikDone: false, rurikState: 0, fishCalled: false, fishDone: false, fishShowT: 0, fishZoneSeen: false, taxiDone: false, taxiT: 0, roofSeen: false, campaignDone: false, purchaseStarted: false, purchaseStage: 'idle', purchaseT: 0 };
  const hideSpots = [{ id: 0, x: 1115 }, { id: 1, x: 2250 }, { id: 2, x: 4800 }, { id: 3, x: 8300 }];
  const archSurfaces = hideSpots.map(h => ({ x1: h.x - 160, x2: h.x + 160, top: GROUND - 196, x: h.x }));
  const platforms = [
    { x1: 660, x2: 760, top: 548 },
    { x1: 1380, x2: 1490, top: 535 },
    { x1: 4080, x2: 4190, top: 548 },
    { x1: 5000, x2: 5110, top: 530 },
    { x1: 7580, x2: 7690, top: 540 },
    { x1: 8050, x2: 8160, top: 545 }
  ];
  for (const p of platforms) {
    p.startX1 = p.x1;
    p.startX2 = p.x2;
    p.minX = 40;
    p.maxX = WORLD_W - 40;
    p.pushable = true;
    p.hazard = true;
    p.pushT = 0;
    p.moved = false;
  }
  // Surfaces follow the visible snow caps in rooftop-route.webp.
  // The former set put Brodsky several dozen pixels above some roofs.
  const roofSurfaces = [
    { x1: 5450, x2: 5750, top: 350 },
    { x1: 5750, x2: 5950, top: 365 },
    { x1: 5950, x2: 6175, top: 500 },
    { x1: 5960, x2: 6165, top: 202 },
    { x1: 6165, x2: 6500, top: 292 },
    { x1: 6500, x2: 6730, top: 350 },
    { x1: 6730, x2: 7050, top: 450 }
  ];
  const talkerBase = [
    { home: 1260, trigger: 840, phrase: 'Иосиф Александрович…', speed: 108, type: 'ordinary', crateMode: 'block', notice: 2.0, search: 1.8, giveUp: 300 },
    { home: 1900, trigger: 1540, phrase: 'Иосиф Александрович…', speed: 114, type: 'somna', crateMode: 'vault', notice: 0.55, search: 2.6, giveUp: 310 },
    { home: 4580, trigger: 4160, phrase: 'Только один вопрос!', speed: 128, type: 'drunk', crateMode: 'vault', notice: 0.8, search: 1.9, giveUp: 330 },
    { home: 6960, trigger: 6230, phrase: 'Иосиф Александрович, можно на пару слов?', speed: 136, type: 'ordinary', crateMode: 'block', notice: 1.0, search: 2.1, giveUp: 360 },
    { home: 8700, trigger: 8120, phrase: 'Иосиф Александрович…', speed: 140, type: 'somna', crateMode: 'vault', notice: 0.5, search: 2.3, giveUp: 350 }
  ];
  const talkers = talkerBase.map((o, i) => ({ ...o, id: i, x: o.home, y: GROUND, state: 'idle', t: Math.random(), face: -1, talkT: 0, searchDir: -1, searchT: 0, blockT: 0, blockDir: -1, vaultT: 0, vaultFrom: o.home, vaultTo: o.home, vaultDuration: 0.8, retired: false, retireDir: 1, phaseT: Math.random() * 2 }));

  function drawAsset(im, x, y, w = im.width, h = im.height) {
    const individualPlayer = playerImages[im.name];
    if (individualPlayer) {
      ctx.drawImage(individualPlayer, x, y, w, h);
      return;
    }
    const standalone = assetImages[im.name];
    if (standalone) {
      ctx.drawImage(standalone, x, y, w, h);
      return;
    }
    const pr = playerMaskMap[im.name];
    if (pr && playerAtlasImage) {
      ctx.drawImage(playerAtlasImage, pr[0], pr[1], pr[2], pr[3], x, y, w, h);
      return;
    }
    const nr = npcMaskMap[im.name];
    if (nr && npcAtlasImage) {
      ctx.drawImage(npcAtlasImage, nr[0], nr[1], nr[2], nr[3], x, y, w, h);
      return;
    }
    const r = atlasMap[im.name];
    if (!atlasImage || !r) return;
    ctx.drawImage(atlasImage, r[0], r[1], r[2], r[3], x, y, w, h);
  }

  function drawSprite(im, x, baseline, scale = 1, flip = false, alpha = 1) {
    if (!im) return;
    const w = im.width * scale;
    const h = im.height * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x - camX, baseline);
    if (flip) ctx.scale(-1, 1);
    drawAsset(im, -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawImageSprite(image, x, baseline, height, flip = false, alpha = 1) {
    if (!image) return;
    const w = height * image.width / image.height;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x - camX, baseline);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, -w / 2, -height, w, height);
    ctx.restore();
  }

  function drawArchForeground(worldX) {
    if (!climbableArchImage) return;
    const height = 225;
    const width = height * climbableArchImage.width / climbableArchImage.height;
    const sourceWidth = Math.round(climbableArchImage.width * 0.24);
    const pillarWidth = width * sourceWidth / climbableArchImage.width;
    const screenX = worldX - camX - width / 2;
    ctx.drawImage(climbableArchImage, 0, 0, sourceWidth, climbableArchImage.height, screenX, GROUND - height, pillarWidth, height);
    ctx.drawImage(climbableArchImage, climbableArchImage.width - sourceWidth, 0, sourceWidth, climbableArchImage.height, screenX + width - pillarWidth, GROUND - height, pillarWidth, height);
  }

  function frame(arr, t, fps = 8) {
    return arr[Math.floor(t * fps) % arr.length];
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = word + ' ';
        y += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
  }

  function drawPrompt(x, y, text) {
    ctx.save();
    ctx.font = 'bold 13px Arial';
    const maxTextW = MOBILE_UI ? 220 : 300;
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxTextW && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    const widest = Math.max(90, ...lines.map(item => ctx.measureText(item).width));
    const w = Math.min(MOBILE_UI ? 260 : 340, widest + 30);
    const h = Math.max(36, 16 + lines.length * 18);
    let px = clamp(x, w / 2 + 12, W - w / 2 - 12);
    let py = clamp(y, h / 2 + 112, H - h / 2 - 92);
    const playerSX = phase === 'campaign' ? campaign.x : player.x - camX;
    const playerSY = phase === 'campaign' ? campaign.y : player.y;
    if (Math.abs(px - playerSX) < w / 2 + 55 && Math.abs(py - (playerSY - 90)) < h / 2 + 110) py = clamp(playerSY - 270, h / 2 + 112, H - h / 2 - 92);
    ctx.fillStyle = '#091019ed';
    ctx.strokeStyle = '#e7d6b988';
    ctx.lineWidth = 2;
    roundRect(px - w / 2, py - h / 2, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f6ead3';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = py - ((lines.length - 1) * 18) / 2;
    lines.forEach((item, index) => ctx.fillText(item, px, startY + index * 18));
    ctx.restore();
  }

  function queueTutorialHint(id, text, duration = 2.8) {
    if (shownHints.has(id) || tutorialHint) return;
    shownHints.add(id);
    tutorialHint = { id, text, t: duration };
  }

  function drawTutorialHint() {
    if (!tutorialHint || tutorialHint.t <= 0) return;
    drawPrompt(W / 2, 176, tutorialHint.text);
  }

  function drawWorldImage(image, wx, y, w, h, alpha = 1, feather = 240) {
    if (!image) return false;
    const x = wx - camX;
    if (x + w < -80 || x > W + 80) return true;
    const edge = Math.min(Math.max(0, feather), w * 0.22);
    const slices = edge > 0 ? 18 : 0;
    const drawSlice = (dx, dw, localAlpha) => {
      if (dw <= 0 || localAlpha <= 0) return;
      const sx = image.width * (dx / w);
      const sw = image.width * (dw / w);
      ctx.globalAlpha = alpha * localAlpha;
      ctx.drawImage(image, sx, 0, sw, image.height, x + dx, y, dw, h);
    };
    ctx.save();
    if (!slices) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, x, y, w, h);
    } else {
      const midW = Math.max(0, w - edge * 2);
      drawSlice(edge, midW, 1);
      const sw = edge / slices;
      for (let i = 0; i < slices; i++) {
        const t = (i + 0.5) / slices;
        const a = smoothStep01(t);
        drawSlice(i * sw, sw + 0.8, a);
        drawSlice(w - (i + 1) * sw, sw + 0.8, a);
      }
    }
    ctx.restore();
    return true;
  }

  function drawAtlasPanel(im, wx, y, w, h, sourceX = 0, sourceW = 1, alpha = 0.96) {
    const image = assetImages[im.name];
    if (!image) return;
    const x = wx - camX;
    if (x + w < -80 || x > W + 80) return;
    const sx = image.width * sourceX;
    const sw = image.width * sourceW;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, sx, 0, sw, image.height, x, y, w, h);
    ctx.restore();
  }

  function drawLabel(x, y, text, large = false) {
    ctx.save();
    ctx.font = large ? 'bold 24px Arial' : 'bold 13px Arial';
    const pad = large ? 34 : 22;
    const h = large ? 48 : 30;
    const w = ctx.measureText(text).width + pad;
    ctx.fillStyle = '#f1e2bd';
    ctx.strokeStyle = '#6c5525';
    ctx.lineWidth = large ? 3 : 2;
    roundRect(x - w / 2, y - h / 2, w, h, large ? 12 : 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2d2417';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawBubble(x, y, text) {
    ctx.save();
    ctx.font = 'bold 14px Georgia';
    const maxTextW = MOBILE_UI ? 210 : 270;
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxTextW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const widest = Math.max(80, ...lines.map(item => ctx.measureText(item).width));
    const w = Math.max(118, Math.min(MOBILE_UI ? 250 : 310, widest + 34));
    const h = Math.max(52, 28 + lines.length * 19);
    const bx = clamp(x, w / 2 + 10, W - w / 2 - 10);
    const by = clamp(y, h / 2 + 10, H - h / 2 - 28);
    const tailX = clamp(x, bx - w / 2 + 26, bx + w / 2 - 26);
    ctx.fillStyle = '#f4eedf';
    ctx.strokeStyle = '#262019';
    ctx.lineWidth = 2;
    roundRect(bx - w / 2, by - h / 2, w, h, 15);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tailX - 10, by + h / 2 - 2);
    ctx.lineTo(tailX, by + h / 2 + 17);
    ctx.lineTo(tailX + 18, by + h / 2 - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1c1812';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = by - ((lines.length - 1) * 19) / 2;
    lines.forEach((item, index) => ctx.fillText(item, bx, startY + index * 19));
    ctx.restore();
  }

  function drawNotice(x, y) {
    ctx.save();
    ctx.fillStyle = '#d04a36';
    ctx.strokeStyle = '#f4ddad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff4d8';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 1);
    ctx.restore();
  }

  function drawRoom() {
    drawAsset(A.room, 0, 0, W, H);
    if (Math.abs(player.x - 1150) < 100) {
      drawPrompt(1150, 370, 'ВЫЙТИ');
      nearAction = true;
    }
  }

  function drawPilgrimWalk(x, baseline, scale, t) {
    const bob = Math.sin(t * 18) * 1.2;
    drawSprite(A.pilgrims, x, baseline + bob, scale);
  }

  function worldRect(wx, y, w, h, fill, stroke = null, lineWidth = 2) {
    const x = wx - camX;
    if (x + w < -80 || x > W + 80) return;
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    ctx.restore();
  }

  function worldText(text, wx, y, font = 'bold 16px Arial', fill = '#e8ddc6') {
    const x = wx - camX;
    if (x < -300 || x > W + 300) return;
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function smoothStep01(v) {
    const t = clamp(v, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function districtAlpha(wx, w, fade = 260) {
    const center = camX + W * 0.5;
    const fadeIn = smoothStep01((center - (wx - fade)) / (fade * 2));
    const fadeOut = smoothStep01(((wx + w + fade) - center) / (fade * 2));
    return clamp(Math.min(fadeIn, fadeOut), 0, 0.98);
  }

  function drawDistricts() {
    // Overlapping modules + camera-based feathering prevent the old hard image swaps.
    drawWorldImage(tramStreetImage, 1050, 138, 2700, 482, districtAlpha(1050, 2700));
    drawWorldImage(courtyardArtImage, 3550, 120, 2100, 566, districtAlpha(3550, 2100));

    // Keep the authored rooftop image on the same world origin used by roofSurfaces.
    // The earlier 5250 offset shifted art 200 px away from physics and made Brodsky appear to walk in air.
    if (rooftopImage) {
      drawWorldImage(rooftopImage, 5450, 0, 1600, 620, districtAlpha(5450, 1600), 190);
    } else {
      drawAtlasPanel(A.bg, 5450, 110, 1600, 510, 0.18, 0.72, districtAlpha(5450, 1600));
    }

    drawWorldImage(passageArtImage, 6850, 135, 2050, 567, districtAlpha(6850, 2050));
    drawSprite(A.storefront, STORE_X, GROUND, 0.56, false, 1);
  }

  function drawStreet() {
    ctx.fillStyle = '#111a24';
    ctx.fillRect(0, 0, W, H);
    const drift = camX * 0.07;
    const bgW = W;
    const off = -(drift % bgW);
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let x = off - bgW; x < W * 2; x += bgW) drawAsset(A.bg, x, 0, bgW, H);
    ctx.restore();

    drawDistricts();
    if (busStartTime !== null) {
      const elapsed = time - busStartTime;
      const roadY = GROUND - 45;
      if (elapsed >= 0 && elapsed < 13) {
        const busX = -420 + elapsed * 250;
        const busScreenX = busX - camX;
        drawSprite(A.bus, busX, roadY, 0.46);
        if (!MOBILE_UI || (busScreenX > -180 && busScreenX < W + 180)) drawLabel(MOBILE_UI ? clamp(busScreenX, 190, W - 190) : busScreenX, MOBILE_UI ? 175 : roadY - 42, 'Это электробус', MOBILE_UI);
      }
      if (elapsed >= 4 && elapsed < 25) {
        const pilgrimX = -180 + (elapsed - 4) * 132;
        const pilgrimScreenX = pilgrimX - camX;
        drawPilgrimWalk(pilgrimX, roadY, 0.23, elapsed - 4);
        if (!MOBILE_UI || (pilgrimScreenX > -180 && pilgrimScreenX < W + 180)) drawLabel(MOBILE_UI ? clamp(pilgrimScreenX, 180, W - 180) : pilgrimScreenX, MOBILE_UI ? 235 : roadY - 148, 'Это пилигримы', MOBILE_UI);
      }
    }

    const tramStart = 1450;
    const tramEnd = 3550;
    const tramSpan = tramEnd - tramStart;
    const tramPhase = (time * 118) % (tramSpan * 2);
    const tramGoingRight = tramPhase <= tramSpan;
    const tramX = tramGoingRight ? tramStart + tramPhase : tramEnd - (tramPhase - tramSpan);
    drawSprite(A.tram, tramX, GROUND - 38, 0.40, !tramGoingRight, 0.98);

    ctx.fillStyle = '#0a1017';
    ctx.fillRect(0, GROUND, W, 100);
    for (let wx = 0; wx < WORLD_W; wx += 88) {
      const im = Math.floor(wx / 88) % 3 ? A.g1 : A.g2;
      const sw = 94;
      const sh = 100;
      drawAsset(im, wx - camX, GROUND, sw, sh);
    }

    drawSprite(A.bench, 510, GROUND, 0.28);
    drawSprite(A.bench, 2070, GROUND, 0.24);
    drawSprite(A.bench, 4550, GROUND, 0.22);
    drawSprite(A.bench, 8240, GROUND, 0.23);
    for (const p of platforms) {
      drawAsset(A.crate, p.x1 - camX, p.top, p.x2 - p.x1, GROUND - p.top);
      if (p.pushT > 0) { ctx.save(); ctx.strokeStyle = '#d8c8aa99'; ctx.lineWidth = 3; const side = player.face > 0 ? p.x1 - camX - 8 : p.x2 - camX + 8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side - player.face * (6 + i * 8), GROUND - 8 - i * 5); ctx.lineTo(side - player.face * (16 + i * 8), GROUND - 14 - i * 5); ctx.stroke(); } ctx.restore(); }
    }
    const pushNear = platforms.find(p => p.pushable && player.onSurface && player.y > p.top + 28 && Math.min(Math.abs((player.x + 20) - p.x1), Math.abs((player.x - 20) - p.x2)) < 48);
    if (pushNear && !won && !lost) queueTutorialHint('crate', 'ЯЩИК: ШАГОМ ТОЛКАТЬ · ПРЫЖКОМ ИСПОЛЬЗОВАТЬ КАК СТУПЕНЬ');
    const safeTop = platforms.find(p => player.onSurface && Math.abs(player.y - p.top) < 3 && player.x > p.x1 + 8 && player.x < p.x2 - 8);
    if (safeTop && activeDanger()) queueTutorialHint('crate-top', 'СВЕРХУ ПРОХОЖИЙ НЕ ДОСТАНЕТ');
    for (const h of hideSpots) drawImageSprite(climbableArchImage, h.x, GROUND, 225, false, 1);

    const rState = story.rurikState === 1 ? 1 : 0;
    drawSprite(A.rurik[rState], RURIK_X, GROUND, 0.48, player.x < RURIK_X);
    if (!story.rurikDone && Math.abs(player.x - RURIK_X) < 135 && !activeDanger() && !dialogueCurrent) {
      drawPrompt(RURIK_X - camX, GROUND - 230, 'ПОГОВОРИТЬ');
      nearAction = true;
    }

    const fishZoneLeft = FISH_ZONE_START - camX;
    ctx.save();
    ctx.fillStyle = '#a8864b18';
    ctx.fillRect(fishZoneLeft, GROUND - 238, FISH_ZONE_END - FISH_ZONE_START, 238);
    ctx.restore();
    drawSprite(A.bench, FISH_X - 250, GROUND, 0.24);
    drawImageSprite(fishStallArtImage, FISH_X, GROUND, 250, false, 1);
    const sellerTalking = story.fishCalled && !story.fishDone && Math.abs(player.x - FISH_X) < 260;
    drawImageSprite(sellerTalking ? fishSellerTalkImage : fishSellerIdleImage, FISH_X + 150, GROUND, 158, player.x < FISH_X + 150, 1);
    if (inFishZone(player.x)) drawLabel(FISH_X - camX, GROUND - 318, 'Рыбная лавка');
    if (story.fishCalled && !story.fishDone && Math.abs(player.x - FISH_X) < 165) {
      drawPrompt(FISH_X - camX, GROUND - 225, 'ОТВЕТИТЬ');
      nearAction = true;
      drawBubble(FISH_X - camX + 68, GROUND - 292, 'Свежая рыба!');
    }

    if (player.x > ROOF_ZONE_START - 120 && player.x < ROOF_ZONE_START + 230 && player.y > GROUND - 30 && !activeDanger()) queueTutorialHint('roof-route', 'ПРЫЖОК — НА ВЕРХНИЙ МАРШРУТ');

    const clerkX = CLERK_X + 68;
    const handingNewspaper = story.purchaseStage === 'handoff' || story.purchaseStage === 'done';
    if (handingNewspaper) drawImageSprite(clerkHandoffImage, clerkX, GROUND, 190, player.x > clerkX, 1);
    else drawSprite(A.clerk[0], clerkX, GROUND, 0.62, player.x < clerkX, 1);
    drawImageSprite(newsCounterImage, CLERK_X - 15, GROUND, 112, false, 1);
    const handoffProgress = handingNewspaper ? clamp(1 - story.purchaseT / 2, 0, 1) : 0;
    const handoffEase = handoffProgress * handoffProgress * (3 - 2 * handoffProgress);
    const handoffStartX = CLERK_X - 54;
    const handoffEndX = player.x - player.face * 28;
    const handoffX = handingNewspaper ? handoffStartX + (handoffEndX - handoffStartX) * handoffEase : handoffStartX;
    if (!won) {
      drawSprite(A.paper, CLERK_X - 92, GROUND - 58, 0.14, false, 0.96);
      drawSprite(A.paper, CLERK_X - 58, GROUND - 60, 0.14, false, 0.96);
      drawSprite(A.paper, handoffX, handingNewspaper ? GROUND - 92 : GROUND - 62, 0.18, false, 1);
    }
    if (inStoreZone(player.x) && !won) drawLabel(STORE_X - camX, GROUND - 344, 'ПЯТЁРОЧКА');
    if (Math.abs(player.x - CLERK_X) < 150 && !won && !dialogueCurrent && story.purchaseStage === 'idle') {
      drawPrompt(CLERK_X - camX, GROUND - 218, story.campaignDone ? 'КУПИТЬ ГАЗЕТУ' : 'УЗНАТЬ ПРО ГАЗЕТУ');
      nearAction = true;
    }

    const h = nearestHide();
    if (h && !player.hidden && !won && !lost) {
      drawPrompt(h.x - camX, GROUND - 205, 'СПРЯТАТЬСЯ');
      nearAction = true;
    }
  }

  function drawTalkers() {
    if (story.purchaseStarted && inStoreZone(player.x)) return;
    if (phase !== 'street') return;
    for (const t of talkers) {
      if (t.retired && t.x - camX > W + 200) continue;
      const arr = t.state === 'talk' ? A.talk : A.talkWalk;
      const scale = 0.56 + (t.id % 3) * 0.02;
      const im = t.state === 'blocked' ? A.talkWalk[0] : frame(arr, t.t, t.state === 'talk' ? 4 : 8);
      const wobble = t.type === 'drunk' ? Math.sin(t.phaseT * 5.2) * 5 : 0;
      drawSprite(im, t.x + wobble, t.y, scale, t.face < 0, t.type === 'somna' ? 0.9 : 0.99);
      if (t.type === 'somna' && t.state !== 'talk') drawLabel(t.x - camX, t.y - 188, 'Z  z', false);
      if (t.state === 'talk') {
        drawNotice(t.x - camX, t.y - 218);
        drawBubble(t.x - camX, t.y - 170, t.phrase);
      } else if (t.state === 'chase' && player.onSurface && Math.abs(t.y - player.y) < 80 && Math.abs(t.x - player.x) < 125 && graceT <= 0) {
        queueTutorialHint('jump-person', '←/→ + ПРЫЖОК — ПЕРЕПРЫГНУТЬ');
      }
    }
  }


  function drawArchForeground(wx) {
    // Re-draw the authored arch frame in front of a ground-level player.
    // The image has a transparent opening, so Brodsky remains visible inside the passage
    // while the masonry correctly occludes him at the columns instead of behaving like scenery.
    if (!climbableArchImage) return;
    drawImageSprite(climbableArchImage, wx, GROUND, 225, false, 1);
  }

  function drawPushBrodsky(alpha = 1) {
    // Keep the approved Brodsky body and add a small two-hand contact pose.
    // This deliberately avoids the old atlas "man in a cap" substitution.
    const base = A.walk[0];
    drawSprite(base, player.x - player.face * 5, player.y, phase === 'room' ? 1.23 : 0.77, player.face < 0, alpha);
    const scale = phase === 'room' ? 1.23 : 0.77;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(player.x - camX, player.y);
    if (player.face < 0) ctx.scale(-1, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // two sleeves, converging on the crate face
    ctx.strokeStyle = '#3b4654';
    ctx.lineWidth = 12 * scale;
    ctx.beginPath(); ctx.moveTo(8 * scale, -130 * scale); ctx.lineTo(47 * scale, -105 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5 * scale, -113 * scale); ctx.lineTo(49 * scale, -90 * scale); ctx.stroke();
    ctx.strokeStyle = '#d0a17e';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath(); ctx.moveTo(48 * scale, -105 * scale); ctx.lineTo(56 * scale, -103 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50 * scale, -90 * scale); ctx.lineTo(58 * scale, -87 * scale); ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    let arr = A.idle;
    let fps = 2;
    if (story.taxiT > 0 && brodskyPhoneImage) {
      drawImageSprite(brodskyPhoneImage, player.x, player.y, phase === 'room' ? 252 : 194, player.face < 0, 1);
      return;
    }
    else if (story.fishShowT > 0 && brodskyCaviarImage) {
      drawImageSprite(brodskyCaviarImage, player.x, player.y, phase === 'room' ? 252 : 194, player.face < 0, 1);
      drawBubble(player.x - camX, player.y - 245, 'Зачем нам рыба, раз есть икра.');
      return;
    }
    else if (story.fishShowT > 0) { arr = A.hold; fps = 1; }
    else if (player.state === 'walk') { arr = A.walk; fps = 6; }
    else if (player.state === 'run') { arr = A.run; fps = 9; }
    else if (player.state === 'jump') { arr = A.jump; fps = 1; }
    else if (player.state === 'crouch') { arr = A.crouch; fps = 1; }
    else if (player.state === 'hide') { arr = A.hide; fps = 1; }
    else if (player.state === 'newspaper') { arr = A.newspaper; fps = 1; }
    const hitBlink = hurtFlashT > 0 && Math.floor(time * 10) % 2 === 0 ? 0.24 : 1;
    if (player.state === 'push') { drawPushBrodsky(hitBlink); return; }
    const im = frame(arr, player.anim, fps);
    drawSprite(im, player.x, player.y, phase === 'room' ? 1.23 : 0.77, player.face < 0, player.hidden ? 0.24 : hitBlink);
    if (player.hidden) {
      const h = hideSpots.find(item => item.id === player.hideId);
      if (h) drawImageSprite(climbableArchImage, h.x, GROUND, 225, false, 1);
    }
    if (story.fishShowT > 0) {
      const jarX = player.x - camX + (player.face > 0 ? 42 : -42);
      const jarY = player.y - 126;
      if (caviarImage) ctx.drawImage(caviarImage, jarX - 27, jarY - 30, 54, 60);
      else drawCaviarJar(jarX, jarY, 0.9);
      drawBubble(player.x - camX, player.y - 245, 'Зачем нам рыба, раз есть икра.');
    }
  }

  function drawCaviarJar(x = player.x - camX + (player.face > 0 ? 45 : -45), y = player.y - 112, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#c0322f';
    ctx.strokeStyle = '#321718';
    ctx.lineWidth = 3;
    roundRect(-22, -30, 44, 58, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8d7b2';
    ctx.fillRect(-18, -12, 36, 20);
    ctx.fillStyle = '#241b12';
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('ИКРА', 0, 3);
    ctx.restore();
  }

  function drawDialogue() {
    if (!dialogueCurrent) return;
    const x = dialogueCurrent.speaker === 'player' ? player.x - camX : dialogueCurrent.x - camX;
    const speakerY = dialogueCurrent.speaker === 'player' ? player.y : (dialogueCurrent.y || GROUND);
    drawBubble(x, speakerY - 235, dialogueCurrent.text);
  }
function drawSleepPanel(alpha = 1) {
  const px = W / 2 - 205;
  const py = 390;
  const pw = 410;
  const ph = 210;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0a0f15f0';
  ctx.strokeStyle = '#cfbd9355';
  ctx.lineWidth = 2;
  roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  roundRect(px + 12, py + 12, pw - 24, ph - 24, 14);
  ctx.clip();
  ctx.fillStyle = '#131c26';
  ctx.fillRect(px + 12, py + 12, pw - 24, ph - 24);
  ctx.fillStyle = '#1d2835';
  ctx.fillRect(px + 12, py + 110, pw - 24, ph - 122);
  ctx.fillStyle = '#10161f';
  ctx.fillRect(px + 12, py + 160, pw - 24, ph - 172);

  ctx.fillStyle = '#20354c';
  ctx.fillRect(px + 46, py + 28, 84, 70);
  ctx.fillStyle = '#84a6cf';
  ctx.fillRect(px + 52, py + 34, 72, 58);
  ctx.strokeStyle = '#e6d8b9aa';
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 46, py + 28, 84, 70);
  ctx.beginPath();
  ctx.moveTo(px + 88, py + 28);
  ctx.lineTo(px + 88, py + 98);
  ctx.moveTo(px + 46, py + 63);
  ctx.lineTo(px + 130, py + 63);
  ctx.stroke();

  const moonX = px + 110, moonY = py + 52;
  ctx.fillStyle = '#f2e2af';
  ctx.beginPath(); ctx.arc(moonX, moonY, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#84a6cf';
  ctx.beginPath(); ctx.arc(moonX + 5, moonY - 3, 11, 0, Math.PI * 2); ctx.fill();

  drawAsset(A.chair, px + 190, py + 82, A.chair.width * 0.56, A.chair.height * 0.56);

  ctx.fillStyle = '#4c4139';
  ctx.beginPath();
  ctx.ellipse(px + 258, py + 118, 28, 18, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b79a7f';
  ctx.beginPath();
  ctx.arc(px + 238, py + 104, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a303c';
  ctx.fillRect(px + 233, py + 112, 40, 24);
  ctx.fillStyle = '#6f5f51';
  ctx.beginPath();
  ctx.moveTo(px + 242, py + 118);
  ctx.lineTo(px + 289, py + 138);
  ctx.lineTo(px + 278, py + 154);
  ctx.lineTo(px + 233, py + 132);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c222c';
  ctx.fillRect(px + 268, py + 149, 22, 9);
  ctx.fillRect(px + 240, py + 144, 19, 8);
  ctx.fillStyle = '#4a5f7a';
  ctx.fillRect(px + 251, py + 128, 27, 14);

  ctx.fillStyle = '#f4e7cf';
  ctx.font = 'bold 26px Georgia';
  ctx.fillText('Z', px + 324, py + 52);
  ctx.font = 'bold 19px Georgia';
  ctx.fillText('z', px + 344, py + 36);
  ctx.font = 'bold 15px Georgia';
  ctx.fillText('z', px + 357, py + 24);

  ctx.fillStyle = '#d7c8a9';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Сил на продолжение прогулки не осталось.', px + pw / 2, py + 187);
  ctx.restore();
  ctx.restore();
}

function drawVictoryPanel() {
  ctx.save();
  ctx.fillStyle = '#000d';
  ctx.fillRect(0, 0, W, H);
  const px = W / 2 - 300;
  const py = 132;
  const pw = 600;
  const ph = 455;
  ctx.fillStyle = '#0b121af5';
  ctx.strokeStyle = '#d8c391aa';
  ctx.lineWidth = 3;
  roundRect(px, py, pw, ph, 22);
  ctx.fill();
  ctx.stroke();
  drawAsset(A.paper, W / 2 - 84, py + 50, 168, 135);
  ctx.fillStyle = '#d9bd73';
  ctx.beginPath();
  ctx.arc(W / 2 + 104, py + 94, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#18202a';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('✓', W / 2 + 104, py + 105);
  ctx.fillStyle = '#f4ead5';
  ctx.font = 'bold 44px Georgia';
  ctx.fillText('ГАЗЕТА КУПЛЕНА', W / 2, py + 250);
  ctx.fillStyle = '#d9c89f';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('ИГРА ПРОЙДЕНА', W / 2, py + 300);
  ctx.fillStyle = '#aeb9c2';
  ctx.font = '17px Arial';
  ctx.fillText('Продавщица «Пятёрочки» передала газету Бродскому.', W / 2, py + 345);
  ctx.fillText(MOBILE_UI ? 'ДЕЙСТВИЕ — сыграть ещё раз' : 'R — сыграть ещё раз', W / 2, py + 392);
  ctx.restore();
}

function drawTaxiPhone() {
  if (story.taxiT <= 0) return;
  const elapsed = 4.6 - story.taxiT;
  const rawX = player.x - camX + (player.face > 0 ? 58 : -58);
  const sx = clamp(rawX, 58, W - 58);
  const sy = clamp(player.y - 128, 96, H - 112);
  ctx.save();
  if (phoneImage) ctx.drawImage(phoneImage, sx - 28, sy - 48, 56, 92);
  else {
    ctx.fillStyle = '#111820';
    ctx.strokeStyle = '#d8c89a';
    ctx.lineWidth = 2;
    roundRect(sx - 28, sy - 48, 56, 92, 10);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#f3e8d3';
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px Arial';
  ctx.fillText('ТАКСИ', sx, sy - 26);
  ctx.font = '8px Arial';
  if (elapsed < 1.35) {
    ctx.fillStyle = '#c8d2d8';
    ctx.fillText('Пятёрочка', sx, sy - 8);
    ctx.fillText('поиск машины…', sx, sy + 8);
    drawBubble(player.x - camX, player.y - 248, 'До «Пятёрочки» далековато. Попробую вызвать такси.');
  } else {
    ctx.fillStyle = '#d9665f';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('НЕ', sx, sy - 12);
    ctx.fillText('ВЫЗЫВАЙ', sx, sy + 1);
    ctx.fillText('МОТОРА', sx, sy + 14);
    if (elapsed > 3.0) drawBubble(player.x - camX, player.y - 248, 'Ладно. Пешком.');
  }
  ctx.restore();
}

function drawHUD() {
    if (phase === 'campaign') {
      if (paused) overlay('ПАУЗА', 'Esc — продолжить');
      return;
    }
    ctx.save();
    ctx.fillStyle = '#071019df';
    ctx.strokeStyle = '#dfc99355';
    ctx.fillRect(18, 18, 430, 88);
    ctx.strokeRect(18.5, 18.5, 429, 87);
    ctx.fillStyle = '#f1e6d0';
    ctx.font = 'bold 17px Georgia';
    ctx.fillText('ЦЕЛЬ ИГРЫ · КУПИТЬ ГАЗЕТУ', 34, 48);
    ctx.font = '13px Arial';
    ctx.fillStyle = '#c8d1d8';
    ctx.fillText(phase === 'room' ? 'Сначала: выйти из комнаты' : (won ? 'Газета куплена' : 'Добраться до «Пятёрочки» и купить газету'), 34, 74);
    ctx.fillStyle = '#8f9aaa';
    ctx.fillText('Выдержано разговоров: ' + player.contacts, 34, 95);
    ctx.fillText('Силы:', 245, 95);
    for (let i = 0; i < MAX_ENERGY; i++) {
      const full = i < player.energy;
      ctx.fillStyle = full ? (player.energy === 1 ? '#c58866' : player.energy === 2 ? '#c8b27b' : '#d5bf8a') : '#3a4048';
      ctx.strokeStyle = full ? '#f5e8c7' : '#697381';
      roundRect(292 + i * 34, 82, 24, 16, 6);
      ctx.fill();
      ctx.stroke();
    }
    if (GOD_MODE) {
      ctx.fillStyle = '#26384a';
      roundRect(342, 27, 92, 22, 8);
      ctx.fill();
      ctx.fillStyle = '#f1e6d0';
      ctx.font = 'bold 9px Arial';
      ctx.fillText('GOD MODE', 356, 42);
    }
    ctx.restore();

    drawTutorialHint();
    if (toastT > 0) {
      ctx.save();
      ctx.font = 'bold 18px Arial';
      const w = Math.min(780, ctx.measureText(toast).width + 50);
      ctx.fillStyle = '#090c10dc';
      ctx.fillRect(W / 2 - w / 2, 116, w, 42);
      ctx.fillStyle = '#f3e7cf';
      ctx.textAlign = 'center';
      ctx.fillText(toast, W / 2, 143);
      ctx.restore();
    }
    if (catchT > 0 && catchBubble) drawBubble(W / 2, 248, catchBubble);
    if (story.taxiT > 0) drawTaxiPhone();
    if (paused) overlay('ПАУЗА', 'Esc — продолжить');
    if (lost) {
      if (sleepTransition > 0) {
        const progress = 1 - sleepTransition / 1.35;
        overlay('СИЛЫ КОНЧИЛИСЬ', 'На сегодня прогулки достаточно — пора спать');
        drawSleepPanel(Math.max(0, Math.min(1, progress)));
      } else {
        overlay('ИБ УСТАЛ И УШЁЛ СПАТЬ', MOBILE_UI ? 'ДЕЙСТВИЕ — попробовать снова' : 'R — попробовать снова');
        drawSleepPanel(1);
      }
    }
    if (won) drawVictoryPanel();
  }

  function overlay(title, sub) {
    ctx.save();
    ctx.fillStyle = '#000b';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1eadc';
    ctx.font = 'bold 40px Georgia';
    ctx.fillText(title, W / 2, 328);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#d6c7aa';
    ctx.fillText(sub, W / 2, 368);
    ctx.restore();
  }

  function nearestHide() {
    if (phase !== 'street') return null;
    if (!player.hidden && Math.abs(player.y - GROUND) > 80) return null;
    let best = null;
    let dist = Infinity;
    for (const h of hideSpots) {
      const d = Math.abs(player.x - h.x);
      if (d < 86 && d < dist) { best = h; dist = d; }
    }
    return best;
  }

  function inFishZone(x = player.x) {
    return phase === 'street' && x >= FISH_ZONE_START && x <= FISH_ZONE_END;
  }

  function inRoofZone(x = player.x) {
    return phase === 'street' && x >= ROOF_ZONE_START && x <= ROOF_ZONE_END;
  }

  function inStoreZone(x = player.x) {
    return phase === 'street' && x >= STORE_ZONE_START && x <= STORE_ZONE_END;
  }

  function activeDanger() {
    if (inFishZone() || inStoreZone()) return false;
    return talkers.some(t => !t.retired && (t.state === 'talk' || t.state === 'chase' || t.state === 'search') && Math.abs(t.x - player.x) < 650);
  }

  function enqueueDialogue(items, onDone) {
    dialogueQueue = items.slice();
    dialogueCurrent = null;
    enqueueDialogue.done = onDone || null;
    nextDialogue();
  }

  function nextDialogue() {
    if (!dialogueQueue.length) {
      dialogueCurrent = null;
      const done = enqueueDialogue.done;
      enqueueDialogue.done = null;
      if (done) done();
      return;
    }
    dialogueCurrent = { ...dialogueQueue.shift(), t: 0 };
    const otherX = dialogueCurrent.speaker === 'player' ? dialogueCurrent.lookAt : dialogueCurrent.x;
    if (Number.isFinite(otherX)) player.face = otherX >= player.x ? 1 : -1;
  }

  function updateDialogue(dt) {
    if (!dialogueCurrent) return;
    dialogueCurrent.t += dt;
    if (dialogueCurrent.t >= dialogueCurrent.duration) nextDialogue();
  }

  function toggleHide() {
    if (phase !== 'street' || won || lost || dialogueCurrent || catchT > 0) return false;
    const h = nearestHide();
    if (player.hidden) {
      player.hidden = false;
      player.hideId = null;
      player.state = 'idle';
      return true;
    }
    if (!h) return false;
    player.hidden = true;
    player.hideId = h.id;
    player.x = h.x;
    player.y = GROUND;
    player.vx = 0;
    player.vy = 0;
    player.onSurface = true;
    player.state = 'hide';
    for (const t of talkers) {
      if (!t.retired && (t.state === 'chase' || t.state === 'talk') && Math.abs(t.x - player.x) < 620) {
        t.state = 'search';
        t.searchDir = t.x > player.x ? -1 : 1;
        t.searchT = t.search || 2.1;
      }
    }
    return true;
  }

  function action() {
    if (lost || won) { reset(); return; }
    if (paused || catchT > 0 || dialogueCurrent || story.taxiT > 0) return;
    if (phase === 'campaign') { campaignAction(); return; }
    if (phase === 'room') {
      if (Math.abs(player.x - 1150) < 100) {
        phase = 'street';
        player.x = 180;
        player.y = GROUND;
        player.vx = 0;
        player.vy = 0;
        player.checkpoint = 180;
        camX = 0;
        story.taxiDone = true;
        story.taxiT = 4.6;
        player.state = 'idle';
        toastT = 0;
        objectiveEl.textContent = 'цель игры: купить газету в «Пятёрочке»';
        busStartTime = null;
      }
      return;
    }
    if (!story.campaignDone && inStoreZone() && Math.abs(player.x - CLERK_X) < 145 && !activeDanger()) {
      player.vx = 0;
      const clerkX = CLERK_X + 68;
      player.face = clerkX >= player.x ? 1 : -1;
      enqueueDialogue([
        { speaker: 'clerk', text: 'Вечернюю ещё не привезли.', x: clerkX, duration: 1.35 },
        { speaker: 'clerk', text: 'Разгрузку завернули. Обход — через дворы.', x: clerkX, duration: 1.75 },
        { speaker: 'player', text: 'Ладно. Найду сам.', lookAt: clerkX, duration: 1.05 }
      ], startCampaignTransition);
      return;
    }
    if (story.campaignDone && !story.purchaseStarted && inStoreZone() && Math.abs(player.x - CLERK_X) < 145 && !activeDanger()) {
      story.purchaseStarted = true;
      story.purchaseStage = 'dialogue';
      player.vx = 0;
      player.vy = 0;
      player.state = 'idle';
      const clerkX = CLERK_X + 68;
      player.face = clerkX >= player.x ? 1 : -1;
      enqueueDialogue([
        { speaker: 'clerk', text: 'Газету?', x: clerkX, duration: 1.0 },
        { speaker: 'player', text: 'Газету.', lookAt: clerkX, duration: 0.95 },
        { speaker: 'clerk', text: 'Пожалуйста.', x: clerkX, duration: 1.15 }
      ], () => {
        story.purchaseStage = 'handoff';
        story.purchaseT = 2.0;
        player.state = 'newspaper';
        toast = 'ПРОДАВЩИЦА ПЕРЕДАЁТ ВЕЧЕРНЮЮ ГАЗЕТУ';
        toastT = 1.6;
      });
      return;
    }
    if (!story.rurikDone && Math.abs(player.x - RURIK_X) < 125 && !activeDanger() && !dialogueCurrent) {
      story.rurikState = 1;
      player.face = RURIK_X >= player.x ? 1 : -1;
      enqueueDialogue([
        { speaker: 'rurik', text: 'Спрашивай.', x: RURIK_X, duration: 1.15 },
        { speaker: 'player', text: 'Что спросить с тебя, Рюрик?', lookAt: RURIK_X, duration: 1.65 }
      ], () => {
        story.rurikDone = true;
        story.rurikState = 0;
        player.checkpoint = Math.max(player.checkpoint, RURIK_X - 90);
      });
      return;
    }
    if (story.fishCalled && !story.fishDone && inFishZone() && Math.abs(player.x - FISH_X) < 155) {
      story.fishDone = true;
      story.fishShowT = 2.8;
      player.vx = 0;
      player.state = 'idle';
      player.face = FISH_X + 150 >= player.x ? 1 : -1;
      player.checkpoint = Math.max(player.checkpoint, FISH_ZONE_END - 80);
      return;
    }
    toggleHide();
  }
function caughtBy(t) {
  if (catchT > 0 || won || lost || dialogueCurrent) return;
  player.contacts += 1;
  if (!GOD_MODE) player.energy = Math.max(0, player.energy - 1);
  obstacleGraceT = Math.max(obstacleGraceT, 0.95);
  hurtFlashT = 1.0;
  catchT = 1.05;
  catchBubble = t.phrase;
  player.state = 'idle';
  player.face = t.x >= player.x ? 1 : -1;
  t.face = player.x >= t.x ? 1 : -1;
  player.vx = 0;
  player.vy = 0;
  if (GOD_MODE) {
    toast = 'GOD MODE · КОНТАКТ БЕЗ УРОНА';
    toastT = 1.15;
    graceT = Math.max(graceT, 1.1);
    t.state = 'search';
    t.searchDir = t.x > player.x ? 1 : -1;
    t.searchT = 0.8;
    return;
  }
  if (player.energy === 2) toast = 'СИЛЫ УБЫВАЮТ · ОСТАЛОСЬ 2';
  else if (player.energy === 1) toast = 'ЕДВА ДЕРЖИТСЯ · ОСТАЛОСЬ 1';
  else toast = 'СИЛЫ КОНЧИЛИСЬ · ПОРА СПАТЬ';
  toastT = 1.9;
  if (player.energy <= 0) {
    lost = true;
    sleepTransition = 1.35;
    player.hidden = false;
    player.hideId = null;
    clearTimeout(recoveryTimer);
    for (const q of talkers) {
      if (!q.retired) {
        q.state = 'idle';
        q.talkT = 0;
        q.searchT = 0;
      }
    }
    return;
  }
  clearTimeout(recoveryTimer);
  recoveryTimer = setTimeout(() => {
    if (lost) return;
    player.x = player.checkpoint;
    player.y = GROUND;
    player.vy = 0;
    player.hidden = false;
    player.hideId = null;
    graceT = 1.0;
    for (const q of talkers) {
      const base = talkerBase[q.id];
      if (!q.retired && ['talk', 'chase', 'search'].includes(q.state)) {
        q.x = base.home;
        q.state = 'idle';
        q.face = -1;
        q.talkT = 0;
        q.searchT = 0;
      }
    }
  }, 850);
}

function hitObstacle(dir) {
  if (obstacleGraceT > 0 || won || lost || dialogueCurrent) return;
  if (!GOD_MODE) player.energy = Math.max(0, player.energy - 1);
  obstacleGraceT = 0.95;
  hurtFlashT = 1.0;
  evadeT = Math.max(evadeT, 0.5);
  player.vx = 0;
  if (GOD_MODE) {
    toast = 'GOD MODE · УДАР БЕЗ УРОНА';
    toastT = 1.0;
    return;
  }
  toast = player.energy > 0 ? 'ВРЕЗАЛСЯ В ПРЕПЯТСТВИЕ · ОСТАЛОСЬ ' + player.energy : 'СИЛЫ КОНЧИЛИСЬ · ПОРА СПАТЬ';
  toastT = 1.45;
  if (player.energy <= 0) {
    lost = true;
    sleepTransition = 1.35;
    player.hidden = false;
    player.hideId = null;
    clearTimeout(recoveryTimer);
    for (const q of talkers) {
      if (!q.retired) {
        q.state = 'idle';
        q.talkT = 0;
        q.searchT = 0;
      }
    }
  }
}

function crateBlockers(p) {
  const blockers = [];
  for (const h of hideSpots) blockers.push({ left: h.x - 160, right: h.x + 160, kind: 'arch' });
  for (const q of platforms) if (q !== p) blockers.push({ left: q.x1 - 4, right: q.x2 + 4, kind: 'crate' });
  for (const t of talkers) {
    if (!t.retired) blockers.push({ left: t.x - 36, right: t.x + 36, kind: 'talker', talker: t });
  }
  blockers.push({ left: RURIK_X - 52, right: RURIK_X + 52, kind: 'person' });
  blockers.push({ left: FISH_X - 155, right: FISH_X + 225, kind: 'stall' });
  blockers.push({ left: CLERK_X - 55, right: CLERK_X + 55, kind: 'person' });
  return blockers;
}

function crateMotion(p, dir, desired) {
  let step = Math.max(0, Math.min(desired, dir > 0 ? p.maxX - p.x2 : p.x1 - p.minX));
  let hit = null;
  for (const blocker of crateBlockers(p)) {
    if (p.x2 > blocker.left && p.x1 < blocker.right) {
      step = 0;
      hit = blocker;
      break;
    }
    if (dir > 0 && blocker.left >= p.x2 - 3) {
      const gap = Math.max(0, blocker.left - p.x2 - 4);
      if (gap < step) { step = gap; hit = blocker; }
    } else if (dir < 0 && blocker.right <= p.x1 + 3) {
      const gap = Math.max(0, p.x1 - blocker.right - 4);
      if (gap < step) { step = gap; hit = blocker; }
    }
  }
  return { step, hit };
}

function moveTalkerAgainstWorld(t, desiredX) {
  const currentX = t.x;
  const halfW = 26;
  for (const h of hideSpots) {
    const left = h.x - 160;
    const right = h.x + 160;
    if (desiredX + halfW > left && desiredX - halfW < right) {
      const fromLeft = currentX <= h.x;
      return { x: fromLeft ? left - halfW : right + halfW, blocked: true, kind: 'arch' };
    }
  }
  for (const p of platforms) {
    if (desiredX + halfW > p.x1 && desiredX - halfW < p.x2) {
      const fromLeft = currentX <= (p.x1 + p.x2) / 2;
      return { x: fromLeft ? p.x1 - halfW - 2 : p.x2 + halfW + 2, blocked: true, kind: 'crate', crate: p };
    }
  }
  for (const q of talkers) {
    if (q === t || q.retired || Math.abs(q.y - t.y) > 62 || q.state === 'vault') continue;
    const minGap = halfW + 32;
    if (Math.abs(desiredX - q.x) < minGap) {
      const fromLeft = currentX <= q.x;
      return { x: fromLeft ? q.x - minGap : q.x + minGap, blocked: true, kind: 'talker', talker: q };
    }
  }
  return { x: desiredX, blocked: false, kind: null }; 
}

function beginTalkerVault(t, crate) {
  const dir = Math.sign(player.x - t.x) || (t.face || -1);
  const landing = dir > 0 ? crate.x2 + 42 : crate.x1 - 42;
  const world = moveTalkerAgainstWorld(t, landing);
  if (world.blocked && Math.abs(world.x - landing) > 16) {
    t.state = 'blocked';
    t.blockT = 0.8;
    t.blockDir = -dir;
    return false;
  }
  t.state = 'vault';
  t.vaultT = 0;
  t.vaultDuration = t.type === 'drunk' ? 0.68 : 0.9;
  t.vaultFrom = t.x;
  t.vaultTo = landing;
  t.face = dir;
  t.y = GROUND;
  return true;
}

function stopTalkerWithCrate(t, dir, crate, pushedByPlayer = false) {
  if (!t || t.retired || !['talk', 'chase', 'search', 'idle', 'blocked'].includes(t.state)) return;
  graceT = Math.max(graceT, 0.55);
  if (pushedByPlayer) {
    // The crate may stop a person, but it must never translate/drag that person.
    // Keep t.x exactly where the collision happened; only the state changes.
    t.state = 'blocked';
    t.blockT = t.crateMode === 'block' ? 1.05 : 0.72;
    t.blockDir = -dir;
    t.blockAfter = t.crateMode === 'block' ? 'retire' : 'chase';
    toast = t.crateMode === 'block' ? 'ПРОХОЖИЙ УПЁРСЯ В ЯЩИК' : 'ЯЩИК ЗАДЕРЖАЛ ЕГО, НО НЕ ОСТАНОВИЛ';
    toastT = 0.95;
    return;
  }
  if (t.crateMode === 'block') {
    t.state = 'blocked';
    t.blockT = 1.0;
    t.blockDir = -dir;
    t.blockAfter = 'retire';
    toast = 'ПРОХОЖИЙ ОСТАНОВИЛСЯ У ЯЩИКА';
    toastT = 0.95;
    return;
  }
  const vaulted = beginTalkerVault(t, crate);
  toast = vaulted ? (t.type === 'drunk' ? 'ПЬЯНИЦА ПЕРЕЛЕЗАЕТ ЧЕРЕЗ ЯЩИК' : 'СОМНАМБУЛА ПЕРЕЛЕЗАЕТ ЧЕРЕЗ ЯЩИК') : 'ПРОХОД ПЕРЕКРЫТ';
  toastT = 0.95;
}

function resolveHorizontal(prevX, nextX, feetY) {
    pushingPlatform = null;
    if (phase !== 'street' || nextX === prevX) return nextX;
    const halfW = 20;
    const intended = Math.abs(nextX - prevX);
    const archSafe = hideSpots.some(h => Math.abs(nextX - h.x) < 135 || Math.abs(prevX - h.x) < 135);
    for (const p of platforms) {
      if (feetY <= p.top + 12) continue;
      if (nextX > prevX && prevX + halfW <= p.x1 && nextX + halfW > p.x1) {
        if (p.hazard && !archSafe && keys.run && obstacleGraceT <= 0) {
          hitObstacle(1);
          nextX = Math.min(nextX, p.x1 - halfW - 24);
        } else {
          const motion = p.pushable && player.onSurface && !keys.jump && !keys.run ? crateMotion(p, 1, intended * 0.78) : { step: 0, hit: null };
          if (motion.step > 0.05) {
            p.x1 += motion.step;
            p.x2 += motion.step;
            p.pushT = 0.16;
            p.moved = Math.abs(p.x1 - p.startX1) > 1;
            pushingPlatform = p;
          }
          if (motion.hit && motion.hit.talker) stopTalkerWithCrate(motion.hit.talker, 1, p, true);
          nextX = Math.min(nextX, p.x1 - halfW);
        }
      } else if (nextX < prevX && prevX - halfW >= p.x2 && nextX - halfW < p.x2) {
        if (p.hazard && !archSafe && keys.run && obstacleGraceT <= 0) {
          hitObstacle(-1);
          nextX = Math.max(nextX, p.x2 + halfW + 24);
        } else {
          const motion = p.pushable && player.onSurface && !keys.jump && !keys.run ? crateMotion(p, -1, intended * 0.78) : { step: 0, hit: null };
          if (motion.step > 0.05) {
            p.x1 -= motion.step;
            p.x2 -= motion.step;
            p.pushT = 0.16;
            p.moved = Math.abs(p.x1 - p.startX1) > 1;
            pushingPlatform = p;
          }
          if (motion.hit && motion.hit.talker) stopTalkerWithCrate(motion.hit.talker, -1, p, true);
          nextX = Math.max(nextX, p.x2 + halfW);
        }
      }
    }
    return nextX;
  }

  function surfaceAt(x, prevY, newY) {
    let best = GROUND;
    if (phase === 'street') {
      for (const p of platforms) {
        if (x > p.x1 - 24 && x < p.x2 + 24 && prevY <= p.top + 24 && newY >= p.top - 3 && p.top < best) best = p.top;
      }
      for (const s of archSurfaces) {
        if (x > s.x1 - 18 && x < s.x2 + 18 && prevY <= s.top + 52 && newY >= s.top - 6 && s.top < best) best = s.top;
      }
      for (const s of roofSurfaces) {
        if (x > s.x1 - 10 && x < s.x2 + 10 && prevY <= s.top + 18 && newY >= s.top - 3 && s.top < best) best = s.top;
      }
    }
    return best;
  }

  function updatePlayer(dt) {
    player.anim += dt;
    hurtFlashT = Math.max(0, hurtFlashT - dt);
    if (won || lost || catchT > 0 || dialogueCurrent || story.fishShowT > 0 || story.taxiT > 0) return;
    const h = nearestHide();
    if (keys.crouch && !crouchLatch && h) toggleHide();
    crouchLatch = keys.crouch ? 1 : 0;
    if (player.hidden) {
      player.vx = 0;
      player.vy = 0;
      player.state = 'hide';
      return;
    }

    const move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const groundSpeed = keys.run ? 270 : 158;
    if (player.onSurface) {
      player.vx = move * groundSpeed;
    } else {
      const airTarget = move * (keys.run ? 510 : 440);
      const airControl = 1100 * dt;
      if (move) player.vx += clamp(airTarget - player.vx, -airControl, airControl);
      else player.vx *= Math.max(0, 1 - dt * 0.18);
    }
    if (move) player.face = move;
    if (keys.jump && !jumpLatch && player.onSurface) {
      const threat = talkers.find(t => !t.retired && (t.state === 'talk' || t.state === 'chase') && Math.abs(t.x - player.x) < 190);
      const archTarget = hideSpots.find(h => Math.abs(h.x - player.x) < 205 && (move === 0 || Math.sign(h.x - player.x) === move));
      const jumpDir = move;
      if (archTarget && player.y > GROUND - 45) {
        // Landing assistance only: no horizontal force-pull. It makes the broad snow ledge
        // reliable while preserving the player's actual jump trajectory.
        const targetSurface = archSurfaces.find(surface => archTarget.x >= surface.x1 && archTarget.x <= surface.x2);
        archAssist = { x: archTarget.x, top: targetSurface ? targetSurface.top : GROUND - 196, t: 1.2 };
        player.vy = -790;
        player.vx = jumpDir ? jumpDir * 430 : (archTarget.x > player.x ? 330 : -330);
        queueTutorialHint('arch-jump', 'РАЗБЕГ + ПРЫЖОК — НА СНЕЖНЫЙ ВЕРХ АРКИ');
      } else {
        archAssist = null;
        player.vy = threat && jumpDir ? -740 : -670;
        if (jumpDir) player.vx = jumpDir * (threat ? 560 : keys.run ? 500 : 430);
        else player.vx = 0;
      }
      player.onSurface = false;
      if (threat && jumpDir && !archTarget) {
        graceT = Math.max(graceT, 1.3);
        evadeT = 1.3;
        threat.state = 'search';
        threat.searchDir = -jumpDir;
        threat.searchT = 1.35;
        toast = 'ПЕРЕПРЫГНУЛ СОБЕСЕДНИКА';
        toastT = 0.95;
      }
    }
    jumpLatch = keys.jump ? 1 : 0;
    if (archAssist) {
      archAssist.t -= dt;
      if (archAssist.t <= 0) archAssist = null;
    }

    const prevY = player.y;
    player.vy += GRAV * dt;
    let ny = player.y + player.vy * dt;
    let nx = player.x + player.vx * dt;
    nx = resolveHorizontal(player.x, nx, Math.min(prevY, ny));
    let surf = surfaceAt(nx, prevY, ny);
    if (archAssist && player.vy >= 0 && Math.abs(nx - archAssist.x) < 170 && ny >= archAssist.top - 10 && prevY <= archAssist.top + 88) {
      nx = clamp(nx, archAssist.x - 112, archAssist.x + 112);
      surf = archAssist.top;
    }
    if (player.vy >= 0 && ny >= surf && prevY <= surf + 58) {
      ny = surf;
      player.vy = 0;
      player.onSurface = true;
      if (archAssist && Math.abs(ny - archAssist.top) < 4) archAssist = null;
    } else {
      player.onSurface = false;
    }

    const maxX = phase === 'room' ? 1180 : WORLD_W - 40;
    player.x = clamp(nx, 40, maxX);
    player.y = ny;
    if (player.y > GROUND) {
      player.y = GROUND;
      player.vy = 0;
      player.onSurface = true;
    }

    if (!player.onSurface) player.state = 'jump';
    else if (pushingPlatform) player.state = 'push';
    else if (keys.crouch) player.state = 'crouch';
    else if (move) player.state = keys.run ? 'run' : 'walk';
    else player.state = 'idle';

    if (phase === 'street') {
      if (player.x > 1260) player.checkpoint = Math.max(player.checkpoint, 1220);
      if (player.x > RURIK_X) player.checkpoint = Math.max(player.checkpoint, RURIK_X - 80);
      if (player.x > FISH_ZONE_START) player.checkpoint = Math.max(player.checkpoint, FISH_ZONE_START - 70);
      if (player.x > FISH_ZONE_END) player.checkpoint = Math.max(player.checkpoint, FISH_ZONE_END + 50);
      if (player.x > ROOF_ZONE_END) player.checkpoint = Math.max(player.checkpoint, ROOF_ZONE_END + 50);
      if (player.x > 8500) player.checkpoint = Math.max(player.checkpoint, 8420);
      if (player.x > STORE_ZONE_START) player.checkpoint = Math.max(player.checkpoint, STORE_ZONE_START + 30);
      if (!story.fishZoneSeen && inFishZone(player.x)) { story.fishZoneSeen = true; toast = 'РЫБНАЯ ЛАВКА'; toastT = 1.4; }
      if (!story.fishCalled && player.x > FISH_ZONE_START + 120) story.fishCalled = true;
      if (!story.roofSeen && inRoofZone(player.x) && player.y < GROUND - 25) { story.roofSeen = true; toast = 'ВЕРХНИЙ МАРШРУТ · ПО КРЫШАМ'; toastT = 1.35; }
    }
  }

  function updateTalkers(dt) {
    if (phase !== 'street' || won || lost || dialogueCurrent || catchT > 0 || story.fishShowT > 0 || story.taxiT > 0) return;
    const quiet = [
      { active: inFishZone(player.x), start: FISH_ZONE_START, center: FISH_X, end: FISH_ZONE_END },
      { active: inStoreZone(player.x), start: STORE_ZONE_START, center: STORE_X, end: STORE_ZONE_END }
    ].find(zone => zone.active);
    const quietZone = Boolean(quiet);
    const quietStart = quiet ? quiet.start : 0;
    const quietCenter = quiet ? quiet.center : 0;
    const quietEnd = quiet ? quiet.end : 0;
    const activeCount = () => talkers.filter(q => !q.retired && ['chase', 'talk', 'search', 'blocked', 'vault'].includes(q.state)).length;
    for (const t of talkers) {
      t.t += dt;
      t.phaseT += dt;
      if (t.retired) {
        t.y = GROUND;
        t.face = t.retireDir < 0 ? -1 : 1;
        const retiredMove = moveTalkerAgainstWorld(t, t.x + t.speed * 0.65 * t.retireDir * dt);
        t.x = retiredMove.x;
        if (retiredMove.blocked) t.retireDir *= -1;
        continue;
      }
      if (quietZone) {
        if (t.state === 'vault') {
          t.y = GROUND;
          t.retired = true;
          t.retireDir = t.x < quietCenter ? -1 : 1;
          t.x = t.retireDir < 0 ? Math.min(t.x, quietStart - 85) : Math.max(t.x, quietEnd + 85);
          continue;
        }
        if (['chase', 'talk', 'search'].includes(t.state)) {
          t.retired = true;
          t.retireDir = t.x < quietCenter ? -1 : 1;
          t.x = t.retireDir < 0 ? Math.min(t.x, quietStart - 85) : Math.max(t.x, quietEnd + 85);
        }
        continue;
      }
      if (t.state === 'idle') {
        const patrolSpan = 52 + (t.id % 3) * 18;
        const patrolTarget = t.home + Math.sin(t.phaseT * 0.72 + t.id * 1.7) * patrolSpan;
        const patrolDelta = patrolTarget - t.x;
        if (Math.abs(patrolDelta) > 2) {
          t.face = patrolDelta < 0 ? -1 : 1;
          const patrolMove = moveTalkerAgainstWorld(t, t.x + clamp(patrolDelta, -t.speed * 0.24 * dt, t.speed * 0.24 * dt));
          t.x = patrolMove.x;
        }
        if (graceT <= 0 && player.x > t.trigger && !player.hidden && !dialogueCurrent && activeCount() < 1) {
          t.state = 'talk';
          t.talkT = t.notice || 0.75;
          t.face = t.type === 'somna' ? -1 : (player.x < t.x ? -1 : 1);
        }
      } else if (t.state === 'talk') {
        t.talkT -= dt;
        if (t.type !== 'somna') t.face = player.x < t.x ? -1 : 1;
        if (t.talkT <= 0) { t.state = 'chase'; t.phaseT = 0; }
      } else if (t.state === 'chase') {
        if (player.hidden) {
          t.state = 'search';
          t.searchDir = t.face || -1;
          t.searchT = t.search || 2.1;
          continue;
        }
        const dx = player.x - t.x;
        t.face = dx < 0 ? -1 : 1;
        let speed = t.speed;
        if (t.type === 'drunk') speed *= Math.sin(t.phaseT * 5) > -0.15 ? 1.12 : 0.45;
        const dir = Math.sign(dx);
        const nextTalkX = t.x + dir * speed * dt;
        const blocker = platforms.find(p => ((dir > 0 && t.x < p.x1 && nextTalkX + 24 >= p.x1 && player.x > p.x2) || (dir < 0 && t.x > p.x2 && nextTalkX - 24 <= p.x2 && player.x < p.x1)));
        if (blocker) {
          t.x = dir > 0 ? blocker.x1 - 28 : blocker.x2 + 28;
          stopTalkerWithCrate(t, -dir, blocker, false);
          continue;
        }
        const worldMove = moveTalkerAgainstWorld(t, nextTalkX);
        t.x = worldMove.x;
        if (worldMove.blocked) {
          t.state = 'search';
          t.searchDir = -dir;
          t.searchT = worldMove.kind === 'talker' ? 0.65 : 0.9;
          continue;
        }
        if (player.onSurface && Math.abs(player.y - t.y) < 58 && graceT <= 0 && evadeT <= 0 && Math.abs(dx) < 52) caughtBy(t);
        if (player.x - t.x > (t.giveUp || 320)) { t.retired = true; t.retireDir = 1; }
      } else if (t.state === 'search') {
        t.searchT -= dt;
        const searchMove = moveTalkerAgainstWorld(t, t.x + t.searchDir * (t.type === 'somna' ? 34 : 52) * dt);
        t.x = searchMove.x;
        if (searchMove.blocked) {
          t.retired = true;
          t.retireDir = -(t.searchDir || 1);
          continue;
        }
        if (t.searchT <= 0) { t.retired = true; t.retireDir = t.searchDir || 1; }
      } else if (t.state === 'blocked') {
        t.blockT -= dt;
        if (t.blockT <= 0) {
          if (t.blockAfter === 'chase') {
            t.state = 'chase';
            t.phaseT = 0;
            t.blockAfter = 'retire';
          } else {
            t.retired = true;
            t.retireDir = t.blockDir || -1;
          }
        }
      } else if (t.state === 'vault') {
        t.vaultT = Math.min(1, t.vaultT + dt / Math.max(0.35, t.vaultDuration));
        const ease = t.vaultT * t.vaultT * (3 - 2 * t.vaultT);
        t.x = t.vaultFrom + (t.vaultTo - t.vaultFrom) * ease;
        t.y = GROUND - Math.sin(Math.PI * t.vaultT) * 94;
        if (t.vaultT >= 1) {
          t.y = GROUND;
          t.state = 'chase';
          t.phaseT = 0;
        }
      }
    }
  }

  function update(dt) {
    if (paused) return;
    time += dt;
    if (toastT > 0) toastT -= dt;
    if (tutorialHint) {
      tutorialHint.t = Math.max(0, tutorialHint.t - dt);
      if (tutorialHint.t <= 0) tutorialHint = null;
    }
    if (catchT > 0) catchT -= dt;
    if (graceT > 0) graceT -= dt;
    if (evadeT > 0) evadeT -= dt;
    if (obstacleGraceT > 0) obstacleGraceT = Math.max(0, obstacleGraceT - dt);
    for (const p of platforms) if (p.pushT > 0) p.pushT = Math.max(0, p.pushT - dt);
    if (story.fishShowT > 0) story.fishShowT -= dt;
    if (story.taxiT > 0) {
      story.taxiT = Math.max(0, story.taxiT - dt);
      if (story.taxiT === 0) {
        toast = 'ПЕШКОМ ТАК ПЕШКОМ';
        toastT = 1.25;
        player.state = 'idle';
        if (busStartTime === null) busStartTime = time;
      }
    }
    if (sleepTransition > 0) sleepTransition = Math.max(0, sleepTransition - dt);
    if (story.purchaseStage === 'handoff' && story.purchaseT > 0) {
      story.purchaseT = Math.max(0, story.purchaseT - dt);
      if (story.purchaseT === 0) {
        story.purchaseStage = 'done';
        won = true;
        player.state = 'newspaper';
        objectiveEl.textContent = 'газета куплена · игра пройдена';
        stateEl.textContent = 'Игра пройдена';
        toastT = 0;
      }
    }
    updateDialogue(dt);
    if (phase === 'campaign') updateCampaign(dt);
    else {
      updatePlayer(dt);
      updateTalkers(dt);
    }
    const targetCam = phase === 'street' ? clamp(player.x - 410, 0, WORLD_W - W) : 0;
    camX += (targetCam - camX) * Math.min(1, dt * 5.4);
    stateEl.textContent = won ? 'Игра пройдена' : (phase === 'campaign' ? currentCampaignAct().title : (phase === 'room' ? 'Комната' : (inRoofZone(player.x) && player.y < GROUND - 20 ? 'Крыши' : 'Улица')));
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    nearAction = false;
    if (phase === 'campaign') drawCampaign();
    else {
      if (phase === 'room') drawRoom();
      else drawStreet();
      drawTalkers();
      drawPlayer();
      // Ground-level traversal is behind the masonry, while the snow cap remains solid.
      if (phase === 'street' && player.y > GROUND - 95) for (const h of hideSpots) if (Math.abs(player.x - h.x) < 158 && !player.hidden) drawArchForeground(h.x);
    }
    drawDialogue();
    drawHUD();
  }

  let recoveryTimer = null;

  function reset() {
    clearTimeout(recoveryTimer);
    for (const key of Object.keys(keys)) keys[key] = 0;
    jumpLatch = 0;
    crouchLatch = 0;
    phase = 'room';
    player.x = 310;
    player.y = GROUND;
    player.vx = 0;
    player.vy = 0;
    player.face = 1;
    player.state = 'idle';
    player.anim = 0;
    player.hidden = false;
    player.hideId = null;
    player.contacts = 0;
    player.energy = MAX_ENERGY;
    player.checkpoint = 180;
    player.onSurface = true;
    won = false;
    lost = false;
    paused = false;
    catchT = 0;
    graceT = 0;
    evadeT = 0;
    obstacleGraceT = 0;
    pushingPlatform = null;
    archAssist = null;
    shownHints.clear();
    tutorialHint = null;
    catchBubble = null;
    toast = 'ОДЕТЬСЯ И СПУСТИТЬСЯ ЗА ВЕЧЕРНЕЙ ГАЗЕТОЙ';
    toastT = 3.4;
    dialogueQueue = [];
    dialogueCurrent = null;
    busStartTime = null;
    sleepTransition = 0;
    Object.assign(story, { rurikDone: false, rurikState: 0, fishCalled: false, fishDone: false, fishShowT: 0, fishZoneSeen: false, taxiDone: false, taxiT: 0, roofSeen: false, campaignDone: false, purchaseStarted: false, purchaseStage: 'idle', purchaseT: 0 });
    campaign.started = false; campaign.act = 0; campaign.step = 0; campaign.bullets.length = 0; campaign.enemies.length = 0; campaign.completeT = -1;
    for (const p of platforms) { p.x1 = p.startX1; p.x2 = p.startX2; p.pushT = 0; p.moved = false; }
    for (const t of talkers) {
      const base = talkerBase[t.id];
      Object.assign(t, { x: base.home, y: GROUND, state: 'idle', talkT: 0, searchT: 0, blockT: 0, blockDir: -1, vaultT: 0, vaultFrom: base.home, vaultTo: base.home, retired: false, retireDir: 1, face: -1 });
    }
    camX = 0;
    objectiveEl.textContent = 'цель игры: купить газету · сначала выйти из комнаты';
  }
  const campaignActs = [
    { id: 'courtyards', title: 'АКТ II · ДВОР-КОЛОДЕЦ', objective: 'Пройдите двор и поднимитесь по правой каменной лестнице к выходу' },
    { id: 'post', title: 'АКТ III · ПОЧТА', objective: 'Подготовьте книги и передайте посылку сотруднице' },
    { id: 'advert', title: 'АКТ IIIb · ЗВЁЗДЫ', objective: 'Доберитесь до электрошкафа, не попадая в свет' },
    { id: 'embankment', title: 'АКТ IV · НАБЕРЕЖНАЯ И В.О.', objective: 'Выясните, где был тёмно-синий фасад' },
    { id: 'christmas', title: 'АКТ V · РОЖДЕСТВЕНСКИЙ ТРАМВАЙ', objective: 'Сядьте в трамвай, пройдите вагон и сойдите на нужной остановке' },
    { id: 'shooter', title: 'АКТ VI · ЧЕМОДАН', objective: 'Рассеять метафизические тени' },
    { id: 'pawnshop', title: 'АКТ VII · ЛОМБАРД', objective: 'Заложите пистолет и освободите проход патефоном' },
    { id: 'cage', title: 'АКТ VIII · КЛЕТКА', objective: 'Откройте два засова, рычаг и дверь' },
    { id: 'fight', title: 'АКТ IX · КОТЕЛЬНАЯ', objective: 'Переждите замах и остановите котельную тень' },
    { id: 'chase', title: 'АКТ X · ПОСЛЕДНЯЯ ПОГОНЯ', objective: 'Вернитесь к магазину через двор, крыши и транспорт' }
  ];

  const campaign = {
    act: 0, x: 90, y: 620, vy: 0, grounded: true, elapsed: 0, step: 0, progress: 0,
    message: '', messageT: 0, completeT: -1, invuln: 0, hurtFlash: 0,
    transitionT: 0, transitionDuration: 1.05, previousId: null, entryFade: 0,
    bullets: [], enemies: [], particles: [], platforms: [], climbs: [], climbIndex: -1, climbT: 0,
    inspected: new Set(), attackCd: 0, enemyCd: 0, enemyHp: 0, started: false,
    floorY: 620, tramX: 1320, tramStopped: false, objective: '', shotsFired: 0, shotVectors: []
  };

  const ATLAS = {
    stairs: [0,0,745,350], clerk: [742,35,160,300], counter: [890,24,420,320],
    scales: [1305,25,210,145], props: [1300,155,235,190], tram: [12,350,875,315], vendor: [900,380,175,275],
    shadows: [[1060,445,165,205],[1200,365,170,285],[1350,315,180,350]],
    gramophone: [20,690,150,285], cage: [155,680,175,330],
    monsters: [[320,650,245,370],[560,700,190,300],[720,745,190,270]],
    facade: [900,660,260,350], cabinet: [1160,680,165,290], lamp: [1300,690,120,260],
    crate: [1165,900,155,120]
  };

  const lerp = (a,b,t) => a + (b-a) * t;
  function currentCampaignAct(){ return campaignActs[campaign.act]; }
  function atlasPart(rect,x,y,w,h,flip=false,alpha=1){
    if(!campaignGameplayAtlas)return;
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x+(flip?w:0),y); if(flip)ctx.scale(-1,1);
    ctx.drawImage(campaignGameplayAtlas,...rect,0,0,w,h); ctx.restore();
  }
  function setCampaignMessage(text,seconds=1.6){ campaign.message=text; campaign.messageT=seconds; }
  function setCampaignObjective(text){ campaign.objective=text; objectiveEl.textContent=text; }
  function campaignPrompt(x,y,text,radius=82){
    if(Math.abs(campaign.x-x)<=radius){ drawPrompt(x,y,text); nearAction=true; return true; }
    return false;
  }

  function setupCampaignAct(index){
    camX=0;
    const previousId=campaign.started&&index!==campaign.act ? campaignActs[campaign.act]?.id : null;
    Object.assign(campaign,{
      act:index,x:90,y:620,vy:0,grounded:true,elapsed:0,step:0,progress:0,messageT:0,
      completeT:-1,invuln:0,hurtFlash:0,transitionT:previousId?1.05:0,previousId,
      bullets:[],particles:[],inspected:new Set(),attackCd:0,enemyCd:1.4,
      platforms:[{x1:0,x2:1280,y:620}],climbs:[],climbIndex:-1,climbT:0,enemies:[],
      floorY:620,tramX:1320,tramStopped:false,objective:campaignActs[index].objective,shotsFired:0,shotVectors:[]
    });
    const id=currentCampaignAct().id;
    player.face=1;

    if(id==='courtyards'){
      // Coordinates follow the visible snow ledges and diagonal staircases of vertical-courtyards.webp.
      campaign.floorY=675; campaign.x=1190; campaign.y=675;
      // Use only the staircase and landing that are actually painted into the background.
      // Previous versions invented extra upper platforms, which made Brodsky visibly walk in mid-air.
      campaign.platforms=[
        {x1:0,x2:1280,y:675},
        {x1:1000,x2:1270,y:450}
      ];
      campaign.climbs=[
        {low:{x:1190,y:675},high:{x:1050,y:450}}
      ];
      setCampaignMessage('Прямой проход закрыт. Справа есть настоящая каменная лестница к верхней двери.',2.8);
    }
    if(id==='post'){
      campaign.x=120;
      setCampaignObjective('Подойдите к стойке и заполните бланк для посылки Постуму.');
      setCampaignMessage('Постуму нужно отправить книги. Сначала — бланк, затем книги, упаковка, весы и сотрудница.',2.8);
    }
    if(id==='advert'){
      campaign.x=110;
      setCampaignObjective('Пройдите мимо рабочего незамеченным и отключите рекламную звезду в электрошкафу.');
      setCampaignMessage('Постуму обещаны звёзды. Но всё небо закрыла огромная реклама. Выключатель — справа.',3.0);
    }
    if(id==='embankment'){
      campaign.x=120;
      setCampaignObjective('Подойдите к сотруднику В.О. и получите справку.');
      setCampaignMessage('Без справки искать нужный дом бессмысленно. Сначала — сотрудник В.О.',2.5);
    }
    if(id==='christmas'){
      campaign.x=110; campaign.tramX=1320;
      setCampaignObjective('Дождитесь трамвая у остановки и войдите через ближнюю дверь.');
      setCampaignMessage('Трамвай подходит к остановке. Не прыгайте через абстрактные препятствия — дождитесь настоящего вагона.',2.6);
    }
    if(id==='shooter'){
      campaign.x=150;
      setCampaignObjective('Рассеять три тени физическими выстрелами: прямо и по диагонали.');
      campaign.enemies=[
        {x:610,y:575,w:92,h:125,hp:3,kind:0,flash:0,baseY:575},
        {x:855,y:440,w:98,h:150,hp:3,kind:1,flash:0,baseY:440},
        {x:1090,y:300,w:110,h:195,hp:3,kind:2,flash:0,baseY:300}
      ];
      setCampaignMessage('ENTER / клик / ДЕЙСТВИЕ — огонь · W/↑ — вверх · S/↓ — вниз',3.2);
    }
    if(id==='fight'){
      campaign.enemyHp=7; campaign.x=175; setCampaignObjective('Подойдите к тени, переждите её замах и атакуйте в безопасное окно.');
    }

    stateEl.textContent=currentCampaignAct().title;
    objectiveEl.textContent=currentCampaignAct().objective;
  }

  function startCampaignTransition(){
    phase='campaign'; campaign.started=true; setupCampaignAct(0); campaign.entryFade=1.15;
    setCampaignMessage('ПРЯМОЙ ПУТЬ К ГАЗЕТЕ ЗАКРЫТ. ПРИДЁТСЯ ИДТИ ЧЕРЕЗ ДВОРЫ.',3.0);
  }
  function beginCampaign(){ startCampaignTransition(); }
  function completeCampaignAct(delay=1.35){ if(campaign.completeT<0)campaign.completeT=delay; }
  function finishCampaignAct(){
    if(campaign.act<campaignActs.length-1){ setupCampaignAct(campaign.act+1); return; }
    story.campaignDone=true; phase='street'; player.x=STORE_ZONE_START+180; player.y=GROUND;
    player.vx=player.vy=0; player.onSurface=true; camX=clamp(player.x-410,0,WORLD_W-W);
    objectiveEl.textContent='Купить вечернюю газету'; stateEl.textContent='Пятёрочка · финал';
    toast='ПОСЛЕ ДОЛГОГО ОБХОДА · НАКОНЕЦ ГАЗЕТНЫЙ ПРИЛАВОК'; toastT=2.4;
  }

  function campaignHurt(text){
    if(campaign.invuln>0)return;
    campaign.invuln=.9; campaign.hurtFlash=1.0; campaign.x=Math.max(55,campaign.x-62);
    setCampaignMessage(`GOD MODE · ${text}`,1.15);
  }

  function segmentHitsRect(x1,y1,x2,y2,r,box){
    const bounds=[[box.x-box.w/2-r,box.x+box.w/2+r,x1,x2-x1],[box.y-box.h-r,box.y+r,y1,y2-y1]];
    let enter=0,exit=1;
    for(const[min,max,start,delta]of bounds){
      if(Math.abs(delta)<1e-8){ if(start<min||start>max)return false; continue; }
      let a=(min-start)/delta,b=(max-start)/delta; if(a>b)[a,b]=[b,a];
      enter=Math.max(enter,a); exit=Math.min(exit,b); if(enter>exit)return false;
    }
    return true;
  }

  function shooterPose(){
    if(keys.up)return {dy:-.62,mx:58,my:-154,image:campaignPlayerArt.up};
    if(keys.crouch)return {dy:.48,mx:60,my:-72,image:campaignPlayerArt.down};
    return {dy:0,mx:64,my:-126,image:campaignPlayerArt.straight};
  }

  function fireCampaignShot(){
    if(campaign.attackCd>0)return;
    const face=player.face||1, pose=shooterPose(), norm=Math.hypot(1,pose.dy);
    const vx=face*1180/norm, vy=pose.dy*1180/norm;
    const mx=campaign.x+face*pose.mx, my=campaign.y+pose.my;
    campaign.bullets.push({x:mx,y:my,vx,vy,life:1.25,trail:[]});
    campaign.shotsFired++; campaign.shotVectors.push({vx,vy}); if(campaign.shotVectors.length>6)campaign.shotVectors.shift();
    campaign.particles.push({x:mx,y:my,t:.12,kind:'flash'});
    campaign.attackCd=.19;
  }

  function startClimb(index,fromTop=false){
    campaign.climbIndex=index; campaign.climbT=fromTop?1:0; campaign.vy=0; campaign.grounded=true;
  }

  function maybeEnterClimb(){
    if(currentCampaignAct().id!=='courtyards'||campaign.climbIndex>=0)return false;
    for(let i=0;i<campaign.climbs.length;i++){
      const c=campaign.climbs[i];
      const lowDist=Math.hypot(campaign.x-c.low.x,campaign.y-c.low.y);
      const highDist=Math.hypot(campaign.x-c.high.x,campaign.y-c.high.y);
      if(keys.up&&lowDist<75){startClimb(i,false);return true;}
      if(keys.crouch&&highDist<75){startClimb(i,true);return true;}
    }
    return false;
  }

  function updateClimb(dt){
    const c=campaign.climbs[campaign.climbIndex]; if(!c){campaign.climbIndex=-1;return;}
    let delta=0; if(keys.up)delta=1; else if(keys.crouch)delta=-1;
    campaign.climbT=clamp(campaign.climbT+delta*dt*.9,0,1);
    campaign.x=lerp(c.low.x,c.high.x,campaign.climbT);
    campaign.y=lerp(c.low.y,c.high.y,campaign.climbT);
    if(delta>0)player.face=c.high.x>=c.low.x?1:-1; else if(delta<0)player.face=c.low.x>=c.high.x?1:-1;
    campaign.vy=0; campaign.grounded=true;
    if((campaign.climbT<=0&&!keys.up)||(campaign.climbT>=1&&!keys.crouch))campaign.climbIndex=-1;
  }

  function campaignAction(){
    const id=currentCampaignAct().id; if(campaign.completeT>=0)return;
    if(id==='courtyards'){
      if(campaign.x<1130&&campaign.y<485){setCampaignMessage('ВЕРХНЯЯ ДВЕРЬ · ПРОХОД ДАЛЬШЕ',1);completeCampaignAct();}
    }
    else if(id==='post'){
      const stations=[210,430,650,845,1060];
      if(Math.abs(campaign.x-stations[campaign.step])<95){
        const lines=[
          'БЛАНК ЗАПОЛНЕН: ПОСТУМ · ОБРАТНЫЙ АДРЕС: НИОТКУДА',
          'КНИГИ ВЗЯТЫ',
          'КНИГИ УПАКОВАНЫ И ПЕРЕВЯЗАНЫ',
          'ПОСЫЛКА ВЗВЕШЕНА',
          '— Откуда? — Ниоткуда.'
        ];
        setCampaignMessage(lines[campaign.step],campaign.step===4?2.3:1.4);
        campaign.step++;
        const nextObjectives=[
          'Возьмите книги со стола.',
          'Упакуйте книги в коробку и перевяжите посылку.',
          'Поставьте готовую посылку на весы.',
          'Передайте взвешенную посылку сотруднице.',
          'Посылка принята. Подождите завершения оформления.'
        ];
        if(campaign.step>0&&campaign.step<=nextObjectives.length)setCampaignObjective(nextObjectives[campaign.step-1]);
        if(campaign.step===stations.length)completeCampaignAct(2.4);
      }
    }
    else if(id==='advert'){
      if(campaign.x>1050){campaign.step=1;setCampaignObjective('Реклама выключена. Посмотрите на открывшееся небо.');setCampaignMessage('РЕКЛАМА ПОГАСЛА. НЕБО СНОВА ВИДНО.',2.3);completeCampaignAct(2.3);}
    }
    else if(id==='embankment'){
      if(campaign.step===0&&Math.abs(campaign.x-210)<100){
        campaign.step=1;
        setCampaignMessage('— Цель визита на В.О.? — Умирать. — Вы первично или повторно?',2.8);
        setCampaignObjective('В справке указан ориентир: дом с тёмно-синим фасадом. Осмотрите три адресные таблички.');
      } else if(campaign.step===1){
        const houses=[500,745,970];
        const hit=houses.findIndex(x=>Math.abs(campaign.x-x)<85&&!campaign.inspected.has(x));
        if(hit>=0){
          const x=houses[hit]; campaign.inspected.add(x);
          if(hit===2){
            campaign.step=2;
            setCampaignMessage('ФАСАД ПЕРЕКРАСИЛИ. СТАРОЕ ОПИСАНИЕ ЕСТЬ В ЖИЛКОНТОРЕ.',2.2);
            setCampaignObjective('Фасад перекрашен. Дойдите до жилконторы справа и найдите старое описание дома.');
          } else setCampaignMessage('НЕ ТОТ ДОМ.',1.25);
        }
      } else if(campaign.step===2&&campaign.x>1080){
        campaign.step=3; setCampaignMessage('— Он был синий? — По документам — синий.',2.2); completeCampaignAct(2.3);
      }
    }
    else if(id==='christmas'){
      if(campaign.step===0&&campaign.tramStopped&&Math.abs(campaign.x-225)<115){
        campaign.step=1; campaign.x=330; campaign.y=600; campaign.floorY=600;
        setCampaignMessage('ДВЕРИ ЗАКРЫВАЮТСЯ. В ВАГОНЕ — ПАССАЖИРЫ. ИХ НУЖНО ОБОЙТИ, А НЕ СОБИРАТЬ.',2.5);
        setCampaignObjective('Пройдите салон трамвая, обходя или перепрыгивая пассажиров, и выйдите через дальнюю дверь.');
      } else if(campaign.step===1&&campaign.x>1110){
        campaign.step=2; setCampaignObjective('Нужная остановка. Выйдите из трамвая.'); setCampaignMessage('НУЖНАЯ ОСТАНОВКА. ВЫХОД.',1.5); completeCampaignAct(1.5);
      }
    }
    else if(id==='shooter') fireCampaignShot();
    else if(id==='pawnshop'){
      if(campaign.step===0&&Math.abs(campaign.x-260)<105){
        campaign.step=1;setCampaignMessage('ПИСТОЛЕТ ЗАЛОЖЕН. ВЗАМЕН — ПАТЕФОН.',1.9);setCampaignObjective('Заведите патефон перед очередью.');
      } else if(campaign.step===1&&Math.abs(campaign.x-650)<110){
        campaign.step=2;setCampaignMessage('МУЗЫКА. ОЧЕРЕДЬ ТАНЦУЕТ, НО НЕ РАСХОДИТСЯ.',2.1);setCampaignObjective('Пройдите между танцующими людьми, когда проход открывается.');
      } else if(campaign.step===2&&campaign.x>1120)completeCampaignAct();
    }
    else if(id==='cage'){
      const stations=[300,650,980];
      if(Math.abs(campaign.x-stations[campaign.step])<90){
        campaign.step++;
        setCampaignMessage(['ПЕРВЫЙ ЗАСОВ ОТКРЫТ','ВТОРОЙ ЗАСОВ ОТКРЫТ','РЫЧАГ ОСВОБОДИЛ ДВЕРЬ'][campaign.step-1],1.3);
        setCampaignObjective(['Откройте второй засов.','Доберитесь до рычага у клетки.','Дверь освобождена. Выходите.'][campaign.step-1]);
        if(campaign.step===3)completeCampaignAct();
      }
    }
    else if(id==='fight'){
      if(campaign.x>700&&campaign.attackCd<=0){
        campaign.enemyHp--;campaign.attackCd=.45;
        setCampaignMessage(campaign.enemyHp?'УДАР':'ТЕНЬ КОТЕЛЬНОЙ РАССЕЯНА',.6);
        if(campaign.enemyHp<=0)completeCampaignAct(1.6);
      }
    }
    else if(id==='chase'&&campaign.x>1170){
      setCampaignMessage('МАГАЗИН · ГАЗЕТНЫЙ ПРИЛАВОК',1.6); completeCampaignAct(1.8);
    }
  }

  function campaignSurface(x,oldY,newY){
    let best=campaign.floorY;
    for(const p of campaign.platforms){
      if(x>p.x1&&x<p.x2&&oldY<=p.y+22&&newY>=p.y-4&&p.y<best)best=p.y;
    }
    return best;
  }

  function updateCampaignProjectiles(dt){
    for(const b of campaign.bullets){
      const ox=b.x,oy=b.y;
      b.trail.push({x:b.x,y:b.y}); if(b.trail.length>4)b.trail.shift();
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      for(const e of campaign.enemies){
        if(e.hp<=0)continue;
        if(segmentHitsRect(ox,oy,b.x,b.y,4,e)){
          e.hp--;e.flash=.22;b.life=0;campaign.particles.push({x:b.x,y:b.y,t:.28,kind:'hit'});break;
        }
      }
    }
    campaign.bullets=campaign.bullets.filter(b=>b.life>0&&b.x>-40&&b.x<1320&&b.y>-40&&b.y<760);
    for(const e of campaign.enemies){
      e.flash=Math.max(0,e.flash-dt);
      e.y=e.baseY+Math.sin(campaign.elapsed*(1.45+e.kind*.18)+e.kind)*(e.kind?18:5);
    }
    for(const p of campaign.particles)p.t-=dt;
    campaign.particles=campaign.particles.filter(p=>p.t>0);
    if(campaign.enemies.length&&campaign.enemies.every(e=>e.hp<=0)){
      setCampaignMessage('ТЕНИ РАССЕЯНЫ',1.6);completeCampaignAct(1.8);
    }
  }

  function updateCampaign(dt){
    campaign.elapsed+=dt;
    campaign.messageT=Math.max(0,campaign.messageT-dt);
    campaign.invuln=Math.max(0,campaign.invuln-dt);
    campaign.hurtFlash=Math.max(0,campaign.hurtFlash-dt);
    campaign.transitionT=Math.max(0,campaign.transitionT-dt);
    campaign.entryFade=Math.max(0,campaign.entryFade-dt);
    campaign.attackCd=Math.max(0,campaign.attackCd-dt);

    if(campaign.completeT>=0){campaign.completeT-=dt;if(campaign.completeT<=0)finishCampaignAct();return;}

    const id=currentCampaignAct().id;
    const dir=(keys.right?1:0)-(keys.left?1:0);
    const speed=keys.run?300:175;
    if(dir)player.face=dir;

    if(id==='courtyards'&&campaign.climbIndex>=0){
      updateClimb(dt);
    } else if(id==='courtyards'&&maybeEnterClimb()){
      updateClimb(0);
    } else {
      if(keys.jump&&campaign.grounded){campaign.vy=-590;campaign.grounded=false;}
      const oldY=campaign.y;
      campaign.vy+=1280*dt;
      const nx=clamp(campaign.x+dir*speed*dt,45,1235);
      const ny=campaign.y+campaign.vy*dt;
      const surf=campaignSurface(nx,oldY,ny);
      campaign.x=nx;campaign.y=ny;
      if(campaign.vy>=0&&ny>=surf&&oldY<=surf+42){campaign.y=surf;campaign.vy=0;campaign.grounded=true;}
      else campaign.grounded=false;
      if(campaign.y>campaign.floorY+60){campaign.y=campaign.floorY;campaign.x=Math.max(55,campaign.x-120);campaign.vy=0;campaign.grounded=true;campaignHurt('СОРВАЛСЯ');}
    }

    if(id==='courtyards'&&campaign.x<1130&&campaign.y<485&&campaign.climbIndex<0)campaignAction();

    if(id==='advert'){
      const workerX=250+((campaign.elapsed*150)%760);
      if(Math.abs(campaign.x-workerX)<92&&!keys.crouch&&Math.abs(dir)>0)campaignHurt('РАБОТНИК ЗАМЕТИЛ ДВИЖЕНИЕ');
    }

    if(id==='christmas'){
      if(campaign.step===0){
        campaign.tramX=Math.max(170,campaign.tramX-dt*330);
        if(campaign.tramX<=170){campaign.tramStopped=true;}
      }
      if(campaign.step===1){
        for(const passengerX of[575,825]){
          if(Math.abs(campaign.x-passengerX)<44&&campaign.y>540)campaignHurt('ПАССАЖИР ПЕРЕКРЫЛ ПРОХОД');
        }
      }
    }

    if(id==='shooter')updateCampaignProjectiles(dt);

    if(id==='fight'&&campaign.enemyHp>0){
      campaign.enemyCd-=dt;
      if(campaign.enemyCd<=0){
        if(campaign.x>635&&!keys.crouch&&campaign.y>540)campaignHurt('УДАР ТЕНИ · ПРИСЯДЬТЕ ИЛИ ПРЫГНИТЕ');
        campaign.enemyCd=1.65;
      }
    }

    if(id==='chase'){
      for(const obstacleX of[380,720,980]){
        if(Math.abs(campaign.x-obstacleX)<45&&campaign.y>555)campaignHurt('ПРЕПЯТСТВИЕ · ПРЫЖОК');
      }
    }
  }

  function drawCampaignPlayer(id){
    const moving=Math.abs((keys.right?1:0)-(keys.left?1:0));
    let image=campaign.climbIndex>=0?frame(A.walk,campaign.elapsed,7):(!campaign.grounded?A.jump[0]:(keys.crouch?A.crouch[0]:(moving?frame(keys.run?A.run:A.walk,campaign.elapsed,8):A.idle[0])));
    const alpha=campaign.hurtFlash>0&&Math.floor(campaign.elapsed*10)%2?0.24:1;
    if(id==='shooter'){
      const pose=shooterPose();
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(campaign.x,campaign.y);if(player.face<0)ctx.scale(-1,1);
      ctx.drawImage(pose.image,-70,-190,140,190);ctx.restore();
    } else if(id==='post'&&campaign.step>=2&&campaign.step<=4){
      drawSprite(A.hold[0],campaign.x,campaign.y,.77,player.face<0,alpha);
    } else drawSprite(image,campaign.x,campaign.y,.77,player.face<0,alpha);
  }

  function drawHousePlaque(x,y,label){
    ctx.save();ctx.fillStyle='#21446d';ctx.strokeStyle='#d9e3ec';ctx.lineWidth=2;roundRect(x-30,y-14,60,28,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#f4f5ef';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.restore();
  }

  function drawCampaignActors(id){
    if(id==='courtyards'){
      // No collectible triangles/rectangles. Prompts are attached only to real staircase endpoints.
      if(campaign.climbIndex<0){
        campaign.climbs.forEach((c,i)=>{
          const nearLow=Math.hypot(campaign.x-c.low.x,campaign.y-c.low.y)<90;
          const nearHigh=Math.hypot(campaign.x-c.high.x,campaign.y-c.high.y)<90;
          if(nearLow)drawPrompt(c.low.x,c.low.y-90,'W/↑ — ПОДНЯТЬСЯ ПО ЛЕСТНИЦЕ');
          else if(nearHigh)drawPrompt(c.high.x,c.high.y-90,'S/↓ — СПУСТИТЬСЯ ПО ЛЕСТНИЦЕ');
        });
      }
      if(campaign.x<1150&&campaign.y<500)campaignPrompt(1080,365,'ВОЙТИ В ВЕРХНЮЮ ДВЕРЬ',115);
    }
    else if(id==='post'){
      // Real employee and physical stations rather than floating target rectangles.
      if(campaign.step<=1){
        drawSprite(A.book,418,600,.28);
        drawSprite(A.book,440,594,.28);
        drawSprite(A.book,462,588,.28);
      }
      if(campaign.step>=1&&campaign.step<=3)atlasPart(ATLAS.props,560,430,205,165);
      if(campaign.step>=2)atlasPart(ATLAS.scales,770,470,170,118);
      if(campaignPostalClerkImage)drawImageSprite(campaignPostalClerkImage,1070,620,220,campaign.x>1070,1);
      else atlasPart(ATLAS.clerk,1015,365,125,235,true);
      const stations=[210,430,650,845,1060];
      const labels=['ЗАПОЛНИТЬ БЛАНК','ВЗЯТЬ КНИГИ','УПАКОВАТЬ КНИГИ','ПОСТАВИТЬ НА ВЕСЫ','ПЕРЕДАТЬ СОТРУДНИЦЕ'];
      if(campaign.step<stations.length)campaignPrompt(stations[campaign.step],385,labels[campaign.step],92);
    }
    else if(id==='advert'){
      const workerX=250+((campaign.elapsed*150)%760);
      drawSprite(A.talkWalk[Math.floor(campaign.elapsed*5)%A.talkWalk.length],workerX,620,.62,player.face>0);
      atlasPart(ATLAS.lamp,workerX-45,340,90,220);
      ctx.save();ctx.fillStyle='rgba(241,210,128,.13)';ctx.beginPath();ctx.moveTo(workerX,410);ctx.lineTo(workerX-105,620);ctx.lineTo(workerX+105,620);ctx.fill();ctx.restore();
      atlasPart(ATLAS.cabinet,1050,310,165,290);
      if(campaign.x>970)campaignPrompt(1120,285,'ОТКЛЮЧИТЬ РЕКЛАМУ',120);
    }
    else if(id==='embankment'){
      if(campaign.step===0){
        drawSprite(A.talkWalk[0],210,620,.67,campaign.x<210);
        drawLabel(210,385,'СОТРУДНИК В.О.');
        campaignPrompt(210,430,'ОТВЕТИТЬ',105);
      } else {
        // Three actual facade fragments with address plaques make the search legible.
        atlasPart(ATLAS.facade,410,270,205,340,false,.94);
        atlasPart(ATLAS.facade,655,270,205,340,true,.86);
        atlasPart(ATLAS.facade,900,270,205,340,false,.76);
        drawHousePlaque(500,315,'ДОМ 11');drawHousePlaque(745,315,'ДОМ 13');drawHousePlaque(970,315,'ДОМ 15');
        if(campaign.step===1){
          for(const x of[500,745,970])if(!campaign.inspected.has(x))campaignPrompt(x,255,'ОСМОТРЕТЬ ТАБЛИЧКУ',80);
        }
        if(campaign.step===2){
          drawSprite(A.talkWalk[1],1135,620,.64,campaign.x>1135);
          drawLabel(1135,400,'РАБОТНИК ЖИЛКОНТОРЫ');
          campaignPrompt(1130,350,'СПРОСИТЬ В ЖИЛКОНТОРЕ',115);
        }
      }
    }
    else if(id==='christmas'){
      const tramX=campaign.step===0?campaign.tramX:80;
      atlasPart(ATLAS.tram,tramX,315,1050,378,false,1);
      if(campaign.step===0&&campaign.tramStopped)campaignPrompt(225,345,'ВОЙТИ В ТРАМВАЙ',120);
      if(campaign.step===1){
        for(const[x,i]of[[575,0],[825,1]]){
          drawSprite(A.somna[Math.floor(campaign.elapsed*3+i)%A.somna.length],x,600,.82,i%2===1);
          drawLabel(x,405,i?'ПАССАЖИР':'СОМНАМБУЛА');
        }
        if(campaign.x>1040)campaignPrompt(1140,340,'ВЫЙТИ НА ОСТАНОВКЕ',125);
      }
    }
    else if(id==='shooter'){
      for(const e of campaign.enemies)if(e.hp>0){
        ctx.save();ctx.globalAlpha=e.flash>0?.8:.22;ctx.shadowColor='#c9d8ff';ctx.shadowBlur=e.flash>0?30:18;ctx.fillStyle='rgba(150,175,220,.10)';ctx.beginPath();ctx.ellipse(e.x,e.y-e.h*.45,e.w*.58,e.h*.55,0,0,Math.PI*2);ctx.fill();ctx.restore();
        atlasPart(ATLAS.shadows[e.kind],e.x-e.w/2,e.y-e.h,e.w,e.h,false,e.flash>0?.35:1);
      }
      for(const b of campaign.bullets){
        if(b.trail.length>1){ctx.save();ctx.strokeStyle='rgba(245,227,172,.38)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.trail[0].x,b.trail[0].y);for(const q of b.trail.slice(1))ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();}
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.strokeStyle='#fff1ad';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(14,0);ctx.stroke();ctx.restore();
      }
      for(const p of campaign.particles){
        ctx.save();ctx.globalAlpha=clamp(p.t*8,0,1);ctx.fillStyle=p.kind==='flash'?'#fff2a8':'#d9c59d';ctx.beginPath();ctx.arc(p.x,p.y,p.kind==='flash'?12:8,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    else if(id==='pawnshop'){
      atlasPart(ATLAS.gramophone,570,360,165,270);
      drawSprite(A.talkWalk[0],260,620,.62,campaign.x>260);
      const crowd=campaign.step>=2?[800,1030]:[760,870,980,1090];
      crowd.forEach((x,i)=>drawSprite(A.talkWalk[i%A.talkWalk.length],x,620+(campaign.step>=2?Math.sin(campaign.elapsed*8+i)*8:0),.58,i%2));
      if(campaign.step===0)campaignPrompt(260,400,'ЗАЛОЖИТЬ ПИСТОЛЕТ');
      else if(campaign.step===1)campaignPrompt(650,340,'ЗАВЕСТИ ПАТЕФОН');
    }
    else if(id==='cage'){
      atlasPart(ATLAS.cage,1040,270,200,350);
      [300,650].forEach((x,i)=>{if(campaign.step<=i)atlasPart(ATLAS.cabinet,x-45,470,85,145);});
      if(campaign.step<3)campaignPrompt([300,650,980][campaign.step],420,['ОТКРЫТЬ ПЕРВЫЙ ЗАСОВ','ОТКРЫТЬ ВТОРОЙ ЗАСОВ','ПОВЕРНУТЬ РЫЧАГ'][campaign.step]);
    }
    else if(id==='fight'){
      const tell=campaign.enemyCd<.42;
      atlasPart(ATLAS.monsters[tell?1:0],720,245,tell?250:320,380,true,campaign.enemyHp>0?1:.2);
      if(campaign.enemyHp>0)campaignPrompt(790,205,tell?'БЛОК: S/↓ · ИЛИ ПРЫЖОК':'ПОДОЙТИ И УДАРИТЬ');
    }
    else if(id==='chase'){
      atlasPart(ATLAS.crate,325,500,135,110); atlasPart(ATLAS.stairs,520,310,400,250); atlasPart(ATLAS.tram,930,440,280,175);
    }
  }


  function drawTramInteriorForeground(){
    if(!campaignGameplayAtlas)return;
    const [sx,sy,sw,sh]=ATLAS.tram;
    const cut=Math.floor(sh*.70);
    ctx.save();
    ctx.drawImage(campaignGameplayAtlas,sx,sy+cut,sw,sh-cut,80,315+378*(cut/sh),1050,378*((sh-cut)/sh));
    ctx.restore();
  }

  function drawCampaign(){
    const act=currentCampaignAct(); nearAction=false;
    if(campaign.transitionT>0&&campaign.previousId&&campaignArt[campaign.previousId])ctx.drawImage(campaignArt[campaign.previousId],0,0,W,H);
    if(campaignArt[act.id]){
      ctx.save();ctx.globalAlpha=campaign.transitionT>0?1-campaign.transitionT/campaign.transitionDuration:1;ctx.drawImage(campaignArt[act.id],0,0,W,H);ctx.restore();
    } else {ctx.fillStyle='#101720';ctx.fillRect(0,0,W,H);}
    ctx.fillStyle='rgba(3,7,12,.16)';ctx.fillRect(0,0,W,H);
    drawCampaignActors(act.id);drawCampaignPlayer(act.id);
    if(act.id==='christmas'&&campaign.step===1)drawTramInteriorForeground();

    // Local task panel only. The global "buy newspaper" HUD is intentionally hidden in campaign.
    ctx.save();ctx.fillStyle='#071019df';roundRect(18,16,620,86,10);ctx.fill();ctx.fillStyle='#f4e8d2';ctx.font='700 18px Georgia';ctx.textAlign='left';ctx.fillText(act.title,34,42);
    ctx.fillStyle='#d2c6b2';ctx.font='14px Arial';wrapText(campaign.objective||act.objective,34,66,580,17);ctx.restore();
    if(campaign.messageT>0)drawBubble(clamp(campaign.x,170,1110),Math.max(115,campaign.y-215),campaign.message);
    if(campaign.entryFade>0){ctx.save();ctx.fillStyle=`rgba(0,0,0,${clamp(campaign.entryFade/1.15,0,1)})`;ctx.fillRect(0,0,W,H);ctx.restore();}
  }
  function inputKey(event, value) {
    const k = event.key.toLowerCase();
    if (k === 'a' || event.key === 'ArrowLeft') keys.left = value;
    if (k === 'd' || event.key === 'ArrowRight') keys.right = value;
    if (event.key === 'Shift') keys.run = value;
    if (event.code === 'Space') keys.jump = value;
    if (k === 's' || event.key === 'ArrowDown') keys.crouch = value;
    if (k === 'w' || event.key === 'ArrowUp') keys.up = value;
    if (value && (k === 'j' || k === 'f') && !event.repeat) { action(); return; }
    if (value && k === 'r') reset();
    if (value && event.key === 'Escape') paused = !paused;
  }

  addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(event.key)) event.preventDefault();
    if (event.key === 'Enter' && !event.repeat) { action(); return; }
    inputKey(event, 1);
  });
  addEventListener('keyup', event => {
    if (event.key !== 'Enter') inputKey(event, 0);
  });

  canvas.addEventListener('pointerdown', () => {
    if (phase === 'campaign' && currentCampaignAct().id === 'shooter') { action(); return; }
    if (nearAction || nearestHide()) action();
  });

  function preventTouch(event) {
    if (event.cancelable) event.preventDefault();
  }

  function bindActionButton(id, handler) {
    const el = document.getElementById(id);
    let lastFire = -1000;
    const fire = event => {
      preventTouch(event);
      const now = performance.now();
      if (now - lastFire < 120) return;
      lastFire = now;
      el.classList.add('pressed');
      handler();
    };
    const release = event => {
      preventTouch(event);
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerdown', fire);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('touchstart', fire, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('contextmenu', event => event.preventDefault());
  }

  bindActionButton('actionBtn', action);

  function bindHoldButton(id, key) {
    const el = document.getElementById(id);
    const down = event => { preventTouch(event); el.classList.add('pressed'); keys[key] = 1; };
    const up = event => { preventTouch(event); el.classList.remove('pressed'); keys[key] = 0; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('contextmenu', event => event.preventDefault());
  }
  bindHoldButton('hideBtn', 'crouch');
  bindHoldButton('jumpBtn', 'jump');

  const stick = document.getElementById('stick');
  const knob = stick.querySelector('.knob');
  let pointerId = null;

  function stickPoint(clientX, clientY) {
    const r = stick.getBoundingClientRect();
    const dx0 = clientX - (r.left + r.width / 2);
    const dy0 = clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx0, dy0);
    const max = Math.max(30, r.width * 0.34);
    const s = m > max ? max / m : 1;
    const dx = dx0 * s;
    const dy = dy0 * s;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / max;
    keys.left = nx < -0.16 ? 1 : 0;
    keys.right = nx > 0.16 ? 1 : 0;
    keys.run = Math.abs(nx) > 0.68 ? 1 : 0;
    keys.up = dy / max < -0.42 ? 1 : 0;
    keys.crouch = dy / max > 0.42 ? 1 : 0;
  }

  function stickEnd(event) {
    if (event) preventTouch(event);
    pointerId = null;
    knob.style.transform = '';
    keys.left = keys.right = keys.run = keys.up = keys.crouch = 0;
  }

  stick.addEventListener('pointerdown', event => {
    preventTouch(event);
    pointerId = event.pointerId;
    try { stick.setPointerCapture(pointerId); } catch (_) {}
    stickPoint(event.clientX, event.clientY);
  });
  stick.addEventListener('pointermove', event => {
    if (event.pointerId === pointerId) {
      preventTouch(event);
      stickPoint(event.clientX, event.clientY);
    }
  });
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  stick.addEventListener('lostpointercapture', stickEnd);

  stick.addEventListener('touchstart', event => {
    preventTouch(event);
    const touch = event.touches[0];
    if (touch) stickPoint(touch.clientX, touch.clientY);
  }, { passive: false });
  stick.addEventListener('touchmove', event => {
    preventTouch(event);
    const touch = event.touches[0];
    if (touch) stickPoint(touch.clientX, touch.clientY);
  }, { passive: false });
  stick.addEventListener('touchend', stickEnd, { passive: false });
  stick.addEventListener('touchcancel', stickEnd, { passive: false });

  window.__NEV = {
    getState: () => ({ phase, player: { ...player }, story: { ...story }, campaign: phase === 'campaign' ? { act: campaign.act, id: currentCampaignAct().id, step: campaign.step, x: campaign.x, y: campaign.y, grounded: campaign.grounded, climbIndex: campaign.climbIndex, bullets: campaign.bullets.length, shotsFired: campaign.shotsFired, shotVectors: campaign.shotVectors.map(v => ({ ...v })), enemies: campaign.enemies.map(e => ({ hp: e.hp, kind: e.kind })), completeT: campaign.completeT, hurtFlash: campaign.hurtFlash } : null, talkers: talkers.map(t => ({ ...t })), platforms: platforms.map(p => ({ x1: p.x1, x2: p.x2, top: p.top, moved: p.moved })), archSurfaces: archSurfaces.map(s => ({ ...s })), roofSurfaces: roofSurfaces.map(s => ({ ...s })), shownHints: [...shownHints], tutorialHint: tutorialHint ? { ...tutorialHint } : null, godMode: GOD_MODE, playerAlphaReady: Object.keys(playerImages).length === Object.keys(playerMaskMap).length, npcAlphaReady: true, rooftopReady: Boolean(rooftopImage), detailAssetsReady: Boolean(rooftopImage && phoneImage && caviarImage && campaignGameplayAtlas), fishSafe: inFishZone(player.x), roofZone: inRoofZone(player.x), storeSafe: inStoreZone(player.x), worldW: WORLD_W, evadeT, obstacleGraceT, won, lost, camX, hurtFlashT }),
    setPlayerX: x => { player.x = x; player.y = GROUND; player.vy = 0; player.onSurface = true; camX = clamp(x - 410, 0, WORLD_W - W); },
    setPlayerPose: (x, y = GROUND) => { player.x = x; player.y = y; player.vy = 0; player.onSurface = Math.abs(y - GROUND) < 2; camX = clamp(x - 410, 0, WORLD_W - W); },
    action,
    reset,
    toggleHide,
    jumpToCampaignAct: index => { phase = 'campaign'; campaign.started = true; setupCampaignAct(clamp(index | 0, 0, campaignActs.length - 1)); },
    setCampaignPose: (x, y = 620) => { campaign.x = x; campaign.y = y; campaign.vy = 0; campaign.grounded = true; },
    setInput: (name, value) => { if (name in keys) keys[name] = value ? 1 : 0; },
    stepCampaign: (seconds = .016) => updateCampaign(clamp(seconds, .001, .2)),
    stepGame: (seconds = .016) => update(clamp(seconds, .001, .033)),
    renderNow: () => render(),
    qaContact: (index = 0) => caughtBy(talkers[clamp(index | 0, 0, talkers.length - 1)])
  };

  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  async function preload() {
    const loadSceneImage = (src, label) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось загрузить ' + label));
      image.src = src;
    });

    // Railway transport: one compact atlas replaces dozens of standalone base PNGs.
    // Game logic, hitboxes, dimensions and V20.1 campaign content remain unchanged.
    const packedAtlas = await loadSceneImage('/resources/runtime/base-atlas.avif?v=2007', 'основной атлас высокого разрешения');
    // v2007 atlas is packed from original RGBA assets at source resolution.
    // No black-border flood fill: it damaged dark coat/hair edge pixels and is no longer needed.
    atlasImage = packedAtlas;

    const cropAtlas = name => {
      const r = atlasMap[name];
      const canvas = document.createElement('canvas');
      canvas.width = r[2];
      canvas.height = r[3];
      canvas.getContext('2d').drawImage(atlasImage, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      return canvas;
    };

    [campaignArt.courtyards, campaignArt.post, campaignArt.advert, campaignArt.embankment, campaignArt.christmas, campaignArt.shooter, campaignArt.pawnshop, campaignArt.cage, campaignArt.fight, campaignArt.chase] = await Promise.all([
      loadSceneImage('/resources/runtime/art-v1800/vertical-courtyards.webp?v=2007', 'вертикальные дворы'),
      loadSceneImage('/resources/runtime/art-v1800/post-office.webp?v=2007', 'почту Постумуса'),
      loadSceneImage('/resources/runtime/art-v1800/advert-star.webp?v=2007', 'рекламную звезду'),
      loadSceneImage('/resources/runtime/art-v1800/embankment-vo.webp?v=2007', 'набережную и Васильевский остров'),
      loadSceneImage('/resources/runtime/art-v1800/christmas-tram.webp?v=2007', 'рождественский город'),
      loadSceneImage('/resources/runtime/art-v1800/luggage-hall.webp?v=2007', 'чемоданный зал'),
      loadSceneImage('/resources/runtime/art-v1800/pawnshop.webp?v=2007', 'ломбард'),
      loadSceneImage('/resources/runtime/art-v1800/cage-hall.webp?v=2007', 'клетку'),
      loadSceneImage('/resources/runtime/art-v1800/boiler-fight.webp?v=2007', 'котельную'),
      loadSceneImage('/resources/runtime/art-v1800/final-chase.webp?v=2007', 'финальную погоню')
    ]);
    [campaignPlayerArt.straight, campaignPlayerArt.up, campaignPlayerArt.down] = await Promise.all([
      loadSceneImage('/resources/runtime/art-v1800/player/shoot-straight.webp?v=2007', 'позу стрельбы прямо'),
      loadSceneImage('/resources/runtime/art-v1800/player/shoot-up.webp?v=2007', 'позу стрельбы вверх'),
      loadSceneImage('/resources/runtime/art-v1800/player/shoot-crouch-down.webp?v=2007', 'позу стрельбы вниз')
    ]);
    campaignGameplayAtlas = await loadSceneImage('/resources/runtime/gameplay-atlas.png?v=2007', 'предметные игровые спрайты');
    campaignPostalClerkImage = await loadSceneImage('/resources/runtime/art-v2000/postal-clerk.webp?v=2007', 'сотрудницу почты');

    const playerNames = Object.keys(playerMaskMap);
    await Promise.all(playerNames.map(async name => {
      playerImages[name] = cropAtlas(name);
    }));

    rooftopImage = await loadSceneImage('/resources/runtime/rooftop-route.webp?v=2007', 'верхний маршрут');
    phoneImage = cropAtlas('room/cigarette.png');
    caviarImage = cropAtlas('world/newspaper.png');
    [tramStreetImage, courtyardArtImage, passageArtImage, fishSellerIdleImage, fishSellerTalkImage, fishStallArtImage, clerkHandoffImage, newsCounterImage, brodskyPhoneImage, brodskyCaviarImage, climbableArchImage] = await Promise.all([
      loadSceneImage('/resources/runtime/art-v1720/tram-street.webp?v=2007', 'трамвайную улицу'),
      loadSceneImage('/resources/runtime/art-v1720/courtyard.webp?v=2007', 'двор'),
      loadSceneImage('/resources/runtime/art-v1720/passage-courtyard.webp?v=2007', 'проходной двор'),
      loadSceneImage('/resources/runtime/art-v1720/fish-seller-idle.webp?v=2007', 'продавщицу рыбы'),
      loadSceneImage('/resources/runtime/art-v1720/fish-seller-talk.webp?v=2007', 'реплику продавщицы рыбы'),
      loadSceneImage('/resources/runtime/art-v1720/fish-stall.webp?v=2007', 'рыбный прилавок'),
      loadSceneImage('/resources/runtime/art-v1720/clerk-handoff.webp?v=2007', 'выдачу газеты'),
      loadSceneImage('/resources/runtime/art-v1720/news-counter.webp?v=2007', 'газетный прилавок'),
      loadSceneImage('/resources/runtime/art-v1720/brodsky-phone.webp?v=2007', 'позу с телефоном'),
      loadSceneImage('/resources/runtime/art-v1720/brodsky-caviar.webp?v=2007', 'позу с икрой'),
      loadSceneImage('/resources/runtime/art-v1720/climbable-arch.webp?v=2007', 'арку')
    ]);

    const entries = Object.values(A).flat();
    for (const asset of entries) {
      const r = atlasMap[asset.name];
      if (!r) throw new Error('Отсутствует изображение: ' + asset.name);
      asset.width = r[4];
      asset.height = r[5];
    }
    document.body.dataset.gameReady = 'true';
    stateEl.textContent = 'Комната';
    requestAnimationFrame(loop);
  }

  addEventListener('blur', () => {
    for (const key of Object.keys(keys)) keys[key] = 0;
  });
  preload().catch(error => {
    stateEl.textContent = error.message;
    document.body.dataset.gameReady = 'error';
    console.error(error);
  });
})();
