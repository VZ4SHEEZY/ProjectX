
import React, { useState, useEffect } from 'react';
import { X, Upload, FileVideo, AlertTriangle, CheckCircle, Activity, DollarSign, Lock, ShieldAlert } from 'lucide-react';
import GlitchButton from './GlitchButton';
import { User } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);
  const [isNSFW, setIsNSFW] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('0.05');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [verificationError, setVerificationError] = useState(false);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCaption('');
      setIsSensitive(false);
      setIsNSFW(false);
      setIsPremium(false);
      setPrice('0.05');
      setUploading(false);
      setProgress(0);
      setComplete(false);
      setVerificationError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleToggleNSFW = () => {
      if (currentUser.isAgeVerified) {
          setIsNSFW(!isNSFW);
      } else {
          setVerificationError(true);
          setTimeout(() => setVerificationError(false), 3000);
      }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', caption || 'Untitled Video');
      formData.append('description', caption);
      formData.append('isNSFW', isNSFW);
      formData.append('isSensitive', isSensitive);
      formData.append('monetizationType', isPremium ? 'ppv' : 'free');
      formData.append('price', isPremium ? price : '0');
      formData.append('duration', '0');

      const token = localStorage.getItem('cdToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://cyberdope-api.onrender.com/api';

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          console.log('Upload successful:', response);
          setProgress(100);
          setComplete(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        setUploading(false);
        alert('Upload failed. Please try again.');
      });

      xhr.open('POST', `${apiUrl}/upload/video-gridfs`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      alert('Upload failed. Please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-[600px] bg-[#050505] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.1)] rounded-lg flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-[#39FF14]/30 flex-shrink-0">
          <div className="flex items-center gap-2 text-[#39FF14]">
            <Upload className="animate-pulse" size={20} />
            <span className="font-mono tracking-widest text-sm font-bold">INJECTION_PORT_V2</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            
            {/* Drop Zone / Preview */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative h-48 w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all overflow-hidden bg-black
                ${isDragging ? 'border-[#39FF14] bg-[#39FF14]/10' : 'border-gray-700 hover:border-[#39FF14]/50'}
                ${file ? 'border-solid border-[#39FF14]' : ''}
              `}
            >
              {file ? (
                <div className="relative w-full h-full">
                   <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center text-[#39FF14] font-mono pointer-events-none">
                      <FileVideo size={48} className="mb-2" />
                      <span className="text-xs">{file.name}</span>
                      <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                   </div>
                   {/* Simulate Video Preview Background */}
                   <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 to-black opacity-50"></div>
                </div>
              ) : (
                <div className="text-center p-4 pointer-events-none">
                  <Upload size={32} className="mx-auto mb-2 text-gray-600" />
                  <p className="text-[#39FF14] font-mono text-xs tracking-wider">DRAG LINK HERE OR CLICK TO BROWSE</p>
                  <p className="text-gray-600 text-[9px] mt-1 font-mono">SUPPORTED FORMATS: MP4, WEBM</p>
                </div>
              )}
              
              {/* Hidden File Input trigger */}
              <input 
                 type="file" 
                 className="absolute inset-0 opacity-0 cursor-pointer" 
                 onChange={(e) => e.target.files && setFile(e.target.files[0])}
                 disabled={uploading}
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
               {/* Caption */}
               <div className="group">
                  <label className="text-[10px] text-[#39FF14] font-mono uppercase tracking-widest">Data Manifest</label>
                  <input 
                    type="text" 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Describe your transmission..."
                    className="w-full bg-transparent border-b border-gray-700 text-white font-mono py-2 focus:outline-none focus:border-[#39FF14] transition-colors placeholder-gray-800"
                    disabled={uploading}
                  />
               </div>

               {/* Sensitive Toggle */}
               <div className="flex items-center justify-between bg-gray-900/50 p-2 border border-gray-800">
                  <div className="flex flex-col">
                     <span className="text-xs text-white font-bold font-mono">CONTAINS RESTRICTED MATERIAL?</span>
                     <span className="text-[9px] text-gray-500 font-mono">Enables blur_protocol</span>
                  </div>
                  <button 
                    onClick={() => setIsSensitive(!isSensitive)}
                    type="button"
                    className={`
                       relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center
                       ${isSensitive ? 'bg-red-600' : 'bg-gray-700'}
                    `}
                  >
                     <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ml-1 ${isSensitive ? 'translate-x-5' : ''}`} />
                  </button>
               </div>

               {/* NSFW / 18+ Toggle (Locked behind verification) */}
               <div className="relative">
                 <div className={`flex items-center justify-between p-2 border transition-colors duration-300 ${isNSFW ? 'bg-pink-900/20 border-pink-500' : 'bg-gray-900/50 border-gray-800'}`}>
                    <div className="flex flex-col">
                       <span className={`text-xs font-bold font-mono flex items-center gap-2 ${isNSFW ? 'text-pink-500' : 'text-gray-400'}`}>
                           {isNSFW ? <ShieldAlert size={12} /> : null} NSFW / 18+ CONTENT
                       </span>
                       <span className="text-[9px] text-gray-500 font-mono">Requires Age Verification</span>
                    </div>
                    <button 
                      onClick={handleToggleNSFW}
                      type="button"
                      className={`
                         relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center
                         ${isNSFW ? 'bg-pink-500' : 'bg-gray-700'}
                      `}
                    >
                       <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ml-1 ${isNSFW ? 'translate-x-5' : ''}`} />
                    </button>
                 </div>

                 {/* Error Popup */}
                 {verificationError && (
                     <div className="absolute top-0 right-0 -mt-10 bg-red-600 text-white text-[10px] font-bold px-3 py-1 animate-bounce shadow-[0_0_10px_red]">
                         IDENTITY VERIFICATION REQUIRED
                     </div>
                 )}
               </div>

               {/* Premium Toggle (Monetization) */}
               <div className={`flex flex-col gap-3 p-3 border transition-colors duration-300 ${isPremium ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-gray-800 bg-gray-900/50'}`}>
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                             <DollarSign size={14} className={isPremium ? 'text-yellow-500' : 'text-gray-500'} />
                             <span className={`text-xs font-bold font-mono ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`}>MONETIZATION PROTOCOL</span>
                         </div>
                         <span className="text-[9px] text-gray-500 font-mono">Charge ETH for access (Paywall)</span>
                      </div>
                      <button 
                        onClick={() => setIsPremium(!isPremium)}
                        type="button"
                        className={`
                           relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center
                           ${isPremium ? 'bg-yellow-500' : 'bg-gray-700'}
                        `}
                      >
                         <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ml-1 ${isPremium ? 'translate-x-5' : ''}`} />
                      </button>
                   </div>
                   
                   {isPremium && (
                       <div className="flex items-center gap-2 animate-in slide-in-from-top-2">
                           <span className="text-yellow-500 font-mono text-xs">PRICE (ETH):</span>
                           <input 
                             type="number" 
                             step="0.001"
                             value={price}
                             onChange={(e) => setPrice(e.target.value)}
                             className="w-24 bg-black border border-yellow-500/50 text-yellow-500 font-mono px-2 py-1 focus:outline-none focus:border-yellow-500"
                           />
                       </div>
                   )}
               </div>

            </div>

          </div>
          
          {/* Action Buttons - Always Visible at Bottom */}
          <div className="border-t border-[#39FF14]/30 px-6 py-4 flex-shrink-0 bg-[#050505]/80 backdrop-blur">
            {!uploading ? (
              <GlitchButton 
                onClick={handleUpload} 
                disabled={!file} 
                fullWidth 
                className="h-12"
              >
                INITIATE UPLOAD
              </GlitchButton>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-[#39FF14]">
                  <span>UPLOADING PACKETS...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                  <div 
                    className="h-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]" 
                    style={{ width: `${progress}%` }}
                  />
                  {/* Scanline Effect on Progress Bar */}
                  <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completion State - Full Modal */}
        {complete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] rounded-lg z-50">
            <div className="flex flex-col items-center justify-center py-12 text-[#39FF14] space-y-4 animate-in zoom-in duration-300">
              <CheckCircle size={64} className="drop-shadow-[0_0_20px_rgba(57,255,20,0.8)]" />
              <h3 className="text-2xl font-bold tracking-widest font-mono">TRANSMISSION COMPLETE</h3>
              <p className="text-xs text-gray-400 font-mono">Data successfully injected into the stream.</p>
              <div className="text-[10px] font-mono mt-4 animate-pulse">CLOSING PORT...</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadModal;
