const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 680, H = 480;

// --- Estado del juego ---
const player = {
  x: W / 2, y: H / 2,
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
const SHOT_RATE = 300; // ms entre disparos

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
  // Movimiento
  let dx = 0, dy = 0;
  if (keys['a'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['d'] || keys['ArrowRight']) dx += 1;
  if (keys['w'] || keys['ArrowUp'])    dy -= 1;
  if (keys['s'] || keys['ArrowDown'])  dy += 1;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) { dx /= len; dy /= len; }

  player.x = Math.max(player.size, Math.min(W - player.size, player.x + dx * player.speed));
  player.y = Math.max(player.size, Math.min(H - player.size, player.y + dy * player.speed));

  // Ángulo hacia el mouse
  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  // Disparar
  const now = Date.now();
  if (mouse.down && now - lastShot > SHOT_RATE) {
    lastShot = now;
    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(player.angle) * 7,
      vy: Math.sin(player.angle) * 7,
      life: 80,
    });
  }

  // Actualizar balas
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
      bullets.splice(i, 1);
    }
  }
}

// --- Draw ---
function draw() {
  ctx.clearRect(0, 0, W, H);

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

  // Cañón
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

// --- Loop ---
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
