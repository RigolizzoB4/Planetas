import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { useSolarSystemStore } from '../../store/solarSystemStore';

// ==================== GLSL SHADERS ====================
const VERT = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const SUN_FRAG = `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uTime;
  uniform sampler2D uTex;
  uniform float uHasTex;
  uniform float uEmission;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // --- Noise primitives ---
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 hash2(vec2 p){
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)))) * 43758.5453);
  }
  float n2d(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p, int oct){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 8; i++){
      if(i >= oct) break;
      v += a * n2d(p); p *= 2.01; a *= 0.48;
    }
    return v;
  }

  // --- Voronoi for convective granulation ---
  float voronoi(vec2 p){
    vec2 n = floor(p), f = fract(p);
    float md = 8.0;
    for(int j = -1; j <= 1; j++)
    for(int i = -1; i <= 1; i++){
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.5 * sin(uTime * 0.12 + 6.2831 * o);
      float d = length(g + o - f);
      md = min(md, d);
    }
    return md;
  }

  // --- Sunspot function ---
  float sunspots(vec2 p){
    float n1 = fbm(p * 2.5 + uTime * 0.008, 5);
    float n2 = fbm(p * 1.8 - uTime * 0.005 + 40.0, 4);
    float spot = smoothstep(0.58, 0.62, n1) * smoothstep(0.55, 0.60, n2);
    return spot * 0.7;
  }

  void main() {
    vec2 uv = vUv;

    // Convective granulation cells
    float gran = voronoi(uv * 14.0 + uTime * 0.015);
    gran = smoothstep(0.0, 0.35, gran);

    // Slow fractal plasma motion (multi-scale FBM)
    float plasma1 = fbm(uv * 6.0 + uTime * 0.02, 6);
    float plasma2 = fbm(uv * 12.0 - uTime * 0.015 + 30.0, 5);
    float plasma = plasma1 * 0.65 + plasma2 * 0.35;

    // Combine granulation + plasma
    float pattern = gran * 0.4 + plasma * 0.6;

    // Color ramp: deep orange -> warm gold -> bright white-yellow
    vec3 deep   = vec3(0.72, 0.28, 0.04);
    vec3 warm   = vec3(0.96, 0.62, 0.12);
    vec3 bright = vec3(1.0, 0.88, 0.56);
    vec3 hot    = vec3(1.0, 0.97, 0.86);

    vec3 c;
    if(pattern > 0.65) c = mix(bright, hot, (pattern - 0.65) / 0.35);
    else if(pattern > 0.35) c = mix(warm, bright, (pattern - 0.35) / 0.30);
    else c = mix(deep, warm, pattern / 0.35);

    // Blend diffuse texture if available
    if(uHasTex > 0.5){
      vec3 texCol = texture2D(uTex, uv).rgb;
      c = c * 0.55 + texCol * 0.45;
    }

    // Sunspots: darken localized regions
    float spots = sunspots(uv * 8.0);
    c = mix(c, deep * 0.3, spots);

    // Limb darkening (natural solar edge falloff)
    float NdotV = max(dot(vNormal, normalize(cameraPosition - vWorldPos)), 0.0);
    float limb = pow(NdotV, 0.35);
    c *= mix(0.22, 1.0, limb);

    // HDR emission control
    gl_FragColor = vec4(c * uEmission, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

const CORONA_FRAG = `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n2d(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm3(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 4; i++){ v += a * n2d(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(vNormal, viewDir), 0.0);
    float rim = 1.0 - NdotV;

    // Volumetric radial scattering: noise-modulated radial falloff
    vec2 radialUV = vUv * 4.0 + uTime * 0.02;
    float scatter = fbm3(radialUV) * 0.3 + 0.7;
    float radial = pow(rim, 2.5) * scatter;

    // Slow breathing, not pulsing
    float breath = 1.0 + sin(uTime * 0.2) * 0.04;

    // Warm amber tones ONLY — no neon, no saturated orange/red
    vec3 innerGlow = vec3(1.0, 0.92, 0.65);  // pale warm yellow
    vec3 outerGlow = vec3(0.95, 0.72, 0.32); // golden amber
    vec3 c = mix(innerGlow, outerGlow, pow(rim, 1.8)) * breath;

    // Soft intensity — deliberately restrained
    float alpha = radial * 0.45;
    alpha *= smoothstep(0.0, 0.15, rim); // fade near center

    gl_FragColor = vec4(c * 1.2, alpha);
    #include <logdepthbuf_fragment>
  }
`;

const ATMO_FRAG = `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    float f = 1.0 - max(dot(vNormal, normalize(cameraPosition-vWorldPos)), 0.0);
    f = pow(f, 3.5);
    gl_FragColor = vec4(vec3(.3,.6,1)*1.5, f*.75);
    #include <logdepthbuf_fragment>
  }
