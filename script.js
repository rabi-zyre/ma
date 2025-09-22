// title settings
const FONT_PATH = 'fonts/NotoSerifJP-Regular.ttf';
const TEXT = '間';
const BASE_SIZE = 300;
const SAMPLE = 0.5;
const HIT_RADIUS = 50;
const DOTS_PER_POINT = 1;
const JITTER = 0.5;
const BASE_ALPHA = 35;
const HOVER_ALPHA = 230;
const BASE_COLOR = [255, 255, 255];
const HI_COLOR = [255, 255, 255];

let font;
let points = [];
let scaleFactor = 1;
let globalOpacity = 1;

const HAIKUS = [
  { text: "蝸牛\nそろそろ登れ\n富士の山", godai: 0 },
  { text: "古池や\n蛙飛び込む\n水の音", godai: 1 },
  { text: "埋火や\n壁には客の\n影法師", godai: 2 },
  { text: "春風に\n吹き出し笑ふ\n花もがな", godai: 3 },
  { text: "夏草や\n兵どもが\n夢の跡", godai: 4 }
];

let godaiButtons;
let poemEl, subtitleEl;
let drawFirstPoem = false;
let firstPoemLines = [];
let POEM_FONT_SIZE = 72;
let POEM_COL_GAP = 140;
let POEM_STEP_DOWN = 80;

let poemStartTime = 0;
const charDelay = 180;
const fadeDuration = 400;
let poemOpacity = 1;

let showPoints = false;
let poemPoints = [];

let pointSettings = {
  sampleFactor: 0.3,
  pointSize: 3,
  color: [255, 255, 255]
};

let gui; 

let applied = false;
let rectModeActive = false;
let circleModeActive = false; 

let currentPoemGodai = null;

let shapes = []; 

let translationWrapper;
let translationVisible = false;

let poem5Points = [];

let cursorEl;

// ====== END MODE STATE ======
let endMode = false;
let mergedPoints = [];
let blackholeProgress = 0;
let showEndText = false;

let endFade = 1;        // <-- NEW: điều khiển fade khi nhấn SPACE
let fadingOut = false;

let endScreen = false;

