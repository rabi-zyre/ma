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
let scaleFactor = 0; 
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

let endMode = false;
let mergedPoints = [];
let blackholeProgress = 0;
let showEndText = false;

let endFade = 1;     
let fadingOut = false;

let endScreen = false;
let completedPoems = []; 
let scrollLocked = false; 

let instructionModalVisible = false;

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

  // Setup godai navigation tooltips after buttons are available
  setupGodaiTooltips();

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: '#sec-landing-scale',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const p = gsap.parseEase("power2.out")(self.progress);
      scaleFactor = 0 + p * 0.6; // This will animate from 0 to 0.6
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
      onEnter: () => {
        // Only set poem if it's different from current poem
        if (canAccessPoem(i)) {
          if (currentPoemGodai !== i) {
            setPoem(item);
          }
        } else {
          // Prevent access to locked poem - scroll back immediately
          console.log(`Access denied to poem ${i}, scrolling back...`);
          setTimeout(() => {
            scrollToLastAccessiblePoem();
          }, 50);
        }
      },
      onEnterBack: () => {
        // Only set poem if it's different from current poem
        if (canAccessPoem(i)) {
          if (currentPoemGodai !== i) {
            setPoem(item);
          }
        } else {
          // Prevent access to locked poem - scroll back immediately
          console.log(`Access denied to poem ${i} (back), scrolling back...`);
          setTimeout(() => {
            scrollToLastAccessiblePoem();
          }, 50);
        }
      }
    });
  });

  // Add scroll lock functionality
  let isScrolling = false;
  
  window.addEventListener('wheel', (e) => {
    if (shouldBlockScroll()) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (shouldBlockScroll()) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (shouldBlockScroll() && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  ScrollTrigger.create({
    snap: {
      snapTo: "section", 
      duration: 0.45, 
      ease: "power1.inOut"
    }
  });

  poemEl.style.opacity = 0;
  
  // Create instruction button
  createInstructionButton();
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
      
      // Mark poem as completed
      if (!completedPoems.includes(0)) {
        completedPoems.push(0);
      }
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
      
      // Mark poem as completed
      if (!completedPoems.includes(1)) {
        completedPoems.push(1);
      }
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
      
      // Mark poem as completed
      if (!completedPoems.includes(2)) {
        completedPoems.push(2);
      }
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
      
      // Mark poem as completed
      if (!completedPoems.includes(3)) {
        completedPoems.push(3);
      }
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
      
      // Mark poem as completed
      if (!completedPoems.includes(4)) {
        completedPoems.push(4);
      }
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
    // Check if mouse is actually over the poem text area
    const cols = firstPoemLines.length || 1;
    const centerX = width / 2;
    const colGap = POEM_COL_GAP;
    const fontSize = POEM_FONT_SIZE;

    let colHeights = firstPoemLines.map(line => line.length * fontSize);
    const maxColHeight = Math.max(...colHeights);
    const totalHeight = maxColHeight + (cols - 1) * POEM_STEP_DOWN;
    const groupTop = height / 2 - totalHeight / 2;

    // Check if mouse is within the poem text bounds
    let mouseOverPoem = false;
    const textMargin = 50; // Margin around text for easier clicking
    
    for (let i = 0; i < cols; i++) {
      const line = firstPoemLines[i];
      const colX = centerX + (i - (cols - 1) / 2) * colGap;
      const topY = groupTop + (i * POEM_STEP_DOWN);
      const bottomY = topY + line.length * fontSize;
      
      // Check if mouse is within this column's bounds (with margin)
      if (mouseX >= colX - textMargin && 
          mouseX <= colX + textMargin && 
          mouseY >= topY - textMargin && 
          mouseY <= bottomY + textMargin) {
        mouseOverPoem = true;
        break;
      }
    }

    // Only trigger if mouse is actually over the poem area
    if (mouseOverPoem) {
      showPoints = true;

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
}

function setupGUI() {
  if (gui) return;

  const guiContainer = document.createElement('div');
  guiContainer.id = 'custom-gui-container';
  guiContainer.style.position = 'fixed';
  guiContainer.style.top = '50%';
  guiContainer.style.right = '20px';
  guiContainer.style.transform = 'translateY(-50%)';
  guiContainer.style.width = '300px';
  guiContainer.style.backgroundColor = 'rgba(20, 20, 20, 0.95)';
  guiContainer.style.borderRadius = '12px';
  guiContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  guiContainer.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
  guiContainer.style.zIndex = '10000';
  guiContainer.style.fontFamily = "'Raleway', sans-serif";
  guiContainer.style.opacity = '0';
  guiContainer.style.transition = 'opacity 0.3s ease';

  const content = document.createElement('div');
  content.style.padding = '20px';
  content.style.position = 'relative';

  const title = document.createElement('h2');
  title.innerHTML = 'Settings';
  title.style.color = 'white';
  title.style.fontFamily = "'Raleway', sans-serif";
  title.style.fontWeight = '300';
  title.style.fontSize = '18px';
  title.style.marginBottom = '20px';
  title.style.marginTop = '5px';
  title.style.textAlign = 'center';

  const densityWrapper = document.createElement('div');
  densityWrapper.style.marginBottom = '15px';

  const densityLabel = document.createElement('label');
  densityLabel.innerText = 'Density';
  densityLabel.style.color = 'rgba(255, 255, 255, 0.9)';
  densityLabel.style.fontFamily = "'Raleway', sans-serif";
  densityLabel.style.fontSize = '13px';
  densityLabel.style.display = 'block';
  densityLabel.style.marginBottom = '8px';

  const densitySlider = document.createElement('input');
  densitySlider.type = 'range';
  densitySlider.min = '0.05';
  densitySlider.max = '1.0';
  densitySlider.step = '0.05';
  densitySlider.value = pointSettings.sampleFactor;
  densitySlider.style.width = '100%';
  densitySlider.style.height = '6px';
  densitySlider.style.backgroundColor = 'rgba(80, 80, 80, 0.8)';
  densitySlider.style.borderRadius = '3px';
  densitySlider.style.outline = 'none';
  densitySlider.style.cursor = 'pointer';
  densitySlider.style.webkitAppearance = 'none';
  densitySlider.style.appearance = 'none';
 
  const densitySliderStyle = document.createElement('style');
  densitySliderStyle.textContent = `
    #custom-gui-container input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(200, 200, 200, 0.9);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    #custom-gui-container input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(200, 200, 200, 0.9);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
  `;
  document.head.appendChild(densitySliderStyle);

  densitySlider.addEventListener('input', (e) => {
    pointSettings.sampleFactor = parseFloat(e.target.value);
    updatePoemPoints();
  });

  densityWrapper.appendChild(densityLabel);
  densityWrapper.appendChild(densitySlider);

  // Size Control
  const sizeWrapper = document.createElement('div');
  sizeWrapper.style.marginBottom = '15px';

  const sizeLabel = document.createElement('label');
  sizeLabel.innerText = 'Size';
  sizeLabel.style.color = 'rgba(255, 255, 255, 0.9)';
  sizeLabel.style.fontFamily = "'Raleway', sans-serif";
  sizeLabel.style.fontSize = '13px';
  sizeLabel.style.display = 'block';
  sizeLabel.style.marginBottom = '8px';

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '1';
  sizeSlider.max = '10';
  sizeSlider.step = '1';
  sizeSlider.value = pointSettings.pointSize;
  sizeSlider.style.width = '100%';
  sizeSlider.style.height = '6px';
  sizeSlider.style.backgroundColor = 'rgba(80, 80, 80, 0.8)';
  sizeSlider.style.borderRadius = '3px';
  sizeSlider.style.outline = 'none';
  sizeSlider.style.cursor = 'pointer';
  sizeSlider.style.webkitAppearance = 'none';
  sizeSlider.style.appearance = 'none';

  sizeSlider.addEventListener('input', (e) => {
    pointSettings.pointSize = parseInt(e.target.value);
  });

  sizeWrapper.appendChild(sizeLabel);
  sizeWrapper.appendChild(sizeSlider);

  // Color Control
  const colorWrapper = document.createElement('div');
  colorWrapper.style.marginBottom = '20px';

  const colorLabel = document.createElement('label');
  colorLabel.innerText = 'Color';
  colorLabel.style.color = 'rgba(255, 255, 255, 0.9)';
  colorLabel.style.fontFamily = "'Raleway', sans-serif";
  colorLabel.style.fontSize = '13px';
  colorLabel.style.display = 'block';
  colorLabel.style.marginBottom = '8px';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = rgbToHex(pointSettings.color[0], pointSettings.color[1], pointSettings.color[2]);
  colorInput.style.width = '100%';
  colorInput.style.height = '40px';
  colorInput.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  colorInput.style.borderRadius = '8px';
  colorInput.style.cursor = 'pointer';
  colorInput.style.backgroundColor = 'transparent';

  colorInput.addEventListener('input', (e) => {
    const hex = e.target.value;
    pointSettings.color = hexToRgbArray(hex);
  });

  colorWrapper.appendChild(colorLabel);
  colorWrapper.appendChild(colorInput);

  // Apply Button
  const applyBtn = document.createElement('button');
  applyBtn.innerText = 'Apply';
  applyBtn.style.width = '100%';
  applyBtn.style.padding = '12px';
  applyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  applyBtn.style.color = 'white';
  applyBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  applyBtn.style.borderRadius = '8px';
  applyBtn.style.fontFamily = "'Raleway', sans-serif";
  applyBtn.style.fontSize = '14px';
  applyBtn.style.cursor = 'pointer';
  applyBtn.style.transition = 'all 0.3s ease';

  applyBtn.addEventListener('mouseenter', () => {
    applyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    applyBtn.style.transform = 'translateY(-1px)';
  });

  applyBtn.addEventListener('mouseleave', () => {
    applyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    applyBtn.style.transform = 'translateY(0)';
  });

  applyBtn.addEventListener('click', () => {
    applied = true;
    closeCustomGUI();
  });

  content.appendChild(title);
  content.appendChild(densityWrapper);
  content.appendChild(sizeWrapper);
  content.appendChild(colorWrapper);
  content.appendChild(applyBtn);
  guiContainer.appendChild(content);

  document.body.appendChild(guiContainer);
  
  gui = { domElement: guiContainer, destroy: () => closeCustomGUI() };
  
  setTimeout(() => {
    guiContainer.style.opacity = '1';
  }, 10);

  function updatePoemPoints() {
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
  }

  function closeCustomGUI() {
    const container = document.getElementById('custom-gui-container');
    if (container) {
      container.style.opacity = '0';
      setTimeout(() => {
        container.remove();
        gui = null;
      }, 300);
    }
  }
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

  if (!showEndText) {
    noStroke();
    
    for (let p of mergedPoints) {
      const alpha = (p.dissolveAlpha !== undefined ? p.dissolveAlpha : 1) * 255;
      
      if (alpha > 5) {
        fill(
          p.color ? p.color[0] : 255, 
          p.color ? p.color[1] : 255, 
          p.color ? p.color[2] : 255, 
          alpha
        );

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

function createInstructionButton() {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'instruction-button-container';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '0';
  buttonContainer.style.left = '0';
  buttonContainer.style.zIndex = '1000';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.alignItems = 'flex-end';
  buttonContainer.style.gap = '15px';
  buttonContainer.style.padding = '0';
  buttonContainer.style.pointerEvents = 'none';

  const quarterCircle = document.createElement('div');
  quarterCircle.id = 'quarter-circle-button';
  quarterCircle.style.width = '60px';
  quarterCircle.style.height = '60px';
  quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  quarterCircle.style.borderRadius = '0 60px 0 0';
  quarterCircle.style.cursor = 'pointer';
  quarterCircle.style.pointerEvents = 'auto';
  quarterCircle.style.transition = 'all 0.3s ease';
  quarterCircle.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
  quarterCircle.style.border = 'none';
  quarterCircle.style.position = 'relative';

  const instructionText = document.createElement('div');
  instructionText.innerText = 'check this out before starting';
  instructionText.style.color = 'rgba(255, 255, 255, 0.8)';
  instructionText.style.fontSize = '12px';
  instructionText.style.fontFamily = "'Raleway', sans-serif";
  instructionText.style.fontWeight = '400';
  instructionText.style.textAlign = 'left';
  instructionText.style.lineHeight = '1.4';
  instructionText.style.pointerEvents = 'none';
  instructionText.style.userSelect = 'none';
  instructionText.style.whiteSpace = 'nowrap';
  instructionText.style.transition = 'opacity 0.3s ease';
  instructionText.style.marginBottom = '20px'; 

  quarterCircle.addEventListener('mouseenter', () => {
    quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    quarterCircle.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.15)';
    quarterCircle.style.transform = 'scale(1.05)';
  });

  quarterCircle.addEventListener('mouseleave', () => {
    quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    quarterCircle.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
    quarterCircle.style.transform = 'scale(1)';
  });

  quarterCircle.addEventListener('click', () => {
    buttonContainer.style.display = 'none';
    showInstructionModal();
  });

  buttonContainer.appendChild(quarterCircle);
  buttonContainer.appendChild(instructionText);
  document.body.appendChild(buttonContainer);
}

function showInstructionModal() {
  if (instructionModalVisible) return;
  
  instructionModalVisible = true;
  
  const modal = document.createElement('div');
  modal.id = 'instruction-modal';
  modal.style.position = 'fixed';
  modal.style.bottom = '20px';
  modal.style.left = '20px';
  modal.style.width = '350px';
  modal.style.maxHeight = '70vh';
  modal.style.backgroundColor = 'rgba(20, 20, 20, 0.95)';
  modal.style.zIndex = '10000';
  modal.style.opacity = '0';
  modal.style.transform = 'translateY(100%)';
  modal.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  modal.style.borderRadius = '12px';
  modal.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  modal.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';

  const content = document.createElement('div');
  content.style.padding = '20px';
  content.style.width = '100%';
  content.style.height = '100%';
  content.style.overflowY = 'auto';
  content.style.borderRadius = '12px';
  content.style.position = 'relative';
  content.style.boxSizing = 'border-box';

  // Close button (X) - positioned inside the content area
  const xButton = document.createElement('div');
  xButton.innerHTML = '×';
  xButton.style.position = 'absolute';
  xButton.style.top = '8px';
  xButton.style.right = '8px';
  xButton.style.color = 'rgba(255, 255, 255, 0.7)';
  xButton.style.fontSize = '18px';
  xButton.style.cursor = 'pointer';
  xButton.style.zIndex = '10001';
  xButton.style.transition = 'all 0.3s ease';
  xButton.style.lineHeight = '1';
  xButton.style.width = '24px';
  xButton.style.height = '24px';
  xButton.style.display = 'flex';
  xButton.style.alignItems = 'center';
  xButton.style.justifyContent = 'center';
  xButton.style.borderRadius = '50%';
  xButton.addEventListener('mouseenter', () => {
    xButton.style.color = 'white';
    xButton.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
    xButton.style.transform = 'scale(1.1)';
  });
  xButton.addEventListener('mouseleave', () => {
    xButton.style.color = 'rgba(255, 255, 255, 0.7)';
    xButton.style.backgroundColor = 'transparent';
    xButton.style.transform = 'scale(1)';
  });
  xButton.addEventListener('click', (e) => {
    e.stopPropagation();
    hideInstructionModal();
  });

  const title = document.createElement('h2');
  title.innerHTML = 'step-by-step to<br>experience 間 (Ma)';
  title.style.color = 'white';
  title.style.fontFamily = "'Raleway', sans-serif";
  title.style.fontWeight = '300';
  title.style.fontSize = '18px';
  title.style.marginBottom = '15px';
  title.style.marginTop = '5px';
  title.style.textAlign = 'center';
  title.style.width = '100%';
  title.style.boxSizing = 'border-box';
  title.style.position = 'relative';
  title.style.left = '-12px'; // Offset to account for X button and center properly

  const instructions = document.createElement('div');
  instructions.style.color = 'rgba(255, 255, 255, 0.9)';
  instructions.style.fontFamily = "'Raleway', sans-serif";
  instructions.style.fontSize = '13px';
  instructions.style.lineHeight = '1.4';
  instructions.style.marginBottom = '15px';
  
  instructions.innerHTML = `
    <div style="margin-bottom: 20px;">
      <ul style="margin: 0; padding: 0; list-style: none; font-family: 'Raleway', sans-serif;">
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">1. <strong>scroll</strong> to move to the next 俳句 (haiku)</li>
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">2. <strong>click</strong> a 俳句 to see a change</li>
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">3. <strong>press SPACE</strong> to reveal the 五大 (godai — five elements) shapes in the 五輪塔 (gorintō)</li>
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">4. complete each 俳句 before moving to the next</li>
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">5. <strong>press E</strong> to see the transformation of the 五輪塔 (after completing all poems)</li>
        <li style="margin-bottom: 10px; font-size: 13px; line-height: 1.4;">6. <strong>press M</strong> to end your journey</li>
      </ul>
    </div>

    <div style="margin-bottom: 0; font-style: italic; text-align: left; color: rgba(255, 255, 255, 0.7); font-size: 12px; font-family: 'Raleway', sans-serif;">
      <p style="margin: 0 0 5px 0;">note:</p>
      <p style="margin: 0 0 3px 0;">1. <strong>press T</strong> for English translation</p>
      <p style="margin: 0;">2. <strong>hover the godai navigation</strong> for English translation</p>
    </div>
  `;

  content.appendChild(xButton);
  content.appendChild(title);
  content.appendChild(instructions);
  modal.appendChild(content);
  document.body.appendChild(modal);

  setTimeout(() => {
    modal.style.opacity = '1';
    modal.style.transform = 'translateY(0)';
  }, 10);

  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      hideInstructionModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function hideInstructionModal() {
  const modal = document.getElementById('instruction-modal');
  if (modal) {
    modal.style.opacity = '0';
    modal.style.transform = 'translateY(100%)';
    setTimeout(() => {
      modal.remove();
      instructionModalVisible = false;

      const buttonContainer = document.getElementById('instruction-button-container');
      if (buttonContainer) {

        buttonContainer.innerHTML = '';

        const quarterCircle = document.createElement('div');
        quarterCircle.id = 'quarter-circle-button';
        quarterCircle.style.width = '60px';
        quarterCircle.style.height = '60px';
        quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        quarterCircle.style.borderRadius = '0 60px 0 0';
        quarterCircle.style.cursor = 'pointer';
        quarterCircle.style.pointerEvents = 'auto';
        quarterCircle.style.transition = 'all 0.3s ease';
        quarterCircle.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
        quarterCircle.style.border = 'none';
        quarterCircle.style.position = 'relative';

        quarterCircle.addEventListener('mouseenter', () => {
          quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
          quarterCircle.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.15)';
          quarterCircle.style.transform = 'scale(1.05)';
        });

        quarterCircle.addEventListener('mouseleave', () => {
          quarterCircle.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          quarterCircle.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
          quarterCircle.style.transform = 'scale(1)';
        });

        quarterCircle.addEventListener('click', () => {
          buttonContainer.style.display = 'none';
          showInstructionModal();
        });

        buttonContainer.appendChild(quarterCircle);
        buttonContainer.style.display = 'flex';
      }
    }, 300);
  }
}

function canAccessPoem(poemIndex) {
  if (poemIndex === 0) return true;
  
  const canAccess = completedPoems.includes(poemIndex - 1);
  console.log(`Can access poem ${poemIndex}:`, canAccess, 'Completed poems:', completedPoems);
  return canAccess;
}

function shouldBlockScroll() {
  return false;
}

function scrollToLastAccessiblePoem() {
  let lastAccessible = 0;
  for (let i = 0; i < HAIKUS.length; i++) {
    if (canAccessPoem(i)) {
      lastAccessible = i;
    } else {
      break;
    }
  }
  
  console.log(`Scrolling back to last accessible poem: ${lastAccessible}`);
  setTimeout(() => {
    const targetSection = document.getElementById(`sec-${lastAccessible}`);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

function getCurrentPoemSection() {
  const scrollPosition = window.scrollY + window.innerHeight / 2;
  
  for (let i = 0; i < HAIKUS.length; i++) {
    const section = document.getElementById(`sec-${i}`);
    if (section) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const sectionBottom = sectionTop + rect.height;
      
      if (scrollPosition >= sectionTop && scrollPosition <= sectionBottom) {
        return i;
      }
    }
  }
  return 0;
}


function setupGodaiTooltips() {
  const godaiTranslations = [
    { japanese: '地', english: 'Earth' },
    { japanese: '水', english: 'Water' },
    { japanese: '火', english: 'Fire' },
    { japanese: '風', english: 'Wind' },
    { japanese: '空', english: 'Void' }
  ];

  if (!godaiButtons || godaiButtons.length === 0) {
    console.log('Godai buttons not found, retrying...');
    setTimeout(setupGodaiTooltips, 100);
    return;
  }

  console.log('Setting up tooltips for', godaiButtons.length, 'buttons');

  godaiButtons.forEach((button, index) => {
    if (index < godaiTranslations.length) {
      const translation = godaiTranslations[index];

      const originalContent = button.innerHTML;
      
      const translationEl = document.createElement('div');
      translationEl.className = 'godai-translation';
      translationEl.innerText = translation.english;
      translationEl.style.fontSize = '10px';
      translationEl.style.color = 'rgba(128, 128, 128, 0)';
      translationEl.style.fontFamily = "'Raleway', sans-serif";
      translationEl.style.fontWeight = '300';
      translationEl.style.transition = 'color 0.3s ease';
      translationEl.style.marginTop = '2px';
      translationEl.style.lineHeight = '1';
      
      button.innerHTML = '';
      button.style.display = 'flex';
      button.style.flexDirection = 'column';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.textAlign = 'center';

      const japaneseEl = document.createElement('div');
      japaneseEl.innerText = translation.japanese;
      button.appendChild(japaneseEl);

      button.appendChild(translationEl);
      
      console.log('Added translation for button', index, ':', translation.english);

      button.addEventListener('mouseenter', () => {
        console.log('Hovering over button', index);
        translationEl.style.color = 'rgba(128, 128, 128, 1)';
      });

      button.addEventListener('mouseleave', () => {
        console.log('Left button', index);
        translationEl.style.color = 'rgba(128, 128, 128, 0)';
      });
    }
  });
}