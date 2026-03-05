import { create } from 'zustand';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Dados padrão quando a API não está disponível (espelha o seed do backend)
function getDefaultObjects() {
  const now = new Date().toISOString();
  const base = (name, type, orbitRadius, orbitSpeed, scale, rotationSpeed, description, moduleName) => ({
    id: `default-${name.toLowerCase()}`,
    name,
    type,
    description: description || `${name} - dado padrão.`,
    customFields: { moduleName: moduleName || name, endpoints: [], apiType: 'REST', status: 'active' },
    orbitRadius,
    orbitSpeed,
    scale,
    rotationSpeed: rotationSpeed ?? 0.01,
    lastModified: now,
    version: 1
  });
  const sun = {
    id: 'default-sun',
    name: 'Sun',
    type: 'sun',
    description: 'O centro do nosso sistema solar.',
    customFields: { moduleName: 'ERP Core', endpoints: [], apiType: 'REST', status: 'active' },
    position: { x: 0, y: 0, z: 0 },
    scale: 5.0,
    rotationSpeed: 0.001,
    lastModified: now,
    version: 1
  };
  const planets = [
    base('Mercury', 'planet', 8, 0.02, 0.4, 0.01, 'Planeta mais próximo do Sol.', 'Fast Access'),
    base('Venus', 'planet', 12, 0.015, 0.9, 0.008, 'Segundo planeta do Sol.', 'Processing'),
    base('Earth', 'planet', 16, 0.01, 1.0, 0.02, 'Nosso planeta natal.', 'User Interface'),
    base('Mars', 'planet', 22, 0.008, 0.5, 0.019, 'O planeta vermelho.', 'Analytics'),
    base('Jupiter', 'planet', 35, 0.004, 2.5, 0.04, 'O maior planeta.', 'Data Warehouse'),
    base('Saturn', 'planet', 50, 0.003, 2.0, 0.038, 'Planeta dos anéis.', 'Integration Hub'),
    base('Uranus', 'planet', 65, 0.002, 1.5, 0.03, 'Planeta azul-esverdeado.', 'Backup'),
    base('Neptune', 'planet', 80, 0.001, 1.4, 0.032, 'Planeta mais distante.', 'Archive'),
    base('Pluto', 'planet', 100, 0.004, 0.18, 0.008, 'Planeta anão; New Horizons.', 'Archive')
  ];
  // Satélites com módulos alinhados ao Emergent (stack de tecnologia)
  const satelliteModules = [
    { name: 'Phobos', moduleName: 'Auth API' },
    { name: 'Deimos', moduleName: 'Payment Gateway' },
    { name: 'Europa', moduleName: 'Notification Service' },
    { name: 'Ganymede', moduleName: 'Search Engine' },
    { name: 'Callisto', moduleName: 'Cache Layer' },
    { name: 'Titan', moduleName: 'Message Queue' },
    { name: 'Enceladus', moduleName: 'Log Aggregator' },
    { name: 'Moon', moduleName: 'Config Server' },
    { name: 'Aurora 7', moduleName: 'Nave B4 ERD-FX' },
    { name: 'Jason-2', moduleName: 'Altímetro oceânico' }
  ];
  const satellites = satelliteModules.map(({ name, moduleName }) => ({
    id: `default-sat-${name.toLowerCase().replace(/\s/g, '-')}`,
    name,
    type: 'satellite',
    description: `${name} - ${moduleName} (dado padrão).`,
    customFields: { moduleName, endpoints: [], apiType: 'REST', status: 'active' },
    orbitRadius: 10,
    orbitSpeed: 0.025,
    scale: 0.12,
    position: { x: 0, y: 0, z: 0 },
    lastModified: now,
    version: 1
  }));
  const parker = {
    id: 'default-parker-solar-probe',
    name: 'Parker Solar Probe',
    type: 'satellite',
    description: 'Sonda da NASA que “toca” o Sol. Estuda a coroa solar e o vento solar. Lançada em 2018.',
    customFields: { moduleName: 'Parker Solar Probe', endpoints: [], apiType: 'REST', status: 'active' },
    orbitRadius: 6,
    orbitSpeed: 0.04,
    scale: 0.25,
    position: { x: 0, y: 0, z: 0 },
    lastModified: now,
    version: 1
  };
  return [sun, ...planets, ...satellites, parker];
}