function preload() {
  font = loadFont(FONT_PATH);
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  buildPoints();

  cursorEl = document.getElementById('cursor');

  window.addEventListener('mousemove', (e) => {
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top = e.clientY + 'px';
  });

  poemEl = document.getElementById('poem');
  translationWrapper = document.getElementById('translation-wrapper');
  translationWrapper.addEventListener('mousemove', (e) => {
    if (!translationVisible) return;

    const rect = translationWrapper.getBoundingClientRect();

    translationWrapper.querySelectorAll('span').forEach(span => {
      const spanRect = span.getBoundingClientRect();
      const sx = spanRect.left + spanRect.width / 2;
      const sy = spanRect.top + spanRect.height / 2;

      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = 50;
      const strength = Math.max(0, (maxDist - dist)/maxDist);

      const tx = dx * 0.5 * strength;
      const ty = dy * 0.5 * strength;
      const scale = 1 + 0.4 * strength;

      span.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    });
  });

  translationWrapper.addEventListener('mouseleave', () => {
    translationWrapper.querySelectorAll('span').forEach(span => {
      span.style.transform = 'translate(0,0) scale(1)';
    });
  });

  function updateTranslationVisibility() {
    translationWrapper.style.opacity = translationVisible ? 1 : 0;
  }

  function wrapTranslationChars() {
    const text = translationWrapper.innerText;
    translationWrapper.innerHTML = ''; 
    const lines = text.split('\n');

    lines.forEach((line, i) => {
      const lineDiv = document.createElement('div');
      lineDiv.style.display = 'block'; 
      lineDiv.style.lineHeight = '1.4em';
      lineDiv.style.marginBottom = '2px';
      
      for (let ch of line) {
        const span = document.createElement('span');
        span.innerText = ch;
        span.style.display = 'inline-block';
        span.style.transition = 'transform 0.1s ease';
        span.style.marginRight = '2px'; 

        lineDiv.appendChild(span);
      }
      
      translationWrapper.appendChild(lineDiv);
    });
  }

  function toggleTranslation() {
    if (currentPoemGodai === 0 || currentPoemGodai === 1 || currentPoemGodai === 2 || currentPoemGodai === 3 || currentPoemGodai === 4) {
      translationVisible = !translationVisible;

      if (translationVisible) {
        if (currentPoemGodai === 0) {
          translationWrapper.innerText = "O snail,\nClimb Mount Fuji,\nBut slowly, slowly.";
        } else if (currentPoemGodai === 1) {
          translationWrapper.innerText = "An old pond-\nA frog jumps in,\nThe sound of water.";
        } else if (currentPoemGodai === 2) {
          translationWrapper.innerText = "The banked fire-\nThe guest's shadow on the wall-\nA silhouette.";
        } else if (currentPoemGodai === 3) {
          translationWrapper.innerText = "A spring breeze is blowing\nI'm bursting with laughter —\nwishing for flowers";
        } else if (currentPoemGodai === 4) {
          translationWrapper.innerText = "Summer grasses,\nAll that remains\nOf warriors' dreams";
        }

        wrapTranslationChars();

        gsap.to(translationWrapper, {
          opacity: 1,
          duration: 0.3,
          pointerEvents: 'auto'
        });

        translationWrapper.style.left = '';   
        translationWrapper.style.top = '';
        translationWrapper.style.transform = ''; 
      } else {
        gsap.to(translationWrapper, {
          opacity: 0,
          duration: 0.3,
          pointerEvents: 'none',
          onComplete: () => {
            translationWrapper.innerText = "";
          }
        });
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
      toggleTranslation();
    }
  });


  subtitleEl = document.getElementById('subtitle');
  godaiButtons = document.querySelectorAll('#godai button');

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: '#sec-landing-scale',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const p = gsap.parseEase("power2.out")(self.progress);
      scaleFactor = 0 + p * 0.6;
      globalOpacity = 1;
      subtitleEl.style.opacity = 1;
    }
  });

  ScrollTrigger.create({
    trigger: '#sec-landing-hold',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const p = gsap.parseEase("power2.out")(self.progress);
      scaleFactor = 1.0;
      globalOpacity = 1;
      subtitleEl.style.opacity = String(1 - p);
      subtitleEl.style.transform =
        `translate(-50%, -50%) translateY(${p * 30}px)`;
    }
  });

  ScrollTrigger.create({
    trigger: '#sec-landing-out',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const p = gsap.parseEase("power2.out")(self.progress);
      globalOpacity = 1 - p;
    }
  });

  HAIKUS.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: `#sec-${i}`,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setPoem(item),
      onEnterBack: () => setPoem(item)
    });
  });

  ScrollTrigger.create({
    snap: {
      snapTo: "section", 
      duration: 0.45, 
      ease: "power1.inOut"
    }
  });

  poemEl.style.opacity = 0;
  
}

