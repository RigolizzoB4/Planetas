// Texture URLs — 8K when available (estilo "papel de parede" NASA / Solar System Scope).
// Fontes: Solar System Scope (baseado em dados NASA/ESA), NASA 3D Resources, ESA.
// https://www.solarsystemscope.com/textures/ | https://nasa3d.arc.nasa.gov/

const SSS = 'https://www.solarsystemscope.com/textures/download/';

export const TEXTURE_SOURCES = {
  Sun: {
    diffuse: `${SSS}8k_sun.jpg`,
    fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/1024px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg'
  },
  Mercury: {
    diffuse: `${SSS}8k_mercury.jpg`,
    fallback: `${SSS}2k_mercury.jpg`
  },
  Venus: {
    diffuse: `${SSS}8k_venus_surface.jpg`,
    fallback: `${SSS}2k_venus_surface.jpg`
  },
  Earth: {
    diffuse: `${SSS}8k_earth_daymap.jpg`,
    clouds: `${SSS}8k_earth_clouds.jpg`,
    night: `${SSS}8k_earth_nightmap.jpg`,
    fallback: `${SSS}2k_earth_daymap.jpg`
  },
  Mars: {
    diffuse: `${SSS}8k_mars.jpg`,
    fallback: `${SSS}2k_mars.jpg`
  },
  Jupiter: {
    diffuse: `${SSS}8k_jupiter.jpg`,
    fallback: `${SSS}2k_jupiter.jpg`
  },
  Saturn: {
    diffuse: `${SSS}8k_saturn.jpg`,
    ring: `${SSS}8k_saturn_ring_alpha.png`,
    fallback: `${SSS}2k_saturn.jpg`
  },
  Uranus: {
    diffuse: `${SSS}8k_uranus.jpg`,
    fallback: `${SSS}2k_uranus.jpg`
  },
  Neptune: {
    diffuse: `${SSS}8k_neptune.jpg`,
    fallback: `${SSS}2k_neptune.jpg`
  },
  Moon: {
    diffuse: `${SSS}8k_moon.jpg`,
    fallback: `${SSS}2k_moon.jpg`
  },
  Stars: {
    milkyway: `${SSS}2k_stars_milky_way.jpg`,
    fallback: `${SSS}2k_stars.jpg`
  }
};

// Quality presets for different devices
export const QUALITY_PRESETS = {
  low: {
    name: 'Low (Mobile)',
    textureSize: '1k',
    sphereSegments: 16,
    asteroidCount: 50,
    starCount: 500,
    shadowsEnabled: false,
    antialias: false,
    pixelRatio: 1
  },
  medium: {
    name: 'Medium (Tablet)',
    textureSize: '2k',
    sphereSegments: 32,
    asteroidCount: 150,
    starCount: 1500,
    shadowsEnabled: false,
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5)
  },
  high: {
    name: 'High (Desktop)',
    textureSize: '2k',
    sphereSegments: 64,
    asteroidCount: 300,
    starCount: 3000,
    shadowsEnabled: true,
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  },
  ultra: {
    name: 'Ultra (High-end)',
    textureSize: '8k',
    sphereSegments: 128,
    asteroidCount: 500,
    starCount: 5000,
    shadowsEnabled: true,
    antialias: true,
    pixelRatio: window.devicePixelRatio
  }
};

// Auto-detect quality based on device
export function detectQualityPreset() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Android/i.test(navigator.userAgent) && !isMobile;
  const memory = navigator.deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;
  
  if (isMobile || memory < 4 || cores < 4) {
    return 'low';
  } else if (isTablet || memory < 8 || cores < 8) {
    return 'medium';
  } else if (memory >= 16 && cores >= 8) {
    return 'ultra';
  }
  return 'high';
}

// LOD (Level of Detail) distances
export const LOD_DISTANCES = {
  high: 0,      // Full detail when close
  medium: 50,   // Medium detail
  low: 100,     // Low detail when far
  billboard: 200 // Just a point when very far
};

// Planet physical data (for realistic scaling if needed)
export const PLANET_PHYSICAL_DATA = {
  Sun: { radius: 696340, distanceFromSun: 0, orbitalPeriod: 0, rotationPeriod: 25.4 },
  Mercury: { radius: 2439.7, distanceFromSun: 57.9, orbitalPeriod: 88, rotationPeriod: 58.6 },
  Venus: { radius: 6051.8, distanceFromSun: 108.2, orbitalPeriod: 225, rotationPeriod: -243 },
  Earth: { radius: 6371, distanceFromSun: 149.6, orbitalPeriod: 365.25, rotationPeriod: 1 },
  Mars: { radius: 3389.5, distanceFromSun: 227.9, orbitalPeriod: 687, rotationPeriod: 1.03 },
  Jupiter: { radius: 69911, distanceFromSun: 778.5, orbitalPeriod: 4333, rotationPeriod: 0.41 },
  Saturn: { radius: 58232, distanceFromSun: 1434, orbitalPeriod: 10759, rotationPeriod: 0.45 },
  Uranus: { radius: 25362, distanceFromSun: 2871, orbitalPeriod: 30687, rotationPeriod: -0.72 },
  Neptune: { radius: 24622, distanceFromSun: 4495, orbitalPeriod: 60190, rotationPeriod: 0.67 }
};
