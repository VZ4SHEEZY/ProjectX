
import React, { useState } from 'react';
import { X, Shield, Wallet, Upload, Check, AlertTriangle, Lock, EyeOff } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (method: 'wallet' | 'document' | 'nft') => void;
}

type VerificationMethod = 'wallet' | 'document' | 'nft' | null;

const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ isOpen, onClose, onVerify }) => {
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'select' | 'verify' | 'success'>('select');

  const handleMethodSelect = (method: VerificationMethod) => {
    setSelectedMethod(method);
    setStep('verify');
  };

  const handleVerify = async () => {
    if (!selectedMethod) return;
    
    setIsVerifying(true);
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsVerifying(false);
    setStep('success');
    
    // Call parent callback
    setTimeout(() => {
      onVerify(selectedMethod);
      onClose();
      // Reset state
      setStep('select');
      setSelectedMethod(null);
    }, 1500);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMethod(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-lg mx-4 bg-[#0a0a0a] border-2 border-pink-600 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-pink-600/20 border-b-2 border-pink-600/50">
          <div className="flex items-center gap-3">
            <EyeOff className="text-pink-500" size={24} />
            <div>
              <h2 className="text-pink-500 font-bold text-lg tracking-wider">AGE VERIFICATION</h2>
              <p className="text-pink-400/70 text-[10px] font-mono">PROTOCOL 18+ // RESTRICTED ACCESS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-pink-500/50 hover:text-pink-500 transition-colors p-1 hover:bg-pink-500/10 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {step === 'select' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Warning Banner */}
              <div className="bg-pink-600/10 border border-pink-600/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-pink-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-pink-500 font-bold text-sm mb-1">Adult Content Warning</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      The content you're attempting to access contains adult material (18+). 
                      By proceeding, you confirm you are of legal age in your jurisdiction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Options */}
              <div className="space-y-3">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">Choose Verification Method</p>
                
                {/* Wallet Verification */}
                <button
                  onClick={() => handleMethodSelect('wallet')}
                  className="w-full p-4 border-2 border-gray-700 hover:border-[#39FF14] bg-black/50 hover:bg-[#39FF14]/5 transition-all group text-left rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#39FF14]/10 flex items-center justify-center group-hover:bg-[#39FF14]/20 transition-colors">
                      <Wallet className="text-[#39FF14]" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold group-hover:text-[#39FF14] transition-colors">Wallet Signature</h4>
                      <p className="text-gray-500 text-xs mt-1">Sign a message with your wallet. Fastest method.</p>
                      <span className="text-[10px] text-[#39FF14] font-mono mt-2 inline-block">RECOMMENDED</span>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-700 group-hover:border-[#39FF14] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#39FF14] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>

                {/* Document Verification */}
                <button
                  onClick={() => handleMethodSelect('document')}
                  className="w-full p-4 border-2 border-gray-700 hover:border-blue-500 bg-black/50 hover:bg-blue-500/5 transition-all group text-left rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Upload className="text-blue-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold group-hover:text-blue-500 transition-colors">ID Document</h4>
                      <p className="text-gray-500 text-xs mt-1">Upload ID for verification. Processed securely.</p>
                      <span className="text-[10px] text-gray-500 font-mono mt-2 inline-block">~5 MIN PROCESSING</span>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-700 group-hover:border-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>

                {/* NFT Verification */}
                <button
                  onClick={() => handleMethodSelect('nft')}
                  className="w-full p-4 border-2 border-gray-700 hover:border-purple-500 bg-black/50 hover:bg-purple-500/5 transition-all group text-left rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Lock className="text-purple-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold group-hover:text-purple-500 transition-colors">Verification NFT</h4>
                      <p className="text-gray-500 text-xs mt-1">Purchase a one-time verification NFT (~$5).</p>
                      <span className="text-[10px] text-purple-400 font-mono mt-2 inline-block">ONE-TIME FEE</span>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-700 group-hover:border-purple-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Privacy Note */}
              <div className="text-center">
                <p className="text-[10px] text-gray-600 font-mono">
                  <Shield size={10} className="inline mr-1" />
                  Your privacy is protected. No personal data stored on-chain.
                </p>
              </div>
            </div>
          )}

          {step === 'verify' && selectedMethod === 'wallet' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={handleBack} className="text-gray-500 hover:text-white text-sm flex items-center gap-1">
                ← Back
              </button>
              
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="text-[#39FF14]" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Sign a message to prove you're 18+. No transaction needed.
                </p>
                
                <div className="bg-black/50 border border-gray-800 p-4 rounded-lg mb-6 text-left">
                  <p className="text-[10px] text-gray-500 font-mono mb-2">MESSAGE TO SIGN:</p>
                  <code className="text-xs text-[#39FF14] font-mono break-all">
                    I confirm I am 18+ years old and agree to view adult content on CyberDope. Timestamp: {Date.now()}
                  </code>
                </div>

                <GlitchButton 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full py-4"
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      VERIFYING...
                    </span>
                  ) : (
                    'SIGN WITH WALLET'
                  )}
                </GlitchButton>
              </div>
            </div>
          )}

          {step === 'verify' && selectedMethod === 'document' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={handleBack} className="text-gray-500 hover:text-white text-sm flex items-center gap-1">
                ← Back
              </button>
              
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="text-blue-500" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Upload ID Document</h3>
                <p className="text-gray-400 text-sm mb-6">
                  We accept driver's license, passport, or government ID.
                </p>
                
                <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-8 transition-colors cursor-pointer mb-6">
                  <Upload className="mx-auto text-gray-500 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">Click to upload or drag & drop</p>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG, PDF up to 10MB</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg mb-6 text-left">
                  <p className="text-[10px] text-blue-400 font-mono">
                    🔒 Your document is encrypted and processed by our secure verification partner. 
                    It's never stored on our servers.
                  </p>
                </div>

                <GlitchButton 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full py-4"
                  variant="secondary"
                >
                  {isVerifying ? 'UPLOADING...' : 'UPLOAD DOCUMENT'}
                </GlitchButton>
              </div>
            </div>
          )}

          {step === 'verify' && selectedMethod === 'nft' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={handleBack} className="text-gray-500 hover:text-white text-sm flex items-center gap-1">
                ← Back
              </button>
              
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-purple-500" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Purchase Verification NFT</h3>
                <p className="text-gray-400 text-sm mb-6">
                  One-time purchase. Valid forever. Can be resold.
                </p>
                
                <div className="bg-purple-500/10 border border-purple-500/30 p-6 rounded-lg mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Verification NFT</span>
                    <span className="text-purple-400 font-bold">$5.00</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Platform Fee</span>
                    <span>$0.50</span>
                  </div>
                  <div className="border-t border-gray-700 mt-3 pt-3 flex items-center justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-purple-400 font-bold text-lg">$5.50</span>
                  </div>
                </div>

                <GlitchButton 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full py-4"
                  variant="danger"
                >
                  {isVerifying ? 'PROCESSING...' : 'PURCHASE NFT'}
                </GlitchButton>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12 animate-in zoom-in duration-300">
              <div className="w-24 h-24 rounded-full bg-[#39FF14]/20 flex items-center justify-center mx-auto mb-6">
                <Check className="text-[#39FF14]" size={48} />
              </div>
              <h3 className="text-[#39FF14] font-bold text-2xl mb-2">VERIFICATION COMPLETE</h3>
              <p className="text-gray-400 text-sm mb-4">
                You now have access to all 18+ content on CyberDope.
              </p>
              <div className="inline-flex items-center gap-2 bg-pink-600/20 border border-pink-600 px-4 py-2 rounded-full">
                <EyeOff size={14} className="text-pink-500" />
                <span className="text-pink-500 text-xs font-mono">18+ ACCESS GRANTED</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-pink-600/30 bg-black/50">
          <p className="text-[10px] text-gray-600 text-center font-mono">
            By verifying, you agree to our Terms of Service and confirm you are of legal age.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
