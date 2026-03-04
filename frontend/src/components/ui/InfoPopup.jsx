import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  ExternalLink, 
  Server,
  Globe,
  Tag,
  Edit3,
  Check
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { useSolarSystemStore } from '../../store/solarSystemStore';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function InfoPopup() {
  const { 
    selectedObject, 
    infoPopupOpen, 
    closeInfoPopup,
    updateObject,
    uploadImage
  } = useSolarSystemStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    customFields: {
      moduleName: '',
      endpoints: [],
      apiType: '',
      status: 'active'
    }
  });
  const [newEndpoint, setNewEndpoint] = useState('');

  useEffect(() => {
    if (selectedObject) {
      setFormData({
        name: selectedObject.name || '',
        description: selectedObject.description || '',
        imageUrl: selectedObject.imageUrl || '',
        customFields: {
          moduleName: selectedObject.customFields?.moduleName || '',
          endpoints: selectedObject.customFields?.endpoints || [],
          apiType: selectedObject.customFields?.apiType || '',
          status: selectedObject.customFields?.status || 'active'
        }
      });
      setIsEditing(false);
    }
  }, [selectedObject]);

  if (!infoPopupOpen || !selectedObject) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [field]: value
      }
    }));
  };

  const handleAddEndpoint = () => {
    if (newEndpoint.trim()) {
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          endpoints: [...prev.customFields.endpoints, newEndpoint.trim()]
        }
      }));
      setNewEndpoint('');
    }
  };

  const handleRemoveEndpoint = (index) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        endpoints: prev.customFields.endpoints.filter((_, i) => i !== index)
      }
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await uploadImage(file);
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url
      }));
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateObject(selectedObject.id, formData);
      toast.success('Objeto atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const planetImages = {
    Sun: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/320px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
    Mercury: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/320px-Mercury_in_true_color.jpg',
    Venus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Venus_from_Mariner_10.jpg/320px-Venus_from_Mariner_10.jpg',
    Earth: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/320px-The_Blue_Marble_%28remastered%29.jpg',
    Mars: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/320px-OSIRIS_Mars_true_color.jpg',
    Jupiter: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Jupiter_New_Horizons.jpg/320px-Jupiter_New_Horizons.jpg',
    Saturn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/320px-Saturn_during_Equinox.jpg',
    Uranus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/320px-Uranus2.jpg',
    Neptune: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Neptune_Full.jpg/320px-Neptune_Full.jpg'
  };

  const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || '';
  const displayImage = formData.imageUrl
    ? (formData.imageUrl.startsWith('/') ? `${apiBaseUrl}${formData.imageUrl}` : formData.imageUrl)
    : (planetImages[selectedObject.name] || null);

  return (
    <div className="fixed right-4 top-20 bottom-20 w-96 z-50 animate-slide-in">
      <div className="glass-panel h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ 
                backgroundColor: '#F3AE3E',
                boxShadow: '0 0 10px #F3AE3E30'
              }}
            />
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-8 text-lg font-display font-semibold bg-muted/50"
              />
            ) : (
              <h2 className="text-lg font-display font-semibold text-foreground">
                {selectedObject.name}
              </h2>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSave}
                disabled={isSaving}
                className="control-btn w-8 h-8"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" style={{ color: '#F3AE3E' }} />
                )}
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(true)}
                className="control-btn w-8 h-8"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={closeInfoPopup}
              className="control-btn w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="flex-1 custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/30">
              {displayImage ? (
                <img 
                  src={displayImage} 
                  alt={selectedObject.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Globe className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
              
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Enviar Imagem</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {selectedObject.type}
              </Badge>
              {selectedObject.customFields?.status && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    selectedObject.customFields.status === 'active' 
                      ? 'bg-[#F3AE3E]/20 text-[#F3AE3E] border-[#F3AE3E]/30'
                      : 'bg-[#818181]/20 text-[#818181] border-[#818181]/30'
                  )}
                >
                  {selectedObject.customFields.status}
                </Badge>
              )}
              {selectedObject.version && (
                <Badge variant="outline" className="text-muted-foreground">
                  v{selectedObject.version}
                </Badge>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Descrição
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição do objeto..."
                  className="mt-1 min-h-[100px] bg-muted/50"
                />
              ) : (
                <p className="mt-1 text-sm text-foreground/80 leading-relaxed">
                  {selectedObject.description || 'Sem descrição disponível.'}
                </p>
              )}
            </div>
            
            <Separator className="bg-border/30" />
            
            {/* Custom Fields - Module Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="w-3 h-3" />
                Informações do Módulo
              </h3>
              
              {/* Module Name */}
              <div>
                <label className="text-xs text-muted-foreground">Nome do Módulo</label>
                {isEditing ? (
                  <Input
                    value={formData.customFields.moduleName}
                    onChange={(e) => handleCustomFieldChange('moduleName', e.target.value)}
                    placeholder="Ex: User Interface"
                    className="mt-1 h-8 bg-muted/50"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium">
                    {selectedObject.customFields?.moduleName || '-'}
                  </p>
                )}
              </div>
              
              {/* API Type */}
              <div>
                <label className="text-xs text-muted-foreground">Tipo de API</label>
                {isEditing ? (
                  <Input
                    value={formData.customFields.apiType}
                    onChange={(e) => handleCustomFieldChange('apiType', e.target.value)}
                    placeholder="Ex: REST, GraphQL"
                    className="mt-1 h-8 bg-muted/50"
                  />
                ) : (
                  <p className="mt-1 text-sm">
                    {selectedObject.customFields?.apiType || '-'}
                  </p>
                )}
              </div>
              
              {/* Endpoints */}
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Endpoints
                </label>
                <div className="mt-1 space-y-1">
                  {formData.customFields.endpoints.map((endpoint, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs font-mono"
                    >
                      <span className="flex-1 truncate">{endpoint}</span>
                      {isEditing && (
                        <button 
                          onClick={() => handleRemoveEndpoint(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {isEditing && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newEndpoint}
                        onChange={(e) => setNewEndpoint(e.target.value)}
                        placeholder="/api/endpoint"
                        className="h-8 flex-1 bg-muted/50 font-mono text-xs"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddEndpoint()}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddEndpoint}
                        className="h-8"
                      >
                        Adicionar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Separator className="bg-border/30" />
            
            {/* Orbital Parameters */}
            {selectedObject.orbitRadius && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Parâmetros Orbitais
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-xs text-muted-foreground">Raio da Órbita</span>
                    <p className="font-mono">{selectedObject.orbitRadius} AU</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-xs text-muted-foreground">Velocidade</span>
                    <p className="font-mono">{selectedObject.orbitSpeed || '-'}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-xs text-muted-foreground">Escala</span>
                    <p className="font-mono">{selectedObject.scale || 1}x</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-xs text-muted-foreground">Rotação</span>
                    <p className="font-mono">{selectedObject.rotationSpeed || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        {isEditing && (
          <div className="p-4 border-t border-border/30 flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
