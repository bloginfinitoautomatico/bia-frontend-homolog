import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Cloud, Server, Loader2 } from './icons';

interface ConnectivityStatusProps {
  className?: string;
}

export function ConnectivityStatus({ className = '' }: ConnectivityStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexão com internet restaurada');
      setIsOnline(true);
      checkApiStatus();
    };

    const handleOffline = () => {
      console.log('🚫 Conexão com internet perdida');
      setIsOnline(false);
      setApiStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check API status on mount
    checkApiStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check API connectivity
  const checkApiStatus = async () => {
    if (!isOnline) {
      setApiStatus('offline');
      return;
    }

    setApiStatus('checking');
    setLastSyncAttempt(new Date());

    try {
      const apiBase = import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com';
      
      const response = await fetch(`${apiBase}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        console.log('✅ API disponível');
        setApiStatus('online');
      } else {
        console.warn('⚠️ API indisponível - servidor com problemas');
        setApiStatus('offline');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar API:', error);
      setApiStatus('offline');
    }
  };

  // Auto-check API status every 30 seconds if offline
  useEffect(() => {
    if (apiStatus === 'offline' && isOnline) {
      const interval = setInterval(checkApiStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [apiStatus, isOnline]);

  // Render status badge
  const renderStatus = () => {
    if (!isOnline) {
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200">
          <WifiOff className="mr-1 h-3 w-3" />
          Offline
        </Badge>
      );
    }

    switch (apiStatus) {
      case 'checking':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verificando...
          </Badge>
        );
      case 'online':
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-200">
            <Cloud className="mr-1 h-3 w-3" />
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge 
            className="bg-orange-100 text-orange-800 border border-orange-200 cursor-pointer"
            onClick={checkApiStatus}
            title="Clique para tentar reconectar"
          >
            <Server className="mr-1 h-3 w-3" />
            Modo Local
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {renderStatus()}
      {lastSyncAttempt && apiStatus === 'offline' && (
        <span className="text-xs text-gray-500">
          Última tentativa: {lastSyncAttempt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}