function draw() {
  background(0);

  // If we're on the end screen, don't draw anything else
  if (endScreen) {
    return;
  }

  let hoveredRect = false;

  if (!endMode) {
    for (let s of shapes) {
      if (s.hidden) continue;
      const isHover = drawShape(s);
      if (isHover) hoveredRect = true;
    }
  } else {
    drawEndPhase();
    if (cursorEl) cursorEl.textContent = '';
  }

  if (!endMode && cursorEl) cursorEl.textContent = hoveredRect ? '地' : '';

  if (!drawFirstPoem) {
    if (!endMode) {
      drawTitlePoints();
    }
  } else {
    if (showPoints) drawPoemPoints();
    else drawFirstPoemP5();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildPoints();
}

function buildPoints() {
  textFont(font);
  textSize(BASE_SIZE);
  const bounds = font.textBounds(TEXT, 0, 0, BASE_SIZE);
  const targetLeft = width / 2 - bounds.w / 2;
  const targetTop = height / 2 - bounds.h / 2;
  const baselineX = targetLeft - bounds.x;
  const baselineY = targetTop - bounds.y;

  points = font.textToPoints(TEXT, baselineX, baselineY, BASE_SIZE, {
    sampleFactor: SAMPLE,
    simplifyThreshold: 0
  });
}

function drawTitlePoints() {
  const mx = width / 2 + (mouseX - width / 2) / scaleFactor;
  const my = height / 2 + (mouseY - height / 2) / scaleFactor;

  push();
  translate(width / 2, height / 2);
  scale(scaleFactor);
  translate(-width / 2, -height / 2);
  noStroke();

  for (const pt of points) {
    const d = dist(mx, my, pt.x, pt.y);
    const t = constrain(1 - d / HIT_RADIUS, 0, 1);
    const alpha = lerp(BASE_ALPHA, HOVER_ALPHA, t) * globalOpacity;
    const r = lerp(BASE_COLOR[0], HI_COLOR[0], t);
    const g = lerp(BASE_COLOR[1], HI_COLOR[1], t);
    const b = lerp(BASE_COLOR[2], HI_COLOR[2], t);

    fill(r, g, b, alpha);
    const ox = randomGaussian() * JITTER;
    const oy = randomGaussian() * JITTER;
    circle(pt.x + ox, pt.y + oy, 2);
  }
  pop();
}

function setPoem(item) {
  gsap.to(poemEl, {
    opacity: 0,
    duration: 0.2,
    onComplete: () => {
      const lines = item.text.split("\n");

      translationWrapper.innerText = "";
      translationWrapper.style.opacity = 0;
      translationVisible = false;

      if (item.godai >= 0 && item.godai <= 4) {
        drawFirstPoem = true;
        poemStartTime = millis();
        firstPoemLines = lines;
        poemPoints = [];
        showPoints = false;
        applied = false;
        rectModeActive = false;
        circleModeActive = false;
        currentPoemGodai = item.godai;
        poemEl.innerHTML = '';

        shapes.forEach(s => {
          if (currentPoemGodai === 0) {
            s.hidden = true; 
          } else if (currentPoemGodai === 1) {
            if (s.type === 'rect') s.hidden = true;
          } else if (currentPoemGodai === 2) {
            if (s.type === 'rect' || s.type === 'circle') s.hidden = true;
          } else if (currentPoemGodai === 3) {
            if (s.type === 'rect' || s.type === 'circle' || s.type === 'custom3') s.hidden = true;
          } else if (currentPoemGodai === 4) {

            if (s.type === 'rect' || s.type === 'circle' || s.type === 'custom3' || s.type === 'bubblyRect') s.hidden = true;
          }
        });
      } else {
        drawFirstPoem = false;
        poemEl.innerHTML = `
          <div class="poem-vertical">
            ${lines.map(line => `<div class="line">${line}</div>`).join("")}
          </div>`;
        poemEl.style.pointerEvents = 'none';
      }

      activateGodai(item.godai);
      gsap.to(poemEl, { opacity: 1, duration: 0.35 });
    }
  });
}

function keyPressed() {
  const translationWrapper = document.getElementById('translation-wrapper');
  const nav = document.getElementById('nav');

  if (key === 'e' || key === 'E') {
    if (currentPoemGodai === 4 && !endMode) {
      const visibleShapes = shapes.filter(s => !s.hidden);
      if (visibleShapes.length === 0) {
        console.warn('No visible shapes to collapse into 間 — create shapes first (press Space on poem 5).');
        return;
      }

      endMode = true;

      textFont(font);
      textSize(BASE_SIZE);
      const bounds = font.textBounds(TEXT, 0, 0, BASE_SIZE);
      const targetLeft = width / 2 - bounds.w / 2;
      const targetTop = height / 2 - bounds.h / 2;
      const baselineX = targetLeft - bounds.x;
      const baselineY = targetTop - bounds.y;

      const targetPoints = font.textToPoints(TEXT, baselineX, baselineY, BASE_SIZE, {
        sampleFactor: SAMPLE,
        simplifyThreshold: 0
      });

      let allPoints = [];
      shapes.forEach(s => {
        if (!s.hidden) {
          allPoints = allPoints.concat(
            s.points.map(p => ({
              ...p,
              color: s.color ? [...s.color] : [255, 255, 255],
              pointSize: s.pointSize || 3,
              dissolveAlpha: 1, // Initialize dissolve alpha
              currentSize: s.pointSize || 3 // Initialize current size
            }))
          );
        }
      });

      gsap.utils.shuffle(targetPoints);

      allPoints.forEach((p, i) => {
        let target = targetPoints[i % targetPoints.length];
        const jitterX = random(-2, 2);
        const jitterY = random(-2, 2);
        gsap.to(p, {
          x: target.x + jitterX,
          y: target.y + jitterY,
          duration: 2,
          ease: "power2.inOut"
        });
      });

      mergedPoints = allPoints;
    }
  }

  if (key === 'm' || key === 'M') {
    if (endMode) {
      // Start dissolving the points
      fadingOut = true;
      
      // Hide godai and nav elements immediately
      const godaiEl = document.getElementById('godai');
      const navEl = document.getElementById('nav');
      const poemEl = document.getElementById('poem');
      const translationWrapper = document.getElementById('translation-wrapper');
      
      if (godaiEl) godaiEl.style.display = 'none';
      if (navEl) navEl.style.display = 'none';
      if (poemEl) poemEl.style.display = 'none';
      if (translationWrapper) translationWrapper.style.display = 'none';
      
      // Animate each point individually for a more organic dissolve effect
      mergedPoints.forEach((point, index) => {
        // Random direction for dust-like dispersion
        const angle = random(0, TWO_PI);
        const distance = random(100, 300);
        const targetX = point.x + cos(angle) * distance;
        const targetY = point.y + sin(angle) * distance - random(50, 150); // Slight upward bias like dust
        
        // Main dispersion animation
        gsap.to(point, {
          duration: random(2, 4), // Longer duration for floating effect
          delay: random(0, 1), // More staggered timing
          ease: "power1.out",
          x: targetX,
          y: targetY,
          onUpdate: function() {
            // Fade out over time
            const progress = this.progress();
            point.dissolveAlpha = 1 - progress;
            // Shrink as it fades
            point.currentSize = (point.pointSize || 3) * (1 - progress * 0.8);
          },
          onComplete: function() {
            point.dissolveAlpha = 0;
          }
        });
        
        // Add floating wind effect
        const windX = random(-20, 20);
        const windY = random(-10, 10);
        gsap.to(point, {
          duration: random(0.8, 1.5),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          x: `+=${windX}`,
          y: `+=${windY}`
        });
      });
      
      // After a delay, show the end screen
      gsap.delayedCall(5, () => {
        endScreen = true;
        document.body.style.background = "black";
        showEndText = true;
        showEndOptions();
      });
    }
  }

  if (!drawFirstPoem || !applied) return;

  if (key === ' ') {
    if (translationWrapper) translationWrapper.style.opacity = 0;

    const shapeSettings = {
      color: [...pointSettings.color],
      pointSize: pointSettings.pointSize,
      sampleFactor: pointSettings.sampleFactor
    };

    if (currentPoemGodai === 0) {
      rectModeActive = true;
      buildRectanglePoints();
      shapes.push({
        type: 'rect',
        points: poemPoints.map(p => ({ x: p.x, y: p.y })),
        hidden: false,
        label: '地',
        ...shapeSettings
      });
    } else if (currentPoemGodai === 1) {
      const cx = width / 2;
      const cy = height * 0.64;
      const r = 80;
      const n = poemPoints.length || 500;
      const circlePts = buildCircleFilled(n, cx, cy, r);

      shapes.push({
        type: 'circle',
        points: circlePts,
        hidden: false,
        ...shapeSettings
      });

      shapes.forEach(s => { if (s.type === 'rect') s.hidden = false; });
    } else if (currentPoemGodai === 2) {
      const n = poemPoints.length || 400;
      const customPts = buildCustomShape3Points(n);

      shapes.push({
        type: 'custom3',
        points: customPts,
        hidden: false,
        ...shapeSettings
      });

      shapes.forEach(s => {
        if (s.type === 'rect' || s.type === 'circle') s.hidden = false;
      });
    } else if (currentPoemGodai === 3) {
      const n = poemPoints.length || 400;
      const customPts = buildBubblyRectPoints(n);

      shapes.push({
        type: 'bubblyRect',
        points: customPts,
        hidden: false,
        ...shapeSettings
      });

      shapes.forEach(s => {
        if (['rect','circle','custom3'].includes(s.type)) s.hidden = false;
      });
    } else if (currentPoemGodai === 4) {
      const n = poemPoints.length || 500;
      shapes.push({
        type: 'poem5Shape',
        points: buildPoem5ShapePoints(n),
        hidden: false,
        color: [...pointSettings.color],
        pointSize: pointSettings.pointSize
      });

      shapes.forEach(s => s.hidden = false);

      if (nav) nav.innerHTML = `<button class="center">press E then M to end the journey</button>`;
    }

    poemPoints = [];
    drawFirstPoem = false;
  }
}

function isMouseOverRect(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return mouseX >= minX && mouseX <= maxX && mouseY >= minY && mouseY <= maxY;
}

function drawFirstPoemP5() {
  push();
  textFont(font);
  textAlign(CENTER, TOP);
  fill(255, 255 * poemOpacity);

  const cols = firstPoemLines.length || 1;
  const centerX = width / 2;
  const colGap = POEM_COL_GAP;
  const fontSize = POEM_FONT_SIZE;
  textSize(fontSize);

  let colHeights = firstPoemLines.map(line => line.length * fontSize);
  const maxColHeight = Math.max(...colHeights);
  const totalHeight = maxColHeight + (cols - 1) * POEM_STEP_DOWN;
  const groupTop = height / 2 - totalHeight / 2;

  let elapsed = millis() - poemStartTime;
  let counter = 0;

  for (let i = 0; i < cols; i++) {
    const line = firstPoemLines[i];
    const colX = centerX + (i - (cols - 1) / 2) * colGap;
    const topY = groupTop + (i * POEM_STEP_DOWN);

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const charStart = counter * charDelay;
      const t = (elapsed - charStart) / fadeDuration;

      if (t >= 0) {
        const alpha = constrain(t, 0, 1) * poemOpacity;
        drawComplexCharP5(ch, colX, topY + j * (fontSize * 1.05), fontSize, alpha);
      }

      counter++;
    }
  }
  pop();
}

