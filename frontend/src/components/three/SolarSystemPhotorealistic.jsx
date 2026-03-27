import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
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

// ==================== TEXTURE URLS (NASA 3D Resources + Solar System Scope) ====================
// Prioridade: NASA para Terra, Júpiter, Saturno (estilo Eyes); fallback Solar System Scope 8K/2K.
const API = process.env.REACT_APP_BACKEND_URL || '';
const NASA_3D_BASE = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master';
const SOLAR_SCOPE_8K = 'https://www.solarsystemscope.com/textures/download/';
// Texturas NASA (fotorrealistas) quando existem no repo; Mercury e Uranus só têm fallback SSS
const TEX_NASA = {
  Earth: `${NASA_3D_BASE}/Images%20and%20Textures/Earth%20(A)/Earth%20(A).jpg`,
  Venus: `${NASA_3D_BASE}/Images%20and%20Textures/Venus/Venus.jpg`,
  Mars: `${NASA_3D_BASE}/Images%20and%20Textures/Mars/Mars.jpg`,
  Jupiter: `${NASA_3D_BASE}/Images%20and%20Textures/Jupiter/Jupiter.jpg`,
  Saturn: `${NASA_3D_BASE}/Images%20and%20Textures/Saturn/Saturn.jpg`,
  Neptune: `${NASA_3D_BASE}/Images%20and%20Textures/Neptune/Neptune.jpg`,
  Pluto: `${NASA_3D_BASE}/Images%20and%20Textures/Pluto/Pluto.jpg`
};
const TEX = {
  Sun: `${SOLAR_SCOPE_8K}8k_sun.jpg`,
  Mercury: `${SOLAR_SCOPE_8K}8k_mercury.jpg`,
  Venus: `${SOLAR_SCOPE_8K}8k_venus_surface.jpg`,
  Earth: `${SOLAR_SCOPE_8K}8k_earth_daymap.jpg`,
  EarthClouds: `${SOLAR_SCOPE_8K}8k_earth_clouds.jpg`,
  Mars: `${SOLAR_SCOPE_8K}8k_mars.jpg`,
  Jupiter: `${SOLAR_SCOPE_8K}8k_jupiter.jpg`,
  Saturn: `${SOLAR_SCOPE_8K}8k_saturn.jpg`,
  SaturnRing: `${SOLAR_SCOPE_8K}8k_saturn_ring_alpha.png`,
  Uranus: `${SOLAR_SCOPE_8K}8k_uranus.jpg`,
  Neptune: `${SOLAR_SCOPE_8K}8k_neptune.jpg`,
  Pluto: `${SOLAR_SCOPE_8K}2k_pluto.jpg`
};
const PARKER_SOLAR_PROBE_GLB = `${NASA_3D_BASE}/3D%20Models/Parker%20Solar%20Probe/Parker%20Solar%20Probe.glb`;
const ATLAS_7_AURORA_7_GLB = `${NASA_3D_BASE}/3D%20Models/Atlas%207%20(Aurora%207)/Atlas%207%20(Aurora%207).glb`;
// Base URL para assets: no Netlify e localmente. PUBLIC_URL é definido no build (ex: '' ou '/Planetas').
const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '') + (process.env.PUBLIC_URL || '');
// Aurora 7 — caminhos absolutos simples (sem getBaseUrl) para máxima compatibilidade Vercel/Netlify/local
const AURORA_7_GLB_ALT = `${process.env.PUBLIC_URL || ''}/models/aurora.glb`;
const AURORA_7_GLB_LOCAL = `${process.env.PUBLIC_URL || ''}/models/Aurora_7.glb`;

// Skybox 4 camadas: 8K star map + nebulae sutis + star particles + Via Láctea leve (sem repetição, estático)
const SKYBOX_RADIUS = 5000;
const STARMAP_8K = `${getBaseUrl()}/textures/starmap_8k.jpg`;
const STARMAP_8K_PNG = `${getBaseUrl()}/textures/starmap_8k.png`;
const STARMAP_FALLBACK = `${getBaseUrl()}/textures/galaxy_hd_bg.jpg`;
const NEBULA_OVERLAY = `${getBaseUrl()}/textures/nebula_overlay.png`;
const MILKY_WAY_BAND = `${getBaseUrl()}/textures/milky_way_band.png`;

// No Netlify o Solar System Scope bloqueia por CORS. Se as texturas estiverem em public/textures/, o site usa elas (mesma origem = sem CORS).
function getLocalTexUrl(sssUrl) {
  if (typeof window === 'undefined') return null;
  const filename = sssUrl.split('/').pop();
  return `${getBaseUrl()}/textures/${filename}`;
}
// Fallback: mesma textura com extensão .png (para imagens PNG salvas com outro nome)
function getLocalTexUrlPng(sssUrl) {
  if (typeof window === 'undefined') return null;
  const filename = sssUrl.split('/').pop().replace(/\.(jpg|jpeg)$/i, '.png');
  return `${getBaseUrl()}/textures/${filename}`;
}

const SUN_RADIUS = 5.5;
const GLOBAL_ROTATION_SPEED = 0.008;

