import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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

function addTrailAura(scene, curve) {

    // ---------- INNER CORE (bright spine) ----------
    const coreGeometry = new THREE.TubeGeometry(
        curve,
        200,
        0.15,   // core thickness
        24,
        false
    );

    const coreMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            color: { value: new THREE.Color(0xffb6ff) },
            intensity: { value: 0.6 },
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
    scene.add(core);


    // ---------- OUTER MIST (soft glow) ----------
    const mistGeometry = new THREE.TubeGeometry(
        curve,
        200,
        1.5,    // much thicker
        24,
        false
    );

    const mistMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            color: { value: new THREE.Color(0xffc4ff) },
            intensity: { value: 0.15 }
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
                float mist = smoothstep(1.4, 0.3, radial);

                gl_FragColor = vec4(color, mist * intensity);
            }
        `
    });

    const mist = new THREE.Mesh(mistGeometry, mistMaterial);
    scene.add(mist);

    // ---------- OUTER MIST (soft glow) ----------
    const mistGeometry2 = new THREE.TubeGeometry(
        curve,
        200,
        3,    // much thicker
        24,
        false
    );

    const mistMaterial2 = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            color: { value: new THREE.Color(0xffc4ff) },
            intensity: { value: 0.04 },
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
                float mist = smoothstep(1.4, 0.3, radial);

                gl_FragColor = vec4(color, mist * intensity);
            }
        `
    });

    const mist2 = new THREE.Mesh(mistGeometry2, mistMaterial2);
    scene.add(mist2);

    return { core, mist, mist2 };
}

function createAnimatedTrail(scene) {
    const points = memoryStars.map(star => star.position.clone());
    points.push(phantom);

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    // tension: 0 = very loose, 1 = tighter (0.4–0.6 is nice)
    curve.closed = false;
    curve.tension = 0.5;
    
    const divisions = 200;
    const curvePoints = curve.getPoints(divisions);
    const arcLengths = curve.getLengths(divisions);
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(curvePoints);
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
        color: 0xffb6ff,
        transparent: true,
        opacity: 0.6,
    });

    const line = new THREE.Line(geometry, material);

    // store for animation
    line.userData = {
        totalPoints: curvePoints.length,
        currentCount: 0,
        arcLengths,
        totalLength: arcLengths[arcLengths.length - 1],
    };

    // scene.add(line);
    // addStardustTrail(scene, curve);
    addTrailAura(scene, curve);
    return {
        line,
        curve
    };
}

