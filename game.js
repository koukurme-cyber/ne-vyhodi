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
  const touch = { left: false, right: false, run: false, fire: false, crouch: false };
  const actionButton = document.getElementById('action');
  const statusEl = document.getElementById('status');
  const assets = {};
  let ready = false;
  let godMode = false;
  function setGodMode(enabled) {
    godMode = Boolean(enabled);
    const button = document.getElementById('god-mode');
    button.textContent = godMode ? 'God: ВКЛ' : 'God: ВЫКЛ';
    button.setAttribute('aria-pressed', String(godMode));
  }
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

  let loadingBase = false;
  let gagPromise = null;
  let continuationPromise = null;
  let retryChapter = null;
  let selectionId = 0;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = null; img.onerror = null;
        img.src = '';
        reject(new Error('Не удалось дождаться рисунка: ' + src));
      }, 45000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('Не загрузился рисунок: ' + src)); };
      img.src = src;
    });
  }

  async function loadAssets() {
    if (loadingBase) return;
    loadingBase = true;
    try {
      const images = await Promise.all([
        loadImage('assets/approved-courtyard.webp'),
        loadImage('assets/approved-passage.webp'),
        loadImage('assets/street.webp'),
        loadImage('assets/approved-characters.webp'),
        loadImage('assets/new-npcs.webp'),
        loadImage('assets/street-mansion-transition-v2.webp'),
        loadImage('assets/brodsky-phone-v1.png')

      ]);
      assets.phoneFrames = trimFrames(images[6],4,1);
      assets.newCharacters = images[4];
      assets.deadMansion = images[5];
      assets.backgrounds = images.slice(0, 3);
      assets.characters = images[3];
      // Trim transparent atlas padding once; keep all poses at the same scale.
      assets.frames = [];
      const cellW = assets.characters.width / 3;
      const cellH = assets.characters.height / 2;
      for (let row = 0; row < 4; row++) {
        const atlas = row < 2 ? assets.characters : assets.newCharacters;
        const atlasRow = row % 2;
        const cellW = atlas.width / 3;
        const cellH = atlas.height / 2;
        const frames = [];
        for (let col = 0; col < 3; col++) {
          const scratch = document.createElement('canvas');
          scratch.width = Math.round(cellW);
          scratch.height = Math.round(cellH);
          const c = scratch.getContext('2d', { willReadFrequently: true });
          c.drawImage(atlas, col * cellW, atlasRow * cellH, cellW, cellH, 0, 0, scratch.width, scratch.height);
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
      await loadGagAssets();
      ready = true;
      reset();
      if (pendingLevel !== null) { const index = pendingLevel; pendingLevel = null; await selectLevel(index); }
    } catch (error) {
      screenTitle.textContent = 'ДВОР НЕ ЗАГРУЗИЛСЯ';
      screenText.textContent = 'Не удалось открыть игру. Нажмите «Повторить».';
      restartButton.textContent = 'Повторить';
      screenEl.hidden = false;
      console.error('Asset loading failed:', error.message);
    } finally {
      loadingBase = false;
    }
  }

  function trimFrames(image, columns, rows, boundaries,rowBoundaries,threshold=32) {
    const cw = image.width / columns, ch = image.height / rows;
    return Array.from({length: columns * rows}, (_, index) => {
      const cell = document.createElement('canvas');
      const bounds=boundaries && (Array.isArray(boundaries[0]) ? boundaries[Math.floor(index/columns)] : boundaries),bi=bounds?.length===columns+1 ? index%columns : index;
      const sx = bounds ? Math.round(bounds[bi] * image.width) : index % columns * cw;
      const sw = bounds ? Math.round(bounds[bi + 1] * image.width) - sx : cw;
      const sy=rowBoundaries ? Math.round(rowBoundaries[Math.floor(index/columns)]*image.height) : Math.floor(index/columns)*ch;
      const sh=rowBoundaries ? Math.round(rowBoundaries[Math.floor(index/columns)+1]*image.height)-sy : ch;
      cell.width = Math.round(sw); cell.height = Math.round(sh);
      const c = cell.getContext('2d', {willReadFrequently: true});
      c.drawImage(image, sx, sy, sw, sh, 0, 0, cell.width, cell.height);
      const pixels = c.getImageData(0, 0, cell.width, cell.height).data;
      let left=cell.width, right=0, top=cell.height, bottom=0;
      for(let y=0;y<cell.height;y++) for(let x=0;x<cell.width;x++) if(pixels[(y*cell.width+x)*4+3]>threshold) {
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      return {image:cell,left,top,width:right-left+1,height:bottom-top+1};
    });
  }

  async function loadGagAssets() {
    const [bus, pilgrims, inspectors, actors, lore, extra, dance, postProps, coverProps, carry, queue, routeProps, danceGates, niche, switchProp, crouchGun, letter] = await Promise.all([
      loadImage('assets/electrobus-real-v5.webp'),
      loadImage('assets/pilgrim-walk-v4.webp'),
      loadImage('assets/cast-v3.webp'),loadImage('assets/npc-actions-v1.webp'),loadImage('assets/lore-gags-v1.webp?v=20261009-repaired'),loadImage('assets/extra-gags-v1.webp'),loadImage('assets/queue-dance-v1.webp'),loadImage('assets/postal-props-v1.png'),loadImage('assets/street-cover-v1.png'),loadImage('assets/brodsky-carry-v1.png'),loadImage('assets/postal-queue-v1.png'),loadImage('assets/route-props-v1.png'),loadImage('assets/dance-gates-v1.png'),loadImage('assets/door-niche-v1.png'),loadImage('assets/garden-switch-v1.png'),loadImage('assets/brodsky-crouch-gun-v1.png'),loadImage('assets/letter-v1.png')
    ]);
    assets.letterFrame=trimFrames(letter,1,1,null,null,140)[0];assets.crouchGunFrame=trimFrames(crouchGun,1,1,null,null,140)[0];assets.switchFrame=trimFrames(switchProp,1,1,null,null,140)[0];assets.danceGateFrames=trimFrames(danceGates,2,2,null,[0,.455,1],140);assets.nicheFrame=trimFrames(niche,1,1,null,null,140)[0];
    assets.postProps=trimFrames(postProps,2,2,[0,.485,1],[0,.57,1],140);assets.coverProps=trimFrames(coverProps,2,2,[0,.445,1],[0,.67,1],140);assets.carryFrames=trimFrames(carry,4,2,null,null,140);assets.queueFrames=trimFrames(queue,4,3,null,[0,.328,.656,1],140);assets.routeProps=trimFrames(routeProps,2,2,[[0,.5,1],[0,.6,1]],null,140);
    assets.busFrame = trimFrames(bus, 1, 1)[0];
    assets.pilgrimFrames = trimFrames(pilgrims, 3, 2);
    assets.inspectorFrame = trimFrames(inspectors,3,3)[8];
    const actorFrames=trimFrames(actors,4,4,null,[0,.28,.49,.74,1]);
    assets.actionFrames={cashier:actorFrames.slice(0,4),postal:actorFrames.slice(4,8),fish:actorFrames.slice(8,12),beast:actorFrames.slice(12,16)};
    assets.loreFrames=trimFrames(lore,4,4,null,[0,.26,.5,.76,1]);
    const extraFrames=trimFrames(extra,3,2);assets.loreFrames.push(extraFrames[2],extraFrames[3]);assets.actionFrames.drunk=extraFrames.slice(4,6);assets.actionFrames.caesar=extraFrames.slice(0,2);assets.actionFrames.courier=assets.loreFrames.slice(8,10);assets.actionFrames.somna=assets.loreFrames.slice(10,12);
    const dancers=trimFrames(dance,3,3,null,[0,.31,.62,1]);assets.actionFrames.danceClerk=dancers.slice(0,3);assets.actionFrames.dancePostal=dancers.slice(3,6);assets.actionFrames.danceBeard=dancers.slice(6,9);assets.gagReady = true;
  }

  const sceneFiles = {embankment:'embankment-walkway-v2.webp',market:'market-v3.webp',office:'post-hall-clear-v1.webp',pawnshop:'pawnshop-v3.webp',garden:'garden-winter-v1.png',night:'night-v3.webp',room:'room-v3.webp',tram:'tram-v5.webp',cage:'cage-v3.webp',store:'pyaterochka-v6.webp'};
  function hasSceneAssets(index) {
    const level=levels[index];
    return !!(assets.castReady && assets.scenes?.[level.background] &&
      (!level.cast?.some(p=>p.sprite===5) || (assets.rurikFrames && assets.caviarFrame && assets.fishStallFrame)) && (!level.movingTram || assets.tramFrame) && (!level.furniture || (assets.crouchFrames && assets.storeEntrance && assets.bridgeChair)) && (level.rhythm!=='post' || (assets.postPit && assets.postFlatbed && assets.postParking)) && (!['home','ending'].includes(level.rhythm) || (assets.homeEntry && assets.homeEntryClosed && assets.homeStreet)));
  }
  async function loadContinuation(index) {
    const level=levels[index];
    const images=await Promise.all([
      assets.castReady ? null : loadImage('assets/cast-v3.webp'),
      assets.scenes?.[level.background] ? null : loadImage('assets/'+sceneFiles[level.background]),
      level.cast?.some(p=>p.sprite===5) && !assets.rurikFrames ? loadImage('assets/rurik-v6.webp') : null,
      level.movingTram && !assets.tramFrame ? loadImage('assets/modern-tram-v6.webp') : null,
      level.stops?.some(stop=>stop.fishGag) && !assets.caviarFrame ? loadImage('assets/brodsky-caviar.webp') : null,
      level.stops?.some(stop=>stop.fishGag) && !assets.fishStallFrame ? loadImage('assets/fish-stall.webp') : null,
      null,
      (level.furniture || level.platforming || level.mode==='shooter') && !assets.crouchFrames ? loadImage('assets/brodsky-crouch-v1.png') : null,
      level.furniture && !assets.storeEntrance ? loadImage('assets/street-store-pit-v4.webp') : null,
      level.furniture && !assets.bridgeChair ? loadImage('assets/free-chair-v1.png') : null,
      ['home','ending'].includes(level.rhythm) && !assets.homeEntry ? loadImage('assets/home-entry-v1.webp') : null,
      ['home','ending'].includes(level.rhythm) && !assets.homeEntryClosed ? loadImage('assets/home-entry-closed-v1.webp') : null,
      ['home','ending'].includes(level.rhythm) && !assets.homeStreet ? loadImage('assets/home-street-v2.webp') : null,
      level.rhythm==='post' && !assets.postPit ? loadImage('assets/post-crisis-pit-v1.webp') : null,
      level.rhythm==='post' && !assets.postFlatbed ? loadImage('assets/post-flatbed-blue-v2.webp') : null,
      level.rhythm==='post' && !assets.postParking ? loadImage('assets/post-parking-v1.webp') : null
    ]);
    if(images[13])assets.postPit=images[13];if(images[14])assets.postFlatbed=images[14];if(images[15])assets.postParking=images[15];
    if(images[10])assets.homeEntry=images[10];if(images[11])assets.homeEntryClosed=images[11];if(images[12])assets.homeStreet=images[12];
    assets.scenes ||= {};
    if(images[1]) assets.scenes[level.background]=images[1];
    if(images[6]) assets.scenes.store=images[6];
    if(images[8]) assets.storeEntrance=images[8];
    if(images[9]) assets.bridgeChair=trimFrames(images[9],1,1)[0];
    if(images[7]) assets.crouchFrames=trimFrames(images[7],3,1,[0,.27,.66,1]);
    if(images[2]) assets.rurikFrames=trimFrames(images[2],3,2);
    if(images[3]) assets.tramFrame=trimFrames(images[3],1,1)[0];
    if(images[4]) assets.caviarFrame=trimFrames(images[4],1,1)[0];
    if(images[5]) assets.fishStallFrame=trimFrames(images[5],1,1)[0];
    if(images[0] && !assets.castReady) {
      const cast = images[0], castW = cast.width / 3, castH = cast.height / 3;
      for (let index = 0; index < 9; index++) {
        const scratch = document.createElement('canvas');
        scratch.width = Math.round(castW); scratch.height = Math.round(castH);
        const c = scratch.getContext('2d', { willReadFrequently: true });
        c.drawImage(cast, index % 3 * castW, Math.floor(index / 3) * castH, castW, castH, 0, 0, scratch.width, scratch.height);
        const pixels = c.getImageData(0, 0, scratch.width, scratch.height).data;
        let left = scratch.width, right = 0, top = scratch.height, bottom = 0;
        for (let y = 0; y < scratch.height; y++) for (let x = 0; x < scratch.width; x++) {
          if (pixels[(y * scratch.width + x) * 4 + 3] > 32) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
        const f = { image: scratch, left, top, width: right - left + 1, height: bottom - top + 1 };
        if (index < 3) { if (!assets.frames[4]) assets.frames[4] = []; assets.frames[4].push(f); }
        else assets.frames[index + 2] = [f, f, f];
      }
      assets.castReady=true;
    }
  }

  const neighborLine = 'Иосиф Александрович, я тут стих написала';
  const levels = [
    {
      name: 'Двор', width: 960, exit: 914,
      objective: 'Пройдите к арке. Соседка хочет прочесть свой стих.',
      ending: 'Из двора. Это было опрометчиво.',
      hides: [{ x: 278, w: 70, label: 'тёмный подъезд' }, { x: 623, w: 80, label: 'ниша у арки' }],
      enemies: [{ x: 548, dir: 1, min: 446, max: 760, speed: 54, name: 'Соседка', sprite: 1 }]
    },
    {
      name: 'Проходной двор', width: 1280, exit: 1234,
      objective: 'Дворник идёт навстречу. Пропустите его в тёмном подъезде.',
      ending: 'Ещё один двор. У людей по-прежнему есть что сказать.',
      hides: [{ x: 256, w: 80, label: 'тёмный подъезд' }, { x: 627, w: 90, label: 'дверь мастерской' }, { x: 960, w: 85, label: 'ниша у прохода' }],
      enemies: [{ x: 790, dir: -1, min: 160, max: 1120, speed: 62, name:'Пьяница',sprite:2,line:'Только один вопрос!',motion:'drunk' }]
    },
    {
      name: 'Улица', width: 1600, exit: 1534,
      objective: 'Инспектор сосулек и соседка. Дождитесь просвета и уходите к дальнему подъезду.',
      ending: 'Вы добрались. Сегодня вас никто не прочёл.',
      hides: [{ x: 240, w: 96, label: 'подъезд' }, { x: 672, w: 112, label: 'боковая дверь' }, { x: 1056, w: 112, label: 'тёмная ниша' }],
      enemies: [
        { x: 580, dir: -1, min: 120, max: 790, speed: 64, name: 'Инспектор сосулек', sprite: 10, inspector: true, line: 'Гражданин, ваша сосулька не зарегистрирована!' },
        { x: 1460, dir: 1, min: 500, max: 1510, speed: 54, name:'Сомнамбула',sprite:1,line:'Иосиф Александрович…',motion:'somna' }
      ]
    }
  ];
  const openingOffsets = [0, 960, 2240];
  const openingWidths = [960, 1280, 1600];
  levels.slice(0, 3).forEach((level, index) => {
    const offset = openingOffsets[index];
    level.exit += offset;
    level.width = 3840;
    level.hides = level.hides.map(spot => ({ ...spot, x: spot.x + offset }));
    level.enemies = level.enemies.map(enemy => ({ ...enemy, section: index,
      x: enemy.x + offset, min: enemy.min + offset, max: enemy.max + offset }));
  });
  // New chapters use the same 960x540 scene, y=421 ground and chase engine.
  const stop = (x, label, text, extra = {}) => ({ x, label, text, ...extra });
  const chapter = (name, background, stops, extra = {}) => ({
    name, background, width: 1600, exit: 1534, hides: [], enemies: [],
    mode: 'story', objective: stops[0]?.label || 'Пройдите к выходу.',
    ending: stops.at(-1)?.text || 'Можно идти дальше.', stops, ...extra
  });
  levels.push(
    chapter('Это электробус', 'bus', [], {
      mode: 'gag', width: 960, exit: 914, objective: 'Не вызывай мотора.', ending: 'Это электробус.',
      cast: [{ x: 240, sprite: 6 }, { x: 325, sprite: 6 }, { x: 410, sprite: 6 }]
    }),
    chapter('Рюрик', 'market', [
      stop(1600, 'Спросить Рюрика', '— Спрашивай. — Что спросить с тебя, Рюрик?', { optional: true }),
      stop(2180, '', 'Рыба есть.', { automatic: true, fishGag: true, parts: ['Рыба есть.', 'Зачем нам рыба, раз есть икра.'], speakers: ['Продавец рыбы', 'Бродский'] })
    ], { width: 2800, exit: 2734, cast: [{ x: 1670, sprite: 5 }, { x: 2260, sprite: 3 }],
      objective: 'Пропустите инспектора в тёмном проходе и пройдите дальше по рынку.',
      hides: [{ x: 300, w: 90, label: 'тёмный проход' }, { x: 750, w: 95, label: 'дверь лавки' }, { x: 1200, w: 90, label: 'ниша' }],
      enemies: [{ x: 620, dir: -1, min: 420, max: 1150, speed: 54, sprite: 10, inspector: true, name: 'Инспектор сосулек', line: 'Сосулька без прописки! Кто за неё отвечает?' }] }),
    chapter('Почта', 'office', [
      stop(530, 'Отправить книги', '', {parts:['Хочу отправить книги.', 'Получатель?', 'Постум.', 'Обратный адрес?', 'Ниоткуда.'], speakers:['Бродский','Сотрудница почты','Бродский','Сотрудница почты','Бродский']}),
      stop(1040, 'Упаковать книги', 'Книги упакованы. Вернитесь к окну и поставьте три оттиска.', {silentAction:true,item:'books'}),
      ...[0,1,2].map(i=>stop(530, 'Поставить оттиск '+(i+1)+'/3', '', {postalTiming:true,timing:true,period:2.4-i*.45,silentAction:true,remove:i===2?'books':null}))
    ], { cast: [{ x: 625, sprite: 7, behindCounter: true,motion:'postal' }], objective: 'Отправьте книги Постуму: поговорите, упакуйте и поставьте три оттиска.' }),
    chapter('Сад', 'garden', [
      stop(310, 'Выключить первую секцию рекламы', '', {silentAction:true,star:true}),
      stop(780, 'Выключить вторую секцию рекламы', '', {silentAction:true,star:true}),
      stop(1250, 'Выключить третью секцию рекламы', '', {silentAction:true,star:true}),
      stop(310, 'Вернуться к Постуму', '', {silentAction:true})
    ], {requiredStory:true,cast:[{x:310,sprite:10,role:'postum',motion:'danceClerk'}], objective:'Реклама закрыла звёзды. Выключите три секции и вернитесь к Постуму.'}),
    chapter('Джон Донн', 'garden', [], {donne:true,
      movingTram:true,width:2400,exit:2334,objective:'Не будите спящего. Переходите пути, когда поднимется шлагбаум.'}),
    chapter('Васильевский остров', 'embankment', [
      stop(600, 'Подойти к служащему', '', {parts:['Цель визита на В.О.?','Умирать.','Вы первично или повторно?'],speakers:['Служащий','Бродский','Служащий']})
    ], {cast:[{x:750,sprite:10,role:'official'}]}),
    chapter('Синий фасад', 'night', [
      stop(800, 'Посмотреть на фасад', '— Он был синий? — По документам — синий.', { speakers: ['Бродский', 'Служащий'], parts: ['Он был синий?', 'По документам — синий.'] })
    ], { cast: [{ x: 930, sprite: 10 }], objective: 'Пройдите к выходу, избегая дворника. Используйте подъезды и ниши.', hides: [{ x: 260, w: 90, label: 'подъезд' }, { x: 650, w: 95, label: 'тёмная дверь' }, { x: 1140, w: 90, label: 'ниша' }],
      enemies: [{ x: 740, dir: -1, min: 420, max: 1430, speed: 58, sprite: 2, name: 'Дворник', line: 'Здесь не стойте. Сейчас снег с крыши пойдёт.' }] }),
    chapter('Пост сдал', 'cage', [
      stop(350,'Подойти к клетке','Пост сдал.',{parts:['Пост сдал.'],speakers:['Дикий зверь'],actor:'beast'}),
      stop(350,'Занять смену','',{silentAction:true}),
      stop(350,'Подождать зверя','Кружку забыл.',{parts:['Кружку забыл.'],speakers:['Дикий зверь'],actor:'beast'}),
      stop(800,'Принять заказ','',{parts:['Заказ для дикого зверя.','Смена закончилась.'],speakers:['Курьер','Бродский'],actor:'courier'}),
      stop(800,'Взять заказ','',{silentAction:true,item:'delivery'})
    ],{requiredStory:true,beastShift:true,cast:[{x:455,sprite:8,role:'beast',motion:'beast'},{x:1100,sprite:10,role:'courier',motion:'courier'}],objective:'Зверь сдаёт пост. Займите его место в клетке.'}),
    chapter('Ломбард','pawnshop',[
      stop(450,'Обменять пистолет','',{parts:['Что хотите получить?','Патефон.'],speakers:['Приёмщик','Бродский']}),
      stop(450,'Забрать патефон','',{silentAction:true,item:'gramophone',remove:'gun'})
    ],{requiredStory:true,exchange:true,cast:[{x:560,sprite:10}],objective:'Обменяйте пистолет на патефон.'}),
    chapter('Переулок', 'night', [stop(120,'Достать пистолет из чемодана','',{silentAction:true,item:'gun'})], { mode: 'shooter', waves: 4, objective: 'Достаньте пистолет из чемодана. Квитанции наступают: пробел — огонь, R — перезарядка.',
      ending: 'Арка открылась. Можно убрать пистолет.', hides: [{ x: 250, w: 90, label: 'подъезд' }, { x: 700, w: 90, label: 'ниша' }, { x: 1160, w: 90, label: 'подъезд' }] }),
    chapter('Граммофон','pawnshop',[
      stop(800,'Завести патефон','',{silentAction:true}),
      ...[0,1,2].map(()=>stop(800,'Попасть в такт','',{timing:true,silentAction:true})),
      stop(800,'Остановить пластинку','',{silentAction:true})
    ],{requiredStory:true,dancingQueue:true,cast:[{x:930,sprite:10,motion:'danceClerk'},{x:1080,sprite:7,motion:'dancePostal'},{x:1230,sprite:5,motion:'danceBeard'}],objective:'Очередь танцует, оставаясь на местах. Попадите в такт патефону.'}),
    chapter('Цезарь','garden',[
      stop(500,'Заказать салат «Цезарь»','',{silentAction:true}),
      stop(500,'Забрать салат','',{silentAction:true,item:'salad'})
    ],{requiredStory:true,caesarSalad:true,cast:[{x:610,sprite:9,role:'caesar',motion:'caesar'}],objective:'Купите салат у Цезаря.'}),
    chapter('Хлеб без корки','room',[
      stop(770,'Доесть хлеб','',{silentAction:true}),
      stop(770,'Доесть последний кусок','',{silentAction:true}),
      stop(240,'Взять письмо','',{silentAction:true,item:'letter'})
    ],{requiredStory:true,breadGag:true,objective:'Доешьте хлеб. Ни одной корки не остаётся.'}),
    chapter('Ночная улица', 'night', [], { mode: 'shooter', waves: 5, crossfire: true,
      objective: 'Огонь с двух сторон. Меняйте направление и перезаряжайтесь в укрытии.', ending: 'Последняя улица осталась позади.',
      hides: [{ x: 280, w: 90, label: 'подъезд' }, { x: 700, w: 90, label: 'дверь' }, { x: 1150, w: 90, label: 'арка' }] }),
    { name: 'Последний двор', width: 1600, exit: 1534, background: 'night', objective: 'Дом уже близко. Пройдите двор, пользуясь укрытиями.',
      ending: 'Вы вернулись к своей двери.', hides: [{ x: 240, w: 96, label: 'подъезд' }, { x: 672, w: 112, label: 'дверь' }, { x: 1056, w: 112, label: 'ниша' }],
      enemies: [{ x: 580, dir: -1, min: 120, max: 790, speed: 64, name: 'Соседка', sprite: 1, line: 'Молодой человек, придержите дверь!' },
        { x: 1460, dir: 1, min: 500, max: 1510, speed: 54, name: 'Дворник', sprite: 2, line: 'Ключи у вас? А то я запираю.' }] },
    chapter('Пятёрочка', 'store', [
      stop(450, '', 'Пакет нужен? Для бессмертия — покрепче.', { automatic: true }),
      stop(1140, '', 'Зачем нам рыба, раз есть икра. По акции.', { automatic: true })
    ], { objective: 'Пройдите мимо касс. Охранник хочет проверить чек.',
      cast: [{x: 490, sprite: 7}], hides: [{x: 350,w:95,label:'стеллаж'}, {x:850,w:95,label:'полки'}],
      enemies: [{x:1100,dir:-1,min:650,max:1480,speed:58,sprite:2,name:'Охранник',line:'Гражданин, чек на бессмертие покажите.'}] }),
    chapter('Не выходи', 'room', [
      stop(770, 'Положить письмо в карман', 'Письмо остаётся у вас.'),
      stop(240, 'Закрыть дверь', 'НИЧЕГО НЕ ПРОИЗОШЛО.')
    ], { width: 960, exit: 914, ending: 'НИЧЕГО НЕ ПРОИЗОШЛО.\nВы дома.' })
  );

  levels.splice(3,1);
  levels.slice(0,3).forEach(level=>{level.width=4800;});
  Object.assign(levels[2], {ghosts:true,exit:4734, openingGag:true, cast:[{x:3770,sprite:6},{x:3685,sprite:6},{x:3600,sprite:6}]});

  // One continuous outing: chase, Rurik, jumps, fish, ducking, shop, climbing.
  const furnitureLevel = levels.find(level => level.name === 'Рюрик');
  Object.assign(furnitureLevel, {
    chairBridge: {start:5140,end:5670,period:14,readyFrom:3,readyUntil:8.5},
    furniture: true, width: 5800, exit: 5770,
    objective: 'Уходите от разговора. ↑ / пробел — прыжок, ↓ — пригнуться. Дайте волю мебели.',
    ending: 'Рынок, мебель и «Пятёрочка» остались позади.',
    stops: [
      stop(1600, 'Спросить Рюрика', '— Спрашивай. — Что спросить с тебя, Рюрик?', {optional:true}),
      stop(2370, '', 'Рыба есть.', {automatic:true, fishGag:true, parts:['Рыба есть.','Зачем нам рыба, раз есть икра.'], speakers:['Продавец рыбы','Бродский']}),
      stop(4120, '', 'Пакет нужен?', {automatic:true, anchor:'shop', speakers:['Кассир']}),
      stop(5740, '', 'Да, да уж, дай волю мебели.', {automatic:true})
    ],
    cast: [{x:1670,sprite:5},{x:2450,sprite:3,motion:'fish'},{x:4200,sprite:7,motion:'cashier'}],
    furnitureObjects: [
      {x:1810,w:62,h:65,type:'stool',travel:24,pace:1.2,phase:.4}, {x:2030,w:74,h:82,type:'stool',travel:30,pace:1.4,phase:2},
      {x:2750,w:245,h:130,type:'table',bottom:103,travel:28,pace:.9,phase:1},
      {x:3190,w:66,h:122,type:'chair',travel:36},
      {x:4430,w:80,h:48,type:'drawer',travel:18,pace:1.1,phase:.8}, {x:4510,w:80,h:96,type:'drawer',travel:18,pace:1.1,phase:.8},
      {x:4590,w:80,h:144,type:'drawer',travel:18,pace:1.1,phase:.8}, {x:4670,w:155,h:192,type:'wardrobe',travel:18,pace:1.1,phase:.8},
      {x:5070,w:78,h:80,type:'bridge-chair',travel:8,pace:.8}
    ]
  });
  levels.splice(levels.findIndex(level=>level.name==='Пятёрочка'),1);

  // Short crossings keep the literary interludes playable.
  const crossings = {
    'Сад': { kind: 'water', points: [480, 960, 1400], hint: 'Пробегайте между струями. Выключите три секции рекламы и вернитесь к Постуму.' },
    'Джон Донн': {kind:'tram',points:[800,1390,1960],hint:'Не будите спящего. Трамвай гремит — Донн продолжает спать. Переходите на зелёный.'},
    'Васильевский остров': { kind: 'wave', points: [330, 900, 1330], hint: 'ИБ возвращается на Васильевский остров — умирать. Но здесь даже это оформляют у служащего. Пройдите к нему между волнами.' }
  };
  for (const level of levels) if (crossings[level.name]) {
    const crossing = crossings[level.name];
    level.crossings = crossing.points.map((x, i) => ({ x, width: 110, phase: i * 1.3, kind: crossing.kind }));
    level.objective = crossing.hint;
  }

  configureRhythmRoute();

  // Gags remain optional; this outing alternates different obstacles.
  levels.forEach(level => {
    level.cast?.forEach(person => { if (person.sprite === 10 && !person.motion) person.motion = 'danceClerk'; });
    const stops = level.stops || [];
    level.mechanic = level.mode === 'shooter' ? 'Перестрелка'
      : level.enemies.length ? 'Уход от преследования'
      : stops.some(stop => stop.timing) ? 'Попадание в ритм'
      : stops.some(stop => stop.escort) ? 'Пропустить спутника'
      : stops.some(stop => stop.item || stop.remove) ? 'Перенос предмета'
      : 'Прогулка и разговоры';
    // A chase cannot acquire a second interaction puzzle.
    if (level.enemies.length && !level.rhythm) stops.filter(stop => !stop.optional).forEach(stop => { stop.automatic = true; stop.label = ''; });
    // Looking at successive stars is an observation, not a repeated button task.

  });

  function showDialogue(text, step) {
    const level = levels[levelIndex];
    world.ambientComic=null;world.npcs.forEach(n=>{n.speechTimer=0;});
    const speakers = { 'Рюрик': 'Рюрик', 'Почта': 'Сотрудница почты',
      'Васильевский остров': 'Служащий', 'Синий фасад': 'Служащий',
      'Пост сдал': 'Дикий зверь', 'Ломбард': 'Приёмщик', 'Цезарь': 'Цезарь' };
    const partner = step?.speakers?.find(speaker => speaker !== 'Бродский') || speakers[level.name];
    if (partner && world.cast[0]) {
      const actor = world.cast.find(person => person.role === step?.actor) || world.cast[0], player = world.player;
      if (!actor.behindCounter && Math.abs(player.x-actor.x)<110) player.x=actor.x+(player.x<=actor.x ? -110 : 110);
      player.facing = actor.x >= player.x ? 1 : -1;
      actor.dir = player.x >= actor.x ? 1 : -1;
    }
    const parts = step?.parts || text.split(/\s*—\s*/).filter(Boolean);
    const lines = parts.length > 1 ? parts.map((line, index) => ({ speaker: step?.speakers?.[index] || (index % 2 ? 'Бродский' : partner || 'Бродский'), text: line }))
      : [{ speaker: step?.speakers?.[0] || (step?.actor ? partner : null) || 'Бродский', text: parts[0] || text }];
    world.dialogue = { title: partner ? 'Разговор: ' + partner : 'Разговор', actor:step?.actor, lines, isComic: true, panel: 0 };
    document.getElementById('dialogue').classList.toggle('comic-dialogue', world.dialogue.isComic);
    renderDialogueLines();
    document.getElementById('dialogue-title').textContent = world.dialogue.title;
    document.getElementById('dialogue').hidden = false;
    world.state = 'dialogue'; clearInput();
  }

  function renderDialogueLines() {
    const dialogue = world.dialogue;
    const container = document.getElementById('dialogue-lines');
    container.replaceChildren();
    const visibleLines = dialogue.isComic ? [dialogue.lines[dialogue.panel]] : dialogue.lines;
    visibleLines.forEach(line => {
      const row = document.createElement('p'), name = document.createElement('strong'), words = document.createElement('span');
      name.textContent = line.speaker; words.textContent = line.text;
      row.appendChild(name); row.appendChild(words); container.appendChild(row);
    });
    document.getElementById('dialogue-next').textContent = dialogue.isComic && dialogue.panel < dialogue.lines.length - 1 ? 'Дальше →' : 'Продолжить';
    if (dialogue.isComic) {
      actionButton.disabled = false;
      actionButton.textContent = document.getElementById('dialogue-next').textContent;
      setPrompt('');
    }
  }

  function advanceDialogue() {
    if (!world.dialogue) return;
    if (world.dialogue.isComic && world.dialogue.panel < world.dialogue.lines.length - 1) {
      world.dialogue.panel++; renderDialogueLines();
    } else closeDialogue();
  }

  function closeDialogue() {
    if (!world.dialogue) return;
    document.getElementById('dialogue').hidden = true;
    world.dialogue = null; world.state = 'play'; clearInput();
    updateChapterUi();
  }

  const walkthrough = { active: false, pending: false, elapsed: 0, chapterTime: 0, results: [] };
  function toggleAutoplay() {
    if (walkthrough.active) {
      walkthrough.active = false; clearInput();
      document.getElementById('walkthrough-status').textContent = 'Проверка остановлена';
      document.getElementById('autoplay').textContent = 'Автопроход'; return;
    }
    walkthrough.active = true; walkthrough.pending = false;
    walkthrough.elapsed = 0; walkthrough.chapterTime = 0; walkthrough.results = [];
    document.getElementById('walkthrough-status').textContent = 'Проверка 1 / ' + levels.length;
    document.getElementById('autoplay').textContent = 'Остановить'; selectLevel(0);
  }

  function driveWalkthrough(dt) {
    if (!walkthrough.active || !ready || walkthrough.pending || world.state === 'loading') return;
    walkthrough.elapsed += dt; walkthrough.chapterTime += dt;
    if (walkthrough.chapterTime > 180) {
      walkthrough.active = false; clearInput();
      document.getElementById('walkthrough-status').textContent = 'Остановлено: глава ' + (levelIndex + 1) + ' не завершилась за 3 минуты';
      document.getElementById('autoplay').textContent = 'Автопроход'; return;
    }
    if (world.dialogue) {
      if (walkthrough.dialogue !== world.dialogue || walkthrough.panel !== world.dialogue.panel) {
        walkthrough.dialogue = world.dialogue; walkthrough.panel = world.dialogue.panel; walkthrough.readTime = 0;
      }
      walkthrough.readTime += dt;
      if (walkthrough.readTime >= 2.5) advanceDialogue();
      return;
    }
    if (world.state === 'won') {
      if (walkthrough.finishedQuest !== world.quest) { walkthrough.finishedQuest=world.quest;walkthrough.finishTime=0; }
      walkthrough.finishTime+=dt;
      walkthrough.results.push({ chapter: levelIndex + 1, name: levels[levelIndex].name, seconds: Math.round(walkthrough.chapterTime) });
      walkthrough.chapterTime = 0;
      if (levelIndex === levels.length - 1) {
        walkthrough.active = false; clearInput();
        document.getElementById('walkthrough-status').textContent = 'Пройдено ' + levels.length + ' / ' + levels.length + ' · ' + Math.round(walkthrough.elapsed) + ' игровых секунд';
        document.getElementById('autoplay').textContent = 'Автопроход'; return;
      }
      document.getElementById('walkthrough-status').textContent = 'Проверка ' + (levelIndex + 2) + ' / ' + levels.length;
      walkthrough.pending = true;
      selectLevel(levelIndex + 1,true).finally(() => { walkthrough.pending = false; }); return;
    }
    if (world.state === 'lost') { walkthrough.active = false; clearInput(); document.getElementById('walkthrough-status').textContent = 'Проигрыш без God: глава ' + (levelIndex + 1); document.getElementById('autoplay').textContent = 'Автопроход'; return; }
    if (world.state !== 'play') return;
    const level = levels[levelIndex], p = world.player, step = currentStep();
    touch.left = false; touch.right = false; touch.run = false; touch.fire = false; touch.crouch=false;
    if(level.rhythm==='post'){drivePost();return;}
    if ((level.openingGag && p.x >= 3800 && world.quest.gagPhase !== 'done') || world.ambientComic) return;
    if (!godMode && level.enemies.length && (!level.furniture || p.x<1380) && !(step?.optional && p.x >= step.x - 100)) {
      const danger = n => n.state !== 'patrol' || (n.x > p.x && n.dir < 0 && n.x - p.x < 460);
      if (p.hidden) {
        const safe = world.npcs.every(n => Math.abs(n.x - p.x) > 80 && n.state === 'patrol' &&
          !(n.x > p.x && n.dir < 0 && n.x - p.x < 460));
        if (safe) action();
        return;
      }
      const spot = nearHideSpot();
      if (spot && world.npcs.some(n => Math.abs(n.x - p.x) < 460 && danger(n))) { action(); return; }
      touch.right = true; touch.run = true;
      return;
    }
    const destination = step ? step.x : level.exit + 15;
    const direction = Math.sign(destination - p.x);
    const nextCrossing = level.crossings?.find(c => direction > 0
      ? p.x < c.x - 22 && destination > c.x - 22 && c.x - p.x < 85
      : p.x > c.x + c.width + 22 && destination < c.x + c.width + 22 && p.x - c.x - c.width < 85);
    if (nextCrossing && !crossingSafe(nextCrossing, world.time, 1.3)) return;
    if (!step && level.movingTram && world.quest.tramX < level.width + 50) return;
    let targetX = step ? step.x : level.exit + 15;
    if (level.mode === 'shooter' && !step && !isComplete()) {
      const target = world.targets[0];
      if (target) {
        p.facing = target.x >= p.x ? 1 : -1;world.quest.aimUp=target.billType===2;
        if(target.billType===2 && Math.abs(target.x-p.x)>150){touch.right=target.x>p.x;touch.left=target.x<p.x;touch.run=true;return;}
        if(target.billType===2 && Math.abs(target.x-p.x)<65){touch.left=target.x>p.x;touch.right=target.x<p.x;return;}
        shoot();
      }
      return;
    }
    if (step && dist(p.x, targetX) < 35) {
      const period=step.period || 2.4;
      const phase = (world.time % period) / period;
      if (!step.timing || phase >= .42 && phase <= .58) storyAction();
      return;
    }
    touch.left = p.x > targetX; touch.right = p.x < targetX;
    touch.run = !step?.quiet;
    if(level.furniture && level.chairBridge && p.x>=level.chairBridge.start-100 && p.x<level.chairBridge.end && !world.quest.bridgeDone) {
      touch.left=false;touch.right=false;touch.run=true;
      if(world.quest.bridgeRescue) return;
      if(p.x<level.chairBridge.start-40) {touch.right=true; if(p.grounded && p.y>=GROUND)jump();return;}
      if(!bridgeAligned()) return;
      const next=bridgeChairs().find(o=>o.bridgeStep===(world.quest.bridgeProgress || 0)+1);
      if(next) {const target=next.x+next.w/2;touch.right=p.x<target-4;touch.left=p.x>target+4;if(p.grounded)jump();}
      return;
    }
    if(level.furniture) {
      const direction=p.x<targetX ? 1 : -1;
      const ahead=furnitureRects().find(o=>(o.type==='table' || o.top<p.y-1) && (direction>0 ? o.x+o.w>p.x-18 && o.x-p.x<105 && o.x+o.w>p.x : o.x<p.x && p.x-o.x-o.w<105));
      if(ahead?.type==='table' && p.y>=GROUND-1) touch.crouch=true;
      else if(ahead && p.grounded && ahead.top<p.y-1) {p.crouching=false;jump();}
    }
  }

  function currentStep() {
    const q = world.quest, stops = levels[levelIndex].stops;
    while (stops?.[q.step]?.automatic && q.automaticSeen?.has(q.step)) q.step++;
    return stops?.[q.step];
  }
  function isComplete() {
    const level = levels[levelIndex];
    if(level.rhythm==='quay' && world.ambientComic)return false;
    if (level.openingGag && world.quest.gagPhase !== 'done') return false;
    if(level.name==='Почта' || level.requiredStory) return !currentStep();
    if (level.mode === 'gag' || level.mode === 'story') return true;
    return level.mode === 'shooter' ? world.quest.wave >= level.waves && !world.targets.length : !level.mode || !currentStep();
  }
  function failChapter(title, text) {
    if (godMode) { world.note = 'God: можно продолжать после ошибки.'; return; }
    clearTimeout(endTimer);
    world.state = 'lost'; clearInput();
    world.quest.taxiPhase = null;
    world.dialogue = null; world.ambientComic = null;
    document.getElementById('dialogue').hidden = true;
    setPrompt('');
    screenTitle.textContent = title; screenText.textContent = text;
    restartButton.textContent = 'Попробовать снова'; restartButton.disabled = false;
    screenEl.hidden = false;
  }
  function storyAction(force=false) {
    const step = currentStep(), q = world.quest, level=levels[levelIndex];
    if(level.rhythm==='post' && !postState().arrived)return;
    if (!step || (!force && dist(world.player.x, step.x) > (step.range || 85)) || world.time - q.lastAction < .45) return;
    if (step.escort && !q.escortDone) {
      q.escorting = true; world.note = 'Дайте пройти. Подождите в стороне.'; return;
    }
    if(level.beastShift && q.step===2 && world.cast.find(a=>a.role==='beast').x>490){world.note='Зверь возвращается за кружкой.';return;}
    q.lastAction = world.time;
    if (step.quiet && (touch.run || keys.has('ShiftLeft') || keys.has('ShiftRight'))) {
      world.note = 'Тише. Сначала отпустите «Быстрее».'; return;
    }
    if (step.timing) {
      const period=step.period || 2.4;
      const phase = (world.time % period) / period;
      if (phase < .36 || phase > .64) {
        if(step.postalTiming) {q.misses++;world.note='Смазанный оттиск. Попробуйте ещё раз в светлой зоне.';return;}
        if (takeDamage()) q.misses++; world.note = 'Мимо. Дождитесь светлой зоны.';
        if (q.health <= 0) failChapter('ПОПРОБУЙТЕ СНОВА', 'Человеколюбие иссякло. Начните эту сцену заново.');
        return;
      }
    }
    if (step.item) q.items.add(step.item);
    if (step.remove) q.items.delete(step.remove);
    world.note = step.text;
    if(step.star){q.automaticSeen ||= new Set();q.automaticSeen.add(q.step);}
    if(level.beastShift && q.step===1){q.shiftStarted=world.time;world.player.x=455;}
    if(level.beastShift && q.step===2) q.beastReturnAt=world.time;
    q.step++; q.escorting = false; q.escortDone = false;
    if (step.automatic) {
      world.ambientComic = {isComic: true, panel: 0, lines: [{speaker: 'Бродский', text: step.text}], until: world.time + 4};
    } else if(step.silentAction) {world.note=step.postalTiming ? (q.step===level.stops.length ? 'Книги Постуму отправлены' : 'Чёткий оттиск. Осталось '+(level.stops.length-q.step)) : step.text;updateChapterUi();}
    else showDialogue(step.text,step);
    q.actorActionAt=world.animationTime;
    if(step.finish)win();
  }
  function startWave() {
    const level = levels[levelIndex], q = world.quest;
    if (q.wave >= level.waves || world.targets.length || !q.items.has('gun')) return;
    q.wave++;
    const count = q.wave<=2 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const side = level.crossfire && q.wave>=4 && i%2===0 ? -1 : 1;
      let x = world.player.x + side * (340 + i * 130);
      x = clamp(x, 55, level.width - 50);
      if (dist(x, world.player.x) < 150) x = clamp(world.player.x + (world.player.x < level.width / 2 ? 1 : -1) * (260 + i * 100), 55, level.width - 50);
      world.targets.push({ x, y: i%3===2 ? GROUND-150 : GROUND, dir: -side, sprite: 10, billType:i%3, hp: 2, state: 'combat', walkPhase: 0,
        fireAt: world.time + 1.8 + i * .6, speechTimer: 0, detect: 0 });
    }
  }
  function reloadGun() {
    const q = world.quest;
    if (levels[levelIndex].mode !== 'shooter' || q.reloadUntil > world.time || q.ammo === 6) return;
    q.reloadUntil = world.time + 1.4; world.note = 'Перезарядка…';
  }
  function shoot() {
    const q = world.quest, p = world.player;
    if (world.state !== 'play' || levels[levelIndex].mode !== 'shooter' || !q.items.has('gun') || p.hidden || world.time < q.reloadUntil || world.time < q.fireAt) return;
    if (!q.ammo) { reloadGun(); return; }
    q.ammo--; q.fireAt = world.time + .28; q.flashUntil = world.time + .09;
    world.bullets.push({ x: p.x + p.facing * 58, y: p.y - (p.crouching?74:117), dir: p.facing, enemy: false, speed: (q.aimUp || keys.has('ArrowUp')) ? 380 : 660, vy:(q.aimUp || keys.has('ArrowUp')) ? -520 : 0, origin: p.x });
    if (!q.ammo) reloadGun();
  }
  function crossingPhase(c, time = world.time) { return ((time + c.phase) % 5 + 5) % 5; }
  function crossingSafe(c, time = world.time, duration = 0) {
    const phase = crossingPhase(c, time);
    return phase >= 2.3 && phase + duration < 5;
  }
  function bridgeAligned(time=world.time) {
    const bridge=levels[levelIndex].chairBridge;
    if(!bridge) return false;
    const phase=((time%bridge.period)+bridge.period)%bridge.period;
    return phase>=bridge.readyFrom && phase<bridge.readyUntil;
  }
  function bridgeChairs(time=world.time) {
    const bridge=levels[levelIndex].chairBridge;
    if(!bridge) return [];
    const phase=((time%bridge.period)+bridge.period)%bridge.period;
    // The crossing window restores the order, never freezes the furniture.
    const blend=phase<bridge.readyFrom ? Math.max(0,phase-(bridge.readyFrom-1)) : phase<bridge.readyUntil ? 1 : phase<bridge.readyUntil+1 ? bridge.readyUntil+1-phase : 0;
    return [0,1,2].map(i=>{
      const x=bridge.start+45+i*140, top=GROUND-45-i*45;
      const crossingX=x+Math.sin(time*(1.55+i*.23)+i*2.1)*30;
      const crossingY=top+Math.sin(time*(1.2+i*.19)+i*1.7)*22;
      const wanderingX=x+Math.sin(time*.85+i*2.2)*90;
      const wanderingY=GROUND-85+Math.cos(time*.7+i*2.5)*65;
      const seatY=wanderingY+(crossingY-wanderingY)*blend;
      return {x:wanderingX+(crossingX-wanderingX)*blend,w:88,top:seatY,
        bottom:seatY+15,type:'bridge-chair',bridgeStep:i+1};
    });
  }
  function furnitureRects(time = world.time) {
    const objects=(levels[levelIndex].furnitureObjects || []).map(o => ({...o,
      x:o.x+(o.travel ? Math.sin(time*(o.pace || 1.6)+(o.phase || 0))*o.travel : 0),
      top:GROUND-o.h, bottom:o.type==='table' ? GROUND-o.bottom : o.type==='bridge-chair' ? GROUND-o.h+15 : GROUND}));
    return objects.concat(bridgeChairs(time));
  }
  function rescueFromFloor() {
    const p=world.player,q=world.quest;
    q.bridgeProgress=0;q.bridgeRescue={x:p.x,y:p.y,startedAt:world.time};
    p.vx=0;p.vy=0;p.grounded=false;p.crouching=false;
    world.note='Стул подхватил вас. Дождитесь лесенки и прыгайте по порядку.';
  }
  function jump() {
    if(levels[levelIndex].mode==='shooter'){world.quest.aimUp=!world.quest.aimUp;return;}
    const p=world.player;
    if(!ready || world.state!=='play' || (!levels[levelIndex].furniture && !levels[levelIndex].platforming) || p.hidden || !p.grounded || p.crouching) return;
    if((world.quest.items.has('books') || world.quest.items.has('parcel')) && levels[levelIndex].rhythm!=='post')return;
    if(levels[levelIndex].rhythm==='post' && (postState().grip || postState().rescue))return;
    p.vy=-620; p.grounded=false;
  }
  function furniturePhysics(dt, previousX) {
    const p=world.player, q=world.quest, bridge=levels[levelIndex].chairBridge, objects=furnitureRects();
    if(bridge && !bridgeAligned() && !q.bridgeDone) q.bridgeProgress=0;
    if(q.bridgeRescue) {
      const t=Math.min(1,(world.time-q.bridgeRescue.startedAt)/.7), ease=t*t*(3-2*t);
      const seat=objects.find(o=>o.type==='bridge-chair' && !o.bridgeStep);
      p.x=q.bridgeRescue.x+(seat.x+seat.w/2-q.bridgeRescue.x)*ease;
      p.y=q.bridgeRescue.y+(seat.top-q.bridgeRescue.y)*ease;p.vx=0;p.vy=0;
      if(t===1){q.bridgeRescue=null;p.grounded=true;}
      return;
    }
    // Carry the player with a moving platform without damage or a forced jump.
    if (p.grounded && p.y < GROUND) {
      const before = furnitureRects(world.time - dt);
      const support = before.findIndex(o => Math.abs(p.y-o.top)<1 && previousX+17>o.x && previousX-17<o.x+o.w);
      if (support >= 0) {p.x += objects[support].x - before[support].x; p.y += objects[support].top - before[support].top;}
    }
    const requested=touch.crouch || keys.has('ArrowDown') || keys.has('KeyS');
    const overhead=objects.some(o=>o.type==='table' && p.x+18>o.x && p.x-18<o.x+o.w && p.y-149<o.bottom && p.y>o.top);
    p.crouching=!!requested || (p.crouching && overhead);
    const height=p.crouching ? 92 : 149;
    for(const o of objects) if(o.type!=='bridge-chair' && p.x+18>o.x && p.x-18<o.x+o.w && p.y>o.top+1 && p.y-height<o.bottom-1) {
      p.x=p.vx>=0 ? o.x-18 : o.x+o.w+18; p.vx=0;
    }
    const oldY=p.y;
    p.vy+=1350*dt; p.y+=p.vy*dt; p.grounded=false;
    for(const o of objects) if(p.x+17>o.x && p.x-17<o.x+o.w) {
      if(p.vy>=0 && oldY<=o.top+1 && p.y>=o.top) {p.y=o.top;p.vy=0;p.grounded=true;
        if(o.bridgeStep && bridgeAligned() && o.bridgeStep===(q.bridgeProgress || 0)+1) {
          q.bridgeProgress=o.bridgeStep; if(o.bridgeStep===3) q.bridgeDone=true;
        }
      }
      else if(o.type!=='bridge-chair' && p.vy<0 && oldY-height>=o.bottom && p.y-height<o.bottom) {p.y=o.bottom+height;p.vy=0;}
    }
    if(bridge && p.x>=bridge.start && p.x<bridge.end) {
      if(p.y>GROUND+65) {rescueFromFloor();return;}
    } else if(p.y>=GROUND){p.y=GROUND;p.vy=0;p.grounded=true;}
    if(bridge && !q.bridgeDone && previousX<bridge.end && p.x>=bridge.end) {rescueFromFloor();return;}
    if(p.crouching && p.y<GROUND-1) p.crouching=false;
  }
  function drawFurniture() {
    const wood=(x,y,w,h)=>{
      const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#a38b65');g.addColorStop(.45,'#705739');g.addColorStop(1,'#453827');
      ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#342b21';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
      ctx.strokeStyle='#c2a97d55';ctx.lineWidth=1;
      for(let i=9;i<w;i+=17){ctx.beginPath();ctx.moveTo(x+i,y+3);ctx.lineTo(x+i+3,y+h-3);ctx.stroke();}
    };
    const drawChair=(x,seatY,width)=>{
      const f=assets.bridgeChair;if(!f)return;
      ctx.drawImage(f.image,f.left,f.top,f.width,f.height,x,seatY-80,width,160);
    };
    for(const o of furnitureRects()) {
      if(o.type==='bridge-chair') {
        drawChair(o.x,o.top,o.w);
        if(o.bridgeStep) {ctx.fillStyle=bridgeAligned() ? '#f4deb1' : '#b2a68d';ctx.font='18px Georgia';ctx.textAlign='center';ctx.fillText(String(o.bridgeStep),o.x+o.w/2,o.top-87);ctx.textAlign='left';}
        continue;
      }
      ctx.fillStyle='#17171155';ellipse(o.x+o.w/2,GROUND+3,o.w*.6,6);
      if(o.type==='table') {
        wood(o.x,o.top,o.w,27);wood(o.x+8,o.top+27,15,o.h-27);wood(o.x+o.w-23,o.top+27,15,o.h-27);
        // A readable arrow marks the clearance, without a traffic signal.
        ctx.fillStyle='#eee0bb';ctx.font='20px Georgia';ctx.textAlign='center';ctx.fillText('↓',o.x+o.w/2,GROUND-40);ctx.textAlign='left';
      } else if(o.type==='stool' || o.type==='chair') {
        const seatY=o.type==='chair' ? GROUND-76 : o.top;
        wood(o.x+7,seatY+14,10,GROUND-seatY-14);wood(o.x+o.w-17,seatY+14,10,GROUND-seatY-14);wood(o.x,seatY,o.w,14);
        wood(o.x+12,GROUND-24,o.w-24,7);
        if(o.type==='chair'){wood(o.x+o.w-16,o.top,11,46);wood(o.x+o.w-57,o.top,42,13);}
      } else {
        wood(o.x,o.top,o.w,o.h);wood(o.x+8,o.top+9,o.w-16,o.h-18);
        if(o.type==='drawer'){ctx.fillStyle='#b6a476';ctx.fillRect(o.x+o.w/2-10,o.top+19,20,5);}
        else {ctx.strokeStyle='#342b21';ctx.beginPath();ctx.moveTo(o.x+o.w/2,o.top+6);ctx.lineTo(o.x+o.w/2,GROUND-6);ctx.stroke();ctx.fillStyle='#b6a476';ctx.fillRect(o.x+o.w/2-12,o.top+88,7,22);ctx.fillRect(o.x+o.w/2+5,o.top+88,7,22);}
      }
    }
  }
  function drawRescueChair() {
    if(!world.quest.bridgeRescue || !assets.bridgeChair)return;
    const p=world.player,f=assets.bridgeChair;ctx.drawImage(f.image,f.left,f.top,f.width,f.height,p.x-44,p.y-80,88,160);
  }
  function crossObstacles(previousX) {
    const level = levels[levelIndex], p = world.player, q = world.quest;
    if (godMode || p.hidden) return;
    for (const c of level.crossings || []) {
      if (crossingSafe(c)) continue;
      const left = c.x - 22, right = c.x + c.width + 22;
      if (Math.max(previousX, p.x) <= left || Math.min(previousX, p.x) >= right) continue;
      const movingRight = p.vx > 0 || (!p.vx && p.facing > 0);
      p.x = movingRight ? left - 10 : right + 10;
      p.vx = 0;
      if (world.time >= (q.bumpUntil || 0)) {
        q.bumpUntil = world.time + .7; world.shake = .35;
        world.note = c.kind === 'water' || c.kind === 'wave' ? 'Промокли! Дождитесь просвета.' : 'Путь занят. Пропустите и пробегайте.';
      }
    }
  }
  // Drawn assets and route rules for the second half of the continuous outing.
  function configureRhythmRoute() {
    const get = name => levels.find(l => l.name === name);
    const enemy = (x,min,max,sprite=2,line='Только один вопрос!') => ({x,min,max,dir:-1,speed:64,sprite,line,name:'Собеседник'});
    const cover = (x,w,kind,prop,label) => ({x,w,kind,prop,label});
    Object.assign(get('Почта'),{rhythm:'post',platforming:true,width:3250,exit:3180,
      objective:'Уберите затор. Перейдите по трём тележкам. Довезите книги к окну. Без ущерба.',
      stops:[stop(2930,'Отправить книги','',{range:110,remove:'parcel',parts:['Хочу отправить книги.','Получатель?','Постум.','Обратный адрес?','Ниоткуда.'],speakers:['Бродский','Сотрудница почты','Бродский','Сотрудница почты','Бродский']})],
      cast:[{x:3030,sprite:7,behindCounter:true,motion:'postal'}],
      hides:[],enemies:[],queueGroups:[],routeObstacles:[]});
    Object.assign(get('Сад'),{rhythm:'garden',platforming:true,width:3200,exit:3130,requiredStory:true,donne:true,movingTram:true,
      objective:'Откройте путь выключателями. Прыгайте через ограды, пригибайтесь под перекладиной.',
      stops:[stop(540,'Выключить первую секцию','',{star:true,silentAction:true}),stop(1530,'Выключить вторую секцию','',{star:true,silentAction:true}),stop(2870,'Выключить последнюю секцию','',{star:true,silentAction:true})],
      cast:[{x:300,sprite:10,role:'postum',motion:'danceClerk'}],crossings:[],
      hides:[cover(1230,80,'high','column','тумба'),cover(2600,160,'low','fence','ограда: пригнуться')],
      enemies:[enemy(1300,1120,1510)],
      routeObstacles:[{x:350,w:130,kind:'jump'},{x:730,w:120,kind:'panel',unlock:1},{x:1000,w:180,kind:'duck'},{x:1840,w:120,kind:'panel',unlock:2},{x:2100,w:80,kind:'water',phase:1},{x:2470,w:100,kind:'water',phase:3},{x:3000,w:90,kind:'panel',unlock:3}]});
    Object.assign(get('Васильевский остров'),{rhythm:'quay',platforming:true,width:2850,exit:2780,movingTram:true,
      objective:'Используйте киоск, скамейку, трамвай и людей: меняйте укрытие, чтобы уйти от разговора.',crossings:[],
      stops:[stop(260,'','',{automatic:true,parts:['Цель визита на В.О.?','Умирать.','Вы первично или повторно?'],speakers:['Служащий','Бродский','Служащий']}),stop(2350,'','',{automatic:true,parts:['Он был синий?','По документам — синий.'],speakers:['Бродский','Служащий'],actor:'facade'})],
      cast:[{x:350,sprite:10,role:'official',motion:'danceClerk'},{x:2450,sprite:10,role:'facade',motion:'danceClerk'}],
      hides:[cover(610,130,'high','kiosk','киоск: меняйте сторону'),cover(1060,160,'low','bench','скамейка: пригнуться'),cover(2690,100,'niche','niche','подъезд у фасада')],
      enemies:[enemy(850,550,990),enemy(1620,1320,1750),enemy(2600,2450,2700,2,'Здесь не стойте. Сейчас снег с крыши пойдёт.')],
      queueGroups:[{x:1930,period:8,phase:1,crowd:true}],routeObstacles:[]});
    Object.assign(get('Граммофон'),{rhythm:'dance',platforming:true,width:2300,exit:2230,
      objective:'Заведите патефон. Ждите просветы, пригибайтесь под руками; с третьей группой идите шагом.',
      stops:[stop(260,'Завести патефон','',{silentAction:true})],cast:[],routeObstacles:[],
      danceGates:[{x:600,kind:'gap',phase:0},{x:1010,kind:'arms',phase:1},{x:1420,kind:'follow',phase:2},{x:1840,kind:'gap',phase:1}],
      hides:[cover(1640,90,'high','shelf','шкаф: дождитесь следующего такта')]});
    const home=get('Ночная улица');
    Object.assign(home,{rhythm:'home',mode:'story',platforming:true,requiredStory:true,width:4140,exit:3180,crossfire:false,
      objective:'Домой: прыгайте, пригибайтесь и уходите от разговоров. Цезарь и хлеб — по пути.',
      stops:[stop(1260,'Купить салат «Цезарь»','',{item:'salad',silentAction:true}),stop(1930,'Доесть хлеб','',{silentAction:true}),stop(2200,'Взять письмо','',{item:'letter',silentAction:true})],
      cast:[{x:1350,sprite:9,role:'caesar',motion:'caesar'}],
      hides:[cover(650,100,'high','column','тумба'),cover(1030,170,'low','fence','ограда: пригнуться'),cover(2870,95,'niche','niche','последний подъезд')],
      enemies:[enemy(680,500,950),enemy(2600,2450,2790,1,neighborLine)],queueGroups:[{x:2500,period:8,phase:0,crowd:true}],
      routeObstacles:[{x:360,w:110,kind:'jump'},{x:840,w:165,kind:'duck'},{x:2310,w:110,kind:'jump'}]});
    get('Пост сдал').rhythm='cage';
    const fight=get('Переулок');fight.rhythm='combat';fight.crossfire=true;fight.waves=4;
    fight.hides=[cover(260,100,'niche','niche','подъезд'),cover(710,100,'high','column','массивная тумба'),cover(1160,100,'niche','niche','ниша')];
    get('Ломбард').stops=[stop(450,'Обменять пистолет','',{item:'gramophone',remove:'gun',parts:['Что хотите получить?','Патефон.'],speakers:['Приёмщик','Бродский']})];
    const room=get('Не выходи');Object.assign(room,{rhythm:'ending',width:1600,requiredStory:true,stops:[stop(640,'Закрыть дверь','',{silentAction:true,remove:'letter',finish:true})],objective:'Вы дома. Уберите письмо и закройте дверь.'});
    for(const name of ['Джон Донн','Синий фасад','Цезарь','Хлеб без корки','Последний двор'])levels.splice(levels.indexOf(get(name)),1);
    const fi=levels.indexOf(fight);levels.splice(fi,1);levels.splice(levels.indexOf(get('Ломбард')),0,fight);
  }

  function routeProp(name) {
    const p=assets.postProps,s=assets.coverProps,r=assets.routeProps;
    return ({shelf:p?.[0],parcels:p?.[1],trolley:p?.[2],table:p?.[3],column:s?.[0],kiosk:s?.[1],bench:s?.[2],fence:s?.[3],panel:r?.[0],jump:r?.[1],duck:r?.[2],water:r?.[3],switch:assets.switchFrame,niche:assets.nicheFrame,letter:assets.letterFrame})[name];
  }
  function drawRouteProp(name,x,height,width,y=GROUND) {
    const f=routeProp(name);if(!f)return;
    const w=width || f.width*height/f.height;
    ctx.drawImage(f.image,f.left,f.top,f.width,f.height,x,y-height,w,height);
  }
  function groupState(g,time=world.time) {
    const phase=((time+g.phase)%g.period)/g.period;
    return {open:phase>.44 && phase<.86,shift:g.crowd?Math.sin((time+g.phase)*.5)*105:Math.sin(phase*Math.PI*2)*24,phase};
  }
  function danceOpen(g,time=world.time) {
    const phase=((time+g.phase)%2.8)/2.8;
    return phase>.23 && phase<.78;
  }
  function routeSafeWork() {
    const l=levels[levelIndex],p=world.player,s=currentStep();
    return !!((world.ambientComic && (l.rhythm!=='quay' || dist(p.x,world.cast.find(a=>a.role===(world.ambientComic.actor==='facade'?'facade':'official'))?.x || 350)<180)) || (l.rhythm==='post' && (world.quest.step===0 || world.quest.step>=3 || (world.quest.step===2 && dist(p.x,1810)<130))) || (l.rhythm==='home' && s && dist(p.x,s.x)<105));
  }
  function protectedFrom(n) {
    const p=world.player,l=levels[levelIndex];
    if(routeSafeWork())return true;
    if((l.hides||[]).some(s=>s.kind==='high' && (p.x-(s.x+s.w/2))*(n.x-(s.x+s.w/2))<0 && dist(p.x,s.x+s.w/2)<s.w/2+65))return true;
    if(p.hidden) {
      const spot=p.hiddenIn;
      if(spot?.kind==='high'){const center=spot.x+spot.w/2;return dist(n.x,center)>45 && ((p.x-center)*(n.x-center)<=0 || dist(p.x,center)<5);}
      return true;
    }
    if(p.crouching && hideSpots.some(s=>s.kind==='low' && p.x>s.x && p.x<s.x+s.w))return true;
    if(l.rhythm==='quay' && p.x>1250 && p.x<1750 && world.quest.tramX< p.x && world.quest.tramX+650>p.x)return true;
    return (l.queueGroups||[]).some(g=>{const state=groupState(g);return g.crowd && !state.open && dist(p.x,g.x+state.shift)<62 && Math.abs(p.vx)<=150;});
  }
  // Postal machinery is a separate no-damage platforming level.
  function drivePost() {
    const a=postState(),p=world.player;
    const go=x=>{touch.right=p.x<x-4;touch.left=p.x>x+4;touch.run=true;};
    if(a.arrived){if(world.quest.step===0){go(2930);if(dist(p.x,2930)<35)action();}else go(levels[levelIndex].exit+15);return;}
    if(!a.parked){if(a.grip)go(800);else{go(a.cart-65);if(dist(p.x,a.cart-65)<35)action();}return;}
    if(!a.crossed){
      if(a.bridge===3){touch.crouch=true;touch.right=true;return;}
      const carts=postPlatforms(),target=carts[a.bridge],aim=target.x+target.w*.55;
      if(p.grounded){
        const support=carts.find(o=>Math.abs(p.y-o.top)<2 && p.x>o.x-17 && p.x<o.x+o.w+17);
        const edge=support?support.x+support.w-15:963;
        if(p.x<edge-5){go(edge);return;}
        if(target.x-p.x<180){jump();go(aim);}return;
      }
      go(aim);if(a.bridge===2 && p.x>1455)touch.crouch=true;
      return;
    }
    if(!a.cargo){go(1790);if(dist(p.x,1790)<35)action();return;}
    if(!a.grip){go(a.freight-75);if(dist(p.x,a.freight-75)<35)action();return;}
    for(let i=0;i<2;i++){
      const lane=postLane(i),phase=((world.time+i*2.7)%5.4)/5.4;
      if(p.x+130<lane.x && p.x+130>lane.x-20 && (!lane.open || phase>.65))return;
      if(p.x+130<lane.x-20 && p.x+130+206/60>lane.x-12 && (!lane.open || phase>.65))return;
    }
    go(2940);
  }
  function postState() {
    const q=world.quest;
    if(!q.post){q.post={parked:false,cart:470,grip:false,bridge:0,crossed:false,cargo:false,freight:1840,checkpoint:1790,arrived:false,retryUntil:0};q.items.add('books');}
    return q.post;
  }
  function postPlatforms(time=world.time) {
    return [0,1,2].map(i=>({x:1040+i*180+Math.sin(time*(.7+i*.13)+i*2)*[40,48,36][i],w:125,top:GROUND-50-i*45,id:i+1}));
  }
  function postLane(index,time=world.time) {
    const period=5.4,phase=((time+index*2.7)%period)/period;
    // Bags rise visibly out of the crossing, leaving an unambiguous window.
    const lift=phase<.46?0:phase<.58?(phase-.46)/.12:phase<.88?1:(1-phase)/.12;
    return {x:index===0?2110:2510,w:95,lift,open:lift>.96};
  }
  function postPrompt() {
    const a=postState(),p=world.player;
    if(a.rescue)return '';
    if(a.arrived)return world.quest.step===0 && dist(p.x,2930)<110?'Отправить книги':'';
    if(!a.parked && (a.grip || dist(p.x,a.cart-65)<110))return a.grip?'Отпустить тележку':'Взяться за тележку';
    if(a.crossed && !a.cargo && dist(p.x,1840)<120)return 'Положить книги';
    if(a.cargo && (a.grip || dist(p.x,a.freight-75)<110))return a.grip?'Отпустить тележку':'Везти книги';
    return '';
  }
  function postAction() {
    const a=postState(),p=world.player,q=world.quest;
    if(a.arrived){storyAction();return;}
    if(!postPrompt())return;
    if(!a.parked){a.grip=!a.grip;p.x=a.cart-65;}
    else if(a.crossed && !a.cargo){a.cargo=true;q.items.delete('books');q.items.add('parcel');a.grip=true;p.x=a.freight-75;}
    else if(a.cargo){a.grip=!a.grip;p.x=a.freight-75;}
    p.y=GROUND;p.vy=0;p.grounded=true;
    updateChapterUi();
  }
  function postReset(cargo=false) {
    const a=postState(),p=world.player;
    if(!cargo){
      if(a.rescue)return;
      a.rescue={x:p.x,y:p.y,startedAt:world.time,deck:a.bridge};
      p.vx=0;p.vy=0;p.grounded=false;p.crouching=false;a.grip=false;clearInput();
      world.note='Экзистенциальный кризис. Тележка подхватывает вас.';return;
    }
    p.x=a.checkpoint;p.y=GROUND;p.vy=0;p.vx=0;p.grounded=true;
    a.grip=false;a.retryUntil=world.time+1.4;
    if(cargo)a.freight=a.checkpoint+75;else a.bridge=0;
    clearInput();world.note=cargo?'Тележка вернулась на площадку ожидания. Книги на месте.':'Вернулись на площадку. Тележка в заторе остаётся припаркованной.';
  }
  function postStatus() {
    const a=postState();
    if(a.rescue)return 'Тележка подхватила вас. Возвращаемся на прежнюю опору.';
    if(world.time<a.retryUntil)return world.note;
    if(a.arrived)return world.quest.step?'Книги Постуму отправлены. Выход справа →':'Передайте книги сотруднице';
    if(!a.parked)return a.grip?'Отвезите тележку на стоянку у стены →':'Тележка перекрыла проход. Отвезите её на стоянку справа →';
    if(!a.crossed)return a.bridge<2?'Прыгайте на следующую тележку · '+a.bridge+'/3':a.bridge===2?'Прыгните на третью и пригнитесь в воздухе':'Идите вправо пригнувшись — к краю провала';
    if(!a.cargo)return 'У стола положите книги на пустую тележку';
    if(!a.grip)return 'Возьмитесь за тележку с книгами';
    return 'Везите книги. Груз поднялся — проходите. Между потоками — площадка ожидания.';
  }
  function postPhysics(dt,previousX) {
    const a=postState(),p=world.player,q=world.quest;
    if(a.rescue){
      const r=a.rescue,t=Math.min(1,(world.time-r.startedAt)/1.15),ease=t*t*(3-2*t);
      const deck=r.deck?postPlatforms()[r.deck-1]:null;
      const x=deck?deck.x+deck.w/2:950,y=deck?deck.top:GROUND;
      p.x=r.x+(x-r.x)*ease;p.y=r.y+(y-r.y)*ease;p.vx=0;p.vy=0;p.crouching=false;
      if(t===1){a.rescue=null;p.grounded=true;clearInput();if(r.deck===3){touch.crouch=true;p.crouching=true;}}
      return;
    }
    p.crouching=touch.crouch || keys.has('ArrowDown') || keys.has('KeyS');
    if(a.grip){p.facing=1;p.crouching=false;p.y=GROUND;p.vy=0;p.grounded=true;}
    if(!a.parked){
      if(a.grip){a.cart=clamp(p.x+65,470,790);p.x=a.cart-65;if(a.cart>=760){a.parked=true;a.grip=false;world.note='Тележка припаркована. Проход свободен.';}}
      else p.x=Math.min(p.x,a.cart-65);
      p.y=GROUND;p.vy=0;p.grounded=true;return;
    }
    if(!a.crossed){
      const platforms=postPlatforms(),before=postPlatforms(world.time-dt);
      if(p.grounded && p.y<GROUND){const i=before.findIndex(o=>Math.abs(p.y-o.top)<2 && previousX>o.x-17 && previousX<o.x+o.w+17);if(i>=0)p.x+=platforms[i].x-before[i].x;}
      const oldY=p.y;p.vy+=1350*dt;p.y+=p.vy*dt;p.grounded=false;
      for(const o of platforms)if(p.x+15>o.x && p.x-15<o.x+o.w && p.vy>=0 && oldY<=o.top+2 && p.y>=o.top){p.y=o.top;p.vy=0;p.grounded=true;if(o.id===a.bridge+1)a.bridge=o.id;}
      // Low sorting beam over the third trolley: crouch in mid-jump to fit.
      if(p.x>1490 && p.x<1620 && p.y<GROUND-90 && !p.crouching){postReset();return;}
      if(p.x<1000 && p.y>=GROUND){p.y=GROUND;p.vy=0;p.grounded=true;}
      if(p.x>=1540){if(a.bridge===3){a.crossed=true;a.checkpoint=1790;p.y=GROUND;p.vy=0;p.grounded=true;}else{postReset();return;}}
      if(p.y>GROUND+70){postReset();return;}
      return;
    }
    p.y=GROUND;p.vy=0;p.grounded=true;
    if(a.arrived)return;
    if(!a.cargo){p.x=Math.min(p.x,1940);return;}
    if(a.grip){a.freight=p.x+75;
      for(let i=0;i<2;i++){const lane=postLane(i);if(!lane.open && a.freight+55>lane.x && a.freight-55<lane.x+lane.w){postReset(true);return;}}
      if(p.x>2310 && a.checkpoint<2310)a.checkpoint=2310;
      if(a.freight>=2880){a.arrived=true;a.grip=false;a.freight=2880;q.items.add('parcel');world.note='Книги у окна. Теперь можно отправить.';}
    }else{
      p.x=Math.min(p.x,a.freight-60);
      if(a.freight>1980 && a.freight<2800){a.freight-=dt*28;if(a.freight<a.checkpoint+75)a.freight=a.checkpoint+75;}
    }
  }
  function drawPost() {
    const a=postState();
    const text=(label,x,y=GROUND+28)=>{ctx.font='18px Georgia';ctx.fillStyle='#f3e7cc';ctx.textAlign='center';ctx.fillText(label,x,y);ctx.textAlign='left';};
    const cart=(x,top,w=125,cargo=false,empty=false)=>{
      // The illustrated deck starts at 58% of the sprite height; wheels below it.
      // Align that exact painted deck with the physics landing surface.
      const h=w*1024/1536;
      ctx.drawImage(assets.postFlatbed,x,top-h*.58,w,h);
      if(cargo)drawRouteProp('parcels',x+16,68,w-32,top-7);
    };
    // The same 1000..1540 interval is used by postal physics and the painted gap.
    ctx.drawImage(assets.postPit,1000,GROUND-45,540,H-GROUND+45);
    ctx.drawImage(assets.postParking,680,GROUND-140,210,145);
    text('СТОЯНКА У СТЕНЫ',780,GROUND-150);
    cart(a.cart-60,GROUND-(a.parked?25:28),120);text(a.parked?'ПРИПАРКОВАНА':'ТОЛКАТЬ →',a.cart,GROUND-125);
    if(a.parked)for(const o of postPlatforms()){cart(o.x,o.top,o.w);text(String(o.id),o.x+o.w/2,o.top-92);}
    ctx.fillStyle='#566157';ctx.fillRect(1490,GROUND-252,130,14);ctx.fillStyle='#dbc8a0';ctx.fillRect(1490,GROUND-252,130,4);text('↓',1555,GROUND-263);
    drawRouteProp('table',1740,97,170);cart(a.freight-55,GROUND-28,110,a.cargo&&!world.quest.step,true);
    text('УПАКОВКА',1830,GROUND-160);
    for(let i=0;i<2;i++){
      const lane=postLane(i);ctx.fillStyle='#222c28';ctx.fillRect(lane.x,GROUND-330,lane.w,12);
      ctx.strokeStyle='#778477';ctx.lineWidth=4;
      for(const x of [lane.x+15,lane.x+lane.w-15]){ctx.beginPath();ctx.moveTo(x,GROUND-320);ctx.lineTo(x,GROUND-110-lane.lift*245);ctx.stroke();}
      drawRouteProp('parcels',lane.x,170,lane.w,GROUND-lane.lift*245);
      ctx.fillStyle=lane.open?'#b8c9a1':'#b38a68';ctx.fillRect(lane.x,GROUND+6,lane.w,5);text(lane.open?'→ ПРОХОД':'ГРУЗ',lane.x+lane.w/2,GROUND+33);
    }
    ctx.fillStyle='#cdbb9628';ctx.beginPath();ctx.moveTo(2250,GROUND+5);ctx.lineTo(2430,GROUND+5);ctx.lineTo(2455,GROUND+23);ctx.lineTo(2225,GROUND+23);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#cdbb96';ctx.lineWidth=2;for(const x of [2250,2430]){ctx.beginPath();ctx.moveTo(x,GROUND+5);ctx.lineTo(x+(x<2300?-25:25),GROUND+23);ctx.stroke();}
    text('ПЛОЩАДКА ОЖИДАНИЯ',2350,GROUND+48);
    if(a.rescue)cart(world.player.x-62,world.player.y,125,false,true);
    // Queue stays behind the machinery, away from the playable corridor.
    for(let i=0;i<3;i++)drawQueuePerson(3100+i*40,i,0,1,135);
  }

  function routePhysics(dt,previousX) {
    const l=levels[levelIndex],p=world.player,q=world.quest;
    p.crouching=touch.crouch || keys.has('ArrowDown') || keys.has('KeyS');
    p.vy+=1350*dt;p.y+=p.vy*dt;p.grounded=false;
    if(p.y>=GROUND){p.y=GROUND;p.vy=0;p.grounded=true;}
    const stopAt=(x,w)=>{if(p.x+17>x && p.x-17<x+w){p.x=previousX<=x+w/2 ? x-18:x+w+18;p.vx=0;}};
    for(const o of l.routeObstacles||[]) {
      if(o.kind==='jump' && p.y>GROUND-58)stopAt(o.x,o.w);
      if(o.kind==='duck' && !p.crouching)stopAt(o.x+20,o.w-40);
      if(o.kind==='panel' && q.step<o.unlock)stopAt(o.x,o.w);
      if(o.kind==='water' && ((world.time+o.phase)%5)<2.2 && p.y>GROUND-105)stopAt(o.x,o.w);
    }
    if(l.rhythm==='post' && q.items.has('books') || l.rhythm==='post' && q.items.has('parcel')) {
      for(const g of l.queueGroups||[])if(!groupState(g).open)stopAt(g.x-36,84);

    }
    if(l.rhythm==='dance' && q.step>0)for(const g of l.danceGates){
      if(!danceOpen(g) || (g.kind==='arms' && !p.crouching) || (g.kind==='follow' && Math.abs(p.vx)>150))stopAt(g.x+(g.kind==='follow'?Math.sin(world.time*1.5)*65:0)-22,55);
    }
    if(p.hidden && p.hiddenIn?.kind==='high' && (p.x<p.hiddenIn.x-8 || p.x>p.hiddenIn.x+p.hiddenIn.w+8)){p.hidden=false;p.hiddenIn=null;}
    if(p.hidden)p.vy=0;
  }
  function updateRhythm(dt) {
    const l=levels[levelIndex],q=world.quest,p=world.player;if(!l.rhythm)return;
    if(l.rhythm==='garden') {
      const postum=world.cast[0],destination=[300,1120,2220,2940][Math.min(q.step,3)];
      postum.dir=1;postum.state=postum.x<destination?'walk':'idle';postum.x=Math.min(destination,postum.x+dt*82);postum.walkPhase+=dt*6;
      if(q.step===3 && !q.starsAt)q.starsAt=world.time;
    }
    if(l.rhythm==='quay' && world.ambientComic){const a=world.cast.find(a=>a.role===(world.ambientComic.actor==='facade'?'facade':'official'));if(a){const goal=world.ambientComic.actor==='facade'?Math.min(2780,p.x+100):Math.min(1300,p.x+130);a.motion=null;a.state=dist(a.x,goal)>5?'walk':'idle';a.dir=goal>=a.x?1:-1;a.x+=Math.sign(goal-a.x)*Math.min(dist(a.x,goal),210*dt);a.walkPhase+=dt*8;}}
    if(l.rhythm==='garden' || l.rhythm==='quay')q.tramX=(l.rhythm==='garden'?2200:1250)-1200+(world.time%12)*240;
    if(l.rhythm==='dance') {
      q.dancePeople=[];
      if(q.step>0)l.danceGates.forEach((g,i)=>{
        const open=danceOpen(g),spread=open?58:18,center=g.x+(g.kind==='follow'?Math.sin(world.time*1.5)*65:0);
        q.dancePeople.push({x:center-spread,y:GROUND,dir:1,sprite:7,motion:'dancePostal',dancePose:g.kind==='arms'?1:open?0:1,state:open?'dance':'idle',decorative:true},{x:center+spread,y:GROUND,dir:-1,sprite:5,motion:'danceBeard',dancePose:g.kind==='arms'?1:open?0:1,state:open?'dance':'idle',decorative:true});
      });
    }
    if(l.beastShift && !world.dialogue) {
      const beast=world.cast.find(a=>a.role==='beast'),courier=world.cast.find(a=>a.role==='courier');
      if(q.step===2 && beast.x<=490)storyAction(true);
      else if(q.step===3 && courier.x<=640)storyAction(true);
      else if(q.step===4 && world.time-q.lastAction>.7)storyAction(true);
    }
  }
  function drawQueuePerson(x,row,frame,dir=1,height=145) {
    const frames=assets.queueFrames?.slice(row*4,row*4+4);if(!frames)return;
    const f=frames[frame],scale=height/Math.max(...frames.map(a=>a.height));
    ctx.save();ctx.translate(x,GROUND);if(dir<0)ctx.scale(-1,1);
    ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-f.width*scale/2,-f.height*scale,f.width*scale,f.height*scale);ctx.restore();
  }
  function drawRhythm(foreground=false) {
    const l=levels[levelIndex],q=world.quest;if(!l.rhythm)return;
    if(!foreground) {
      for(const o of l.routeObstacles||[]) {
        if(o.kind==='panel' && q.step>=o.unlock)continue;
        if(o.kind==='water' && (world.time+o.phase)%5>=2.2){const f=routeProp('water');if(f)ctx.drawImage(f.image,f.left,f.top+f.height*.88,f.width,f.height*.12,o.x,GROUND-14,o.w,14);continue;}
        drawRouteProp(o.kind,o.x,o.kind==='jump'?58:o.kind==='duck'?150:o.kind==='water'?108:190,o.w);
      }
      if(l.rhythm==='garden')for(const [i,step] of l.stops.entries())if(q.step<=i)drawRouteProp('switch',step.x+15,95,45);
      if(l.rhythm==='post')drawPost();
      if(l.rhythm==='dance')drawLore(4,260,GROUND,105);
      if(l.rhythm==='home'){drawLore(q.step>=2?15:14,1930,GROUND,110);if(q.step<3)drawRouteProp('letter',2200,38,68,GROUND-6);}
    }
    if(!foreground){
      for(const person of q.dancePeople||[]) {
        const f=assets.danceGateFrames?.[(person.motion==='dancePostal'?0:2)+person.dancePose];
        if(f){const h=person.dancePose===0?205:149,w=f.width*h/f.height;ctx.save();ctx.translate(person.x,GROUND);if(person.dir<0)ctx.scale(-1,1);ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-w/2,-h,w,h);ctx.restore();}
        else drawCharacter(person,person.sprite);
      }
    }
    if(!foreground)for(const s of l.hides)if(s.kind==='niche')drawRouteProp('niche',s.x,225,s.w);
    if(foreground) {
      if(l.rhythm==='post') {
        drawRouteProp('table',2950,97,170);
      }
      for(const s of l.hides)if(s.prop && s.kind!=='niche')drawRouteProp(s.prop,s.x,s.kind==='high'?s.prop==='kiosk'?195:185:105,s.w);
      for(const [index,g] of (l.queueGroups||[]).entries()){
        const state=groupState(g),spread=state.open?100:26;
        for(let i=0;i<3;i++){
          if(l.rhythm==='post' && state.open && i===1)continue;
          drawQueuePerson(g.x+(l.rhythm==='post'?0:state.shift)+(i-1)*spread,(i+index)%3,state.open?3:Math.floor(world.time*2)%3,state.open&&i===0?-1:1);
        }
        if(l.rhythm==='post'){
          ctx.save();ctx.strokeStyle=state.open?'#d6dec0':'#aa8b73';ctx.lineWidth=3;
          ctx.beginPath();ctx.moveTo(g.x-38,GROUND+10);ctx.lineTo(g.x+38,GROUND+10);ctx.stroke();
          if(state.open){ctx.beginPath();ctx.moveTo(g.x+26,GROUND+3);ctx.lineTo(g.x+38,GROUND+10);ctx.lineTo(g.x+26,GROUND+17);ctx.stroke();}
          ctx.restore();
        }
      }
      if(l.rhythm==='quay' && assets.tramFrame){const f=assets.tramFrame;ctx.drawImage(f.image,f.left,f.top,f.width,f.height,q.tramX,GROUND-280,1100,280);}
    }
  }


  function updateChapter(dt) {
    const level = levels[levelIndex], q = world.quest, p = world.player;
    if (!level.openingGag && level.mode !== 'gag' && !q.escorting) {
      world.cast.forEach(person => { person.dir = p.x >= person.x ? 1 : -1; });
    }
    if(level.mode==='shooter' && !q.items.has('gun'))drawLore(17,120,GROUND,90);
    if(level.beastShift){const beast=world.cast.find(a=>a.role==='beast'),courier=world.cast.find(a=>a.role==='courier');
      if(q.step===1)beast.x=Math.min(1050,beast.x+dt*80);
      if(q.step===2)beast.x=Math.max(455,beast.x-dt*120);
      if(q.step>=3){beast.x=Math.min(1800,beast.x+dt*100);beast.dir=1;}
      beast.offstage=beast.x>1700;
      courier.offstage=q.step<3;if(q.step>=3 && q.step<5)courier.x=Math.max(635,courier.x-dt*70);if(q.step>=5){courier.x+=dt*85;courier.dir=1;}}
    if(level.dancingQueue && !level.rhythm)world.cast.forEach(person=>{person.y=GROUND;person.state=q.step>0 && q.step<5?'dance':'idle';});
    if (level.movingTram && !level.rhythm) q.tramX = (q.tramX ?? -1940) + dt * 300;
    q.automaticSeen ||= new Set();
    for (const [index, automatic] of (level.stops || []).entries()) {
      if (automatic.automatic && (automatic.afterStep == null || q.step >= automatic.afterStep) && (!automatic.after || automatic.after.every(index => q.automaticSeen.has(index))) && Math.abs(p.x - automatic.x) < 60 && !q.automaticSeen.has(index)) {
        q.automaticSeen.add(index);
        if(automatic.silent) { if(level.name==='Почта') world.note=automatic.text; continue; }
        const parts = automatic.parts || [automatic.text];
        const lines = parts.map((text, index) => ({ speaker: automatic.speakers?.[index] || 'Бродский', text }));
        world.ambientComic = {isComic:true,panel:0,lines,startedAt:world.time,lineSeconds:level.rhythm==='quay'?2.8:4,until:world.time+(level.rhythm==='quay'?2.8:4)*lines.length, actor:automatic.actor || null,anchor:automatic.fishGag ? 'fish' : automatic.anchor || null};
        if (automatic.fishGag) {
          const seller=world.cast[1];
          p.facing=seller.x>=p.x ? 1 : -1;
          seller.dir=p.x>=seller.x ? 1 : -1;
        }
      }
    }
    if (world.ambientComic?.startedAt != null) world.ambientComic.panel = Math.min(world.ambientComic.lines.length - 1, Math.floor((world.time - world.ambientComic.startedAt) / (world.ambientComic.lineSeconds || 4)));
    if (world.ambientComic && world.time >= world.ambientComic.until) world.ambientComic = null;
    if (level.mode === 'shooter') {
      if (q.reloadUntil && world.time >= q.reloadUntil) { q.ammo = 6; q.reloadUntil = 0; }
      if (touch.fire || keys.has('Space')) shoot();
      if (!world.targets.length && world.time >= q.nextWave) startWave();
      for (const target of world.targets) {
        if(target.billType===2)target.y=GROUND-150+Math.sin(world.time*2.4)*16;
        target.dir = p.x >= target.x ? 1 : -1;
        const dx = p.x - target.x;
        if ((Math.abs(dx) > (target.billType===2 ? 110 : 220)) || target.x < 32 || target.x > level.width - 28) { target.x += Math.sign(dx) * 42 * dt; target.walkPhase += dt * 5; }
        if (target.x >= 0 && target.x <= level.width && world.time >= target.fireAt) {
          target.fireAt = world.time + (level.crossfire ? 2 : 2.8);
          world.bullets.push({ x: target.x + target.dir * 35, y: target.y - 105, dir: target.dir, enemy: true, speed: 245,vy:(p.y-target.y-12)*245/Math.max(50,Math.abs(p.x-(target.x+target.dir*35))) });
        }
      }
      for (const bullet of world.bullets) {
        const oldY=bullet.y; const oldX = bullet.origin ?? bullet.x; delete bullet.origin; bullet.x += bullet.dir * bullet.speed * dt;bullet.y+=(bullet.vy || 0)*dt;
        const crosses = x => x >= Math.min(oldX, bullet.x) - 20 && x <= Math.max(oldX, bullet.x) + 20;
        if (bullet.enemy) {
          if((level.hides||[]).some(s=>s.kind==='high' && crosses(s.x+s.w/2) && bullet.y>GROUND-185)){bullet.dead=true;continue;}
          const fraction=clamp((p.x-oldX)/(bullet.x-oldX || 1),0,1),hitY=oldY+(bullet.y-oldY)*fraction;
          if (!p.hidden && crosses(p.x) && hitY>=p.y-(p.crouching?92:149) && hitY<=p.y && world.time >= q.immuneUntil) {
            bullet.dead = true; takeDamage();
            world.shake = .7; if (q.health <= 0) failChapter('НЕ ДОШЛИ', 'Укройтесь в подъезде и перезарядитесь.');
          }
        } else {
          const target = world.targets.find(t => {const fraction=clamp((t.x-oldX)/(bullet.x-oldX || 1),0,1),hitY=oldY+(bullet.y-oldY)*fraction;return t.hp>0 && crosses(t.x) && hitY>=t.y-135 && hitY<=t.y-5;});
          if (target) { target.hp--; bullet.dead = true; }
        }
      }
      const hadTargets = world.targets.length;
      world.targets = world.targets.filter(t => t.hp > 0);
      if (hadTargets && !world.targets.length) q.nextWave = world.time + 1.5;
      world.bullets = world.bullets.filter(b => !b.dead && b.y>-100 && b.x > -700 && b.x < level.width + 700);
    }
    if (level.openingGag && q.gagPhase === 'idle' && p.x >= 3700) {
      q.gagPhase = 'bus'; q.busX = cameraX - 712; q.busElapsed = 0;
    }
    if (level.mode === 'gag' || level.openingGag) {
      if (level.openingGag && q.gagPhase !== 'idle' && q.gagPhase !== 'done') p.x = Math.min(p.x, 3800);
      const origin = level.openingGag ? 3840 : 0;
      if (q.gagPhase === 'bus') {
        q.busElapsed = (q.busElapsed || 0) + dt;
        q.busX += dt * 310 * Math.min(1, q.busElapsed / .8);
        if (q.busX > origin + (compact ? 600 : W) + 30) {q.gagPhase = 'pilgrims';
          world.cast.forEach((person, index) => { person.x = cameraX - 85 - index * 105; person.walkPhase = index * 2; person.dir = 1; });
          world.ambientComic={isComic:true,panel:0,lines:[{speaker:'Пилигримы',text:'Это пилигримы'}],anchor:'pilgrims',until:Infinity};}
      } else if (q.gagPhase === 'pilgrims') {
        for (const person of world.cast) {
          person.dir = 1;
          person.x += dt * 160;
          person.walkPhase += dt * 160 / 10.8;
          person.state = 'walk';
        }
        if (world.cast.every(person => person.x > cameraX + (compact ? 600 : W) + 70)) { q.gagPhase = 'done'; if (world.ambientComic?.anchor === 'pilgrims') world.ambientComic = null; }
      }

    }
    if (q.escorting) {
      for (const person of world.cast) {
        person.dir = 1; person.state = 'walk';
        person.x += dt * 66; person.walkPhase += dt * 5;
      }
      if (world.cast.every(person => person.x > currentStep().x + 260)) {
        q.escortDone = true; world.note = 'Прошли. Можно продолжать.';
      }
    }
    document.getElementById('jump').hidden = !level.furniture && !level.platforming && level.mode!=='shooter';
    document.getElementById('jump').textContent=level.mode==='shooter' ? (world.quest.aimUp?'Стрелять прямо':'Стрелять вверх') : 'Прыжок';
    document.getElementById('crouch').hidden = !level.furniture && !level.platforming && level.mode!=='shooter';
    document.getElementById('fire').hidden = level.mode !== 'shooter';
    document.getElementById('reload').hidden = level.mode !== 'shooter';
  }
  function updateChapterUi() {
    const level = levels[levelIndex], step = currentStep(), p = world.player;
    if (level.mode === 'gag') {
      actionButton.disabled = true; actionButton.textContent = 'Действие'; setPrompt('');
      objectiveEl.textContent = isComplete() ? 'Можно идти дальше.' : 'Не вызывай мотора.';
      return;
    }
    if(level.rhythm==='post'){const label=postPrompt();actionButton.disabled=!label;actionButton.textContent=label || 'Действие';setPrompt(label);objectiveEl.textContent=level.objective;return;}
    const spot = nearHideSpot();
    const label = p.hidden ? 'Выйти' : step && !step.automatic && dist(p.x,step.x)<(step.range || 85) ? step.label : spot ? spot.kind==='low'?'Пригнуться':spot.kind==='high'?'За укрытие':'Спрятаться' : ''; 
    actionButton.disabled = !label; actionButton.textContent = label || 'Действие';
    setPrompt(label);
    objectiveEl.textContent = level.name === 'Сад' ? level.objective : level.requiredStory || level.mode === 'shooter' || level.enemies.length || level.name === 'Почта' || level.crossings ? level.objective : 'Идите к выходу.';
  }
  function chapterStatus() {
    const q = world.quest, level = levels[levelIndex];
    if (world.dialogue) return 'Разговор';
    if(level.rhythm==='dance' && q.step>0){const x=world.player.x;if(x>1990)return 'Выход справа →';return x<850?'Ловите просвет между парами':x<1200?'Под руками: пригнитесь':x<1620?'С группой — шагом, без ускорения':'Шкаф: дождитесь следующего такта';}
    if(level.rhythm==='post')return postStatus();
    if (level.requiredStory && currentStep()) return currentStep().label;
    if (level.mode === 'gag') return 'Не вызывай мотора';
    if (level.mode === 'shooter') return q.items.has('gun') ? 'Патроны: '+q.ammo+'/6 · волна '+q.wave+'/'+level.waves : 'Достаньте пистолет из чемодана';
    if(level.furniture) {
      const p=world.player;
      if(p.x<1380) return 'Уходите от разговора';
      if(p.x<1750) return 'Можно поговорить или пройти дальше';
      if(p.x<2250) return 'Табуретки: ↑ / пробел — прыгнуть';
      if(p.x<2670) return 'Рыбная лавка';
      if(p.x<3050) return 'Стол: ↓ — пригнуться';
      if(p.x<3900) return 'Вход в магазин';
      if(p.x<4350) return 'Пройдите мимо касс';
      if(p.x<4830) return 'Шкаф: прыгайте по ящикам';
      if(p.x<5670) {
        if(q.bridgeRescue) return 'Стул подхватил вас — без ущерба';
        return bridgeAligned() ? 'Ловите стулья: 1 → 2 → 3 · '+(q.bridgeProgress || 0)+'/3' : 'Пол уехал. Ждите лесенку.';
      }
      return 'Дайте волю мебели';
    }
    if (level.crossings) {
      const c = level.crossings.find(c => world.player.x > c.x - 110 && world.player.x < c.x + c.width + 110);
      if (c) return !crossingSafe(c) ? 'Дождитесь просвета' : crossingPhase(c) >= 4.2 ? 'Проход закрывается!' : 'Просвет — бегом!';
      return levels[levelIndex].rhythm==='quay' ? 'Киоск → скамейка → трамвай → толпа' : 'До следующего прохода';
    }
    return 'Выход справа';
  }
  function drawLore(index,x,y,height,width) {
    const f=assets.loreFrames?.[index];if(!f)return;
    const w=width || height*f.width/f.height;
    ctx.drawImage(f.image,f.left,f.top,f.width,f.height,x-w/2,y-height,w,height);
  }
  function drawChapter() {
    const level = levels[levelIndex], step = currentStep(), q = world.quest;
    if(level.donne){drawLore(0,level.rhythm?2325:560,GROUND,150,260);ctx.font='18px Georgia';ctx.fillStyle='#f1e6ca';ctx.fillText('НЕ БУДИТЬ',level.rhythm?2245:480,GROUND-160);}
    if(level.name==='Сад' && q.step<3) drawLore(13,cameraX+(compact?300:480),218,190,compact?570:920);
    if((level.exchange || level.dancingQueue) && !level.rhythm) drawLore(4,800,GROUND,125);
    if(level.breadGag) drawLore(q.step>=2?15:14,770,GROUND,125);
    if(level.mode==='shooter' && !q.items.has('gun'))drawLore(17,120,GROUND,90);
    if(level.beastShift){if(q.step<3)drawLore(16,485,GROUND-55,28);ctx.font='18px Georgia';ctx.fillStyle='#f1e6ca';ctx.fillText('ДИКИЙ ЗВЕРЬ — 08:00–20:00',180,GROUND-235);ctx.fillText('И. БРОДСКИЙ — 20:00–08:00',180,GROUND-210);}
    if (level.movingTram && !level.rhythm) {
      ctx.strokeStyle='#555c59';ctx.lineWidth=3;
      for(const y of [GROUND+2,GROUND+10]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(level.width,y);ctx.stroke();}
      const f=assets.tramFrame,w=1900,h=248;
      ctx.strokeStyle='#525b5b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,GROUND-h+2);ctx.lineTo(level.width,GROUND-h+2);ctx.stroke();
      ctx.drawImage(f.image,f.left,f.top,f.width,f.height,q.tramX ?? -1940,GROUND-h,w,h);
    }
    if(level.stops?.some(stop=>stop.fishGag) && assets.fishStallFrame){
      const f=assets.fishStallFrame,w=390,h=w*f.height/f.width;
      const fishX=level.furniture ? 2330 : 2170;
      ctx.drawImage(f.image,f.left,f.top,f.width,f.height,fishX,GROUND-h,w,h);
      ctx.fillStyle='#29231d';ctx.fillRect(fishX+80,GROUND-h-30,170,28);
      ctx.font='18px Georgia';ctx.textAlign='center';ctx.fillStyle='#f3e7cc';ctx.fillText('РЫБНАЯ ЛАВКА',fishX+165,GROUND-h-10);ctx.textAlign='left';
    }
    if ((level.mode === 'gag' || level.openingGag) && q.gagPhase === 'bus') drawElectrobus(q.busX);
    if ((!level.openingGag && level.mode !== 'gag') || q.gagPhase === 'pilgrims') world.cast.forEach(person => {if(!person.offstage)drawCharacter(person, person.sprite);});
    for (const c of level.crossings || []) {
      const phase = crossingPhase(c), active = phase < 2.3, warning = phase >= 4.2;
      const color = active ? '#c16b57' : warning ? '#e4ba64' : '#93bf8d';
      ctx.fillStyle = color; ctx.fillRect(c.x - 18, GROUND + 5, c.width + 36, 5);
      ctx.fillStyle = '#343c38'; ctx.fillRect(c.x - 14, GROUND - 182, 10, 178);
      ctx.fillStyle = color; ellipse(c.x - 9, GROUND - 188, 8, 8);
      if (c.kind === 'water' || c.kind === 'wave') {
        if (c.kind === 'wave') {
          if (active) {
            const surge = Math.sin(phase / 2.3 * Math.PI);
            ctx.fillStyle='rgba(102,163,181,.78)';ctx.beginPath();ctx.moveTo(c.x-12,GROUND+3);
            ctx.bezierCurveTo(c.x-18,GROUND-75*surge,c.x+50,GROUND-90*surge,c.x+c.width+12,GROUND+3);ctx.closePath();ctx.fill();
            ctx.strokeStyle='#dce9e5';ctx.lineWidth=3;
            ctx.beginPath();ctx.moveTo(c.x-9,GROUND-9);ctx.bezierCurveTo(c.x+10,GROUND-65*surge,c.x+65,GROUND-66*surge,c.x+c.width+9,GROUND-4);ctx.stroke();
            ctx.fillStyle='rgba(154,197,206,.45)';ellipse(c.x+c.width/2,GROUND+4,c.width*.7,8);
          }
          continue;
        }
        ctx.fillStyle = '#536e78'; ctx.fillRect(c.x + c.width / 2 - 7, GROUND - 12, 14, 12);
        if (active) {
          ctx.strokeStyle = c.kind === 'water' ? '#afdae6' : '#82b9c9'; ctx.lineWidth = c.kind === 'water' ? 3 : 9;
          for (let i = 0; i < 7; i++) {
            const x = c.x + i * c.width / 6;
            ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.quadraticCurveTo(x + 20 * Math.sin(world.time * 5 + i), GROUND - 85 - i % 3 * 12, x + 12, GROUND - 18); ctx.stroke();
          }
        }
      } else if (c.kind === 'tram') {
        ctx.strokeStyle = '#65706b';ctx.lineWidth = 4;
        for (const x of [c.x + 22, c.x + 88]) {ctx.beginPath();ctx.moveTo(x,GROUND-190);ctx.lineTo(x,GROUND+12);ctx.stroke();}
        ctx.save();ctx.translate(c.x,GROUND-90);ctx.rotate(active ? 0 : -Math.PI*.46);
        ctx.fillStyle='#e5d6b6';ctx.fillRect(0,-6,c.width,12);
        ctx.fillStyle='#a65943';for(let i=0;i<c.width;i+=26)ctx.fillRect(i,-6,12,12);ctx.restore();
      } else if (active) {
        const wobble = -130 + phase / 2.3 * 160;
        ctx.fillStyle='#595b52';ctx.fillRect(c.x,GROUND-62+wobble,c.width,44);
        ctx.strokeStyle='#302f28';ctx.lineWidth=2;ctx.strokeRect(c.x,GROUND-62+wobble,c.width,44);
        ctx.fillStyle='#777467';ctx.fillRect(c.x+3,GROUND-61+wobble,c.width-6,7);
        ctx.strokeStyle='#716b58';ctx.beginPath();ctx.moveTo(c.x+c.width-2,GROUND-60+wobble);ctx.lineTo(c.x+c.width+8,GROUND-86+wobble);ctx.lineTo(c.x+c.width+20,GROUND-86+wobble);ctx.stroke();
        ctx.fillStyle='#b69b70';ctx.fillRect(c.x+8,GROUND-106+wobble,45,44);ctx.fillRect(c.x+59,GROUND-87+wobble,42,25);
        ctx.strokeStyle='#716b5b';ctx.strokeRect(c.x+8,GROUND-106+wobble,45,44);
        ctx.strokeRect(c.x+59,GROUND-87+wobble,42,25);
        ctx.fillStyle='#ddc798';ctx.fillRect(c.x+26,GROUND-106+wobble,6,44);ctx.fillRect(c.x+78,GROUND-87+wobble,5,25);
        ctx.fillStyle='#e6d8b9';ctx.fillRect(c.x+12,GROUND-94+wobble,10,7);
        ctx.fillStyle='#262d2b';ellipse(c.x+19,GROUND-12+wobble,10,10);ellipse(c.x+c.width-19,GROUND-12+wobble,10,10);
      }
    }
    drawRhythm(false);

    world.targets.forEach(target => {drawLore(5+target.billType,target.x,target.y,target.billType===2?110:137);ctx.fillStyle='#f1e6ca';ctx.font='14px Georgia';ctx.fillText('Итого '+Math.floor(1200+world.time*27)+' · пени '+Math.floor(world.time*3),target.x-75,target.y-145);});
    if (step) {
      ctx.fillStyle = '#e0d7c2'; ctx.font = '22px Georgia'; ctx.textAlign = 'center';
      ctx.fillText(step.symbol || step.label, step.x, GROUND + 25); ctx.textAlign = 'left';
    }
    for (const bullet of world.bullets) {
      ctx.fillStyle = bullet.enemy ? '#c87957' : '#f1d5a0'; ctx.fillRect(bullet.x - 6, bullet.y, 12, 3);
    }
    if (world.time < q.flashUntil && !world.player.hidden) {
      ctx.fillStyle = '#ffdfa3'; ellipse(world.player.x + world.player.facing * 70, GROUND - 117, 8, 5);
    }
  }
  function drawElectrobus(x) {
    const f = assets.busFrame, width = 672, height = width * f.height / f.width;
    // Native right-facing art: lettering is part of the body and is never mirrored.
    ctx.drawImage(f.image, f.left, f.top, f.width, f.height, x, GROUND-height, width, height);
  }
  function drawChapterOverlay() {
    const step = currentStep();
    if (!step?.timing || (step.postalTiming && dist(world.player.x,step.x)>85)) return;
    const width = Math.min(360, canvas.width - 60), x = (canvas.width - width) / 2;
    ctx.fillStyle = '#141919e8'; ctx.fillRect(x - 12, 82, width + 24, 90);
    ctx.fillStyle = '#dfd3b7'; ctx.font = '18px Georgia'; ctx.fillText(step.postalTiming ? 'Оттиск '+(world.quest.step-1)+'/3 — нажмите в светлой зоне' : 'Нажмите в светлой зоне', x, 110);
    ctx.fillStyle = '#655e4e'; ctx.fillRect(x, 130, width, 20);
    ctx.fillStyle = '#d8cba7'; ctx.fillRect(x + width * .36, 130, width * .28, 20);
    ctx.fillStyle = '#b94b34'; ctx.fillRect(x + width * ((world.time % (step.period || 2.4)) / (step.period || 2.4)) - 3, 125, 6, 30);
  }

  let levelIndex = 0;
  let hideSpots = levels[0].hides;
  const levelTitle = document.getElementById('level-title');
  const objectiveEl = document.getElementById('objective');
  const speechEl = document.getElementById('speech');
  const levelButtons = [...document.querySelectorAll('[data-level]')];

  let pendingLevel = null;
  async function selectLevel(index, seamless=false) {
    if (!ready) { pendingLevel = index; return; }
    const requestId = ++selectionId;
    index = clamp(index, 0, levels.length - 1);
    if (index >= 3 && !hasSceneAssets(index)) {
      world.state = 'loading'; clearInput(); retryChapter = index;
      screenTitle.textContent = 'ЗАГРУЗКА';
      screenText.textContent = '';
      screenEl.hidden = seamless; restartButton.disabled = true;
      try {
        continuationPromise = loadContinuation(index);
        await continuationPromise;
        if (requestId !== selectionId) return;
      } catch (error) {
        if (requestId !== selectionId) return;
        continuationPromise = null;
        screenTitle.textContent = 'СЦЕНА НЕ ЗАГРУЗИЛАСЬ';
        screenEl.hidden=false;
        screenText.textContent = 'Не удалось открыть сцену. Попробуйте ещё раз.';
        restartButton.textContent = 'Повторить'; restartButton.disabled = false;
        return;
      }
    }
    retryChapter = null; restartButton.disabled = false;
    levelIndex = index;
    reset();
  }

  function continueRun() {
    if (!ready) { loadAssets(); return; }
    if (retryChapter !== null) { selectLevel(retryChapter); return; }
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
    restartButton.disabled = false;
    clearInput();
    world.lastPrompt = '';
    cameraX = levels[levelIndex].rhythm==='ending' ? (compact?450:320) : levelIndex < 3 ? openingOffsets[levelIndex] : 0;
    world.state = 'play';
    world.time = 0;
    world.animationTime = 0;
    world.shake = 0;
    world.player = {
      x: levels[levelIndex].rhythm==='ending'?640:78 + (levelIndex < 3 ? openingOffsets[levelIndex] : 0),
      y: GROUND,
      vx: 0,
      facing: 1,
      hidden: false,
      hiddenIn: null,
      walkPhase: 0, vy:0, grounded:true, crouching:false
    };
    const level = levels[levelIndex];
    hideSpots = levelIndex < 3 ? levels.slice(0, 3).flatMap(part => part.hides) : level.hides;
    const enemies = levelIndex < 3 ? levels.slice(0, 3).flatMap(part => part.enemies) : level.enemies;
    world.npcs = enemies.map(enemy => ({
      ...enemy, y: GROUND, state: 'patrol', detect: 0,
      lastSeenX: enemy.x, searchTimer: 0, lostSight: 0,
      walkPhase: 0, speechTimer: 0, spoke: false,
      line: enemy.line || neighborLine
    }));
    world.npc = world.npcs.find(npc => npc.section === levelIndex) || world.npcs[0];
    world.quest = { step: 0, items: new Set(level.exchange ? ['gun'] : level.dancingQueue ? ['gramophone'] : []), misses: 0, lastAction: -10,
      ammo: 6, health: 3, reloadUntil: 0, fireAt: 0, flashUntil: 0,
      wave: 0, nextWave: 0, immuneUntil: 0, escorting: false, escortDone: false };
    if(level.rhythm==='post')postState();
    if (level.mode === 'gag') {
      world.quest.gagPhase = 'bus'; world.quest.busX = -712;
    }
    if(level.openingGag) {world.quest.gagPhase='idle';world.quest.busX=3128;}
    world.targets = []; world.bullets = []; world.note = '';
    world.quest.taxiPhase = null;
    world.dialogue = null; world.ambientComic = null; document.getElementById('dialogue').hidden = true;
    world.cast = (level.cast || []).map((person, index) => ({ ...person, dir: person.dir ?? -1, vx: 0, state: 'still', decorative: true,
      walkPhase: index * 2, lastSeenX: person.x, detect: 0, y: GROUND }));
    if (level.mode === 'gag') world.cast.forEach((person, index) => { person.x = -70 - index * 85; person.dir = 1; });
    document.getElementById('jump').hidden = !level.furniture && !level.platforming && level.mode!=='shooter';
    document.getElementById('jump').textContent=level.mode==='shooter' ? (world.quest.aimUp?'Стрелять прямо':'Стрелять вверх') : 'Прыжок';
    document.getElementById('crouch').hidden = !level.furniture && !level.platforming && level.mode!=='shooter';
    document.getElementById('fire').hidden = level.mode !== 'shooter';
    document.getElementById('reload').hidden = level.mode !== 'shooter';
    document.getElementById('chapter-select').value = String(levelIndex);
    canvas.setAttribute('aria-label', level.objective);
    levelTitle.textContent = `${levelIndex + 1} / ${levels.length}`;
    objectiveEl.textContent = level.objective;
    speechEl.textContent = '';
    levelButtons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === levelIndex));
    });
    screenEl.hidden = true;
    promptEl.hidden = true;
    updateRhythm(0);if(level.mode)updateChapterUi();
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { return Math.abs(a - b); }

  function nearHideSpot() {
    if (world.player.hidden && world.player.hiddenIn) return world.player.hiddenIn;
    return hideSpots.find(s => world.player.x > s.x - 28 && world.player.x < s.x + s.w + 28) || null;
  }

  function nearTaxi() {
    return levelIndex === 0 && world.player.x < 260 && !world.quest.taxiDone;
  }
  function callTaxi() {
    if (world.quest.taxiPhase !== 'open') return;
    world.quest.taxiPhase = 'reply'; world.quest.taxiUntil = world.time + 2.6;
    clearInput();
  }
  function action() {
    if (world.dialogue) { advanceDialogue(); return; }
    if (!ready || world.state !== 'play') return;
    const p = world.player;
    if (world.quest.taxiPhase === 'open') { callTaxi(); return; }
    if (world.quest.taxiPhase) return;
    if (nearTaxi()) {
      clearInput(); p.facing=1; world.quest.taxiPhase = 'takeout';
      world.quest.taxiUntil=world.time+.65;
      setPrompt(''); return;
    }
    if (p.hidden) {
      p.hidden = false;
      p.x = p.hiddenIn.x + p.hiddenIn.w / 2;
      p.hiddenIn = null;
      return;
    }
    if(levels[levelIndex].rhythm==='post'){postAction();return;}
    const spot = nearHideSpot();
    if ((!spot || (currentStep() && dist(p.x,currentStep().x)<(currentStep().range || 85))) && levels[levelIndex].mode) { storyAction(); return; }
    if (spot?.kind==='low') {touch.crouch=!touch.crouch;p.crouching=touch.crouch;return;}
    if (spot) {
      p.hidden = true;
      p.hiddenIn = spot;
      p.vx = 0;
      p.x = spot.x + spot.w / 2;
    }
  }

  function update(dt) {
    if (!ready) return;
    world.animationTime += dt;
    if (world.state !== 'play') return;
    world.time += dt;
    const p = world.player;
    if (world.quest.taxiPhase) {
      p.vx = 0;
      const q=world.quest;
      if(q.taxiPhase==='takeout' && world.time>=q.taxiUntil) q.taxiPhase='open';
      else if(q.taxiPhase==='reply' && world.time>=q.taxiUntil){q.taxiPhase='lower';q.taxiUntil=world.time+.65;}
      else if(q.taxiPhase==='lower' && world.time>=q.taxiUntil){q.taxiPhase='pocket';q.taxiUntil=world.time+.65;}
      else if(q.taxiPhase==='pocket' && world.time>=q.taxiUntil){q.taxiPhase=null;q.taxiDone=true;clearInput();}
      actionButton.disabled=q.taxiPhase!=='open';
      actionButton.textContent=q.taxiPhase==='open'?'Вызвать машину':'Действие';
      setPrompt(q.taxiPhase==='open'?'Вызвать машину':'');
      return;
    }

    const previousX = p.x;
    if(levels[levelIndex].mode==='shooter')p.crouching=touch.crouch || keys.has('ArrowDown') || keys.has('KeyS');
    if(levels[levelIndex].furniture) p.crouching=touch.crouch || keys.has('ArrowDown') || keys.has('KeyS') || p.crouching;
    let move = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA') || touch.left) move -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD') || touch.right) move += 1;

    if (!p.hidden || p.hiddenIn?.kind==='high') {
      const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.run;
      const speed = p.crouching ? 90 : running ? (walkthrough.active ? 237 : 206) : 142;
      p.vx = move * speed;
      if (move !== 0) {
        p.facing = Math.sign(move);
        p.walkPhase += dt * (running ? 12 : 8);
      }
      p.x = clamp(p.x + p.vx * dt, 32, levels[levelIndex].width - 28);
    }

    if(levels[levelIndex].furniture) furniturePhysics(dt,previousX);
    if(levels[levelIndex].rhythm==='post')postPhysics(dt,previousX);
    else if(levels[levelIndex].platforming)routePhysics(dt,previousX);
    crossObstacles(previousX);
    for (const n of world.npcs) {
      updateNpc(n, dt);
      if (world.state !== 'play') break;
    }
    if (world.state !== 'play') return;
    updateChapter(dt);
    if (world.state !== 'play') return;
    updateRhythm(dt);
    if (world.state !== 'play') return;
    if (p.x > levels[levelIndex].exit && !isComplete()) {
      p.x = levels[levelIndex].exit;
      world.note = levels[levelIndex].openingGag ? 'Электробус проедет — следом идут пилигримы.' : world.ambientComic ? 'Ответ ещё звучит — подождите в укрытии.' : 'Сначала закончите дело в этой сцене.';
    }
    if (p.x > levels[levelIndex].exit && isComplete()) { win(); return; }
    if (levels[levelIndex].mode) { updateChapterUi(); return; }

    if (nearTaxi()) {
      actionButton.disabled = false; actionButton.textContent = 'Вызвать такси';
      setPrompt('Вызвать такси'); return;
    }
    const spot = nearHideSpot();
    actionButton.disabled = !p.hidden && !spot;
    actionButton.textContent = p.hidden ? 'Выйти' : 'Спрятаться';
    if (p.hidden) setPrompt('Выйти из укрытия');
    else if (spot) setPrompt(`Спрятаться: ${spot.label}`);
    else setPrompt('');
  }

  function updateNpc(n, dt) {
    const p = world.player;
    n.speechTimer = Math.max(0, n.speechTimer - dt);
    if (levels[levelIndex].openingGag && p.x >= 3700) {
      n.state='patrol'; n.detect=0; n.speechTimer=0;
      n.x=clamp(n.x,n.min,Math.min(n.max,3500));
      return;
    }
    if(levels[levelIndex].furniture && p.x>1380){n.state='patrol';n.detect=0;n.speechTimer=0;n.x=clamp(n.x,n.min,n.max);return;}
    if(n.cooldownUntil>world.time){n.state='patrol';n.detect=0;n.x=clamp(n.x+Math.sign(n.x-p.x)*45*dt,n.min,n.max);n.walkPhase+=dt*5;return;}
    const playerVisible = !protectedFrom(n);
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
        n.x += n.dir * (levels[levelIndex].rhythm==='post'?92:124) * dt;
        n.walkPhase += dt * 10;
        if (dist(p.x, n.x) < 31) lose(n);
      } else {
        n.lostSight += dt;
        if (!playerVisible || n.lostSight > .65) {
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
      world.npcs.forEach(other=>{other.speechTimer=0;});
      n.speechTimer = 3.8;
      n.spoke = true;
      speechEl.textContent = n.line;
    }
    // The callout is consumed until the level is restarted.
    if (!world.npcs.some(npc => npc.speechTimer > 0)) speechEl.textContent = '';
  }

  function setPrompt(text) {
    if (text === world.lastPrompt) return;
    world.lastPrompt = text;
    promptEl.hidden = !text;
    promptEl.textContent = text;
  }

  function takeDamage() {
    const q = world.quest;
    if (godMode || world.state !== 'play' || world.time < q.immuneUntil) return false;
    q.health = Math.max(0, q.health - 1);
    q.immuneUntil = world.time + 1.5;
    q.hurtAt = world.time;
    world.shake = .45;
    return true;
  }

  function lose(n) {
    if (!takeDamage())return;
    if(n && levels[levelIndex].rhythm){n.cooldownUntil=world.time+6;n.state='patrol';n.detect=0;}
    if(world.quest.health>0)return;
    world.shake = 1;
    failChapter('РАЗГОВОР', 'Человеколюбие иссякло. Разговор уже не остановить.');
  }

  function win() {
    if (levelIndex < 2) {
      // One continuous world: retain the player, camera, NPCs, timers and held input.
      if (walkthrough.active) {
        walkthrough.results.push({ chapter: levelIndex + 1, name: levels[levelIndex].name, seconds: Math.round(walkthrough.chapterTime) });
        walkthrough.chapterTime = 0;
        document.getElementById('walkthrough-status').textContent = 'Проверка ' + (levelIndex + 2) + ' / ' + levels.length;
      }
      levelIndex++;
      const level = levels[levelIndex];
      if(level.openingGag) {
        world.quest.gagPhase='idle';world.quest.busX=3128;
        world.cast=level.cast.map((person,index)=>({...person,dir:1,state:'still',decorative:true,walkPhase:index*2,y:GROUND}));
      }
      world.npc = world.npcs.find(npc => npc.section === levelIndex);
      document.getElementById('chapter-select').value = String(levelIndex);
      canvas.setAttribute('aria-label', level.objective);
      levelTitle.textContent = `${levelIndex + 1} / ${levels.length}`;
      objectiveEl.textContent = level.objective;
      levelButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === levelIndex)));
      return;
    }
    world.state = 'won';
    clearInput();
    screenEl.hidden = levelIndex < levels.length - 1;
    if(levelIndex < levels.length-1 && !walkthrough.active) {
      const finishedIndex=levelIndex, health=world.quest.health, items=new Set(world.quest.items);
      queueMicrotask(()=>{if(world.state!=='won' || levelIndex!==finishedIndex)return;selectLevel(finishedIndex+1,true).then(()=>{if(levelIndex===finishedIndex+1){world.quest.health=health;world.quest.items=items;}});});
    }
    screenTitle.textContent = 'КОНЕЦ';
    screenText.textContent = '';
    restartButton.textContent = 'Сначала';
  }

  function draw() {
    ctx.setTransform(1,0,0,1,0,0);
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
    const background = level.mode === 'gag' ? assets.backgrounds[2] : level.background ? assets.scenes[level.background] : assets.backgrounds[levelIndex];
    if (levelIndex < 3) {
      assets.backgrounds.forEach((image, index) => ctx.drawImage(image, openingOffsets[index], 0, openingWidths[index], H));
      ctx.drawImage(assets.deadMansion || assets.backgrounds[2],3840,0,960,H);
    } else if(level.furniture) {
      ctx.drawImage(assets.storeEntrance,0,0,level.width,H);
    } else if(level.rhythm==='ending') ctx.drawImage(world.state==='won'?assets.homeEntryClosed:assets.homeEntry,0,0,1600,H);
    else if(level.rhythm==='home') {
      ctx.drawImage(assets.homeStreet,0,0,2588,H);
      const art=assets.homeEntry,blend=48;
      for(let x=0;x<blend;x+=6){ctx.globalAlpha=(x+3)/blend;ctx.drawImage(art,x/1600*art.width,0,6/1600*art.width,art.height,2540+x,0,6,H);}
      ctx.globalAlpha=1;ctx.drawImage(art,blend/1600*art.width,0,art.width*(1-blend/1600),art.height,2540+blend,0,1600-blend,H);
    } else ctx.drawImage(background, 0, 0, level.mode === 'gag' ? 1600 : level.width, H);
    if(level.name==='Сад'){
      const stars=(level.stops||[]).filter(stop=>stop.star);
      const count=stars.filter(stop=>world.quest.automaticSeen?.has(level.stops.indexOf(stop))).length;
      ctx.fillStyle='rgba(12,20,48,'+(count*.16)+')';ctx.fillRect(0,0,level.width,H);
      for(const [i,star] of stars.entries()) if(world.quest.automaticSeen?.has(level.stops.indexOf(star))){
        ctx.fillStyle='#fff5cf';ctx.shadowColor='#fff1b0';ctx.shadowBlur=14;ctx.font='28px Georgia';ctx.textAlign='center';ctx.fillText('✦',cameraX+(compact?600:W)*(.24+i*.26),88+i%2*30);ctx.shadowBlur=0;ctx.textAlign='left';
      }
    }
    if(level.rhythm==='garden' && assets.tramFrame){const f=assets.tramFrame;ctx.drawImage(f.image,f.left,f.top,f.width,f.height,world.quest.tramX,GROUND-280,1100,280);}
    drawChapter();
    if(level.furniture) {drawFurniture();drawRescueChair();}
    drawMarkers();
    world.npcs.forEach(drawVision);
    world.npcs.forEach(n => drawCharacter(n, n.sprite));
    if (!world.player.hidden || level.rhythm) {ctx.save();if(world.player.hiddenIn?.kind==='niche')ctx.globalAlpha=.28;drawCharacter(world.player,0);
      if(level.rhythm==='post' && world.quest.post?.grip){
        const p=world.player;ctx.strokeStyle='#252a27';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x+9,p.y-104);ctx.quadraticCurveTo(p.x+28,p.y-90,p.x+47,p.y-98);ctx.stroke();
        ctx.fillStyle='#bc9f83';ellipse(p.x+53,p.y-98,8,5);ctx.lineCap='butt';
      }
      ctx.restore();}
    else if(!level.rhythm) {
      ctx.fillStyle = '#e0d5b4';
      ctx.font = '16px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('•', world.player.x, GROUND - 72);
      ctx.textAlign = 'left';
    }
    drawRhythm(true);
    // Snow is decorative and does not participate in collision or visibility.
    ctx.fillStyle = '#e0e4e066';
    for (let i = 0; i < (['office','tram','store','garden','embankment','room','market','pawnshop','cage'].includes(level.background) ? 0 : 42); i++) {
      const x = (i * 137 + world.time * (7 + i % 4)) % level.width;
      const y = (i * 83 + world.time * (18 + i % 7)) % H;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 2);
    }
    ctx.restore();
    if (!world.dialogue && !world.ambientComic) drawSpeech(viewWidth, zoom, cameraY);
    drawHud();
    drawChapterOverlay();
    drawComicDialogue(zoom, cameraY);
    drawExplanations(zoom, cameraY);
    if(['open','reply'].includes(world.quest.taxiPhase)) {
      const open=world.quest.taxiPhase==='open';
      drawComicDialogue(zoom,cameraY,{isComic:true,panel:0,phoneUi:open,phoneReply:!open,lines:[{speaker:'Телефон',text:open?'Вызвать машину':'Не вызывай мотора'}]},
        {x:world.player.x+26,y:GROUND-15,sprite:0});
    }
    if(world.ambientComic?.lines?.[world.ambientComic.panel])speechEl.textContent=world.ambientComic.lines[world.ambientComic.panel].text;
    const itemNames = { fish: 'Рыба', caviar: 'Икра', mug: 'Кружка', receipt: 'Квитанция', gun: 'Пистолет', bread: 'Хлеб', letter: 'Письмо', books: 'Книги',parcel:'Посылка Постуму',gramophone:'Патефон',salad:'Салат «Цезарь»',delivery:'Заказ' };
    const inventory = [...world.quest.items].map(item => itemNames[item] || item).join(' · ');
    if (inventory) {
      ctx.fillStyle = '#121918dd'; ctx.fillRect(18, canvas.height - (level.rhythm==='post' && world.player.x>780 && world.player.x<1680 ? 98 : 48), Math.min(canvas.width - 36, 380), 32);
      ctx.fillStyle = '#e0d7c2'; ctx.font = '16px Georgia'; ctx.fillText('С собой: ' + inventory, 30, canvas.height - (level.rhythm==='post' && world.player.x>780 && world.player.x<1680 ? 76 : 26));
    }
  }

  function drawMarkers() {
    ctx.textAlign = 'center';
    ctx.font = '14px Arial';
    hideSpots.forEach(spot => {
      const near = nearHideSpot() === spot;
      ctx.fillStyle = near ? '#e8dbc2' : '#bbbcb4';
      ctx.fillText(near ? 'УКРЫТИЕ' : '···', spot.x + spot.w / 2, GROUND + 26);
      if (near && !levels[levelIndex].rhythm) {
        ctx.strokeStyle = '#e8dbc299';
        ctx.lineWidth = 1;
        ctx.strokeRect(spot.x + 5, GROUND - 126, spot.w - 10, 122);
      }
    });
    ctx.fillStyle = '#dfccb0';
    if (!levels[levelIndex].rhythm && levelIndex > 1 && (levels[levelIndex].mode !== 'gag' || isComplete())) ctx.fillText(levelIndex < 2 ? 'ДАЛЬШЕ' : 'ВЫХОД', levels[levelIndex].exit - 27, GROUND + 26);
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
    const isPlayer = entity === world.player;
    if(isPlayer && world.quest.taxiPhase && assets.phoneFrames){
      const pose={takeout:0,open:1,reply:1,lower:2,pocket:3}[world.quest.taxiPhase];
      const f=assets.phoneFrames[pose],scale=149/Math.max(...assets.phoneFrames.map(f=>f.height));
      ctx.save();ctx.translate(entity.x,entity.y);
      if(entity.facing<0)ctx.scale(-1,1);
      ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-f.width*scale/2,-f.height*scale,f.width*scale,f.height*scale);
      ctx.restore();return;
    }
    if (isPlayer && world.time < world.quest.immuneUntil && Math.floor(world.animationTime * 10) % 2) return;
    if (isPlayer && !entity.crouching && world.ambientComic?.anchor === 'fish' && world.ambientComic.panel === 1 && assets.caviarFrame) {
      const f=assets.caviarFrame, h=149, w=f.width*h/f.height;
      ctx.save();ctx.translate(entity.x,entity.y);if(entity.facing<0)ctx.scale(-1,1);
      ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-w/2,-h,w,h);ctx.restore();return;
    }
    if(isPlayer && (world.quest.items.has('books') || (world.quest.items.has('parcel') && !world.quest.post?.cargo)) && !world.quest.post?.grip && assets.carryFrames){
      const offset=world.quest.items.has('books')?0:4,pose=entity.crouching?3:Math.abs(entity.vx)>0?[1,0,2,0][Math.floor(entity.walkPhase*.6)%4]:0;
      const frames=assets.carryFrames.slice(offset,offset+4),f=frames[pose],scale=149/Math.max(...frames.map(a=>a.height));
      ctx.save();ctx.translate(entity.x,entity.y);if(entity.facing<0)ctx.scale(-1,1);ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-f.width*scale/2,-f.height*scale,f.width*scale,f.height*scale);ctx.restore();return;
    }
    if(isPlayer && entity.crouching && levels[levelIndex].mode==='shooter' && world.quest.items.has('gun') && assets.crouchGunFrame){const f=assets.crouchGunFrame,h=92,w=f.width*h/f.height;ctx.save();ctx.translate(entity.x,entity.y);if(entity.facing<0)ctx.scale(-1,1);ctx.drawImage(f.image,f.left,f.top,f.width,f.height,-w/2,-h,w,h);ctx.restore();return;}
    if (isPlayer && levels[levelIndex].mode === 'shooter' && world.quest.items.has('gun')) row = 4;
    const moving = isPlayer ? Math.abs(entity.vx) > 0 : ['walk', 'combat', 'patrol', 'chase'].includes(entity.state) || (entity.state === 'search' && dist(entity.x, entity.lastSeenX) > 8);
    const pose = row === 5 ? (world.dialogue?.isComic ? [0,1,1,0,2,2,0,5][Math.floor(world.animationTime) % 8] : 0) : 0;
    const crouching = isPlayer && entity.crouching;
    const index = moving ? (crouching ? [1, 2][Math.floor(entity.walkPhase * .6) % 2] : [1, 0, 2, 0][Math.floor(entity.walkPhase * .6) % 4]) : 0;
    const actionFrames=!isPlayer && assets.actionFrames?.[entity.motion];
    const frames = actionFrames || (crouching ? assets.crouchFrames : entity.inspector ? [assets.inspectorFrame,assets.inspectorFrame,assets.inspectorFrame] : row === 5 && assets.rurikFrames ? assets.rurikFrames : row === 6 && assets.pilgrimFrames ? assets.pilgrimFrames : assets.frames[row]);
    const busy=world.dialogue || world.ambientComic || (world.animationTime-(world.quest.actorActionAt ?? -10)<2);
    const actingIndex=entity.motion?.startsWith('dance') ? (entity.state==='dance' ? [0,1,0,2][Math.floor(world.animationTime*3)%4] : 0) : entity.motion==='beast' && world.quest.step>=3 ? 3 : entity.motion==='somna' || entity.motion==='courier' || entity.motion==='drunk' ? Math.floor(world.animationTime*3)%frames.length : busy ? [0,1,2,3,2,1][Math.floor(world.animationTime*3)%6]%frames.length : [0,0,1,0,3,0][Math.floor(world.animationTime*.7)%6]%frames.length;
    const frame = actionFrames ? frames[actingIndex] : frames === assets.pilgrimFrames ? frames[Math.floor(entity.walkPhase) % 6] : frames[row === 5 ? pose : index];
    const height = isPlayer ? (crouching ? 92 : 149) : entity.behindCounter ? 72 : row === 5 ? 157 : row === 2 ? 146 : row === 3 ? 144 : 137;
    const scale = height / Math.max(...frames.map(f => f.height));
    const width = frame.width * scale;
    const spriteLeft=actionFrames ? (frame.left-frame.image.width/2)*scale : -width/2;
    const h = frame.height * scale;
    ctx.fillStyle = '#10151966';
    if(!entity.behindCounter) ellipse(entity.x, GROUND + 2, 22, 5);
    ctx.save();
    ctx.translate(entity.x, (entity.y ?? GROUND)-(entity.behindCounter ? 78 : 0));
    if (actionFrames ? entity.dir>0 : row === 5 ? entity.dir > 0 : (isPlayer ? entity.facing : entity.dir) < 0) ctx.scale(-1, 1);
    if (entity.inspector && moving) {
      const split = .68, torsoH = h * split, legH = h - torsoH;
      const stride = Math.sin(entity.walkPhase * 1.2);
      // Keep the coat and folder steady; alternate the two legs beneath the hem.
      for (const side of [-1, 1]) {
        const half = side < 0 ? 0 : 1;
        const hipX = side * width * .16, hipY = -legH;
        ctx.save();ctx.translate(hipX, hipY);ctx.rotate(side * stride * .22);
        ctx.drawImage(frame.image, frame.left + half * frame.width / 2,
          frame.top + frame.height * split, frame.width / 2, frame.height * (1 - split),
          -width / 2 + half * width / 2 - hipX, 0, width / 2, legH);
        ctx.restore();
      }
      ctx.drawImage(frame.image,frame.left,frame.top,frame.width,frame.height*split,-width/2,-h,width,torsoH);
    } else {
      ctx.drawImage(frame.image, frame.left, frame.top, frame.width, frame.height, spriteLeft, -h, width, h);
    }
    ctx.restore();
    if(entity.inspector){
      const x=entity.x + entity.dir*26, y=GROUND-108;
      ctx.fillStyle='#d4e8e9';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.lineTo(x,y+40);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#92bbc2';ctx.lineWidth=1;ctx.stroke();
    }
    if (!isPlayer && !entity.decorative) {
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

  function drawExplanation(text, worldX, worldY, zoom, cameraY) {
    const x=(worldX-cameraX)*zoom,y=(worldY-cameraY)*zoom;
    if (x < 0 || x > canvas.width) return;
    ctx.save();ctx.font='22px Georgia';ctx.textAlign='center';
    const width=ctx.measureText(text).width+32;
    const cx=clamp(x,width/2+8,canvas.width-width/2-8);
    ctx.fillStyle='#141919dd';ctx.fillRect(cx-width/2,y-25,width,38);
    ctx.fillStyle='#f3e7cc';ctx.fillText(text,cx,y);ctx.restore();
  }
  function drawExplanations(zoom,cameraY) {
    if(levels[levelIndex].rhythm==='post' && !world.dialogue){
      if(world.player.x<700)drawExplanation('Это почта. Здесь всё движется, кроме очереди.',470,155,zoom,cameraY);
      if(world.player.x>780 && world.player.x<1680)drawExplanation('Это экзистенциальный кризис.',1270,Math.min(H-24,cameraY+canvas.height/zoom-24/zoom),zoom,cameraY);
      if(!postState().parked)drawExplanation('1 · Уберите затор',470,225,zoom,cameraY);
      if(postState().parked && world.player.x<1000)drawExplanation('2 · Тележки: 1 → 2 → 3',1260,50,zoom,cameraY);
      if(postState().crossed && !postState().cargo)drawExplanation('3 · Довезите книги',2190,50,zoom,cameraY);
      drawExplanation('Отправка',3030,170,zoom,cameraY);
    }
    if (levelIndex < 3) {
      drawExplanation('Это мертвец',4530,115,zoom,cameraY);
      drawExplanation('Это особняк',4590,65,zoom,cameraY);
    }
    if (world.quest.gagPhase==='bus') {
      drawExplanation('Это электробус',world.quest.busX+336,GROUND-300,zoom,cameraY);
    }
    if (world.quest.gagPhase==='pilgrims') {
      const actor=world.cast[Math.floor(world.cast.length/2)];
      if(actor)drawExplanation('Это пилигримы',actor.x,GROUND-178,zoom,cameraY);
    }
  }

  function drawComicDialogue(zoom, cameraY, suppliedDialogue, suppliedActor) {
    const dialogue = suppliedDialogue || world.dialogue || world.ambientComic;
    if (!dialogue?.isComic) return;
    if (dialogue.anchor === 'pilgrims') return;
    const line = dialogue.lines[dialogue.panel];
    const partner = line.speaker !== 'Бродский';
    const actor = suppliedActor || (!partner ? world.player :
      (dialogue.actor && world.cast.find(person => person.role === dialogue.actor)) ||
      (dialogue.anchor === 'shop' ? world.cast[2] : world.cast[dialogue.anchor === 'fish' ? 1 : 0]) || world.player);
    if (!actor) return;
    const actorX = (actor.x - cameraX) * zoom;
    if (actorX < 0 || actorX > canvas.width) return;
    const actorHeight = actor === world.player ? (actor.crouching ? 92 : 149) : actor.behindCounter ? 150 : actor.sprite === 5 ? 157 : 137;
    const headY = ((actor.y ?? GROUND) - actorHeight - cameraY) * zoom;
    const padding = 22, lineHeight = 28;
    const maxWidth = Math.min(320, canvas.width - 48);
    ctx.save();
    ctx.font = '22px Georgia';
    const lines = []; let text = '';
    line.text.split(' ').forEach(word => {
      const next = text ? text + ' ' + word : word;
      if (text && ctx.measureText(next).width > maxWidth - padding * 2) {
        lines.push(text); text = word;
      } else text = next;
    });
    if (text) lines.push(text);
    const width = Math.max(112, Math.min(maxWidth, Math.max(...lines.map(text => ctx.measureText(text).width)) + padding * 2));
    const height = lines.length * lineHeight + (dialogue.phoneUi || dialogue.phoneReply ? 58 : 28);
    const x = clamp(actorX - width / 2 + (partner ? 24 : -24), 16, canvas.width - width - 16);
    const y = Math.max(70, headY - height - 28);
    const bottom = y + height, radius = Math.min(28, height / 2);
    const root = clamp(actorX, x + radius + 10, x + width - radius - 10);
    const tipX = clamp(actorX, root - 18, root + 18);
    const tipY = bottom + 20;
    // One continuous outline: rounded balloon and a short, seamless speech tail.
    ctx.fillStyle = dialogue.phoneReply ? '#e0ead8' : '#fff8e8'; ctx.strokeStyle = '#39352e'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, bottom - radius);
    ctx.quadraticCurveTo(x + width, bottom, x + width - radius, bottom);
    ctx.lineTo(root + 9, bottom);
    ctx.quadraticCurveTo(root + 5, bottom + 10, tipX, tipY);
    ctx.quadraticCurveTo(root - 2, bottom + 9, root - 9, bottom);
    ctx.lineTo(x + radius, bottom);
    ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#302c26'; ctx.textAlign = 'center';
    if(dialogue.phoneUi || dialogue.phoneReply){
      ctx.font='bold 12px Arial';ctx.fillText(dialogue.phoneUi?'ТАКСИ · ЗАКАЗ':'ТАКСИ · ОТВЕТ',x+width/2,y+20);
      if(dialogue.phoneUi){ctx.fillStyle='#303b39';ctx.fillRect(x+10,y+30,width-20,height-40);ctx.fillStyle='#fff8e8';}
      ctx.font='22px Georgia';
    }
    lines.forEach((text, index) => ctx.fillText(text, x + width / 2, y + (dialogue.phoneUi || dialogue.phoneReply ? 54 : 34) + index * lineHeight));
    ctx.restore();
  }

  function drawSpeech(viewWidth, zoom, cameraY) {
    const speaking = world.npcs.filter(n => n.speechTimer > 0 && n.x > cameraX - 100 && n.x < cameraX + viewWidth + 100);
    const n=speaking.at(-1);
    if(n) drawComicDialogue(zoom, cameraY, {isComic:true,panel:0,lines:[{speaker:n.name,text:n.line}]}, n);
  }

  function drawHud() {
    const q = world.quest, meter = document.getElementById('humanity');
    meter.setAttribute('aria-valuenow', String(q.health));
    meter.setAttribute('aria-valuetext', q.health + ' из 3');
    document.getElementById('humanity-fill').style.width = (q.health / 3 * 100) + '%';
    meter.classList.toggle('hurt', q.hurtAt != null && world.time - q.hurtAt < .35);
    const status = world.player.hidden ? (world.player.hiddenIn?.kind==='high' ? (world.npcs.some(n => !protectedFrom(n) && dist(n.x,world.player.x)<420) ? 'Укрытие обходят. Уходите.' : 'За укрытием: меняйте сторону') : 'В укрытии') : world.npcs.some(n => n.state === 'chase') ? 'Заметили. Уходите.' : world.npcs.some(n => n.state === 'search') ? 'Вас ищут' : levels[levelIndex].mode ? chapterStatus() : 'Не вступайте в разговор';
    if (statusEl.textContent !== status) statusEl.textContent = status;
    ctx.font = '17px Georgia';
    const statusWidth=Math.min(330,canvas.width-36), statusLines=[];
    let statusLine='';
    for(const word of ((godMode ? 'God · ' : '')+status).split(' ')){
      const next=statusLine ? statusLine+' '+word : word;
      if(statusLine && ctx.measureText(next).width>statusWidth-24){statusLines.push(statusLine);statusLine=word;}else statusLine=next;
    }
    statusLines.push(statusLine);
    ctx.fillStyle='#10171bcc';ctx.fillRect(18,18,statusWidth,18+statusLines.length*22);
    ctx.fillStyle='#e0d7c2';statusLines.forEach((text,i)=>ctx.fillText(text,30,44+i*22));
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  let manualTest = false;
  let testPaused = true;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .033);
    last = now;
    if (!document.hidden && !(manualTest && testPaused)) {
      driveWalkthrough(dt);
      update(dt);
    }
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter','KeyE','KeyR'].includes(e.code)) e.preventDefault();
    if (e.code === 'Enter' && !e.repeat) {
      if (world.dialogue) closeDialogue();
      else if (world.state === 'won' || world.state === 'lost') continueRun();
      return;
    }
    keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) action();
    if ((e.code==='Space' || e.code==='ArrowUp' || e.code==='KeyW') && !e.repeat) {if(levels[levelIndex].furniture || levels[levelIndex].platforming) jump();else if(e.code==='Space') shoot();}
    if (e.code === 'KeyR' && !e.repeat) reloadGun();
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
      if (manualTest) {
        if (prop === 'left' || prop === 'right') {
          const other = prop === 'left' ? 'right' : 'left';
          touch[other] = false; document.getElementById(other).classList.remove('active');
        }
        touch[prop] = !touch[prop]; el.classList.toggle('active', touch[prop]);
        return;
      }
      pointers.add(e.pointerId);
      el.setPointerCapture(e.pointerId);
      touch[prop] = true;
      el.classList.add('active');
    });
    const off = e => {
      if (manualTest) return;
      pointers.delete(e.pointerId);
      touch[prop] = pointers.size > 0;
      el.classList.toggle('active', touch[prop]);
    };
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
  }
  document.getElementById('manual-test').addEventListener('click', () => {
    if (walkthrough.active) toggleAutoplay();
    clearInput(); manualTest = !manualTest; testPaused = true;
    document.body.classList.toggle('manual-testing', manualTest);
    if (manualTest) setGodMode(false);
    const button = document.getElementById('manual-test');
    button.textContent = manualTest ? 'Ручной тест: ВКЛ' : 'Ручной тест: ВЫКЛ';
    button.setAttribute('aria-pressed', String(manualTest));
    ['test-pause', 'test-step', 'test-step-long'].forEach(id => document.getElementById(id).hidden = !manualTest);
    document.getElementById('test-pause').textContent = 'Продолжить сцену';
    last = performance.now();
  });
  document.getElementById('test-pause').addEventListener('click', () => {
    testPaused = !testPaused; last = performance.now();
    document.getElementById('test-pause').textContent = testPaused ? 'Продолжить сцену' : 'Пауза';
  });
  function manualStep(seconds) {
    if (!manualTest || !testPaused) return;
    for (let i = 0; i < Math.round(seconds * 60); i++) update(1 / 60);
    draw();
  }
  document.getElementById('test-step').addEventListener('click', () => manualStep(.5));
  document.getElementById('test-step-long').addEventListener('click', () => manualStep(2));
  document.getElementById('dialogue-next').addEventListener('click', advanceDialogue);
  document.getElementById('autoplay').addEventListener('click', toggleAutoplay);
  document.getElementById('god-mode').addEventListener('click', () => setGodMode(!godMode));
  setGodMode(false);
  bindHold('left', 'left');
  bindHold('right', 'right');
  bindHold('run', 'run');
  bindHold('fire', 'fire');
  bindHold('crouch','crouch');
  document.getElementById('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  document.getElementById('fire').addEventListener('pointerdown', shoot);
  document.getElementById('reload').addEventListener('click', reloadGun);
  document.getElementById('chapter-select').addEventListener('change', e => selectLevel(Number(e.target.value)));
  levels.forEach((level, index) => {
    const option = document.createElement('option'); option.value = String(index); option.textContent = String(index + 1);
    document.getElementById('chapter-select').appendChild(option);
  });
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
