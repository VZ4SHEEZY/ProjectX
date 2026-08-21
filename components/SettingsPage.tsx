
import React, { useState } from 'react';
import { 
  X, User, Bell, Shield, Wallet, Palette, Globe, 
  Lock, Eye, EyeOff, Moon, Sun, ChevronRight, 
  Check, AlertTriangle, Download, Trash2, LogOut,
  Key, Fingerprint, Mail, Smartphone
} from 'lucide-react';
import GlitchButton from './GlitchButton';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    email?: string;
    bio?: string;
    isAgeVerified?: boolean;
  };
  onVerify: (status: boolean) => void;
}

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'wallet' | 'appearance' | 'advanced';

const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose, currentUser, onVerify }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Profile settings
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Notification settings
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [tipAlerts, setTipAlerts] = useState(true);
  const [subAlerts, setSubAlerts] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  
  // Privacy settings
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowDMs, setAllowDMs] = useState(true);
  const [showWallet, setShowWallet] = useState(false);
  
  // Appearance settings
  const [darkMode, setDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  if (!isOpen) return null;

  const handleSave = () => {
    // In real app, save to backend
    console.log('Saving settings...');
    onClose();
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
    setShowDeleteConfirm(false);
    onClose();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'advanced', label: 'Advanced', icon: Key },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-4xl mx-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <Key className="text-[#39FF14]" size={20} />
            </div>
            <h2 className="text-white font-bold text-xl">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-800 hidden md:block overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-[#39FF14]/10 text-[#39FF14] border-r-2 border-[#39FF14]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Tab Selector */}
          <div className="md:hidden w-full border-b border-gray-800 overflow-x-auto flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'text-[#39FF14] border-b-2 border-[#39FF14]' 
                    : 'text-gray-400'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Profile Information</h3>
                
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#39FF14] to-[#FF00FF] flex items-center justify-center text-3xl">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-[#39FF14] text-black text-sm font-bold rounded-lg hover:bg-white transition-colors">
                      Change Avatar
                    </button>
                    <p className="text-gray-500 text-xs mt-2">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className="text-gray-400 text-sm">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#39FF14]"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-gray-400 text-sm">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]"
                  />
                  <p className="text-gray-500 text-xs">Used for notifications and account recovery</p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-gray-400 text-sm">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14] resize-none h-24"
                  />
                  <p className="text-gray-500 text-xs text-right">{bio.length}/500</p>
                </div>

                {/* Private Account */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Private Account</p>
                    <p className="text-gray-500 text-sm">Only approved followers can see your content</p>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      isPrivate ? 'bg-[#39FF14]' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      isPrivate ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Notification Preferences</h3>
                
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive updates via email', state: emailNotifs, setState: setEmailNotifs, icon: Mail },
                  { id: 'push', label: 'Push Notifications', desc: 'Browser and mobile notifications', state: pushNotifs, setState: setPushNotifs, icon: Smartphone },
                  { id: 'tips', label: 'Tip Alerts', desc: 'When someone sends you a tip', state: tipAlerts, setState: setTipAlerts, icon: Wallet },
                  { id: 'subs', label: 'Subscription Alerts', desc: 'New subscribers and renewals', state: subAlerts, setState: setSubAlerts, icon: User },
                  { id: 'mentions', label: 'Mentions', desc: 'When someone mentions you', state: mentionAlerts, setState: setMentionAlerts, icon: Bell },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="text-gray-500" />
                      <div>
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-gray-500 text-sm">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => item.setState(!item.state)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        item.state ? 'bg-[#39FF14]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        item.state ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Privacy & Security</h3>
                
                {/* Age Verification */}
                <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="text-pink-500" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Age Verification</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {currentUser.isAgeVerified 
                          ? '✅ You are verified to view 18+ content'
                          : 'Verify your age to access adult content'
                        }
                      </p>
                      {!currentUser.isAgeVerified && (
                        <button 
                          onClick={() => onVerify(true)}
                          className="mt-3 px-4 py-2 bg-pink-500 text-white text-sm font-bold rounded-lg hover:bg-pink-600 transition-colors"
                        >
                          Verify Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Two-Factor Auth */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fingerprint size={18} className="text-gray-500" />
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-gray-500 text-sm">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-gray-700 text-gray-400 text-sm rounded-lg hover:text-white hover:border-white transition-colors">
                    Enable
                  </button>
                </div>

                {/* Blocked Users */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-gray-500" />
                    <div>
                      <p className="text-white font-medium">Blocked Users</p>
                      <p className="text-gray-500 text-sm">Manage who can interact with you</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">0 blocked</span>
                    <ChevronRight size={18} className="text-gray-500" />
                  </div>
                </div>

                {/* Show Online Status */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Eye size={18} className="text-gray-500" />
                    <div>
                      <p className="text-white font-medium">Show Online Status</p>
                      <p className="text-gray-500 text-sm">Let others see when you're active</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      showOnlineStatus ? 'bg-[#39FF14]' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      showOnlineStatus ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* WALLET TAB */}
            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Connected Wallets</h3>
                
                <div className="p-4 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">🦊</div>
                    <div className="flex-1">
                      <p className="text-white font-medium">MetaMask</p>
                      <p className="text-gray-400 text-sm font-mono">0x1234...5678</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                      <span className="text-[#39FF14] text-xs">Connected</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">ETH Balance</p>
                      <p className="text-white font-mono font-bold">2.4567 ETH</p>
                      <p className="text-gray-500 text-xs">~$8,598.45</p>
                    </div>
                    <div className="bg-black/50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">USDC Balance</p>
                      <p className="text-white font-mono font-bold">1,250.00 USDC</p>
                      <p className="text-gray-500 text-xs">~$1,250.00</p>
                    </div>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-gray-700 text-gray-500 rounded-lg hover:border-[#39FF14] hover:text-[#39FF14] transition-colors">
                  <Wallet size={18} />
                  Connect Another Wallet
                </button>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Appearance</h3>
                
                {/* Theme */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon size={18} className="text-gray-500" /> : <Sun size={18} className="text-yellow-500" />}
                    <div>
                      <p className="text-white font-medium">Dark Mode</p>
                      <p className="text-gray-500 text-sm">Easier on the eyes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      darkMode ? 'bg-[#39FF14]' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      darkMode ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <label className="text-gray-400 text-sm">Font Size</label>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          fontSize === size 
                            ? 'bg-[#39FF14] text-black' 
                            : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Reduced Motion</p>
                    <p className="text-gray-500 text-sm">Minimize animations</p>
                  </div>
                  <button
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      reducedMotion ? 'bg-[#39FF14]' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      reducedMotion ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-white font-bold text-lg mb-4">Advanced Settings</h3>
                
                {/* Data Export */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Download size={18} className="text-gray-500" />
                    <div>
                      <p className="text-white font-medium">Download Your Data</p>
                      <p className="text-gray-500 text-sm">Export all your content and information</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-500" />
                </div>

                {/* Language */}
                <div className="flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-gray-500" />
                    <div>
                      <p className="text-white font-medium">Language</p>
                      <p className="text-gray-500 text-sm">English (US)</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-500" />
                </div>

                {/* Delete Account */}
                <div className="mt-8 pt-8 border-t border-gray-800">
                  <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div>
                      <p className="text-red-500 font-medium">Delete Account</p>
                      <p className="text-gray-500 text-sm">This action cannot be undone</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/50 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <GlitchButton onClick={handleSave}>
            Save Changes
          </GlitchButton>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur flex items-center justify-center z-10">
            <div className="bg-[#0a0a0a] border border-red-500/50 rounded-2xl p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-500" size={24} />
                <h3 className="text-white font-bold text-lg">Delete Account?</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                This will permanently delete your account, all your content, and any earnings. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-lg hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
