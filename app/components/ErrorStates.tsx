
import React from 'react';
import { 
  AlertTriangle, WifiOff, RefreshCw, X, Server, 
  Lock, FileX, Search, Frown, Home, ArrowLeft
} from 'lucide-react';
import GlitchButton from './GlitchButton';

interface ErrorStateProps {
  onRetry?: () => void;
  onBack?: () => void;
  onHome?: () => void;
}

// Network Error
export const NetworkError: React.FC<ErrorStateProps> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
      <WifiOff className="text-red-500" size={40} />
    </div>
    <h3 className="text-white font-bold text-xl mb-2">Connection Lost</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      Unable to connect to the server. Please check your internet connection and try again.
    </p>
    <div className="flex gap-3">
      {onRetry && (
        <GlitchButton onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </GlitchButton>
      )}
    </div>
  </div>
);

// Server Error
export const ServerError: React.FC<ErrorStateProps> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
      <Server className="text-orange-500" size={40} />
    </div>
    <h3 className="text-white font-bold text-xl mb-2">Server Error</h3>
    <p className="text-gray-500 text-sm mb-2">Error Code: 500</p>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      Something went wrong on our end. We're working to fix it.
    </p>
    <div className="flex gap-3">
      {onRetry && (
        <GlitchButton onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Retry
        </GlitchButton>
      )}
    </div>
  </div>
);

// Not Found Error
export const NotFoundError: React.FC<ErrorStateProps & { item?: string }> = ({ onBack, onHome, item = 'Page' }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <FileX className="text-gray-500" size={40} />
    </div>
    <h3 className="text-white font-bold text-xl mb-2">{item} Not Found</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      The {item.toLowerCase()} you're looking for doesn't exist or has been removed.
    </p>
    <div className="flex gap-3">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-white transition-colors"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      )}
      {onHome && (
        <GlitchButton onClick={onHome}>
          <Home size={16} className="mr-2" />
          Home
        </GlitchButton>
      )}
    </div>
  </div>
);

// Access Denied
export const AccessDenied: React.FC<ErrorStateProps> = ({ onBack, onHome }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
    <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-4">
      <Lock className="text-pink-500" size={40} />
    </div>
    <h3 className="text-white font-bold text-xl mb-2">Access Denied</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      You don't have permission to view this content. It may be private or require verification.
    </p>
    <div className="flex gap-3">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 rounded-lg hover:text-white hover:border-white transition-colors"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      )}
      {onHome && (
        <GlitchButton onClick={onHome}>
          <Home size={16} className="mr-2" />
          Home
        </GlitchButton>
      )}
    </div>
  </div>
);

// Empty State
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = Search, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <Icon className="text-gray-500" size={28} />
    </div>
    <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">{description}</p>
    {action && (
      <GlitchButton onClick={action.onClick}>
        {action.label}
      </GlitchButton>
    )}
  </div>
);

// Upload Error
export const UploadError: React.FC<ErrorStateProps & { error?: string }> = ({ onRetry, error }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
    <AlertTriangle className="text-red-500 mb-3" size={32} />
    <h3 className="text-white font-bold mb-2">Upload Failed</h3>
    <p className="text-gray-400 text-sm mb-4">
      {error || 'Something went wrong while uploading. Please try again.'}
    </p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        <RefreshCw size={16} />
        Retry Upload
      </button>
    )}
  </div>
);

// Payment Error
export const PaymentError: React.FC<ErrorStateProps & { error?: string }> = ({ onRetry, error }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
      <Frown className="text-red-500" size={32} />
    </div>
    <h3 className="text-white font-bold text-lg mb-2">Payment Failed</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      {error || 'Your payment could not be processed. Please check your balance and try again.'}
    </p>
    {onRetry && (
      <GlitchButton onClick={onRetry}>
        Try Again
      </GlitchButton>
    )}
  </div>
);

// Wallet Error
export const WalletError: React.FC<ErrorStateProps & { error?: string }> = ({ onRetry, error }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
      <AlertTriangle className="text-yellow-500" size={32} />
    </div>
    <h3 className="text-white font-bold text-lg mb-2">Wallet Error</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">
      {error || 'Could not connect to your wallet. Please make sure it is unlocked and try again.'}
    </p>
    <div className="flex gap-3">
      {onRetry && (
        <GlitchButton onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Retry Connection
        </GlitchButton>
      )}
    </div>
  </div>
);

// Toast Notification
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const colors = {
    success: 'bg-[#39FF14] text-black',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 ${colors[type]}`}>
      <span className="font-medium text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Error Boundary Fallback
export const ErrorBoundaryFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
      <AlertTriangle className="text-red-500" size={48} />
    </div>
    <h1 className="text-white font-bold text-2xl mb-2">Something Went Wrong</h1>
    <p className="text-gray-500 mb-4">The application encountered an unexpected error.</p>
    <div className="bg-gray-900 rounded-lg p-4 mb-6 max-w-lg overflow-auto">
      <code className="text-red-400 text-sm">{error.message}</code>
    </div>
    <GlitchButton onClick={resetErrorBoundary}>
      <RefreshCw size={16} className="mr-2" />
      Reload Application
    </GlitchButton>
  </div>
);

export default {
  NetworkError,
  ServerError,
  NotFoundError,
  AccessDenied,
  EmptyState,
  UploadError,
  PaymentError,
  WalletError,
  Toast,
  ErrorBoundaryFallback
};