`;

// ==================== TEXTURE URLS (served from backend) ====================
const API = process.env.REACT_APP_BACKEND_URL;
const TEX = {
  Sun: `${API}/api/textures/2k_sun.jpg`,
  Mercury: `${API}/api/textures/2k_mercury.jpg`,
  Venus: `${API}/api/textures/2k_venus_surface.jpg`,
  Earth: `${API}/api/textures/2k_earth_daymap.jpg`,
  EarthClouds: `${API}/api/textures/2k_earth_clouds.jpg`,
  Mars: `${API}/api/textures/2k_mars.jpg`,
  Jupiter: `${API}/api/textures/2k_jupiter.jpg`,
  Saturn: `${API}/api/textures/2k_saturn.jpg`,
  SaturnRing: `${API}/api/textures/2k_saturn_ring_alpha.png`,
  Uranus: `${API}/api/textures/2k_uranus.jpg`,
  Neptune: `${API}/api/textures/2k_neptune.jpg`
};

const SUN_RADIUS = 5.5;
const GLOBAL_ROTATION_SPEED = 0.008;

// ==================== PLANET CONFIG (PBR) ====================
const PLANETS = {
  Mercury: { size: 0.38, orbit: 10, speed: 0.048, rot: 0.005, color: 0x8c7853, rough: 0.9, metal: 0.1, nStr: 2.5 },
  Venus:   { size: 0.95, orbit: 14, speed: 0.035, rot: -0.002, color: 0xffc649, rough: 0.7, metal: 0.0, nStr: 1.0 },
  Earth:   { size: 1.0,  orbit: 18, speed: 0.029, rot: 0.02,  color: 0x6b93d6, rough: 0.5, metal: 0.1, nStr: 1.5, atmo: true, clouds: true },
  Mars:    { size: 0.53, orbit: 24, speed: 0.024, rot: 0.018, color: 0xc1440e, rough: 0.85, metal: 0.1, nStr: 3.0 },
  Jupiter: { size: 2.8,  orbit: 42, speed: 0.013, rot: 0.045, color: 0xd8ca9d, rough: 0.6, metal: 0.0, nStr: 0.5 },
  Saturn:  { size: 2.3,  orbit: 58, speed: 0.0097, rot: 0.038, color: 0xead6b8, rough: 0.55, metal: 0.0, nStr: 0.5, rings: true },
  Uranus:  { size: 1.6,  orbit: 74, speed: 0.0068, rot: -0.03, color: 0xd1e7e7, rough: 0.4, metal: 0.0, nStr: 0.3 },
  Neptune: { size: 1.5,  orbit: 90, speed: 0.0054, rot: 0.032, color: 0x5b5ddf, rough: 0.4, metal: 0.0, nStr: 0.3 }
};

const SYSTEM_LIMIT_RADIUS = PLANETS.Jupiter.orbit + 9;
const ASTEROID_BELT_INNER = 30;
const ASTEROID_BELT_OUTER = 38;

// ==================== SATELLITE CONFIG (real moons, scientific) ====================
const SATELLITES = [
  { name: 'Phobos',    module: 'Auth API',             color: 0x8B7355, size: 0.10, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Deimos',    module: 'Payment Gateway',      color: 0x7A6B5A, size: 0.07, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Europa',    module: 'Notification Service', color: 0xC4BCA0, size: 0.18, rough: 0.25, metal: 0.05, irregular: false },
  { name: 'Ganymede',  module: 'Search Engine',        color: 0x9A8B7A, size: 0.22, rough: 0.70, metal: 0.10, irregular: false },
  { name: 'Callisto',  module: 'Cache Layer',          color: 0x6B5E4F, size: 0.20, rough: 0.85, metal: 0.05, irregular: false },
  { name: 'Titan',     module: 'Message Queue',        color: 0xE0A848, size: 0.22, rough: 0.45, metal: 0.00, irregular: false },
  { name: 'Enceladus', module: 'Log Aggregator',       color: 0xDEDEDE, size: 0.10, rough: 0.15, metal: 0.10, irregular: false },
  { name: 'Moon',      module: 'Config Server',        color: 0xA0A0A0, size: 0.27, rough: 0.90, metal: 0.05, irregular: false }
];

// ==================== PBR MAP GENERATORS ====================
function genNormalMap(img, str) {
  const canvas = document.createElement('canvas');
  const w = Math.min(img.width, 1024), h = Math.min(img.height, 512);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  let src;
  try { src = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
  const heights = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) heights[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  const out = new Uint8Array(w * h * 4);
  const gH = (x, y) => heights[((y % h + h) % h) * w + ((x % w + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (gH(x + 1, y - 1) + 2 * gH(x + 1, y) + gH(x + 1, y + 1)) - (gH(x - 1, y - 1) + 2 * gH(x - 1, y) + gH(x - 1, y + 1));
    const dy = (gH(x - 1, y + 1) + 2 * gH(x, y + 1) + gH(x + 1, y + 1)) - (gH(x - 1, y - 1) + 2 * gH(x, y - 1) + gH(x + 1, y - 1));
    let nx = -dx * str, ny = dy * str, nz = 1.0;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const idx = (y * w + x) * 4;
    out[idx] = ((nx / len) * 0.5 + 0.5) * 255;
    out[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
    out[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
    out[idx + 3] = 255;
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function genRoughnessMap(img, base, vary) {
  const canvas = document.createElement('canvas');
  const w = Math.min(img.width, 512), h = Math.min(img.height, 256);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  let src;
  try { src = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const g = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
    const r = Math.max(0, Math.min(1, base - g * vary));
    const b = Math.floor(r * 255);
    out[i * 4] = b; out[i * 4 + 1] = b; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function constMap(val) {
  const b = Math.floor(val * 255);
  const d = new Uint8Array([b, b, b, 255]);
  const t = new THREE.DataTexture(d, 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

// ==================== SCENE BUILDERS ====================
function createStars(scene) {
  const count = 15000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  // Star colors strictly from palette: warm Nobel, Desert Storm, Gray tones
  const spectral = [
    { r: 0.51, g: 0.51, b: 0.51, w: 0.40 },  // #818181 Gray
    { r: 0.71, g: 0.71, b: 0.71, w: 0.30 },  // #B4B4B4 Nobel
    { r: 0.93, g: 0.93, b: 0.92, w: 0.20 },  // #EDEDEA Desert Storm
    { r: 0.95, g: 0.68, b: 0.24, w: 0.08 },  // #F3AE3E Saffron (rare bright)
    { r: 0.93, g: 0.93, b: 0.92, w: 0.02 }   // #EDEDEA bright
  ];
  for (let i = 0; i < count; i++) {
    const r = 500 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    let rnd = Math.random(), acc = 0, cls = spectral[0];
    for (const s of spectral) { acc += s.w; if (rnd < acc) { cls = s; break; } }
    col[i * 3] = cls.r * (0.9 + Math.random() * 0.1);
    col[i * 3 + 1] = cls.g * (0.9 + Math.random() * 0.1);
    col[i * 3 + 2] = cls.b * (0.9 + Math.random() * 0.1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true })));
}

function createSun(scene, loader, R) {
  const group = new THREE.Group();
  group.name = 'SunGroup';

  // Photosphere - Custom animated shader
  const sunMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uTex: { value: null }, uHasTex: { value: 0 },
      uEmission: { value: 2.8 }
    },
    vertexShader: VERT, fragmentShader: SUN_FRAG
  });
  R.sunMat = sunMat;
  loader.load(TEX.Sun, (t) => { t.colorSpace = THREE.SRGBColorSpace; sunMat.uniforms.uTex.value = t; sunMat.uniforms.uHasTex.value = 1; });

  const photo = new THREE.Mesh(new THREE.SphereGeometry(5.5, 128, 128), sunMat);
  photo.name = 'Sun'; photo.userData = { clickable: true, name: 'Sun' };
  group.add(photo);
  R.sunLayers.photosphere = photo;
  R.planets['Sun'] = photo;

  // ===== SOLAR CORE: Dark sphere + Logo plane + FX 3D Text =====
  const coreGroup = new THREE.Group();
  coreGroup.name = 'SolarCore';
  coreGroup.renderOrder = 998;

  // Dark core sphere — provides contrast backdrop
  const coreMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x050505,
      depthTest: false, depthWrite: false
    })
  );
  coreMesh.renderOrder = 998;
  coreGroup.add(coreMesh);

  // Logo B4 — Sprite (always faces camera = billboard)
  const logoTex = loader.load(`${API}/api/textures/logo_b4.png`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  const logoSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: logoTex, transparent: true,
    depthTest: false, depthWrite: false
  }));
  logoSprite.scale.set(4.5, 4.5 * 0.527, 1); // maintain aspect ratio (363/688 ≈ 0.527)
  logoSprite.position.set(0, 0.3, 0);
  logoSprite.renderOrder = 999;
  coreGroup.add(logoSprite);
  R.sunLayers.logoPlane = logoSprite;

  // "ERD-FX" Text — canvas sprite positioned below the logo, dark core provides contrast
  const fxCanvas = document.createElement('canvas');
  fxCanvas.width = 512; fxCanvas.height = 256;
  const fxCtx = fxCanvas.getContext('2d');
  fxCtx.clearRect(0, 0, 512, 256);
  fxCtx.textAlign = 'center';
  fxCtx.textBaseline = 'middle';
  // Subtle glow
  fxCtx.save();
  fxCtx.filter = 'blur(6px)';
  fxCtx.fillStyle = 'rgba(255,255,240,0.5)';
  fxCtx.font = 'bold 90px "Helvetica Neue", Arial, sans-serif';
  fxCtx.fillText('ERD-FX', 256, 128);
  fxCtx.restore();
  // Crisp white text
  fxCtx.fillStyle = '#FFFFFF';
  fxCtx.font = 'bold 90px "Helvetica Neue", Arial, sans-serif';
  fxCtx.fillText('ERD-FX', 256, 128);
  const fxTex = new THREE.CanvasTexture(fxCanvas);
  fxTex.needsUpdate = true;
  const fxSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fxTex, transparent: true,
    depthTest: false, depthWrite: false
  }));
  fxSprite.scale.set(4.2, 1.8, 1);
  fxSprite.position.set(0, -2.1, 0.4);
  fxSprite.renderOrder = 999;
  coreGroup.add(fxSprite);
  R.sunLayers.fxSprite = fxSprite;

  // Core always visible — depthTest:false renders through the photosphere
  coreGroup.visible = true;
  group.add(coreGroup);
  R.sunLayers.coreGroup = coreGroup;

  // Internal layers (visible only in cross-section)
  const layers = [
    { key: 'core', radius: 1.8, color: 0xFFFF00, opacity: 0.95 },
    { key: 'radiative', radius: 3.2, color: 0xFFAA00, opacity: 0.7 },
    { key: 'convective', radius: 4.5, color: 0xFF6600, opacity: 0.5 }
  ];
  layers.forEach(l => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(l.radius, 64, 64),
      new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: l.opacity })
    );
    mesh.visible = false;
    group.add(mesh);
    R.sunLayers[l.key] = mesh;
  });

  // Corona - Fresnel glow shader
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: VERT, fragmentShader: CORONA_FRAG,
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending
  });
  R.coronaMat = coronaMat;
  const corona = new THREE.Mesh(new THREE.SphereGeometry(8.5, 64, 64), coronaMat);
  corona.castShadow = false;
  group.add(corona);
  R.sunLayers.corona = corona;

  // Solar Flares — animated additive glow layer
  const flareMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      void main(){
        float glow = 0.6 + 0.4 * sin(time * 2.0 + vUv.y * 10.0);
        vec3 color = vec3(1.0, 0.4, 0.05) * glow;
        gl_FragColor = vec4(color, glow * 0.6);
      }
    `
  });
  const flareMesh = new THREE.Mesh(new THREE.SphereGeometry(5.5, 128, 128), flareMat);
  flareMesh.castShadow = false;
  group.add(flareMesh);
  R.sunLayers.flareMat = flareMat;

  scene.add(group);
  R.sunLayers.group = group;
}