function drawComplexCharP5(ch, x, y, size, alpha = 1) {
  push();
  textSize(size);
  fill(255, 255 * alpha);
  noStroke();
  text(ch, x, y);
  pop();
}

function buildPoemPoints(poem, font, fontSize, topY, colX, pointSettings) {
  textFont(font);
  textSize(fontSize);

  const ascent = textAscent();
  const descent = textDescent();

  let allPoints = [];

  for (let i = 0; i < poem.length; i++) {
    const line = poem[i];

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch.trim() === "") continue;

      const bounds = font.textBounds(ch, 0, 0, fontSize);
      const xText = colX - bounds.w / 2;
      const yText = topY + j * (fontSize * 1.05);
      const baselineY = yText + ascent;

      let pts = font.textToPoints(ch, xText, baselineY, fontSize, {
        sampleFactor: pointSettings.sampleFactor,
        simplifyThreshold: 0
      });

      allPoints.push(...pts);
    }
  }

  return allPoints;
}

function buildRectanglePoints() {
  const total = poemPoints.length;
  if (total === 0) return;

  const rectW = width * 0.2;
  const rectH = height * 0.13;
  const offsetY = height * 0.29;

  const startX = width / 2 - rectW / 2;
  const startY = height / 2 - rectH / 2 + offsetY;

  const cols = Math.round(Math.sqrt(total * rectW / rectH));
  const rows = Math.round(total / cols);

  const xSpacing = rectW / cols;
  const ySpacing = rectH / rows;

  let newPoints = [];
  let idx = 0;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (idx >= total) break;
      let x = startX + j * xSpacing + xSpacing / 2;
      let y = startY + i * ySpacing + ySpacing / 2;

      if (applied) {
        const jitter = 3;
        x += random(-jitter, jitter);
        y += random(-jitter, jitter);
      }

      newPoints.push({ x, y });
      idx++;
    }
  }

  poemPoints = newPoints;
}

