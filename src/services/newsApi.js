import api from './api';

const NEWS_API_BASE = '/api/news';

// News Sources API
export const newsSourcesApi = {
  // Listar todas as fontes do usuário
  list: () => api.get(`${NEWS_API_BASE}/sources`),
  
  // Criar nova fonte
  create: (data) => api.post(`${NEWS_API_BASE}/sources`, data),
  
  // Criar nova fonte com auto-detecção
  createWithAutoDetection: (data) => api.post(`${NEWS_API_BASE}/sources/create-with-autodetection`, data),
  
  // Obter fonte específica
  get: (id) => api.get(`${NEWS_API_BASE}/sources/${id}`),
  
  // Atualizar fonte
  update: (id, data) => api.put(`${NEWS_API_BASE}/sources/${id}`, data),
  
  // Deletar fonte
  delete: (id) => api.delete(`${NEWS_API_BASE}/sources/${id}`),
  
  // Alternar status ativo/inativo
  toggle: (id) => api.post(`${NEWS_API_BASE}/sources/${id}/toggle`),
  
  // Testar feed RSS
  testFeed: (id) => api.post(`${NEWS_API_BASE}/sources/${id}/test-feed`),
  
  // Processar fonte manualmente
  process: (id, params = {}) => api.post(`${NEWS_API_BASE}/sources/${id}/process`, params)
};

// News Monitoring API
export const newsMonitoringApi = {
  // Listar todos os monitoramentos do usuário
  list: () => api.get(`${NEWS_API_BASE}/monitoring`),
  
  // Criar novo monitoramento
  create: (data) => api.post(`${NEWS_API_BASE}/monitoring`, data),
  
  // Obter monitoramento específico
  get: (id) => api.get(`${NEWS_API_BASE}/monitoring/${id}`),
  
  // Atualizar monitoramento
  update: (id, data) => api.put(`${NEWS_API_BASE}/monitoring/${id}`, data),
  
  // Deletar monitoramento
  delete: (id) => api.delete(`${NEWS_API_BASE}/monitoring/${id}`),
  
  // Alternar status ativo/inativo
  toggle: (id) => api.post(`${NEWS_API_BASE}/monitoring/${id}/toggle`),
  
  // Executar processamento imediato
  execute: (id) => api.post(`/api/monitoring/${id}/execute`)
};

// News Articles API
export const newsArticlesApi = {
  // Listar artigos com paginação e filtros
  list: (params = {}) => api.get(`${NEWS_API_BASE}/articles`, { params }),
  
  // Criar novo artigo
  create: (data) => api.post(`${NEWS_API_BASE}/articles`, data),
  
  // Obter artigo específico
  get: (id) => api.get(`${NEWS_API_BASE}/articles/${id}`),
  
  // Atualizar artigo
  update: (id, data) => api.put(`${NEWS_API_BASE}/articles/${id}`, data),
  
  // Deletar artigo
  delete: (id) => api.delete(`${NEWS_API_BASE}/articles/${id}`),
  
  // Obter estatísticas
  statistics: () => api.get(`${NEWS_API_BASE}/articles/statistics`),
  
  // Publicar artigo no WordPress
  publish: (id, data = {}) => api.post(`${NEWS_API_BASE}/articles/${id}/publish`, data),
  
  // Agendar artigo para publicação
  schedule: (id, data) => api.post(`${NEWS_API_BASE}/articles/${id}/schedule`, data),
  
  // Reescrever artigo com IA
  rewrite: (id, options = {}) => api.post(`${NEWS_API_BASE}/articles/${id}/rewrite`, options),
  
  // Ignorar artigo (mover para excluídos)
  ignore: (id) => api.post(`${NEWS_API_BASE}/articles/${id}/ignore`)
};

// Utilitário para formatação de dados
export const formatNewsData = {
  // Formatar fonte para exibição
  formatSource: (source) => ({
    ...source,
    typeLabel: {
      rss: 'RSS',
      atom: 'Atom',
      json: 'JSON Feed'
    }[source.type] || source.type,
    statusLabel: source.active ? 'Ativo' : 'Inativo',
    lastFetched: source.last_fetched_at 
      ? new Date(source.last_fetched_at).toLocaleString('pt-BR')
      : 'Nunca'
  }),

  // Formatar monitoramento para exibição
  formatMonitoring: (monitoring) => ({
    ...monitoring,
    statusLabel: monitoring.active ? 'Ativo' : 'Inativo',
    intervalLabel: `${monitoring.check_interval_minutes} minutos`,
    lastCheck: monitoring.last_check_at
      ? new Date(monitoring.last_check_at).toLocaleString('pt-BR')
      : 'Nunca',
    sourceName: monitoring.news_source?.name || 'Fonte não encontrada',
    siteName: monitoring.site?.nome || 'Site não encontrado'
  }),

  // Formatar artigo para exibição
  formatArticle: (article) => ({
    ...article,
    statusLabel: {
      pending: 'Pendente',
      processed: 'Processado',
      published: 'Publicado',
      failed: 'Falhou',
      duplicate: 'Duplicado',
      scheduled: 'Agendado',
      ignored: 'Ignorado',
      deleted: 'Excluído'
    }[article.status] || article.status,
    createdAt: new Date(article.created_at).toLocaleString('pt-BR'),
    publishedAt: article.published_at 
      ? new Date(article.published_at).toLocaleString('pt-BR')
      : null,
    sourceName: article.news_monitoring?.news_source?.name || 'Fonte não encontrada',
    siteName: article.news_monitoring?.site?.nome || 'Site não encontrado'
  }),

  // Validar dados de fonte
  validateSource: (data) => {
    const errors = {};
    
    if (!data.name?.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!data.url?.trim()) {
      errors.url = 'URL é obrigatória';
    } else {
      try {
        new URL(data.url);
      } catch {
        errors.url = 'URL inválida';
      }
    }
    
    if (!data.type) {
      errors.type = 'Tipo é obrigatório';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Validar dados de monitoramento
  validateMonitoring: (data) => {
    const errors = {};
    
    if (!data.news_source_id) {
      errors.news_source_id = 'Fonte é obrigatória';
    }
    
    if (!data.site_id) {
      errors.site_id = 'Site é obrigatório';
    }
    
    if (data.check_interval_minutes && (data.check_interval_minutes < 15 || data.check_interval_minutes > 1440)) {
      errors.check_interval_minutes = 'Intervalo deve ser entre 15 e 1440 minutos';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export default {
  sources: newsSourcesApi,
  monitoring: newsMonitoringApi,
  articles: newsArticlesApi,
  format: formatNewsData
};
