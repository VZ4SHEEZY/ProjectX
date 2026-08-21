
import React, { useState, useEffect } from 'react';
import { X, Settings, Shield, Smartphone, Zap, Trash2, AlertTriangle, ToggleLeft, ToggleRight, Eye, CreditCard, ScanLine, CheckCircle } from 'lucide-react';
import GlitchButton from './GlitchButton';
import { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onVerify: (status: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser, onVerify }) => {
  // Mock Environment Variable for Demo
  const isNativeMobileApp = true; 

  const [autoplay, setAutoplay] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset purging state when reopened
  useEffect(() => {
    if (isOpen) setIsPurging(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurgeCache = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
    }, 2000);
  };

  const handleIdentityCheck = () => {
      setIsVerifying(true);
      // Simulate ID Scan Process
      setTimeout(() => {
          onVerify(true);
          setIsVerifying(false);
      }, 3000);
  };

  const ToggleItem = ({ label, value, onChange, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-800">
      <div className="flex items-center gap-3 text-gray-300">
        {Icon && <Icon size={16} className="text-[#39FF14]" />}
        <span className="text-xs font-mono tracking-wide uppercase">{label}</span>
      </div>
      <button 
        onClick={() => onChange(!value)}
        className={`transition-colors duration-300 ${value ? 'text-[#39FF14]' : 'text-gray-600'}`}
      >
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-md mx-4 bg-[#050505] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.1)] clip-path-polygon flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#39FF14]/30 bg-[#39FF14]/5">
          <div className="flex items-center gap-2 text-[#39FF14]">
            <Settings className="animate-spin-slow" size={20} />
            <span className="font-mono tracking-widest text-sm font-bold">SYSTEM CONFIGURATION</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Section: Account & Verification */}
          <div className="space-y-4">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Shield size={10} /> Identity Verification
            </h3>
            
            <div className={`p-4 border rounded-sm flex flex-col gap-3 ${currentUser.isAgeVerified ? 'bg-green-900/10 border-green-800' : 'bg-red-900/10 border-red-800'}`}>
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <ScanLine size={16} className={currentUser.isAgeVerified ? 'text-green-500' : 'text-red-500'} />
                       <span className="text-xs font-bold font-mono text-white">18+ ID VERIFICATION</span>
                   </div>
                   {currentUser.isAgeVerified ? (
                       <span className="text-[10px] bg-green-500 text-black font-bold px-2 py-0.5 rounded">VERIFIED</span>
                   ) : (
                       <span className="text-[10px] bg-red-500 text-black font-bold px-2 py-0.5 rounded">UNVERIFIED</span>
                   )}
               </div>
               
               {!currentUser.isAgeVerified ? (
                   <>
                     <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                         To view or post restricted (NSFW) content, you must complete the mandatory biometric ID scan.
                     </p>
                     <GlitchButton 
                        onClick={handleIdentityCheck} 
                        disabled={isVerifying}
                        className="h-10 text-xs"
                     >
                        {isVerifying ? 'SCANNING DATABASE...' : 'VERIFY AGE (ID SCAN)'}
                     </GlitchButton>
                   </>
               ) : (
                   <div className="flex items-center gap-2 text-green-500 text-[10px] font-mono">
                       <CheckCircle size={12} /> CLEARANCE GRANTED: LEVEL 18+
                   </div>
               )}
            </div>
            
            <div className="bg-gray-900/30 p-4 border border-gray-800 rounded-sm">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-mono">WALLET</span>
                  <span className="text-xs text-[#39FF14] font-bold bg-[#39FF14]/10 px-2 py-0.5 rounded">CONNECTED</span>
               </div>
               <div className="text-[10px] text-gray-600 font-mono break-all">
                  0x71C7656EC7ab88b098defB751B7401B5f6d8976F
               </div>
            </div>
          </div>

          {/* Section: Display */}
          <div className="space-y-1">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Smartphone size={10} /> Display & Performance
            </h3>
            <ToggleItem 
              label="Autoplay Videos" 
              value={autoplay} 
              onChange={setAutoplay} 
              icon={Eye}
            />
            <ToggleItem 
              label="Data Saver Mode" 
              value={dataSaver} 
              onChange={setDataSaver} 
              icon={Zap}
            />
          </div>

          {/* Section: Content Filters (CRUCIAL LOGIC) */}
          <div className="space-y-2">
            <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Shield size={10} /> Content Protocol
            </h3>
            
            <div className="border border-gray-800 bg-black p-1">
              {isNativeMobileApp ? (
                // iOS COMPLIANCE STATE
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20">
                   <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                   <div className="space-y-1">
                      <p className="text-amber-500 font-bold text-xs font-mono tracking-wide">RESTRICTED SETTING</p>
                      <p className="text-amber-500/80 text-[10px] font-mono leading-relaxed">
                        To modify sensitive media settings, please access the Neural Net via standard web browser.
                        <br />
                        <span className="opacity-50 mt-1 block">err_code: ios_compliance_12.4</span>
                      </p>
                   </div>
                </div>
              ) : (
                // WEB STATE
                <ToggleItem 
                  label="Show Sensitive Media" 
                  value={showSensitive} 
                  onChange={setShowSensitive} 
                  icon={Shield}
                />
              )}
            </div>
          </div>

          {/* Section: Storage */}
          <div className="space-y-4 pt-2">
             <GlitchButton 
               variant="ghost" 
               fullWidth 
               onClick={handlePurgeCache} 
               disabled={isPurging}
               className="border-gray-700 hover:border-red-500 hover:text-red-500 group"
             >
                {isPurging ? (
                   <span className="animate-pulse">PURGING SYSTEM CACHE...</span>
                ) : (
                   <span className="flex items-center gap-2">
                      <Trash2 size={14} className="group-hover:rotate-12 transition-transform" /> CLEAR LOCAL CACHE
                   </span>
                )}
             </GlitchButton>
             
             <div className="text-center">
               <p className="text-[9px] text-gray-700 font-mono">
                 CYBERDOPE CLIENT V.2.4.0 // BUILD 2077
               </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