// Environment map estilo NASA Eyes (reflexos PBR); Sol no topo, espaço embaixo
function buildRealisticEnvMap() {
  const size = 256;
  const data = new Float32Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const sunGlow = Math.max(0, 1.0 - Math.sqrt((u - 0.5) ** 2 + (v - 0.15) ** 2) * 3.0);
      const spaceR = 0.005 + v * 0.02;
      const spaceG = 0.008 + v * 0.015;
      const spaceB = 0.025 + v * 0.04;
      data[i] = spaceR + sunGlow * 2.5;
      data[i + 1] = spaceG + sunGlow * 1.8;
      data[i + 2] = spaceB + sunGlow * 0.8;
      data[i + 3] = 1.0;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

// ==================== PLANET CONFIG (PBR) — preset NASA Eyes + órbitas 2x mais distantes ====================
const PLANETS = {
  // PBR realista estilo NASA Eyes — normal maps fortes, roughness variado, anéis nos gigantes
  Mercury: { size: 0.38, orbit: 20,  speed: 0.048, rot: 0.005, color: 0x8C7E6D, rough: 0.88, metal: 0.06, nStr: 4.0, envMapIntensity: 0.20, emissiveIntensity: 0.02 },
  Venus:   { size: 0.95, orbit: 28,  speed: 0.035, rot: -0.002, color: 0xC4A35A, rough: 0.70, metal: 0.04, nStr: 2.0, envMapIntensity: 0.18, emissiveIntensity: 0.02, atmo: true, atmoColor: 0xddaa44 },
  Earth:   { size: 1.0,  orbit: 36,  speed: 0.029, rot: 0.02,  color: 0x2E6B9E, rough: 0.55, metal: 0.15, nStr: 3.0, envMapIntensity: 0.35, emissiveIntensity: 0.015, atmo: true, clouds: true },
  Mars:    { size: 0.53, orbit: 48,  speed: 0.024, rot: 0.018, color: 0xA0522D, rough: 0.90, metal: 0.03, nStr: 5.0, envMapIntensity: 0.15, emissiveIntensity: 0.02 },
  Jupiter: { size: 2.8,  orbit: 84,  speed: 0.013, rot: 0.045, color: 0xC4A45A, rough: 0.50, metal: 0.02, nStr: 1.5, envMapIntensity: 0.40, emissiveIntensity: 0.02, rings: true, ringStyle: 'jupiter' },
  Saturn:  { size: 2.3,  orbit: 116, speed: 0.0097, rot: 0.038, color: 0xD4C07A, rough: 0.48, metal: 0.02, nStr: 1.2, envMapIntensity: 0.45, emissiveIntensity: 0.02, rings: true },
  Uranus:  { size: 1.6,  orbit: 148, speed: 0.0068, rot: -0.03, color: 0x7EC8C8, rough: 0.42, metal: 0.03, nStr: 0.8, envMapIntensity: 0.50, emissiveIntensity: 0.03, rings: true, ringStyle: 'uranus' },
  Neptune: { size: 1.5,  orbit: 180, speed: 0.0054, rot: 0.032, color: 0x3366BB, rough: 0.40, metal: 0.03, nStr: 0.8, envMapIntensity: 0.55, emissiveIntensity: 0.03, rings: true, ringStyle: 'neptune' },
  Pluto:   { size: 0.18, orbit: 200, speed: 0.004, rot: 0.008, color: 0x9E8E7E, rough: 0.90, metal: 0.02, nStr: 3.0, envMapIntensity: 0.12, emissiveIntensity: 0.05 }
};

const NATURAL_MOONS = {
  Earth: [
    { name: 'Lua', size: 0.27, orbit: 2.8, speed: 0.5, color: 0xA0A0A0, rough: 0.9 }
  ],
  Mars: [
    { name: 'Phobos', size: 0.06, orbit: 1.4, speed: 0.8, color: 0x8B7355, rough: 0.95 },
    { name: 'Deimos', size: 0.04, orbit: 2.0, speed: 0.6, color: 0x7A6B5A, rough: 0.95 }
  ],
  Jupiter: [
    { name: 'Io', size: 0.18, orbit: 5.5, speed: 0.45, color: 0xCCB050, rough: 0.8 },
    { name: 'Europa', size: 0.15, orbit: 6.8, speed: 0.35, color: 0xC4BCA0, rough: 0.25 },
    { name: 'Ganymede', size: 0.22, orbit: 8.2, speed: 0.25, color: 0x9A8B7A, rough: 0.7 },
    { name: 'Callisto', size: 0.20, orbit: 9.8, speed: 0.18, color: 0x6B5E4F, rough: 0.85 }
  ],
  Saturn: [
    { name: 'Titan', size: 0.22, orbit: 6.5, speed: 0.3, color: 0xE0A848, rough: 0.45 },
    { name: 'Enceladus', size: 0.08, orbit: 4.5, speed: 0.55, color: 0xDEDEDE, rough: 0.15 },
    { name: 'Mimas', size: 0.05, orbit: 3.8, speed: 0.65, color: 0xBBBBBB, rough: 0.85 },
    { name: 'Rhea', size: 0.10, orbit: 5.5, speed: 0.4, color: 0xCCCCCC, rough: 0.8 }
  ],
  Uranus: [
    { name: 'Titania', size: 0.12, orbit: 4.0, speed: 0.35, color: 0xA8B8C8, rough: 0.7 },
    { name: 'Oberon', size: 0.11, orbit: 5.0, speed: 0.28, color: 0x8899AA, rough: 0.75 },
    { name: 'Miranda', size: 0.06, orbit: 3.0, speed: 0.5, color: 0xBBCCDD, rough: 0.6 }
  ],
  Neptune: [
    { name: 'Triton', size: 0.14, orbit: 4.2, speed: 0.32, color: 0x8BA8C4, rough: 0.5 },
    { name: 'Proteus', size: 0.06, orbit: 3.0, speed: 0.55, color: 0x7799AA, rough: 0.8 }
  ],
  Pluto: [
    { name: 'Charon', size: 0.09, orbit: 1.2, speed: 0.4, color: 0x9E8E7E, rough: 0.85 }
  ]
};

const SYSTEM_LIMIT_RADIUS = PLANETS.Jupiter.orbit + 20;
const ASTEROID_BELT_INNER = 60;  // 30 * 2
const ASTEROID_BELT_OUTER = 76;  // 38 * 2

// ==================== SATELLITE CONFIG (luas + Aurora 7 + Jason-2) ====================
const SATELLITES = [
  { name: 'Phobos',    module: 'Auth API',             color: 0x8B7355, size: 0.10, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Deimos',    module: 'Payment Gateway',      color: 0x7A6B5A, size: 0.07, rough: 0.95, metal: 0.05, irregular: true },
  { name: 'Europa',    module: 'Notification Service', color: 0xC4BCA0, size: 0.18, rough: 0.25, metal: 0.05, irregular: false },
  { name: 'Ganymede',  module: 'Search Engine',        color: 0x9A8B7A, size: 0.22, rough: 0.70, metal: 0.10, irregular: false },
  { name: 'Callisto',  module: 'Cache Layer',          color: 0x6B5E4F, size: 0.20, rough: 0.85, metal: 0.05, irregular: false },
  { name: 'Titan',     module: 'Message Queue',        color: 0xE0A848, size: 0.22, rough: 0.45, metal: 0.00, irregular: false },
  { name: 'Enceladus', module: 'Log Aggregator',       color: 0xDEDEDE, size: 0.10, rough: 0.15, metal: 0.10, irregular: false },
  { name: 'Moon',      module: 'Config Server',        color: 0xA0A0A0, size: 0.27, rough: 0.90, metal: 0.05, irregular: false },
  { name: 'Jason-2',   module: 'Altímetro oceânico',   color: 0x1e88e5, size: 0.18, rough: 0.6, metal: 0.4, irregular: false, style: 'jason2' }
];

// ==================== PBR MAP GENERATORS ====================
function genNormalMap(img, str) {
  const canvas = document.createElement('canvas');
  const w = Math.min(img.width, 4096), h = Math.min(img.height, 2048);
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
  const w = Math.min(img.width, 2048), h = Math.min(img.height, 1024);
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

// Textura redonda para estrelas (glow suave, nunca quadrado)
function createStarPointTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.08, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.04)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const STAR_POINT_TEX = createStarPointTexture(128);

// Gera campo de estrelas 3D com cores astronômicas realistas
function generateStarField(count, innerRadius, outerRadius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    const spectral = Math.random();
    if (spectral < 0.05) { colors[i3] = 1.0; colors[i3+1] = 0.42; colors[i3+2] = 0.28; }
    else if (spectral < 0.15) { colors[i3] = 1.0; colors[i3+1] = 0.72; colors[i3+2] = 0.45; }
    else if (spectral < 0.35) { colors[i3] = 1.0; colors[i3+1] = 0.95; colors[i3+2] = 0.72; }
    else if (spectral < 0.55) { colors[i3] = 1.0; colors[i3+1] = 0.98; colors[i3+2] = 0.90; }
    else if (spectral < 0.80) { colors[i3] = 1.0; colors[i3+1] = 1.0; colors[i3+2] = 1.0; }
    else if (spectral < 0.95) { colors[i3] = 0.75; colors[i3+1] = 0.85; colors[i3+2] = 1.0; }
    else { colors[i3] = 0.55; colors[i3+1] = 0.70; colors[i3+2] = 1.0; }
    const mag = Math.random();
    if (mag < 0.75) sizes[i] = 0.5 + Math.random() * 1.5;
    else if (mag < 0.93) sizes[i] = 2.0 + Math.random() * 3.0;
    else if (mag < 0.99) sizes[i] = 4.0 + Math.random() * 4.0;
    else sizes[i] = 7.0 + Math.random() * 5.0;
  }
  return { positions, colors, sizes };
}

// Custom shader para estrelas perfeitamente redondas com glow
function createStarShaderMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: { pointTexture: { value: texture }, globalOpacity: { value: 1.0 } },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (280.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 32.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float globalOpacity;
      varying vec3 vColor;
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * globalOpacity);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true
  });
}

// Aplica configuração de textura para skybox: sRGB, sem repetição, boa filtragem
function applySkyboxTex(t) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 16;
  t.generateMipmaps = true;
}

