import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let started = false;
const startOverlay = document.getElementById('startOverlay');

let hoveredCenterStar = false;
const centerStarTooltip = document.getElementById('centerStarTooltip');

let prevMouse = new THREE.Vector2();

const phantomMemoryTitle = "The One Still Being Written";
const phantomMemoryText = `All these memories already shine so brightly…<br>
but the one that matters most hasn't happened yet.<br><br>

Every laugh we haven't shared,<br>
every game we haven't played,<br>
every tomorrow we'll discover together.<br><br>

This star is our future —<br>
and I can't wait to keep creating it with you.`;

const bgm = new Audio('assets/constellation-love.mp3');
bgm.loop = true;
bgm.volume = 0.12;

const shimmer = new Audio('assets/shimmer.mp3');
shimmer.loop = false;
shimmer.volume = 0.2;

let audioCtx;
// let shimmerBuffer;
let shimmerBuffers = [];
let lastShimmerTime = 0;
const SHIMMER_COOLDOWN = 120; // ms (tweak 80–200)

function updateLockStardusts(delta) {
  for (let i = lockStardusts.length - 1; i >= 0; i--) {
    const emitter = lockStardusts[i];
    const { points, velocities } = emitter;
    const positions = points.geometry.attributes.position;

    emitter.age += delta;

    for (let j = 0; j < positions.count; j++) {
      positions.array[j * 3]     += velocities[j].x * delta;
      positions.array[j * 3 + 1] += velocities[j].y * delta;
      positions.array[j * 3 + 2] += velocities[j].z * delta;

      const swirlStrength = 0.6;

      const vx = velocities[j].x;
      const vz = velocities[j].z;

      // Rotate velocity slightly around Y-axis
      velocities[j].x = vx * Math.cos(swirlStrength * delta) - vz * Math.sin(swirlStrength * delta);
      velocities[j].z = vx * Math.sin(swirlStrength * delta) + vz * Math.cos(swirlStrength * delta);
    }

    // Only fade when told to
    if (emitter.fading) {
      points.material.opacity -= delta * 0.6;   // fade speed
    }

    positions.needsUpdate = true;

    // Cleanup
    if (points.material.opacity <= 0) {
      scene.remove(points);
      lockStardusts.splice(i, 1);
    }
  }

  setTimeout(() => {
    fadeLockStardust();
  }, 2000);
}

function fadeLockStardust() {
  console.log('its working, theyre fading');
  lockStardusts.forEach(e => e.fading = true);
}

function hoverCenterStar() {
  // Show the tooltip
  if (!clickedCenterStar) {
    centerStarTooltip.classList.add('visible');
  }
  centerStarTooltip.classList.remove('hidden');

  // Optional: make star "pop" when hovered
  if (centerStar) {
    centerStar.scale.set(1.2, 1.2, 1.2); // slightly bigger
  }
  if (lockSprite) {
    lockSprite.scale.set(1.2, 1.2, 1.2);
  }

  document.body.style.cursor = 'pointer';
}

function unhoverCenterStar() {
  // Hide the tooltip
  centerStarTooltip.classList.remove('visible');
  centerStarTooltip.classList.add('hidden');

  // Reset star scale
  if (centerStar) {
    centerStar.scale.set(1, 1, 1);
  }
  if (lockSprite) {
    lockSprite.scale.set(1, 1, 1);
  }

  document.body.style.cursor = 'default';
}

const lockStardusts = [];

function onCenterStarClicked() {
  if (!centerStar || !lockSprite) return;

  fizzleLockIntoStardust(lockSprite, lockStardusts, 60);

  setTimeout(() => {
    showCenterMessage(
      "Happy Valentine's Day, Lin ❤️",
      centerText,
      { fadeIn: 3000 }
    );
  }, 1200);

  setTimeout(() => {
    showCenterMessage(
      "You are the brightest thing in my universe.",
      centerText2,
      { fadeIn: 3500 }
    );
  }, 3000);
}

function checkCenterStarHover() {
  if (!centerStar) return; // only if star exists

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([centerStar, lockSprite]);

  if (intersects.length > 0) {
    if (!hoveredCenterStar) {
      hoveredCenterStar = true;
      hoverCenterStar();
    }
  } else {
    if (hoveredCenterStar) {
      hoveredCenterStar = false;
      unhoverCenterStar();
    }
  }

  // Update tooltip position if visible
  if (hoveredCenterStar) {
    // project star position to 2D screen coordinates
    const vector = centerStar.position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    centerStarTooltip.style.left = x + 10 + 'px'; // slight offset
    centerStarTooltip.style.top = y + 10 + 'px';
  }
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log('AudioContext created:', audioCtx.state);
  }
}

async function loadShimmers() {
  const files = [
    'assets/shimmer2.mp3',
    'assets/shimmer3.mp3'
  ];

  shimmerBuffers = await Promise.all(
    files.map(async (url) => {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      return audioCtx.decodeAudioData(data);
    })
  );

  console.log('Shimmers loaded:', shimmerBuffers.length);
}

function playShimmer() {
  if (!shimmerBuffers.length || audioCtx.state !== 'running') return;

  const now = performance.now();
  if (now - lastShimmerTime < SHIMMER_COOLDOWN) return;

  lastShimmerTime = now;

  const buffer =
    shimmerBuffers[Math.floor(Math.random() * shimmerBuffers.length)];

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.12;

  // subtle variation every time
  source.playbackRate.value = 0.9 + Math.random() * 0.2;

  source.connect(gain).connect(audioCtx.destination);
  source.start();
}

startOverlay.addEventListener('pointerdown', async () => {
  startOverlay.classList.add('hidden');

  // Fully remove after fade
  setTimeout(() => {
    startOverlay.remove();
  }, 1500);

  enterTheStars();
}, { once: true });