function buildCircleFilled(n, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = random(0, TWO_PI);
    const radius = r * sqrt(random()); 
    const x = cx + cos(angle) * radius;
    const y = cy + sin(angle) * radius;
    pts.push({ x, y });
  }
  return pts;
}

function buildCirclePoints() {

  const total = poemPoints.length;
  if (total === 0) return;

  const cx = width / 2;
  const cy = height / 2 + height * 0.2;
  const r = min(width, height) * 0.045;
  const n = total;
  let newPoints = [];

  for (let i = 0; i < n; i++) {
    let angle = map(i, 0, n, 0, TWO_PI);
    let x = cx + cos(angle) * r;
    let y = cy + sin(angle) * r;
    newPoints.push({ x, y });
  }

  poemPoints = newPoints;
}

function buildCustomShape3Points(n) {
  const pts = [];
  const baseW = 220;
  const baseH = 100;
  const cx = width / 2;
  const cy = height * 0.5;

  const topY = cy - baseH / 2;
  const botY = cy + baseH / 2;
  const topW = baseW * 0.5;
  const botW = baseW;

  const pg = createGraphics(width, height);
  pg.noStroke();
  pg.fill(255);

  pg.beginShape();
  pg.vertex(cx - botW / 2, botY);
  pg.bezierVertex(
    cx - botW / 2 - 40, cy,
    cx - topW / 2 - 20, cy,
    cx - topW / 2, topY
  );
  pg.vertex(cx + topW / 2, topY);
  pg.bezierVertex(
    cx + topW / 2 + 20, cy,
    cx + botW / 2 + 40, cy,
    cx + botW / 2, botY
  );
  pg.endShape(CLOSE);

  let count = 0;
  while (pts.length < n && count < n * 20) {
    const x = random(cx - botW / 2 - 50, cx + botW / 2 + 50);
    const y = random(topY - 20, botY + 20);
    const c = pg.get(x, y);
    if (c[3] > 0) pts.push({ x, y });
    count++;
  }
  return pts;
}

