import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useSolarSystemStore } from '../../store/solarSystemStore';
import { textureManager, createInstancedAsteroidBelt } from '../../utils/textureManager';
import { QUALITY_PRESETS, detectQualityPreset } from '../../config/solarSystemConfig';

// Planet data with orbital parameters
const PLANET_DATA = {
  Mercury: { color: 0xB5A7A7, size: 0.4, orbitRadius: 8, orbitSpeed: 0.02 },
  Venus: { color: 0xE6C87A, size: 0.9, orbitRadius: 12, orbitSpeed: 0.015 },
  Earth: { color: 0x6B93D6, size: 1.0, orbitRadius: 16, orbitSpeed: 0.01 },
  Mars: { color: 0xC1440E, size: 0.5, orbitRadius: 22, orbitSpeed: 0.008 },
  Jupiter: { color: 0xD8CA9D, size: 2.5, orbitRadius: 35, orbitSpeed: 0.004 },
  Saturn: { color: 0xF4D59E, size: 2.0, orbitRadius: 50, orbitSpeed: 0.003, hasRings: true },
  Uranus: { color: 0xD1E7E7, size: 1.5, orbitRadius: 65, orbitSpeed: 0.002 },
  Neptune: { color: 0x5B5DDF, size: 1.4, orbitRadius: 80, orbitSpeed: 0.001 }
};

// Get quality preset
const qualityPreset = QUALITY_PRESETS[detectQualityPreset()];

