const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 680, H = 480;
const TILE = 32;
const COLS = 40;
const ROWS = 30;

// ================================
// VARIABLES GLOBALES
// ================================
let level = 1;
let maxLevelReached = 1;
const TOTAL_LEVELS = 15;

// --- Armas (melee: true = cuerpo a cuerpo) ---
const WEAPONS = [
  { name: 'Pistola',  color: '#fac775', dmg: 20, speed: 7,  rate: 300,  ammo: Infinity },
  { name: 'Escopeta', color: '#F0997B', dmg: 12, speed: 6,  rate: 700,  ammo: 16, pellets: 5, spread: 0.3 },
  { name: 'AK-47',    color: '#9FE1CB', dmg: 15, speed: 9,  rate: 110,  ammo: 30 },
  { name: 'Laser',    color: '#B5D4F4', dmg: 8,  speed: 13, rate: 80,   ammo: 50 },
  { name: 'Cohete',   color: '#E24B4A', dmg: 90, speed: 5,  rate: 1100, ammo: 4  },
  { name: 'Espada',   color: '#C0C0C0', dmg: 55, speed: 0,  rate: 600,  ammo: Infinity, melee: true, range: 40 },
  { name: 'Mazo',     color: '#8D6E63', dmg: 40, speed: 0,  rate: 800,  ammo: Infinity, melee: true, range: 35 },
  { name: 'Cuchillo', color: '#B0BEC5', dmg: 30, speed: 0,  rate: 350,  ammo: Infinity, melee: true, range: 28 },
  { name: 'Sarten',   color: '#78909C', dmg: 18, speed: 0,  rate: 400,  ammo: Infinity, melee: true, range: 26 },
];
let currentWeapon = WEAPONS[0];

// --- Heroes jugables ---
const HEROES = [
  { name: 'Guerrero',  color: '#AFA9EC', desc: 'Equilibrado. Resistente en combate.', hp: 120, speed: 3,   weapon: 'Pistola',  stats: { HP: '120', Velocidad: 'Media',      Arma: 'Pistola'  } },
  { name: 'Mago',      color: '#7F77DD', desc: 'Fragil pero dispara mas rapido.',     hp: 80,  speed: 3.2, weapon: 'Laser',    stats: { HP: '80',  Velocidad: 'Media',      Arma: 'Laser'    } },
  { name: 'Picaro',    color: '#5DCAA5', desc: 'Muy rapido. Ideal para esquivar.',    hp: 90,  speed: 4.5, weapon: 'Cuchillo', stats: { HP: '90',  Velocidad: 'Alta',       Arma: 'Cuchillo' } },
  { name: 'Ingeniero', color: '#EF9F27', desc: 'Especialista en armas pesadas.',      hp: 100, speed: 2.5, weapon: 'Cohete',   stats: { HP: '100', Velocidad: 'Baja',       Arma: 'Cohete'   } },
  { name: 'Caballero', color: '#B5D4F4', desc: 'Maximo HP. Empieza con espada.',      hp: 150, speed: 2.2, weapon: 'Espada',   stats: { HP: '150', Velocidad: 'Baja',       Arma: 'Espada'   } },
  { name: 'Cazador',   color: '#9FE1CB', desc: 'Experto en largo alcance.',           hp: 85,  speed: 3.5, weapon: 'AK-47',   stats: { HP: '85',  Velocidad: 'Media-Alta', Arma: 'AK-47'    } },
];
let selectedHero = 0;
let selectedSkin = 'policia';

// --- Skins disponibles ---
const SKINS = [
  { id: 'policia',  name: 'Policia'  },
  { id: 'fantasma', name: 'Fantasma' },
  { id: 'cebra',    name: 'Cebra'    },
];

// ================================
// GUARDAR Y CARGAR PROGRESO
// ================================
function saveProgress() {
  localStorage.setItem('ghostNightSave', JSON.stringify({
    maxLevelReached, kills, selectedSkin, selectedHero
  }));
}

function loadProgress() {
  const raw = localStorage.getItem('ghostNightSave');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.maxLevelReached) maxLevelReached = d.maxLevelReached;
    if (d.kills)           kills           = d.kills;
    if (d.selectedSkin)    selectedSkin    = d.selectedSkin;
    if (typeof d.selectedHero === 'number') selectedHero = d.selectedHero;
  } catch(e) {}
}

function resetProgress() {
  localStorage.removeItem('ghostNightSave');
  maxLevelReached=1; kills=0; selectedSkin='policia'; selectedHero=0;
  location.reload();
}

loadProgress();

// ================================
// GENERACION DEL MAPA TIPO CUEVA
// ================================
function generateMap() {
  const map = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
  const rooms = [];
  const roomCount = 5 + Math.floor(level / 2);

  // Generar salas con esquinas irregulares
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 500) {
    attempts++;
    const rw = 3 + Math.floor(Math.random() * 6);
    const rh = 3 + Math.floor(Math.random() * 5);
    const rx = 1 + Math.floor(Math.random() * (COLS - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (ROWS - rh - 2));
    let ok = true;
    for (const r of rooms) {
      if (rx<r.x+r.w+2&&rx+rw>r.x-2&&ry<r.y+r.h+2&&ry+rh>r.y-2) { ok=false; break; }
    }
    if (ok) {
      for (let y=ry; y<ry+rh; y++)
        for (let x=rx; x<rx+rw; x++) {
          // Quitar esquinas para forma organica
          const isCorner=(x===rx||x===rx+rw-1)&&(y===ry||y===ry+rh-1);
          if (!isCorner) map[y][x]=0;
        }
      rooms.push({ x:rx, y:ry, w:rw, h:rh });
    }
  }

  // Conectar salas con pasillos curvos
  for (let i=1; i<rooms.length; i++) {
    const a=rooms[i-1], b=rooms[i];
    let cx=Math.floor(a.x+a.w/2), cy=Math.floor(a.y+a.h/2);
    const tx=Math.floor(b.x+b.w/2), ty=Math.floor(b.y+b.h/2);
    while (cx!==tx) {
      map[cy][cx]=0;
      if (cy+1<ROWS&&Math.random()<0.4) map[cy+1][cx]=0;
      cx+=cx<tx?1:-1;
    }
    while (cy!==ty) {
      map[cy][cx]=0;
      if (cx+1<COLS&&Math.random()<0.4) map[cy][cx+1]=0;
      cy+=cy<ty?1:-1;
    }
  }

  // Erosionar muros aislados para forma mas organica
  for (let pass=0; pass<2; pass++) {
    for (let y=1; y<ROWS-1; y++) {
      for (let x=1; x<COLS-1; x++) {
        if (map[y][x]===1) {
          let n=0;
          if (map[y-1][x]===0) n++;
          if (map[y+1][x]===0) n++;
          if (map[y][x-1]===0) n++;
          if (map[y][x+1]===0) n++;
          if (n>=3) map[y][x]=0;
        }
      }
    }
  }

  return { map, rooms };
}