function buildBubblyRectPoints(n) {
  const pts = [];
  const w = width * 0.047;
  const h = height * 0.11;
  const cx = width / 2;
  const cy = height * 0.39;

  const leftX = cx - w / 2;
  const rightX = cx + w / 2;
  const topY = cy - h / 2;
  const botY = cy + h / 2;

  const pg = createGraphics(width, height);
  pg.noStroke();
  pg.fill(255);

  pg.beginShape();

  pg.vertex(leftX, topY);
  pg.vertex(rightX, topY);

  const midY = (topY + botY) / 2;
  pg.bezierVertex(rightX + 40, topY + (botY - topY) * 0.25,
                  rightX + 40, topY + (botY - topY) * 0.75,
                  rightX, botY);

  pg.vertex(leftX, botY);

  pg.bezierVertex(leftX - 40, topY + (botY - topY) * 0.75,
                  leftX - 40, topY + (botY - topY) * 0.25,
                  leftX, topY);
  pg.endShape(CLOSE);

  let count = 0;
  while (pts.length < n && count < n * 20) {
    const x = random(leftX - 50, rightX + 50);
    const y = random(topY - 50, botY + 50);
    const c = pg.get(x, y);
    if (c[3] > 0) pts.push({ x, y });
    count++;
  }

  return pts;
}

function buildPoem5ShapePoints(n) {
  const pts = [];
  const cx = width / 2;
  const cy = height * 0.265;   
  const w = width * 0.08;   
  const h = height * 0.14;   

  const pg = createGraphics(width, height);
  pg.noStroke();
  pg.fill(255);

  pg.beginShape();

  pg.vertex(cx, cy - h / 2);

  pg.bezierVertex(
    cx - w * 0.8, cy - h * 0.1,
    cx - w * 0.6, cy + h * 0.6,
    cx, cy + h / 2
  );

  pg.bezierVertex(
    cx + w * 0.6, cy + h * 0.6,
    cx + w * 0.8, cy - h * 0.1,
    cx, cy - h / 2
  );
  pg.endShape(CLOSE);

  let count = 0;
  while (pts.length < n && count < n * 20) {
    const x = random(cx - w / 2 - 20, cx + w / 2 + 20);
    const y = random(cy - h / 2 - 20, cy + h / 2 + 20);
    const c = pg.get(x, y);
    if (c[3] > 0) pts.push({ x, y });
    count++;
  }
  return pts;
}

