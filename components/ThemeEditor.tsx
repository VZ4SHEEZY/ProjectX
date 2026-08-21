
import React, { useState, useEffect } from 'react';
import { 
  X, Palette, Type, Layout, Moon, Sun, Monitor, 
  Check, RefreshCw, Download, Upload, Eye, EyeOff,
  Grid, List, Maximize, Minimize
} from 'lucide-react';
import GlitchButton from './GlitchButton';

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ThemeSettings {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  
  // Typography
  fontFamily: 'mono' | 'sans' | 'serif';
  fontSize: 'small' | 'medium' | 'large';
  
  // Layout
  density: 'compact' | 'comfortable' | 'spacious';
  sidebarPosition: 'left' | 'right';
  
  // Effects
  animations: boolean;
  glowEffects: boolean;
  scanlines: boolean;
  
  // Dark/Light mode
  mode: 'dark' | 'light' | 'system';
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#39FF14',
  secondaryColor: '#FF00FF',
  accentColor: '#00FFFF',
  backgroundColor: '#050505',
  fontFamily: 'mono',
  fontSize: 'medium',
  density: 'comfortable',
  sidebarPosition: 'left',
  animations: true,
  glowEffects: true,
  scanlines: true,
  mode: 'dark'
};

const PRESET_THEMES = [
  { 
    name: 'Cyberpunk', 
    primaryColor: '#39FF14', 
    secondaryColor: '#FF00FF', 
    accentColor: '#00FFFF',
    backgroundColor: '#050505'
  },
  { 
    name: 'Matrix', 
    primaryColor: '#00FF41', 
    secondaryColor: '#008F11', 
    accentColor: '#003B00',
    backgroundColor: '#000000'
  },
  { 
    name: 'Neon Nights', 
    primaryColor: '#FF006E', 
    secondaryColor: '#8338EC', 
    accentColor: '#3A86FF',
    backgroundColor: '#0a0a1a'
  },
  { 
    name: 'Sunset', 
    primaryColor: '#F77F00', 
    secondaryColor: '#FCBF49', 
    accentColor: '#D62828',
    backgroundColor: '#1a0a05'
  },
  { 
    name: 'Ice', 
    primaryColor: '#00F5FF', 
    secondaryColor: '#0096C7', 
    accentColor: '#48CAE4',
    backgroundColor: '#050a0f'
  },
  { 
    name: 'Monochrome', 
    primaryColor: '#FFFFFF', 
    secondaryColor: '#888888', 
    accentColor: '#444444',
    backgroundColor: '#000000'
  },
];

