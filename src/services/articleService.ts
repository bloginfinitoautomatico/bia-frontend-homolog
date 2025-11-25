import { getApiUrl } from '../config/api';

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
    const msg = data?.error || data?.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  
  // ✅ CORREÇÃO: Se a resposta tem success: false, é erro
  if (data && data.success === false) {
    const msg = data?.error || data?.message || 'Erro desconhecido';
    throw new Error(msg);
  }
  
  // ✅ CORREÇÃO: Se chegou até aqui, é sucesso - retornar os dados
  return data;
}

// Função para obter headers autenticados
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export interface Article {
  id: number;
  titulo: string;
  conteudo: string;
  image_url?: string;
  status: string;
  site_id?: number;
  ideia_id?: number | string;
  categoria?: string;
  tags?: string[];
  seo_data?: any;
  generation_params?: any;
  wordpress_data?: any;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateArticlePayload {
  titulo: string;
  conteudo: string;
  image_url?: string | null;
  categoria: string;
  tags?: string | null; // JSON string no backend
  site_id?: number | string | null;
  ideia_id?: number | string | null;
  status: 'rascunho' | 'publicado' | 'agendado';
  seo_data?: string | null; // JSON string no backend
  generation_params?: string | null; // JSON string no backend
  wordpress_data?: string | null; // JSON string no backend
  published_at?: string | null;
}

/**
 * Criar novo artigo no backend
 */
export async function createArticle(payload: CreateArticlePayload) {
  try {
    console.log('📡 Criando artigo:', payload.titulo);
    console.log('📋 Payload completo sendo enviado:', JSON.stringify(payload, null, 2));
    
    const url = getApiUrl('artigos');
    console.log('🔗 URL da requisição:', url);
    
    // Garantir que site_id e ideia_id sejam strings quando presentes (backend espera UUID strings)
    const safePayload = {
      ...payload,
      site_id: payload.site_id != null ? String(payload.site_id) : null,
      ideia_id: payload.ideia_id != null ? String(payload.ideia_id) : null,
    } as CreateArticlePayload;

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(safePayload)
    });

    console.log('📨 Status da resposta:', res.status, res.statusText);

    let data: any = null;
    try {
      data = await res.json();
      console.log('📋 Resposta completa do backend:', JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', jsonError);
    }

    // ✅ CORREÇÃO: Verificar se a resposta foi bem-sucedida
    if (!res.ok) {
      const msg = data?.error || data?.message || `Erro HTTP ${res.status}`;
      throw new Error(msg);
    }
    
    // ✅ CORREÇÃO: Se a resposta tem success: false, é erro
    if (data && data.success === false) {
      const msg = data?.error || data?.message || 'Erro desconhecido';
      throw new Error(msg);
    }
    
    // Retornar o artigo criado
    return {
      success: true,
      article: data.data,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao criar artigo:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao criar artigo'
    };
  }
}

/**
 * Listar artigos do usuário
 */
export async function getArticles() {
  try {
    console.log('📡 Buscando artigos do usuário');
    
    const url = getApiUrl('artigos');
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await handleJson(res);
    console.log('✅ Resposta da busca de artigos:', data);
    
    // Retornar a lista de artigos
    return {
      success: true,
      articles: data.data?.data || data.data || [],
      pagination: data.data?.meta || null,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao buscar artigos:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao buscar artigos'
    };
  }
}

/**
 * Atualizar artigo
 */
export async function updateArticle(id: number, payload: Partial<CreateArticlePayload>) {
  try {
    console.log('🗑️ Deletando artigo:', id);
    
    const url = getApiUrl(`artigos/${id}`);
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await handleJson(res);
    console.log('✅ Resposta da atualização de artigo:', data);
    
    return {
      success: true,
      article: data.data,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao atualizar artigo:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao atualizar artigo'
    };
  }
}

/**
 * Deletar artigo
 */
export async function deleteArticle(id: number) {
  try {
    console.log('📡 Buscando artigo por ID:', id);
    
    const url = getApiUrl(`artigos/${id}`);
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await handleJson(res);
    console.log('✅ Resposta da exclusão de artigo:', data);
    
    return {
      success: true,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao deletar artigo:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao deletar artigo'
    };
  }
}

/**
 * Publicar artigo
 */
export async function publishArticle(id: number) {
  try {
    console.log('📡 Publicando artigo:', id);
    
    const url = getApiUrl(`artigos/${id}/publish`);
    console.log('🔗 URL da requisição:', url);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await handleJson(res);
    console.log('✅ Resposta da publicação de artigo:', data);
    
    return {
      success: true,
      article: data.data,
      message: data.message
    };

  } catch (err: any) {
    console.error('❌ Erro ao publicar artigo:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido ao publicar artigo'
    };
  }
}
