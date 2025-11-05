// Função para tratar respostas JSON da API
async function handleJson(res: Response): Promise<any> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // quando o preflight/CORS falha, pode nem haver JSON
  }
  
  // ✅ CORREÇÃO: Verificar se a resposta foi bem-sucedida
  if (!res.ok) {
    // Capturar erros específicos de validação do Laravel
    let errorMessage = data?.error || data?.message || `Erro HTTP ${res.status}`;
    
    // Se houver erros de validação específicos, formatar melhor
    if (data?.errors) {
      const validationErrors = Object.values(data.errors).flat();
      if (validationErrors.length > 0) {
        errorMessage = validationErrors.join(', ');
      }
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).data = data;
    throw error;
  }
  
  // ✅ CORREÇÃO: Se a resposta tem success: false, é erro
  if (data && data.success === false) {
    let errorMessage = data?.error || data?.message || 'Erro desconhecido';
    
    // Capturar erros de validação específicos
    if (data?.errors) {
      const validationErrors = Object.values(data.errors).flat();
      if (validationErrors.length > 0) {
        errorMessage = validationErrors.join(', ');
      }
    }
    
    const error = new Error(errorMessage);
    (error as any).data = data;
    throw error;
  }
  
  // ✅ CORREÇÃO: Se chegou até aqui, é sucesso - retornar os dados
  return data;
}

// Normaliza a estrutura do usuário retornada pelo backend para o formato usado no frontend
function normalizeUser(raw: any) {
  console.log('🔍 normalizeUser - dados recebidos:', raw);
  
  if (!raw) return null;

  const email = raw.email || raw.usuario_email || raw.user_email || '';
  const name = raw.name || raw.nome || raw.full_name || '';

  // Detectar roles/flags em várias formas possíveis
  const roles = Array.isArray(raw.roles) ? raw.roles : (raw.role ? [raw.role] : []);
  const roleString = typeof raw.role === 'string' ? raw.role : '';

  const is_admin = Boolean(
    raw.is_admin ||
    raw.admin ||
    roles.some((r: string) => String(r).toLowerCase() === 'admin') ||
    String(roleString).toLowerCase() === 'admin' ||
    String(email).toLowerCase() === 'dev@bia.com'
  );

  const is_developer = Boolean(
    raw.is_developer ||
    raw.developer ||
    roles.some((r: string) => String(r).toLowerCase() === 'developer') ||
    String(roleString).toLowerCase() === 'developer' ||
    String(email).toLowerCase() === 'dev@bia.com'
  );

  const plano = raw.plano || raw.plan || raw.subscription || (String(email).toLowerCase() === 'dev@bia.com' ? 'Custom' : undefined);

  const normalized = {
    id: raw.id || raw.user_id || raw.uuid || String(Date.now()),
    email: email,
    name: name,
    cpf: raw.cpf || raw.document || undefined,
    whatsapp: raw.whatsapp || raw.phone || undefined,
    data_nascimento: raw.data_nascimento || raw.dataNascimento || raw.birthdate || undefined,
    plano: plano,
    is_admin,
    is_developer,
    consumo: raw.consumo || raw.consumption || { articles: 0, ideas: 0, sites: 0 },
    quotas: raw.quotas || raw.quota || undefined,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
    // manter o objeto cru para debugging se necessário
    _raw: raw,
  };
  
  console.log('✅ normalizeUser - dados normalizados:', normalized);
  console.log('📊 normalizeUser - consumo extraído:', normalized.consumo);
  
  return normalized;
}

/**
 * Tipos esperados (caso já existam no projeto, estes comentários são só referência):
 *
 * type RegisterPayload = {
 *   name: string;
 *   email: string;
 *   password: string;
 *   password_confirmation: string;
 *   cpf: string;
 *   whatsapp: string;
 *   data_nascimento: string;
 * };
 *
 * type LoginPayload = {
 *   email: string;
 *   password: string;
 * };
 *
 * type AuthResponse = {
 *   success: boolean;
 *   data: {
 *     user: any;
 *     token: string;
 *   };
 *   message: string;
 * };
 */