const ThemeEditor: React.FC<ThemeEditorProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'layout' | 'effects'>('colors');

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('cyberdope-theme');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isOpen) return;
    
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--accent-color', settings.accentColor);
    root.style.setProperty('--background-color', settings.backgroundColor);
    
    // Apply font family
    document.body.style.fontFamily = settings.fontFamily === 'mono' 
      ? 'ui-monospace, SFMono-Regular, monospace'
      : settings.fontFamily === 'sans'
      ? 'ui-sans-serif, system-ui, sans-serif'
      : 'ui-serif, Georgia, serif';
    
    // Apply font size
    const fontSizeMultiplier = settings.fontSize === 'small' ? 0.875 : settings.fontSize === 'large' ? 1.125 : 1;
    document.documentElement.style.fontSize = `${fontSizeMultiplier * 16}px`;
    
    // Apply scanlines
    if (settings.scanlines) {
      document.body.classList.add('scanlines');
    } else {
      document.body.classList.remove('scanlines');
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    localStorage.setItem('cyberdope-theme', JSON.stringify(settings));
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_THEME);
    localStorage.removeItem('cyberdope-theme');
  };

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setSettings({
      ...settings,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor
    });
  };

  const exportTheme = () => {
    const themeJson = JSON.stringify(settings, null, 2);
    const blob = new Blob([themeJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cyberdope-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          setSettings({ ...DEFAULT_THEME, ...imported });
        } catch (err) {
          alert('Invalid theme file');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl mx-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#39FF14] to-[#FF00FF] flex items-center justify-center">
              <Palette className="text-black" size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Theme Editor</h2>
              <p className="text-gray-500 text-xs">Customize your CyberDope experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`p-2 rounded-lg transition-colors ${previewMode ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'text-gray-500 hover:text-white'}`}
              title="Toggle Preview"
            >
              {previewMode ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-800 hidden md:block">
            {[
              { id: 'colors', label: 'Colors', icon: Palette },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'layout', label: 'Layout', icon: Layout },
              { id: 'effects', label: 'Effects', icon: Monitor },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-[#39FF14]/10 text-[#39FF14] border-r-2 border-[#39FF14]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Tab Selector */}
          <div className="md:hidden w-full border-b border-gray-800 overflow-x-auto flex">
            {[
              { id: 'colors', label: 'Colors', icon: Palette },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'layout', label: 'Layout', icon: Layout },
              { id: 'effects', label: 'Effects', icon: Monitor },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'text-[#39FF14] border-b-2 border-[#39FF14]' 
                    : 'text-gray-400'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* COLORS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Preset Themes */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Preset Themes</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PRESET_THEMES.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="p-3 bg-black/50 border border-gray-800 rounded-xl hover:border-gray-600 transition-all group"
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primaryColor }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondaryColor }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accentColor }} />
                        </div>
                        <p className="text-white text-sm font-medium group-hover:text-[#39FF14] transition-colors">
                          {preset.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div className="space-y-4">
                  <label className="text-gray-400 text-sm">Custom Colors</label>
                  
                  {[
                    { key: 'primaryColor', label: 'Primary Color', description: 'Main accent color' },
                    { key: 'secondaryColor', label: 'Secondary Color', description: 'Buttons, highlights' },
                    { key: 'accentColor', label: 'Accent Color', description: 'Links, badges' },
                    { key: 'backgroundColor', label: 'Background', description: 'Page background' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={(settings as any)[key]}
                          onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0"
                        />
                        <div>
                          <p className="text-white font-medium">{label}</p>
                          <p className="text-gray-500 text-xs">{description}</p>
                        </div>
                      </div>
                      <code className="text-gray-500 text-xs font-mono">{(settings as any)[key]}</code>
                    </div>
                  ))}
                </div>

                {/* Color Preview */}
                <div className="p-4 bg-black/50 border border-gray-800 rounded-xl">
                  <label className="text-gray-400 text-sm mb-3 block">Preview</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button className="px-4 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: settings.primaryColor, color: '#000' }}>
                        Primary Button
                      </button>
                      <button className="px-4 py-2 rounded-lg text-sm font-bold border-2" style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}>
                        Secondary
                      </button>
                    </div>
                    <p style={{ color: settings.accentColor }}>
                      This is accent colored text for links and highlights.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TYPOGRAPHY TAB */}
            {activeTab === 'typography' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Font Family */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Font Family</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'mono', label: 'Monospace', sample: 'CODE' },
                      { id: 'sans', label: 'Sans Serif', sample: 'Clean' },
                      { id: 'serif', label: 'Serif', sample: 'Elegant' },
                    ].map((font) => (
                      <button
                        key={font.id}
                        onClick={() => setSettings({ ...settings, fontFamily: font.id as any })}
                        className={`p-4 bg-black/50 border rounded-xl transition-all ${
                          settings.fontFamily === font.id 
                            ? 'border-[#39FF14] bg-[#39FF14]/10' 
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                        style={{ fontFamily: font.id === 'mono' ? 'monospace' : font.id === 'sans' ? 'sans-serif' : 'serif' }}
                      >
                        <p className="text-white text-lg mb-1">{font.sample}</p>
                        <p className="text-gray-500 text-xs">{font.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Font Size</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'small', label: 'Small', multiplier: 0.875 },
                      { id: 'medium', label: 'Medium', multiplier: 1 },
                      { id: 'large', label: 'Large', multiplier: 1.125 },
                    ].map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSettings({ ...settings, fontSize: size.id as any })}
                        className={`flex-1 p-4 bg-black/50 border rounded-xl transition-all ${
                          settings.fontSize === size.id 
                            ? 'border-[#39FF14] bg-[#39FF14]/10' 
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <p 
                          className="text-white mb-1" 
                          style={{ fontSize: `${size.multiplier}rem` }}
                        >
                          Aa
                        </p>
                        <p className="text-gray-500 text-xs capitalize">{size.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-black/50 border border-gray-800 rounded-xl">
                  <label className="text-gray-400 text-sm mb-3 block">Preview</label>
                  <div style={{ 
                    fontFamily: settings.fontFamily === 'mono' ? 'monospace' : settings.fontFamily === 'sans' ? 'sans-serif' : 'serif',
                    fontSize: settings.fontSize === 'small' ? '0.875rem' : settings.fontSize === 'large' ? '1.125rem' : '1rem'
                  }}>
                    <h1 className="text-white text-2xl font-bold mb-2">Heading 1</h1>
                    <h2 className="text-gray-300 text-xl font-medium mb-2">Heading 2</h2>
                    <p className="text-gray-400 mb-2">
                      This is body text. It should be comfortable to read at your chosen size.
                    </p>
                    <code className="text-[#39FF14] bg-black/50 px-2 py-1 rounded">code snippet</code>
                  </div>
                </div>
              </div>
            )}

            {/* LAYOUT TAB */}
            {activeTab === 'layout' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Density */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Content Density</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'compact', label: 'Compact', icon: Minimize },
                      { id: 'comfortable', label: 'Comfortable', icon: Grid },
                      { id: 'spacious', label: 'Spacious', icon: Maximize },
                    ].map((density) => (
                      <button
                        key={density.id}
                        onClick={() => setSettings({ ...settings, density: density.id as any })}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 bg-black/50 border rounded-xl transition-all ${
                          settings.density === density.id 
                            ? 'border-[#39FF14] bg-[#39FF14]/10' 
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <density.icon size={24} className="text-gray-400" />
                        <span className="text-white text-sm">{density.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dark/Light Mode */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Appearance Mode</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'system', label: 'System', icon: Monitor },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSettings({ ...settings, mode: mode.id as any })}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 bg-black/50 border rounded-xl transition-all ${
                          settings.mode === mode.id 
                            ? 'border-[#39FF14] bg-[#39FF14]/10' 
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <mode.icon size={24} className="text-gray-400" />
                        <span className="text-white text-sm">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Position */}
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">Sidebar Position</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'left', label: 'Left' },
                      { id: 'right', label: 'Right' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => setSettings({ ...settings, sidebarPosition: pos.id as any })}
                        className={`flex-1 p-4 bg-black/50 border rounded-xl transition-all ${
                          settings.sidebarPosition === pos.id 
                            ? 'border-[#39FF14] bg-[#39FF14]/10' 
                            : 'border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-full h-12 bg-gray-800 rounded flex ${pos.id === 'left' ? 'justify-start' : 'justify-end'} p-2`}>
                          <div className="w-4 h-full bg-[#39FF14]/50 rounded" />
                        </div>
                        <span className="text-white text-sm mt-2 block">{pos.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* EFFECTS TAB */}
            {activeTab === 'effects' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Toggle Effects */}
                {[
                  { key: 'animations', label: 'Animations', description: 'Enable smooth transitions and animations' },
                  { key: 'glowEffects', label: 'Glow Effects', description: 'Add neon glow to interactive elements' },
                  { key: 'scanlines', label: 'Scanlines', description: 'Retro CRT monitor effect' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-xl">
                    <div>
                      <p className="text-white font-medium">{label}</p>
                      <p className="text-gray-500 text-sm">{description}</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, [key]: !(settings as any)[key] })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        (settings as any)[key] ? 'bg-[#39FF14]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        (settings as any)[key] ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}

                {/* Preview */}
                <div className="p-4 bg-black/50 border border-gray-800 rounded-xl">
                  <label className="text-gray-400 text-sm mb-3 block">Effects Preview</label>
                  <div className="space-y-3">
                    <button 
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        settings.glowEffects ? 'shadow-[0_0_20px_rgba(57,255,20,0.5)]' : ''
                      }`}
                      style={{ backgroundColor: settings.primaryColor, color: '#000' }}
                    >
                      Glow Effect Button
                    </button>
                    {settings.scanlines && (
                      <div className="relative p-4 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none" style={{
                          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
                        }} />
                        <p className="text-gray-400 text-sm relative z-10">Scanline effect overlay</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={16} />
              Reset
            </button>
            <button 
              onClick={exportTheme}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <label className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
              <Upload size={16} />
              Import
              <input type="file" accept=".json" onChange={importTheme} className="hidden" />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <GlitchButton onClick={handleSave}>
              <Check size={16} className="mr-2" />
              Save Theme
            </GlitchButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor;
