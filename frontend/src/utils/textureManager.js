import * as THREE from 'three';
import { TEXTURE_SOURCES, QUALITY_PRESETS, detectQualityPreset } from '../config/solarSystemConfig';

class TextureManager {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.loadingPromises = new Map();
    this.quality = detectQualityPreset();
  }

  setQuality(quality) {
    this.quality = quality;
  }

  getTextureUrl(planetName, type = 'diffuse') {
    const sources = TEXTURE_SOURCES[planetName];
    if (!sources) return null;
    
    // Adjust URL based on quality preset
    let url = sources[type] || sources.diffuse;
    if (url && this.quality === 'low') {
      url = url.replace('/2k_', '/1k_').replace('/8k_', '/2k_');
    }
    
    return url;
  }

  async loadTexture(planetName, type = 'diffuse') {
    const cacheKey = `${planetName}_${type}_${this.quality}`;
    
    // Return cached texture if available
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey);
    }
    
    // Return existing promise if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }
    
    const url = this.getTextureUrl(planetName, type);
    if (!url) return null;
    
    const loadPromise = new Promise((resolve) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          this.textureCache.set(cacheKey, texture);
          this.loadingPromises.delete(cacheKey);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture for ${planetName}, trying fallback...`, error);
          // Try fallback
          const fallbackUrl = TEXTURE_SOURCES[planetName]?.fallback;
          if (fallbackUrl) {
            this.loader.load(
              fallbackUrl,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.textureCache.set(cacheKey, texture);
                this.loadingPromises.delete(cacheKey);
                resolve(texture);
              },
              undefined,
              () => {
                console.error(`Fallback texture also failed for ${planetName}`);
                this.loadingPromises.delete(cacheKey);
                resolve(null);
              }
            );
          } else {
            this.loadingPromises.delete(cacheKey);
            resolve(null);
          }
        }
      );
    });
    
    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  async preloadAllTextures(onProgress) {
    const planets = Object.keys(TEXTURE_SOURCES);
    const total = planets.length;
    let loaded = 0;
    
    const promises = planets.map(async (planet) => {
      await this.loadTexture(planet, 'diffuse');
      loaded++;
      if (onProgress) onProgress(loaded / total);
    });
    
    await Promise.all(promises);
  }

  disposeTexture(planetName, type = 'diffuse') {
    const cacheKey = `${planetName}_${type}_${this.quality}`;
    const texture = this.textureCache.get(cacheKey);
    if (texture) {
      texture.dispose();
      this.textureCache.delete(cacheKey);
    }
  }

  disposeAll() {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}

// Singleton instance
export const textureManager = new TextureManager();

// LOD Helper - creates meshes with different detail levels
export function createLODPlanet(name, baseRadius, segments, material) {
  const lod = new THREE.LOD();
  
  // High detail
  const highGeom = new THREE.SphereGeometry(baseRadius, segments, segments);
  const highMesh = new THREE.Mesh(highGeom, material);
  lod.addLevel(highMesh, 0);
  
  // Medium detail
  const medGeom = new THREE.SphereGeometry(baseRadius, Math.floor(segments / 2), Math.floor(segments / 2));
  const medMesh = new THREE.Mesh(medGeom, material);
  lod.addLevel(medMesh, 50);
  
  // Low detail
  const lowGeom = new THREE.SphereGeometry(baseRadius, Math.floor(segments / 4), Math.floor(segments / 4));
  const lowMesh = new THREE.Mesh(lowGeom, material);
  lod.addLevel(lowMesh, 100);
  
  lod.name = name;
  return lod;
}

// Instanced Asteroid Belt for GPU efficiency
export function createInstancedAsteroidBelt(count, innerRadius, outerRadius, height) {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.9,
    metalness: 0.1
  });
  
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'AsteroidBelt';
  
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const y = (Math.random() - 0.5) * height;
    const scale = 0.05 + Math.random() * 0.15;
    
    dummy.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    
    mesh.setMatrixAt(i, dummy.matrix);
    
    // Slight color variation
    const colorVariation = 0.8 + Math.random() * 0.4;
    color.setRGB(0.55 * colorVariation, 0.45 * colorVariation, 0.33 * colorVariation);
    mesh.setColorAt(i, color);
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  
  return mesh;
}

// Progressive texture loading indicator
export function createLoadingRing(radius) {
  const geometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x4FC3F7,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  return ring;
}