let musicStarted = false;

function playMusicIfNeeded() {
  if (!musicStarted) {
    bgm.currentTime = 15.0;
    bgm.play().catch(() => {});
    musicStarted = true;
  }
}

function focusOnStar(star, duration = 1200, pause = 800) {
  // Save original look direction
  const originalTarget = new THREE.Vector3();
  camera.getWorldDirection(originalTarget);
  originalTarget.multiplyScalar(10).add(camera.position);

  const starTarget = star.position.clone();

  // Animate camera to phantom star
  function animateToStar(timeStart) {
    const animate = (time) => {
      const t = Math.min((time - timeStart) / duration, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep

      const currentTarget = originalTarget.clone().lerp(starTarget, ease);
      camera.lookAt(currentTarget);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Pause briefly before returning
        setTimeout(() => animateBack(performance.now()), pause);
      }
    };
    requestAnimationFrame(animate);
  }

  // Animate camera back to original target
  function animateBack(timeStart) {
    const animate = (time) => {
      const t = Math.min((time - timeStart) / duration, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep

      const currentTarget = starTarget.clone().lerp(originalTarget, ease);
      camera.lookAt(currentTarget);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  animateToStar(performance.now());
}

function onLastMemoryClosed() {
    revealPhantomMemory();
}

let playStars = false;
function animateCore(core, speed = 1) {
    if (!started) return;
    if (!playStars) {
      shimmer.play().catch(() => {});
      playStars = true;
    }
    const total = core.userData.totalPoints;
    const current = core.userData.currentDraw || 0;
    
    const next = Math.min(current + speed, total); // increment
    core.geometry.setDrawRange(0, next);

    core.userData.currentDraw = next;
}

let phantomRevealed = false;
// -------------------------
// Phantom Memory Reveal
// -------------------------
function revealPhantomMemory() {
  if (phantomRevealed) return; // only once
  phantomRevealed = true;
  // Create the phantom star
  const geo = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffaaff,
    emissive: 0xff88ff,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,   // start invisible
  });

  const phantomStar = new THREE.Mesh(geo, mat);
  phantomStar.position.copy(phantom); // use the phantom point position
  scene.add(phantomStar);
  focusOnStar(phantomStar);

  // Animation state
  const duration = 2000; // milliseconds
  const startTime = performance.now();
  const startScale = 0.1;
  const endScale = 1.0;
  const startOpacity = 0;
  const endOpacity = 0.9;

  function animate() {
    const elapsed = performance.now() - startTime;
    let t = Math.min(elapsed / duration, 1); // 0 -> 1

    // Ease out cubic for smooth slow reveal
    const ease = (--t) * t * t + 1;

    phantomStar.scale.setScalar(startScale + (endScale - startScale) * ease);
    phantomStar.material.opacity = startOpacity + (endOpacity - startOpacity) * ease;
    phantomStar.material.emissiveIntensity = 1 + 2 * ease;

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      // Optional: add a gentle twinkle after fully revealed
      twinklePhantom(phantomStar);
    }
  }

  memoryStars.push(hiddenStar); // add to memory stars for interaction
  updateProximity();

  animate();
}

function startStarPulse(star) {
  const baseScale = 1;
  const pulseAmount = 0.08;
  const speed = 0.0015;

  let start = performance.now();

  function pulse(time) {
    const t = (time - start) * speed;
    const scale = baseScale + Math.sin(t) * pulseAmount;

    star.scale.setScalar(scale);
    requestAnimationFrame(pulse);
  }

  requestAnimationFrame(pulse);
}

function animateStarIn(star, {
  delay = 0,
  duration = 1600,
  pulse = true
} = {}) {
  if (!star) return;

  star.visible = true;

  // Initial state
  const startScale = 0.05;
  const endScale = 1.0;
  const startOpacity = 0;
  const endOpacity = 1;

  star.scale.setScalar(startScale);
  star.material.opacity = startOpacity;

  const startTime = performance.now() + delay;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(time) {
    if (time < startTime) {
      requestAnimationFrame(animate);
      return;
    }

    const t = Math.min((time - startTime) / duration, 1);
    const ease = easeOutCubic(t);

    const scale = startScale + (endScale - startScale) * ease;
    const opacity = startOpacity + (endOpacity - startOpacity) * ease;

    star.scale.setScalar(scale);
    star.material.opacity = opacity;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else if (pulse) {
      startStarPulse(star);
    }
  }

  requestAnimationFrame(animate);
}

function spawnCenterStar() {
  centerStar.visible = true;
  centerStar.material.opacity = 0;
  centerStar.scale.set(0.1, 0.1, 0.1);

  animateStarIn(centerStar);
}

function showCenterMessage(message, centerText, options = {}) {
  centerText.textContent = message;

  // if fadeIn is true, add the class
  if (options.fadeIn) {
    centerText.classList.add('fadeIn');
  } else {
    centerText.style.opacity = 1; // just show immediately
  }

  // remove the hidden class so it’s visible
  centerText.classList.remove('hidden');

  // auto-hide after duration if provided
  if (options.duration) {
    setTimeout(() => {
      centerText.classList.remove('fadeIn');
      centerText.classList.add('hidden');
    }, options.duration);
  }
}

function createLockSprite() {
  // create a canvas to draw the emoji
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = "100px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔒", 64, 64); // draw lock emoji

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1, 1, 1); // adjust size to fit your star
  return sprite;
}

const lockSprite = createLockSprite();

