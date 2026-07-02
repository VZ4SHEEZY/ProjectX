import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface NSFWPromptProps {
  onVerify: () => void;
  onClose: () => void;
}

const NSFWPrompt: React.FC<NSFWPromptProps> = ({ onVerify, onClose }) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)] p-6 text-center">
        
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        <h2 className="text-red-500 font-bold text-xl mb-2">18+ CONTENT</h2>
        
        <p className="text-gray-400 text-sm mb-6">
          This content is only available to verified 18+ users.
        </p>

        <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-lg mb-6 text-left">
          <div className="flex items-start gap-3">
            <Lock className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-gray-400">
              <p className="font-bold text-white mb-1">Verify Your Age</p>
              <p>Complete age verification to unlock adult content on CyberDope.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg"
          >
            Cancel
          </button>
          <GlitchButton 
            onClick={onVerify}
            className="flex-1 py-2"
          >
            VERIFY NOW
          </GlitchButton>
        </div>
      </div>
    </div>
  );
};

export default NSFWPrompt;
