export const chapters = [{
  id: 'room',
  title: '01 · Не выходи',
  bg: 'room-interior-v17',
  width: 1800,
  type: 'story',
  steps: [
    ['book', 450, 'Взять книгу', 'Книга — с собой.'],
    ['door', 1450, 'Открыть дверь', 'Не выходи из комнаты. Но газета сама не придёт.']
  ]
}, {
  id: 'communal',
  title: '02 · Коммунальная квартира',
  bg: 'passage-courtyard',
  width: 4600,
  type: 'stealth',
  steps: [
    ['vendor', 900, 'Пройти очередь', 'В очереди один человек. Он стоит за вами.'],
    ['clerk', 2200, 'Ответить соседке', '— Ну как оно?\n— Нормально.'],
    ['cabinet', 3900, 'Проверить лифт', 'Первый этаж. Лифт поехал вниз.']
  ]
}, {
  id: 'yard',
  title: '03 · Двор-колодец',
  bg: 'courtyard',
  width: 7200,
  type: 'stealth',
  steps: [
    ['bench', 1900, 'Переждать у скамейки', 'На скамейке безопасно.'],
    ['newspaper', 5700, 'Поднять записку', '«Не вызывай мотора».']
  ]
}, {
  id: 'bus',
  title: '04 · Это электробус',
  bg: 'tram-street',
  width: 6400,
  type: 'transport',
  steps: [
    ['bus', 1100, 'Подойти к остановке', 'Это электробус'],
    ['pilgrims', 4700, 'Продолжить путь', '']
  ]
}, {
  id: 'rurik',
  title: '05 · Рюрик',
  bg: 'world-city',
  width: 6000,
  type: 'stealth',
  steps: [
    ['rurik', 2400, 'Поговорить с Рюриком', '— Спрашивай.\n— Что спросить с тебя, Рюрик?']
  ]
}, {
  id: 'fish',
  title: '06 · Рыбная лавка',
  bg: 'fish-stall',
  width: 2400,
  type: 'fish',
  steps: [
    ['fish', 650, 'Взять рыбу', 'Рыба взята.'],
    ['caviar', 1800, 'Взять икру', 'Икра взята. Рыбу нужно вернуть.'],
    ['fish', 650, 'Вернуть рыбу', 'Зачем нам рыба, раз есть икра.']
  ]
}, {
  id: 'sleepwalker',
  title: '07 · Сомнамбула',
  bg: 'passage-courtyard',
  width: 7400,
  type: 'stealth',
  steps: [
    ['somna', 3600, 'Пропустить сомнамбулу', 'Он идёт во сне. Не будите.']
  ]
}, {
  id: 'post',
  title: '08 · Почта',
  bg: 'post-office',
  width: 2600,
  type: 'post',
  steps: [
    ['book', 400, 'Собрать книги', 'Постуму. Одному Постуму.'],
    ['parcel', 1000, 'Упаковать книги', 'Книги перевязаны.'],
    ['clerk', 1850, 'Поставить три штемпеля',
      '— Откуда? — Ниоткуда.\n— Дата? — Надцатое мартобря.\n— Вручную пробьём.'
    ]
  ]
}, {
  id: 'garden',
  title: '09 · Звёзды в саду',
  bg: 'advert-star',
  width: 6800,
  type: 'light',
  steps: [
    ['cabinet', 900, 'Найти выключатель', 'Три рекламные звезды закрывают небо.'],
    ['cabinet', 2600, 'Отключить первую звезду', ''],
    ['cabinet', 4400, 'Отключить вторую звезду', ''],
    ['cabinet', 6100, 'Отключить третью звезду', 'Наконец-то звёзды.']
  ]
}, {
  id: 'tram',
  title: '10 · Рождественский трамвай',
  bg: 'christmas-tram',
  width: 6200,
  type: 'transport',
  steps: [
    ['tram', 1000, 'Войти в трамвай', 'Трамвай есть. Рельсов нет.'],
    ['somna', 3300, 'Проверить пассажира', 'Джон Донн спит.'],
    ['door', 5600, 'Сойти на остановке', '']
  ]
}, {
  id: 'vo',
  title: '11 · В.О.',
  bg: 'embankment-vo',
  width: 4600,
  type: 'story',
  steps: [
    ['clerk', 1100, 'Подойти к окошку', '— Цель визита?\n— Умирать.\n— Вы первично или повторно?'],
    ['newspaper', 3500, 'Забрать справку', 'В справке: «По месту требования».']
  ]
}, {
  id: 'facade',
  title: '12 · Тёмно-синий фасад',
  bg: 'embankment-vo',
  width: 6800,
  type: 'light',
  steps: [
    ['door', 1400, 'Проверить адрес', 'Не тот дом.'],
    ['door', 3800, 'Проверить второй адрес', 'Тоже не тот.'],
    ['clerk', 5900, 'Уточнить цвет', '— Он был синий?\n— По документам — синий.']
  ]
}, {
  id: 'housing',
  title: '13 · Итого к оплате',
  bg: 'luggage-hall',
  width: 8600,
  type: 'shooter',
  arenas: 7,
  boss: 'receipt',
  steps: [
    ['clerk', 600, 'Получить квитанцию', '— Это всё?\n— Пени ещё растут.'],
    ['newspaper', 8000, 'Забрать оплаченную квитанцию', 'Итого к оплате: ничего.']
  ]
}, {
  id: 'cage',
  title: '14 · Пост сдал',
  bg: 'cage-hall',
  width: 3800,
  type: 'puzzle',
  steps: [
    ['monster', 500, 'Принять смену', '— Пост сдал.\n— Кружку забыл.'],
    ['cage', 1200, 'Снять первый засов', ''],
    ['cage', 2500, 'Снять второй засов', ''],
    ['cabinet', 3200, 'Поднять рычаг', 'Зверь оставил записку: «На обеде».']
  ]
}, {
  id: 'luggage',
  title: '15 · Чемодан',
  bg: 'luggage-hall',
  width: 10000,
  type: 'shooter',
  arenas: 9,
  steps: [
    ['book', 500, 'Открыть чемодан', 'Внутри не только книги.'],
    ['parcel', 9400, 'Закрыть чемодан', 'Лишний багаж рассеялся.']
  ]
}, {
  id: 'pawnshop',
  title: '16 · Ломбард',
  bg: 'pawnshop',
  width: 3600,
  type: 'puzzle',
  steps: [
    ['clerk', 600, 'Заложить пистолет', 'Оружие принято. Квитанцию сохраните.'],
    ['gramophone', 1700, 'Взять патефон', ''],
    ['gramophone', 2800, 'Завести патефон', 'Сосед танцует. Проход свободен.']
  ]
}, {
  id: 'atelier',
  title: '17 · Биография рыжему',
  bg: 'passage-courtyard',
  width: 4600,
  type: 'story',
  steps: [
    ['vendor', 1000, 'Зайти в ателье', '— Что шьёте?\n— Биографию рыжему.'],
    ['clerk', 3200, 'Посмотреть готовую работу', '— Какую биографию нашему рыжему шьют?\n— Парадную.']
  ]
}, {
  id: 'bread',
  title: '18 · Хлеб без корки',
  bg: 'world-storefront-v17',
  width: 5200,
  type: 'puzzle',
  steps: [
    ['vendor', 1000, 'Заказать хлеб', 'Хлеб без корки.'],
    ['book', 2400, 'Забрать свёрток', ''],
    ['vendor', 1000, 'Проверить заказ', 'Корку отдельно положили.'],
    ['newspaper', 4400, 'Забрать письмо', 'Адресат: «Мне». Письмо помещается только в карман.']
  ]
}, {
  id: 'night',
  title: '19 · Ночной слой',
  bg: 'final-chase',
  width: 9800,
  type: 'shooter',
  arenas: 9,
  steps: [
    ['cabinet', 500, 'Включить ночное освещение', '— Что это за тоска?\n— Необъяснимая.'],
    ['door', 9200, 'Открыть ночной проход', '']
  ]
}, {
  id: 'boiler',
  title: '20 · Котельная',
  bg: 'boiler-fight',
  width: 4400,
  type: 'fight',
  steps: [
    ['monster', 2200, 'Остановить котельную тень', 'Котельная гудит. Переждите замах, затем ударьте.'],
    ['cabinet', 3800, 'Закрыть вентиль', 'Теперь слышно собственные шаги.']
  ]
}, {
  id: 'flood',
  title: '21 · Венеция',
  bg: 'tram-street',
  width: 7200,
  type: 'platform',
  steps: [
    ['bench', 1400, 'Осмотреть лужу', 'Венеция. Только маленькая.'],
    ['newspaper', 6200, 'Поднять мокрую газету', 'Октябрь. Листья — тоже новости.']
  ]
}, {
  id: 'chase',
  title: '22 · Последняя погоня',
  bg: 'final-chase',
  width: 9800,
  type: 'chase',
  steps: [
    ['cabinet', 3300, 'Открыть первый проход', ''],
    ['door', 6700, 'Открыть второй проход', '']
  ]
}, {
  id: 'shop',
  title: '23 · Вечерняя газета',
  bg: 'world-storefront-v17',
  width: 3600,
  type: 'story',
  steps: [
    ['clerk', 2100, 'Купить газету', '— Вчерашнюю или сегодняшнюю?\n— Вечернюю.']
  ]
}, {
  id: 'return',
  title: '24 · Комната',
  bg: 'room-interior-v17',
  width: 1800,
  type: 'ending',
  steps: [
    ['door', 450, 'Закрыть дверь', ''],
    ['newspaper', 1250, 'Развернуть газету', 'НИЧЕГО НЕ ПРОИЗОШЛО']
  ]
}];
// Long outdoor chapters use several streets and checkpoints; interior puzzles stay compact.
const routeWidths = {
  communal: 10800,
  yard: 16800,
  bus: 6400,
  rurik: 14200,
  sleepwalker: 16200,
  garden: 14600,
  tram: 8200,
  vo: 7800,
  facade: 15600,
  housing: 21800,
  cage: 6200,
  luggage: 23800,
  pawnshop: 7200,
  atelier: 9400,
  bread: 7800,
  night: 23800,
  boiler: 6400,
  flood: 16200,
  chase: 21400,
  shop: 5800
};
for (const chapter of chapters) {
  const nextWidth = routeWidths[chapter.id];
  if (!nextWidth) continue;
  const ratio = nextWidth / chapter.width;
  chapter.steps = chapter.steps.map((step, i) => [step[0], chapter.type === 'shooter' && i === 0 ? step[1] :
    chapter.type === 'fight' && i === 0 ? 2200 : Math.round(step[1] * ratio), step[2], step[3]
  ]);
  chapter.width = nextWidth;
  if (chapter.type === 'shooter') chapter.arenas = chapter.id === 'housing' ? 18 : 20;
}
export const lines = ['Гражданин, здесь прохода нет. Для кого я метлу поставил?',
  'Вы из двенадцатой? У вас опять вода до нас дошла.',
  'Мужчина, берите рыбу. Завтра такую уже не привезут.', 'Кто последний? Я только спросить.',
  'Сосед, картошки не одолжите?', 'Счётчик опять крутится. Даже когда никто не живёт.',
  'Иосиф Александрович, я тут стих написала.', 'За вами занимали. Вас пока не было.',
  'Дверь прикройте, дует.', 'Сегодня приём до вчерашнего дня.'
];
export const isCombat = c => c.type === 'shooter' || c.type === 'fight';
export function freshState(index = 0) {
  return {
    index,
    x: 160,
    y: 600,
    vy: 0,
    face: 1,
    hp: 5,
    step: 0,
    kills: 0,
    arena: 0,
    stamps: 0,
    misses: 0,
    hidden: false,
    crouch: false,
    invuln: 0,
    cooldown: 0,
    time: 0,
    enemies: [],
    bullets: [],
    enemyShots: [],
    done: false,
    dead: false,
    checkpointX: 160,
    checkpointStep: 0
  };
}
export function hitSegment(a, b, e) {
  let t0 = 0,
    t1 = 1;
  for (const [p, d, lo, hi] of [
      [a.x, b.x - a.x, e.x - e.w / 2, e.x + e.w / 2],
      [a.y, b.y - a.y, e.y - e.h, e.y]
    ]) {
    if (Math.abs(d) < .00001) {
      if (p < lo || p > hi) return false;
    } else {
      let u = (lo - p) / d,
        v = (hi - p) / d;
      if (u > v)[u, v] = [v, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, v);
      if (t0 > t1) return false;
    }
  }
  return true;
}
export function canFinish(s, c) {
  return s.step === c.steps.length && (!isCombat(c) || (s.arena === (c.arenas || 1) && s.enemies.length ===
    0));
}
export function stamp(s) {
  const p = (s.time % 2.4) / 2.4;
  if (p >= .36 && p <= .64) {
    s.stamps++;
    return true;
  }
  s.misses++;
  return false;
}