function createCenterStar() {
  const geometry = new THREE.SphereGeometry(0.6, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffd7ff,
    transparent: true,
    opacity: 0
  });

  centerStar = new THREE.Mesh(geometry, material);
  centerStar.position.set(0, 0, 0);
  centerStar.visible = false;
  centerStar.userData.isCenterStar = true;

  // usage: attach to your star
  centerStar.add(lockSprite); // star = your star mesh or group
  lockSprite.position.set(0, 1, 0); // adjust offset if you want it above the star

  scene.add(centerStar);
}

function onPhantomMemoryClosed() {
  // Small emotional pause
  setTimeout(() => {
    spawnCenterStar();
  }, 600);
}

// -------------------------
// Gentle twinkle effect
// -------------------------
function twinklePhantom(star) {
  const baseIntensity = 1.5;
  function twinkle() {
    const t = performance.now() * 0.002;
    star.material.emissiveIntensity = baseIntensity + Math.sin(t * 2 * Math.PI) * 0.5;
    requestAnimationFrame(twinkle);
  }
  twinkle();
}

function createAttentionPulse(position) {
  const geometry = new THREE.RingGeometry(
    1.2,   // inner radius
    1.8,   // outer radius
    64
  );

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0xffb6ff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        float dist = length(uv);

        // Soft radial falloff
        float ring = smoothstep(0.48, 0.40, dist) * smoothstep(0.15, 0.30, dist);

        // Slow breathing pulse
        float pulse = 0.5 + 0.5 * sin(time * 2.0);

        float alpha = ring * mix(0.2, 0.6, pulse);

        gl_FragColor = vec4(color, alpha);
      }
    `
  });

  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(position);

  ring.userData = {
    baseScale: ring.scale.clone(),
    material,
  };

  scene.add(ring);
  return ring;
}

function createStardust(curve, count) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const activationDist = [];
    const active = [];

    for (let i = 0; i < count; i++) {
        const t = Math.random();
        const point = curve.getPointAt(t);
        const dist = t * curve.getLength();

        activationDist.push(dist);

        positions[i * 3]     = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        velocities.push(
            new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            )
        );
        active.push(false);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffc6ff,
        size: 0.12,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.rotation.z += 0.003;

    points.userData = {
        velocities,
        activationDist,
        active
    }
    
    return points;
}

function interactWithStardust(particles) {
  if (!started) return;
  const positions = particles.geometry.attributes.position;
  const { velocities, active } = particles.userData;

  if (!mouse || isZoomedIn) return;

  // Compute mouse movement delta
  const delta = new THREE.Vector2(mouse.x - prevMouse.x, mouse.y - prevMouse.y);

  // Scale the delta for effect strength
  const strength = 0.5;

  // Project mouse to 3D ray
  raycaster.setFromCamera(mouse, camera);

  for (let i = 0; i < positions.count; i++) {
    if (!active[i]) continue; // only affect active particles

    const particlePos = new THREE.Vector3(
      positions.array[i * 3],
      positions.array[i * 3 + 1],
      positions.array[i * 3 + 2]
    );

    // Distance from mouse ray
    const dist = raycaster.ray.distanceToPoint(particlePos);
    if (dist < 1.5) { // small radius around cursor
      // Apply small velocity in mouse movement direction
      velocities[i].x += delta.x * strength * (Math.random() * 0.5 + 0.5);
      velocities[i].y += delta.y * strength * (Math.random() * 0.5 + 0.5);

      // Optional: play tiny shimmer for interaction
      if (Math.abs(delta.x) > 0.01 || Math.abs(delta.y) > 0.01) {
        playShimmer();
      }
    }
  }

  prevMouse.copy(mouse);
}

function getTrimmedCurve(curve, divisions = 200, trimPercent = 0.952) {
    const pts = curve.getPoints(divisions);
    const trimmedPts = pts.slice(0, Math.floor(pts.length * trimPercent));

    return new THREE.CatmullRomCurve3(
        trimmedPts,
        false,
        'catmullrom',
        0.5
    );
}

function addTrailAura(scene, curve) {
    const trimmedCurve = getTrimmedCurve(curve, 200, 0.95);

    // ---------- INNER CORE (bright spine) ----------
    const coreGeometry = new THREE.TubeGeometry(
        trimmedCurve,
        200,
        0.15,   // core thickness
        24,
        false
    );
    coreGeometry.setDrawRange(0, 0);

    const coreMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            color: { value: new THREE.Color(0xffb6ff) },
            intensity: { value: 0.9 },
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float intensity;
            varying vec3 vNormal;

            void main() {
                float radial = pow(length(vNormal.xy), 1.5);
                float core = smoothstep(1.0, 0.0, radial);

                gl_FragColor = vec4(color, core * intensity);
            }
        `,
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.userData.totalPoints = coreGeometry.attributes.position.count * 30;
    scene.add(core);

    return { core };
}

function createAnimatedTrail(scene) {

    // clone star positions
    const points = memoryStars.map(star => star.position.clone());

    // ---------- CREATE PHANTOM POINT (spiral-aware) ----------
    const pLast = points[points.length - 1];
    const pPrev = points[points.length - 2];

    const rLast = Math.hypot(pLast.x, pLast.y);
    const rPrev = Math.hypot(pPrev.x, pPrev.y);

    const angleLast = Math.atan2(pLast.y, pLast.x);
    const anglePrev = Math.atan2(pPrev.y, pPrev.x);

    const angleDelta = angleLast - anglePrev;
    const radiusDelta = rLast - rPrev;
    const zDelta = pLast.z - pPrev.z;

    const phantom = new THREE.Vector3(
        Math.cos(angleLast + angleDelta) * (rLast + radiusDelta),
        Math.sin(angleLast + angleDelta) * (rLast + radiusDelta),
        pLast.z + zDelta
    );

    points.push(phantom);

    // ---------- CURVE ----------
    const curve = new THREE.CatmullRomCurve3(
        points,
        false,
        'catmullrom',
        0.5
    );

    curve.closed = false;

    // ---------- GEOMETRY ----------
    const divisions = 200;
    const curvePoints = curve.getPoints(divisions * 0.952);
    const arcLengths = curve.getLengths(divisions * 0.952);

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(curvePoints);
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
        color: 0xffb6ff,
        transparent: true,
        opacity: 0.6,
    });

    const line = new THREE.Line(geometry, material);

    // ---------- ANIMATION DATA ----------
    line.userData = {
        totalPoints: curvePoints.length,
        currentCount: 0,
        arcLengths,
        totalLength: arcLengths[arcLengths.length - 1],
    };

    // scene.add(line); // optional if you want the spine
    const trailAura = addTrailAura(scene, curve);

    return {
        line,
        curve,
        core: trailAura.core
    };
}

