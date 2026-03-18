import React from 'react';
import { Home, User, Radio, Box } from 'lucide-react';

interface NavbarProps {
  currentView: 'feed' | 'profile';
  setView: (view: 'feed' | 'profile') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-black border-t border-[#39FF14]/20 h-16 flex items-center justify-around pb-2">
       <button 
         onClick={() => setView('feed')}
         className={`flex flex-col items-center gap-1 ${currentView === 'feed' ? 'text-[#39FF14] drop-shadow-[0_0_5px_rgba(57,255,20,0.8)]' : 'text-gray-600'}`}
       >
         <Home size={24} />
         <span className="text-[9px]">FEED</span>
       </button>
       
       <div className="relative -top-5">
         <button className="w-14 h-14 bg-[#FF00FF] rotate-45 border-2 border-white flex items-center justify-center shadow-[0_0_15px_#FF00FF]">
            <div className="-rotate-45 text-black font-bold">
                <Radio size={24} />
            </div>
         </button>
       </div>

       <button 
         onClick={() => setView('profile')}
         className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-[#39FF14] drop-shadow-[0_0_5px_rgba(57,255,20,0.8)]' : 'text-gray-600'}`}
       >
         <User size={24} />
         <span className="text-[9px]">HOLO-DECK</span>
       </button>
    </div>
  );
};

export default Navbar;