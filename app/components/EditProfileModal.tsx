import React, { useState } from 'react';
import { User } from '../types';
import { X, Upload } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSave: (updates: { bio?: string; avatar?: string }) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, user, onClose, onSave }) => {
  const [bio, setBio] = useState(user.bio || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Crop image to square
  const cropToSquare = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context failed'));
          
          // Center crop
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas blob failed'));
          }, 'image/jpeg', 0.9);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Save profile
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let avatarUrl = user.avatar;

      if (selectedFile) {
        // Crop to square
        const croppedBlob = await cropToSquare(selectedFile);
        const formData = new FormData();
        formData.append('image', croppedBlob, 'avatar.jpg');

        const token = localStorage.getItem('cdToken');
        const response = await fetch('https://cyberdope-api.onrender.com/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        avatarUrl = data.data?.url;
      }

      // Save to profile
      onSave({
        bio,
        avatar: avatarUrl !== user.avatar ? avatarUrl : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border-2 border-[#39FF14] shadow-[0_0_50px_rgba(57,255,20,0.2)] rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#39FF14] font-bold text-lg">EDIT PROFILE</h2>
          <button
            onClick={onClose}
            className="text-[#39FF14]/50 hover:text-[#39FF14] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Avatar */}
        <div className="mb-6">
          <label className="block text-[#39FF14] font-mono text-xs uppercase mb-3">
            Profile Picture
          </label>
          <div className="relative w-32 h-32 mx-auto">
            <img
              src={previewUrl}
              alt="avatar"
              className="w-full h-full rounded border-2 border-[#39FF14] object-cover"
            />
            <label className="absolute inset-0 rounded border-2 border-[#39FF14] opacity-0 hover:opacity-100 bg-black/50 flex items-center justify-center cursor-pointer transition-opacity">
              <Upload size={24} className="text-[#39FF14]" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {selectedFile ? '✓ Image selected' : 'Click to change'}
          </p>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-[#39FF14] font-mono text-xs uppercase mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            className="w-full h-24 bg-black border border-gray-700 text-white text-sm p-3 rounded focus:border-[#39FF14] outline-none resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-gray-400 mt-1">{bio.length}/150</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-700 text-gray-400 rounded font-bold hover:border-red-500 hover:text-red-500 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2 bg-[#39FF14] text-black rounded font-bold hover:bg-[#39FF14]/80 disabled:opacity-50 transition-all"
          >
            {isSaving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
