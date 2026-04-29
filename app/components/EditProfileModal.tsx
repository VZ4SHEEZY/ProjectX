import React, { useState } from 'react';
import { User } from '../types';
import { X, Upload } from 'lucide-react';
import axios from 'axios';
import { userAPI } from '../services/api';

interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSave: (updates: { bio?: string; avatar?: string }) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, user, onClose, onSave }) => {
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('cdToken');
      const response = await axios.post(
        'https://cyberdope-api.onrender.com/api/upload/image',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setAvatar(response.data.data.secure_url);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave({
        bio,
        avatar: avatar !== user.avatar ? avatar : undefined,
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

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-[#39FF14] font-mono text-xs uppercase mb-3">
            Profile Picture
          </label>
          <div className="relative">
            <img
              src={avatar}
              alt="avatar preview"
              className="w-32 h-32 rounded border-2 border-[#39FF14] object-cover mx-auto"
            />
            <label className="absolute bottom-0 right-1/2 translate-x-16 bg-[#39FF14] text-black p-2 rounded cursor-pointer hover:bg-[#39FF14]/80 transition-all">
              <Upload size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {uploading && <p className="text-xs text-gray-400 mt-2 text-center">Uploading...</p>}
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-[#39FF14] font-mono text-xs uppercase mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
            disabled={isSaving || uploading}
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
