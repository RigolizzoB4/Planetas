import { create } from 'zustand';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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
  isLoading: true,
  error: null,
  
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
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  // API Actions
  fetchObjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/objects`);
      if (!response.ok) throw new Error('Failed to fetch objects');
      const data = await response.json();
      set({ objects: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching objects:', error);
      set({ error: error.message, isLoading: false });
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
