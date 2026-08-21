import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://cyberdope-api.onrender.com';

interface Announcement {
  _id: string;
  message: string;
  mediaUrl?: string;
  createdBy: { username: string; avatar: string };
}

const AnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const token = localStorage.getItem('cdToken');
      if (!token) {
        console.log('No token, skipping announcement fetch');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        'https://cyberdope-api.onrender.com/api/announcements/latest',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Announcement response:', response.data);
      if (response.data.success && response.data.data) {
        setAnnouncement(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!announcement) return;

    try {
      const token = localStorage.getItem('cdToken');
      await axios.post(
        `https://cyberdope-api.onrender.com/api/announcements/${announcement._id}/dismiss`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAnnouncement(null);
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  if (!announcement || loading) return null;

  return (
    <div className="bg-gradient-to-r from-[#39FF14]/20 to-[#FF00FF]/20 border-b border-[#39FF14]/50 p-4">
      <div className="max-w-6xl mx-auto flex items-start gap-4">
        <Bell size={20} className="text-[#39FF14] flex-shrink-0 mt-1" />
        
        <div className="flex-1 min-w-0">
          <p className="text-[#39FF14] font-bold text-sm uppercase">ANNOUNCEMENT</p>
          <p className="text-white mt-1">{announcement.message}</p>
          {announcement.mediaUrl && (
            <div className="mt-3">
              {announcement.mediaUrl.includes('video') ? (
                <video
                  src={announcement.mediaUrl}
                  controls
                  className="max-w-full max-h-64 rounded border border-[#39FF14]/30"
                />
              ) : (
                <img
                  src={announcement.mediaUrl}
                  alt="announcement"
                  className="max-w-full max-h-64 rounded border border-[#39FF14]/30"
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-[#39FF14] transition-colors mt-1"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
