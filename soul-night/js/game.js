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

// --- Armas ---
const WEAPONS = [
  { name: 'Pistola',  color: '#fac775', dmg: 20, speed: 7,  rate: 300,  ammo: Infinity },
  { name: 'Escopeta', color: '#F0997B', dmg: 12, speed: 6,  rate: 700,  ammo: 16, pellets: 5, spread: 0.3 },
  { name: 'AK-47',    color: '#9FE1CB', dmg: 15, speed: 9,  rate: 110,  ammo: 30 },
  { name: 'Laser',    color: '#B5D4F4', dmg: 8,  speed: 13, rate: 80,   ammo: 50 },
  { name: 'Cohete',   color: '#E24B4A', dmg: 90, speed: 5,  rate: 1100, ammo: 4  },
];

let currentWeapon = WEAPONS[0];
const drops = [];

// --- Jugador ---
const startRoom = rooms[0];
const player = {
  x: (startRoom.x + Math.floor(startRoom.w / 2)) * TILE,
  y: (startRoom.y + Math.floor(startRoom.h / 2)) * TILE,
  size: 10,
  speed: 3,
  angle: 0,
  hp: 100, maxHp: 100,
  iframes: 0,
};

// --- Enemigos ---
const enemies = [];
for (let i = 1; i < rooms.length; i++) {
  const r = rooms[i];
  const type = i % 2 === 0 ? 'ranged' : 'melee';
  enemies.push({
    x: (r.x + Math.floor(r.w / 2)) * TILE,
    y: (r.y + Math.floor(r.h / 2)) * TILE,
    size: 10,
    speed: type === 'melee' ? 1.4 : 0.7,
    hp: type === 'melee' ? 40 : 30,
    maxHp: type === 'melee' ? 40 : 30,
    angle: 0, type, lastShot: 0, dead: false,
  });
}

const bullets = [];
const particles = [];
const keys = {};
const mouse = { x: W / 2, y: H / 2, down: false };
let lastShot = 0;
let kills = 0;
let camX = 0, camY = 0;
let gameRunning = true;
let level = 1;

// --- Colisión con muros ---
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
      maxLife: 40,
      color,
    });
  }
}

// --- Siguiente piso ---
function nextLevel() {
  level++;
  const data = generateMap();
  map = data.map;
  rooms = data.rooms;
  const r = rooms[0];
  player.x = (r.x + Math.floor(r.w / 2)) * TILE;
  player.y = (r.y + Math.floor(r.h / 2)) * TILE;
  player.hp = Math.min(player.maxHp, player.hp + 30);
  bullets.length = 0;
  drops.length = 0;
  particles.length = 0;
  enemies.length = 0;
  for (let i = 1; i < rooms.length; i++) {
    const rm = rooms[i];
    const type = i % 2 === 0 ? 'ranged' : 'melee';
    enemies.push({
      x: (rm.x + Math.floor(rm.w / 2)) * TILE,
      y: (rm.y + Math.floor(rm.h / 2)) * TILE,
      size: 10,
      speed: type === 'melee' ? 1.4 + level * 0.1 : 0.7 + level * 0.05,
      hp: (type === 'melee' ? 40 : 30) + level * 10,
      maxHp: (type === 'melee' ? 40 : 30) + level * 10,
      angle: 0, type, lastShot: 0, dead: false,
    });
  }
}

function gameOver() {
  gameRunning = false;
}

// --- Input ---
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === 'r' || e.key === 'R') && !gameRunning) location.reload();
});
window.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', () => mouse.down = true);
canvas.addEventListener('mouseup',   () => mouse.down = false);

// --- Update ---
function update() {
  camX = Math.max(0, Math.min(player.x - W / 2, COLS * TILE - W));
  camY = Math.max(0, Math.min(player.y - H / 2, ROWS * TILE - H));

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
      const angle = player.angle + (Math.random() - 0.5) * spread;
      bullets.push({
        x: player.x, y: player.y,
        vx: Math.cos(angle) * currentWeapon.speed,
        vy: Math.sin(angle) * currentWeapon.speed,
        dmg: currentWeapon.dmg,
        life: 90,
        owner: 'player',
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
        player.hp -= 15;
        player.iframes = 30;
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
          e.dead = true;
          kills++;
          spawnParticles(e.x, e.y, e.type === 'melee' ? '#D4537E' : '#7F77DD', 10);
          if (Math.random() < 0.3) {
            const idx = Math.floor(Math.random() * WEAPONS.length);
            drops.push({ x: e.x, y: e.y, weapon: WEAPONS[idx] });
          }
        }
        bullets.splice(i, 1);
        hit = true; break;
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
    } else {
      if (elen > 120) {
        const enx = e.x + (edx / elen) * e.speed;
        const eny = e.y + (edy / elen) * e.speed;
        if (!collidesWithWall(enx, e.y, e.size)) e.x = enx;
        if (!collidesWithWall(e.x, eny, e.size)) e.y = eny;
      }
      if (elen < 200 && now2 - e.lastShot > 1500) {
        e.lastShot = now2;
        bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(e.angle) * 4,
          vy: Math.sin(e.angle) * 4,
          life: 100,
          owner: 'enemy',
        });
      }
    }

    if (player.iframes === 0 && elen < e.size + player.size) {
      player.hp -= 10;
      player.iframes = 40;
      spawnParticles(player.x, player.y, '#e24b4a', 6);
    }
  }

  // Recoger armas
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    const dx = player.x - d.x, dy = player.y - d.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      currentWeapon = d.weapon;
      drops.splice(i, 1);
    }
  }

  // Actualizar partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Siguiente piso
  if (enemies.length > 0 && enemies.every(e => e.dead)) {
    nextLevel();
  }

  // Game Over
  if (player.hp <= 0) {
    player.hp = 0;
    gameOver();
  }
}