let { map, rooms } = generateMap();

// ================================
// JUGADOR
// ================================
const startRoom = rooms[0];
const player = {
  x: (startRoom.x+Math.floor(startRoom.w/2))*TILE,
  y: (startRoom.y+Math.floor(startRoom.h/2))*TILE,
  size: 10,
  speed: 3,
  angle: 0,
  hp: 100, maxHp: 100,
  iframes: 0,       // frames de invulnerabilidad al recibir daño
  meleeSwing: 0,    // timer de animacion de ataque melee
};

// ================================
// ARRAYS DEL JUEGO
// ================================
const enemies     = [];
const drops       = [];   // armas en el suelo
const hpDrops     = [];   // pociones de vida en el suelo
const bullets     = [];
const particles   = [];
const chests      = [];   // cofres
const revealedTiles = new Set(); // niebla de guerra

// --- Luciernagas decorativas ---
const fireflies = Array.from({length:20}, ()=>({
  x: Math.random()*COLS*TILE,
  y: Math.random()*ROWS*TILE,
  vx: (Math.random()-0.5)*0.5,
  vy: (Math.random()-0.5)*0.5,
  life: Math.random()*100,
  maxLife: 100,
  bright: Math.random(),
}));

// ================================
// ESTADISTICAS DE ENEMIGOS
// ================================
function getEnemyStats(type) {
  return {
    slime:    { size:8,  speed:0.8+level*0.04, hp:20+level*5,   dmg:6  },
    bat:      { size:7,  speed:2.0+level*0.06, hp:15+level*4,   dmg:5  },
    gremlin:  { size:10, speed:1.4+level*0.07, hp:35+level*8,   dmg:10 },
    ogre:     { size:16, speed:0.9+level*0.05, hp:80+level*15,  dmg:18 },
    manticore:{ size:28, speed:1.0+level*0.04, hp:600+level*80, dmg:30 },
  }[type] || { size:10, speed:1.2, hp:30, dmg:8 };
}

// --- Spawn de enemigos segun nivel ---
function spawnEnemies() {
  enemies.length = 0;
  const isBossFloor = level === TOTAL_LEVELS;

  // Pool de enemigos segun dificultad
  const typePool = level<=3  ? ['slime','bat']
    : level<=7               ? ['slime','bat','gremlin']
    : level<=12              ? ['slime','bat','gremlin','ogre']
    : ['gremlin','ogre','bat'];

  for (let i=1; i<rooms.length; i++) {
    const r=rooms[i];
    if (isBossFloor && i===rooms.length-1) {
      // Jefe final: Manticora en la ultima sala
      const s=getEnemyStats('manticore');
      enemies.push({
        x:(r.x+Math.floor(r.w/2))*TILE, y:(r.y+Math.floor(r.h/2))*TILE,
        size:s.size, speed:s.speed, hp:s.hp, maxHp:s.hp,
        angle:0, type:'manticore', lastShot:0, dead:false
      });
    } else {
      // Cantidad de enemigos aumenta con el nivel
      const count = 1 + Math.floor(Math.random()*(1+Math.floor(level/3)));
      for (let j=0; j<count; j++) {
        const type = typePool[Math.floor(Math.random()*typePool.length)];
        const ex = (r.x+1+Math.floor(Math.random()*(r.w-2)))*TILE;
        const ey = (r.y+1+Math.floor(Math.random()*(r.h-2)))*TILE;
        const s = getEnemyStats(type);
        enemies.push({ x:ex, y:ey, size:s.size, speed:s.speed, hp:s.hp, maxHp:s.hp, angle:0, type, lastShot:0, dead:false });
      }
    }
  }
}

// --- Spawn de cofres (plata o dorado segun nivel) ---
function spawnChests() {
  chests.length = 0;
  for (let i=2; i<rooms.length-1; i++) {
    if (Math.random() < 0.5) {
      const r = rooms[i];
      // Mas nivel = mas chance de cofre dorado
      const goldChance = Math.min(0.1 + level*0.04, 0.6);
      chests.push({
        x: (r.x+Math.floor(r.w/2))*TILE,
        y: (r.y+Math.floor(r.h/2)-1)*TILE,
        gold: Math.random() < goldChance,
        opened: false,
      });
    }
  }
}

spawnEnemies();
spawnChests();

// ================================
// ESTADO DEL JUEGO
// ================================
const keys  = {};
const mouse = { x:W/2, y:H/2, down:false };
let lastShot      = 0;
let kills         = 0;
let camX = 0, camY = 0;
let gameRunning   = false;
let levelComplete = false;
let paused        = false;
let loopRunning   = false;

// ================================
// COLISION CON MUROS
// ================================
function collidesWithWall(x, y, size) {
  const corners = [[x-size,y-size],[x+size,y-size],[x-size,y+size],[x+size,y+size]];
  for (const [cx,cy] of corners) {
    const tx=Math.floor(cx/TILE), ty=Math.floor(cy/TILE);
    if (ty<0||ty>=ROWS||tx<0||tx>=COLS) return true;
    if (map[ty][tx]===1) return true;
  }
  return false;
}

// ================================
// SISTEMA DE PARTICULAS
// ================================
function spawnParticles(x, y, color, count) {
  for (let i=0; i<count; i++) {
    const angle = Math.random()*Math.PI*2;
    const speed = 1 + Math.random()*3;
    particles.push({
      x, y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      life: 20+Math.floor(Math.random()*20),
      maxLife: 40,
      color,
    });
  }
}

