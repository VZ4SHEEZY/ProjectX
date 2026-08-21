
import React from 'react';
import { Box } from 'lucide-react';

const MOCK_ASSETS = [
  { id: 1, img: 'https://picsum.photos/seed/nft1/100', name: 'Neuro_Chip_V1' },
  { id: 2, img: 'https://picsum.photos/seed/nft2/100', name: 'Cyber_Skull' },
  { id: 3, img: 'https://picsum.photos/seed/nft3/100', name: 'Glitch_Blade' },
  { id: 4, img: 'https://picsum.photos/seed/nft4/100', name: 'Data_Fragment' },
];

const AssetGalleryWidget: React.FC = () => {
  return (
    <div className="w-full h-full bg-black/60 backdrop-blur-md border border-cyan-500/50 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-cyan-900/20 border-b border-cyan-500/30">
        <div className="flex items-center gap-2 text-cyan-400">
           <Box size={14} />
           <span className="font-mono font-bold text-[10px] tracking-widest uppercase">Asset_Cache</span>
        </div>
        <div className="text-[8px] text-cyan-600 font-mono">ETH_MAINNET</div>
      </div>

      {/* Hex Grid */}
      <div className="flex-1 p-3 flex flex-wrap content-start gap-2 overflow-y-auto">
        {MOCK_ASSETS.map(asset => (
          <div key={asset.id} className="relative group w-16 h-16 cursor-pointer">
            {/* Hexagon Clip Path */}
            <div 
              className="w-full h-full bg-gray-800 hover:bg-cyan-400 transition-colors p-[1px]"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
               <img 
                 src={asset.img} 
                 alt={asset.name} 
                 className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                 style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
               />
            </div>
            
            {/* Tooltip */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black border border-cyan-500 text-cyan-500 text-[8px] px-2 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
               {asset.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetGalleryWidget;
