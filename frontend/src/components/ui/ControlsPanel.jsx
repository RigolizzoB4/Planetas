import React from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Eye, EyeOff, Layers, Grid3X3, Box,
  RotateCcw, Globe, Sun, Target, Orbit, ScanEye
} from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { useSolarSystemStore } from '../../store/solarSystemStore';
import { cn } from '../../lib/utils';

export default function ControlsPanel() {
  const {
    timeSpeed, setTimeSpeed, isPaused, togglePause,
    viewMode, setViewMode, showOrbits, toggleOrbits,
    showLabels, toggleLabels, showCrossSectionSun, toggleCrossSectionSun,
    cameraPreset, setCameraPreset
  } = useSolarSystemStore();

  const presetIcons = {
    'Overview': Globe,
    'Sun Focus': Sun,
    'Earth Focus': Target,
    'Satellite Ring': Orbit,
    'Top View': ScanEye
  };
  const cameraPresets = ['Overview', 'Sun Focus', 'Earth Focus', 'Satellite Ring', 'Top View'];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40" data-testid="controls-panel">
        <div className="glass-panel p-3 flex items-center gap-4">
          {/* Time Controls */}
          <div className="flex items-center gap-2 pr-4 border-r border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setTimeSpeed(Math.max(0.1, timeSpeed - 0.5))} className="control-btn w-8 h-8" data-testid="speed-down">
                  <SkipBack className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Diminuir Velocidade</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={togglePause} className={cn("control-btn w-10 h-10", isPaused && "active")} data-testid="play-pause">
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPaused ? 'Reproduzir' : 'Pausar'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setTimeSpeed(Math.min(5, timeSpeed + 0.5))} className="control-btn w-8 h-8" data-testid="speed-up">
                  <SkipForward className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aumentar Velocidade</TooltipContent>
            </Tooltip>

            <div className="flex flex-col items-center gap-1 ml-2">
              <span className="text-[10px]" style={{ color: '#818181' }}>Velocidade</span>
              <span className="text-sm font-mono" style={{ color: '#F3AE3E' }} data-testid="speed-display">{timeSpeed.toFixed(1)}x</span>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2 pr-4 border-r border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === '3D' ? '2D' : '3D')} className={cn("control-btn w-8 h-8", viewMode === '2D' && "active")} data-testid="view-mode">
                  {viewMode === '3D' ? <Box className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo {viewMode === '3D' ? '2D' : '3D'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleOrbits} className={cn("control-btn w-8 h-8", showOrbits && "active")} data-testid="toggle-orbits">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showOrbits ? 'Ocultar' : 'Mostrar'} Órbitas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleLabels} className={cn("control-btn w-8 h-8", showLabels && "active")} data-testid="toggle-labels">
                  {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLabels ? 'Ocultar' : 'Mostrar'} Labels</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleCrossSectionSun} className={cn("control-btn w-8 h-8", showCrossSectionSun && "active")} data-testid="cross-section">
                  <Layers className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Corte Transversal do Sol</TooltipContent>
            </Tooltip>
          </div>

          {/* Camera Presets - Lucide icons, no emoji */}
          <div className="flex items-center gap-1">
            {cameraPresets.map((preset) => {
              const Icon = presetIcons[preset];
              return (
                <Tooltip key={preset}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCameraPreset(preset)}
                      data-testid={`preset-${preset.toLowerCase().replace(/\s/g, '-')}`}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        cameraPreset === preset
                          ? "bg-[#F3AE3E] text-[#05070B]"
                          : "text-[#818181] hover:text-[#EDEDEA]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{preset}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