// --- Draw ---
function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-camX, -camY);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (map[y][x] === 1) {
        ctx.fillStyle = '#16213e';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.fillStyle = '#0f0f23';
        ctx.fillRect(x * TILE, y * TILE, TILE, 1);
        ctx.fillRect(x * TILE, y * TILE, 1, TILE);
      } else {
        ctx.fillStyle = '#0e2140';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // Drops
  for (const d of drops) {
    ctx.fillStyle = d.weapon.color;
    ctx.fillRect(d.x - 8, d.y - 4, 16, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.weapon.name, d.x, d.y - 8);
    ctx.textAlign = 'left';
  }

  // Partículas
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Balas
  for (const b of bullets) {
    ctx.fillStyle = b.owner === 'enemy' ? '#e24b4a' : currentWeapon.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemigos
  for (const e of enemies) {
    if (e.dead) continue;
    ctx.fillStyle = e.type === 'melee' ? '#D4537E' : '#7F77DD';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(e.x - 14, e.y - 18, 28, 4);
    ctx.fillStyle = '#e24b4a';
    ctx.fillRect(e.x - 14, e.y - 18, 28 * (e.hp / e.maxHp), 4);
  }

  // Jugador
  if (player.iframes === 0 || Math.floor(player.iframes / 4) % 2 === 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    const flip = Math.abs(player.angle) > Math.PI / 2 ? -1 : 1;
    ctx.scale(flip, 1);

    ctx.fillStyle = '#AFA9EC';
    ctx.fillRect(-6, -2, 12, 10);

    ctx.fillStyle = '#CECBF6';
    ctx.beginPath();
    ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(3, -9, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = currentWeapon.color;
    ctx.fillRect(4, -2, 14, 4);
    ctx.restore();
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, 36);

  ctx.fillStyle = '#555';
  ctx.fillRect(10, 10, 150, 14);
  ctx.fillStyle = '#e24b4a';
  ctx.fillRect(10, 10, 150 * (player.hp / player.maxHp), 14);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 150, 14);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`, 14, 21);

  ctx.fillStyle = currentWeapon.color;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(currentWeapon.name, W / 2, 21);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#aaa';
  ctx.font = '11px monospace';
  ctx.fillText(`Piso: ${level}  Kills: ${kills}`, W - 140, 21);
}

// --- Loop ---
function loop() {
  if (!gameRunning) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e24b4a';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText(`Kills: ${kills}`, W / 2, H / 2 + 20);
    ctx.fillText('Presiona R para reiniciar', W / 2, H / 2 + 50);
    ctx.textAlign = 'left';
    requestAnimationFrame(loop);
    return;
  }
  update();
  draw();
  requestAnimationFrame(loop);
}
// --- Personajes ---
const HEROES = [
  {
    name: 'Guerrero',
    icon: '🗡️',
    color: '#AFA9EC',
    desc: 'Equilibrado. Resistente en combate cuerpo a cuerpo.',
    hp: 120, speed: 3,
    weapon: 'Pistola',
    stats: { HP: '120', Velocidad: 'Media', Arma: 'Pistola' },
  },
  {
    name: 'Mago',
    icon: '🔮',
    color: '#7F77DD',
    desc: 'Frágil pero dispara más rápido y con más alcance.',
    hp: 80, speed: 3.2,
    weapon: 'Laser',
    stats: { HP: '80', Velocidad: 'Media', Arma: 'Laser' },
  },
  {
    name: 'Pícaro',
    icon: '🗡️',
    color: '#5DCAA5',
    desc: 'Muy rápido. Ideal para esquivar y atacar.',
    hp: 90, speed: 4.5,
    weapon: 'Pistola',
    stats: { HP: '90', Velocidad: 'Alta', Arma: 'Pistola' },
  },
  {
    name: 'Ingeniero',
    icon: '🔧',
    color: '#EF9F27',
    desc: 'Especialista en armas pesadas. Empieza con cohete.',
    hp: 100, speed: 2.5,
    weapon: 'Cohete',
    stats: { HP: '100', Velocidad: 'Baja', Arma: 'Cohete' },
  },
  {
    name: 'Caballero',
    icon: '🛡️',
    color: '#B5D4F4',
    desc: 'Máximo HP. Lento pero muy resistente.',
    hp: 150, speed: 2.2,
    weapon: 'Escopeta',
    stats: { HP: '150', Velocidad: 'Baja', Arma: 'Escopeta' },
  },
  {
    name: 'Cazador',
    icon: '🏹',
    color: '#9FE1CB',
    desc: 'Experto en armas de largo alcance.',
    hp: 85, speed: 3.5,
    weapon: 'AK-47',
    stats: { HP: '85', Velocidad: 'Media-Alta', Arma: 'AK-47' },
  },
];

let selectedHero = 0;

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
  document.getElementById('menu').style.display = 'none';
  document.getElementById('charSelect').style.display = 'flex';
  buildCharGrid();
}

function confirmChar() {
  document.getElementById('charSelect').style.display = 'none';
  const hero = HEROES[selectedHero];
  player.hp = hero.hp;
  player.maxHp = hero.hp;
  player.speed = hero.speed;
  currentWeapon = WEAPONS.find(w => w.name === hero.weapon) || WEAPONS[0];
  loop();
}

// loop arranca desde el menu