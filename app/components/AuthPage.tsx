import React, { useState, useEffect, useRef } from 'react';
import { Shield, Terminal, Lock, Cpu, Eye, Zap } from 'lucide-react';
import GlitchButton from './GlitchButton';

interface AuthPageProps {
  onLoginSuccess: (isNewUser: boolean) => void;
}

type AuthStatus = 'idle' | 'handshake' | 'verifying' | 'granted' | 'error';

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [netId, setNetId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorFlash, setErrorFlash] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '01234567890123456789';
    const emojis = '😀😎🤖👽💀👻🤡💻📱💾🔋⚡🔥💎💰🗝️🔓🔒🧬🧿🔮💊🌐🛸🚀🛰️🌙⭐☀️🌍🌌';
    const cyberSymbols = '▲▼◆■□●○★☆♦♠♣♥ΨΩΔΣΘΞΛΠΦ$€£¥#@&%*!?<>[]{}|/\\=+-_~^`';
    const combinedChars = letters + numbers + emojis + cyberSymbols;
    const charArray = Array.from(combinedChars);
    const fontSize = 18;
    const columns = canvas.width / fontSize;
    const drops: number[] = new Array(Math.ceil(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const isLeading = Math.random() > 0.96;
        const isCyan = Math.random() > 0.85;

        if (isLeading) {
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00FFFF';
        } else if (isCyan) {
          ctx.fillStyle = '#00FFFF';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#00FFFF';
        } else {
          ctx.fillStyle = '#39FF14';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!netId || !accessKey) {
      triggerError('MISSING_CREDENTIALS');
      return;
    }
    startHandshake();
  };

  const triggerError = (msg: string) => {
    setStatus('error');
    setErrorFlash(true);
    setTimeout(() => setErrorFlash(false), 200);
    setTimeout(() => setStatus('idle'), 2000);
  };

  const startHandshake = async () => {
    setStatus('handshake');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: netId, password: accessKey }
        : { username: netId, email: netId, password: accessKey };
      const res = await fetch(`https://cyberdope-api.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        triggerError(data.error || 'AUTH_FAILED');
        return;
      }
      localStorage.setItem('cdToken', data.token);
      localStorage.setItem('cdUser', JSON.stringify(data.user));
      setStatus('verifying');
      setTimeout(() => setStatus('granted'), 1500);
      setTimeout(() => onLoginSuccess(mode === 'register'), 2500);
    } catch (err) {
      triggerError('CONNECTION_FAILED');
    }
  };

  return (
    <div className={`relative w-full h-screen bg-black overflow-hidden flex items-center justify-center font-mono ${bootSequence ? 'brightness-0' : 'brightness-100'} transition-all duration-[2000ms]`}>
      
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-105"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1542385151-efd90007e2a7?q=80&w=2574&auto=format&fit=crop')",
          filter: 'contrast(1.2) brightness(0.6) saturate(1.2)'
        }}
      />

      <div className="absolute inset-0 z-10 mix-blend-screen opacity-80 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,_transparent_10%,_#000000_100%)] opacity-90" />
      <div className={`absolute inset-0 bg-red-600 z-50 pointer-events-none mix-blend-overlay transition-opacity duration-100 ${errorFlash ? 'opacity-50' : 'opacity-0'}`} />

      <div className="relative z-30 w-full max-w-md p-6 animate-in zoom-in-95 duration-1000">
        <div className="relative bg-black/40 backdrop-blur-xl border border-[#39FF14]/30 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] clip-path-polygon overflow-hidden group">
          
          <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_5s_infinite]" />

          <div className="flex justify-between items-start mb-8 border-b border-[#39FF14]/20 pb-4">
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                CYBER<span className="text-[#39FF14]">DOPE</span>
              </h1>
              <div className="flex gap-2 text-[10px] text-[#39FF14] font-bold tracking-widest mt-1">
                <span>EST. 2077</span>
                <span>//</span>
                <span className="animate-pulse">SYSTEM_ONLINE</span>
              </div>
            </div>
            <Cpu className={`w-8 h-8 text-[#39FF14] ${status === 'verifying' ? 'animate-spin' : ''}`} />
          </div>

          <div className="flex bg-black/50 p-1 mb-6 rounded-sm">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-bold tracking-widest transition-all ${mode === 'login' ? 'bg-[#39FF14] text-black shadow-[0_0_15px_#39FF14]' : 'text-gray-500 hover:text-white'}`}
            >
              LINK_IN
            </button>
            <button 
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-xs font-bold tracking-widest transition-all ${mode === 'register' ? 'bg-[#FF00FF] text-black shadow-[0_0_15px_#FF00FF]' : 'text-gray-500 hover:text-white'}`}
            >
              INITIALIZE
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={12} /> Net_Identity (ID)
              </label>
              <input 
                type="text" 
                value={netId} 
                onChange={(e) => setNetId(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 text-[#39FF14] font-bold font-mono py-3 px-4 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_15px_rgba(57,255,20,0.2)] transition-all placeholder-gray-800"
                placeholder="USER_HANDLE or EMAIL"
                disabled={status !== 'idle' && status !== 'error'}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} /> Access_Key (PW)
              </label>
              <input 
                type="password" 
                value={accessKey} 
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-black/60 border border-gray-700 text-[#FF00FF] font-bold font-mono py-3 px-4 focus:outline-none focus:border-[#FF00FF] focus:shadow-[0_0_15px_rgba(255,0,255,0.2)] transition-all placeholder-gray-800"
                placeholder="••••••••"
                disabled={status !== 'idle' && status !== 'error'}
              />
            </div>

            {status === 'idle' || status === 'error' ? (
              <GlitchButton type="submit" fullWidth className="h-14 text-lg mt-2">
                {mode === 'login' ? 'ESTABLISH LINK' : 'CREATE NODE'}
              </GlitchButton>
            ) : (
              <div className="h-14 mt-2 border border-[#39FF14] bg-[#39FF14]/10 flex items-center justify-center font-bold tracking-widest text-[#39FF14] animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#39FF1422_10px,#39FF1422_20px)] animate-[spin_4s_linear_infinite]" />
                <span className="relative z-10">
                  {status === 'handshake' && "HANDSHAKE..."}
                  {status === 'verifying' && "VERIFYING BIOMETRICS..."}
                  {status === 'granted' && "ACCESS GRANTED"}
                </span>
              </div>
            )}
          </form>

          <div className="mt-6 flex justify-between items-center text-[9px] text-gray-500 font-mono">
            <span>SECURE_PORT: 443</span>
            <span>ENCRYPTION: AES-256</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
