const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 680, H = 480;
const TILE = 32;
const COLS = 40;
const ROWS = 30;

// --- Mapa ---
function generateMap() {
  const map = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
  const rooms = [];

  let attempts = 0;
  while (rooms.length < 6 && attempts < 300) {
    attempts++;
    const rw = 4 + Math.floor(Math.random() * 4);
    const rh = 3 + Math.floor(Math.random() * 3);
    const rx = 1 + Math.floor(Math.random() * (COLS - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (ROWS - rh - 2));

    let ok = true;
    for (const r of rooms) {
      if (rx < r.x + r.w + 2 && rx + rw > r.x - 2 &&
          ry < r.y + r.h + 2 && ry + rh > r.y - 2) {
        ok = false; break;
      }
    }
    if (ok) {
      for (let y = ry; y < ry + rh; y++)
        for (let x = rx; x < rx + rw; x++)
          map[y][x] = 0;
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let cx = Math.floor(a.x + a.w / 2);
    let cy = Math.floor(a.y + a.h / 2);
    const tx = Math.floor(b.x + b.w / 2);
    const ty = Math.floor(b.y + b.h / 2);
    while (cx !== tx) { map[cy][cx] = 0; cx += cx < tx ? 1 : -1; }
    while (cy !== ty) { map[cy][cx] = 0; cy += cy < ty ? 1 : -1; }
  }

  return { map, rooms };
}

let { map, rooms } = generateMap();
let level = 1;
let maxLevelReached = 1;
const TOTAL_LEVELS = 15;

// --- Armas ---
const WEAPONS = [
  { name: 'Pistola',  color: '#fac775', dmg: 20, speed: 7,  rate: 300,  ammo: Infinity },
  { name: 'Escopeta', color: '#F0997B', dmg: 12, speed: 6,  rate: 700,  ammo: 16, pellets: 5, spread: 0.3 },
  { name: 'AK-47',    color: '#9FE1CB', dmg: 15, speed: 9,  rate: 110,  ammo: 30 },
  { name: 'Laser',    color: '#B5D4F4', dmg: 8,  speed: 13, rate: 80,   ammo: 50 },
  { name: 'Cohete',   color: '#E24B4A', dmg: 90, speed: 5,  rate: 1100, ammo: 4  },
];

let currentWeapon = WEAPONS[0];

// --- Personajes ---
const HEROES = [
  { name: 'Guerrero', icon: '🗡️', color: '#AFA9EC', desc: 'Equilibrado. Resistente en combate.', hp: 120, speed: 3,   weapon: 'Pistola',  stats: { HP: '120', Velocidad: 'Media',      Arma: 'Pistola'  } },
  { name: 'Mago',     icon: '🔮', color: '#7F77DD', desc: 'Frágil pero dispara más rápido.',     hp: 80,  speed: 3.2, weapon: 'Laser',    stats: { HP: '80',  Velocidad: 'Media',      Arma: 'Laser'    } },
  { name: 'Pícaro',   icon: '🗡️', color: '#5DCAA5', desc: 'Muy rápido. Ideal para esquivar.',   hp: 90,  speed: 4.5, weapon: 'Pistola',  stats: { HP: '90',  Velocidad: 'Alta',       Arma: 'Pistola'  } },
  { name: 'Ingeniero',icon: '🔧', color: '#EF9F27', desc: 'Especialista en armas pesadas.',      hp: 100, speed: 2.5, weapon: 'Cohete',   stats: { HP: '100', Velocidad: 'Baja',       Arma: 'Cohete'   } },
  { name: 'Caballero',icon: '🛡️', color: '#B5D4F4', desc: 'Máximo HP. Lento pero resistente.',  hp: 150, speed: 2.2, weapon: 'Escopeta', stats: { HP: '150', Velocidad: 'Baja',       Arma: 'Escopeta' } },
  { name: 'Cazador',  icon: '🏹', color: '#9FE1CB', desc: 'Experto en largo alcance.',           hp: 85,  speed: 3.5, weapon: 'AK-47',   stats: { HP: '85',  Velocidad: 'Media-Alta', Arma: 'AK-47'    } },
];

let selectedHero = 0;

// --- Jugador ---
const startRoom = rooms[0];
const player = {
  x: (startRoom.x + Math.floor(startRoom.w / 2)) * TILE,
  y: (startRoom.y + Math.floor(startRoom.h / 2)) * TILE,
  size: 10, speed: 3, angle: 0,
  hp: 100, maxHp: 100, iframes: 0,
};

// --- Arrays ---
const enemies   = [];
const drops     = [];
const hpDrops   = [];
const bullets   = [];
const particles = [];
const revealedTiles = new Set();

function spawnEnemies() {
  enemies.length = 0;
  const isBossFloor = level % 5 === 0;
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    if (isBossFloor && i === rooms.length - 1) {
      enemies.push({
        x: (r.x + Math.floor(r.w / 2)) * TILE,
        y: (r.y + Math.floor(r.h / 2)) * TILE,
        size: 22, speed: 1.2 + level * 0.05,
        hp: 300 + level * 50, maxHp: 300 + level * 50,
        angle: 0, type: 'boss', lastShot: 0, dead: false,
      });
    } else {
      const type = i % 2 === 0 ? 'ranged' : 'melee';
      enemies.push({
        x: (r.x + Math.floor(r.w / 2)) * TILE,
        y: (r.y + Math.floor(r.h / 2)) * TILE,
        size: 10,
        speed: type === 'melee' ? 1.4 + level * 0.1 : 0.7 + level * 0.05,
        hp: (type === 'melee' ? 40 : 30) + level * 10,
        maxHp: (type === 'melee' ? 40 : 30) + level * 10,
        angle: 0, type, lastShot: 0, dead: false,
      });
    }
  }
}

spawnEnemies();

const keys  = {};
const mouse = { x: W / 2, y: H / 2, down: false };
let lastShot      = 0;
let kills         = 0;
let camX = 0, camY = 0;
let gameRunning   = false;
let levelComplete = false;
let paused = false;

// --- Colisión ---
function collidesWithWall(x, y, size) {
  const corners = [
    [x - size, y - size], [x + size, y - size],
    [x - size, y + size], [x + size, y + size],
  ];
  for (const [cx, cy] of corners) {
    const tx = Math.floor(cx / TILE);
    const ty = Math.floor(cy / TILE);
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return true;
    if (map[ty][tx] === 1) return true;
  }
  return false;
}

// --- Partículas ---
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.floor(Math.random() * 20),
      maxLife: 40, color,
    });
  }
}

