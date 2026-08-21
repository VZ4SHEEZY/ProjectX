import React from 'react';

interface GlitchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

const GlitchButton: React.FC<GlitchButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "relative uppercase font-bold text-sm tracking-widest transition-all duration-100 ease-in-out border hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14] hover:text-black",
    danger: "border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black hover:shadow-[0_0_15px_rgba(255,0,255,0.5)]",
    ghost: "border-gray-700 text-gray-500 hover:border-white hover:text-white"
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${fullWidth ? 'w-full' : ''} 
        px-6 py-3 
        clip-path-polygon
        ${className}
      `}
      style={{
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

export default GlitchButton;