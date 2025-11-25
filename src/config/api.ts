// Configuração da API - função base para obter URL do backend
function getBaseApiUrl(): string {
  // Verifica se estamos em desenvolvimento
  const isDevelopment = import.meta.env.DEV || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    return 'http://localhost:8000';
  }
  
  // Em produção, usar o domínio customizado do backend
  const productionApiUrl = 'https://api.bloginfinitoautomatico.com';
  
  // Tentar usar variável de ambiente, mas sempre fallback para domínio customizado
  const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
  const finalUrl = envBackendUrl ? envBackendUrl.replace(/\/$/, '') : productionApiUrl;
  
  // Log para debug
  console.log('🔧 Ambiente detectado:', isDevelopment ? 'desenvolvimento' : 'produção');
  console.log('🔧 Backend URL do .env:', envBackendUrl);
  console.log('🔧 API Base URL configurada:', finalUrl);
  
  return finalUrl;
}

// Função helper para construir URLs de endpoints (sem /api)
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getBaseApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

// Função principal - constrói URL da API com endpoint (adiciona /api automaticamente)
export function getApiUrl(endpoint?: string): string {
  const baseUrl = getBaseApiUrl();
  
  if (!endpoint) {
    return baseUrl;
  }
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/api/${cleanEndpoint}`;
}

export const API_CONFIG = {
  timeout: 30000, // 30 segundos
  retries: 3,
  baseURL: getApiUrl()
};