// --- Revelar tiles ---
function updateRevealedTiles() {
  const px = Math.floor(player.x / TILE);
  const py = Math.floor(player.y / TILE);
  const radius = 4;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        revealedTiles.add(`${px + dx},${py + dy}`);
      }
    }
  }
}

// --- Siguiente piso ---
function nextLevel() {
  level++;
  const data = generateMap();
  map   = data.map;
  rooms = data.rooms;
  const r = rooms[0];
  player.x = (r.x + Math.floor(r.w / 2)) * TILE;
  player.y = (r.y + Math.floor(r.h / 2)) * TILE;
  player.hp = Math.min(player.maxHp, player.hp + 30);
  bullets.length   = 0;
  drops.length     = 0;
  hpDrops.length   = 0;
  particles.length = 0;
  revealedTiles.clear();
  spawnEnemies();
}

function showLevelComplete() {
  levelComplete = true;
  if (level >= maxLevelReached) maxLevelReached = level + 1;
  const el = document.getElementById('levelComplete');
  el.style.display = 'flex';
  document.getElementById('levelCompleteMsg').textContent =
    `Piso ${level} completado — Kills totales: ${kills}`;
}

function continueGame() {
  document.getElementById('levelComplete').style.display = 'none';
  levelComplete = false;
  nextLevel();
}

function gameOver() { gameRunning = false; }

