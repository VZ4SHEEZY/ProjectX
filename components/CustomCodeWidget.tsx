
import React, { useState } from 'react';
import { Code, Eye, AlertTriangle } from 'lucide-react';

interface CustomCodeWidgetProps {
  initialCode?: string;
}

const DEFAULT_CODE = `
<marquee scrollamount="10" style="color: #39FF14; font-family: monospace; font-size: 20px; font-weight: bold;">
  *** WELCOME TO THE VOID *** HACK THE PLANET ***
</marquee>
<div style="text-align: center; margin-top: 20px;">
  <button style="background: #FF00FF; border: none; color: black; padding: 10px 20px; font-weight: bold; cursor: pointer;">
    CLICK_ME
  </button>
</div>
`;

const CustomCodeWidget: React.FC<CustomCodeWidgetProps> = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="w-full h-full bg-black border border-dashed border-gray-700 relative group overflow-hidden">
      
      {/* Editor Overlay */}
      {isEditing ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-black">
           <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
              <span className="text-[9px] font-mono text-gray-400 flex items-center gap-2">
                 <Code size={12} /> RAW_HTML_EDITOR
              </span>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs text-[#39FF14] hover:text-white font-bold"
              >
                DONE
              </button>
           </div>
           <textarea 
             value={code}
             onChange={(e) => setCode(e.target.value)}
             className="flex-1 w-full bg-[#111] text-gray-300 font-mono text-xs p-2 focus:outline-none resize-none"
             placeholder="<div>Enter HTML...</div>"
           />
        </div>
      ) : (
        <>
           {/* Rendered Content */}
           <div 
             className="w-full h-full overflow-hidden"
             dangerouslySetInnerHTML={{ __html: code }}
           />
           
           {/* Edit Trigger */}
           <button 
             onClick={() => setIsEditing(true)}
             className="absolute top-2 right-2 p-1 bg-black/50 text-gray-500 hover:text-white border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
             title="Edit Code"
           >
              <Code size={14} />
           </button>
           
           {/* Warning Label */}
           <div className="absolute bottom-1 right-1 text-[8px] text-gray-800 font-mono pointer-events-none group-hover:opacity-0 transition-opacity">
              CUSTOM_SCRIPT
           </div>
        </>
      )}
    </div>
  );
};

export default CustomCodeWidget;