function animateTrail(line, speed = 0.5) {
    if (!started) return;
    if (line.userData.currentCount < line.userData.totalPoints) {
        line.userData.currentCount += speed;

        line.geometry.setDrawRange(
            0,
            Math.floor(line.userData.currentCount) * 0.952
        );
    }
}

function updateStardust(particles, revealedLength) {
  const pos = particles.geometry.attributes.position;
  const { velocities, activationDist, active } = particles.userData;

  for (let i = 0; i < activationDist.length; i++) {
    if (!active[i] && activationDist[i] <= revealedLength) {
      active[i] = true;

      // Disney magic burst ✨
      velocities[i].multiplyScalar(6 + Math.random() * 4);
    }

    if (active[i]) {
      pos.array[i * 3]     += velocities[i].x;
      pos.array[i * 3 + 1] += velocities[i].y;
      pos.array[i * 3 + 2] += velocities[i].z;

      velocities[i].multiplyScalar(0.94);
    }
  }

  pos.needsUpdate = true;
}

function fizzleLockIntoStardust(lock, stardustGroup, count = 50) {
  const startPos = lock.getWorldPosition(new THREE.Vector3());
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = []; // store THREE.Vector3 for each particle

  const spread = 2;
  const speed = 3;

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = startPos.x + (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = startPos.y + (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = startPos.z + (Math.random() - 0.5) * spread;

    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed + 1.0, // upward boost
        (Math.random() - 0.5) * speed
      )
    );
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffc6ff,
    size: 0.08,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  stardustGroup.push({ points, velocities, age: 0, fading: false });

  centerStar.remove(lock);
}

const canvas = document.getElementById('scene');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 30;

// 🔍 Save the true original camera position for zoom-out
const trueOriginalCameraPos = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

let clickedCenterStar = false;

// Listen for clicks on the canvas
renderer.domElement.addEventListener('click', (event) => {
  if (!centerStar || !centerStar?.visible) return;

  unhoverCenterStar();

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycast
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([centerStar, lockSprite]);

  if (intersects.length > 0) {
    onCenterStarClicked();
  }

  clickedCenterStar = true;
});

// 💫 Bloom Effect Composer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.8,  // strength - how intense the glow is
  0.6,  // radius - how soft it spreads
  0.2   // threshold - lower = more things glow (romance mode: 0.15-0.25)
);
composer.addPass(bloomPass);

// ✨ Background Stars
const starGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const positions = [];

for (let i = 0; i < starCount; i++) {
  positions.push(
    (Math.random() - 0.5) * 400,
    (Math.random() - 0.5) * 400,
    (Math.random() - 0.5) * 400
  );
}

starGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(positions, 3)
);

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.5,
  opacity: 0.6,
  transparent: true,
});

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const memories = [
  {
    title: "The First Message",
    text: "One accidental message, and somehow, it led me to the right person.<br><br><div class=\"left\">\"Hey, did you get the email from our alliance?\"<br><br>\"Oh my god, I seem to have recognized the wrong person.\"</div>",
  },
  {
    title: "The First Compliment",
    text: "She showed me her nail art and said, 'ignore it!' I told her I liked it anyway. Just a tiny moment, but it made me smile all day."
  },
  {
    title: "Exploring the Queen's Kingdom",
    text: "<div class=\"left\">\"I'm obsessed with Infinity Kingdom right now, are you interested in playing it together?\"<br>- \"When can I join?\"<br>\"I'll take you with me.\"</div>",
  },
  {
    title: "The First Good Morning",
    text: "The moment strangers became more than strangers. Different time zones, but the same feeling.",
  },
  {
    title: "Morning My Queen 🌙",
    text: "When affection stopped being accidental and became intentional.",
  },
  {
    title: "One Hundred Thousand",
    text: "100K power together—not just as teammates, but as something more. Every step earned. Every moment shared. Unforgettable.",
  },
  {
    title: "No Longer a Secret",
    text: "When we told the alliance. What we had wasn't just real—it was ours to share.",
  },
  {
    title: "World Heart — Conquered Together",
    text: "Side by side. Same goal. Same fire. Our shadows moved together, as one.",
  },
  {
    title: "Chaos Beasts Fell That Night",
    text: "That night, we were unstoppable.",
  },
  {
    title: "Caught Checking Messages",
    text: "Pretending to sleep… secretly hoping you'd text me.",
  },
  {
    title: "Beauty Sleep for the Queen",
    text: "The kingdom can wait. You come first.",
  },
  {
    title: "Drooling, Apparently 😆",
    text: "Even queens can be adorably caught off guard 😆",
  },
  {
    title: "Busy Days, Soft Nights",
    text: "Even when the world was loud, you are always my quiet.",
  },
  {
    title: "\"If I Need You to Thank Me Again…",
    text: "…all I need is a kiss.\"",
  },
  {
    title: "Spicy Noodles & Brave Hearts",
    text: "She could handle it. Still adorable about it.",
  },
  {
    title: "\"Dear\"",
    text: "One word. It said everything. Soft, familiar, and ours.",
  },
  {
    title: "I Wish I Could Steal Some Cuddles",
    text: "Distance is temporary. Our warmth isn't.",
  },
  {
    title: "Two Hundred Thousand",
    text: "The world is ours to build. Everything else fades as we forge our path—side by side, hand in hand, together.",
  },
  
  // 🌠 BOTTOM (future memory)
  {
    title: "—",
    text: "I see you've followed the stars… Now, <strong>close this memory</strong>, and let me show you the last little secret I saved just for you. ❤️",
  },
];