// ==================== SCENE BUILDERS ====================
// Skybox imersivo 7 camadas: 8K star map + nebulosa + Via Lactea + 3 camadas estrelas 3D + Olho de Deus
function createSkyboxLayers(scene, loader) {
  const segments = 64;
  const skyGeo = new THREE.SphereGeometry(SKYBOX_RADIUS, segments, segments);

  // ====== CAMADA 1: Mapa de estrelas 8K equirectangular ======
  const layer1Mat = new THREE.MeshBasicMaterial({
    map: null, side: THREE.BackSide, depthWrite: false, fog: false
  });
  const layer1 = new THREE.Mesh(skyGeo.clone(), layer1Mat);
  layer1.name = 'SkyboxLayer1_StarMap';
  layer1.renderOrder = -10;
  scene.add(layer1);

  const applyProceduralStarfield = () => {
    const w = 2048, h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#030510';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18000; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const brightness = Math.random();
      const rad = brightness > 0.97 ? 2.0 : brightness > 0.85 ? 1.2 : brightness > 0.5 ? 0.6 : 0.3;
      const temp = Math.random();
      if (temp < 0.15) ctx.fillStyle = 'rgba(255,200,150,' + (0.4 + brightness * 0.6) + ')';
      else if (temp < 0.4) ctx.fillStyle = 'rgba(255,250,220,' + (0.4 + brightness * 0.6) + ')';
      else if (temp < 0.85) ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + brightness * 0.7) + ')';
      else ctx.fillStyle = 'rgba(180,210,255,' + (0.4 + brightness * 0.6) + ')';
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      if (brightness > 0.92) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, rad * 4);
        grad.addColorStop(0, 'rgba(255,255,255,' + (brightness * 0.3) + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    applySkyboxTex(tex);
    layer1Mat.map = tex;
    layer1Mat.needsUpdate = true;
  };

  loader.load(STARMAP_8K, (t) => {
    applySkyboxTex(t); layer1Mat.map = t; layer1Mat.needsUpdate = true;
  }, undefined, () => {
    loader.load(STARMAP_8K_PNG, (t) => {
      applySkyboxTex(t); layer1Mat.map = t; layer1Mat.needsUpdate = true;
    }, undefined, () => {
      loader.load(STARMAP_FALLBACK, (t) => {
        applySkyboxTex(t); layer1Mat.map = t; layer1Mat.needsUpdate = true;
      }, undefined, () => {});
    });
  });
  applyProceduralStarfield();

  // ====== CAMADA 2: Nebulosa sutil ======
  const layer2Mat = new THREE.MeshBasicMaterial({
    map: null, side: THREE.BackSide, transparent: true, opacity: 0.22, depthWrite: false, fog: false
  });
  const layer2 = new THREE.Mesh(skyGeo.clone(), layer2Mat);
  layer2.name = 'SkyboxLayer2_Nebula';
  layer2.renderOrder = -9;
  scene.add(layer2);
  loader.load(NEBULA_OVERLAY, (t) => {
    applySkyboxTex(t); layer2Mat.map = t; layer2Mat.needsUpdate = true;
  }, undefined, () => {});

  // ====== CAMADA 3: Via Lactea ======
  const layer3Mat = new THREE.MeshBasicMaterial({
    map: null, side: THREE.BackSide, transparent: true, opacity: 0.20, depthWrite: false, fog: false
  });
  const layer3 = new THREE.Mesh(skyGeo.clone(), layer3Mat);
  layer3.name = 'SkyboxLayer3_MilkyWay';
  layer3.renderOrder = -8;
  scene.add(layer3);
  loader.load(MILKY_WAY_BAND, (t) => {
    applySkyboxTex(t); layer3Mat.map = t; layer3Mat.needsUpdate = true;
  }, undefined, () => {});

  // ====== CAMADA 4: Estrelas DISTANTES 3D (10.000) ======
  const farStars = generateStarField(10000, 1500, 4000);
  const farGeo = new THREE.BufferGeometry();
  farGeo.setAttribute('position', new THREE.BufferAttribute(farStars.positions, 3));
  farGeo.setAttribute('color', new THREE.BufferAttribute(farStars.colors, 3));
  farGeo.setAttribute('size', new THREE.BufferAttribute(farStars.sizes, 1));
  const farPoints = new THREE.Points(farGeo, createStarShaderMaterial(STAR_POINT_TEX));
  farPoints.name = 'Stars_Far';
  farPoints.renderOrder = -7;
  scene.add(farPoints);

  // ====== CAMADA 5: Estrelas MEDIAS 3D (8.000) ======
  const midStars = generateStarField(8000, 400, 1500);
  const midGeo = new THREE.BufferGeometry();
  midGeo.setAttribute('position', new THREE.BufferAttribute(midStars.positions, 3));
  midGeo.setAttribute('color', new THREE.BufferAttribute(midStars.colors, 3));
  midGeo.setAttribute('size', new THREE.BufferAttribute(midStars.sizes, 1));
  const midPoints = new THREE.Points(midGeo, createStarShaderMaterial(STAR_POINT_TEX));
  midPoints.name = 'Stars_Mid';
  midPoints.renderOrder = -6;
  scene.add(midPoints);

  // ====== CAMADA 6: Estrelas PROXIMAS 3D (5.000) ======
  const nearStars = generateStarField(5000, 50, 400);
  const nearGeo = new THREE.BufferGeometry();
  nearGeo.setAttribute('position', new THREE.BufferAttribute(nearStars.positions, 3));
  nearGeo.setAttribute('color', new THREE.BufferAttribute(nearStars.colors, 3));
  nearGeo.setAttribute('size', new THREE.BufferAttribute(nearStars.sizes, 1));
  const nearMat = createStarShaderMaterial(STAR_POINT_TEX);
  nearMat.uniforms.globalOpacity.value = 0.85;
  const nearPoints = new THREE.Points(nearGeo, nearMat);
  nearPoints.name = 'Stars_Near';
  nearPoints.renderOrder = -5;
  scene.add(nearPoints);

  // ====== CAMADA 7: Olho de Deus procedural ======
  const eyeCanvas = document.createElement('canvas');
  const eyeW = 512, eyeH = 256;
  eyeCanvas.width = eyeW; eyeCanvas.height = eyeH;
  const eyeCtx = eyeCanvas.getContext('2d');
  const eyeGrad = eyeCtx.createRadialGradient(eyeW * 0.5, eyeH * 0.5, 0, eyeW * 0.5, eyeH * 0.5, eyeW * 0.45);
  eyeGrad.addColorStop(0, 'rgba(180, 200, 255, 0.30)');
  eyeGrad.addColorStop(0.4, 'rgba(120, 140, 200, 0.10)');
  eyeGrad.addColorStop(0.7, 'rgba(80, 100, 160, 0.03)');
  eyeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  eyeCtx.fillStyle = eyeGrad;
  eyeCtx.fillRect(0, 0, eyeW, eyeH);
  const eyeTex = new THREE.CanvasTexture(eyeCanvas);
  applySkyboxTex(eyeTex);
  const eyeMat = new THREE.MeshBasicMaterial({
    map: eyeTex, side: THREE.BackSide, transparent: true, opacity: 0.4, depthWrite: false, fog: false
  });
  const eyeMesh = new THREE.Mesh(skyGeo.clone(), eyeMat);
  eyeMesh.name = 'SkyboxLayer_EyeOfGod';
  eyeMesh.renderOrder = -4;
  eyeMesh.rotation.y = Math.PI * 0.35;
  eyeMesh.rotation.x = 0.12;
  scene.add(eyeMesh);

  return nearPoints;
}

