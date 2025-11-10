// --- Sprites ---
const samuraiSVG1 = `...`; // same samurai sprite
const samuraiSVG2 = `...`;
const katanaSVG = `...`; // outward tip, handle, shading
const cloudSVG = `...`;

// Load images
function svgDataURI(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const sam1 = new Image(),
  sam2 = new Image(),
  swordImg = new Image(),
  cloudImg = new Image();
let assetsLoaded = 0;
[samuraiSVG1, samuraiSVG2, katanaSVG, cloudSVG].forEach((svg, i) => {
  const img = [sam1, sam2, swordImg, cloudImg][i];
  img.onload = () => {
    assetsLoaded++;
  };
  img.src = svgDataURI(svg);
});

// --- Game setup ---
const canvas = document.getElementById('game'),
  ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score'),
  bestEl = document.getElementById('best');
let best = Number(localStorage.getItem('flappy-samurai-best') || 0);
bestEl.textContent = best;
const W = canvas.width,
  H = canvas.height;
let samurai = { x: 120, y: H / 2, vy: 0, frame: 0, frameTimer: 0 };
const GRAV = 0.3,
  FLAP = -6,
  OB_W = 80,
  GAP = 200;
let obstacles = [],
  clouds = [],
  score = 0,
  running = false,
  gameOver = false,
  lastTime = 0,
  spawnTimer = 0;

// Clouds
for (let i = 0; i < 5; i++) {
  clouds.push({
    x: Math.random() * W,
    y: Math.random() * H * 0.4 + 20,
    vx: 0.3 + Math.random() * 0.6,
    scale: 0.7 + Math.random() * 0.6,
    alpha: 0.7 + Math.random() * 0.25,
  });
}

// --- Game functions ---
function flap() {
  samurai.vy = FLAP;
}

function reset() {
  samurai = { x: 120, y: H / 2, vy: 0, frame: 0, frameTimer: 0 };
  obstacles = [];
  score = 0;
  scoreEl.textContent = 0;
  spawnTimer = 0;
  gameOver = false;
  running = true;
}

// spawn obstacles
function spawn() {
  const minTop = 60,
    maxTop = H - GAP - 120;
  const top = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
  obstacles.push({
    x: W + 40,
    top,
    width: OB_W,
    passed: false,
    t0: performance.now(),
    spinSeed: Math.random() * 2 * Math.PI,
  });
}

// collision
function collides(s, ob) {
  const topRect = { x: ob.x, y: 0, w: ob.width, h: ob.top + 8 };
  const botRect = { x: ob.x, y: ob.top + GAP - 8, w: ob.width, h: H };
  const cx = s.x,
    cy = s.y,
    r = 18;
  function circleRect(c, r, rect) {
    const closestX = Math.max(rect.x, Math.min(c.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(c.y, rect.y + rect.h));
    const dx = c.x - closestX,
      dy = c.y - closestY;
    return dx * dx + dy * dy < r * r;
  }
  return (
    circleRect({ x: cx, y: cy }, r, topRect) ||
    circleRect({ x: cx, y: cy }, r, botRect)
  );
}

// draw rotated image
function drawRotatedImage(img, cx, cy, w, h, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// update
function update(dt) {
  if (!running) return;
  samurai.frameTimer += dt;
  if (samurai.frameTimer > 120) {
    samurai.frameTimer = 0;
    samurai.frame = (samurai.frame + 1) % 2;
  }
  samurai.vy += GRAV * (dt / 16.666);
  samurai.y += samurai.vy * (dt / 16.666);
  spawnTimer += dt;
  if (spawnTimer > 1300) {
    spawnTimer = 0;
    spawn();
  }
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= 2.8 * (dt / 16.666);
    if (!o.passed && o.x + o.width < samurai.x - 14) {
      o.passed = true;
      score++;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem('flappy-samurai-best', best);
        bestEl.textContent = best;
      }
    }
    if (collides(samurai, o)) {
      gameOver = true;
      running = false;
    }
    if (o.x + o.width < -120) obstacles.splice(i, 1);
  }
  for (const c of clouds) {
    c.x += c.vx * (dt / 16.666);
    if (c.x > W + 220) c.x = -220;
  }
  if (samurai.y < -40 || samurai.y > H + 40) {
    gameOver = true;
    running = false;
  }
}

// draw
function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#90d4ff');
  g.addColorStop(1, '#66b7ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const c of clouds) {
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.drawImage(cloudImg, -110, -40, 220, 80);
    ctx.restore();
  }
  for (const o of obstacles) {
    const t = (performance.now() - o.t0) / 1000;
    const rot = Math.sin(t * 1.8 + o.spinSeed) * 0.14;
    const swordW = o.width,
      swordH = 420 * 0.8;
    drawRotatedImage(swordImg, o.x + swordW / 2, o.top / 2 - 40, swordW, swordH, rot * -1);
    drawRotatedImage(
      swordImg,
      o.x + swordW / 2,
      o.top + GAP + swordH / 2 - 40,
      swordW,
      swordH,
      -rot * 0.9
    );
  }
  const img = samurai.frame === 0 ? sam1 : sam2;
  const bob = Math.max(-6, Math.min(6, -samurai.vy * 0.6));
  ctx.drawImage(img, samurai.x - 36, samurai.y - 48 + bob, 72, 72);
}

// game loop
let lastFrame = 0;
function loop(now) {
  if (!lastFrame) lastFrame = now;
  const dt = now - lastFrame;
  lastFrame = now;
  update(dt);
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

const waitStart = setInterval(() => {
  if (assetsLoaded >= 4) {
    clearInterval(waitStart);
    reset();
    requestAnimationFrame(loop);
  }
}, 50);