// --- Menú ---
function showMenu() {
  document.getElementById('levelMap').style.display    = 'none';
  document.getElementById('charSelect').style.display  = 'none';
  document.getElementById('menu').style.display        = 'flex';
}

function showLevelMap() {
  document.getElementById('menu').style.display     = 'none';
  document.getElementById('levelMap').style.display = 'flex';
  buildLevelGrid();
}

function buildLevelGrid() {
  const grid = document.getElementById('levelGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const btn = document.createElement('div');
    const completed = i < maxLevelReached;
    const unlocked  = i <= maxLevelReached;
    btn.className = 'level-btn' + (completed ? ' completed' : unlocked ? ' unlocked' : '');
    btn.innerHTML = `
      <span>${i}</span>
      <span class="level-stars">${completed ? '★★★' : unlocked ? '☆☆☆' : '🔒'}</span>
    `;
    if (unlocked) btn.onclick = () => startLevel(i);
    grid.appendChild(btn);
  }
}

function startLevel(n) {
  document.getElementById('levelMap').style.display = 'none';
  level = n;
  const data = generateMap();
  map = data.map; rooms = data.rooms;
  const r = rooms[0];
  player.x = (r.x + Math.floor(r.w / 2)) * TILE;
  player.y = (r.y + Math.floor(r.h / 2)) * TILE;
  player.hp = player.maxHp;
  bullets.length = drops.length = hpDrops.length = particles.length = 0;
  revealedTiles.clear();
  spawnEnemies();
  gameRunning   = true;
  levelComplete = false;
  loop();
}

function buildCharGrid() {
  const grid = document.getElementById('charGrid');
  grid.innerHTML = '';
  HEROES.forEach((h, i) => {
    const card = document.createElement('div');
    card.className = 'char-card' + (i === 0 ? ' selected' : '');
    card.innerHTML = `
      <div class="char-icon">${h.icon}</div>
      <div class="char-name" style="color:${h.color}">${h.name}</div>
      <div class="char-desc">${h.desc}</div>
      <div class="char-stats">
        HP: <span>${h.stats.HP}</span><br>
        Vel: <span>${h.stats.Velocidad}</span><br>
        Arma: <span>${h.stats.Arma}</span>
      </div>
    `;
    card.onclick = () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedHero = i;
    };
    grid.appendChild(card);
  });
}

function startGame() {
  document.getElementById('menu').style.display     = 'none';
  document.getElementById('charSelect').style.display = 'flex';
  buildCharGrid();
}

function confirmChar() {
  document.getElementById('charSelect').style.display = 'none';
  const hero = HEROES[selectedHero];
  player.hp     = hero.hp;
  player.maxHp  = hero.hp;
  player.speed  = hero.speed;
  currentWeapon = WEAPONS.find(w => w.name === hero.weapon) || WEAPONS[0];
  gameRunning   = true;
  levelComplete = false;
  loop();
}

// --- Input ---
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === 'r' || e.key === 'R') && !gameRunning) location.reload();
  if (e.key === 'Escape' && gameRunning) {
    paused ? resumeGame() : pauseGame();
  }
});
window.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', () => mouse.down = true);
canvas.addEventListener('mouseup',   () => mouse.down = false);

function pauseGame() {
  paused = true;
  document.getElementById('pauseMenu').style.display = 'flex';
}

function resumeGame() {
  paused = false;
  document.getElementById('pauseMenu').style.display = 'none';
}

function quitToMenu() {
  paused = false;
  gameRunning = false;
  levelComplete = false;
  document.getElementById('pauseMenu').style.display = 'none';
  document.getElementById('levelComplete').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';
}