// ✅ CORREÇÃO: Função para limpar URL e evitar barras duplas
function getApiUrl(endpoint: string): string {
  // Verifica se está em desenvolvimento pela URL ou variável de ambiente
  const isDevelopment = import.meta.env.DEV || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  let baseUrl;
  if (isDevelopment) {
    baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
  } else {
    // Usar URL de produção
    baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com';
  }
  
  baseUrl = baseUrl.replace(/\/$/, ''); // Remove barra final
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}/api${cleanEndpoint}`;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  cpf: string;
  whatsapp: string;
  data_nascimento: string;
}) {
  try {
    console.log('📡 Registrando usuário:', payload.email);
    
  const url = getApiUrl('/auth/register');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

  const data = await handleJson(res);
    console.log('✅ Resposta do registro:', data);
    
    // ✅ CORREÇÃO: Retornar estrutura padronizada - registro pode retornar data.user
    const userRaw = data.data?.user || data.data || data.user || data;
    const token = data.data?.token || data.token || null;
    const user = normalizeUser(userRaw);
    if (token) localStorage.setItem('auth_token', token);
    return {
      success: true,
      user,
      token,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro no registro:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao registrar. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function loginUser(payload: {
  email: string;
  password: string;
}) {
  try {
    console.log('📡 Fazendo login:', payload.email);
    
  const url = getApiUrl('/auth/login');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

    const data = await handleJson(res);
    console.log('✅ Resposta do login:', data);

    const userRaw = data.data?.user || data.data || data.user || data;
    const token = data.data?.token || data.token || null;
    const user = normalizeUser(userRaw);
    if (token) localStorage.setItem('auth_token', token);

    return {
      success: true,
      user,
      token,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro no login:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao logar. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function logoutUser(token: string) {
  try {
    console.log('📡 Fazendo logout...');
    
  const url = getApiUrl('/auth/logout');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const data = await handleJson(res);
    console.log('✅ Logout realizado:', data);
    
    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro no logout:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao fazer logout. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function getCurrentUser(token: string) {
  try {
    console.log('📡 Buscando usuário atual...');
    
  const url = getApiUrl('/auth/user');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const data = await handleJson(res);
    console.log('✅ Usuário atual:', data);

    const userRaw = data.data?.user || data.data || data.user || data;
    const tokenFromResponse = data.data?.token || data.token || null;
    const user = normalizeUser(userRaw);
    if (tokenFromResponse) localStorage.setItem('auth_token', tokenFromResponse);

    return {
      success: true,
      user,
      token: tokenFromResponse,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao buscar usuário:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao buscar usuário. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function verifyEmail(payload: {
  email: string;
  code: string;
}) {
  try {
    console.log('📡 Verificando email:', payload.email);
    
    const url = getApiUrl('/auth/verify-email');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

    const data = await handleJson(res);
    console.log('✅ Email verificado:', data);

    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro na verificação de email:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao verificar email. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function resendVerificationCode(email: string) {
  try {
    console.log('📡 Reenviando código de verificação para:', email);
    
    const url = getApiUrl('/auth/resend-verification');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ email })
    });

    const data = await handleJson(res);
    console.log('✅ Código reenviado:', data);

    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao reenviar código:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao reenviar código. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function forgotPassword(email: string) {
  try {
    console.log('📡 Solicitando recuperação de senha para:', email);
    
    const url = getApiUrl('/auth/forgot-password');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ email })
    });

    const data = await handleJson(res);
    console.log('✅ Recuperação solicitada:', data);

    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro na recuperação de senha:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao solicitar recuperação. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}

export async function resetPassword(payload: {
  email: string;
  code: string;  // ✅ CORREÇÃO: backend espera 'code', não 'token'
  password: string;
  password_confirmation: string;
}) {
  try {
    console.log('📡 Redefinindo senha para:', payload.email);
    
    const url = getApiUrl('/auth/reset-password');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(payload)
    });

    const data = await handleJson(res);
    console.log('✅ Senha redefinida:', data);

    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao redefinir senha:', err);
    if (err?.name === "TypeError") {
      throw new Error("Falha de rede/CORS ao redefinir senha. Verifique se a API está acessível e aceita requisições CORS.");
    }
    throw err;
  }
}