function createLabel(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 256;
  ctx.fillStyle = 'white';
  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 140);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  );
  sprite.scale.set(2, 1, 1);
  sprite.position.y = 1.2;
  return sprite;
}

function createStaticConstellations(scene) {
  const skyMat = new THREE.LineBasicMaterial({
    color: 0x8c8c8c,
    transparent: true,
    opacity: 0.08,
    depthWrite: false
  });
  const constellations = [
    // Orion
    [[-140, 70, -260], [-125, 52, -255], [-108, 70, -248], [-125, 88, -242], [-140, 70, -260], [-125, 52, -255], [-118, 34, -248], [-125, 18, -242]],
    // Cassiopeia
    [[90, 95, -280], [76, 108, -276], [62, 92, -270], [48, 106, -266], [34, 90, -262]],
    // Big Dipper
    [[-170, 120, -300], [-152, 124, -296], [-136, 116, -292], [-118, 120, -288], [-104, 128, -284], [-96, 140, -280], [-112, 146, -276]],
    // Crux
    [[55, -55, -255], [64, -68, -252], [74, -55, -248], [64, -42, -244], [55, -55, -255]],
    // Leo
    [[-210, 20, -310], [-192, 28, -306], [-176, 22, -302], [-160, 28, -298], [-146, 22, -294], [-160, 14, -290], [-176, 8, -286], [-210, 20, -310]]
  ];

  constellations.forEach(pts => {
    const vectors = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
    const line = new THREE.Line(geometry, skyMat);
    scene.add(line);
  });
}