// --- Update ---
function update() {
  camX = Math.max(0, Math.min(player.x - W / 2, COLS * TILE - W));
  camY = Math.max(0, Math.min(player.y - H / 2, ROWS * TILE - H));

  updateRevealedTiles();

  const worldMouseX = mouse.x + camX;
  const worldMouseY = mouse.y + camY;
  player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

  let dx = 0, dy = 0;
  if (keys['a'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['d'] || keys['ArrowRight']) dx += 1;
  if (keys['w'] || keys['ArrowUp'])    dy -= 1;
  if (keys['s'] || keys['ArrowDown'])  dy += 1;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) { dx /= len; dy /= len; }

  const nx = player.x + dx * player.speed;
  const ny = player.y + dy * player.speed;
  if (!collidesWithWall(nx, player.y, player.size)) player.x = nx;
  if (!collidesWithWall(player.x, ny, player.size)) player.y = ny;

  if (player.iframes > 0) player.iframes--;

  const now = Date.now();
  if (mouse.down && now - lastShot > currentWeapon.rate) {
    lastShot = now;
    const pellets = currentWeapon.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const spread = currentWeapon.spread || 0;
      const angle  = player.angle + (Math.random() - 0.5) * spread;
      bullets.push({
        x: player.x, y: player.y,
        vx: Math.cos(angle) * currentWeapon.speed,
        vy: Math.sin(angle) * currentWeapon.speed,
        dmg: currentWeapon.dmg, life: 90, owner: 'player',
      });
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy; b.life--;
    const tx = Math.floor(b.x / TILE);
    const ty = Math.floor(b.y / TILE);
    const hitWall = ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS || map[ty][tx] === 1;
    if (b.life <= 0 || hitWall) { bullets.splice(i, 1); continue; }

    if (b.owner === 'enemy') {
      const dx = b.x - player.x, dy = b.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < player.size + 4 && player.iframes === 0) {
        player.hp -= 15; player.iframes = 30;
        spawnParticles(player.x, player.y, '#e24b4a', 6);
        bullets.splice(i, 1);
      }
      continue;
    }

    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = b.x - e.x, ey = b.y - e.y;
      if (Math.sqrt(ex * ex + ey * ey) < e.size + 4) {
        e.hp -= b.dmg || 20;
        if (e.hp <= 0) {
          e.dead = true; kills++;
          spawnParticles(e.x, e.y, e.type === 'boss' ? '#E24B4A' : e.type === 'melee' ? '#D4537E' : '#7F77DD', 14);
          if (Math.random() < 0.3) drops.push({ x: e.x, y: e.y, weapon: WEAPONS[Math.floor(Math.random() * WEAPONS.length)] });
          if (Math.random() < 0.4) hpDrops.push({ x: e.x, y: e.y, amount: 20 });
        }
        bullets.splice(i, 1); hit = true; break;
      }
    }
    if (hit) continue;
  }

  const now2 = Date.now();
  for (const e of enemies) {
    if (e.dead) continue;
    const edx = player.x - e.x;
    const edy = player.y - e.y;
    const elen = Math.sqrt(edx * edx + edy * edy);
    e.angle = Math.atan2(edy, edx);

    if (e.type === 'melee') {
      if (elen > 0) {
        const enx = e.x + (edx / elen) * e.speed;
        const eny = e.y + (edy / elen) * e.speed;
        if (!collidesWithWall(enx, e.y, e.size)) e.x = enx;
        if (!collidesWithWall(e.x, eny, e.size)) e.y = eny;
      }
      if (player.iframes === 0 && elen < e.size + player.size) {
        player.hp -= 10; player.iframes = 40;
        spawnParticles(player.x, player.y, '#e24b4a', 6);
      }
    } else if (e.type === 'ranged') {
      if (elen > 120) {
        const enx = e.x + (edx / elen) * e.speed;
        const eny = e.y + (edy / elen) * e.speed;
        if (!collidesWithWall(enx, e.y, e.size)) e.x = enx;
        if (!collidesWithWall(e.x, eny, e.size)) e.y = eny;
      }
      if (elen < 200 && now2 - e.lastShot > 1500) {
        e.lastShot = now2;
        bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle) * 4, vy: Math.sin(e.angle) * 4, dmg: 12, life: 100, owner: 'enemy' });
      }
    } else if (e.type === 'boss') {
      if (elen > 0) {
        const enx = e.x + (edx / elen) * e.speed;
        const eny = e.y + (edy / elen) * e.speed;
        if (!collidesWithWall(enx, e.y, e.size)) e.x = enx;
        if (!collidesWithWall(e.x, eny, e.size)) e.y = eny;
      }
      if (elen < 300 && now2 - e.lastShot > 900) {
        e.lastShot = now2;
        for (let s = -1; s <= 1; s++) {
          const a = e.angle + s * 0.3;
          bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, dmg: 20, life: 120, owner: 'enemy' });
        }
      }
      if (player.iframes === 0 && elen < e.size + player.size) {
        player.hp -= 20; player.iframes = 50;
        spawnParticles(player.x, player.y, '#e24b4a', 10);
      }
    }
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    const dx = player.x - d.x, dy = player.y - d.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) { currentWeapon = d.weapon; drops.splice(i, 1); }
  }

  for (let i = hpDrops.length - 1; i >= 0; i--) {
    const h = hpDrops[i];
    const dx = player.x - h.x, dy = player.y - h.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      player.hp = Math.min(player.maxHp, player.hp + h.amount);
      spawnParticles(player.x, player.y, '#9FE1CB', 6);
      hpDrops.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (enemies.length > 0 && enemies.every(e => e.dead) && !levelComplete) showLevelComplete();
  if (player.hp <= 0) { player.hp = 0; gameOver(); }
}