const startRadius = 3.5;      // prevents center clump
const angleStep = Math.PI / 3.2;
const radiusStep = 1.15;
const zStep = -0.5;
let theta = 0;

memories.forEach((memory, i) => {
  const r = startRadius + radiusStep * i;

  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const z = zStep * i;

  memory.position = new THREE.Vector3(x, y, z);
  theta += angleStep;
});

const memoryStars = [];
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.6;
const mouse = new THREE.Vector2();

const geo = new THREE.SphereGeometry(0.6, 16, 16);
const mat = new THREE.MeshStandardMaterial({
  color: 0xfff1ff,
  emissive: 0xffe0ff,
  emissiveIntensity: 1.6,
  transparent: true,
  opacity: 0.9,
});

memories.forEach(mem => {
  const star = new THREE.Mesh(geo, mat);
  star.position.copy(mem.position);
  star.userData = {
    ...mem,
    baseScale: star.scale.clone(),
    isHovering: false,
    brightnessOffset: Math.random() * 0.5,
    brightnessSpeed: 0.001 + Math.random() * 0.002,
  };
  scene.add(star);
  memoryStars.push(star);
});

const last = memoryStars[memoryStars.length - 1].position;
const prev = memoryStars[memoryStars.length - 2].position;

const rLast = Math.hypot(last.x, last.y);
const rPrev = Math.hypot(prev.x, prev.y);

const angleLast = Math.atan2(last.y, last.x);
const anglePrev = Math.atan2(prev.y, prev.x);

const angleDelta = angleLast - anglePrev;
const radiusDelta = rLast - rPrev;

// Push the curve forward slightly
const phantomAngle = angleLast + angleDelta;
const phantomRadius = rLast + radiusDelta;

const phantom = new THREE.Vector3(
  Math.cos(phantomAngle) * phantomRadius,
  Math.sin(phantomAngle) * phantomRadius,
  last.z + (last.z - prev.z) // preserve vertical trend
);

const hiddenStar = new THREE.Mesh(geo, mat);
hiddenStar.userData = {
  isFinalMemory: true,
  revealed: false,
  title: phantomMemoryTitle,
  text: phantomMemoryText,
  baseScale: hiddenStar.scale.clone(),
  isHovering: false,
  brightnessOffset: Math.random() * 0.5,
  brightnessSpeed: 0.001 + Math.random() * 0.002,
};
hiddenStar.position.copy(phantom);
hiddenStar.visible = false;
scene.add(hiddenStar);

const attentionPulse = createAttentionPulse(memoryStars[0].position);

let animatedTrail, core, trail, curve, stardust = null;
let centerStar = null;
let centerText = document.getElementById('centerText');
let centerText2 = document.getElementById('centerText2');

// let lockIcon = document.getElementById('starLock');
function enterTheStars() {
  if (started) return;
  started = true;
  loadShimmers();
  createCenterStar();

  // 🎶 Audio permission + music
  initAudio();
  audioCtx.resume().catch(() => {});
  playMusicIfNeeded();

  // 🌠 Create animated trail + aura
  animatedTrail = createAnimatedTrail(scene);
  core = animatedTrail.core;
  trail = animatedTrail.line;
  curve = animatedTrail.curve;

  // ✨ Create stardust AFTER curve exists
  stardust = createStardust(curve, 6000);
  scene.add(stardust);
  scene.add(trail);
}

// 🌙 Gentle Mouse Parallax
let targetX = 0;
let targetY = 0;

// Buttery smooth finger movement on mobile
let isTouching = false;
let lastTouch = new THREE.Vector2();
const PAN_LIMIT = 6;

// 📱 Detect if mobile/touch device
const isMobile = () => window.innerWidth < 768 || 'ontouchstart' in window;
// Forgiving click/tap tolerance (world units)
const clickTolerance = 0.8;
// 💜 Heartbeat tracking
let selectedStar = null;
let selectedStarIndex = -1;
let heartbeatStartTime = 0;
// 💓 Heartbeat aura (pulsing ring around selected star)
let heartbeatAura = null;
// 🔍 Zoom-in effect tracking
let isZoomedIn = false;
let originalCameraPos = new THREE.Vector3();
let zoomProgress = 0; // 0 = original, 1 = zoomed in

// ✨ Proximity-based Star Hover
function hoverStar(star) {
  if (!isMobile()) {
    document.body.style.cursor = 'pointer';
  }
  
  star.userData.isHovering = true;
  
  // Scale up smoothly (1.25x)
  const targetScale = star.userData.baseScale.clone().multiplyScalar(1.25);
  star.scale.lerp(targetScale, 0.15);
  
  // Brighten emissive glow
  star.material.emissiveIntensity = THREE.MathUtils.lerp(
    star.material.emissiveIntensity,
    3.5,
    0.15
  );
}

function unhoverStar(star) {
  star.userData.isHovering = false;
  
  // Return to original scale smoothly
  star.scale.lerp(star.userData.baseScale, 0.15);
  
  // Return to base emissive intensity
  star.material.emissiveIntensity = THREE.MathUtils.lerp(
    star.material.emissiveIntensity,
    1.5,
    0.15
  );
  
  if (!isMobile()) {
    document.body.style.cursor = 'auto';
  }
}