function createAurora(radius, color) {
  const geometry = new THREE.SphereGeometry(radius * 1.02, 128, 128);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(color) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;

      varying vec3 vNormal;
      varying vec3 vPosition;

      float noise(vec3 p){
        return sin(p.x*6.0 + time*0.8) *
               sin(p.y*6.0 + time*0.6) *
               sin(p.z*6.0 + time*0.7);
      }

      void main() {
        float polar = pow(abs(vNormal.y), 6.0);
        float wave  = noise(vPosition * 2.0) * 0.5 + 0.5;

        float intensity = polar * wave;

        vec3 finalColor = color * intensity * 1.8;

        gl_FragColor = vec4(finalColor, intensity * 0.6);
      }
    `
  });

  return new THREE.Mesh(geometry, material);
}

function updateAuroras(auroras, delta) {
  auroras.forEach(a => {
    if (a.material?.uniforms?.time) {
      a.material.uniforms.time.value += delta;
    }
  });
}

function createSatelliteModel(cfg) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x9aa2a9,
    metalness: 0.75,
    roughness: 0.35,
    emissive: 0x1c1f24,
    emissiveIntensity: 0.35
  });
  const detailMat = new THREE.MeshStandardMaterial({
    color: 0xcfd6dd,
    metalness: 0.6,
    roughness: 0.35,
    emissive: 0x23262b,
    emissiveIntensity: 0.35
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x244a86,
    emissive: 0x0f2247,
    emissiveIntensity: 0.6,
    metalness: 0.25,
    roughness: 0.55
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 32), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.55, 32, 1, true), detailMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.8;
  group.add(dish);

  const dishNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16), detailMat);
  dishNeck.rotation.x = Math.PI / 2;
  dishNeck.position.z = 0.55;
  group.add(dishNeck);

  const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 0.8);
  const panelLeft = new THREE.Mesh(panelGeo, panelMat);
  panelLeft.position.set(-1.25, 0.0, 0.0);
  const panelRight = new THREE.Mesh(panelGeo, panelMat);
  panelRight.position.set(1.25, 0.0, 0.0);
  group.add(panelLeft, panelRight);

  const panelFrameGeo = new THREE.BoxGeometry(1.72, 0.07, 0.9);
  const panelFrameLeft = new THREE.Mesh(panelFrameGeo, detailMat);
  panelFrameLeft.position.set(-1.25, -0.06, 0.0);
  const panelFrameRight = new THREE.Mesh(panelFrameGeo, detailMat);
  panelFrameRight.position.set(1.25, -0.06, 0.0);
  group.add(panelFrameLeft, panelFrameRight);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x6f757b,
    metalness: 0.5,
    roughness: 0.4,
    emissive: 0x1a1d21,
    emissiveIntensity: 0.3
  });
  const strutGeo = new THREE.BoxGeometry(0.3, 0.04, 0.04);
  const strutLeft = new THREE.Mesh(strutGeo, frameMat);
  strutLeft.position.set(-0.55, 0, 0);
  const strutRight = new THREE.Mesh(strutGeo, frameMat);
  strutRight.position.set(0.55, 0, 0);
  group.add(strutLeft, strutRight);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 16), frameMat);
  antenna.position.set(0, 0.45, -0.1);
  group.add(antenna);

  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 16), frameMat);
  thruster.rotation.x = Math.PI / 2;
  thruster.position.z = -0.75;
  group.add(thruster);

  const scale = 0.6 + cfg.size;
  group.scale.setScalar(scale);
  group.rotation.y = Math.random() * Math.PI * 2;

  return group;
}

function createPlanet(scene, loader, name, cfg, R) {
  if (!R.auroraMats) R.auroraMats = [];
  // Orbit ring
  const orbitPts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * cfg.orbit, 0, Math.sin(a) * cfg.orbit));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(orbitPts),
    new THREE.LineBasicMaterial({ color: '#818181', transparent: true, opacity: 0.2 })
  ));

  // Full PBR Material: diffuse + normal + roughness + metalness maps
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color, roughness: cfg.rough, metalness: cfg.metal, envMapIntensity: 0.3
  });
  mat.metalnessMap = constMap(cfg.metal);

  if (TEX[name]) {
    loader.load(TEX[name], (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      mat.map = tex;
      const nMap = genNormalMap(tex.image, cfg.nStr);
      if (nMap) { mat.normalMap = nMap; mat.normalScale.set(cfg.nStr * 0.3, cfg.nStr * 0.3); }
      const rMap = genRoughnessMap(tex.image, cfg.rough, 0.2);
      if (rMap) mat.roughnessMap = rMap;
      mat.needsUpdate = true;
    });
  }

  const planet = new THREE.Mesh(new THREE.SphereGeometry(cfg.size, 64, 64), mat);
  planet.name = name; planet.userData = { clickable: true, name };
  planet.castShadow = true; planet.receiveShadow = true;

  R.angles[name] = Math.random() * Math.PI * 2;
  planet.position.x = Math.cos(R.angles[name]) * cfg.orbit;
  planet.position.z = Math.sin(R.angles[name]) * cfg.orbit;

  const group = new THREE.Group();
  group.name = `${name}Group`;
  group.add(planet);
  R.planets[name] = planet;

  // Label above planet
  const label = createLabel(name);
  label.position.y = cfg.size + 1.2;
  planet.add(label);

  // Saturn rings
  if (cfg.rings) {
    const ringGeo = new THREE.RingGeometry(cfg.size * 1.3, cfg.size * 2.5, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xC9B896, side: THREE.DoubleSide, transparent: true, opacity: 0.8, roughness: 0.8, metalness: 0.0
    });
    loader.load(TEX.SaturnRing, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; ringMat.map = t; ringMat.alphaMap = t; ringMat.needsUpdate = true;
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5; ring.receiveShadow = true;
    planet.add(ring);
  }

  // Earth clouds
  if (cfg.clouds) {
    const cloudMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.35, depthWrite: false, roughness: 1.0, metalness: 0.0 });
    loader.load(TEX.EarthClouds, (t) => { t.colorSpace = THREE.SRGBColorSpace; cloudMat.map = t; cloudMat.alphaMap = t; cloudMat.needsUpdate = true; });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(cfg.size * 1.02, 64, 64), cloudMat);
    planet.add(clouds);
    R.planets['EarthClouds'] = clouds;
  }

  // Earth atmosphere (Fresnel glow)
  if (cfg.atmo) {
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: ATMO_FRAG,
      transparent: true, side: THREE.BackSide, depthWrite: false
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(cfg.size * 1.15, 64, 64), atmoMat);
    atmo.castShadow = false; atmo.receiveShadow = false;
    planet.add(atmo);
  }

  const auroraColors = {
    Earth: 0x55ffcc,
    Jupiter: 0x66aaff,
    Saturn: 0x88bbff
  };
  if (auroraColors[name]) {
    const aurora = createAurora(cfg.size, auroraColors[name]);
    aurora.name = `${name}Aurora`;
    aurora.renderOrder = 3;
    planet.add(aurora);
    R.auroras.push(aurora);
  }

  scene.add(group);
}

function createSatellites(scene, loader, R, satelliteModel = null) {
  const satOrbit = (PLANETS.Earth.orbit + ASTEROID_BELT_INNER) * 0.5;

  // Dotted orbit ring (white)
  const orbitPts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * satOrbit, 0, Math.sin(a) * satOrbit));
  }
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  const orbitMat = new THREE.LineDashedMaterial({
    color: '#F3AE3E',
    transparent: true,
    opacity: 0.6,
    dashSize: 1.2,
    gapSize: 0.8
  });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  orbitLine.computeLineDistances();
  scene.add(orbitLine);

  const dotPts = [];
  for (let i = 0; i <= 128; i += 2) {
    const a = (i / 128) * Math.PI * 2;
    dotPts.push(new THREE.Vector3(Math.cos(a) * satOrbit, 0, Math.sin(a) * satOrbit));
  }
  const dotGeo = new THREE.BufferGeometry().setFromPoints(dotPts);
  const dotMat = new THREE.PointsMaterial({
    color: '#FFFFFF',
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9
  });
  scene.add(new THREE.Points(dotGeo, dotMat));

  // Create each satellite with scientific geometry + PBR
  SATELLITES.forEach((cfg, i) => {
    const a = (i / SATELLITES.length) * Math.PI * 2;

    const sat = satelliteModel ? satelliteModel.clone(true) : createSatelliteModel(cfg);
    if (satelliteModel) {
      const jason2Scale = PLANETS.Mars.size * 0.15;
      sat.scale.setScalar(jason2Scale);
    }
    sat.name = cfg.name;
    sat.position.set(Math.cos(a) * satOrbit, 0, Math.sin(a) * satOrbit);
    sat.rotation.y = Math.random() * Math.PI * 2;

    sat.traverse(child => {
      if (child.isMesh) {
        if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        child.userData = { clickable: true, name: cfg.name, moduleName: cfg.module };
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
            mat.emissive = new THREE.Color(0xffffff);
            mat.emissiveIntensity = 0.9;
            mat.envMapIntensity = 1.4;
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        });
      }
    });

    const satLight = new THREE.PointLight(0xffffff, 2.0, 14, 2);
    sat.add(satLight);

    // Label above satellite — shows module/API name
    const label = createLabel(cfg.module);
    label.position.y = satelliteModel ? 2.2 : 0.9 + cfg.size * 4;
    sat.add(label);

    scene.add(sat);
    R.satellites.push({ mesh: sat, angle: a, orbitRadius: satOrbit });
  });
}

function createAsteroids(scene, R) {
  const count = 3000, inner = ASTEROID_BELT_INNER, outer = ASTEROID_BELT_OUTER, beltH = 2;
  const mesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.95, metalness: 0.1, flatShading: true }),
    count
  );
  mesh.name = 'AsteroidBelt'; mesh.castShadow = true; mesh.receiveShadow = true;
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = inner + Math.random() * (outer - inner);
    const s = 0.02 + Math.random() * 0.08;
    dummy.position.set(Math.cos(a) * r, (Math.random() - 0.5) * beltH, Math.sin(a) * r);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.setScalar(s); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const v = 0.6 + Math.random() * 0.4;
    color.setRGB(0.55 * v, 0.45 * v, 0.33 * v);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  R.planets['AsteroidBelt'] = mesh;
}

// ==================== COMPONENT ====================
export default function SolarSystemPhotorealistic() {
  const containerRef = useRef(null);
  const refs = useRef({
    scene: null, renderer: null, camera: null, controls: null, composer: null,
    clock: new THREE.Clock(), planets: {}, satellites: [], sunLayers: {},
    angles: {}, frameId: null, sunMat: null, coronaMat: null, elapsed: 0,
    auroras: [], focusTweens: null, isAnimatingFocus: false, solarGroup: null, outlinePass: null, userInteracting: false, initialZoomDone: false
  });

  const { objects, setSelectedObject, timeSpeed, isPaused, viewMode, showCrossSectionSun, cameraPreset } = useSolarSystemStore();

  // ===== INIT SCENE =====
  useEffect(() => {
    if (!containerRef.current) return;
    const R = refs.current;
    // Reset mutable refs for re-init
    R.planets = {}; R.satellites = []; R.sunLayers = {}; R.angles = {}; R.elapsed = 0; R.auroras = [];
    R.focusTweens = null; R.isAnimatingFocus = false; R.solarGroup = null; R.outlinePass = null; R.userInteracting = false; R.initialZoomDone = false;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070B');
    R.scene = scene;

    const solarGroup = new THREE.Group();
    solarGroup.name = 'SolarSystemRoot';
    scene.add(solarGroup);
    R.solarGroup = solarGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    camera.position.set(0, 40, 100);
    R.camera = camera;

    // Renderer - NASA-grade constraints
    const renderer = new THREE.WebGLRenderer({
      antialias: true, powerPreference: 'high-performance',
      logarithmicDepthBuffer: true, stencil: false
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Physically correct lights (default in Three.js r162+)
    container.appendChild(renderer.domElement);
    R.renderer = renderer;

    // Sun is the ONLY primary light source — inverse-square falloff (decay=2)
    // High intensity to clearly illuminate even distant planets via tone mapping compression
    const sunLight = new THREE.PointLight(0xFFF8E8, 12000, 0, 2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 4;
    scene.add(sunLight);

    // Post-processing: Bloom + SMAA + Output
    const pr = renderer.getPixelRatio();
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
    outlinePass.edgeStrength = 2.0;
    outlinePass.edgeGlow = 0.2;
    outlinePass.edgeThickness = 1.0;
    outlinePass.visibleEdgeColor.set('#FFFFFF');
    outlinePass.hiddenEdgeColor.set('#FFFFFF');
    composer.addPass(outlinePass);
    // Soft bloom: high threshold captures only the Sun's HDR emission, low strength avoids neon
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.3, 0.92));
    composer.addPass(new SMAAPass(w * pr, h * pr));
    composer.addPass(new OutputPass());
    R.composer = composer;
    R.outlinePass = outlinePass;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = SYSTEM_LIMIT_RADIUS;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI - 0.05;
    controls.panSpeed = 0.4;
    controls.rotateSpeed = 0.4;
    controls.zoomSpeed = 1.1;
    R.controls = controls;

    const onControlStart = () => {
      R.userInteracting = true;
      if (R.focusTweens?.length) {
        R.focusTweens.forEach(t => t.kill());
      }
      R.focusTarget = null;
      R.isAnimatingFocus = false;
    };
    const onControlEnd = () => {
      R.userInteracting = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // Texture loader
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    // HDR background (deep space) - procedural stars
    createStars(scene);
    createStaticConstellations(scene);

    // Build scene — satellites FIRST, then planets
    createSun(solarGroup, loader, R);
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/jason2.glb',
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        createSatellites(solarGroup, loader, R, model);
      },
      undefined,
      () => createSatellites(solarGroup, loader, R)
    );
    Object.entries(PLANETS).forEach(([name, cfg]) => createPlanet(solarGroup, loader, name, cfg, R));
    createAsteroids(solarGroup, R);

    const runInitialZoom = () => {
      controls.enabled = false;
      R.isAnimatingFocus = true;
      const fxTarget = new THREE.Vector3();
      if (R.sunLayers.fxSprite) {
        R.sunLayers.fxSprite.getWorldPosition(fxTarget);
      }
      const fxCamPos = fxTarget.clone().add(new THREE.Vector3(0, 2.2, 7));
      const camTween = gsap.to(camera.position, {
        x: fxCamPos.x,
        y: fxCamPos.y,
        z: fxCamPos.z,
        duration: 2.2,
        ease: 'power2.out',
        onComplete: () => {
          controls.enabled = true;
          R.isAnimatingFocus = false;
          R.initialZoomDone = true;
        }
      });
      const targetTween = gsap.to(controls.target, {
        x: fxTarget.x,
        y: fxTarget.y,
        z: fxTarget.z,
        duration: 2.2,
        ease: 'power2.out'
      });
      R.focusTweens = [camTween, targetTween];
    };
    runInitialZoom();

    // Raycaster + Hover Zoom
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    R.focusTarget = null;

    const focusOnObject = (mesh, distFactor) => {
      if (!mesh) return;
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      const size = mesh.geometry?.boundingSphere?.radius || 1;
      const offset = new THREE.Vector3(0, size * 0.5, size * distFactor);
      R.focusTarget = { position: worldPos.clone().add(offset), lookAt: worldPos.clone() };
    };

    const focusObject = (object) => {
      if (!object) return;
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      const distance = size * 2;

      if (R.focusTweens?.length) {
        R.focusTweens.forEach(t => t.kill());
      }
      R.isAnimatingFocus = true;

      const camTween = gsap.to(camera.position, {
        x: center.x + distance,
        y: center.y + distance * 0.5,
        z: center.z + distance,
        duration: 1.5,
        ease: 'power2.out',
        onComplete: () => { R.isAnimatingFocus = false; }
      });

      const targetTween = gsap.to(controls.target, {
        x: center.x,
        y: center.y,
        z: center.z,
        duration: 1.5,
        ease: 'power2.out'
      });

      R.focusTweens = [camTween, targetTween];
    };


    const clearFocus = () => {
      if (R.focusTweens?.length) {
        R.focusTweens.forEach(t => t.kill());
      }
      R.focusTarget = null;
      R.isAnimatingFocus = false;
      R.focusTweens = null;
    };

    let intersected = null;

    const onClick = (e) => {
      if (!intersected) {
        clearFocus();
        return;
      }
      const obj = objects.find(o => o.name === intersected.userData.name);
      if (obj) setSelectedObject(obj);
      focusObject(intersected);
    };
    const onMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      intersected = null;
      for (const hit of ray.intersectObjects(scene.children, true)) {
        if (hit.object.userData?.clickable) {
          intersected = hit.object;
          if (!R.userInteracting && !R.isAnimatingFocus) {
            focusOnObject(hit.object, 2.2);
          }
          break;
        }
      }
      if (!R.userInteracting && !R.isAnimatingFocus && !intersected) {
        R.focusTarget = null;
      }
      if (R.outlinePass) {
        R.outlinePass.selectedObjects = intersected ? [intersected] : [];
      }
      renderer.domElement.style.cursor = intersected ? 'pointer' : 'grab';
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearFocus();
      }
    };
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKeyDown);
    renderer.domElement.style.cursor = 'grab';

    // Resize
    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      renderer.setSize(nw, nh); composer.setSize(nw, nh);
      if (R.outlinePass) R.outlinePass.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    const animate = () => {
      R.frameId = requestAnimationFrame(animate);
      const delta = R.clock.getDelta();
      R.elapsed += delta;
      controls.update();
      if (R.solarGroup) {
        R.solarGroup.rotation.y += delta * GLOBAL_ROTATION_SPEED;
      }
      if (R.sunMat) R.sunMat.uniforms.uTime.value = R.elapsed;
      if (R.coronaMat) R.coronaMat.uniforms.uTime.value = R.elapsed;
      if (R.auroras?.length) updateAuroras(R.auroras, delta);
      if (R.sunLayers.flareMat) R.sunLayers.flareMat.uniforms.time.value += 0.01;
      if (R.sunLayers.corona) { R.sunLayers.corona.rotation.y += 0.001; R.sunLayers.corona.rotation.z += 0.0005; }
      if (R.sunLayers.photosphere) R.sunLayers.photosphere.rotation.y += 0.001;
      // FX + Logo: stable slow breathing presence
      if (R.sunLayers.fxSprite) {
        const pulse = 0.88 + Math.sin(R.elapsed * 0.35) * 0.12;
        R.sunLayers.fxSprite.material.opacity = pulse;
      }
      if (R.sunLayers.logoPlane) {
        const logoPulse = 0.85 + Math.sin(R.elapsed * 0.35) * 0.10;
        R.sunLayers.logoPlane.material.opacity = logoPulse;
      }
      // Smooth hover zoom animation (desativado ao seguir)
      if (!R.userInteracting && !R.isAnimatingFocus && R.focusTarget) {
        camera.position.lerp(R.focusTarget.position, 0.04);
        controls.target.lerp(R.focusTarget.lookAt, 0.04);
        if (camera.position.distanceTo(R.focusTarget.position) < 0.1) {
          R.focusTarget = null;
        }
      }

      if (camera.position.length() < SUN_RADIUS * 1.2) {
        camera.position.setLength(SUN_RADIUS * 2);
      }
      if (camera.position.length() > SYSTEM_LIMIT_RADIUS) {
        camera.position.setLength(SYSTEM_LIMIT_RADIUS);
      }
      composer.render();
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(R.frameId);
      controls.dispose(); renderer.dispose(); composer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [objects, setSelectedObject]);

  // ===== ANIMATION (planets, satellites, asteroids) =====
  useEffect(() => {
    const R = refs.current;
    if (!R.scene) return;
    let lastTime = performance.now(), animId;
    const update = () => {
      animId = requestAnimationFrame(update);
      if (isPaused) return;
      const now = performance.now(), dt = (now - lastTime) / 1000;
      lastTime = now;
      Object.entries(PLANETS).forEach(([name, cfg]) => {
        const p = R.planets[name];
        if (p) {
          R.angles[name] += cfg.speed * timeSpeed * dt;
          p.position.x = Math.cos(R.angles[name]) * cfg.orbit;
          p.position.z = Math.sin(R.angles[name]) * cfg.orbit;
          p.rotation.y += cfg.rot * timeSpeed * dt;
        }
      });
      if (R.planets['EarthClouds']) R.planets['EarthClouds'].rotation.y += 0.001 * timeSpeed * dt;
      R.satellites.forEach(s => {
        s.angle += 0.03 * timeSpeed * dt;
        s.mesh.position.x = Math.cos(s.angle) * s.orbitRadius;
        s.mesh.position.z = Math.sin(s.angle) * s.orbitRadius;
        s.mesh.rotation.y += 0.02 * timeSpeed * dt;
      });
      if (R.planets['AsteroidBelt']) R.planets['AsteroidBelt'].rotation.y += 0.0002 * timeSpeed * dt;
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [isPaused, timeSpeed]);

  // ===== CROSS-SECTION SUN =====
  useEffect(() => {
    const L = refs.current.sunLayers;
    if (!L.photosphere) return;
    if (showCrossSectionSun) {
      L.photosphere.geometry.dispose();
      L.photosphere.geometry = new THREE.SphereGeometry(5.5, 128, 128, 0, Math.PI * 1.5);
      ['core', 'radiative', 'convective'].forEach(k => {
        if (L[k]) {
          L[k].visible = true;
          L[k].geometry.dispose();
          const r = k === 'core' ? 1.8 : k === 'radiative' ? 3.2 : 4.5;
          L[k].geometry = new THREE.SphereGeometry(r, 64, 64, 0, Math.PI * 1.5);
        }
      });
      if (L.coreGroup) L.coreGroup.visible = true;
    } else {
      L.photosphere.geometry.dispose();
      L.photosphere.geometry = new THREE.SphereGeometry(5.5, 128, 128);
      ['core', 'radiative', 'convective'].forEach(k => { if (L[k]) L[k].visible = false; });
      if (L.coreGroup) L.coreGroup.visible = false;
    }
  }, [showCrossSectionSun]);

  // ===== CAMERA PRESETS =====
  useEffect(() => {
    const R = refs.current;
    if (!R.camera || !R.controls) return;
    if (!R.initialZoomDone) return;
    const presets = {
      'Overview': { pos: [0, 50, 120], target: [0, 0, 0] },
      'Sun Focus': { pos: [0, 15, 35], target: [0, 0, 0] },
      'Earth Focus': { pos: [25, 10, 25], target: [18, 0, 0] },
      'Satellite Ring': { pos: [18, 8, 18], target: [12, 0, 0] },
      'Top View': { pos: [0, 150, 1], target: [0, 0, 0] }
    };
    const preset = viewMode === '2D' ? presets['Top View'] : (presets[cameraPreset] || presets['Overview']);
    const startPos = R.camera.position.clone();
    const endPos = new THREE.Vector3(...preset.pos);
    const startTime = performance.now();
    const anim = () => {
      const t = Math.min((performance.now() - startTime) / 1000, 1);
      const e = 1 - Math.pow(1 - t, 3);
      R.camera.position.lerpVectors(startPos, endPos, e);
      R.controls.target.set(...preset.target);
      R.controls.update();
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }, [cameraPreset, viewMode]);

  return (
    <div
      ref={containerRef}
      data-testid="solar-system-canvas"
      style={{ width: '100%', height: '100%', background: '#05070B' }}
    />
  );
}