// Programação completa do Sol com logo (spec): fotosfera → core + camadas internas + logo B4 + ERD-FX → glow.
// Logo visível através do Sol: depthTest false, renderOrder 999; breathing 0.85 + 0.15*sin(elapsed*0.8).
function createSun(scene, loader, R) {
  const group = new THREE.Group();
  group.name = 'SunGroup';

  // 1. FOTOSFERA — camada externa brilhante (shader turbulento, gradiente laranja→amarelo, emissão)
  const sunMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: null },
      uHasTex: { value: 0 },
      uEmission: { value: 2.0 }
    },
    vertexShader: VERT,
    fragmentShader: SUN_FRAG
  });
  R.sunMat = sunMat;
  const applySunTex = (t) => { t.colorSpace = THREE.SRGBColorSpace; sunMat.uniforms.uTex.value = t; sunMat.uniforms.uHasTex.value = 1; };
  const sunFallback2k = TEX.Sun.replace(/8k_/g, '2k_');
  const trySunSSS = () => loader.load(TEX.Sun, applySunTex, undefined, () => loader.load(sunFallback2k, applySunTex));
  const trySunLocal2k = () => loader.load(getLocalTexUrl(sunFallback2k) || sunFallback2k, applySunTex, undefined, trySunSSS);
  const trySunLocalPng = () => { const url = getLocalTexUrlPng(TEX.Sun); if (url) loader.load(url, applySunTex, undefined, trySunLocal2k); else trySunLocal2k(); };
  loader.load(getLocalTexUrl(TEX.Sun) || TEX.Sun, applySunTex, undefined, trySunLocalPng);

  const photo = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 64, 64), sunMat);
  photo.name = 'Sun';
  photo.userData = { clickable: true, name: 'Sun' };
  photo.renderOrder = 1;
  group.add(photo);
  R.sunLayers.photosphere = photo;
  R.planets['Sun'] = photo;

  // 2. CORE — esfera escura interior (depthTest:false → visível através da fotosfera)
  const coreGeo = new THREE.SphereGeometry(SUN_RADIUS * 0.72, 48, 48);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x1a0a00,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
    depthWrite: false
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.renderOrder = 998;

  // 3. LOGO B4 — sprite à frente do núcleo do Sol; fallback = texto branco "B4" (sempre visível)
  const logoPlaceholder = () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 68;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 68);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B4', 64, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const logoTex = logoPlaceholder();
  const logoSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: logoTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 1
  }));
  if (API) {
    loader.load(`${API}/api/textures/logo_b4.png`, (t) => { t.colorSpace = THREE.SRGBColorSpace; logoSprite.material.map = t; logoSprite.material.needsUpdate = true; });
  } else {
    loader.load(`${getBaseUrl()}/logo-b4-branco.png`, (t) => { t.colorSpace = THREE.SRGBColorSpace; logoSprite.material.map = t; logoSprite.material.needsUpdate = true; }, undefined, () => { logoSprite.material.map = logoPlaceholder(); });
  }
  logoSprite.scale.set(5, 5 * 0.527, 1);
  logoSprite.position.set(0, 0.3, 0.9);
  logoSprite.renderOrder = 999;

  // 4. ERD-FX — sprite texto canvas (dourado/saffron)
  const fxCanvas = document.createElement('canvas');
  fxCanvas.width = 512;
  fxCanvas.height = 128;
  const fxCtx = fxCanvas.getContext('2d');
  fxCtx.fillStyle = '#F3AE3E';
  fxCtx.font = 'bold 72px monospace';
  fxCtx.textAlign = 'center';
  fxCtx.textBaseline = 'middle';
  fxCtx.fillText('ERD-FX', 256, 90);
  const fxTex = new THREE.CanvasTexture(fxCanvas);
  fxTex.needsUpdate = true;
  const fxSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fxTex,
    transparent: true,
    depthTest: false,
    depthWrite: false
  }));
  fxSprite.scale.set(4.2, 1.8, 1);
  fxSprite.position.set(0, -2.1, 0.4);
  fxSprite.renderOrder = 999;

  // 5. CORE GROUP — core escuro + camadas internas + logo + ERD-FX (spec: montagem completa do Sol)
  const coreGroup = new THREE.Group();
  coreGroup.name = 'SolarCore';
  coreGroup.add(coreMesh);
  // 6. CAMADAS INTERNAS (cross-section) — zona radiativa, convectiva, núcleo; dentro do coreGroup, renderOrder 997
  const internalLayers = [
    { key: 'radiative', r: SUN_RADIUS * 0.52, color: 0xff6600, opacity: 0.4 },
    { key: 'convective', r: SUN_RADIUS * 0.32, color: 0xff9900, opacity: 0.5 },
    { key: 'core', r: SUN_RADIUS * 0.15, color: 0xffcc00, opacity: 0.6 }
  ];
  internalLayers.forEach((l) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(l.r, 32, 32),
      new THREE.MeshBasicMaterial({
        color: l.color,
        transparent: true,
        opacity: l.opacity,
        depthTest: false,
        depthWrite: false
      })
    );
    mesh.renderOrder = 997;
    mesh.visible = false; // visíveis em cross-section quando ativado
    coreGroup.add(mesh);
    R.sunLayers[l.key] = mesh;
  });
  coreGroup.add(logoSprite);
  coreGroup.add(fxSprite);
  coreGroup.visible = true;
  group.add(coreGroup);
  R.sunLayers.coreGroup = coreGroup;
  R.sunLayers.logoPlane = logoSprite;
  R.sunLayers.fxSprite = fxSprite;

  // 7. GLOW — halo externo (rim laranja, AdditiveBlending)
  const GLOW_FRAG = `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
      rim = pow(rim, 3.5);
      vec3 orange = vec3(1.0, 0.5, 0.1);
      gl_FragColor = vec4(orange, rim * 0.7);
      #include <logdepthbuf_fragment>
    }
  `;
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS * 1.18, 48, 48), glowMat);
  group.add(glow);
  R.sunLayers.glow = glow;

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
    color: 0xaaaacc, transparent: true, opacity: 0.06, depthWrite: false, linewidth: 1
  });
  const R = 2800;
  const toVec = (ra, dec) => {
    const phi = (90 - dec) * Math.PI / 180;
    const theta = ra * Math.PI / 180;
    return new THREE.Vector3(
      R * Math.sin(phi) * Math.cos(theta),
      R * Math.cos(phi),
      R * Math.sin(phi) * Math.sin(theta)
    );
  };
  const constellations = [
    [[80, 7], [82, 2], [84, 7], [82, 12], [80, 7], [82, 2], [83, -4], [82, -8]],
    [[5, 59], [12, 62], [18, 58], [25, 62], [32, 58]],
    [[160, 62], [165, 58], [175, 56], [185, 58], [192, 55], [198, 50], [188, 48]],
    [[190, -58], [195, -63], [200, -58], [195, -53], [190, -58]],
    [[245, -25], [248, -28], [252, -32], [255, -36], [258, -38], [262, -35], [265, -32]],
    [[150, 20], [155, 24], [162, 20], [168, 24], [175, 20], [168, 14], [162, 10], [150, 20]]
  ];
  constellations.forEach(pts => {
    const vectors = pts.map(p => toVec(p[0], p[1]));
    const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
    const line = new THREE.Line(geometry, skyMat);
    line.renderOrder = -3;
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

// Estilo dos satélites artificiais: "compact" (cubo + painéis discretos) — não é mais Jason-2
const SATELLITE_STYLE = 'compact'; // 'compact' = estilo moderno; mantido código legado comentado se precisar Jason-2
const SATELLITE_SCALE_FACTOR = 0.55; // Luas visíveis e proporcionais, maiores que antes

function createSatelliteModel(cfg) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xa0a8b0,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x1a1d22,
    emissiveIntensity: 0.25
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a5a,
    metalness: 0.3,
    roughness: 0.6,
    emissive: 0x0a1225,
    emissiveIntensity: 0.4
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x6f757b,
    metalness: 0.55,
    roughness: 0.4,
    emissive: 0x15181c,
    emissiveIntensity: 0.2
  });

  if (SATELLITE_STYLE === 'compact') {
    // Corpo principal: caixa compacta (não cilindro/dish tipo Jason-2)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.45, 1), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.rotation.z = Math.PI / 6;
    group.add(body);

    // Painéis solares finos e menores (2 lados)
    const panelW = 0.5, panelH = 0.35, panelD = 0.02;
    const panelGeo = new THREE.BoxGeometry(panelW, panelD, panelH);
    const panelLeft = new THREE.Mesh(panelGeo, panelMat);
    panelLeft.position.set(-0.38, 0, 0);
    const panelRight = new THREE.Mesh(panelGeo, panelMat);
    panelRight.position.set(0.38, 0, 0);
    group.add(panelLeft, panelRight);

    // Pequena antena (haste)
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8), accentMat);
    antenna.position.set(0, 0.18, 0);
    group.add(antenna);

    // Pequeno “sensor” frontal (cubo)
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05, 1), accentMat);
    sensor.position.z = 0.28;
    group.add(sensor);
  } else {
    // Fallback estilo legado (Jason-2-like) — mantido para compatibilidade
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 32), bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.55, 32, 1, true), accentMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.8;
    group.add(dish);
    const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 0.8);
    const pl = new THREE.Mesh(panelGeo, panelMat);
    pl.position.set(-1.25, 0, 0);
    const pr = new THREE.Mesh(panelGeo, panelMat);
    pr.position.set(1.25, 0, 0);
    group.add(pl, pr);
  }

  const scale = (0.6 + cfg.size) * SATELLITE_SCALE_FACTOR;
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

  const envIntensity = cfg.envMapIntensity ?? 0.3;
  const emissIntensity = cfg.emissiveIntensity ?? 0.04;
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: cfg.rough,
    metalness: cfg.metal,
    envMapIntensity: envIntensity,
    emissive: new THREE.Color(cfg.color),
    emissiveIntensity: emissIntensity
  });
  mat.metalnessMap = constMap(cfg.metal);

  const ensureColor = () => {
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.color.setHex(cfg.color);
    mat.emissive.copy(new THREE.Color(cfg.color));
    mat.emissiveIntensity = emissIntensity;
    mat.needsUpdate = true;
  };

  if (TEX[name]) {
    const fallback2k = TEX[name].replace(/8k_/g, '2k_');
    const applyTex = (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      mat.map = tex;
      mat.color.setHex(cfg.color);
      mat.emissive.copy(new THREE.Color(cfg.color));
      mat.emissiveMap = null;
      mat.emissiveIntensity = emissIntensity;
      const nMap = genNormalMap(tex.image, cfg.nStr);
      if (nMap) { mat.normalMap = nMap; mat.normalScale.set(cfg.nStr * 1.0, cfg.nStr * 1.0); }
      const rMap = genRoughnessMap(tex.image, cfg.rough, 0.4);
      if (rMap) mat.roughnessMap = rMap;
      mat.needsUpdate = true;
    };
    const primaryUrl = TEX_NASA[name] || TEX[name];
    const tryFallbackSSS = () => {
      loader.load(TEX[name], applyTex, undefined, () => {
        ensureColor();
        if (fallback2k !== TEX[name]) loader.load(fallback2k, applyTex, undefined, ensureColor);
        else ensureColor();
      });
    };
    const tryPrimary = () => loader.load(primaryUrl, applyTex, undefined, () => { ensureColor(); tryFallbackSSS(); });
    const local8k = getLocalTexUrl(TEX[name]);
    const local8kPng = getLocalTexUrlPng(TEX[name]);
    const local2k = getLocalTexUrl(fallback2k);
    // Sempre tenta local primeiro (Netlify = sem CORS); aceita .jpg ou .png
    const tryLocalPng = () => (local8kPng && local8kPng !== local8k) ? loader.load(local8kPng, applyTex, undefined, () => { if (local2k && local2k !== local8k) loader.load(local2k, applyTex, undefined, tryPrimary); else tryPrimary(); }) : (local2k && local2k !== local8k) ? loader.load(local2k, applyTex, undefined, tryPrimary) : tryPrimary();
    if (local8k) {
      loader.load(local8k, applyTex, undefined, tryLocalPng);
    } else tryPrimary();
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

  // Planetary rings (Saturn, Jupiter, Uranus, Neptune)
  if (cfg.rings) {
    const style = cfg.ringStyle || 'saturn';
    let innerMul, outerMul, ringColor, ringOpacity, ringTilt;
    if (style === 'jupiter') {
      innerMul = 1.15; outerMul = 1.5; ringColor = 0x8B7355; ringOpacity = 0.15; ringTilt = Math.PI / 2.1;
    } else if (style === 'uranus') {
      innerMul = 1.4; outerMul = 2.2; ringColor = 0x88AACC; ringOpacity = 0.25; ringTilt = Math.PI / 2.0;
    } else if (style === 'neptune') {
      innerMul = 1.3; outerMul = 1.8; ringColor = 0x5566AA; ringOpacity = 0.12; ringTilt = Math.PI / 2.1;
    } else {
      innerMul = 1.3; outerMul = 2.5; ringColor = 0xC9B896; ringOpacity = 0.8; ringTilt = Math.PI / 2.5;
    }
    const ringGeo = new THREE.RingGeometry(cfg.size * innerMul, cfg.size * outerMul, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: ringOpacity, roughness: 0.8, metalness: 0.0
    });
    if (style === 'saturn') {
      const applyRing = (t) => { t.colorSpace = THREE.SRGBColorSpace; ringMat.map = t; ringMat.alphaMap = t; ringMat.needsUpdate = true; };
      const ring2k = TEX.SaturnRing.replace(/8k_/g, '2k_');
      loader.load(getLocalTexUrl(TEX.SaturnRing) || TEX.SaturnRing, applyRing, undefined, () => loader.load(getLocalTexUrl(ring2k) || ring2k, applyRing, undefined, () => loader.load(TEX.SaturnRing, applyRing, undefined, () => loader.load(ring2k, applyRing))));
    }
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = ringTilt; ring.receiveShadow = true;
    planet.add(ring);
    // Uranus has nearly vertical tilt (98°)
    if (style === 'uranus') ring.rotation.x = 0.3;
  }

  // Earth clouds
  if (cfg.clouds) {
    const cloudMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.35, depthWrite: false, roughness: 1.0, metalness: 0.0 });
    const applyCloud = (t) => { t.colorSpace = THREE.SRGBColorSpace; cloudMat.map = t; cloudMat.alphaMap = t; cloudMat.needsUpdate = true; };
    const cloud2k = TEX.EarthClouds.replace(/8k_/g, '2k_');
    const tryCloudRemote = () => loader.load(TEX.EarthClouds, applyCloud, undefined, () => loader.load(cloud2k, applyCloud));
    const tryCloudLocal2k = () => loader.load(getLocalTexUrl(cloud2k) || cloud2k, applyCloud, undefined, tryCloudRemote);
    const tryCloudLocalPng = () => { const url = getLocalTexUrlPng(TEX.EarthClouds); if (url) loader.load(url, applyCloud, undefined, tryCloudLocal2k); else tryCloudLocal2k(); };
    loader.load(getLocalTexUrl(TEX.EarthClouds) || TEX.EarthClouds, applyCloud, undefined, tryCloudLocalPng);
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(cfg.size * 1.02, 64, 64), cloudMat);
    planet.add(clouds);
    R.planets['EarthClouds'] = clouds;
  }

  // Atmosphere (Fresnel glow) — Earth blue, Venus amber
  if (cfg.atmo) {
    const atmoCol = cfg.atmoColor ? new THREE.Color(cfg.atmoColor) : new THREE.Color(0.3, 0.6, 1.0);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uAtmoColor: { value: atmoCol } },
      vertexShader: VERT,
      fragmentShader: `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        uniform vec3 uAtmoColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          float f = 1.0 - max(dot(vNormal, normalize(cameraPosition-vWorldPos)), 0.0);
          f = pow(f, 3.5);
          gl_FragColor = vec4(uAtmoColor * 1.5, f * 0.75);
          #include <logdepthbuf_fragment>
        }
      `,
      transparent: true, side: THREE.BackSide, depthWrite: false
    });
    const atmoScale = name === 'Venus' ? 1.08 : 1.15;
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(cfg.size * atmoScale, 64, 64), atmoMat);
    atmo.castShadow = false; atmo.receiveShadow = false;
    planet.add(atmo);
  }

  const auroraColors = {
    Earth: 0x55ffcc,
    Jupiter: 0x66aaff,
    Saturn: 0x88bbff
  };
  if (  auroraColors[name]) {
    const aurora = createAurora(cfg.size, auroraColors[name]);
    aurora.name = `${name}Aurora`;
    aurora.renderOrder = 3;
    if (name === 'Earth') aurora.visible = false;
    planet.add(aurora);
    R.auroras.push(aurora);
  }

  scene.add(group);
}