// --- Draw ---
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-camX, -camY);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE, py = y * TILE;
      const isRevealed = revealedTiles.has(`${x},${y}`);
      if (!isRevealed) {
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, TILE, TILE);
        continue;
      }
      if (map[y][x] === 1) {
        ctx.fillStyle = '#16213e'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#1f2f5a'; ctx.fillRect(px, py, TILE, 3);
        ctx.fillStyle = '#1a2850'; ctx.fillRect(px, py, 3, TILE);
        ctx.fillStyle = '#0a0f1e'; ctx.fillRect(px, py + TILE - 3, TILE, 3);
      } else {
        ctx.fillStyle = '#0e2140'; ctx.fillRect(px, py, TILE, TILE);
        if ((x + y) % 4 === 0) { ctx.fillStyle = '#0a1b30'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4); }
        if ((x * 3 + y * 7) % 11 === 0) { ctx.fillStyle = '#0d2348'; ctx.fillRect(px + TILE / 2 - 1, py + TILE / 2 - 1, 2, 2); }
      }
    }
  }

  for (const h of hpDrops) {
    ctx.fillStyle = '#9FE1CB33';
    ctx.beginPath(); ctx.arc(h.x, h.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9FE1CB'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#9FE1CB'; ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center'; ctx.fillText('+', h.x, h.y + 4); ctx.textAlign = 'left';
  }

  for (const d of drops) {
    ctx.fillStyle = d.weapon.color + '33';
    ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = d.weapon.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(d.x, d.y);
    ctx.fillStyle = d.weapon.color; ctx.fillRect(-8, -2, 16, 4);
    ctx.fillStyle = '#aaa'; ctx.fillRect(4, -1.5, 8, 3);
    ctx.restore();
    ctx.fillStyle = d.weapon.color; ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center'; ctx.fillText(d.weapon.name, d.x, d.y - 16); ctx.textAlign = 'left';
  }

  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const b of bullets) {
    ctx.fillStyle = b.owner === 'enemy' ? '#e24b4a' : currentWeapon.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  for (const e of enemies) {
    if (e.dead) continue;
    if (!revealedTiles.has(`${Math.floor(e.x/TILE)},${Math.floor(e.y/TILE)}`)) continue;
    ctx.save(); ctx.translate(e.x, e.y);

    if (e.type === 'boss') {
      const pulse = Math.sin(Date.now() / 200) * 2;
      ctx.fillStyle = '#E24B4A';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2 / 5) - Math.PI / 2;
        const r = i % 2 === 0 ? e.size + pulse : e.size * 0.5;
        i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath();
      ctx.arc(Math.cos(e.angle)*4, Math.sin(e.angle)*4, 5, 0, Math.PI*2); ctx.fill();
    } else if (e.type === 'melee') {
      ctx.fillStyle = '#D4537E'; ctx.fillRect(-7, -4, 14, 12);
      ctx.fillStyle = '#ED93B1'; ctx.beginPath(); ctx.arc(0, -9, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(3, -10, 2, 0, Math.PI*2); ctx.fill();
      ctx.save(); ctx.rotate(e.angle); ctx.fillStyle = '#aaa'; ctx.fillRect(6, -2, 10, 3); ctx.restore();
    } else {
      ctx.fillStyle = '#7F77DD'; ctx.fillRect(-6, -4, 12, 11);
      ctx.fillStyle = '#AFA9EC'; ctx.beginPath(); ctx.arc(0, -9, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#534AB7'; ctx.fillRect(-7, -17, 14, 5); ctx.fillRect(-4, -22, 8, 6);
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(3, -10, 2, 0, Math.PI*2); ctx.fill();
      ctx.save(); ctx.rotate(e.angle); ctx.fillStyle = '#fac775'; ctx.fillRect(6, -2, 12, 3); ctx.restore();
    }
    ctx.restore();

    const barW = e.type === 'boss' ? 60 : 30;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(e.x - barW/2, e.y - e.size - 10, barW, 5);
    ctx.fillStyle = e.type === 'boss' ? '#E24B4A' : e.type === 'melee' ? '#D4537E' : '#7F77DD';
    ctx.fillRect(e.x - barW/2, e.y - e.size - 10, barW * (e.hp/e.maxHp), 5);
    if (e.type === 'boss') {
      ctx.fillStyle = '#E24B4A'; ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center'; ctx.fillText('BOSS', e.x, e.y - e.size - 14); ctx.textAlign = 'left';
    }
  }

  if (player.iframes === 0 || Math.floor(player.iframes / 4) % 2 === 0) {
    ctx.save(); ctx.translate(player.x, player.y);
    const flip = Math.abs(player.angle) > Math.PI / 2 ? -1 : 1;
    ctx.scale(flip, 1);
    ctx.fillStyle = '#AFA9EC'; ctx.fillRect(-6, -2, 12, 10);
    ctx.fillStyle = '#CECBF6'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(3, -9, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.fillStyle = currentWeapon.color; ctx.fillRect(4, -2, 14, 4);
    ctx.restore();
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = '#555'; ctx.fillRect(10, 10, 150, 14);
  ctx.fillStyle = '#e24b4a'; ctx.fillRect(10, 10, 150 * (player.hp/player.maxHp), 14);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(10, 10, 150, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
  ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`, 14, 21);
  ctx.fillStyle = currentWeapon.color; ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center'; ctx.fillText(currentWeapon.name, W/2, 21); ctx.textAlign = 'left';
  if (level % 5 === 0) {
    ctx.fillStyle = '#E24B4A'; ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center'; ctx.fillText('⚠ PISO DEL JEFE ⚠', W/2, 34); ctx.textAlign = 'left';
  }
  ctx.fillStyle = '#aaa'; ctx.font = '11px monospace';
  ctx.fillText(`Piso: ${level}  Kills: ${kills}`, W - 140, 21);
}

// --- Loop ---
function loop() {
  if (!gameRunning) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e24b4a'; ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W/2, H/2 - 20);
    ctx.fillStyle = '#aaa'; ctx.font = '16px monospace';
    ctx.fillText(`Piso: ${level}  Kills: ${kills}`, W/2, H/2 + 20);
    ctx.fillText('Presiona R para reiniciar', W/2, H/2 + 50);
    ctx.textAlign = 'left';
    requestAnimationFrame(loop); return;
  }
  if (levelComplete) { draw(); requestAnimationFrame(loop); return; }
  if (paused) { requestAnimationFrame(loop); return; }
  update(); draw();
  requestAnimationFrame(loop);
}