// Utilitário para obter URL da API baseado no ambiente
// Este arquivo centraliza a lógica de detecção de ambiente

/**
 * Obtém a URL da API baseado no ambiente atual
 */
export function getApiUrl(): string {
  // Usar variável de ambiente se definida
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Usando VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detectar baseado no hostname
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    
    console.log('🌍 Detectando ambiente:', { hostname, protocol });
    
    // Produção principal
    if (hostname.includes('bloginfinitoautomatico.com')) {
      const apiUrl = 'https://api.bloginfinitoautomatico.com';
      console.log('🚀 Ambiente de PRODUÇÃO detectado:', apiUrl);
      return apiUrl;
    }
    
    // VPS customizada (EasyPanel)
    if (hostname.includes('easypanel.host') || hostname.includes('dutk9f')) {
      const apiUrl = 'https://bia-web-backend.dutk9f.easypanel.host';
      console.log('🚀 Ambiente VPS detectado:', apiUrl);
      return apiUrl;
    }
    
    // Desenvolvimento local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const apiUrl = 'http://localhost:8000';
      console.log('🛠️ Ambiente de DESENVOLVIMENTO detectado:', apiUrl);
      return apiUrl;
    }
    
    // Outros ambientes de desenvolvimento (ex: Gitpod, CodeSandbox)
    if (hostname.includes('gitpod.io') || hostname.includes('codesandbox.io')) {
      // Para estes ambientes, usar a variável de ambiente
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log('🛠️ Ambiente de desenvolvimento em nuvem:', apiUrl);
      return apiUrl;
    }
  }
  
  // Fallback padrão
  console.log('⚠️ Usando fallback padrão: http://localhost:8000');
  return 'http://localhost:8000';
}

/**
 * Obtém a URL do backend (alias para getApiUrl)
 */
export function getBackendUrl(): string {
  // Primeiro tentar VITE_BACKEND_URL específico
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Fallback para API URL padrão
  return getApiUrl();
}

/**
 * Verifica se está em ambiente de produção
 */
export function isProduction(): boolean {
  if (import.meta.env.PROD) {
    return true;
  }
  
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    return hostname.includes('bloginfinitoautomatico.com') || 
           hostname.includes('easypanel.host');
  }
  
  return false;
}

/**
 * Verifica se está em ambiente de desenvolvimento
 */
export function isDevelopment(): boolean {
  return !isProduction();
}

/**
 * Obtém configurações específicas do ambiente
 */
export function getEnvironmentConfig() {
  return {
    apiUrl: getApiUrl(),
    backendUrl: getBackendUrl(),
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    environment: isProduction() ? 'production' : 'development'
  };
}

// Log da configuração atual (apenas em desenvolvimento)
if (isDevelopment()) {
  console.log('🔧 Configuração do ambiente:', getEnvironmentConfig());
}
