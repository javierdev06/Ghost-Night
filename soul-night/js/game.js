const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 680, H = 480;
const TILE = 32;
const COLS = Math.floor(W / TILE);
const ROWS = Math.floor(H / TILE);

// --- Mapa (1 = pared, 0 = piso) ---
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

  // Conectar salas con pasillos
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

// --- Jugador ---
const startRoom = rooms[0];
const player = {
  x: (startRoom.x + Math.floor(startRoom.w / 2)) * TILE,
  y: (startRoom.y + Math.floor(startRoom.h / 2)) * TILE,
  size: 10,
  speed: 3,
  vx: 0, vy: 0,
  angle: 0,
  hp: 100, maxHp: 100,
};

const bullets = [];
const keys = {};
const mouse = { x: W / 2, y: H / 2, down: false };
let lastShot = 0;
const SHOT_RATE = 300;

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

// --- Input ---
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup',   e => keys[e.key] = false);
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', () => mouse.down = true);
canvas.addEventListener('mouseup',   () => mouse.down = false);

// --- Update ---
function update() {
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

  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  const now = Date.now();
  if (mouse.down && now - lastShot > SHOT_RATE) {
    lastShot = now;
    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(player.angle) * 7,
      vy: Math.sin(player.angle) * 7,
      life: 90,
    });
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx; b.y += b.vy; b.life--;
    const tx = Math.floor(b.x / TILE);
    const ty = Math.floor(b.y / TILE);
    const hitWall = ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS || map[ty][tx] === 1;
    if (b.life <= 0 || hitWall) bullets.splice(i, 1);
  }
}

// --- Draw ---
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Tiles
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

  // Balas
  ctx.fillStyle = '#fac775';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jugador
  ctx.fillStyle = '#AFA9EC';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#7F77DD';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + Math.cos(player.angle) * 18,
    player.y + Math.sin(player.angle) * 18
  );
  ctx.stroke();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();