export const useSolarSystemStore = create((set, get) => ({
  // Scene objects
  objects: [],
  selectedObject: null,
  hoveredObject: null,
  
  // Scene manifest
  sceneManifest: null,
  
  // Time controls
  timeSpeed: 1.0,
  isPaused: false,
  
  // View mode
  viewMode: '3D', // '2D' or '3D'
  showOrbits: true,
  showLabels: true,
  showCrossSectionSun: false,
  
  // Camera
  cameraPreset: 'Overview',
  
  // UI state
  sidebarOpen: true,
  infoPopupOpen: false,
  auroraPanelOpen: false,
  isLoading: true,
  error: null,
  /** true quando os dados vêm do fallback (API indisponível) */
  useOfflineFallback: false,
  
  // Search
  searchQuery: '',
  
  // Actions
  setObjects: (objects) => set({ objects }),
  
  setSelectedObject: (object) => set({ 
    selectedObject: object,
    infoPopupOpen: object !== null 
  }),
  
  setHoveredObject: (object) => set({ hoveredObject: object }),
  
  setTimeSpeed: (speed) => set({ timeSpeed: speed }),
  
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  
  toggleCrossSectionSun: () => set((state) => ({ 
    showCrossSectionSun: !state.showCrossSectionSun 
  })),
  
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  closeInfoPopup: () => set({ infoPopupOpen: false, selectedObject: null }),

  setAuroraPanelOpen: (open) => set({ auroraPanelOpen: open }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setUseOfflineFallback: (value) => set({ useOfflineFallback: value }),

  /** Carrega dados padrão e limpa erro (para exibir a cena sem backend). */
  useDefaultData: () => set({
    objects: getDefaultObjects(),
    error: null,
    isLoading: false,
    useOfflineFallback: true
  }),

  // API Actions
  fetchObjects: async () => {
    set({ isLoading: true, error: null, useOfflineFallback: false });
    try {
      const response = await fetch(`${API_URL}/api/objects`);
      if (!response.ok) throw new Error('Failed to fetch objects');
      const data = await response.json();
      set({ objects: data, isLoading: false });
    } catch (error) {
      console.warn('API indisponível, usando dados padrão:', error.message);
      set({
        objects: getDefaultObjects(),
        error: null,
        isLoading: false,
        useOfflineFallback: true
      });
    }
  },
  
  fetchScene: async () => {
    try {
      const response = await fetch(`${API_URL}/api/scene`);
      if (!response.ok) throw new Error('Failed to fetch scene');
      const data = await response.json();
      set({ sceneManifest: data });
    } catch (error) {
      console.error('Error fetching scene:', error);
    }
  },
  
  updateObject: async (objectId, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/objects/${objectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update object');
      const updated = await response.json();
      
      set((state) => ({
        objects: state.objects.map(obj => 
          obj.id === objectId ? updated : obj
        ),
        selectedObject: state.selectedObject?.id === objectId ? updated : state.selectedObject
      }));
      
      return updated;
    } catch (error) {
      console.error('Error updating object:', error);
      throw error;
    }
  },
  
  saveScene: async () => {
    const { sceneManifest, timeSpeed, isPaused } = get();
    try {
      const response = await fetch(`${API_URL}/api/scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sceneManifest,
          timeSettings: { speed: timeSpeed, paused: isPaused }
        })
      });
      if (!response.ok) throw new Error('Failed to save scene');
      return await response.json();
    } catch (error) {
      console.error('Error saving scene:', error);
      throw error;
    }
  },
  
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return await response.json();
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },
  
  // Filtered objects getter
  getFilteredObjects: () => {
    const { objects, searchQuery } = get();
    if (!searchQuery) return objects;
    
    const query = searchQuery.toLowerCase();
    return objects.filter(obj => 
      obj.name.toLowerCase().includes(query) ||
      obj.type.toLowerCase().includes(query) ||
      obj.description?.toLowerCase().includes(query) ||
      obj.customFields?.moduleName?.toLowerCase().includes(query)
    );
  }
}));
