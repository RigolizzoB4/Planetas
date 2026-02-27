import React from 'react';
import { Search, Circle, Satellite, Sparkles } from 'lucide-react';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { useSolarSystemStore } from '../../store/solarSystemStore';
import { cn } from '../../lib/utils';

const typeIcons = {
  sun: <Sparkles className="w-4 h-4" style={{ color: '#F3AE3E' }} />,
  planet: <Circle className="w-4 h-4" style={{ color: '#B4B4B4' }} />,
  satellite: <Satellite className="w-4 h-4" style={{ color: '#F3AE3E' }} />,
  asteroid: <Circle className="w-4 h-4" style={{ color: '#818181' }} />
};

const typeBadgeStyle = {
  sun: 'bg-[#F3AE3E]/15 text-[#F3AE3E] border-[#F3AE3E]/30',
  planet: 'bg-[#B4B4B4]/15 text-[#B4B4B4] border-[#B4B4B4]/30',
  satellite: 'bg-[#F3AE3E]/15 text-[#F3AE3E] border-[#F3AE3E]/30',
  asteroid: 'bg-[#818181]/15 text-[#818181] border-[#818181]/30'
};

export default function Sidebar() {
  const {
    sidebarOpen, searchQuery, setSearchQuery,
    selectedObject, setSelectedObject, getFilteredObjects
  } = useSolarSystemStore();

  const filteredObjects = getFilteredObjects();

  const groupedObjects = React.useMemo(() => {
    const groups = { sun: [], planet: [], satellite: [], asteroid: [] };
    filteredObjects.forEach(obj => { if (groups[obj.type]) groups[obj.type].push(obj); });
    return groups;
  }, [filteredObjects]);

  if (!sidebarOpen) return null;

  return (
    <aside
      data-testid="sidebar"
      className="fixed left-0 top-14 bottom-0 w-72 glass-panel border-r border-border/30 z-40 animate-slide-in"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar objetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-border/50"
              data-testid="sidebar-search"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 custom-scrollbar">
          <div className="p-4 space-y-6">
            {groupedObjects.sun.length > 0 && (
              <ObjectGroup title="Estrela Central" objects={groupedObjects.sun} selectedObject={selectedObject} setSelectedObject={setSelectedObject} />
            )}
            {groupedObjects.satellite.length > 0 && (
              <ObjectGroup title={"Sat\u00e9lites"} objects={groupedObjects.satellite} selectedObject={selectedObject} setSelectedObject={setSelectedObject} />
            )}
            {groupedObjects.planet.length > 0 && (
              <ObjectGroup title="Planetas" objects={groupedObjects.planet} selectedObject={selectedObject} setSelectedObject={setSelectedObject} />
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/30">
          <p className="text-[10px] text-center" style={{ color: '#818181' }}>
            Texturas:{' '}
            <a href="https://www.solarsystemscope.com" target="_blank" rel="noopener noreferrer" style={{ color: '#F3AE3E' }} className="hover:underline">
              Solar System Scope
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}

function ObjectGroup({ title, objects, selectedObject, setSelectedObject }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#818181' }}>
        {title}
      </h3>
      <div className="space-y-1">
        {objects.map(obj => (
          <ObjectItem key={obj.id} object={obj} isSelected={selectedObject?.id === obj.id} onClick={() => setSelectedObject(obj)} />
        ))}
      </div>
    </div>
  );
}

function ObjectItem({ object, isSelected, onClick }) {
  const indicatorColor = object.type === 'sun' ? '#F3AE3E' : '#B4B4B4';

  return (
    <button
      onClick={onClick}
      data-testid={`sidebar-item-${object.name}`}
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
        "hover:bg-muted/50 group",
        isSelected && "bg-[#F3AE3E]/10 border border-[#F3AE3E]/25"
      )}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: indicatorColor, boxShadow: `0 0 8px ${indicatorColor}30` }}
      />
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: '#EDEDEA' }}>
            {object.name}
          </span>
          {typeIcons[object.type]}
        </div>
        {object.customFields?.moduleName && (
          <span className="text-xs truncate block" style={{ color: '#818181' }}>
            {object.customFields.moduleName}
          </span>
        )}
      </div>
      <Badge variant="outline" className={cn("text-[10px] capitalize flex-shrink-0", typeBadgeStyle[object.type])}>
        {object.type}
      </Badge>
    </button>
  );
}