function createNaturalMoons(R) {
  if (!R.moons) R.moons = [];

  Object.entries(NATURAL_MOONS).forEach(([planetName, moons]) => {
    const parentPlanet = R.planets[planetName];
    if (!parentPlanet) return;

    moons.forEach((moonCfg, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: moonCfg.color,
        roughness: moonCfg.rough,
        metalness: 0.05,
        emissive: new THREE.Color(moonCfg.color),
        emissiveIntensity: 0.06
      });

      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(moonCfg.size, 32, 32),
        mat
      );
      moonMesh.name = moonCfg.name;
      moonMesh.userData = { clickable: true, name: moonCfg.name };
      moonMesh.castShadow = true;
      moonMesh.receiveShadow = true;

      const label = createLabel(moonCfg.name);
      label.position.y = moonCfg.size + 0.4;
      moonMesh.add(label);

      const startAngle = (i / moons.length) * Math.PI * 2 + Math.random() * 0.5;
      moonMesh.position.set(
        Math.cos(startAngle) * moonCfg.orbit,
        0,
        Math.sin(startAngle) * moonCfg.orbit
      );

      parentPlanet.add(moonMesh);

      R.moons.push({
        mesh: moonMesh,
        angle: startAngle,
        orbitRadius: moonCfg.orbit,
        speed: moonCfg.speed,
        yOffset: 0,
        bobAmp: 0
      });
    });
  });
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
      const baseScale = PLANETS.Mars.size * 0.15;
      sat.scale.setScalar(baseScale * SATELLITE_SCALE_FACTOR); // 1/3 do tamanho
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
    label.position.y = satelliteModel ? 1.2 : 0.5 + cfg.size * 2.5;
    sat.add(label);

    scene.add(sat);
    R.satellites.push({ mesh: sat, angle: a, orbitRadius: satOrbit });
  });
}

function createAsteroids(scene, R) {
  const count = 3000, inner = ASTEROID_BELT_INNER, outer = ASTEROID_BELT_OUTER, beltH = 2;
  const mesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({
      color: 0xa89078,
      roughness: 0.75,
      metalness: 0.08,
      flatShading: true,
      envMapIntensity: 0.4
    }),
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
    const v = 0.72 + Math.random() * 0.28;
    color.setRGB(0.68 * v, 0.58 * v, 0.45 * v);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  R.planets['AsteroidBelt'] = mesh;
}

// Cometas removidos para um look mais \"limpo\"/cinematográfico

const PARKER_ORBIT_RADIUS = 6;
const PARKER_SPEED = 0.04;

function createParkerSolarProbe(solarGroup, R) {
  const group = new THREE.Group();
  group.name = 'ParkerSolarProbe';
  group.userData = { clickable: true, name: 'Parker Solar Probe' };
  R.parkerAngle = Math.random() * Math.PI * 2;
  group.position.x = Math.cos(R.parkerAngle) * PARKER_ORBIT_RADIUS;
  group.position.z = Math.sin(R.parkerAngle) * PARKER_ORBIT_RADIUS;

  const gltfLoader = new GLTFLoader();
  gltfLoader.load(PARKER_SOLAR_PROBE_GLB, (gltf) => {
    const model = gltf.scene;
    model.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true; c.receiveShadow = true;
        c.userData = { clickable: true, name: 'Parker Solar Probe' };
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.25 / maxDim;
    model.scale.setScalar(scale);
    group.add(model);
  }, undefined, () => { /* fallback: optional placeholder mesh */ });

  solarGroup.add(group);
  R.parkerGroup = group;
}

