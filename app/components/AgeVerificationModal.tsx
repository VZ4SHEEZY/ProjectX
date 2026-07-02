import React, { useState, useRef } from 'react';
import { X, Upload, Check, AlertTriangle, Lock, Shield, Camera, FileCheck } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
}

type VerificationStep = 'intro' | 'id-upload' | 'selfie-upload' | 'review' | 'success' | 'error';

const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ isOpen, onClose, onVerifySuccess }) => {
  const [step, setStep] = useState<VerificationStep>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'id' | 'selfie') => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token = localStorage.getItem('cdToken');
      const res = await fetch('https://cyberdope-api.onrender.com/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (type === 'id') {
        setIdPhotoUrl(data.url);
        if (selfieUrl) setStep('review');
        else setStep('selfie-upload');
      } else {
        setSelfieUrl(data.url);
        if (idPhotoUrl) setStep('review');
        else setStep('id-upload');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!idPhotoUrl || !selfieUrl) {
      setError('Both ID and selfie are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('cdToken');
      const res = await fetch('https://cyberdope-api.onrender.com/api/age-verification/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idPhotoUrl,
          selfieUrl
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setStep('success');
      setTimeout(() => {
        onVerifySuccess();
        onClose();
        // Reset state
        setStep('intro');
        setIdPhotoUrl(null);
        setSelfieUrl(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('intro');
    setIdPhotoUrl(null);
    setSelfieUrl(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl mx-4 bg-[#0a0a0a] border-2 border-pink-600 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-pink-600/20 border-b-2 border-pink-600/50">
          <div className="flex items-center gap-3">
            <Shield className="text-pink-500" size={24} />
            <div>
              <h2 className="text-pink-500 font-bold text-lg tracking-wider">AGE VERIFICATION</h2>
              <p className="text-pink-400/70 text-[10px] font-mono">18+ IDENTITY CONFIRMATION</p>
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
          
          {step === 'intro' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Warning Banner */}
              <div className="bg-pink-600/10 border border-pink-600/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-pink-500 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-pink-500 font-bold text-sm mb-1">Adult Content Warning</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      CyberDope hosts adult (18+) content from creators. To protect our community, 
                      we require government-issued ID verification for all users.
                    </p>
                  </div>
                </div>
              </div>

              {/* What We Need */}
              <div className="space-y-3">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">What We'll Ask For</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-black/50 border border-gray-800 rounded-lg">
                    <FileCheck className="text-[#39FF14] flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-white text-sm font-bold">Government ID Photo</h4>
                      <p className="text-gray-500 text-xs">Driver's license, passport, or national ID</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-black/50 border border-gray-800 rounded-lg">
                    <Camera className="text-blue-500 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-white text-sm font-bold">Selfie for Liveness</h4>
                      <p className="text-gray-500 text-xs">Recent photo showing your face clearly</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-black/50 border border-gray-800 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lock className="text-[#39FF14] flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-gray-400">
                    <p className="font-bold text-white mb-1">🔒 Privacy & Security</p>
                    <ul className="space-y-1">
                      <li>• Encrypted end-to-end</li>
                      <li>• Processed by secure verification partner</li>
                      <li>• Not stored on our servers</li>
                      <li>• Only used for age verification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="text-center">
                <p className="text-[10px] text-gray-600 font-mono mb-4">
                  By proceeding, you agree to our Terms of Service and confirm you are 18+ years old.
                </p>
                <GlitchButton 
                  onClick={() => setStep('id-upload')}
                  className="w-full py-3"
                >
                  START VERIFICATION
                </GlitchButton>
              </div>
            </div>
          )}

          {step === 'id-upload' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <button 
                onClick={() => setStep('intro')} 
                className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-2"
              >
                ← Back
              </button>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="text-[#39FF14]" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Upload Government ID</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Driver's license, passport, or national ID card (front side)
                </p>

                {/* Upload Area */}
                <div 
                  onClick={() => idInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-[#39FF14] rounded-lg p-8 transition-all cursor-pointer bg-black/30 hover:bg-[#39FF14]/5 group"
                >
                  {idPhotoUrl ? (
                    <div className="space-y-3">
                      <img src={idPhotoUrl} alt="ID" className="max-h-32 mx-auto rounded-lg border border-gray-700" />
                      <p className="text-[#39FF14] text-sm font-bold">✓ ID Uploaded</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIdPhotoUrl(null);
                        }}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto text-gray-500 mb-2 group-hover:text-[#39FF14] transition-colors" size={32} />
                      <p className="text-gray-400 text-sm">Click to upload or drag & drop</p>
                      <p className="text-gray-600 text-xs mt-1">JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>

                <input 
                  ref={idInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'id')}
                  className="hidden"
                />

                {error && (
                  <div className="mt-4 text-red-500 text-sm border border-red-500/30 bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => setStep('intro')}
                    className="flex-1 py-2 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => idPhotoUrl && setStep('selfie-upload')}
                    disabled={!idPhotoUrl || isLoading}
                    className="flex-1 py-2 bg-[#39FF14]/20 text-[#39FF14] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#39FF14]/30 transition-colors rounded-lg font-bold"
                  >
                    {isLoading ? 'Uploading...' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'selfie-upload' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <button 
                onClick={() => setStep('id-upload')} 
                className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-2"
              >
                ← Back
              </button>

              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="text-blue-500" size={40} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Take a Selfie</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Recent photo of your face. Used to verify it's really you.
                </p>

                {/* Upload Area */}
                <div 
                  onClick={() => selfieInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-8 transition-all cursor-pointer bg-black/30 hover:bg-blue-500/5 group"
                >
                  {selfieUrl ? (
                    <div className="space-y-3">
                      <img src={selfieUrl} alt="Selfie" className="max-h-32 mx-auto rounded-lg border border-gray-700" />
                      <p className="text-blue-500 text-sm font-bold">✓ Selfie Uploaded</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelfieUrl(null);
                        }}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        Retake
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className="mx-auto text-gray-500 mb-2 group-hover:text-blue-500 transition-colors" size={32} />
                      <p className="text-gray-400 text-sm">Click to upload or drag & drop</p>
                      <p className="text-gray-600 text-xs mt-1">JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>

                <input 
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'selfie')}
                  className="hidden"
                />

                {error && (
                  <div className="mt-4 text-red-500 text-sm border border-red-500/30 bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => setStep('id-upload')}
                    className="flex-1 py-2 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => selfieUrl && setStep('review')}
                    disabled={!selfieUrl || isLoading}
                    className="flex-1 py-2 bg-blue-500/20 text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500/30 transition-colors rounded-lg font-bold"
                  >
                    {isLoading ? 'Uploading...' : 'Review'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-white font-bold text-lg">Review Your Documents</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-800 rounded-lg p-3 bg-black/50">
                  {idPhotoUrl && <img src={idPhotoUrl} alt="ID" className="w-full rounded-lg mb-2" />}
                  <p className="text-gray-400 text-xs text-center">Government ID</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-3 bg-black/50">
                  {selfieUrl && <img src={selfieUrl} alt="Selfie" className="w-full rounded-lg mb-2" />}
                  <p className="text-gray-400 text-xs text-center">Selfie</p>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm border border-red-500/30 bg-red-500/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <p className="text-gray-500 text-xs">
                By submitting, you confirm these are accurate photos of your valid government ID 
                and a recent photo of yourself.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('selfie-upload')}
                  className="flex-1 py-2 border border-gray-700 text-gray-400 hover:text-white transition-colors rounded-lg"
                >
                  Back
                </button>
                <GlitchButton 
                  onClick={handleSubmitVerification}
                  disabled={isLoading}
                  className="flex-1 py-2"
                >
                  {isLoading ? 'SUBMITTING...' : 'SUBMIT FOR VERIFICATION'}
                </GlitchButton>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12 animate-in zoom-in duration-300">
              <div className="w-24 h-24 rounded-full bg-[#39FF14]/20 flex items-center justify-center mx-auto mb-6">
                <Check className="text-[#39FF14]" size={48} />
              </div>
              <h3 className="text-[#39FF14] font-bold text-2xl mb-2">VERIFIED!</h3>
              <p className="text-gray-400 text-sm mb-6">
                You now have access to all 18+ content on CyberDope.
              </p>
              <div className="inline-flex items-center gap-2 bg-pink-600/20 border border-pink-600 px-4 py-2 rounded-full">
                <Shield size={14} className="text-pink-500" />
                <span className="text-pink-500 text-xs font-mono">18+ VERIFIED</span>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-12 animate-in fade-in duration-300">
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-red-500" size={48} />
              </div>
              <h3 className="text-red-500 font-bold text-xl mb-2">Verification Failed</h3>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <button 
                onClick={handleReset}
                className="bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors px-6 py-2 rounded-lg font-bold"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