// ================================
// NIEBLA DE GUERRA
// ================================
function updateRevealedTiles() {
  const px=Math.floor(player.x/TILE), py=Math.floor(player.y/TILE), radius=4;
  for (let dy=-radius; dy<=radius; dy++)
    for (let dx=-radius; dx<=radius; dx++)
      if (dx*dx+dy*dy<=radius*radius)
        revealedTiles.add(`${px+dx},${py+dy}`);
}

// ================================
// COFRES
// ================================
function openChest(chest) {
  chest.opened = true;
  const roll = Math.random();
  if (chest.gold) {
    // Cofre dorado: mejor loot
    if (roll<0.33) drops.push({x:chest.x,y:chest.y,weapon:WEAPONS[2+Math.floor(Math.random()*(WEAPONS.length-2))]});
    else if (roll<0.66) hpDrops.push({x:chest.x,y:chest.y,amount:50});
    else { hpDrops.push({x:chest.x,y:chest.y,amount:30}); drops.push({x:chest.x+20,y:chest.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]}); }
  } else {
    // Cofre plata: loot basico
    if (roll<0.5) hpDrops.push({x:chest.x,y:chest.y,amount:20});
    else drops.push({x:chest.x,y:chest.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]});
  }
  spawnParticles(chest.x, chest.y, chest.gold?'#fac775':'#aaa', 10);
}

// ================================
// SIGUIENTE NIVEL
// ================================
function nextLevel() {
  level++;
  const data = generateMap(); map=data.map; rooms=data.rooms;
  const r = rooms[0];
  player.x = (r.x+Math.floor(r.w/2))*TILE;
  player.y = (r.y+Math.floor(r.h/2))*TILE;
  player.hp = Math.min(player.maxHp, player.hp+30); // curar un poco al pasar de nivel
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear();
  spawnEnemies(); spawnChests();
}

function showLevelComplete() {
  levelComplete = true;
  if (level >= maxLevelReached) maxLevelReached = level+1;
  saveProgress();
  document.getElementById('levelComplete').style.display='flex';
  document.getElementById('levelCompleteMsg').textContent = `Piso ${level} completado - Kills: ${kills}`;
}

function continueGame() {
  document.getElementById('levelComplete').style.display='none';
  levelComplete = false;
  nextLevel();
}

function gameOver() {
  saveProgress();
  gameRunning = false;
}