function animateTrail(line, speed = 0.5) {
    if (line.userData.currentCount < line.userData.totalPoints) {
        line.userData.currentCount += speed;

        line.geometry.setDrawRange(
            0,
            Math.floor(line.userData.currentCount)
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
    text: "When one accidental message to the wrong person, turns out to be the right person.<br><br><div class=\"left\">\"Hey, did you get the email from our alliance?\"<br>\"Oh my god, I seem to have recognized the wrong person.\"</div>",
  },
  {
    title: "Exploring the Queen's Kingdom",
    text: "<div class=\"left\">\"I'm obsessed with Infinity Kingdom right now, are you interested in playing it together?\"<br>- \"When can I do the co-op thing?\"<br>\"I'll take you with me.\"</div>",
  },
  {
    title: "The First Good Morning",
    text: "The moment strangers became something more. Different time zones, same feeling.",
  },
  {
    title: "Morning My Queen 🌙",
    text: "Where affection stopped being accidental and started being intentional.",
  },
  {
    title: "One Hundred Thousand",
    text: "We reached 100K power together—not as teammates, but as something more.  Every step felt earned, shared, and unforgettable.",
  },
  {
    title: "No Longer a Secret",
    text: "The moment we told the alliance.  What we had was real enough to be spoken out loud — and brave enough to be shared.",
  },
  {
    title: "World Heart — Conquered Together",
    text: "Side by side. Same goal. Same fire. Our shadows moved as one.",
  },
  {
    title: "Chaos Beasts Fell That Night",
    text: "We were unstoppable.",
  },
  {
    title: "Caught Checking Messages",
    text: "Pretending to sleep. Hoping I'd text.",
  },
  {
    title: "Beauty Sleep for the Queen",
    text: "The kingdom can wait. You come first.",
  },
  {
    title: "Drooling, Apparently 😆",
    text: "Proof that even queens are cute.",
  },
  {
    title: "Busy Days, Soft Nights",
    text: "Even when the world was loud, you were my quiet.",
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
    text: "A single word that somehow said everything. Soft, familiar, and ours.",
  },
  {
    title: "I Wish I Could Steal Some Cuddles",
    text: "Distance is temporary. This feeling isn't.",
  },
  {
    title: "Two Hundred Thousand",
    text: "The world is ours to build. Everything and everyone else fades away as we forge our own path — side by side, hand in hand. Together.",
  },
  
  // 🌠 BOTTOM (future memory)
  {
    title: "—",
    text: "This memory is still being written.",
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
const mouse = new THREE.Vector2();

memories.forEach(mem => {
  const geo = new THREE.SphereGeometry(0.6, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff1ff,
    emissive: 0xffe0ff,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.9,
  });

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

const attentionPulse = createAttentionPulse(memoryStars[0].position);

// addConnectingLines(scene);
const animatedTrail = createAnimatedTrail(scene);
const trail = animatedTrail.line;
const curve = animatedTrail.curve;
const stardust = createStardust(curve, 6000);
scene.add(stardust);
scene.add(trail);

// 🌙 Gentle Mouse Parallax
let targetX = 0;
let targetY = 0;

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

// Also handle touch taps (mobile)
window.addEventListener('touchend', (e) => {
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
    tryOpenMemoryWithRay(null);
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
    const x = 0;
    const y = 0;
    
    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x, y, x, y - 5);
    heartShape.bezierCurveTo(x, y - 5, x - 8, y - 8, x - 8, y - 3);
    heartShape.bezierCurveTo(x - 8, y + 2, x - 5, y + 5, x, y + 8);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 8, y + 2, x + 8, y - 3);
    heartShape.bezierCurveTo(x + 8, y - 8, x + 5, y - 5, x + 5, y - 5);
    
    // Extrude the heart to give it 3D depth
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
    heartGeo.scale(0.08, 0.08, 0.08); // scale down to match star size
    heartGeo.center();
    
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xff69b4,
      emissive: 0xff1493,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.7,
    });
    heartbeatAura = new THREE.Mesh(heartGeo, heartMat);
    heartbeatAura.position.copy(selectedStar.position);
    heartbeatAura.position.z += 0.1; // slightly forward
    heartbeatAura.rotation.x = Math.PI; // flip heart right-side up
    scene.add(heartbeatAura);
    
    // �🔍 Zoom-in effect: save original position and start zoom
    originalCameraPos.copy(camera.position);
    isZoomedIn = true;
    zoomProgress = 0;
  }
}

closeBtn.onclick = (e) => {
  e.stopPropagation();
  overlay.classList.add('hidden');
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

  trail.material.opacity = 0.4 + (trail.userData.currentCount / trail.userData.totalPoints) * 0.3;

  animateTrail(trail, 0.2);

  const revealedLength =
    (trail.userData.currentCount / trail.userData.totalPoints) *
    trail.userData.totalLength;

  updateStardust(stardust, revealedLength);

  // 🔍 Handle camera zoom-in/out effect
  if (isZoomedIn) {
    // Smoothly zoom in toward selected star (romantic, gentle)
    zoomProgress = Math.min(zoomProgress + 0.02, 1);
  } else if (zoomProgress > 0) {
    // Smoothly zoom back out (very slow, romantic)
    zoomProgress = Math.max(zoomProgress - 0.01, 0);
  }
  
  // Interpolate camera position
  if (zoomProgress > 0 && selectedStar) {
    // Target: move toward star, closer and centered on it
    const targetPos = selectedStar.position.clone();
    targetPos.z += 5; // keep some distance for immersive close-up
    
    camera.position.lerp(targetPos, zoomProgress * 0.05);
    camera.lookAt(selectedStar.position);
  } else if (zoomProgress > 0 && !isZoomedIn) {
    // Zooming out: lerp back to true original position (very smooth, romantic)
    camera.position.lerp(trueOriginalCameraPos, 0.05);
  } else if (zoomProgress === 0) {
    // Reset to parallax behavior when fully zoomed out
    camera.position.x += (targetX * 4 - camera.position.x) * 0.05;
    camera.position.y += (-targetY * 4 - camera.position.y) * 0.05;
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
}

animate();