// 🎯 Proximity Detection (Desktop & Mobile)
function updateProximity() {
  if (!started) return;
  // Use the forgiving clickTolerance on desktop so near-misses still trigger hover
  const proximityThreshold = isMobile() ? 0.7 : clickTolerance;

  if (!isMobile()) {
    // Desktop: cursor-based proximity
    raycaster.setFromCamera(mouse, camera);
  } else {
    // Mobile: screen-center proximity
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  }

  memoryStars.forEach(star => {
    const distance = raycaster.ray.distanceToPoint(star.position);

    if (distance < proximityThreshold) {
      if (!star.userData.isHovering) {
        hoverStar(star);
      }
    } else {
      if (star.userData.isHovering) {
        unhoverStar(star);
      }
    }
  });
}

// 🖱 Click Memory
// 🖱 Click / Tap Memory (forgiving)
function tryOpenMemoryWithRay(rayOrigin) {
  // rayOrigin: { x, y } in NDC, or null to use center for mobile
  if (rayOrigin) {
    raycaster.setFromCamera(rayOrigin, camera);
  } else {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  }

  const hits = raycaster.intersectObjects(memoryStars);
  if (hits.length > 0) {
    openMemory(hits[0].object.userData);
    return true;
  }

  // Forgiving fallback: accept near-misses within the shared tolerance
  // (uses global `clickTolerance` defined near `isMobile`)
  let closest = null;
  let closestDist = Infinity;

  memoryStars.forEach(star => {
    const d = raycaster.ray.distanceToPoint(star.position);
    if (d < clickTolerance && d < closestDist) {
      closest = star;
      closestDist = d;
    }
  });

  if (closest) {
    openMemory(closest.userData);
    return true;
  }

  return false;
}

window.addEventListener('click', (e) => {
  if (!started) return;
  // Prevent clicking on stars while overlay is open
  if (!overlay.classList.contains('hidden')) {
    return;
  }
  
  // Update mouse coords for ray if desktop
  if (!isMobile()) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    tryOpenMemoryWithRay(mouse);
  } else {
    // Mobile: use center-ray forgiving click
    tryOpenMemoryWithRay(null);
  }
});

// 📱 Touch Pan Controls
window.addEventListener('touchstart', (e) => {
  if (!e.touches.length) return;
  isTouching = true;

  const t = e.touches[0];
  lastTouch.set(t.clientX, t.clientY);
});

window.addEventListener('touchmove', (e) => {
  if (!isTouching || !e.touches.length) return;

  const t = e.touches[0];

  const dx = t.clientX - lastTouch.x;
  const dy = t.clientY - lastTouch.y;

  // Convert pixels → normalized movement
  targetX += dx * -0.02;
  targetY -= dy * -0.02;

  lastTouch.set(t.clientX, t.clientY);
});


// Also handle touch taps (mobile)
window.addEventListener('touchend', (e) => {
  isTouching = false;
  if (!e.changedTouches.length) return;

  // Prevent clicking on stars while overlay is open
  if (!overlay.classList.contains('hidden')) {
    return;
  }
  
  // If there was a touch point, optionally use its position; otherwise use center
  const t = e.changedTouches && e.changedTouches[0];
  if (t && !isMobile()) {
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
    tryOpenMemoryWithRay(mouse);
  } else {
    const touch = e.changedTouches[0];

    const ndc = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );

    tryOpenMemoryWithRay(ndc);
  }
});

window.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// 📝 Memory Overlay Logic
const overlay = document.getElementById('memoryOverlay');
const titleEl = document.getElementById('memoryTitle');
const textEl = document.getElementById('memoryText');
const closeBtn = document.getElementById('closeMemory');
const nextBtn = document.getElementById('nextMemory');