// ================================
// DIBUJAR SKIN DEL JUGADOR
// ================================
function drawPlayerSkin(c, skin) {
  if (skin === 'policia') {
    // Piernas
    c.fillStyle='#1a3a5c'; c.fillRect(-5,4,4,8); c.fillRect(1,4,4,8);
    // Zapatos
    c.fillStyle='#111'; c.fillRect(-6,10,5,3); c.fillRect(1,10,5,3);
    // Cuerpo (uniforme)
    c.fillStyle='#1a3a6e'; c.fillRect(-7,-3,14,9);
    // Placa dorada
    c.fillStyle='#fac775'; c.fillRect(-4,-1,4,3);
    // Cuello
    c.fillStyle='#f0c090'; c.fillRect(-2,-5,4,4);
    // Cabeza
    c.fillStyle='#f0c090'; c.beginPath(); c.arc(0,-10,6,0,Math.PI*2); c.fill();
    // Ojo
    c.fillStyle='#1a1a2e'; c.beginPath(); c.arc(3,-11,1.5,0,Math.PI*2); c.fill();
    // Boca
    c.fillStyle='#c0785a'; c.fillRect(1,-8,3,1.5);
    // Gorro base
    c.fillStyle='#1a3a6e'; c.fillRect(-7,-17,14,5); c.fillRect(-5,-22,10,6);
    // Visera
    c.fillStyle='#122a50'; c.fillRect(-8,-13,16,2);
    // Insignia y banda
    c.fillStyle='#fac775'; c.fillRect(-2,-19,4,3); c.fillRect(-7,-15,14,2);

  } else if (skin === 'fantasma') {
    // Cuerpo ondulado
    c.fillStyle='#ddeeff';
    c.beginPath(); c.moveTo(-8,10);
    c.quadraticCurveTo(-10,16,-5,13); c.quadraticCurveTo(0,17,5,13);
    c.quadraticCurveTo(10,16,8,10); c.lineTo(8,-8);
    c.arc(0,-8,8,0,Math.PI,true); c.closePath(); c.fill();
    // Brillo
    c.fillStyle='#ffffff'; c.beginPath(); c.arc(-2,-10,3,0,Math.PI*2); c.fill();
    // Ojos
    c.fillStyle='#1a1a2e'; c.beginPath(); c.arc(-3,-8,2,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(3,-8,2,0,Math.PI*2); c.fill();
    c.fillStyle='#fff'; c.beginPath(); c.arc(-2,-9,0.8,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(4,-9,0.8,0,Math.PI*2); c.fill();
    // Boca
    c.fillStyle='#1a1a2e'; c.beginPath(); c.arc(0,-4,3,0,Math.PI); c.fill();

  } else if (skin === 'cebra') {
    // Piernas
    c.fillStyle='#fff'; c.fillRect(-5,4,4,8); c.fillRect(1,4,4,8);
    // Rayas piernas
    c.fillStyle='#222'; c.fillRect(-5,6,4,2); c.fillRect(1,8,4,2);
    // Pezunas
    c.fillStyle='#333'; c.fillRect(-6,10,5,3); c.fillRect(1,10,5,3);
    // Cuerpo
    c.fillStyle='#f0f0f0'; c.fillRect(-7,-3,14,9);
    // Rayas cuerpo
    c.fillStyle='#222'; c.fillRect(-7,-2,5,2); c.fillRect(-7,2,4,2); c.fillRect(3,-1,4,2); c.fillRect(2,3,5,2);
    // Cuello y cabeza
    c.fillStyle='#f0f0f0'; c.fillRect(-3,-6,6,5); c.beginPath(); c.arc(0,-10,7,0,Math.PI*2); c.fill();
    // Rayas cabeza
    c.fillStyle='#222'; c.fillRect(-6,-13,3,3); c.fillRect(2,-14,3,4); c.fillRect(-3,-16,5,2);
    // Ojo
    c.fillStyle='#1a1a2e'; c.beginPath(); c.arc(3,-11,2,0,Math.PI*2); c.fill();
    c.fillStyle='#fff'; c.beginPath(); c.arc(4,-12,0.8,0,Math.PI*2); c.fill();
    // Nariz
    c.fillStyle='#ffaaaa'; c.fillRect(4,-9,3,2);
    // Orejas
    c.fillStyle='#f0f0f0'; c.fillRect(-7,-18,4,6); c.fillRect(3,-18,4,6);
    c.fillStyle='#ffcccc'; c.fillRect(-6,-17,2,4); c.fillRect(4,-17,2,4);
    // Crin
    c.fillStyle='#222'; c.fillRect(-3,-20,6,4); c.fillRect(-2,-18,4,8);
  }
}

// ================================
// DIBUJAR ENEMIGOS
// ================================
function drawEnemy(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y);

  if (e.type === 'slime') {
    // Cuerpo eliptico verde
    ctx.fillStyle='#4CAF50'; ctx.beginPath(); ctx.ellipse(0,2,e.size,e.size*0.7,0,0,Math.PI*2); ctx.fill();
    // Ojos
    ctx.fillStyle='#81C784'; ctx.beginPath(); ctx.ellipse(-3,-2,4,3,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(3,-2,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(-3,0,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,0,1.5,0,Math.PI*2); ctx.fill();

  } else if (e.type === 'bat') {
    // Alas
    ctx.fillStyle='#6D4C41'; ctx.beginPath(); ctx.ellipse(0,0,e.size*1.8,e.size*0.6,0,0,Math.PI*2); ctx.fill();
    // Cuerpo
    ctx.fillStyle='#4E342E'; ctx.beginPath(); ctx.ellipse(0,0,e.size*0.7,e.size*0.7,0,0,Math.PI*2); ctx.fill();
    // Ojos
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-2,-1,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(2,-1,1.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(-2,-1,0.8,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(2,-1,0.8,0,Math.PI*2); ctx.fill();
    // Orejas
    ctx.fillStyle='#4E342E'; ctx.beginPath(); ctx.moveTo(-4,-4); ctx.lineTo(-6,-10); ctx.lineTo(-1,-5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4,-4); ctx.lineTo(6,-10); ctx.lineTo(1,-5); ctx.fill();

  } else if (e.type === 'gremlin') {
    // Cuerpo
    ctx.fillStyle='#8BC34A'; ctx.fillRect(-e.size*0.6,-4,e.size*1.2,10);
    // Cabeza
    ctx.fillStyle='#9CCC65'; ctx.beginPath(); ctx.arc(0,-9,e.size*0.7,0,Math.PI*2); ctx.fill();
    // Ojos amarillos
    ctx.fillStyle='#ff0'; ctx.beginPath(); ctx.arc(-3,-10,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-10,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(-3,-10,1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-10,1,0,Math.PI*2); ctx.fill();
    // Orejas puntiagudas
    ctx.fillStyle='#33691E'; ctx.beginPath(); ctx.moveTo(-5,-14); ctx.lineTo(-7,-20); ctx.lineTo(-2,-15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5,-14); ctx.lineTo(7,-20); ctx.lineTo(2,-15); ctx.fill();
    // Arma
    ctx.save(); ctx.rotate(e.angle); ctx.fillStyle='#795548'; ctx.fillRect(e.size*0.6,-1,10,3); ctx.restore();

  } else if (e.type === 'ogre') {
    // Cuerpo grande
    ctx.fillStyle='#795548'; ctx.fillRect(-e.size*0.7,0,e.size*1.4,e.size);
    // Cabeza
    ctx.fillStyle='#8D6E63'; ctx.beginPath(); ctx.arc(0,-e.size*0.6,e.size*0.85,0,Math.PI*2); ctx.fill();
    // Ojos
    ctx.fillStyle='#ff0'; ctx.beginPath(); ctx.arc(-5,-e.size*0.6-2,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5,-e.size*0.6-2,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(-5,-e.size*0.6-2,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5,-e.size*0.6-2,1.5,0,Math.PI*2); ctx.fill();
    // Brazos
    ctx.fillStyle='#5D4037'; ctx.fillRect(-e.size*0.7,-e.size*0.3,4,e.size*0.5); ctx.fillRect(e.size*0.7-4,-e.size*0.3,4,e.size*0.5);
    // Arma (mazo)
    ctx.save(); ctx.rotate(e.angle); ctx.fillStyle='#5D4037'; ctx.fillRect(e.size*0.8,-3,16,6); ctx.fillStyle='#9E9E9E'; ctx.fillRect(e.size*0.8+12,-5,6,10); ctx.restore();

  } else if (e.type === 'manticore') {
    // Jefe final
    const pulse = Math.sin(Date.now()/200)*2;
    // Cuerpo
    ctx.fillStyle='#8B0000'; ctx.beginPath(); ctx.ellipse(0,0,e.size*0.9,e.size*0.6,0,0,Math.PI*2); ctx.fill();
    // Cabeza
    ctx.fillStyle='#A52A2A'; ctx.beginPath(); ctx.arc(e.size*0.5,-e.size*0.3,e.size*0.5,0,Math.PI*2); ctx.fill();
    // Alas animadas
    ctx.fillStyle='#B71C1C';
    ctx.beginPath(); ctx.moveTo(0,-e.size*0.3); ctx.lineTo(-e.size*1.5,-e.size*0.8+pulse); ctx.lineTo(-e.size*0.5,0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-e.size*0.3); ctx.lineTo(e.size*0.3,-e.size*0.8+pulse); ctx.lineTo(e.size*0.2,0); ctx.fill();
    // Ojos naranjas
    ctx.fillStyle='#FF6600'; ctx.beginPath(); ctx.arc(e.size*0.35,-e.size*0.35,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.size*0.65,-e.size*0.35,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(e.size*0.35,-e.size*0.35,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.size*0.65,-e.size*0.35,2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Barra de HP sobre el enemigo
  const barW = e.type==='manticore'?80:e.type==='ogre'?40:24;
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(e.x-barW/2,e.y-e.size-12,barW,5);
  const hpColor = e.type==='manticore'?'#FF6600':e.type==='ogre'?'#795548':e.type==='gremlin'?'#8BC34A':e.type==='bat'?'#6D4C41':'#4CAF50';
  ctx.fillStyle=hpColor; ctx.fillRect(e.x-barW/2,e.y-e.size-12,barW*(e.hp/e.maxHp),5);

  // Nombre del jefe
  if (e.type==='manticore') {
    ctx.fillStyle='#FF6600'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
    ctx.fillText('MANTICORA',e.x,e.y-e.size-16); ctx.textAlign='left';
  }
}

// ================================
// MENU PRINCIPAL
// ================================
function showMenu() {
  loopRunning=false; gameRunning=false;
  ['levelMap','charSelect','skinSelect','pauseMenu','levelComplete'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('menu').style.display='flex';
}

function showLevelMap() {
  document.getElementById('menu').style.display='none';
  document.getElementById('levelMap').style.display='flex';
  buildLevelGrid();
}

function buildLevelGrid() {
  const grid=document.getElementById('levelGrid');
  grid.innerHTML='';
  for (let i=1; i<=TOTAL_LEVELS; i++) {
    const btn=document.createElement('div');
    const completed=i<maxLevelReached, unlocked=i<=maxLevelReached;
    btn.className='level-btn'+(completed?' completed':unlocked?' unlocked':'');
    btn.innerHTML=`<span>${i}</span><span class="level-stars">${completed?'***':unlocked?'---':'X'}</span>`;
    if (unlocked) btn.onclick=()=>startLevel(i);
    grid.appendChild(btn);
  }
}

function startLevel(n) {
  document.getElementById('levelMap').style.display='none';
  level=n;
  const data=generateMap(); map=data.map; rooms=data.rooms;
  const r=rooms[0];
  player.x=(r.x+Math.floor(r.w/2))*TILE; player.y=(r.y+Math.floor(r.h/2))*TILE;
  player.hp=player.maxHp;
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear(); spawnEnemies(); spawnChests();
  gameRunning=true; levelComplete=false; paused=false;
  if (!loopRunning) { loopRunning=true; loop(); }
}

function buildCharGrid() {
  const grid=document.getElementById('charGrid');
  grid.innerHTML='';
  HEROES.forEach((h,i)=>{
    const card=document.createElement('div');
    card.className='char-card'+(i===0?' selected':'');
    card.innerHTML=`
      <div class="char-name" style="color:${h.color}">${h.name}</div>
      <div class="char-desc">${h.desc}</div>
      <div class="char-stats">
        HP: <span>${h.stats.HP}</span><br>
        Vel: <span>${h.stats.Velocidad}</span><br>
        Arma: <span>${h.stats.Arma}</span>
      </div>`;
    card.onclick=()=>{ document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); selectedHero=i; };
    grid.appendChild(card);
  });
}

function startGame() {
  document.getElementById('menu').style.display='none';
  document.getElementById('charSelect').style.display='flex';
  buildCharGrid();
}

function confirmChar() {
  document.getElementById('charSelect').style.display='none';
  showSkinSelect();
}

function showSkinSelect() {
  document.getElementById('skinSelect').style.display='flex';
  buildSkinGrid();
}

function buildSkinGrid() {
  const grid=document.getElementById('skinGrid');
  grid.innerHTML='';
  SKINS.forEach(s=>{
    const card=document.createElement('div');
    card.className='skin-card'+(s.id===selectedSkin?' selected':'');
    // Preview canvas de la skin
    const pc=document.createElement('canvas'); pc.width=60; pc.height=70; pc.className='skin-preview';
    card.appendChild(pc);
    const nameEl=document.createElement('div'); nameEl.className='skin-name'; nameEl.textContent=s.name;
    card.appendChild(nameEl);
    card.onclick=()=>{ document.querySelectorAll('.skin-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); selectedSkin=s.id; buildSkinGrid(); };
    grid.appendChild(card);
    // Dibujar preview
    const pctx=pc.getContext('2d'); pctx.save(); pctx.translate(30,45); drawPlayerSkin(pctx,s.id); pctx.restore();
  });
}

function confirmSkin() {
  document.getElementById('skinSelect').style.display='none';
  const hero=HEROES[selectedHero];
  // Aplicar stats del heroe seleccionado
  player.hp=hero.hp; player.maxHp=hero.hp; player.speed=hero.speed;
  currentWeapon=WEAPONS.find(w=>w.name===hero.weapon)||WEAPONS[0];
  gameRunning=true; levelComplete=false; paused=false; kills=0; level=1;
  const data=generateMap(); map=data.map; rooms=data.rooms;
  const r=rooms[0];
  player.x=(r.x+Math.floor(r.w/2))*TILE; player.y=(r.y+Math.floor(r.h/2))*TILE;
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear(); spawnEnemies(); spawnChests();
  if (!loopRunning) { loopRunning=true; loop(); }
}

// ================================
// INPUT
// ================================
window.addEventListener('keydown', e=>{
  keys[e.key]=true;
  if ((e.key==='r'||e.key==='R')&&!gameRunning&&loopRunning) location.reload();
  if (e.key==='Escape'&&gameRunning) paused?resumeGame():pauseGame();
});
window.addEventListener('keyup', e=>keys[e.key]=false);
canvas.addEventListener('mousemove', e=>{ const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; });
canvas.addEventListener('mousedown', ()=>mouse.down=true);
canvas.addEventListener('mouseup',   ()=>mouse.down=false);

// ================================
// PAUSA
// ================================
function pauseGame()  { paused=true;  document.getElementById('pauseMenu').style.display='flex'; }
function resumeGame() { paused=false; document.getElementById('pauseMenu').style.display='none'; }
function quitToMenu() {
  paused=false; loopRunning=false; gameRunning=false; levelComplete=false;
  document.getElementById('pauseMenu').style.display='none';
  document.getElementById('levelComplete').style.display='none';
  document.getElementById('menu').style.display='flex';
}

// ================================
// UPDATE (logica del juego)
// ================================
function update() {
  // Actualizar camara
  camX=Math.max(0,Math.min(player.x-W/2,COLS*TILE-W));
  camY=Math.max(0,Math.min(player.y-H/2,ROWS*TILE-H));

  updateRevealedTiles();

  // Angulo del jugador hacia el mouse (en coordenadas de mundo)
  player.angle=Math.atan2(mouse.y+camY-player.y, mouse.x+camX-player.x);

  // Movimiento del jugador
  let dx=0,dy=0;
  if (keys['a']||keys['ArrowLeft'])  dx-=1;
  if (keys['d']||keys['ArrowRight']) dx+=1;
  if (keys['w']||keys['ArrowUp'])    dy-=1;
  if (keys['s']||keys['ArrowDown'])  dy+=1;
  const len=Math.sqrt(dx*dx+dy*dy);
  if (len>0) { dx/=len; dy/=len; }
  const nx=player.x+dx*player.speed, ny=player.y+dy*player.speed;
  if (!collidesWithWall(nx,player.y,player.size)) player.x=nx;
  if (!collidesWithWall(player.x,ny,player.size)) player.y=ny;

  if (player.iframes>0) player.iframes--;
  if (player.meleeSwing>0) player.meleeSwing--;

  // Disparar o atacar
  const now=Date.now();
  if (mouse.down && now-lastShot>currentWeapon.rate) {
    lastShot=now;
    if (currentWeapon.melee) {
      // Ataque cuerpo a cuerpo
      player.meleeSwing=12;
      for (const e of enemies) {
        if (e.dead) continue;
        const ex=e.x-player.x, ey=e.y-player.y;
        const dist=Math.sqrt(ex*ex+ey*ey);
        const angleDiff=Math.abs(Math.atan2(ey,ex)-player.angle);
        if (dist<currentWeapon.range+e.size && angleDiff<Math.PI*0.6) {
          e.hp-=currentWeapon.dmg;
          spawnParticles(e.x,e.y,'#fff',6);
          if (e.hp<=0) {
            e.dead=true; kills++;
            spawnParticles(e.x,e.y,'#ff6600',14);
            if (Math.random()<0.3) drops.push({x:e.x,y:e.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]});
            if (Math.random()<0.4) hpDrops.push({x:e.x,y:e.y,amount:20});
          }
        }
      }
    } else {
      // Disparo de proyectiles
      const pellets=currentWeapon.pellets||1;
      for (let p=0;p<pellets;p++) {
        const spread=currentWeapon.spread||0;
        const angle=player.angle+(Math.random()-0.5)*spread;
        bullets.push({x:player.x,y:player.y,vx:Math.cos(angle)*currentWeapon.speed,vy:Math.sin(angle)*currentWeapon.speed,dmg:currentWeapon.dmg,life:90,owner:'player'});
      }
    }
  }

  // Actualizar balas
  for (let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; b.life--;
    const tx=Math.floor(b.x/TILE),ty=Math.floor(b.y/TILE);
    if (b.life<=0||ty<0||ty>=ROWS||tx<0||tx>=COLS||map[ty][tx]===1) { bullets.splice(i,1); continue; }

    // Bala enemiga golpea al jugador
    if (b.owner==='enemy') {
      const dx=b.x-player.x,dy=b.y-player.y;
      if (Math.sqrt(dx*dx+dy*dy)<player.size+4&&player.iframes===0) {
        player.hp-=15; player.iframes=30;
        spawnParticles(player.x,player.y,'#e24b4a',6);
        bullets.splice(i,1);
      }
      continue;
    }

    // Bala del jugador golpea a enemigo
    let hit=false;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex=b.x-e.x,ey=b.y-e.y;
      if (Math.sqrt(ex*ex+ey*ey)<e.size+4) {
        e.hp-=b.dmg||20;
        if (e.hp<=0) {
          e.dead=true; kills++;
          spawnParticles(e.x,e.y,'#ff6600',14);
          if (Math.random()<0.3) drops.push({x:e.x,y:e.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]});
          if (Math.random()<0.4) hpDrops.push({x:e.x,y:e.y,amount:20});
        }
        bullets.splice(i,1); hit=true; break;
      }
    }
    if (hit) continue;
  }

  // IA de enemigos
  const now2=Date.now();
  for (const e of enemies) {
    if (e.dead) continue;
    const edx=player.x-e.x, edy=player.y-e.y;
    const elen=Math.sqrt(edx*edx+edy*edy);
    e.angle=Math.atan2(edy,edx);
    const stats=getEnemyStats(e.type);

    if (e.type==='bat') {
      // Murcielago vuela directo (atraviesa paredes)
      if (elen>0) { e.x+=(edx/elen)*e.speed; e.y+=(edy/elen)*e.speed; }

    } else if (e.type==='slime') {
      // Slime salta periodicamente sin atravesar paredes
      if (elen>0&&now2%60<3) {
        const sx=e.x+(edx/elen)*e.speed*3;
        const sy=e.y+(edy/elen)*e.speed*3;
        if (!collidesWithWall(sx,e.y,e.size)) e.x=sx;
        if (!collidesWithWall(e.x,sy,e.size)) e.y=sy;
      }

    } else if (e.type==='gremlin') {
      // Gremlin mantiene distancia y dispara
      if (elen>80) {
        const enx=e.x+(edx/elen)*e.speed, eny=e.y+(edy/elen)*e.speed;
        if (!collidesWithWall(enx,e.y,e.size)) e.x=enx;
        if (!collidesWithWall(e.x,eny,e.size)) e.y=eny;
      }
      if (elen<180&&now2-e.lastShot>1200) {
        e.lastShot=now2;
        bullets.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*5,vy:Math.sin(e.angle)*5,dmg:stats.dmg,life:100,owner:'enemy'});
      }

    } else if (e.type==='ogre') {
      // Ogro se acerca directamente
      if (elen>0) {
        const enx=e.x+(edx/elen)*e.speed, eny=e.y+(edy/elen)*e.speed;
        if (!collidesWithWall(enx,e.y,e.size)) e.x=enx;
        if (!collidesWithWall(e.x,eny,e.size)) e.y=eny;
      }

    } else if (e.type==='manticore') {
      // Manticora se mueve y dispara rafagas
      if (elen>0) {
        const enx=e.x+(edx/elen)*e.speed, eny=e.y+(edy/elen)*e.speed;
        if (!collidesWithWall(enx,e.y,e.size)) e.x=enx;
        if (!collidesWithWall(e.x,eny,e.size)) e.y=eny;
      }
      if (elen<350&&now2-e.lastShot>700) {
        e.lastShot=now2;
        for (let s=-2;s<=2;s++) {
          const a=e.angle+s*0.25;
          bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*6,vy:Math.sin(a)*6,dmg:stats.dmg,life:130,owner:'enemy'});
        }
      }
    }

    // Daño por contacto
    if (player.iframes===0&&elen<e.size+player.size) {
      player.hp-=stats.dmg; player.iframes=40;
      spawnParticles(player.x,player.y,'#e24b4a',6);
    }
  }

  // Recoger armas del suelo
  for (let i=drops.length-1;i>=0;i--) {
    const d=drops[i],dx=player.x-d.x,dy=player.y-d.y;
    if (Math.sqrt(dx*dx+dy*dy)<20) { currentWeapon=d.weapon; drops.splice(i,1); }
  }

  // Recoger pociones de vida
  for (let i=hpDrops.length-1;i>=0;i--) {
    const h=hpDrops[i],dx=player.x-h.x,dy=player.y-h.y;
    if (Math.sqrt(dx*dx+dy*dy)<20) {
      player.hp=Math.min(player.maxHp,player.hp+h.amount);
      spawnParticles(player.x,player.y,'#9FE1CB',6);
      hpDrops.splice(i,1);
    }
  }

  // Abrir cofres al acercarse
  for (let i=chests.length-1;i>=0;i--) {
    const c=chests[i]; if (c.opened) continue;
    const dx=player.x-c.x,dy=player.y-c.y;
    if (Math.sqrt(dx*dx+dy*dy)<24) openChest(c);
  }

  // Actualizar particulas
  for (let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life--;
    if (p.life<=0) particles.splice(i,1);
  }

  // Actualizar luciernagas
  for (const f of fireflies) {
    f.x+=f.vx; f.y+=f.vy;
    f.vx+=(Math.random()-0.5)*0.1; f.vy+=(Math.random()-0.5)*0.1;
    f.vx=Math.max(-0.8,Math.min(0.8,f.vx)); f.vy=Math.max(-0.8,Math.min(0.8,f.vy));
    f.life=(f.life+1)%f.maxLife; f.bright=Math.sin(f.life/f.maxLife*Math.PI);
    if (f.x<0||f.x>COLS*TILE) f.vx*=-1;
    if (f.y<0||f.y>ROWS*TILE) f.vy*=-1;
  }

  // Chequear fin de nivel
  if (enemies.length>0&&enemies.every(e=>e.dead)&&!levelComplete) showLevelComplete();
  // Chequear muerte del jugador
  if (player.hp<=0) { player.hp=0; gameOver(); }
}

// ================================
// DRAW (renderizado)
// ================================
function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.translate(-camX,-camY); // aplicar camara

  // --- Tiles del mapa ---
  for (let y=0;y<ROWS;y++) {
    for (let x=0;x<COLS;x++) {
      const px=x*TILE, py=y*TILE;

      // Niebla de guerra: negro si no revelado
      if (!revealedTiles.has(`${x},${y}`)) {
        ctx.fillStyle='#000'; ctx.fillRect(px,py,TILE,TILE); continue;
      }

      if (map[y][x]===1) {
        // Pared de cueva con textura rocosa
        ctx.fillStyle='#1a1520'; ctx.fillRect(px,py,TILE,TILE);
        const seed=x*13+y*7;
        ctx.fillStyle=seed%3===0?'#221a2e':seed%3===1?'#1e1628':'#171220';
        ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
        // Grietas
        if (seed%5===0) { ctx.fillStyle='#0d0a14'; ctx.fillRect(px+5,py+3,1,8); ctx.fillRect(px+6,py+9,1,5); }
        if (seed%8===0) { ctx.fillStyle='#0d0a14'; ctx.fillRect(px+12,py+6,6,1); ctx.fillRect(px+15,py+7,3,1); }
        // Humedad
        if (seed%6===0) { ctx.fillStyle='rgba(40,60,100,0.4)'; ctx.fillRect(px+3,py+TILE-6,TILE-6,5); }
        if (seed%11===0) { ctx.fillStyle='rgba(80,120,180,0.5)'; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE-3,2,0,Math.PI*2); ctx.fill(); }
        // Bordes
        ctx.fillStyle='rgba(60,40,80,0.6)'; ctx.fillRect(px,py,TILE,2);
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(px,py+TILE-2,TILE,2);
      } else {
        // Suelo de cueva con textura
        ctx.fillStyle='#0e0b14'; ctx.fillRect(px,py,TILE,TILE);
        const seed=x*17+y*11;
        if (seed%4===0) { ctx.fillStyle='#130f1a'; ctx.fillRect(px+1,py+1,TILE-2,TILE-2); }
        if (seed%9===0) { ctx.fillStyle='#1e1828'; ctx.fillRect(px+4,py+5,5,4); ctx.fillRect(px+14,py+18,4,3); }
        if (seed%7===0) { ctx.fillStyle='rgba(30,50,80,0.3)'; ctx.fillRect(px+2,py+2,TILE-4,TILE-4); }
        if (seed%13===0) { ctx.fillStyle='rgba(20,60,20,0.4)'; ctx.fillRect(px+6,py+6,8,6); }
      }
    }
  }

  // --- Luciernagas ---
  for (const f of fireflies) {
    const tx=Math.floor(f.x/TILE),ty=Math.floor(f.y/TILE);
    if (!revealedTiles.has(`${tx},${ty}`)) continue;
    ctx.globalAlpha=f.bright*0.8; ctx.fillStyle='#aaff44';
    ctx.beginPath(); ctx.arc(f.x,f.y,2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=f.bright*0.15; ctx.fillStyle='#ccff66';
    ctx.beginPath(); ctx.arc(f.x,f.y,8,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // --- Cofres ---
  for (const c of chests) {
    if (!revealedTiles.has(`${Math.floor(c.x/TILE)},${Math.floor(c.y/TILE)}`)) continue;
    ctx.save(); ctx.translate(c.x,c.y);
    if (c.opened) {
      // Cofre abierto
      ctx.fillStyle='#5D4037'; ctx.fillRect(-10,-8,20,14);
      ctx.fillStyle='#3E2723'; ctx.fillRect(-10,-8,20,5);
    } else {
      // Cofre cerrado (dorado o plata)
      ctx.fillStyle=c.gold?'#F9A825':'#9E9E9E'; ctx.fillRect(-10,-8,20,14);
      ctx.fillStyle=c.gold?'#F57F17':'#757575'; ctx.fillRect(-10,-8,20,5);
      ctx.fillStyle=c.gold?'#FFD600':'#BDBDBD'; ctx.fillRect(-3,-5,6,8); ctx.beginPath(); ctx.arc(0,-2,2.5,0,Math.PI*2); ctx.fill();
      // Brillo animado en cofre dorado
      if (c.gold) { ctx.globalAlpha=0.3+Math.sin(Date.now()/300)*0.2; ctx.fillStyle='#FFD600'; ctx.beginPath(); ctx.arc(0,-2,14,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    }
    ctx.restore();
  }

  // --- Pociones de vida ---
  for (const h of hpDrops) {
    ctx.fillStyle='#9FE1CB33'; ctx.beginPath(); ctx.arc(h.x,h.y,12,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#9FE1CB'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(h.x,h.y,10,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#9FE1CB'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText('+',h.x,h.y+4); ctx.textAlign='left';
  }

  // --- Armas en el suelo ---
  for (const d of drops) {
    ctx.fillStyle=d.weapon.color+'33'; ctx.beginPath(); ctx.arc(d.x,d.y,14,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=d.weapon.color; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(d.x,d.y,12,0,Math.PI*2); ctx.stroke();
    ctx.save(); ctx.translate(d.x,d.y); ctx.fillStyle=d.weapon.color; ctx.fillRect(-8,-2,16,4); ctx.fillStyle='#aaa'; ctx.fillRect(4,-1.5,8,3); ctx.restore();
    ctx.fillStyle=d.weapon.color; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.fillText(d.weapon.name,d.x,d.y-16); ctx.textAlign='left';
  }

  // --- Particulas ---
  for (const p of particles) {
    ctx.globalAlpha=p.life/p.maxLife; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // --- Balas ---
  for (const b of bullets) {
    ctx.fillStyle=b.owner==='enemy'?'#ff6600':currentWeapon.color;
    ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
  }

  // --- Enemigos ---
  for (const e of enemies) {
    if (e.dead) continue;
    if (!revealedTiles.has(`${Math.floor(e.x/TILE)},${Math.floor(e.y/TILE)}`)) continue;
    drawEnemy(ctx,e);
  }

  // --- Jugador ---
  if (player.iframes===0||Math.floor(player.iframes/4)%2===0) {
    ctx.save(); ctx.translate(player.x,player.y);
    const flip=Math.abs(player.angle)>Math.PI/2?-1:1;
    ctx.scale(flip,1); drawPlayerSkin(ctx,selectedSkin); ctx.restore();

    // Arma del jugador
    ctx.save(); ctx.translate(player.x,player.y); ctx.rotate(player.angle);
    if (currentWeapon.melee) {
      // Animacion de swing melee
      const swing=player.meleeSwing>0?(1-player.meleeSwing/12)*Math.PI*0.8:0;
      ctx.rotate(swing);
      if (currentWeapon.name==='Espada') {
        ctx.fillStyle='#C0C0C0'; ctx.fillRect(8,-2,28,4);
        ctx.fillStyle='#8D6E63'; ctx.fillRect(6,-4,4,8);
        ctx.fillStyle='#fac775'; ctx.fillRect(4,-3,4,6);
      } else if (currentWeapon.name==='Mazo') {
        ctx.fillStyle='#8D6E63'; ctx.fillRect(6,-2,18,4);
        ctx.fillStyle='#757575'; ctx.fillRect(20,-7,10,14);
      } else if (currentWeapon.name==='Cuchillo') {
        ctx.fillStyle='#B0BEC5'; ctx.fillRect(6,-1.5,16,3);
        ctx.fillStyle='#8D6E63'; ctx.fillRect(4,-3,4,6);
      } else if (currentWeapon.name==='Sarten') {
        ctx.fillStyle='#78909C'; ctx.fillRect(6,-2,12,4);
        ctx.fillStyle='#546E7A'; ctx.beginPath(); ctx.ellipse(22,0,8,7,0,0,Math.PI*2); ctx.fill();
      }
    } else {
      // Arma de fuego
      ctx.fillStyle='#555'; ctx.fillRect(4,-2,16,4);
      ctx.fillStyle='#333'; ctx.fillRect(16,-3,4,6);
    }
    ctx.restore();
  }

  ctx.restore(); // fin camara

  // ================================
  // HUD (interfaz fija en pantalla)
  // ================================
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,36);
  // Barra de HP
  ctx.fillStyle='#333'; ctx.fillRect(10,10,150,14);
  ctx.fillStyle='#e24b4a'; ctx.fillRect(10,10,150*(player.hp/player.maxHp),14);
  ctx.strokeStyle='#555'; ctx.lineWidth=1; ctx.strokeRect(10,10,150,14);
  ctx.fillStyle='#fff'; ctx.font='bold 11px monospace'; ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`,14,21);
  // Arma actual
  ctx.fillStyle=currentWeapon.color; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText(currentWeapon.name,W/2,21); ctx.textAlign='left';
  // Alerta nivel jefe
  if (level===TOTAL_LEVELS) {
    ctx.fillStyle='#FF6600'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
    ctx.fillText('NIVEL FINAL - LA MANTICORA TE ESPERA',W/2,34); ctx.textAlign='left';
  }
  // Piso y enemigos restantes
  const enemiesLeft=enemies.filter(e=>!e.dead).length;
  ctx.fillStyle='#aaa'; ctx.font='11px monospace';
  ctx.fillText(`Piso: ${level}  Enemigos: ${enemiesLeft}`,W-160,21);
}

// ================================
// LOOP PRINCIPAL
// ================================
function loop() {
  if (!loopRunning) return;

  if (!gameRunning) {
    // Pantalla de Game Over
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#e24b4a'; ctx.font='bold 40px monospace'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-20);
    ctx.fillStyle='#aaa'; ctx.font='16px monospace';
    ctx.fillText(`Piso: ${level}  Kills: ${kills}`,W/2,H/2+20);
    ctx.fillText('Presiona R para reiniciar',W/2,H/2+50); ctx.textAlign='left';
    requestAnimationFrame(loop); return;
  }
  if (paused)        { requestAnimationFrame(loop); return; }
  if (levelComplete) { draw(); requestAnimationFrame(loop); return; }

  update(); draw();
  requestAnimationFrame(loop);
}