function drawPoemPoints() {
  noStroke();
  fill(pointSettings.color[0], pointSettings.color[1], pointSettings.color[2]);
  for (let p of poemPoints) {
    circle(p.x, p.y, pointSettings.pointSize);
  }
}

function drawShape(s) {
  noStroke();
  fill(...s.color, 180 * endFade);

  let hover = false;
  const repelRadius = 100; 
  const repelStrength = 20; 

  if (s.type === 'rect') {
    hover = isMouseOverRect(s.points);
  } else if (['circle','custom3','bubblyRect','poem5Shape'].includes(s.type)) {

    const xs = s.points.map(p => p.x);
    const ys = s.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    hover = mouseX >= minX && mouseX <= maxX && mouseY >= minY && mouseY <= maxY;
  }

  for (let p of s.points) {

    let x = p.x;
    let y = p.y;

    if (hover) {
      const dx = mouseX - x;
      const dy = mouseY - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < repelRadius * repelRadius) {
        const dist = Math.sqrt(distSq) || 1;
        const strength = (repelRadius - dist) / repelRadius;
        x -= (dx / dist) * strength * repelStrength;
        y -= (dy / dist) * strength * repelStrength;
      }
    }

    circle(x, y, s.pointSize || 3);

    p.vx = x;
    p.vy = y;

    // fade out từng point
    fill(...s.color, 200 * endFade);
    circle(x, y, s.pointSize || 3);
  }

  return (s.type === 'rect' && hover); 
}

function activateGodai(index) {
  if (!godaiButtons) return;
  godaiButtons.forEach((btn, i) => {
    if (i === index) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function mousePressed() {
  if (drawFirstPoem && !showPoints) {
    showPoints = true;

    const cols = firstPoemLines.length || 1;
    const centerX = width / 2;
    const colGap = POEM_COL_GAP;
    const fontSize = POEM_FONT_SIZE;

    let colHeights = firstPoemLines.map(line => line.length * fontSize);
    const maxColHeight = Math.max(...colHeights);
    const totalHeight = maxColHeight + (cols - 1) * POEM_STEP_DOWN;
    const groupTop = height / 2 - totalHeight / 2;

    let allPts = [];

    for (let i = 0; i < cols; i++) {
      const line = firstPoemLines[i];
      const colX = centerX + (i - (cols - 1) / 2) * colGap;
      const topY = groupTop + (i * POEM_STEP_DOWN);

      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch.trim() === "") continue;

        const pts = buildPoemPoints([ch], font, fontSize, topY + j * fontSize, colX, pointSettings);
        allPts.push(...pts);
      }
    }

    poemPoints = allPts;
    setupGUI();
  }
}

function setupGUI() {
  if (gui) return;

  gui = new lil.GUI({ width: 220 });
  gui.domElement.classList.add("custom-gui");

  gui.add(pointSettings, 'sampleFactor', 0.05, 1.0, 0.05)
    .name('Density')
    .onChange(() => {
      if (!applied && drawFirstPoem && showPoints) {
        const cols = firstPoemLines.length || 1;
        const centerX = width / 2;
        const colGap = POEM_COL_GAP;
        const fontSize = POEM_FONT_SIZE;

        let colHeights = firstPoemLines.map(line => line.length * fontSize);
        const maxColHeight = Math.max(...colHeights);
        const totalHeight = maxColHeight + (cols - 1) * POEM_STEP_DOWN;
        const groupTop = height / 2 - totalHeight / 2;

        let allPts = [];

        for (let i = 0; i < cols; i++) {
          const line = firstPoemLines[i];
          const colX = centerX + (i - (cols - 1) / 2) * colGap;
          const topY = groupTop + (i * POEM_STEP_DOWN);

          for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch.trim() === "") continue;

            const pts = buildPoemPoints([ch], font, fontSize, topY + j * fontSize, colX, pointSettings);
            allPts.push(...pts);
          }
        }

        poemPoints = allPts;
      }
    });

  gui.add(pointSettings, 'pointSize', 1, 10, 1).name('Size');

  const colorWrapper = document.createElement("div");
  colorWrapper.style.display = "flex";
  colorWrapper.style.flexDirection = "column";
  colorWrapper.style.gap = "6px";
  colorWrapper.style.marginBottom = "14px";

  const colorLabel = document.createElement("label");
  colorLabel.innerText = "Color";
  colorLabel.style.fontSize = "13px";
  colorLabel.style.fontWeight = "500";

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = rgbToHex(pointSettings.color[0], pointSettings.color[1], pointSettings.color[2]);
  colorInput.style.width = "100%";
  colorInput.style.height = "36px";
  colorInput.style.border = "none";
  colorInput.style.borderRadius = "6px";
  colorInput.style.cursor = "pointer";
  colorInput.style.background = "none";

  colorInput.addEventListener("input", (e) => {
    const hex = e.target.value;
    pointSettings.color = hexToRgbArray(hex);
  });

  colorWrapper.appendChild(colorLabel);
  colorWrapper.appendChild(colorInput);

  gui.domElement.querySelector(".children").appendChild(colorWrapper);

  const applyBtn = document.createElement("button");
  applyBtn.innerText = "Apply";
  applyBtn.style.marginTop = "10px";
  applyBtn.onclick = () => {
    applied = true;
    gui.domElement.remove();
    gui.destroy();
    gui = null;
  };
  gui.domElement.querySelector(".children").appendChild(applyBtn);

  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "x";
  closeBtn.classList.add("custom-close-btn");
  closeBtn.onclick = () => {
    gui.domElement.classList.remove('open');
    gui.domElement.remove();
    gui.destroy();
    gui = null;
  };
  gui.domElement.appendChild(closeBtn);
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x =>
    Math.round(x).toString(16).padStart(2, '0')
  ).join("");
}