// ==================== INTRO COCKPIT (procedural sci-fi interior) ====================
function buildIntroCockpit() {
  const g = new THREE.Group();
  g.name = 'IntroCockpit';
  const D = 7, W = 5.5, H = 3.2;

  const mkWall = (w, h) => new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: 0x080c14, metalness: 0.85, roughness: 0.22, side: THREE.DoubleSide })
  );

  const floor = mkWall(W, D); floor.rotation.x = -Math.PI / 2; floor.position.y = -H / 2; g.add(floor);
  const ceil = mkWall(W, D);  ceil.rotation.x = Math.PI / 2;  ceil.position.y = H / 2;  g.add(ceil);
  const back = mkWall(W, H);  back.position.z = D / 2; g.add(back);
  [-1, 1].forEach(s => { const sw = mkWall(D, H); sw.rotation.y = -s * Math.PI / 2; sw.position.x = s * W / 2; g.add(sw); });

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.9, roughness: 0.2, emissive: new THREE.Color(0x0a1828), emissiveIntensity: 0.4 });
  const ft = 0.14;
  [[W + ft, ft, ft, 0, H / 2, -D / 2], [W + ft, ft, ft, 0, -H / 2, -D / 2], [ft, H, ft, -W / 2, 0, -D / 2], [ft, H, ft, W / 2, 0, -D / 2]].forEach(([bw, bh, bd, px, py, pz]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frameMat);
    m.position.set(px, py, pz); g.add(m);
  });

  const accent = () => new THREE.MeshBasicMaterial({ color: 0x1a5a8a, transparent: true, opacity: 0.55 });
  [-1, 1].forEach(s => [-0.7, 0.7].forEach(y => {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.85, 0.035), accent());
    st.rotation.y = -s * Math.PI / 2; st.position.set(s * (W / 2 - 0.005), y, 0); g.add(st);
  }));

  const gridMat = new THREE.MeshBasicMaterial({ color: 0x0c1a2c, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  for (let i = -3; i <= 3; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.015, D * 0.9), gridMat); l.rotation.x = -Math.PI / 2; l.position.set(i * 0.7, -H / 2 + 0.005, 0); g.add(l); }

  const holoMat = new THREE.MeshBasicMaterial({ color: 0x1a6aaa, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.7), holoMat);
  holo.position.set(0, 0.25, -0.8); holo.name = 'HoloPanel'; g.add(holo);

  const bPts = [[-1.4, -0.85], [1.4, -0.85], [1.4, 0.85], [-1.4, 0.85]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(bPts), new THREE.LineBasicMaterial({ color: 0xF3AE3E, transparent: true, opacity: 0.4 }));
  border.position.copy(holo.position); border.position.z -= 0.005; g.add(border);

  g.add(Object.assign(new THREE.PointLight(0x1a5a9a, 2.5, 12), { position: new THREE.Vector3(0, H / 2 - 0.3, 0) }));
  g.add(Object.assign(new THREE.PointLight(0xF3AE3E, 0.7, 6), { position: new THREE.Vector3(0, 0.25, -0.8) }));

  const consoleGeo = new THREE.BoxGeometry(W * 0.7, 0.08, 0.6);
  const consoleMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.9, roughness: 0.15, emissive: new THREE.Color(0x0a1525), emissiveIntensity: 0.2 });
  const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
  consoleMesh.position.set(0, -0.5, -D / 2 + 0.8); g.add(consoleMesh);

  const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 8; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), dotMat.clone());
    dot.material.color.setHex([0x00ff88, 0xff4444, 0x44aaff, 0xF3AE3E][i % 4]);
    dot.position.set(-1.2 + i * 0.35, -0.44, -D / 2 + 0.8);
    g.add(dot);
  }

  return { group: g, DEPTH: D, WIDTH: W, HEIGHT: H };
}