function openMemory(mem) {
  playMusicIfNeeded();
  if (attentionPulse) {
    scene.remove(attentionPulse);
  }
  titleEl.textContent = mem.title;
  textEl.innerHTML = mem.text;
  overlay.classList.remove('hidden');
  
  // 💜 Find and select the star for heartbeat effect
  selectedStarIndex = memoryStars.findIndex(star => star.userData.title === mem.title);
  selectedStar = memoryStars[selectedStarIndex];
  if (selectedStarIndex >= memoryStars.length - 1) {
    nextBtn.classList.add('hidden');
  }
  else {
    nextBtn.classList.remove('hidden');
  }
  if (selectedStar) {
    heartbeatStartTime = performance.now();
    
    // Make the selected star invisible so we can see the heart aura
    selectedStar.visible = false;
    
    // 💓 Create pulsing heart aura (notification-style heartbeat)
    if (heartbeatAura) {
      scene.remove(heartbeatAura);
    }
    
    // Create heart shape geometry
    const heartShape = new THREE.Shape();

    // Classic parametric heart curve (clean + symmetric)
    heartShape.moveTo(0, 2);

    heartShape.bezierCurveTo(2, 4, 6, 4, 6, 0);
    heartShape.bezierCurveTo(6, -4, 0, -6, 0, -10);
    heartShape.bezierCurveTo(0, -6, -6, -4, -6, 0);
    heartShape.bezierCurveTo(-6, 4, -2, 4, 0, 2);

    
    // // Extrude the heart to give it 3D depth
    // const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
    //   depth: 0.4,
    //   bevelEnabled: true,
    //   bevelThickness: 0.1,
    //   bevelSize: 0.1,
    //   bevelSegments: 3,
    // });
    // heartGeo.scale(0.085, 0.08, 0.05);
    // heartGeo.center();
    
    // const heartMat = new THREE.MeshStandardMaterial({
    //   color: 0xff69b4,
    //   emissive: 0xff69b4,
    //   emissiveIntensity: 0.6,   // was 3 → much softer
    //   roughness: 0.4,
    //   metalness: 0.1,
    //   transparent: true,
    //   opacity: 0.85
    // });

    // heartbeatAura = new THREE.Mesh(heartGeo, heartMat);
    // heartbeatAura.position.copy(selectedStar.position);
    // heartbeatAura.position.z += 0.1; // slightly forward
    // // heartbeatAura.rotation.x = Math.PI; // flip heart right-side up
    // scene.add(heartbeatAura);

    // // Heart points
    // const points = heartShape.getPoints(50);
    // const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // // Main outline
    // const mainLineMat = new THREE.LineBasicMaterial({
    //     color: 0xff69b4,
    //     linewidth: 2,
    // });
    // const heartOutline = new THREE.LineLoop(geometry, mainLineMat);

    // // Glowing halo
    // const glowLineMat = new THREE.LineBasicMaterial({
    //     color: 0xff69b4,
    //     transparent: true,
    //     opacity: 0.4,
    // });
    // const heartGlow = new THREE.LineLoop(geometry, glowLineMat);
    // heartGlow.scale.set(1.2, 1.2, 1); // slightly bigger for halo

    // // Position & rotation
    // [heartOutline, heartGlow].forEach(line => {
    //     line.scale.multiplyScalar(0.08);
    //     line.position.copy(selectedStar.position);
    //     line.position.z += 0.15; // in front of star
    //     scene.add(line);
    // });

    // // Optional: animate pulse
    // function pulseHeartOutline() {
    //     const scale = 0.08 + 0.005 * Math.sin(performance.now() * 0.005);
    //     heartOutline.scale.set(scale, scale, scale);
    //     heartGlow.scale.set(scale * 1.2, scale * 1.2, scale);
    //     requestAnimationFrame(pulseHeartOutline);
    // }
    // pulseHeartOutline();

    // Use the same heartShape
const outlineGeo = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.05, // super thin
    bevelEnabled: false,
});

// Heart glow material
const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff69b4,
    emissive: 0xff69b4,
    emissiveIntensity: 5, // <-- this controls the glow strength
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
});

// Create mesh
const heartGlow = new THREE.Mesh(outlineGeo, glowMat);

// Position & rotation
heartGlow.scale.set(0.08, 0.08, 0.08);
// heartGlow.rotation.x = Math.PI;
heartGlow.position.copy(selectedStar.position);
heartGlow.position.z += 0.15; // slightly in front
scene.add(heartGlow);



    
    // �🔍 Zoom-in effect: save original position and start zoom
    originalCameraPos.copy(camera.position);
    isZoomedIn = true;
    zoomProgress = 0;
  }
}

closeBtn.onclick = (e) => {
  e.stopPropagation();
  overlay.classList.add('hidden');
  var starSelected = selectedStar;
  // 💜 Reset the star's emissive intensity and make it visible again
  if (selectedStar) {
    selectedStar.visible = true;
    selectedStar.material.emissiveIntensity = 1.5;
  }
  // 💓 Remove the heartbeat aura
  if (heartbeatAura) {
    scene.remove(heartbeatAura);
    heartbeatAura = null;
  }
  selectedStar = null;
  isZoomedIn = false;
  // Don't reset zoomProgress here—let animate loop handle the zoom-out

  var memoryStarsContainsPhantom = memoryStars.some(star => star.userData.isFinalMemory);
  if (!memoryStarsContainsPhantom && starSelected == memoryStars[memoryStars.length - 1]) {
    onLastMemoryClosed();
  }
  else if (memoryStarsContainsPhantom && starSelected.userData.isFinalMemory) {
    onPhantomMemoryClosed();
  }
};

nextBtn.onclick = (e) => {
    e.stopPropagation();
    if (selectedStarIndex >= 0 && selectedStarIndex < memoryStars.length - 1) {
        if (heartbeatAura) {
            scene.remove(heartbeatAura);
            heartbeatAura = null;
        }
        selectedStar.visible = true;
        selectedStarIndex += 1;
        selectedStar = memoryStars[selectedStarIndex];
        openMemory(selectedStar.userData);
        if (selectedStarIndex >= memoryStars.length - 1) {
            nextBtn.classList.add('hidden');
        }
        else {
            nextBtn.classList.remove('hidden');
        }
    }
}

// 💜 Heartbeat animation function (romantic pulse)
function getHeartbeatIntensity(elapsedMs) {
  // Heartbeat rhythm: roughly 2 "beats" per cycle (like lub-dub)
  const beatPhase = (elapsedMs % 1000) / 1000; // 1 second cycle
  
  let intensity = 0;
  
  // First beat: fast rise and fall
  if (beatPhase < 0.15) {
    // Rise: 0 -> 1
    intensity = beatPhase / 0.15;
  } else if (beatPhase < 0.25) {
    // Fall: 1 -> 0.3
    intensity = 1 - (beatPhase - 0.15) / 0.1 * 0.7;
  }
  // Pause
  else if (beatPhase < 0.4) {
    intensity = 0.3;
  }
  // Second beat: slightly smaller
  else if (beatPhase < 0.52) {
    // Rise: 0.3 -> 0.85
    intensity = 0.3 + (beatPhase - 0.4) / 0.12 * 0.55;
  } else if (beatPhase < 0.62) {
    // Fall: 0.85 -> 0.3
    intensity = 0.85 - (beatPhase - 0.52) / 0.1 * 0.55;
  }
  // Rest until next cycle
  else {
    intensity = 0.3;
  }
  
  // Scale into emissive range: 1.5 (base) -> 5.0 (peak heartbeat)
  return 1.5 + intensity * 3.5;
}

