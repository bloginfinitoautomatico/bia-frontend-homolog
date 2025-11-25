// Utilitários auxiliares para componentes admin
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Não informado';
  try {
    return new Date(dateString).toLocaleString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

export const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return 'Nunca';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  } catch {
    return 'Data inválida';
  }
};

export const isRecentActivity = (dateString: string | undefined, daysThreshold: number = 30): boolean => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysThreshold);
    return date > threshold;
  } catch {
    return false;
  }
};

export const getPlanBadgeStyle = (plan: string): { bg: string; text: string; border: string } => {
  switch (plan?.toLowerCase()) {
    case 'ilimitado':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'free':
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    case 'básico':
    case 'basico':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'intermediário':
    case 'intermediario':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'avançado':
    case 'avancado':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

export const validateApiKey = (apiKey: string, provider: string): { isValid: boolean; error?: string } => {
  if (!apiKey || !apiKey.trim()) {
    return { isValid: false, error: 'API Key é obrigatória' };
  }

  const key = apiKey.trim();

  switch (provider?.toLowerCase()) {
    case 'openai':
      if (!key.startsWith('sk-')) {
        return { isValid: false, error: 'Chave OpenAI deve começar com "sk-"' };
      }
      if (key.length < 20) {
        return { isValid: false, error: 'Chave OpenAI muito curta' };
      }
      break;
    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        return { isValid: false, error: 'Chave Anthropic deve começar com "sk-ant-"' };
      }
      break;
    case 'google':
      if (key.length < 20) {
        return { isValid: false, error: 'Chave Google muito curta' };
      }
      break;
  }

  return { isValid: true };
};

export const maskApiKey = (apiKey: string): string => {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}${'•'.repeat(Math.max(4, apiKey.length - 8))}${end}`;
};

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const safeJsonParse = <T = any>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString) || fallback;
  } catch {
    return fallback;
  }
};

export const safeLocalStorageGet = (key: string, fallback: any = null): any => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const safeLocalStorageSet = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};