// ==================== COMPONENT ====================
export default function SolarSystemPhotorealistic() {
  const containerRef = useRef(null);
  const refs = useRef({
    scene: null, renderer: null, camera: null, controls: null, composer: null,
    clock: new THREE.Clock(), planets: {}, satellites: [], moons: [], sunLayers: {},
    angles: {}, frameId: null, sunMat: null, coronaMat: null, elapsed: 0,
    auroras: [], focusTweens: null, isAnimatingFocus: false, solarGroup: null, outlinePass: null,
    userInteracting: false, initialZoomDone: false, focusTarget: null, hoverMesh: null,
    introStarted: false, auroraPanelShown: false, aurora7: null,
    auroraEngineGlow: null, auroraEngineHalo: null, auroraTrail: [], auroraFallbackBody: null
  });

  const { objects, setSelectedObject, setAuroraPanelOpen, setSceneReady, setIntroPhase, setIntroSubtitle, setTriggerExplore, timeSpeed, isPaused, viewMode, showCrossSectionSun, cameraPreset } = useSolarSystemStore();
  refs.current.latestObjects = objects;
  refs.current.latestSetSelectedObject = setSelectedObject;
  refs.current.latestSetAuroraPanelOpen = setAuroraPanelOpen;

  // ===== INIT SCENE =====
  useEffect(() => {
    if (!containerRef.current) return;
    const R = refs.current;
    // Reset mutable refs for re-init
    R.planets = {}; R.satellites = []; R.moons = []; R.sunLayers = {}; R.angles = {}; R.elapsed = 0; R.auroras = [];
    R.focusTweens = null; R.isAnimatingFocus = false; R.solarGroup = null; R.dustLayer = null; R.outlinePass = null; R.userInteracting = false; R.initialZoomDone = false;
    R.parkerGroup = null; R.parkerAngle = 0;
    R.aurora7 = null; R.introStarted = false; R.auroraPanelShown = false;
    R.auroraEngineGlow = null; R.auroraEngineHalo = null; R.auroraTrail = []; R.auroraFallbackBody = null;
    R.comets = null;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.environment = buildRealisticEnvMap();
    R.scene = scene;
    const solarGroup = new THREE.Group();
    solarGroup.name = 'SolarSystemRoot';
    scene.add(solarGroup);
    R.solarGroup = solarGroup;

    // Camera — lente mais "cinematográfica": FOV menor, profundidade mais comprimida
    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 2000);
    camera.position.set(0, 60, 140);
    R.camera = camera;

    // Renderer - NASA-grade constraints; alpha: false = fundo opaco preto (evita branco no Netlify)
    const renderer = new THREE.WebGLRenderer({
      antialias: true, powerPreference: 'high-performance',
      logarithmicDepthBuffer: true, stencil: false,
      alpha: false
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.80;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.pointerEvents = 'auto';
    renderer.domElement.style.backgroundColor = '#000000';
    renderer.domElement.style.background = '#000000';
    container.appendChild(renderer.domElement);
    R.renderer = renderer;

    // Luz principal do Sol — preset NASA Eyes (decay suave)
    const sunLight = new THREE.PointLight(0xFFF4E0, 4500, 0, 1.2);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 4;
    solarGroup.add(sunLight);
    // Fill: suficiente para ver a parte de trás dos planetas (não perder no escuro)
    const ambientFill = new THREE.AmbientLight(0x8899bb, 0.15);
    scene.add(ambientFill);
    const hemilight = new THREE.HemisphereLight(0x6688cc, 0x1a1020, 0.28);
    scene.add(hemilight);
    // Rim light — contorno estilo NASA Eyes
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.28);
    rimLight.position.set(-200, 80, -150);
    scene.add(rimLight);
    // Back fill — ilumina a face de trás para não sumir no preto
    const backFill = new THREE.DirectionalLight(0x334466, 0.14);
    backFill.position.set(100, -50, 200);
    scene.add(backFill);

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
    // Bloom — preset NASA Eyes: só o Sol brilha (threshold alto)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.35, 0.5, 0.88);
    composer.addPass(bloomPass);
    composer.addPass(new SMAAPass(w * pr, h * pr));

    // Vignette + color grading suave (look cyan/laranja em S-curve)
    const filmShader = {
      uniforms: {
        tDiffuse: { value: null },
        uVignetteStrength: { value: 0.35 },
        uVignetteFeather: { value: 0.8 },
        uLift: { value: new THREE.Vector3(0.02, 0.03, 0.04) },
        uGamma: { value: 0.95 },
        uGain: { value: new THREE.Vector3(1.08, 1.0, 0.96) } // ligeiro teal nas sombras, laranja nos highlights
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uVignetteStrength;
        uniform float uVignetteFeather;
        uniform vec3 uLift;
        uniform float uGamma;
        uniform vec3 uGain;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          // Vignette radial
          vec2 center = vec2(0.5, 0.5);
          float d = distance(vUv, center);
          float vig = smoothstep(1.0 - uVignetteFeather, 1.0, d);
          float vigFactor = mix(1.0, 1.0 - uVignetteStrength, vig);
          // Lift-Gamma-Gain simples
          vec3 col = c.rgb;
          col = max(col + uLift, 0.0);
          col = pow(col, vec3(uGamma));
          col *= uGain;
          col *= vigFactor;
          gl_FragColor = vec4(col, c.a);
        }
      `
    };
    const filmPass = new ShaderPass(filmShader);
    composer.addPass(filmPass);

    composer.addPass(new OutputPass());
    R.composer = composer;
    R.outlinePass = outlinePass;

    // Controls — órbita mais lenta/suave, sensação de câmera de filme
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.18;
    controls.minDistance = 5;
    controls.maxDistance = 260;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI;
    controls.panSpeed = 0.4;
    controls.rotateSpeed = 0.32;
    controls.zoomSpeed = 1.2;
    R.controls = controls;

    const onControlStart = () => {
      R.userInteracting = true;
      if (R.focusTweens?.length) {
        R.focusTweens.forEach(t => t.kill());
      }
      R.focusTarget = null;
      R.isAnimatingFocus = false;
      R.hoverMesh = null;
    };
    const onControlEnd = () => {
      R.userInteracting = false;
      R.focusTarget = null;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // Texture loader
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    // Fundo: 4 camadas (8K star map + nebulae + star particles + Via Láctea leve)
    R.dustLayer = createSkyboxLayers(scene, loader);
    createStaticConstellations(scene);

    // Build scene — satellites FIRST, then planets
    createSun(solarGroup, loader, R);
    createSatellites(solarGroup, loader, R);
    Object.entries(PLANETS).forEach(([name, cfg]) => createPlanet(solarGroup, loader, name, cfg, R));
    createAsteroids(solarGroup, R);
    createNaturalMoons(R);
    createParkerSolarProbe(solarGroup, R);
    // ===== AURORA 7 — visual final (sem marcadores de debug) =====
    {
      const earthMesh = R.planets['Earth'];
      if (!earthMesh) return;

      const a7Group = new THREE.Group();
      a7Group.name = 'Aurora7';
      a7Group.userData = { clickable: true, name: 'Aurora 7' };
      const a7Label = createLabel('Aurora 7');
      a7Label.position.y = 1.4;
      a7Group.add(a7Label);
      const a7Light = new THREE.PointLight(0xffffff, 1.5, 8);
      a7Group.add(a7Light);

      // Fallback discreto (só aparece se o GLB falhar)
      const fallbackBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.16, 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x9da9b5,
          metalness: 0.72,
          roughness: 0.32,
          emissive: new THREE.Color(0x111111),
          emissiveIntensity: 0.08
        })
      );
      a7Group.add(fallbackBody);
      R.auroraFallbackBody = fallbackBody;

      // Intencionalmente sem glow/trilha laranja para manter a cena limpa.
      R.auroraEngineGlow = null;
      R.auroraEngineHalo = null;
      R.auroraTrail = [];

      // Órbita local em torno da Terra (abaixo da órbita visual da Lua)
      const a7Angle = 2.5;
      const a7Orbit = 3.8;
      const a7YOffset = -0.6;
      a7Group.position.set(Math.cos(a7Angle) * a7Orbit, a7YOffset, Math.sin(a7Angle) * a7Orbit);
      earthMesh.add(a7Group);

      R.aurora7 = a7Group;
      if (!R.moons) R.moons = [];
      R.moons.push({ mesh: a7Group, angle: a7Angle, orbitRadius: a7Orbit, yOffset: a7YOffset, bobAmp: 0.08, speed: 0.25 });

      // ===== CINEMATIC INTRO — camera flies to Sun, then into Aurora 7 cockpit =====
      if (!R.introStarted) {
        R.introStarted = true;
        R.initialZoomDone = true;
        controls.enabled = false;
        R.introActive = true;
        R.introLookAt = new THREE.Vector3(0, 0, 0);

        const earthPos = new THREE.Vector3();
        R.planets['Earth'].getWorldPosition(earthPos);
        const dirToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthPos).normalize();
        const cockpitPos = earthPos.clone().add(dirToSun.clone().multiplyScalar(4.5));
        cockpitPos.y = 0.2;

        const { group: cockpit, DEPTH: cpD } = buildIntroCockpit();
        cockpit.position.copy(cockpitPos);
        cockpit.lookAt(0, 0, 0);
        cockpit.updateMatrixWorld(true);
        solarGroup.add(cockpit);
        R.cockpitGroup = cockpit;

        const toW = (v) => v.clone().applyMatrix4(cockpit.matrixWorld);
        const seatW = toW(new THREE.Vector3(0, 0.25, cpD * 0.3));
        const panelW = toW(new THREE.Vector3(0, 0.25, -cpD * 0.2));
        const entW  = toW(new THREE.Vector3(0, 0.6, -cpD / 2 - 6));
        const midW  = toW(new THREE.Vector3(0, 0.4, -cpD / 2 - 1.5));

        camera.position.set(0, 120, 300);
        camera.lookAt(0, 0, 0);

        const tl = gsap.timeline({ paused: true });
        tl.to(camera.position, { x: 0, y: 4, z: 16, duration: 4, ease: 'power2.inOut' });
        tl.call(() => setIntroSubtitle('B4 GROUP'), [], '+=0.2');
        tl.to(camera.position, { x: 6, y: 3, z: 14, duration: 2.2, ease: 'sine.inOut' });
        tl.call(() => setIntroSubtitle(''), [], '+=0');
        tl.to(camera.position, { x: entW.x, y: entW.y, z: entW.z, duration: 4.5, ease: 'power2.inOut' });
        tl.to(R.introLookAt, { x: cockpitPos.x, y: cockpitPos.y, z: cockpitPos.z, duration: 4.5, ease: 'power2.inOut' }, '<');
        tl.call(() => setIntroSubtitle('Aurora 7 — Nave B4 ERD-FX'), [], '-=3.5');
        tl.to(camera.position, { x: midW.x, y: midW.y, z: midW.z, duration: 1.8, ease: 'power2.inOut' });
        tl.to(R.introLookAt, { x: panelW.x, y: panelW.y, z: panelW.z, duration: 1.8, ease: 'power2.inOut' }, '<');
        tl.call(() => setIntroSubtitle(''));
        tl.to(camera.position, { x: seatW.x, y: seatW.y, z: seatW.z, duration: 2, ease: 'power2.out' });
        tl.call(() => setIntroPhase('cockpit'));

        R.introTimeline = tl;

        const exitOverview = new THREE.Vector3(0, 35, 85);
        R.triggerExit = () => {
          setIntroPhase('exiting');
          const ex = gsap.timeline();
          ex.to(camera.position, { x: entW.x, y: entW.y + 8, z: entW.z, duration: 2, ease: 'power2.inOut' });
          ex.to(R.introLookAt, { x: 0, y: 0, z: 0, duration: 2, ease: 'power2.inOut' }, '<');
          ex.to(camera.position, { x: exitOverview.x, y: exitOverview.y, z: exitOverview.z, duration: 3, ease: 'power2.inOut' });
          ex.call(() => {
            controls.target.set(0, 0, 0);
            controls.enabled = true;
            R.introActive = false;
            cockpit.visible = false;
            setIntroPhase('free');
          });
        };
        setTriggerExplore(R.triggerExit);
      }

      // Carrega modelo GLB da Aurora (visual original)
      const a7DracoLoader = new DRACOLoader();
      a7DracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      const a7Loader = new GLTFLoader();
      a7Loader.setDRACOLoader(a7DracoLoader);
      a7Loader.load(
        AURORA_7_GLB_ALT,
        (gltf) => {
          const model = gltf.scene;
          let meshCount = 0;
          model.traverse(n => { if (n.isMesh) meshCount++; });
          if (meshCount === 0) return;

          const b = new THREE.Box3().setFromObject(model);
          const md = Math.max(...b.getSize(new THREE.Vector3()).toArray()) || 1;
          model.position.sub(b.getCenter(new THREE.Vector3()));
          model.scale.setScalar(1.0 / md);

          model.traverse(n => {
            if (!n.isMesh) return;
            n.userData = { clickable: true, name: 'Aurora 7', moduleName: 'Nave B4 ERD-FX' };
            n.castShadow = true;
            n.receiveShadow = true;
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((mat, i) => {
              if (!mat) return;
              if (mat.isMeshStandardMaterial) {
                mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, 0.15);
                mat.needsUpdate = true;
                return;
              }
              const converted = new THREE.MeshStandardMaterial({
                map: mat.map || null,
                color: mat.map ? 0xffffff : 0xd8dde0,
                metalness: 0.65,
                roughness: 0.28,
                emissive: new THREE.Color(0x141414),
                emissiveIntensity: 0.12
              });
              if (Array.isArray(n.material)) n.material[i] = converted; else n.material = converted;
            });
          });

          a7Group.add(model);
          if (R.auroraFallbackBody) R.auroraFallbackBody.visible = false;
        },
        undefined,
        (err) => { console.error('Aurora 7 load error:', err); }
      );
    }

    // Raycaster — hover: só outline + pointer (não move câmera); clique: popup + approachObject
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();

    const getCollisionBodies = () => {
      const bodies = [{ center: new THREE.Vector3(0, 0, 0), radius: 6.5 }];
      Object.entries(PLANETS).forEach(([name, cfg]) => {
        const mesh = R.planets[name];
        if (mesh) {
          const center = new THREE.Vector3();
          mesh.getWorldPosition(center);
          bodies.push({ center, radius: cfg.size * 1.3 });
        }
      });
      return bodies;
    };

    const pushCameraOutOfBodies = () => {
      const bodies = getCollisionBodies();
      const camPos = camera.position.clone();
      for (const { center, radius } of bodies) {
        const d = camPos.distanceTo(center);
        if (d < radius) {
          const dir = camPos.clone().sub(center).normalize();
          camPos.copy(center).add(dir.multiplyScalar(radius));
          camera.position.copy(camPos);
        }
      }
    };

    const approachObject = (object) => {
      if (!object) return;
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      const distance = Math.max(size * 2.5, 6);
      const dir = camera.position.clone().sub(center).normalize();
      let camEnd = center.clone().add(dir.multiplyScalar(distance));
      const minY = center.y + size * 0.3;
      if (camEnd.y < minY) camEnd.y = minY;
      const bodies = getCollisionBodies();
      for (const { center: c, radius } of bodies) {
        if (c.distanceTo(center) < 0.1) continue;
        const toCam = camEnd.clone().sub(c).normalize();
        const d = camEnd.distanceTo(c);
        if (d < radius) {
          camEnd.copy(c).add(toCam.multiplyScalar(radius));
        }
      }

      if (R.focusTweens?.length) {
        R.focusTweens.forEach(t => t.kill());
      }
      R.isAnimatingFocus = true;
      R.hoverMesh = null;

      const camTween = gsap.to(camera.position, {
        x: camEnd.x,
        y: camEnd.y,
        z: camEnd.z,
        duration: 1.8,
        ease: 'power2.out',
        onComplete: () => {
          R.isAnimatingFocus = false;
          R.hoverMesh = null;
          R.focusTweens = null;
        }
      });
      const targetTween = gsap.to(controls.target, {
        x: center.x,
        y: center.y,
        z: center.z,
        duration: 1.8,
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
      R.hoverMesh = null;
      R.focusTweens = null;
    };

    let intersected = null;

    const onClick = (e) => {
      if (!intersected) {
        clearFocus();
        return;
      }
      const list = R.latestObjects || [];
      const obj = list.find(o => o.name === intersected.userData.name);
      if (obj && R.latestSetSelectedObject) R.latestSetSelectedObject(obj);
      approachObject(intersected);
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
          R.hoverMesh = intersected;
          break;
        }
      }
      if (!intersected) R.hoverMesh = null;
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
      renderer.setClearColor(0x000000, 1);
      renderer.domElement.style.backgroundColor = '#000000';
    };
    window.addEventListener('resize', onResize);

    // Render loop
    let firstFrameFired = false;
    const animate = () => {
      R.frameId = requestAnimationFrame(animate);
      const delta = R.clock.getDelta();
      R.elapsed += delta;
      if (!firstFrameFired) {
        firstFrameFired = true;
        setSceneReady(true);
        if (R.introTimeline) { setIntroPhase('cinematic'); R.introTimeline.play(); }
      }
      if (R.introActive && R.introLookAt) camera.lookAt(R.introLookAt);
      controls.update();
      if (R.solarGroup && !R.introActive) {
        R.solarGroup.rotation.y += delta * GLOBAL_ROTATION_SPEED;
      }
      if (R.dustLayer) {
        R.dustLayer.rotation.y += delta * 0.002;
        R.dustLayer.rotation.x += delta * 0.0006;
      }
      if (R.sunMat) R.sunMat.uniforms.uTime.value = R.elapsed;
      if (R.coronaMat) R.coronaMat.uniforms.uTime.value = R.elapsed;
      if (R.auroras?.length) {
        updateAuroras(R.auroras, delta);
        // Aurora boreal na Terra: visível 60s a cada 7 minutos (420s)
        const auroraCycle = 420;
        const auroraVisibleDuration = 60;
        R.auroras.forEach((a) => {
          if (a.name === 'EarthAurora') {
            const t = R.elapsed % auroraCycle;
            a.visible = t < auroraVisibleDuration;
          }
        });
      }
      if (R.sunLayers.photosphere) R.sunLayers.photosphere.rotation.y += 0.001;
      // Logo + ERD-FX: breathing (pulsação suave) 0.85 + 0.15*sin(elapsed*0.8)
      const logoPulse = 0.85 + 0.15 * Math.sin(R.elapsed * 0.8);
      if (R.sunLayers.logoPlane) R.sunLayers.logoPlane.material.opacity = logoPulse;
      if (R.sunLayers.fxSprite) R.sunLayers.fxSprite.material.opacity = logoPulse;
      // Hover: desabilitado para não travar navegação do usuário

      pushCameraOutOfBodies();
      // Garantir fundo preto a cada frame (evita branco no Netlify/cache)
      renderer.setClearColor(0x000000, 1);
      if (scene.background) scene.background.setHex(0x000000);
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
      if (scene) {
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((m) => {
              if (m.map) m.map.dispose();
              if (m.lightMap) m.lightMap.dispose();
              if (m.bumpMap) m.bumpMap.dispose();
              if (m.normalMap) m.normalMap.dispose();
              if (m.roughnessMap) m.roughnessMap.dispose();
              if (m.metalnessMap) m.metalnessMap.dispose();
              if (m.envMap) m.envMap.dispose();
              if (m.uniforms) {
                Object.keys(m.uniforms).forEach((k) => {
                  const v = m.uniforms[k]?.value;
                  if (v && v.isTexture) v.dispose();
                });
              }
              m.dispose();
            });
          }
        });
      }
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once on mount
  }, []);

  // ===== ANIMATION (planets, satellites, asteroids) =====
  useEffect(() => {
    const R = refs.current;
    if (!R.scene) return;
    let lastTime = performance.now(), animId;
    const update = () => {
      animId = requestAnimationFrame(update);
      if (isPaused) return;
      const now = performance.now();
      if (R.introActive) { lastTime = now; return; }
      const dt = (now - lastTime) / 1000;
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
      if (R.moons && R.moons.length) {
        R.moons.forEach(m => {
          m.angle += m.speed * timeSpeed * dt;
          m.mesh.position.set(
            Math.cos(m.angle) * m.orbitRadius,
            (m.yOffset || 0) + (m.bobAmp ? Math.sin(m.angle * 8) * m.bobAmp : 0),
            Math.sin(m.angle) * m.orbitRadius
          );
        });
      }
      if (R.planets['EarthClouds']) R.planets['EarthClouds'].rotation.y += 0.001 * timeSpeed * dt;
      R.satellites.forEach(s => {
        s.angle += 0.03 * timeSpeed * dt;
        s.mesh.position.x = Math.cos(s.angle) * s.orbitRadius;
        s.mesh.position.z = Math.sin(s.angle) * s.orbitRadius;
        s.mesh.rotation.y += 0.02 * timeSpeed * dt;
      });
      // Aurora "emergent": glow pulsante + trail de fogo
      if (R.auroraEngineGlow) {
        const t = performance.now() * 0.001;
        const pulse = 0.5 + 0.5 * Math.sin(t * 12);
        R.auroraEngineGlow.scale.setScalar(0.9 + pulse * 0.9);
        if (R.auroraEngineGlow.material) R.auroraEngineGlow.material.opacity = 0.55 + pulse * 0.45;
        if (R.auroraEngineHalo) {
          R.auroraEngineHalo.scale.setScalar(1.0 + pulse * 1.6);
          R.auroraEngineHalo.material.opacity = 0.12 + pulse * 0.22;
        }
        if (R.auroraTrail && R.auroraTrail.length) {
          R.auroraTrail.forEach((p, i) => {
            const ph = t * 15 - i * 0.55;
            const flick = Math.max(0, Math.sin(ph));
            p.material.opacity = 0.05 + flick * 0.55;
            p.scale.setScalar(0.55 + flick * 0.95);
            p.position.x = (Math.sin(ph * 0.7) * 0.08) * (1 + i * 0.02);
            p.position.y = (Math.cos(ph * 0.8) * 0.06) * (1 + i * 0.02);
            p.position.z = -0.9 - i * 0.22 - flick * 0.18;
          });
        }
      }
      if (R.parkerGroup) {
        R.parkerAngle += PARKER_SPEED * timeSpeed * dt;
        R.parkerGroup.position.x = Math.cos(R.parkerAngle) * PARKER_ORBIT_RADIUS;
        R.parkerGroup.position.z = Math.sin(R.parkerAngle) * PARKER_ORBIT_RADIUS;
        R.parkerGroup.rotation.y += 0.01 * timeSpeed * dt;
      }
      if (R.planets['AsteroidBelt']) R.planets['AsteroidBelt'].rotation.y += 0.0002 * timeSpeed * dt;
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [isPaused, timeSpeed]);

  // ===== CROSS-SECTION SUN ===== (camadas internas: núcleo 0.15, convectiva 0.32, radiativa 0.52)
  useEffect(() => {
    const L = refs.current.sunLayers;
    if (!L.photosphere) return;
    if (showCrossSectionSun) {
      L.photosphere.geometry.dispose();
      L.photosphere.geometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 64, 0, Math.PI * 1.5);
      ['core', 'radiative', 'convective'].forEach(k => {
        if (L[k]) {
          L[k].visible = true;
          L[k].geometry.dispose();
          const r = k === 'core' ? SUN_RADIUS * 0.15 : k === 'radiative' ? SUN_RADIUS * 0.52 : SUN_RADIUS * 0.32;
          L[k].geometry = new THREE.SphereGeometry(r, 48, 48, 0, Math.PI * 1.5);
        }
      });
      if (L.coreGroup) L.coreGroup.visible = true;
    } else {
      L.photosphere.geometry.dispose();
      L.photosphere.geometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
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
      'Aurora Focus': { pos: [0, 10, PLANETS.Earth.orbit + 20], target: [0, 0, PLANETS.Earth.orbit + 10] },
      'Satellite Ring': { pos: [18, 8, 18], target: [12, 0, 0] },
      // Vista de cima: mais afastada para caber o sistema inteiro (órbitas 2x)
      'Top View': { pos: [0, 260, 1], target: [0, 0, 0] },
      'Olho de Deus': { pos: [0, 180, 0.01], target: [0, 0, 0] }
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
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000000' }}>
      {/* Camada preta atrás do canvas — garante fundo preto mesmo se WebGL atrasar ou falhar */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000000',
          zIndex: 0
        }}
      />
      <div
        ref={containerRef}
        data-testid="solar-system-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1,
          background: '#000000',
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
      />
    </div>
  );
}