export default function SolarSystem() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const planetsRef = useRef({});
  const satellitesRef = useRef([]);
  const asteroidBeltRef = useRef(null);
  const anglesRef = useRef({});
  const animationRef = useRef(null);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  
  const { 
    objects,
    selectedObject, 
    setSelectedObject, 
    timeSpeed,
    isPaused,
    viewMode,
    showCrossSectionSun,
    cameraPreset
  } = useSolarSystemStore();

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 50, 100);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // Stars
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const radius = 150 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Sun Group (for cross-section support)
    const sunGroup = new THREE.Group();
    sunGroup.name = 'SunGroup';
    scene.add(sunGroup);
    
    // Sun outer layer (photosphere)
    const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFDB813,
      emissive: 0xFF6B00,
      emissiveIntensity: 1.5
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.name = 'Sun';
    sunGroup.add(sun);
    planetsRef.current['Sun'] = sun;
    planetsRef.current['SunGroup'] = sunGroup;

    // Sun inner layers (for cross-section view)
    // Core
    const coreGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFF00,
      emissive: 0xFFFF00,
      emissiveIntensity: 2
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'SunCore';
    core.visible = false;
    sunGroup.add(core);
    planetsRef.current['SunCore'] = core;
    
    // Radiative zone
    const radiativeGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const radiativeMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const radiative = new THREE.Mesh(radiativeGeometry, radiativeMaterial);
    radiative.name = 'SunRadiative';
    radiative.visible = false;
    sunGroup.add(radiative);
    planetsRef.current['SunRadiative'] = radiative;
    
    // Convective zone
    const convectiveGeometry = new THREE.SphereGeometry(4, 32, 32);
    const convectiveMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFA500,
      emissive: 0xFFA500,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.6
    });
    const convective = new THREE.Mesh(convectiveGeometry, convectiveMaterial);
    convective.name = 'SunConvective';
    convective.visible = false;
    sunGroup.add(convective);
    planetsRef.current['SunConvective'] = convective;

    // Sun glow
    const coronaGeometry = new THREE.SphereGeometry(6, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFAA00,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);

    // Sun light
    const sunLight = new THREE.PointLight(0xFFF5E0, 2, 200);
    scene.add(sunLight);

    // Planets
    Object.entries(PLANET_DATA).forEach(([name, data]) => {
      // Orbit ring
      const orbitPoints = [];
      for (let i = 0; i <= 128; i++) {
        const angle = (i / 128) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(
          Math.cos(angle) * data.orbitRadius,
          0,
          Math.sin(angle) * data.orbitRadius
        ));
      }
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);

      // Planet
      const planetGeometry = new THREE.SphereGeometry(data.size, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8 });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.name = name;
      
      // Random starting position
      anglesRef.current[name] = Math.random() * Math.PI * 2;
      planet.position.x = Math.cos(anglesRef.current[name]) * data.orbitRadius;
      planet.position.z = Math.sin(anglesRef.current[name]) * data.orbitRadius;
      
      scene.add(planet);
      planetsRef.current[name] = planet;

      // Saturn's rings
      if (data.hasRings) {
        const ringGeometry = new THREE.RingGeometry(data.size * 1.4, data.size * 2.2, 64);
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: 0xD4AF37,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 3;
        planet.add(ring);
      }
    });

    // Dotted ring for satellites (between Mercury and Venus)
    const dottedRingRadius = 10;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const dotGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x4FC3F7, transparent: true, opacity: 0.6 });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(
        Math.cos(angle) * dottedRingRadius,
        0,
        Math.sin(angle) * dottedRingRadius
      );
      scene.add(dot);
    }

    // Satellites (8 on dotted ring)
    for (let i = 0; i < 8; i++) {
      const baseAngle = (i * 45) * (Math.PI / 180);
      const satGeometry = new THREE.OctahedronGeometry(0.12, 0);
      const satMaterial = new THREE.MeshStandardMaterial({
        color: 0x4FC3F7,
        emissive: 0x0288D1,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2
      });
      const satellite = new THREE.Mesh(satGeometry, satMaterial);
      satellite.name = `Satellite_${i + 1}`;
      satellite.position.set(
        Math.cos(baseAngle) * dottedRingRadius,
        0,
        Math.sin(baseAngle) * dottedRingRadius
      );
      scene.add(satellite);
      satellitesRef.current.push({ mesh: satellite, angle: baseAngle });
    }

    // Asteroid belt (GPU Instanced for performance)
    const asteroidCount = qualityPreset.asteroidCount;
    const asteroidBelt = createInstancedAsteroidBelt(asteroidCount, 26, 32, 3);
    scene.add(asteroidBelt);
    asteroidBeltRef.current = asteroidBelt;

    // Load textures progressively
    const loadTextures = async () => {
      const textureLoader = new THREE.TextureLoader();
      
      // Load planet textures
      for (const [name, planet] of Object.entries(planetsRef.current)) {
        if (name === 'Sun' || name.startsWith('Sun')) continue;
        if (!planet || !planet.material) continue;
        
        try {
          const texture = await textureManager.loadTexture(name);
          if (texture && planet.material) {
            planet.material.map = texture;
            planet.material.needsUpdate = true;
          }
        } catch (e) {
          console.log(`Using fallback color for ${name}`);
        }
      }
      
      setTexturesLoaded(true);
    };
    
    loadTextures();

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      controls.update();
      
      // Rotate sun
      if (planetsRef.current['Sun']) {
        planetsRef.current['Sun'].rotation.y += 0.001;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        if (clickedObject.name) {
          const objectData = objects.find(obj => obj.name === clickedObject.name);
          if (objectData) {
            setSelectedObject(objectData);
          }
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [objects, setSelectedObject]);

  // Update animation based on store state
  useEffect(() => {
    if (!sceneRef.current || !planetsRef.current) return;
    
    let lastTime = Date.now();
    
    const updateAnimation = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(updateAnimation);
        return;
      }
      
      const currentTime = Date.now();
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      // Update planets
      Object.entries(PLANET_DATA).forEach(([name, data]) => {
        const planet = planetsRef.current[name];
        if (planet) {
          anglesRef.current[name] += data.orbitSpeed * timeSpeed * delta * 10;
          planet.position.x = Math.cos(anglesRef.current[name]) * data.orbitRadius;
          planet.position.z = Math.sin(anglesRef.current[name]) * data.orbitRadius;
          planet.rotation.y += 0.01 * timeSpeed * delta;
        }
      });
      
      // Update satellites
      satellitesRef.current.forEach((sat, i) => {
        sat.angle += 0.025 * timeSpeed * delta * 10;
        sat.mesh.position.x = Math.cos(sat.angle) * 10;
        sat.mesh.position.z = Math.sin(sat.angle) * 10;
        sat.mesh.rotation.y += 0.02 * timeSpeed * delta;
      });
      
      // Update asteroid belt
      if (asteroidBeltRef.current) {
        asteroidBeltRef.current.rotation.y += 0.0005 * timeSpeed * delta * 10;
      }
      
      animationRef.current = requestAnimationFrame(updateAnimation);
    };
    
    updateAnimation();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, timeSpeed]);

  // Handle cross-section toggle
  useEffect(() => {
    if (!planetsRef.current) return;
    
    const sun = planetsRef.current['Sun'];
    const core = planetsRef.current['SunCore'];
    const radiative = planetsRef.current['SunRadiative'];
    const convective = planetsRef.current['SunConvective'];
    
    if (sun && core && radiative && convective) {
      if (showCrossSectionSun) {
        // Show cross-section: modify sun geometry
        sun.geometry = new THREE.SphereGeometry(5, 64, 64, 0, Math.PI * 1.5);
        core.geometry = new THREE.SphereGeometry(1.5, 32, 32, 0, Math.PI * 1.5);
        radiative.geometry = new THREE.SphereGeometry(2.5, 32, 32, 0, Math.PI * 1.5);
        convective.geometry = new THREE.SphereGeometry(4, 32, 32, 0, Math.PI * 1.5);
        
        core.visible = true;
        radiative.visible = true;
        convective.visible = true;
      } else {
        // Hide cross-section: restore full geometry
        sun.geometry = new THREE.SphereGeometry(5, 64, 64);
        core.visible = false;
        radiative.visible = false;
        convective.visible = false;
      }
    }
  }, [showCrossSectionSun]);

  // Update camera preset
  useEffect(() => {
    if (!cameraRef.current) return;
    
    const presets = {
      'Overview': [0, 50, 100],
      'Sun Focus': [0, 10, 30],
      'Earth Focus': [20, 10, 20],
      'Satellite Ring': [15, 5, 15],
      'Top View': [0, 120, 0.1]
    };
    
    const position = viewMode === '2D' ? [0, 120, 0.1] : (presets[cameraPreset] || presets['Overview']);
    cameraRef.current.position.set(...position);
    cameraRef.current.lookAt(0, 0, 0);
  }, [cameraPreset, viewMode]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#0a0a0f' 
      }} 
    />
  );
}
