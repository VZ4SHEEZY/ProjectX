
import React, { useState, useEffect } from 'react';
import { X, Code, Image as ImageIcon, Save, Terminal, RefreshCw, Palette, Type, MousePointer, Layout } from 'lucide-react';
import GlitchButton from './GlitchButton';
import ProfileBuilder from './ProfileBuilder';
import { ProfileTheme } from '../types';

interface ProfileDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: ProfileTheme;
  onSave: (theme: ProfileTheme) => void;
  userId?: string;
  profileLayout?: any;
}

const PRESET_BACKGROUNDS = [
  { name: 'Matrix Code', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80' },
  { name: 'Cyber City', url: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=1920&q=80' },
  { name: 'Neon Grid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920&q=80' },
  { name: 'Dark Circuit', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80' },
  { name: 'Purple Haze', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=80' },
  { name: 'Glitch Art', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1920&q=80' },
];

const ACCENT_COLORS = [
  { name: 'Matrix Green', value: '#39FF14' },
  { name: 'Cyber Pink', value: '#FF00FF' },
  { name: 'Neon Cyan', value: '#00FFFF' },
  { name: 'Electric Yellow', value: '#FFFF00' },
  { name: 'Hot Red', value: '#FF0040' },
  { name: 'Purple Haze', value: '#9D00FF' },
];

const BACKGROUND_COLORS = [
  { name: 'Void Black', value: '#0a0a0a' },
  { name: 'Deep Purple', value: '#1a0a2e' },
  { name: 'Midnight Blue', value: '#0a1a3e' },
  { name: 'Dark Red', value: '#2a0a0a' },
  { name: 'Forest Green', value: '#0a2a0a' },
  { name: 'Pure Black', value: '#000000' },
];

const DEFAULT_CSS = `/* CYBERDOPE PROFILE CSS OVERRIDE */
/* Target specific classes or IDs within #profile-root */

/* Example: Change widget borders */
.react-grid-item {
  border-color: #00FFFF !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

/* Example: Change bio text color */
.bio-text {
  color: #FF00FF !important;
  font-weight: bold;
}

/* Example: Add custom animations */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px #39FF14; }
  50% { box-shadow: 0 0 20px #39FF14, 0 0 40px #39FF14; }
}
`;

const ProfileDesignModal: React.FC<ProfileDesignModalProps> = ({ isOpen, onClose, currentTheme, onSave, userId, profileLayout }) => {
  const [bgUrl, setBgUrl] = useState('');
  const [bgColor, setBgColor] = useState('#0a0a0a');
  const [accentColor, setAccentColor] = useState('#39FF14');
  const [fontFamily, setFontFamily] = useState<'mono' | 'sans' | 'serif' | 'cyber'>('mono');
  const [cursorEffect, setCursorEffect] = useState<'sparkles' | 'trails' | 'none'>('sparkles');
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [activeTab, setActiveTab] = useState<'appearance' | 'layout' | 'css'>('appearance');

  useEffect(() => {
    if (isOpen) {
      setBgUrl(currentTheme?.backgroundImage || '');
      setBgColor(currentTheme?.backgroundColor || '#0a0a0a');
      setAccentColor(currentTheme?.accentColor || '#39FF14');
      setFontFamily(currentTheme?.fontFamily || 'mono');
      setCursorEffect(currentTheme?.cursorEffect || 'sparkles');
      setCssCode(currentTheme?.customCss || DEFAULT_CSS);
    }
  }, [isOpen, currentTheme]);

  const handleSave = () => {
    onSave({
      backgroundImage: bgUrl,
      backgroundColor: bgColor,
      accentColor: accentColor,
      fontFamily: fontFamily,
      cursorEffect: cursorEffect,
      customCss: cssCode
    });
    onClose();
  };

  const handlePresetClick = (url: string) => {
    setBgUrl(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-3xl mx-4 bg-[#0a0a0a] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.2)] flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#39FF14]/10 border-b-2 border-[#39FF14]/30">
           <div className="flex items-center gap-3 text-[#39FF14]">
              <Terminal size={20} />
              <span className="font-mono font-bold tracking-widest text-sm">PROFILE_CUSTOMIZER // V3.0</span>
           </div>
           <button onClick={onClose} className="text-[#39FF14]/50 hover:text-[#39FF14] transition-colors p-1 hover:bg-[#39FF14]/10 rounded">
              <X size={24} />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#39FF14]/20">
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-4 text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'appearance' ? 'bg-[#39FF14]/20 text-[#39FF14] border-b-2 border-[#39FF14]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <Palette size={16} /> APPEARANCE
          </button>
          <div className="w-[2px] bg-[#39FF14]/20" />
          <button 
            onClick={() => setActiveTab('layout')}
            className={`flex-1 py-4 text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'layout' ? 'bg-[#39FF14]/20 text-[#39FF14] border-b-2 border-[#39FF14]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <Layout size={16} /> LAYOUT
          </button>
          <div className="w-[2px] bg-[#39FF14]/20" />
          <button 
            onClick={() => setActiveTab('css')}
            className={`flex-1 py-4 text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'css' ? 'bg-[#39FF14]/20 text-[#39FF14] border-b-2 border-[#39FF14]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <Code size={16} /> RAW_CSS
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-black/80 relative overflow-hidden overflow-y-auto">
          
          {activeTab === 'layout' && (
            <ProfileBuilder
              userId={userId || ''}
              currentLayout={profileLayout}
              onSave={(layout) => {
                onClose();
              }}
              onCancel={() => setActiveTab('appearance')}
            />
          )}

          {activeTab === 'appearance' && (
            <div className="p-6 space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
              
              {/* Background Color Section */}
              <div className="space-y-3">
                <label className="text-[#39FF14] font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <Palette size={14} /> Background Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBgColor(color.value)}
                      className={`h-10 rounded border-2 transition-all ${bgColor === color.value ? 'border-[#39FF14] scale-110 shadow-[0_0_10px_#39FF14]' : 'border-gray-700 hover:border-gray-500'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-500 text-xs font-mono">Custom:</span>
                  <input 
                    type="color" 
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 bg-[#111] border border-gray-700 text-white font-mono p-2 text-xs focus:outline-none focus:border-[#39FF14]"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Background Image Section */}
              <div className="space-y-3">
                <label className="text-[#39FF14] font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} /> Background Image
                </label>
                
                {/* Preset Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_BACKGROUNDS.map((preset) => (
                    <button
                      key={preset.url}
                      onClick={() => handlePresetClick(preset.url)}
                      className={`relative h-20 rounded overflow-hidden border-2 transition-all ${bgUrl === preset.url ? 'border-[#39FF14] shadow-[0_0_15px_#39FF14]' : 'border-gray-700 hover:border-gray-500'}`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-mono text-white">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom URL Input */}
                <div className="flex gap-2">
                   <input 
                     type="text" 
                     value={bgUrl}
                     onChange={(e) => setBgUrl(e.target.value)}
                     placeholder="https://your-image-url.com/..."
                     className="flex-1 bg-[#111] border border-gray-700 text-white font-mono p-3 text-sm focus:outline-none focus:border-[#39FF14] placeholder-gray-700"
                   />
                   <button 
                     onClick={() => setBgUrl('')}
                     className="px-4 border border-gray-700 text-gray-500 hover:text-white hover:border-white transition-colors"
                   >
                      <RefreshCw size={16} />
                   </button>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  Tip: Use a dark image for best results. Image will cover the entire background.
                </p>
              </div>

              {/* Accent Color Section */}
              <div className="space-y-3">
                <label className="text-[#39FF14] font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <Layout size={14} /> Accent Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`h-10 rounded border-2 transition-all ${accentColor === color.value ? 'border-white scale-110' : 'border-gray-700 hover:border-gray-500'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {accentColor === color.value && <span className="text-white text-lg">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family Section */}
              <div className="space-y-3">
                <label className="text-[#39FF14] font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <Type size={14} /> Font Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mono', 'sans', 'serif', 'cyber'] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => setFontFamily(font)}
                      className={`py-3 px-4 border-2 rounded transition-all text-xs font-bold uppercase ${fontFamily === font ? 'border-[#39FF14] bg-[#39FF14]/20 text-[#39FF14]' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                      style={{ fontFamily: font === 'cyber' ? 'monospace' : font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor Effect Section */}
              <div className="space-y-3">
                <label className="text-[#39FF14] font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                  <MousePointer size={14} /> Cursor Effect
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sparkles', 'trails', 'none'] as const).map((effect) => (
                    <button
                      key={effect}
                      onClick={() => setCursorEffect(effect)}
                      className={`py-3 px-4 border-2 rounded transition-all text-xs font-bold uppercase ${cursorEffect === effect ? 'border-[#FF00FF] bg-[#FF00FF]/20 text-[#FF00FF]' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <label className="text-gray-500 font-mono text-xs uppercase tracking-widest">Live Preview</label>
                <div 
                  className="w-full h-32 border-2 border-gray-800 rounded relative overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  {bgUrl && (
                    <img src={bgUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="px-4 py-2 border-2 rounded font-mono text-sm"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      Preview Text
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'css' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex-1 relative">
                  <textarea 
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className="w-full h-full bg-[#050505] text-[#39FF14] font-mono text-xs p-4 pl-8 focus:outline-none resize-none leading-relaxed selection:bg-[#39FF14] selection:text-black"
                    spellCheck={false}
                  />
                  {/* Line Numbers Decoration */}
                  <div className="absolute top-4 left-0 bottom-4 w-6 border-r border-gray-800 flex flex-col items-center gap-[2px] pointer-events-none opacity-30 text-[8px] font-mono text-gray-500 pt-[2px]">
                     {Array.from({length: 30}).map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
               </div>
               <div className="bg-[#111] p-3 text-[10px] text-gray-500 font-mono border-t border-gray-800 flex justify-between">
                  <span>SCOPE: #profile-root .class-name {}</span>
                  <span className="text-[#FF00FF]">⚠️ UNSAFE_MODE_ENABLED</span>
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[#39FF14]/30 bg-[#0a0a0a] flex justify-between items-center">
           <div className="text-[10px] text-gray-600 font-mono">
              CYBERDOPE_DESIGN_SYSTEM // CUSTOMIZE_AT_WILL
           </div>
           <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="px-6 py-2 border border-gray-700 text-gray-400 text-xs font-bold hover:border-white hover:text-white transition-all"
             >
               CANCEL
             </button>
             <GlitchButton onClick={handleSave} className="h-10 px-8">
                <Save size={14} /> APPLY CHANGES
             </GlitchButton>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileDesignModal;