function hexToRgbArray(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function drawEndPhase() {
  if (!mergedPoints.length) return;

  // Only draw points if we haven't finished dissolving
  if (!showEndText) {
    noStroke();
    
    for (let p of mergedPoints) {
      // Use individual point's dissolve alpha if it exists, otherwise use 1
      const alpha = (p.dissolveAlpha !== undefined ? p.dissolveAlpha : 1) * 255;
      
      if (alpha > 5) { // Only draw if there's still some alpha
        fill(
          p.color ? p.color[0] : 255, 
          p.color ? p.color[1] : 255, 
          p.color ? p.color[2] : 255, 
          alpha
        );
        
        // Use shrinking size for dust effect
        const size = p.currentSize !== undefined ? p.currentSize : (p.pointSize || 3);
        circle(p.x, p.y, size);
      }
    }
  }
}

function showEndOptions() {
  const overlay = document.createElement('div');
  overlay.id = "end-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "black";
  overlay.style.color = "white";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";
  overlay.style.fontFamily = "'Raleway', sans-serif";

  const endText = document.createElement('div');
  endText.innerText = "end.";
  endText.style.fontSize = "64px";
  endText.style.marginBottom = "40px";
  endText.style.fontWeight = "300";
  endText.style.fontFamily = "'Raleway', sans-serif";
  overlay.appendChild(endText);

  const btnRestart = document.createElement('button');
  btnRestart.innerText = "restart";
  btnRestart.onclick = () => location.reload();
  btnRestart.style.background = "transparent";
  btnRestart.style.color = "white";
  btnRestart.style.border = "none";
  btnRestart.style.cursor = "pointer";
  btnRestart.style.fontFamily = "'Raleway', sans-serif";
  btnRestart.style.fontSize = "18px";
  btnRestart.style.fontWeight = "400";
  btnRestart.style.fontStyle = "italic";
  btnRestart.style.padding = "8px 0";
  btnRestart.style.transition = "all 0.3s ease";
  btnRestart.style.textShadow = "none";
  
  btnRestart.addEventListener('mouseenter', () => {
    btnRestart.style.textShadow = "0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.4)";
  });
  
  btnRestart.addEventListener('mouseleave', () => {
    btnRestart.style.textShadow = "none";
  });

  overlay.appendChild(btnRestart);

  document.body.appendChild(overlay);
}