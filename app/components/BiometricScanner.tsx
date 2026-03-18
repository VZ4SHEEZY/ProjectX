
import React, { useState, useEffect, useRef } from 'react';
import { Scan, Fingerprint, Activity, Hexagon, ChevronLeft, ChevronRight, Binary, Crosshair } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface BiometricScannerProps {
  onScanComplete: () => void;
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const AURA_COLORS = [
  { name: 'Crimson', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Azure', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Toxic', value: '#39FF14', bg: 'bg-[#39FF14]' },
  { name: 'Void', value: '#A855F7', bg: 'bg-purple-500' },
  { name: 'Solar', value: '#F59E0B', bg: 'bg-orange-500' },
];

const BiometricScanner: React.FC<BiometricScannerProps> = ({ onScanComplete }) => {
  const [zodiacIndex, setZodiacIndex] = useState(0);
  const [year, setYear] = useState<number>(2000);
  const [aura, setAura] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>(['> SYSTEM_INIT...', '> BIOMETRIC_SENSORS_ONLINE']);

  const isComplete = aura !== ''; 

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const cycleZodiac = (dir: number) => {
    let newIndex = zodiacIndex + dir;
    if (newIndex < 0) newIndex = ZODIAC_SIGNS.length - 1;
    if (newIndex >= ZODIAC_SIGNS.length) newIndex = 0;
    setZodiacIndex(newIndex);
    addLog(`> STAR_CHART_ALIGNMENT: ${ZODIAC_SIGNS[newIndex].toUpperCase()}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYear(parseInt(e.target.value));
    if (Math.random() > 0.8) addLog(`> TEMPORAL_SHIFT: ${e.target.value}`);
  };

  const handleAuraSelect = (name: string) => {
    setAura(name);
    addLog(`> SPECTRAL_INJECTION: ${name.toUpperCase()}`);
  };

  const handleProcess = () => {
    setIsProcessing(true);
    addLog('> INITIATING_NEURAL_HANDSHAKE...');
    setTimeout(() => {
      onScanComplete();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] text-[#39FF14] font-mono flex flex-col items-center justify-center overflow-hidden">
      
      {/* 1. BACKGROUND FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)] z-0" />
      
      {/* Moving Grid Floor */}
      <div className="absolute inset-0 opacity-20 z-0 perspective-grid" 
           style={{ 
             backgroundImage: 'linear-gradient(#39FF14 1px, transparent 1px), linear-gradient(90deg, #39FF14 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(0)',
             animation: 'gridMove 10s linear infinite'
           }} 
      />
      <style>{`@keyframes gridMove { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } }`}</style>

      {/* 2. HUD OVERLAY (Static) */}
      <div className="absolute inset-0 pointer-events-none z-10 p-4 border-[20px] border-[#39FF14]/5">
         <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#39FF14]" />
         <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#39FF14]" />
         <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#39FF14]" />
         <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#39FF14]" />
         
         <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-2">
             <div className="w-1 h-24 bg-[#39FF14]/20 overflow-hidden relative">
                <div className="absolute bottom-0 w-full bg-[#39FF14] animate-[bounce_2s_infinite]" style={{ height: '60%' }} />
             </div>
         </div>
      </div>

      {/* 3. SYSTEM LOGS (Floating) */}
      <div className="absolute top-20 right-8 text-right hidden md:block z-20">
         <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">System_Kernel_Log</h3>
         <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
                <div key={i} className={`text-[9px] font-mono ${i === 0 ? 'text-[#39FF14] font-bold' : 'text-gray-600 opacity-70'}`}>
                    {log}
                </div>
            ))}
         </div>
      </div>

      {/* 4. MAIN INTERFACE */}
      <div className="relative z-30 w-full max-w-md bg-black/80 backdrop-blur-xl border border-[#39FF14]/30 p-8 shadow-[0_0_50px_rgba(57,255,20,0.1)] clip-path-polygon">
        
        {/* Header */}
        <div className="text-center mb-8 relative">
           <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#39FF14]/20 -z-10" />
           <span className="bg-black px-4 text-xl font-bold tracking-[0.2em] text-white relative z-10 flex items-center justify-center gap-2">
              <Scan className="animate-pulse text-[#39FF14]" />
              CALIBRATION
           </span>
        </div>

        <div className="space-y-8">
          
          {/* CONTROL 1: STAR DIAL (Zodiac) */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-[#39FF14] uppercase tracking-wider">
               <span>01 // Star Alignment</span>
               <span className="text-white">{ZODIAC_SIGNS[zodiacIndex]}</span>
            </div>
            
            <div className="relative h-16 bg-gray-900 border border-[#39FF14]/30 flex items-center justify-between px-2 overflow-hidden group">
               {/* Background Noise */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/stardust.png)' }} />
               
               <button onClick={() => cycleZodiac(-1)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 transition-colors z-10"><ChevronLeft /></button>
               
               <div className="flex-1 text-center relative h-full flex items-center justify-center">
                  <div className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(57,255,20,0.8)] animate-in slide-in-from-bottom-2 fade-in duration-300 key={zodiacIndex}">
                      {ZODIAC_SIGNS[zodiacIndex]}
                  </div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#39FF14] rounded-full shadow-[0_0_10px_#39FF14]" />
               </div>

               <button onClick={() => cycleZodiac(1)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 transition-colors z-10"><ChevronRight /></button>
            </div>
          </div>

          {/* CONTROL 2: TEMPORAL SLIDER (Year) */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-[#39FF14] uppercase tracking-wider">
               <span>02 // Chrono-Frequency</span>
               <span className="font-mono text-lg font-bold text-white relative">
                  {year}
                  <span className="absolute -top-1 -right-2 text-[8px] text-gray-500">HZ</span>
               </span>
            </div>
            
            <div className="relative w-full h-8 flex items-center">
               {/* Custom Track Visuals */}
               <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none opacity-50">
                  {[...Array(20)].map((_, i) => (
                      <div key={i} className={`w-[1px] bg-[#39FF14] ${i % 5 === 0 ? 'h-4' : 'h-2'}`} />
                  ))}
               </div>
               
               <input 
                  type="range" 
                  min="1950" 
                  max="2010" 
                  value={year} 
                  onChange={handleYearChange}
                  className="w-full h-8 opacity-0 cursor-pointer z-10 relative" 
               />
               
               {/* Custom Thumb (Visual Only, follows logic roughly via CSS/positioning is hard without complex math, so we use a simpler overlay approach) */}
               <div 
                  className="absolute h-full w-1 bg-[#FF00FF] shadow-[0_0_15px_#FF00FF] pointer-events-none transition-all duration-75"
                  style={{ left: `${((year - 1950) / 60) * 100}%` }}
               >
                  <div className="absolute -top-1 -left-1.5 w-4 h-4 border border-[#FF00FF] bg-black/50" />
               </div>
            </div>
          </div>

          {/* CONTROL 3: SPECTRAL CELLS (Aura) */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-[#39FF14] uppercase tracking-wider">
               <span>03 // Aura Injection</span>
               <span style={{ color: aura ? AURA_COLORS.find(c => c.name === aura)?.value : 'gray' }}>{aura || 'NULL'}</span>
            </div>
            
            <div className="flex justify-between gap-1 h-12">
               {AURA_COLORS.map((color) => {
                 const isSelected = aura === color.name;
                 return (
                   <button
                     key={color.name}
                     onClick={() => handleAuraSelect(color.name)}
                     className={`
                       flex-1 relative group border border-gray-800 hover:border-gray-500 transition-all duration-300 overflow-hidden
                       ${isSelected ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'opacity-60'}
                     `}
                   >
                      {/* Fill Effect */}
                      <div 
                        className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${color.bg}`}
                        style={{ height: isSelected ? '100%' : '10%' }}
                      />
                      
                      {/* Scanline overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[length:100%_4px]" />
                      
                      {/* Label on hover */}
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 uppercase z-10 mix-blend-difference">
                        {color.name}
                      </span>
                   </button>
                 );
               })}
            </div>
          </div>

        </div>

        {/* 5. ACTION AREA */}
        <div className="mt-10 relative">
           <GlitchButton 
             onClick={handleProcess} 
             disabled={!isComplete || isProcessing}
             fullWidth
             className="h-16 text-lg tracking-[0.2em]"
           >
             {isProcessing ? (
                <span className="flex items-center gap-3">
                   <Binary className="animate-pulse" /> PROCESSING_DATA...
                </span>
             ) : (
                "INITIATE LINK"
             )}
           </GlitchButton>
           
           {/* Decorative Error Code */}
           <div className="absolute -bottom-6 left-0 text-[8px] text-gray-700 font-mono">
              SECURE_HASH: 0x992834...
           </div>
        </div>

      </div>

    </div>
  );
};

export default BiometricScanner;
