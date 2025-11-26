// Configuração da API - função base para obter URL do backend
function getBaseApiUrl(): string {
  const envBackendUrl = (import.meta.env.VITE_BACKEND_URL as string) || (import.meta.env.VITE_API_URL as string);
  const sameOrigin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  // Preferir variável de ambiente quando definida; caso contrário, usar o mesmo domínio do frontend
  const finalUrl = (envBackendUrl ? envBackendUrl.replace(/\/$/, '') : (sameOrigin || 'http://127.0.0.1:8000'));

  // Log para debug
  console.log('🔧 Backend URL (.env ou same-origin):', envBackendUrl || sameOrigin);
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
