import React from 'react';
import { X, Heart, Cpu, AlertTriangle, Trash2, Bell } from 'lucide-react';

interface NotificationStreamProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotificationType = 'social' | 'economy' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'economy', message: 'You received a tip: 0.05 ETH from @Neo.', timestamp: '2m ago', read: false },
  { id: 'n2', type: 'social', message: 'Trinity liked your video "Mainframe Breach".', timestamp: '15m ago', read: false },
  { id: 'n3', type: 'system', message: 'The Neon Jackals have seized territory in Sector 4.', timestamp: '1h ago', read: true },
  { id: 'n4', type: 'social', message: 'Morpheus commented on your profile.', timestamp: '3h ago', read: true },
  { id: 'n5', type: 'economy', message: 'Transaction Complete: 0.01 ETH sent.', timestamp: '5h ago', read: true },
];

const NotificationStream: React.FC<NotificationStreamProps> = ({ isOpen, onClose }) => {
  
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'social': return <Heart size={16} className="text-[#FF00FF] fill-[#FF00FF]" />;
      case 'economy': return <Cpu size={16} className="text-yellow-400 animate-pulse" />;
      case 'system': return <AlertTriangle size={16} className="text-red-500" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'social': return 'border-[#FF00FF]/50 hover:border-[#FF00FF]';
      case 'economy': return 'border-yellow-400/50 hover:border-yellow-400';
      case 'system': return 'border-red-500/50 hover:border-red-500';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`
           fixed top-0 right-0 h-full w-80 bg-[#050505]/95 backdrop-blur-xl z-[100] border-l border-[#39FF14]/30 shadow-[-20px_0_50px_rgba(0,0,0,0.8)]
           transition-transform duration-300 ease-out transform
           ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="h-16 border-b border-[#39FF14]/30 flex items-center justify-between px-6 bg-[#39FF14]/5">
           <div className="flex items-center gap-2 text-[#39FF14]">
              <Bell className="animate-swing" size={16} />
              <span className="font-mono font-bold tracking-widest text-xs uppercase">Neural Stream</span>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-gray-800 flex justify-end">
           <button className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors font-mono uppercase tracking-wider">
              <Trash2 size={12} /> Purge Logs
           </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto h-[calc(100%-8rem)] p-4 space-y-3">
           <h3 className="text-gray-500 text-[9px] font-mono uppercase tracking-widest mb-2">Incoming Data Packets</h3>
           
           {MOCK_NOTIFICATIONS.map(notif => (
             <div 
                key={notif.id}
                className={`
                   relative p-4 border bg-black/40 backdrop-blur-md rounded-sm cursor-pointer transition-all group
                   ${getBorderColor(notif.type)}
                   ${!notif.read ? 'bg-white/5' : ''}
                `}
             >
                {!notif.read && (
                   <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                )}
                
                <div className="flex items-start gap-3">
                   <div className={`p-2 rounded-full border border-gray-700 bg-black group-hover:scale-110 transition-transform`}>
                      {getIcon(notif.type)}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs text-gray-200 font-mono leading-relaxed group-hover:text-white transition-colors">
                         {notif.message}
                      </p>
                      <span className="text-[9px] text-gray-600 mt-1 block font-mono">{notif.timestamp}</span>
                   </div>
                </div>

                {/* Glass Glare Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
             </div>
           ))}
        </div>

      </div>
    </>
  );
};

export default NotificationStream;