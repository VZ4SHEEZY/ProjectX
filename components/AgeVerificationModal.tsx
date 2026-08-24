import React from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';

interface AgeVerificationModalProps { isOpen: boolean; onClose: () => void; onVerifySuccess: () => void; }

const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="verification-title">
    <div className="relative w-full max-w-lg mx-4 bg-[#0a0a0a] border-2 border-pink-600 p-6 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
      <button onClick={onClose} aria-label="Close identity verification" className="absolute right-4 top-4 p-2 text-gray-500 hover:text-white"><X size={22} /></button>
      <Shield className="mb-4 text-pink-500" size={32} />
      <h2 id="verification-title" className="text-xl font-bold text-white">Identity verification unavailable</h2>
      <div className="mt-4 flex gap-3 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-gray-300"><AlertTriangle className="shrink-0 text-amber-400" size={20} /><p>CyberDope does not currently have an active identity-verification provider. We will not collect your ID or selfie until a secure provider integration is available.</p></div>
      <p className="mt-4 text-xs text-gray-500">Adult-content and creator-verification features that require identity verification remain locked.</p>
      <button onClick={onClose} className="mt-6 w-full border border-gray-700 py-3 font-bold text-gray-200 hover:border-white">CLOSE</button>
    </div>
  </div>;
};

export default AgeVerificationModal;