// 🔁 Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// 🔄 Animate
function animate() {
  requestAnimationFrame(animate);

  if (started) {
    trail.material.opacity = 0.4 + (trail.userData.currentCount / trail.userData.totalPoints) * 0.3;

    const delta = 0.016; // ~60fps

    // update stardust particles
    if (lockStardusts.length) {
      updateLockStardusts(delta);
    }

    animateCore(core, 33);

    animateTrail(trail, 0.2);

    const revealedLength =
      (trail.userData.currentCount / trail.userData.totalPoints) *
      trail.userData.totalLength;

    updateStardust(stardust, revealedLength);
  }

  // 🔍 Handle camera zoom-in/out effect
  if (isZoomedIn) {
    // Smoothly zoom in toward selected star (romantic, gentle)
    zoomProgress = Math.min(zoomProgress + 0.02, 1);
    core.visible = false;
  } else if (zoomProgress > 0) {
    // Smoothly zoom back out (very slow, romantic)
    zoomProgress = Math.max(zoomProgress - 0.01, 0);
    core.visible = true;
  }
  
  // Interpolate camera position
  if (zoomProgress > 0 && selectedStar) {
    // Target: move toward star, closer and centered on it
    const offset = new THREE.Vector3(2, 0, 5); // 👈 x=2 moves star left, z=5 keeps distance
    const targetPos = selectedStar.position.clone().add(offset);
    
    camera.position.lerp(targetPos, zoomProgress * 0.05);

    const lookAtTarget = selectedStar.position.clone();
    lookAtTarget.x += 2; // keep star slightly left of center
    camera.lookAt(lookAtTarget);
  } else if (zoomProgress > 0 && !isZoomedIn) {
    // Zooming out: lerp back to true original position (very smooth, romantic)
    camera.position.lerp(trueOriginalCameraPos, 0.05);
  } else if (zoomProgress === 0) {
    // Reset to parallax behavior when fully zoomed out
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
  }

  stars.rotation.y += 0.0002;

  // 🌟 Proximity detection & animations
  updateProximity();
  
  // ✨ Subtle breathing pulse on memory stars
  const time = performance.now();
  memoryStars.forEach(star => {
    if (!star.userData.isHovering) {
      // Gentle breathing: 1 + small sine wave
      const breathingFactor = 1 + Math.sin(time * 0.002) * 0.02;
      star.scale.copy(star.userData.baseScale).multiplyScalar(breathingFactor);
    }    
    // 💜 Heartbeat glow on selected star
    if (selectedStar && star === selectedStar) {
      const elapsedMs = time - heartbeatStartTime;
      const heartbeatIntensity = getHeartbeatIntensity(elapsedMs);
      star.material.emissiveIntensity = heartbeatIntensity;
    }

    // Subtle random flicker in emissive intensity
    const flicker = Math.sin(time * star.userData.brightnessSpeed + star.userData.brightnessOffset);
    star.material.emissiveIntensity = 1.5 + flicker * 0.3; // vary ±0.3
  });
  
  // 💓 Animate heartbeat aura (pulsing glow notification light)
  if (heartbeatAura && selectedStar) {
    const elapsedMs = time - heartbeatStartTime;
    const beatPhase = (elapsedMs % 1000) / 1000;
    
    // Subtle pulse outward and inward with heartbeat rhythm
    let pulseScale = 1;
    let pulseOpacity = 0.7;
    
    if (beatPhase < 0.15) {
      // First beat: gentle expand
      pulseScale = 1 + (beatPhase / 0.15) * 0.15;
      pulseOpacity = 0.7 + (beatPhase / 0.15) * 0.1;
    } else if (beatPhase < 0.25) {
      // First beat: contract
      pulseScale = 1.15 - ((beatPhase - 0.15) / 0.1) * 0.15;
      pulseOpacity = 0.8 - ((beatPhase - 0.15) / 0.1) * 0.1;
    } else if (beatPhase < 0.4) {
      // Rest
      pulseScale = 1;
      pulseOpacity = 0.7;
    } else if (beatPhase < 0.52) {
      // Second beat: gentle expand (smaller)
      pulseScale = 1 + ((beatPhase - 0.4) / 0.12) * 0.12;
      pulseOpacity = 0.7 + ((beatPhase - 0.4) / 0.12) * 0.08;
    } else if (beatPhase < 0.62) {
      // Second beat: contract
      pulseScale = 1.12 - ((beatPhase - 0.52) / 0.1) * 0.12;
      pulseOpacity = 0.78 - ((beatPhase - 0.52) / 0.1) * 0.08;
    } else {
      // Rest
      pulseScale = 1;
      pulseOpacity = 0.7;
    }
    
    heartbeatAura.scale.set(pulseScale, pulseScale, pulseScale);
    heartbeatAura.material.opacity = pulseOpacity;
    heartbeatAura.position.copy(selectedStar.position);
  }

  if (attentionPulse) {
    const t = performance.now() * 0.001;
    attentionPulse.material.uniforms.time.value = t;

    // Very subtle scale breathing
    const scale = 1 + Math.sin(t * 2) * 0.08;
    attentionPulse.scale.setScalar(scale);

    // Keep it glued to the star (just in case)
    attentionPulse.position.copy(memoryStars[0].position);
  }

  composer.render();

  interactWithStardust(stardust);
  if (centerStar?.visible) {
    checkCenterStarHover();
  }

  targetX = THREE.MathUtils.clamp(targetX, -PAN_LIMIT, PAN_LIMIT);
  targetY = THREE.MathUtils.clamp(targetY, -PAN_LIMIT, PAN_LIMIT);
}

animate();
