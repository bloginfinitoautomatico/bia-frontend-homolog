// @ts-nocheck
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { getPlanLimits, isFreePlan as isFreePlanUtil } from '../utils/constants';
import { toast } from 'sonner';
import { createArticle, getArticles, updateArticle, deleteArticle, publishArticle } from '../services/articleService';
import newsApi from '../services/newsApi';
import { databaseService } from '../services/databaseService';

// Adiciona tipagem global para import.meta.env
interface ImportMetaEnv {
  [key: string]: any;
  VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// =======================
// Tipos / Interfaces
// =======================
interface Site {
  id: number;
    uuid?: string; // UUID do backend (usado para foreign keys nas APIs)
  user_id?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    plano: string;
  };
  nome: string;
  name?: string;
  url: string;
  descricao: string;
  categoria: string;
  nicho: string;
  // aceitar variações em português/maiusculas usadas na UI
  status: 'ativo' | 'inativo' | 'Ativo' | 'Pausado' | 'Pausado' | 'Inativo';
  // campos opcionais usados por componentes
  articles?: number;
  lastPost?: string;
  wordpressUrl?: string;
  wordpressUsername?: string;
  wordpressPassword?: string;
  wordpressData?: any;
  createdAt: string;
  updatedAt: string;
}

interface Idea {
  id: number;
  titulo: string;
  descricao?: string;
  categoria: string;
  tags: string[];
  siteId: string | number;
  status: 'ativa' | 'produzido' | 'excluido' | 'publicado';
  cta?: any;
  generationParams?: any;
  wordpressData?: any;
  articleId?: number;
  createdAt: string;
  updatedAt: string;
  deletedDate?: string;
}

interface Article {
  id: number | string; // Permitir string para artigos do BIA News com prefixo
  titulo: string;
  conteudo: string;
  // incluir status observados em vários componentes + status do BIA News
  status: 'Rascunho' | 'Em Revisão' | 'Concluído' | 'Publicado' | 'Agendado' | 'Produzindo' | 'Pendente' | 'Processado' | string;
  siteId: string | number;
  ideaId: number;
  categoria?: string;
  tags?: string[];
  imageUrl?: string;
  imageAlt?: string;
  readyForPublishing?: boolean;
  publishedUrl?: string;
  wpPostUrl?: string;
  publishedAt?: string;
  publishedDate?: string;
  scheduledDate?: string;
  scheduledUrl?: string;
  wordpressPostId?: number;
  wordpressData?: any;
  generationParams?: any;
  meta?: {
    word_count: number;
    internal_links: number;
    external_links: number;
  };
  generationSteps?: any;
  // Campos específicos para artigos do BIA News
  source?: 'traditional' | 'bia_news';
  originalUrl?: string;
  newsSourceName?: string;
  newsStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  whatsapp?: string;
  dataNascimento?: string;
  plano: string;
  is_admin?: boolean;
  is_developer?: boolean;
  consumo?: {
    articles?: number;
    ideas?: number;
    sites?: number;
    last_reset?: string;
  };
  quotas?: {
    articles?: number;
    ideas?: number;
    sites?: number;
    isUnlimited?: boolean;
  };
}

interface BiaState {
  user: User | null;
  sites: Site[];
  ideas: Idea[];
  articles: Article[];
  isLoading: boolean;
  lastSync: string | null;
  error: string | null;
  isOnline: boolean;
}

type BiaAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_SITES'; payload: Site[] }
  | { type: 'ADD_SITE'; payload: Site }
  | { type: 'UPDATE_SITE'; payload: { id: number; updates: Partial<Site> } }
  | { type: 'DELETE_SITE'; payload: number }
  | { type: 'SET_IDEAS'; payload: Idea[] }
  | { type: 'ADD_IDEAS'; payload: Idea[] }
  | { type: 'UPDATE_IDEA'; payload: { id: number; updates: Partial<Idea> } }
  | { type: 'DELETE_IDEA'; payload: number }
  | { type: 'SET_ARTICLES'; payload: Article[] }
  | { type: 'ADD_ARTICLE'; payload: Article }
  | { type: 'UPDATE_ARTICLE'; payload: { id: number; updates: Partial<Article> } }
  | { type: 'DELETE_ARTICLE'; payload: number }
  | { type: 'LOAD_STATE'; payload: Partial<BiaState> }
  | { type: 'SET_LAST_SYNC'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ONLINE'; payload: boolean };

// =======================
// API Service com Sanctum
// =======================
class ApiService {
  private readonly BASE_URL: string;
  private authToken: string = '';

  constructor() {
    // Preferir URL do .env; se ausente, usar mesmo domínio do frontend
    const envBackend = (import.meta.env.VITE_BACKEND_URL as string) || (import.meta.env.VITE_API_URL as string);
    const sameOrigin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const backendUrl = envBackend || sameOrigin || 'http://127.0.0.1:8000';
    this.BASE_URL = `${backendUrl.replace(/\/$/, '')}/api`;
    
    // Carregar token do localStorage
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.authToken = savedToken;
    }
    
    console.log('🔧 API Base URL configurada:', this.BASE_URL);
    console.log('🔧 Backend URL do .env:', import.meta.env.VITE_BACKEND_URL as string || import.meta.env.VITE_API_URL as string || sameOrigin);
  }

  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
    console.log('🔑 Token de autenticação configurado');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, defaultOptions);
      clearTimeout(timeoutId); // Clear timeout if request succeeds
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.text();
          if (errorData.trim()) {
            try {
              const parsedError = JSON.parse(errorData);
              // Log completo dos detalhes de validação retornados pelo backend (Laravel)
              console.error(`❌ API Response Error Details for ${endpoint}:`, parsedError);

              // Preferir message + errors quando disponível
              if (parsedError.message) {
                errorMessage = parsedError.message;
              }

              if (parsedError.errors) {
                try {
                  errorMessage += ' - ' + JSON.stringify(parsedError.errors);
                } catch {
                  errorMessage += ' - (validation errors)';
                }
              } else if (parsedError.error) {
                errorMessage = parsedError.error;
              }
            } catch {
              errorMessage = errorData.length > 200 ?
                errorData.substring(0, 200) + '...' :
                errorData;
            }
          }
        } catch (e) {
          console.warn('⚠️ Falha ao ler corpo da resposta de erro:', e);
        }

        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      
      if (!responseText.trim()) {
        console.warn('⚠️ Resposta vazia do servidor para:', endpoint);
        return { success: true, data: null };
      }

      try {
        const result = JSON.parse(responseText);
        console.log(`✅ API Response: ${endpoint}`, result.success ? '✓' : '✗');
        return result;
      } catch (parseError: any) {
        console.error(`❌ Erro ao parsear JSON da resposta ${endpoint}:`, parseError);
        throw new Error(`Resposta JSON inválida do servidor: ${parseError.message}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId); // Clear timeout on error
      
      if (error.name === 'AbortError') {
        console.error(`⏰ Timeout na requisição ${endpoint} (30s)`);
        throw new Error('Timeout: A requisição demorou mais de 30 segundos para responder');
      }
      
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando conectividade com backend...');
      const result = await this.makeRequest('/health');
      const isConnected = result.success || result.status === 'ok';
      console.log(isConnected ? '✅ Backend conectado' : '❌ Backend desconectado');
      return isConnected;
    } catch (error) {
      console.warn('⚠️ Backend não disponível:', error);
      return false;
    }
  }

  // Sites API - CORRIGIDO PARA USAR CAMPOS EM PORTUGUÊS
  async createSite(siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: Site; error?: string }> {
    try {
      console.log('🔍 DEBUG - Dados que serão enviados para API:', {
        nome: siteData.nome,
        url: siteData.url,
        descricao: siteData.descricao,
        categoria: siteData.categoria,
        nicho: siteData.nicho,
        status: siteData.status
      });

      const result = await this.makeRequest('/sites', {
        method: 'POST',
        body: JSON.stringify({
          nome: siteData.nome,
          url: siteData.url,
          descricao: siteData.descricao,
          categoria: siteData.categoria,
          nicho: siteData.nicho,
          status: siteData.status,
          wordpress_url: siteData.wordpressUrl,
          wordpress_username: siteData.wordpressUsername,
          wordpress_password: siteData.wordpressPassword,
          wordpress_data: siteData.wordpressData,
        }),
      });
      
      console.log('🔍 DEBUG - Resposta da API:', result);
      
      if (result.success && result.data) {
        // Converter resposta do backend para formato frontend
        const site: Site = {
          id: result.data.id,
          nome: result.data.nome,
          url: result.data.url,
          descricao: result.data.descricao || '',
          categoria: result.data.categoria || '',
          nicho: result.data.nicho || '',
          status: result.data.status || 'ativo',
          wordpressUrl: result.data.wordpress_url,
          wordpressUsername: result.data.wordpress_username,
          wordpressPassword: result.data.wordpress_password,
          wordpressData: result.data.wordpress_data,
          createdAt: result.data.created_at || new Date().toISOString(),
          updatedAt: result.data.updated_at || new Date().toISOString(),
        };
        return { success: true, data: site };
      }
      
      return result;
    } catch (error: any) {
      console.error('🔍 DEBUG - Erro na criação do site:', error);
      return { success: false, error: error.message };
    }
  }

  async getSites(): Promise<{ success: boolean; data?: Site[]; error?: string }> {
    try {
      console.log('📥 Carregando sites do backend...');
      // Incluir dados WordPress completos (com senhas) para uso interno
      const result = await this.makeRequest('/sites?include_wordpress_data=true');
      
      if (result.success && result.data) {
        // A API retorna dados paginados: result.data.data contém o array de sites
        const sitesArray = Array.isArray(result.data) ? result.data : result.data.data || [];
        
        // Converter resposta do backend para formato frontend
        // ✅ CORREÇÃO: Preservar ID original do backend em vez de sequencial
        const sites: Site[] = sitesArray.map((item: any) => ({
          id: item.id, // Usar ID do backend (pode ser UUID ou número)
          uuid: item.id, // Preservar UUID do backend também no campo uuid
          user_id: item.user_id,
          user: item.user, // Incluir dados do usuário proprietário (para admins)
          nome: item.nome,
          url: item.url,
          descricao: item.descricao || '',
          categoria: item.categoria || '',
          nicho: item.nicho || '',
          status: item.status || 'ativo',
          wordpressUrl: item.wordpress_url,
          wordpressUsername: item.wordpress_username,
          wordpressPassword: item.wordpress_password,
          wordpressData: item.wordpress_data,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
        }));
        
        console.log(`✅ ${sites.length} sites carregados do backend`);
        return { success: true, data: sites };
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar sites:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSite(id: number, updates: Partial<Site>): Promise<{ success: boolean; data?: Site; error?: string }> {
    try {
      // Usar UUID do backend quando disponível
      const targetSite = state.sites.find(s => s.id === id);
      const backendId = (targetSite && targetSite.uuid) ? targetSite.uuid : id;

      const result = await this.makeRequest(`/sites/${backendId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: updates.nome,
          url: updates.url,
          descricao: updates.descricao,
          categoria: updates.categoria,
          nicho: updates.nicho,
          status: updates.status,
          wordpress_url: updates.wordpressUrl,
          wordpress_username: updates.wordpressUsername,
          wordpress_password: updates.wordpressPassword,
          wordpress_data: updates.wordpressData,
        }),
      });
      
      if (result.success && result.data) {
        const site: Site = {
          id: result.data.id,
          nome: result.data.nome,
          url: result.data.url,
          descricao: result.data.descricao || '',
          categoria: result.data.categoria || '',
          nicho: result.data.nicho || '',
          status: result.data.status || 'ativo',
          wordpressUrl: result.data.wordpress_url,
          wordpressUsername: result.data.wordpress_username,
          wordpressPassword: result.data.wordpress_password,
          wordpressData: result.data.wordpress_data,
          createdAt: result.data.created_at || new Date().toISOString(),
          updatedAt: result.data.updated_at || new Date().toISOString(),
        };
        return { success: true, data: site };
      }
      
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteSite(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Usar UUID do backend quando disponível
      const targetSite = state.sites.find(s => s.id === id);
      const backendId = (targetSite && targetSite.uuid) ? targetSite.uuid : id;

      const result = await this.makeRequest(`/sites/${backendId}`, {
        method: 'DELETE',
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Ideas API
  async getIdeas(): Promise<{ success: boolean; data?: Idea[]; error?: string }> {
    try {
      console.log('📥 Carregando ideias do backend...');
      const result = await this.makeRequest('/ideias');
      
      if (result.success && result.data) {
        // A API retorna dados paginados: result.data.data contém o array de ideias
        const ideasArray = Array.isArray(result.data) ? result.data : result.data.data || [];
        
        const ideas: Idea[] = ideasArray.map((item: any) => ({
          id: item.id,
          titulo: item.titulo,
          descricao: item.descricao,
          categoria: item.categoria || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          siteId: item.site_id,
          status: item.status || 'ativa',
          cta: item.cta,
          generationParams: item.generation_params,
          wordpressData: item.wordpress_data,
          articleId: item.article_id,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
          deletedDate: item.deleted_at,
        }));
        
        console.log(`✅ ${ideas.length} ideias carregadas do backend`);
        return { success: true, data: ideas };
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar ideias:', error);
      return { success: false, error: error.message };
    }
  }

  async createIdeia(ideiaData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('💾 Criando ideia no backend...', ideiaData.titulo);
      const result = await this.makeRequest('/ideias', {
        method: 'POST',
        body: JSON.stringify(ideiaData),
      });
      
      if (result.success) {
        console.log('✅ Ideia criada no backend:', result.data?.id);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao criar ideia:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NOVO: Método para buscar especificamente ideias excluídas
  async loadDeletedIdeas(): Promise<Idea[]> {
    try {
      console.log('🗑️ Carregando ideias excluídas do backend...');
      const result = await this.makeRequest('/ideias?status=excluido');
      
      if (result.success && result.data) {
        const ideasArray = Array.isArray(result.data) ? result.data : result.data.data || [];
        
        const deletedIdeas: Idea[] = ideasArray.map((item: any) => ({
          id: item.id,
          titulo: item.titulo,
          descricao: item.descricao,
          categoria: item.categoria || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          siteId: item.site_id,
          status: item.status || 'excluido',
          cta: item.cta,
          generationParams: item.generation_params,
          wordpressData: item.wordpress_data,
          articleId: item.article_id,
          createdAt: item.created_at || new Date().toISOString(),
          deletedAt: item.deleted_at
        }));
        
        console.log(`✅ ${deletedIdeas.length} ideias excluídas carregadas do backend`);
        return deletedIdeas;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Erro ao carregar ideias excluídas:', error);
      return [];
    }
  }

  async updateIdeia(id: number, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`💾 Atualizando ideia ${id} no backend...`, updates);
      const result = await this.makeRequest(`/ideias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      if (result.success) {
        console.log(`✅ Ideia ${id} atualizada no backend`);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar ideia:', error);
      return { success: false, error: error.message };
    }
  }

  async generateIdea(ideiaParams: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🤖 Gerando ideia via OpenAI...', ideiaParams);
      const result = await this.makeRequest('/openai/generate-idea', {
        method: 'POST',
        body: JSON.stringify(ideiaParams),
      });
      
      if (result.success) {
        console.log('✅ Ideia gerada com sucesso:', result.data);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao gerar ideia:', error);
      return { success: false, error: error.message };
    }
  }

  // Articles API
  async getArticles(): Promise<{ success: boolean; data?: Article[]; error?: string }> {
    try {
      console.log('📥 Carregando artigos do backend...');
      const result = await this.makeRequest('/artigos');
      
      if (result.success && result.data) {
        // A API retorna dados paginados: result.data.data contém o array de artigos
        const articlesArray = Array.isArray(result.data) ? result.data : result.data.data || [];
        
        const articles: Article[] = articlesArray.map((item: any) => ({
          id: item.id,
          titulo: item.titulo,
          conteudo: item.conteudo,
          status: item.status || 'Rascunho',
          siteId: item.site_id,
          ideaId: item.ideia_id,
          imageUrl: item.image_url,
          publishedUrl: item.published_url,
          publishedDate: item.published_date,
          scheduledDate: item.scheduled_date,
          scheduledUrl: item.scheduled_url,
          wordpressPostId: item.wordpress_post_id,
          wordpressData: item.wordpress_data,
          generationParams: item.generation_params,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
        }));
        
        console.log(`✅ ${articles.length} artigos carregados do backend`);
        return { success: true, data: articles };
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar artigos:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ FUNÇÃO REMOVIDA: recordConsumption API
  // O consumo deve ser controlado APENAS pelo backend via Observers
  // Removido para evitar consumo duplicado de créditos
  async recordConsumption(resourceType: string, quantity: number): Promise<{ success: boolean; user?: any; error?: string }> {
    console.warn('⚠️ recordConsumption API DESABILITADO - consumo controlado apenas pelo backend');
    console.log(`❌ Tentativa de consumir ${quantity} ${resourceType} bloqueada na API`);
    return { success: true }; // Retorna sucesso para manter compatibilidade
  }
}

// Instância global da API
const apiService = new ApiService();

// =======================
// Estado inicial e reducer
// =======================
const initialState: BiaState = {
  user: null,
  sites: [],
  ideas: [],
  articles: [],
  isLoading: false,
  lastSync: null,
  error: null,
  isOnline: true,
};

function biaReducer(state: BiaState, action: BiaAction): BiaState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload, error: null };

    case 'UPDATE_USER':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload }, error: null };

    case 'SET_SITES':
      return { ...state, sites: action.payload };

    case 'ADD_SITE': {
      const newSite: Site = {
        ...action.payload,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, sites: [...state.sites, newSite] };
    }

    case 'UPDATE_SITE': {
      const updatedSites = state.sites.map((site) =>
        site.id === action.payload.id
          ? { ...site, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : site
      );
      return { ...state, sites: updatedSites };
    }

    case 'DELETE_SITE': {
      const filteredSites = state.sites.filter((site) => site.id !== action.payload);
      return { ...state, sites: filteredSites };
    }

    case 'SET_IDEAS':
      return { ...state, ideas: action.payload };

    case 'ADD_IDEAS': {
      const newIdeas: Idea[] = action.payload.map((idea) => ({
        ...idea,
        createdAt: idea.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      return { ...state, ideas: [...state.ideas, ...newIdeas] };
    }

    case 'UPDATE_IDEA': {
      const updatedIdeas = state.ideas.map((idea) =>
        idea.id === action.payload.id
          ? { ...idea, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : idea
      );
      return { ...state, ideas: updatedIdeas };
    }

    case 'DELETE_IDEA': {
      const filteredIdeas = state.ideas.filter((idea) => idea.id !== action.payload);
      return { ...state, ideas: filteredIdeas };
    }

    case 'SET_ARTICLES':
      return { ...state, articles: action.payload };

    case 'ADD_ARTICLE': {
      const newArticle: Article = {
        ...action.payload,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, articles: [...state.articles, newArticle] };
    }

    case 'UPDATE_ARTICLE': {
      const updatedArticles = state.articles.map((article) =>
        article.id === action.payload.id
          ? { ...article, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : article
      );
      return { ...state, articles: updatedArticles };
    }

    case 'DELETE_ARTICLE': {
      const filteredArticles = state.articles.filter((article) => article.id !== action.payload);
      return { ...state, articles: filteredArticles };
    }

    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };

    default:
      return state;
  }
}

// =======================
// Contexto
// =======================
const BiaContext = createContext<{
  state: BiaState;
  actions: {
    // User
    login: (user: User, onSuccess?: () => void) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
    refreshUserData: () => Promise<boolean>;
    loadDeletedIdeas: () => Promise<Idea[]>;
    clearError: () => void;

    // Sites
    addSite: (site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
    updateSite: (id: number, updates: Partial<Site>) => Promise<boolean>;
    deleteSite: (id: number) => Promise<boolean>;

    // Ideias
    addIdeas: (ideas: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<boolean>;
    updateIdea: (id: number, updates: Partial<Idea>) => boolean;
    updateAllIdeas: (ideas: Idea[]) => boolean;
    deleteIdea: (id: number) => boolean;
    generateIdea: (params: any) => Promise<{ success: boolean; data?: any; error?: string }>;

    // Artigos
    addArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
    updateArticle: (id: number, updates: Partial<Article>) => boolean;
    deleteArticle: (id: number) => boolean;

    // Limites/planos
    checkFreePlanLimits: () => { sites: boolean; ideas: boolean; articles: boolean };
    isFreePlan: () => boolean;

    // Persistência
    loadFromStorage: () => void;
    saveToStorage: () => void;
    syncWithDatabase: () => Promise<void>;
    loadFromDatabase: () => Promise<void>;
    forceSyncToDatabase: () => Promise<boolean>;
    forceLoadFromDatabase: () => Promise<void>;

    // Consumo
    checkConsumptionLimits: (
      resourceType: 'ideas' | 'articles' | 'sites'
    ) => Promise<{ canConsume: boolean; reason?: string; currentUsage?: number; limit?: number }>;
    recordResourceConsumption: (resourceType: 'ideas' | 'articles' | 'sites', quantity?: number) => Promise<boolean>;
  };
} | undefined>(undefined);

// =======================
// Provider
// =======================
export function BiaProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(biaReducer, initialState);

  // Configurar token quando usuário faz login
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token && state.user) {
      apiService.setAuthToken(token);
    }
  }, [state.user]);

  // CORREÇÃO: Monitorar mudanças no usuário para redirecionamento automático
  useEffect(() => {
    if (state.user && !state.isLoading) {
      console.log('🔄 Usuário logado detectado, verificando redirecionamento...');
      
      // Verificar se não estamos já no dashboard
      const currentHash = window.location.hash;
      const isOnDashboard = currentHash.includes('dashboard') || currentHash.includes('#dashboard');
      
      if (!isOnDashboard) {
        console.log('🚀 Redirecionando para dashboard...');
        
        // Usar setTimeout para garantir que o DOM foi atualizado
        setTimeout(() => {
          // Tentar diferentes métodos de redirecionamento
          if (window.location.hash !== '#dashboard') {
            window.location.hash = '#dashboard';
          }
          
          // Fallback: usar history API se disponível
          if (window.history && window.history.pushState) {
            window.history.pushState(null, '', '#dashboard');
          }
          
          // Disparar evento de mudança de hash manualmente
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          
          console.log('✅ Redirecionamento executado para:', window.location.hash);
        }, 100);
      }
    }
  }, [state.user, state.isLoading]);

  // Carregar dados automaticamente quando usuário faz login
  useEffect(() => {
    if (state.user && state.isOnline) {
      console.log('🔄 [EFFECT] Usuário logado detectado, carregando dados...');
      loadFromDatabase();
    }
  }, [state.user]);

  // Listener para forçar recarregamento quando dados do usuário são atualizados pelo admin
  useEffect(() => {
    const handleForceReload = async () => {
      console.log('🔄 [FORCE RELOAD] Dados do usuário foram atualizados pelo admin - recarregando...');
      
      // Buscar dados atualizados do usuário
      try {
        const token = localStorage.getItem('auth_token');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        
        if (token) {
          const response = await fetch(`${backendUrl}/api/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // Normalizar dados do usuário
              const userData = result.data;
              const normalized = {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                plano: userData.plano || 'Free',
                quotas: userData.quotas || { sites: 1, ideas: 10, articles: 5 },
                consumo: userData.consumo || { sites: 0, ideas: 0, articles: 0 },
                cpf: userData.cpf || '',
                whatsapp: userData.whatsapp || '',
                data_nascimento: userData.data_nascimento || null,
                is_admin: userData.is_admin || false,
                is_developer: userData.is_developer || false,
                email_verified_at: userData.email_verified_at || null,
              };
              
              dispatch({ type: 'LOGIN', payload: normalized });
              console.log('✅ Dados do usuário atualizados com sucesso:', normalized);
              toast.success('Seus dados foram atualizados!');
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao recarregar dados do usuário:', error);
      }
    };

    window.addEventListener('bia:force-reload', handleForceReload);
    
    return () => {
      window.removeEventListener('bia:force-reload', handleForceReload);
    };
  }, []);

  // ---------- Helpers de persistência ----------
  const persistImmediately = useCallback(
    (overrides?: Partial<Pick<BiaState, 'sites' | 'ideas' | 'articles' | 'user'>>) => {
      try {
        const snapshot = {
          sites: overrides?.sites ?? state.sites,
          ideas: overrides?.ideas ?? state.ideas,
          articles: overrides?.articles ?? state.articles,
          user: overrides?.user ?? state.user,
          lastSync: new Date().toISOString(),
        };
        localStorage.setItem('bia-state', JSON.stringify(snapshot));
        try {
          // Expor estado canônico no window para que outros serviços leiam o estado atual
          (window as any).__BIA_STATE__ = snapshot;
        } catch (err) {
          // ignore
        }
        console.log('💾 Snapshot salvo imediatamente no localStorage');
      } catch (err) {
        console.warn('⚠️ Erro ao salvar snapshot imediato:', err);
      }
    },
    [state.sites, state.ideas, state.articles, state.user]
  );

  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        sites: state.sites,
        ideas: state.ideas,
        articles: state.articles,
        user: state.user,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem('bia-state', JSON.stringify(dataToSave));
      console.log('💾 Estado salvo no localStorage (debounce):', {
        sites: state.sites.length,
        ideas: state.ideas.length,
        articles: state.articles.length,
        user: state.user?.email || 'N/A',
      });
    } catch (error) {
      console.warn('⚠️ Erro ao salvar no localStorage:', error);
    }
  }, [state.sites, state.ideas, state.articles, state.user]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('bia-state');
      if (!saved) {
        console.log('📝 Nenhum estado encontrado no localStorage');
        return;
      }
      const parsed = JSON.parse(saved);
      const snapshotUser: User | undefined = parsed?.user;

      if (
        state.user &&
        snapshotUser &&
        snapshotUser.email &&
        state.user.email &&
        snapshotUser.email.toLowerCase() !== state.user.email.toLowerCase()
      ) {
        console.log('⚠️ Snapshot do localStorage é de outro usuário. Ignorando.');
        return;
      }

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          sites: Array.isArray(parsed?.sites) ? parsed.sites : [],
          ideas: Array.isArray(parsed?.ideas) ? parsed.ideas : [],
          articles: Array.isArray(parsed?.articles) ? parsed.articles : [],
          lastSync: parsed?.lastSync ?? null,
          user: state.user ?? snapshotUser ?? null,
        },
      });
      
      console.log('✅ Estado hidratado do localStorage:', {
        sites: Array.isArray(parsed?.sites) ? parsed.sites.length : 0,
        ideas: Array.isArray(parsed?.ideas) ? parsed.ideas.length : 0,
        articles: Array.isArray(parsed?.articles) ? parsed.articles.length : 0,
        articlesWithPublishedUrl: parsed?.articles?.filter((a: any) => a.publishedUrl)?.length || 0,
        articlesWithScheduledDate: parsed?.articles?.filter((a: any) => a.scheduledDate)?.length || 0
      });
      
      // Verificar se o usuário precisa ter dados atualizados (correção para usuários existentes)
      const currentUser = state.user ?? snapshotUser;
      if (currentUser && (!currentUser.consumo || typeof currentUser.consumo !== 'object')) {
        console.log('🔄 Usuário sem dados de consumo. Forçando atualização...');
        setTimeout(() => {
          actions.refreshUserData();
        }, 1000); // Aguardar um pouco para evitar conflitos
      }
    } catch (error) {
      console.warn('⚠️ Erro ao hidratar do localStorage:', error);
    }
  }, [state.user]);

  // "Backend" com integração real
  const syncWithDatabase = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Testar conectividade
      const isOnline = await apiService.testConnection();
      dispatch({ type: 'SET_ONLINE', payload: isOnline });

      if (isOnline) {
        // Sincronizar com backend real
        await loadFromDatabase();
        // Removido: toast de sincronização individual - será centralizado
      } else {
        // Fallback: salvar localmente
        persistImmediately();
        toast.warning('Modo offline - dados salvos localmente');
      }
      
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date().toISOString() });
    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      toast.error('Erro na sincronização: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [persistImmediately]);

  const loadFromDatabase = useCallback(async () => {
    // Variável para armazenar as ideias finais mescladas (backend + locais) para salvar no snapshot canônico
    let _finalIdeasForCanonical: any[] | undefined = undefined;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Testar conectividade
      const isOnline = await apiService.testConnection();
      dispatch({ type: 'SET_ONLINE', payload: isOnline });

      if (!isOnline) {
        console.log('⚠️ Backend offline, carregando dados locais');
        loadFromLocalStorage();
        toast.warning('Modo offline ativo');
        return;
      }

      console.log('🔄 Carregando dados do backend...');

      // Carregar dados em paralelo
      const [sitesResult, ideasResult, articlesResult] = await Promise.allSettled([
        apiService.getSites(),
        apiService.getIdeas(),
        apiService.getArticles(),
      ]);

      // Processar sites
      if (sitesResult.status === 'fulfilled' && sitesResult.value.success) {
        const serverSites = sitesResult.value.data || [];
        dispatch({ type: 'SET_SITES', payload: serverSites });
        console.log('✅ Sites carregados:', serverSites.length || 0);

        // Remover sites locais que não existem mais no servidor (órfãos)
        try {
          const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
          const serverIds = new Set(serverSites.map((s: any) => String(s.id)));

          const orphanSites = state.sites.filter(s => isUuid(String(s.id)) && !serverIds.has(String(s.id)));
          if (orphanSites.length > 0) {
            console.log('🧹 Removendo sites órfãos detectados (excluídos no servidor):', orphanSites.map(s => ({ id: s.id, nome: s.nome || s.url })));

            // Construir novo array de sites a partir do servidor (já feito acima)
            const nextSites = serverSites;

            // Limpar/atualizar referências em ideias e artigos que apontem para sites órfãos
            const orphanIds = new Set(orphanSites.map(s => String(s.id)));

            const nextIdeas = state.ideas.map(i => (i && orphanIds.has(String(i.siteId)) ? { ...i, siteId: null } : i));
            const nextArticles = state.articles.map(a => (a && orphanIds.has(String(a.siteId)) ? { ...a, siteId: null } : a));

            // Aplicar atualizações locais e persistir
            dispatch({ type: 'SET_SITES', payload: nextSites });
            dispatch({ type: 'SET_IDEAS', payload: nextIdeas });
            dispatch({ type: 'SET_ARTICLES', payload: nextArticles });
            persistImmediately({ sites: nextSites, ideas: nextIdeas, articles: nextArticles });

            toast.success(`Sites órfãos removidos: ${orphanSites.length}. Referências limpas.`);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Erro ao tentar limpar sites órfãos:', cleanupError);
        }
      } else {
        console.error('❌ Erro ao carregar sites:', sitesResult.status === 'rejected' ? sitesResult.reason : sitesResult.value.error);
      }

      // Processar ideias - MANTER EXCLUSÕES E EDIÇÕES LOCAIS
      if (ideasResult.status === 'fulfilled' && ideasResult.value.success) {
          const rawBackendIdeas = ideasResult.value.data || [];
          
          // Normalizar ideias do backend para garantir compatibilidade com interface
          const backendIdeas = rawBackendIdeas.map((idea: any) => {
            console.log('🔍 [LOAD DATABASE] Normalizando ideia do backend:', {
              id: idea.id,
              titulo: idea.titulo,
              site_id: idea.site_id,
              siteId: idea.siteId,
              siteId_type: typeof idea.site_id
            });
            
            return {
              ...idea,
              siteId: idea.site_id || idea.siteId, // Usar site_id do backend como siteId
              tags: Array.isArray(idea.tags) ? idea.tags : (
                typeof idea.tags === 'string' ? JSON.parse(idea.tags || '[]') : []
              ),
              cta: typeof idea.cta === 'string' ? JSON.parse(idea.cta || 'null') : idea.cta,
              generationParams: typeof idea.generation_params === 'string' ? JSON.parse(idea.generation_params || 'null') : idea.generation_params,
              wordpressData: typeof idea.wordpress_data === 'string' ? JSON.parse(idea.wordpress_data || 'null') : idea.wordpress_data,
            };
          });

        // Carregar dados locais para preservar exclusões, edições e ideias locais ainda não persistidas
        try {
          const saved = localStorage.getItem('bia-state');
          const localData = saved ? JSON.parse(saved) : null;
          const localIdeas: Idea[] = Array.isArray(localData?.ideas) ? localData.ideas : [];

          // Mapear mudanças locais por id (ids locais geralmente são timestamps/numbers)
          const localChanges = localIdeas.reduce((acc, localIdea) => {
            acc[String(localIdea.id)] = {
              isDeleted: localIdea.status === 'excluido',
              deletedDate: localIdea.deletedDate,
              titulo: localIdea.titulo,
              updatedAt: localIdea.updatedAt,
              raw: localIdea,
            };
            return acc;
          }, {} as Record<string, any>);

          // Mesclar: preservar exclusões/edições locais quando a ideia existe no backend
          const mergedIdeas: Idea[] = backendIdeas.map((backendIdea: any) => {
            const localChange = localChanges[String(backendIdea.id)];

            if (localChange) {
              // ✅ CORREÇÃO: Se a ideia foi excluída localmente E o backend também tem status 'excluido', usar dados do backend
              if (localChange.isDeleted && backendIdea.status === 'excluido') {
                console.log(`🗑️ Ideia ${backendIdea.id} foi excluída localmente e sincronizada com backend - usando dados do backend`);
                return {
                  ...backendIdea,
                  status: 'excluido' as const,
                  deletedDate: backendIdea.deleted_at || localChange.deletedDate || new Date().toISOString(),
                };
              }
              
              // Se foi excluída localmente mas backend ainda não tem status excluído, preservar exclusão local
              if (localChange.isDeleted) {
                return {
                  ...backendIdea,
                  status: 'excluido' as const,
                  deletedDate: localChange.deletedDate || new Date().toISOString(),
                };
              }

              const localUpdateTime = new Date(localChange.updatedAt || 0).getTime();
              const backendUpdateTime = new Date(backendIdea.updatedAt || 0).getTime();

              if (localUpdateTime > backendUpdateTime && localChange.titulo !== backendIdea.titulo) {
                console.log(`🔄 Preservando edição local da ideia ${backendIdea.id}: "${backendIdea.titulo}" → "${localChange.titulo}"`);
                return {
                  ...backendIdea,
                  titulo: localChange.titulo,
                  updatedAt: localChange.updatedAt,
                };
              }
            }

            return backendIdea;
          });

          // ✅ CORREÇÃO: Filtrar ideias locais excluídas que já foram sincronizadas com backend
          const backendTitles = new Set(backendIdeas.map((b: any) => b.titulo));
          const backendExcludedIds = new Set(backendIdeas.filter((b: any) => b.status === 'excluido').map((b: any) => String(b.id)));
          
          const localOnly = localIdeas.filter(li => {
            // Não incluir ideias que já existem no backend (por título)
            if (backendTitles.has(li.titulo)) {
              return false;
            }
            
            // ✅ CORREÇÃO: Não incluir ideias locais que foram marcadas como excluídas e já existem no backend como excluídas
            if (li.status === 'excluido' && backendExcludedIds.has(String(li.id))) {
              console.log(`🧹 Removendo ideia local já sincronizada como excluída: ${li.titulo} (${li.id})`);
              return false;
            }
            
            return true;
          });

          const finalIdeas = [...mergedIdeas, ...localOnly];
          // Guardar para uso ao persistir o estado canônico
          _finalIdeasForCanonical = finalIdeas;

          const preservedExclusions = Object.values(localChanges).filter(c => c.isDeleted).length;
          const preservedEdits = Object.values(localChanges).filter(c => !c.isDeleted && c.titulo).length;

          dispatch({ type: 'SET_IDEAS', payload: finalIdeas });
          console.log(`✅ Ideias carregadas e mescladas: ${finalIdeas.length} total (${mergedIdeas.length} do backend + ${localOnly.length} locais), ${preservedExclusions} excluídas preservadas, ${preservedEdits} edições preservadas`);
        } catch (error) {
          console.warn('⚠️ Erro ao mesclar ideias locais:', error);
          dispatch({ type: 'SET_IDEAS', payload: backendIdeas });
          console.log('✅ Ideias carregadas (sem mesclagem):', backendIdeas.length);
        }
      } else {
        console.error('❌ Erro ao carregar ideias:', ideasResult.status === 'rejected' ? ideasResult.reason : ideasResult.value.error);
      }

      // Processar artigos
      if (articlesResult.status === 'fulfilled' && articlesResult.value.success) {
        const backendArticles = articlesResult.value.data || [];
        console.log('🔍 [LOAD DATABASE] Artigos do backend:', {
          count: backendArticles.length,
          samples: backendArticles.slice(0, 2)
        });
        
        dispatch({ type: 'SET_ARTICLES', payload: backendArticles });
        console.log('✅ Artigos carregados:', backendArticles.length);
      } else {
        console.error('❌ Erro ao carregar artigos:', articlesResult.status === 'rejected' ? articlesResult.reason : articlesResult.value.error);
      }

      // Expor estado canônico carregado do servidor para evitar re-hidratação a partir de snapshots antigos
      try {
        // Preferir as ideias mescladas (_finalIdeasForCanonical) quando disponíveis, para
        // evitar sobrescrever ideias locais que ainda não existem no backend.
        const canonicalIdeas = typeof _finalIdeasForCanonical !== 'undefined'
          ? _finalIdeasForCanonical
          : (ideasResult.status === 'fulfilled' && ideasResult.value.success ? (ideasResult.value.data || []) : state.ideas);

        const canonical = {
          sites: sitesResult.status === 'fulfilled' && sitesResult.value.success ? (sitesResult.value.data || []) : state.sites,
          ideas: canonicalIdeas,
          articles: articlesResult.status === 'fulfilled' && articlesResult.value.success ? (articlesResult.value.data || []) : state.articles,
          user: state.user,
          lastSync: new Date().toISOString(),
        };
        (window as any).__BIA_STATE__ = canonical;
        localStorage.setItem('bia-state', JSON.stringify(canonical));
        try {
          // sinalizar que o estado canônico do servidor já foi carregado
          (window as any).__BIA_SERVER_SYNCED = true;
          window.dispatchEvent(new Event('bia:server-synced'));
          console.log('📣 Window sinalizado: __BIA_SERVER_SYNCED = true');
        } catch (err) {
          // ignore
        }
        console.log('🔁 Estado canônico atualizado a partir do servidor e salvo localmente');
      } catch (err) {
        console.warn('⚠️ Falha ao expor estado canônico:', err);
      }

      // Removido: notificação aqui para evitar duplicatas
      // A notificação de boas-vindas será exibida apenas no login
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error('Erro ao carregar dados: ' + error.message);
      
      // Fallback: carregar dados locais
      loadFromLocalStorage();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadFromLocalStorage]);

  // Flush final ao sair/navegar
  useEffect(() => {
    const handler = () => {
      persistImmediately();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [persistImmediately]);

  // Auto-save (debounce leve) ao alterar dados
  useEffect(() => {
    if (!state.user) return;
    const hasData = state.sites.length + state.ideas.length + state.articles.length > 0;
    if (!hasData) return;
    const t = setTimeout(saveToLocalStorage, 600);
    return () => clearTimeout(t);
  }, [state.user, state.sites, state.ideas, state.articles, saveToLocalStorage]);

  // Função auxiliar para carregar artigos do backend
  const loadArticlesFromBackend = useCallback(async () => {
    try {
      console.log('🔄 [ARTICLES DEBUG] Carregando artigos do backend...');
      
      // Carregar artigos tradicionais (baseados em ideias)
      const traditionalResult = await getArticles();
      
      // Carregar artigos do BIA News (baseados em fontes RSS)
      let newsResult;
      try {
        newsResult = await newsApi.articles.list();
      } catch (error) {
        console.log('ℹ️ [NEWS ARTICLES] Erro ao carregar artigos do BIA News (pode ser normal se não houver artigos):', error.message);
        newsResult = { success: false, data: { data: [] } };
      }
      
      console.log('🔍 [ARTICLES DEBUG] Resultado do backend:', {
        traditional: {
          success: traditionalResult.success,
          hasArticles: !!traditionalResult.articles,
          articlesCount: traditionalResult.articles?.length || 0
        },
        news: {
          success: newsResult.success,
          hasArticles: !!newsResult.data?.data,
          articlesCount: newsResult.data?.data?.length || 0
        }
      });
      
      let allArticles: Article[] = [];
      
      // Processar artigos tradicionais
      if (traditionalResult.success && traditionalResult.articles) {
        const traditionalArticles: Article[] = traditionalResult.articles.map((article: any) => ({
          id: article.id,
          titulo: article.titulo,
          conteudo: article.conteudo,
          status: article.status === 'publicado' ? 'Publicado' : 'Rascunho',
          siteId: article.site_id || 0,
          ideaId: article.ideia_id || 0,
          publishedAt: article.published_at,
          publishedUrl: article.published_url,
          scheduledDate: article.scheduled_date,
          generationParams: article.generation_params,
          wordpressData: article.wordpress_data,
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          source: 'traditional' // Identificar origem
        }));
        
        allArticles = [...allArticles, ...traditionalArticles];
      }
      
      // Processar artigos do BIA News
      if (newsResult.success && newsResult.data?.data) {
        const newsArticles: Article[] = newsResult.data.data.map((article: any) => ({
          id: `news_${article.id}`, // Prefixo para evitar conflitos de ID
          titulo: article.title,
          conteudo: article.rewritten_content || article.original_content,
          status: article.status === 'published' ? 'Publicado' : 
                 article.status === 'processed' ? 'Processado' : 'Pendente',
          siteId: article.news_monitoring?.site?.id || 0,
          ideaId: 0, // Artigos do BIA News não são baseados em ideias
          publishedAt: article.published_at,
          publishedUrl: article.wordpress_post_id ? `Site: ${article.news_monitoring?.site?.nome || 'N/A'}` : null,
          scheduledDate: null, // BIA News não usa agendamento por enquanto
          generationParams: {
            source: 'bia_news',
            original_url: article.original_url,
            news_source: article.news_monitoring?.news_source?.name,
            auto_published: article.news_monitoring?.auto_publish
          },
          wordpressData: article.metadata,
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          source: 'bia_news', // Identificar origem
          originalUrl: article.original_url,
          newsSourceName: article.news_monitoring?.news_source?.name,
          newsStatus: article.status
        }));
        
        allArticles = [...allArticles, ...newsArticles];
      }

      console.log('🔍 [ARTICLES DEBUG] Todos os artigos processados:', {
        totalConverted: allArticles.length,
        traditional: allArticles.filter(a => a.source === 'traditional').length,
        news: allArticles.filter(a => a.source === 'bia_news').length,
        withPublishedUrl: allArticles.filter(a => a.publishedUrl).length,
        samples: allArticles.slice(0, 2).map(a => ({
          id: a.id,
          titulo: a.titulo,
          source: a.source,
          status: a.status
        }))
      });

      // Atualizar estado local com todos os artigos
      dispatch({ type: 'SET_ARTICLES', payload: allArticles });
      persistImmediately({ articles: allArticles });
      
      console.log(`✅ [ARTICLES DEBUG] ${allArticles.length} artigos carregados (${allArticles.filter(a => a.source === 'traditional').length} tradicionais + ${allArticles.filter(a => a.source === 'bia_news').length} BIA News)`);
      
    } catch (error) {
      console.error('❌ [ARTICLES DEBUG] Erro ao carregar artigos do backend:', error);
    }
  }, []);
  // Resolver site_id local (numérico/temporário) para site_id do backend (UUID), quando possível
  const resolveSiteId = useCallback(async (maybeSiteId: any): Promise<string | null> => {
    if (!maybeSiteId) return null;
    const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
    try {
      if (isUuid(maybeSiteId)) return String(maybeSiteId);

      // Procurar site no estado local por ID numérico
      const localSite = state.sites.find(s => String(s.id) === String(maybeSiteId));
      if (!localSite) {
        console.warn('⚠️ Site local não encontrado para ID:', maybeSiteId);
        return null;
      }

      // ✅ CORREÇÃO: Verificar se o site local tem uuid mapeado
      if (localSite.uuid && isUuid(localSite.uuid)) {
        console.log('✅ Site local tem UUID mapeado:', localSite.uuid, localSite.nome || localSite.url);
        return String(localSite.uuid);
      }

      // Se o id do site local já é UUID, retornar
      if (isUuid(localSite.id)) return String(localSite.id);

      // Fallback: buscar no servidor por URL/nome
      console.log('⚠️ UUID não encontrado localmente, buscando no servidor por URL/nome...');
      try {
        const sitesResult = await apiService.getSites();
        if (sitesResult.success && sitesResult.data) {
          const serverSites = sitesResult.data as any[];

          const normalize = (u?: string) => (u || '').toLowerCase().replace(/https?:\/\//, '').replace(/\/$/, '');
          const localUrl = normalize((localSite as any).url);
          const localName = ((localSite as any).nome || (localSite as any).name || '').toLowerCase().trim();

          const matched = serverSites.find(s => {
            const su = normalize(s.url);
            const sn = (s.nome || s.name || '').toLowerCase().trim();
            return (localUrl && su && su === localUrl) || (localName && sn && sn === localName);
          });

          if (matched) {
            console.log('🔗 Site local mapeado para site do backend via busca:', matched.id, matched.nome || matched.url);
            return String(matched.id);
          }
        }
      } catch (err) {
        console.warn('⚠️ Falha ao buscar sites do servidor durante mapeamento:', err);
      }

      console.warn('⚠️ Não foi possível mapear site ID local para UUID do backend:', maybeSiteId);
      return null;
    } catch (err) {
      console.warn('⚠️ Erro ao resolver site id:', err);
      return null;
    }
  }, [state.sites]);
  const actions = {
    // User - CORREÇÃO: Adicionado callback opcional para redirecionamento
    login: (user: User, onSuccess?: () => void) => {
      console.log("🔐 Login no BiaContext:", user.email);
      // Mesclar flags caso venham de objetos parciais
      const mergedUser = {
        ...state.user,
        ...user,
        is_admin: user.is_admin || state.user?.is_admin || false,
        is_developer: user.is_developer || state.user?.is_developer || false,
      } as User;

      dispatch({ type: "SET_USER", payload: mergedUser });
      dispatch({ type: "SET_ERROR", payload: null });

      // Configurar token de autenticação se existir
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiService.setAuthToken(token);
      }

      // Não limpar bia-state automaticamente. Hidratar do localStorage somente se o snapshot
      // pertencer ao mesmo usuário ou se não existir snapshot.
      setTimeout(() => {
        try {
          const saved = localStorage.getItem('bia-state');
          // If developer/admin user logs in, clear any local snapshot to avoid stale data
          const isDevUser = mergedUser?.email?.toLowerCase() === 'dev@bia.com' || mergedUser?.is_admin || mergedUser?.is_developer;
          if (isDevUser) {
            console.log('🧑‍💻 Dev/Admin login detected — removing local snapshots to reflect server state');
            localStorage.removeItem('bia-state');
            try { localStorage.removeItem('bia-wordpress-cache'); } catch {}
            // Force load from server to ensure fresh state
            try { 
              loadFromDatabase(); 
              loadArticlesFromBackend(); // Carregar artigos do backend
            } catch (err) { 
              console.warn('⚠️ Falha ao carregar do servidor após limpar snapshot:', err); 
            }
          } else {
            if (!saved) {
              loadFromLocalStorage();
              loadArticlesFromBackend(); // Carregar artigos do backend para usuários normais também
            } else {
              const parsed = JSON.parse(saved);
              const snapshotUserEmail = parsed?.user?.email?.toLowerCase();
              const currentEmail = mergedUser?.email?.toLowerCase();
              if (!snapshotUserEmail || snapshotUserEmail === currentEmail) {
                loadFromLocalStorage();
                loadArticlesFromBackend(); // Carregar artigos do backend
              } else {
                console.log('⚠️ Snapshot local pertence a outro usuário. Mantendo estado limpo.');
                loadArticlesFromBackend(); // Carregar artigos do backend mesmo assim
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Erro ao checar snapshot local durante login:', err);
          loadFromLocalStorage();
        }

        // Executar callback de sucesso se fornecido
        if (onSuccess && typeof onSuccess === 'function') {
          console.log('🎯 Executando callback de sucesso do login...');
          onSuccess();
        }
      }, 200);
    },

    logout: () => {
      try {
        persistImmediately(); // garante flush atual
        console.log('💾 Snapshot preservado no logout');
      } catch {}
      
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LAST_SYNC', payload: null });
      
      // Limpar token
      localStorage.removeItem('auth_token');
      apiService.setAuthToken('');
      
      // Redirecionar para login
      window.location.hash = '#login';
      
      console.log('🚪 Logout completo - usuário deslogado, dados preservados localmente');
    },

    updateUser: async (updates: Partial<User>) => {
      if (!state.user) {
        console.warn('⚠️ Tentativa de atualizar usuário sem login');
        return;
      }
      try {
        const nextUser = { ...state.user, ...updates };
        dispatch({ type: 'UPDATE_USER', payload: updates });
        persistImmediately({ user: nextUser });
        console.log('✅ Usuário atualizado localmente');
      } catch (error) {
        console.error('❌ Erro ao atualizar usuário local:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao atualizar dados do usuário' });
        throw error;
      }
    },

    refreshUserData: async (): Promise<boolean> => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('⚠️ Token não encontrado para atualizar dados do usuário');
          return false;
        }

        console.log('🔄 Atualizando dados do usuário via API...');
        const { getCurrentUser } = await import('../services/auth');
        const result = await getCurrentUser(token);

        if (result.success && result.user) {
          // Log detalhado para debug
          console.log('📊 Dados recebidos da API:', {
            quotas: result.user.quotas,
            consumo: result.user.consumo,
            plano: result.user.plano
          });

          dispatch({ type: 'SET_USER', payload: result.user });
          persistImmediately({ user: result.user });
          console.log('✅ Dados do usuário atualizados no contexto');
          
          return true;
        } else {
          console.error('❌ Erro ao buscar dados atualizados do usuário:', result);
          return false;
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar dados do usuário:', error);
        return false;
      }
    },

    // ✅ NOVO: Método para carregar ideias excluídas para a página "Excluídos"
    loadDeletedIdeas: async (): Promise<Idea[]> => {
      return await apiService.loadDeletedIdeas();
    },

    // Sites com integração backend
    addSite: async (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        console.log('🔍 DEBUG - Dados recebidos no addSite:', siteData);
        
        // Verificar conectividade
        const isOnline = await apiService.testConnection();
        dispatch({ type: 'SET_ONLINE', payload: isOnline });

        if (isOnline) {
          // Criar no backend
          const result = await apiService.createSite(siteData);
          
          if (result.success && result.data) {
            const backendSite = result.data as any;
            const mappedSite: Site = {
              id: state.sites.length + 1,
              uuid: backendSite.id,
              user_id: backendSite.user_id,
              user: backendSite.user,
              nome: backendSite.nome,
              url: backendSite.url,
              descricao: backendSite.descricao || '',
              categoria: backendSite.categoria || '',
              nicho: backendSite.nicho || '',
              status: backendSite.status || 'ativo',
              wordpressUrl: backendSite.wordpress_url,
              wordpressUsername: backendSite.wordpress_username,
              wordpressPassword: backendSite.wordpress_password,
              wordpressData: backendSite.wordpress_data,
              createdAt: backendSite.created_at || new Date().toISOString(),
              updatedAt: backendSite.updated_at || new Date().toISOString(),
            };

            dispatch({ type: 'ADD_SITE', payload: mappedSite });
            persistImmediately({ sites: [...state.sites, mappedSite] });
            toast.success('Site conectado com sucesso!');
            console.log('✅ Site criado no backend:', result.data);
            return true;
          } else {
            throw new Error(result.error || 'Erro ao criar site no backend');
          }
        } else {
          // Fallback: criar localmente
          const newSite: Site = {
            ...siteData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          const nextSites = [...state.sites, newSite];
          dispatch({ type: 'SET_SITES', payload: nextSites });
          persistImmediately({ sites: nextSites });
          toast.warning('Site salvo localmente. Será sincronizado quando a conexão for restabelecida.');
          console.log('⚠️ Site criado localmente:', newSite);
          return true;
        }
      } catch (error: any) {
        console.error('❌ Erro ao adicionar site:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        toast.error('Erro ao conectar site: ' + error.message);
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    updateSite: async (id: number, updates: Partial<Site>) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const isOnline = await apiService.testConnection();
        
        if (isOnline) {
          const result = await apiService.updateSite(id, updates);
          
          if (result.success && result.data) {
            dispatch({ type: 'UPDATE_SITE', payload: { id, updates: result.data } });
            const nextSites = state.sites.map(s => s.id === id ? result.data! : s);
            persistImmediately({ sites: nextSites });
            toast.success('Site atualizado com sucesso!');
            return true;
          } else {
            throw new Error(result.error || 'Erro ao atualizar site');
          }
        } else {
          // Atualizar localmente
          const nextSites = state.sites.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          );
          dispatch({ type: 'SET_SITES', payload: nextSites });
          persistImmediately({ sites: nextSites });
          toast.warning('Site atualizado localmente.');
          return true;
        }
      } catch (error: any) {
        console.error('❌ Erro ao atualizar site:', error);
        toast.error('Erro ao atualizar site: ' + error.message);
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    deleteSite: async (id: number) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const isOnline = await apiService.testConnection();
        
        if (isOnline) {
          const result = await apiService.deleteSite(id);
          
          if (result.success) {
            dispatch({ type: 'DELETE_SITE', payload: id });
            const nextSites = state.sites.filter(s => String(s.id) !== String(id));
            persistImmediately({ sites: nextSites });
            toast.success('Site removido com sucesso!');
            return true;
          } else {
            const errMsg = (result.error || '').toLowerCase();
            // Se o servidor informa que o site não existe ou acesso negado,
            // remover localmente para manter a UI consistente.
            if (
              errMsg.includes('não encontrado') ||
              errMsg.includes('not found') ||
              errMsg.includes('acesso negado') ||
              errMsg.includes('access denied') ||
              errMsg.includes('not authorized')
            ) {
              const nextSites = state.sites.filter(s => String(s.id) !== String(id));
              dispatch({ type: 'SET_SITES', payload: nextSites });
              persistImmediately({ sites: nextSites });
              toast.success('Site removido localmente (já não existia no servidor).');
              return true;
            }
            throw new Error(result.error || 'Erro ao remover site');
          }
        } else {
          // Remover localmente (offline)
          const nextSites = state.sites.filter(s => s.id !== id);
          dispatch({ type: 'SET_SITES', payload: nextSites });
          persistImmediately({ sites: nextSites });
          toast.warning('Site removido localmente (offline).');
          return true;
        }
      } catch (error: any) {
        console.error('❌ Erro ao remover site:', error);
        toast.error('Erro ao remover site: ' + error.message);
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Ideias (mantém lógica local original)
    addIdeas: async (ideasData: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      try {
        console.log('💡 Salvando ideias no backend...', ideasData.length);
        
        // Salvar cada ideia no backend
        const savedIdeas: Idea[] = [];
        
        for (const ideaData of ideasData) {
          try {
            // ✅ CORREÇÃO DEFINITIVA: Backend usa UUID, validar e enviar UUID diretamente
            let backendSiteId: string | null = null;
            if (ideaData.siteId) {
              const siteIdValue = String(ideaData.siteId);
              
              // Verificar se já é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
              const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(siteIdValue);
              
              if (isUuid) {
                // Se já é UUID, usar diretamente (validar se existe localmente)
                const siteObj = state.sites.find(s => String(s.id) === siteIdValue || s.uuid === siteIdValue);
                
                if (siteObj) {
                  backendSiteId = siteIdValue;
                  console.log(`✅ UUID validado: ${backendSiteId} (${siteObj.nome})`);
                } else {
                  // UUID não encontrado localmente, mas pode ser válido no backend
                  backendSiteId = siteIdValue;
                  console.warn(`⚠️ UUID não encontrado localmente, mas enviando para backend: ${siteIdValue}`);
                }
              } else {
                // Se não for UUID, converter número/string para UUID encontrando o site
                const siteIdNum = parseInt(siteIdValue);
                if (!isNaN(siteIdNum)) {
                  const siteObj = state.sites.find(s => {
                    // Buscar por ID como número ou como string (compatibilidade)
                    return s.id === siteIdNum || String(s.id) === siteIdValue;
                  });
                  
                  if (siteObj) {
                    // Usar UUID do site encontrado, ou fallback para o ID
                    backendSiteId = siteObj.uuid || String(siteObj.id);
                    console.log(`✅ ID ${siteIdValue} convertido para UUID: ${backendSiteId} (${siteObj.nome})`);
                  } else {
                    console.warn(`⚠️ Site não encontrado para ID: ${siteIdNum}. Sites disponíveis:`, 
                      state.sites.map(s => ({ id: s.id, uuid: s.uuid, nome: s.nome })));
                  }
                } else {
                  console.warn('⚠️ ID do site inválido (não é UUID nem número):', siteIdValue);
                }
              }
            } else {
              console.log('📝 Nenhum site_id fornecido');
            }

            if (!backendSiteId) {
              console.error(`❌ CRÍTICO: site_id inválido para "${ideaData.titulo}"`, {
                siteIdOriginal: ideaData.siteId,
                sitesDisponiveis: state.sites.length,
                primeiroSite: state.sites[0] ? { id: state.sites[0].id, uuid: state.sites[0].uuid, nome: state.sites[0].nome } : 'nenhum'
              });
              // NÃO pular - criar localmente como fallback
              const fallbackIdea: Idea = {
                ...ideaData,
                id: Date.now() + Math.random(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              savedIdeas.push(fallbackIdea);
              console.warn(`⚠️ Ideia "${ideaData.titulo}" criada APENAS localmente (fallback)`);
              continue;
            }

            console.log(`💾 Enviando ideia para backend...`, { titulo: ideaData.titulo, site_id: backendSiteId });

            const result = await apiService.createIdeia({
              titulo: ideaData.titulo,
              descricao: ideaData.descricao || '',
              categoria: ideaData.categoria,
              tags: JSON.stringify(ideaData.tags || []),
              site_id: backendSiteId,
              status: ideaData.status || 'ativa',
              cta: ideaData.cta ? JSON.stringify(ideaData.cta) : null,
              generation_params: ideaData.generationParams ? JSON.stringify(ideaData.generationParams) : null,
              wordpress_data: ideaData.wordpressData ? JSON.stringify(ideaData.wordpressData) : null,
            });

            console.log(`📡 Resposta do backend para "${ideaData.titulo}":`, { success: result.success, hasData: !!result.data, error: result.error });

            if (result.success && result.data) {
              // Converter resposta do backend para formato frontend
              console.log('🔍 Backend retornou site_id:', result.data.site_id, 'tipo:', typeof result.data.site_id);
              const savedIdea: Idea = {
                id: result.data.id,
                titulo: result.data.titulo,
                descricao: result.data.descricao || '',
                categoria: result.data.categoria || '',
                tags: Array.isArray(result.data.tags) ? result.data.tags : (
                  typeof result.data.tags === 'string' ? JSON.parse(result.data.tags || '[]') : []
                ),
                siteId: result.data.site_id,
                status: result.data.status as 'ativa' | 'produzido' | 'excluido' | 'publicado',
                cta: typeof result.data.cta === 'string' ? JSON.parse(result.data.cta || 'null') : result.data.cta,
                generationParams: typeof result.data.generation_params === 'string' ? JSON.parse(result.data.generation_params || 'null') : result.data.generation_params,
                wordpressData: typeof result.data.wordpress_data === 'string' ? JSON.parse(result.data.wordpress_data || 'null') : result.data.wordpress_data,
                articleId: result.data.article_id,
                createdAt: result.data.created_at,
                updatedAt: result.data.updated_at,
              };
              
              savedIdeas.push(savedIdea);
              console.log(`✅ Ideia "${savedIdea.titulo}" PERSISTIDA NO BACKEND com sucesso (ID: ${savedIdea.id})`);
            } else {
              console.error(`❌ FALHA ao persistir "${ideaData.titulo}" no backend:`, {
                error: result.error,
                site_id_enviado: backendSiteId,
                response: result
              });
              // Criar ideia local como fallback
              const fallbackIdea: Idea = {
                ...ideaData,
                id: Date.now() + Math.random(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              savedIdeas.push(fallbackIdea);
              console.warn(`⚠️ Ideia "${fallbackIdea.titulo}" criada APENAS localmente (fallback após erro)`);
            }
          } catch (error: any) {
            console.error(`❌ EXCEÇÃO ao salvar "${ideaData.titulo}":`, {
              message: error.message,
              stack: error.stack?.split('\n').slice(0, 3),
              site_id: backendSiteId
            });
            // Criar ideia local como fallback
            const fallbackIdea: Idea = {
              ...ideaData,
              id: Date.now() + Math.random(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            savedIdeas.push(fallbackIdea);
            console.warn(`⚠️ Ideia "${fallbackIdea.titulo}" criada APENAS localmente (fallback após exceção)`);
          }
        }

        // Atualizar estado local com ideias salvas
        const nextIdeas = [...state.ideas, ...savedIdeas];
        dispatch({ type: 'SET_IDEAS', payload: nextIdeas });
        persistImmediately({ ideas: nextIdeas });
        
        const persistedCount = savedIdeas.filter(i => typeof i.id === 'string' && /^[0-9a-fA-F]{8}/.test(String(i.id))).length;
        const localOnlyCount = savedIdeas.length - persistedCount;
        
        console.log(`✅ ${savedIdeas.length} ideias processadas:`, {
          persistidasBackend: persistedCount,
          apenasLocais: localOnlyCount,
          totalNoEstado: nextIdeas.length
        });
        
        return savedIdeas.length > 0;
      } catch (error) {
        console.error('❌ Erro geral ao adicionar ideias:', error);
        return false;
      }
    },

    updateIdea: (id: number | string, updates: Partial<Idea>) => {
      try {
        // Verificar se o ID é válido (UUID do backend)
        const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
        
        // Atualizar localmente primeiro para responsividade imediata
        const nextIdeas = state.ideas.map((i) =>
          String(i.id) === String(id) ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
        );
        
        dispatch({ type: 'SET_IDEAS', payload: nextIdeas });
        persistImmediately({ ideas: nextIdeas });
        
        console.log(`✅ Ideia ${id} atualizada localmente:`, {
          updates,
          timestamp: new Date().toISOString()
        });

        // Só sincronizar com backend se for um UUID válido
        if (isUuid(id)) {
          // Enviar para o backend de forma assíncrona (não bloquear a UI)
          (async () => {
            try {
              // ✅ CORREÇÃO: Mapear campos frontend → backend corretamente
              const backendUpdates: any = {};
              if (updates.titulo !== undefined) backendUpdates.titulo = updates.titulo;
              if (updates.categoria !== undefined) backendUpdates.categoria = updates.categoria;
              if (updates.status !== undefined) backendUpdates.status = updates.status;
              if (updates.deletedDate !== undefined) backendUpdates.deleted_at = updates.deletedDate;
              
              const result = await apiService.updateIdeia(id, backendUpdates);
              
              if (result.success) {
                console.log(`🌐 Ideia ${id} sincronizada com o backend com sucesso`);
              } else {
                console.warn(`⚠️ Falha ao sincronizar ideia ${id} com backend:`, result.error);
              }
            } catch (syncError) {
              console.warn(`⚠️ Erro na sincronização da ideia ${id} com backend:`, syncError);
            }
          })();
        } else {
          console.log(`ℹ️ Ideia ${id} é local (não UUID) - sincronização com backend ignorada`);
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar ideia:', error);
        return false;
      }
    },

    updateAllIdeas: (ideas: Idea[]) => {
      try {
        dispatch({ type: 'SET_IDEAS', payload: ideas });
        persistImmediately({ ideas });
        
        console.log(`✅ Todas as ideias atualizadas e persistidas: ${ideas.length} ideias`, {
          timestamp: new Date().toISOString()
        });
        
        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar todas as ideias:', error);
        return false;
      }
    },

    deleteIdea: (id: number) => {
      try {
        // Em vez de remover, marcar como excluído para evitar que retorne na lista
        const ideaToDelete = state.ideas.find(i => i.id === id);
        if (!ideaToDelete) {
          console.warn(`⚠️ Ideia ${id} não encontrada para exclusão`);
          return false;
        }

        const nextIdeas = state.ideas.map(idea => 
          idea.id === id ? { ...idea, status: 'excluido' as const } : idea
        );
        
        dispatch({ type: 'SET_IDEAS', payload: nextIdeas });
        persistImmediately({ ideas: nextIdeas });
        
        console.log(`✅ Ideia ${id} marcada como Excluída`);
        return true;
      } catch (error) {
        console.error('❌ Erro ao deletar ideia:', error);
        return false;
      }
    },

    generateIdea: async (params: any) => {
      try {
        console.log('🤖 Gerando ideia via BiaContext...', params);
        // Persistir automaticamente ideias geradas para evitar perda ao atualizar a tela
        const paramsWithPersist = { ...params, persist: true };
        const result = await apiService.generateIdea(paramsWithPersist);
        
        if (result.success && result.data) {
          console.log('✅ Ideia gerada com sucesso:', result.data);
        }
        
        return result;
      } catch (error: any) {
        console.error('❌ Erro ao gerar ideia:', error);
        return { success: false, error: error.message };
      }
    },

    // Artigos (agora com integração ao backend)
    addArticle: async (articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; persistedIdeaId?: string | null }> => {
      console.log('🚀 [addArticle] Iniciando criação de artigo:', articleData.titulo);
      try {
        // Validações básicas antes de enviar
        if (!articleData.titulo || articleData.titulo.trim().length === 0) {
          toast.error('Título do artigo é obrigatório');
          return { success: false };
        }

        if (!articleData.conteudo || articleData.conteudo.trim().length === 0) {
          toast.error('Erro ao produzir artigo, tente novamente');
          console.error('❌ Conteúdo vazio ou inválido');
          return { success: false };
        }

        // Converter dados do frontend para o formato esperado pelo backend
        // IMPORTANTE: Verificar se ideia_id é um ID válido do backend (UUID). Se for um ID local temporário, persistir a ideia antes.
        let validIdeiaId: string | number | null = null;
        let persistedIdeaId: string | null = null; // Para retornar ao chamador
        const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

        if (articleData.ideaId) {
          // Se já for UUID string, usar direto
          if (isUuid(articleData.ideaId)) {
            validIdeiaId = String(articleData.ideaId);
            persistedIdeaId = String(articleData.ideaId); // Capturar UUID da ideia
            console.log(`✅ ideia_id é UUID: ${validIdeiaId}`);
          } else {
            // Tentar persistir a ideia local (id temporário) antes de criar o artigo
            const localIdea = state.ideas.find(i => String(i.id) === String(articleData.ideaId));
            if (localIdea) {
              console.log('🔁 Ideia local detectada, persistindo no backend antes de criar artigo:', localIdea.titulo);
              // Preparar payload para criação de ideia
              // Resolver dinamicamente site_id local para o site_id do backend (UUID) quando possível
              const resolvedSiteIdForIdea = await resolveSiteId(localIdea.siteId);

              // Incluir informações do site local para que o backend possa reconciliar
              const localSiteObj = state.sites.find(s => String(s.id) === String(localIdea.siteId));
              const ideaPayload: any = {
                titulo: localIdea.titulo,
                descricao: localIdea.descricao || '',
                categoria: localIdea.categoria || null,
                tags: JSON.stringify(localIdea.tags || []),
                site_id: resolvedSiteIdForIdea,
                // enviar metadados de site para tentativa de reconciliação no backend
                site_url: localSiteObj?.url || null,
                site_nome: localSiteObj?.nome || localSiteObj?.name || null,
                status: localIdea.status || 'ativa',
                cta: localIdea.cta ? JSON.stringify(localIdea.cta) : null,
                generation_params: localIdea.generationParams ? JSON.stringify(localIdea.generationParams) : null,
                wordpress_data: localIdea.wordpressData ? JSON.stringify(localIdea.wordpressData) : null,
              };

              try {
                let createResult = await apiService.createIdeia(ideaPayload);
                // Se falhar por causa de site_id (validation.exists), tentar novamente sem site_id
                if (!createResult.success && createResult.error && String(createResult.error).includes('"site_id"')) {
                  console.warn('⚠️ Persistência de ideia falhou por site_id inexistente — tentando novamente sem site_id');
                  const retryPayload = { ...ideaPayload, site_id: null };
                  createResult = await apiService.createIdeia(retryPayload);
                }
                // Se falhar por título duplicado, buscar a ideia existente pelo título
                if (!createResult.success && createResult.error && String(createResult.error).includes('título')) {
                  console.warn('⚠️ Ideia com título duplicado - buscando ideia existente no backend');
                  try {
                    const existingIdeasResult = await apiService.getIdeas();
                    if (existingIdeasResult.success && existingIdeasResult.data) {
                      const existingIdea = existingIdeasResult.data.find((idea: any) => 
                        idea.titulo === ideaPayload.titulo
                      );
                      if (existingIdea) {
                        console.log('✅ Ideia existente encontrada, usando UUID:', existingIdea.id);
                        persistedIdeaId = existingIdea.id; // Capturar o ID da ideia existente
                        createResult = { success: true, data: existingIdea };
                      }
                    }
                  } catch (searchError) {
                    console.error('❌ Erro ao buscar ideia existente:', searchError);
                  }
                }

                if (createResult.success && createResult.data) {
                  // Atualizar estado local substituindo a ideia temporária pela versão do backend
                  const saved = createResult.data;
                  const savedIdea: Idea = {
                    id: saved.id,
                    titulo: saved.titulo,
                    descricao: saved.descricao || '',
                    categoria: saved.categoria || '',
                    tags: Array.isArray(saved.tags) ? saved.tags : (typeof saved.tags === 'string' ? JSON.parse(saved.tags || '[]') : []),
                    siteId: saved.site_id,
                    status: saved.status || 'ativa',
                    cta: typeof saved.cta === 'string' ? JSON.parse(saved.cta || 'null') : saved.cta,
                    generationParams: typeof saved.generation_params === 'string' ? JSON.parse(saved.generation_params || 'null') : saved.generation_params,
                    wordpressData: typeof saved.wordpress_data === 'string' ? JSON.parse(saved.wordpress_data || 'null') : saved.wordpress_data,
                    articleId: saved.article_id,
                    createdAt: saved.created_at,
                    updatedAt: saved.updated_at,
                  };

                  // Substituir ideia local no estado
                  const nextIdeas = state.ideas.map(i => (String(i.id) === String(articleData.ideaId) ? savedIdea : i));
                  dispatch({ type: 'SET_IDEAS', payload: nextIdeas });
                  persistImmediately({ ideas: nextIdeas });

                  validIdeiaId = saved.id;
                  persistedIdeaId = saved.id; // Capturar para retornar ao chamador
                  console.log(`✅ Ideia persistida com sucesso. UUID retornado: ${validIdeiaId}`);
                } else {
                  console.error('❌ Falha ao persistir ideia antes de criar artigo:', createResult.error);
                  toast.error('Falha ao salvar a ideia no servidor. O artigo não foi criado.');
                  return { success: false };
                }
              } catch (err) {
                console.error('❌ Erro ao chamar API para persistir ideia:', err);
                toast.error('Erro ao salvar ideia no servidor. Tente novamente.');
                return { success: false };
              }
            } else {
              // Se não encontramos a ideia local e não for UUID, ignorar (não podemos verificar posse)
              console.warn('⚠️ ideia_id fornecida não é UUID e não foi encontrada localmente:', articleData.ideaId);
            }
          }
        }

        // Resolver site_id do artigo (pode ser local) para backend UUID quando possível
        const resolvedSiteIdForArticle = await resolveSiteId(articleData.siteId);

        const backendPayload = {
          titulo: articleData.titulo.trim(),
          conteudo: articleData.conteudo.trim(),
          image_url: articleData.imageUrl || null,
          image_alt: articleData.imageAlt || null,
          // site_id enviado como UUID string quando mapeado, caso contrário null
          site_id: resolvedSiteIdForArticle || null,
          ideia_id: validIdeiaId,
          categoria: articleData.categoria || 'Geral',
          tags: articleData.tags && articleData.tags.length > 0 ? JSON.stringify(articleData.tags) : null,
          status: (articleData.status?.toLowerCase() === 'publicado' ? 'publicado' : 'rascunho') as 'publicado' | 'rascunho',
          ready_for_publishing: articleData.readyForPublishing || false,
          seo_data: null,
          generation_params: articleData.generationParams ? JSON.stringify(articleData.generationParams) : null,
          meta_data: articleData.meta ? JSON.stringify(articleData.meta) : null,
          generation_steps: articleData.generationSteps ? JSON.stringify(articleData.generationSteps) : null,
          wordpress_data: articleData.wordpressData ? JSON.stringify(articleData.wordpressData) : null,
          published_at: articleData.publishedAt || null
        };

        // Validação adicional da URL da imagem
        if (backendPayload.image_url) {
          try {
            new URL(backendPayload.image_url);
          } catch (urlError) {
            console.warn('⚠️ URL da imagem inválida, removendo:', backendPayload.image_url);
            backendPayload.image_url = null;
          }
        }

        console.log('🚀 Salvando artigo no backend:', {
          titulo: backendPayload.titulo,
          ideia_id: backendPayload.ideia_id, // ⚠️ IMPORTANTE: Verificar se não é null
          site_id: backendPayload.site_id,
          status: backendPayload.status,
          conteudo_preview: backendPayload.conteudo.substring(0, 100) + '...'
        });
        console.log('📊 Validações:', {
          tituloLength: backendPayload.titulo.length,
          conteudoLength: backendPayload.conteudo.length,
          hasImageUrl: !!backendPayload.image_url,
          hasSiteId: !!backendPayload.site_id,
          hasIdeiaId: !!backendPayload.ideia_id,
          hasTags: !!backendPayload.tags,
          status: backendPayload.status
        });

        // Criar artigo no backend

        let result = await createArticle(backendPayload);

        console.log('📡 Resposta do backend:', result);

        // Se falhar por causa de site_id inválido/existente, tentar novamente sem site_id
        if (!result.success && result.error && String(result.error).includes('site_id')) {
          console.warn('⚠️ Falha ao criar artigo por causa de site_id — tentando novamente sem site_id');
          const retryPayload = { ...backendPayload, site_id: null };
          result = await createArticle(retryPayload as any);
          console.log('📡 Resposta do backend (retry sem site_id):', result);
        }

        if (result.success && result.article) {
          // Converter resposta do backend para formato do frontend
          const newArticle: Article = {
            id: result.article.id,
            titulo: result.article.titulo,
            conteudo: result.article.conteudo,
            status: result.article.status === 'publicado' ? 'Publicado' : 'Rascunho',
            siteId: result.article.site_id || 0,
            ideaId: result.article.ideia_id || 0,
            publishedAt: result.article.published_at,
            generationParams: result.article.generation_params,
            wordpressData: result.article.wordpress_data,
            createdAt: result.article.created_at,
            updatedAt: result.article.updated_at,
            imageUrl: result.article.image_url,
            categoria: result.article.categoria,
            tags: result.article.tags
          };

          // Atualizar estado local
          const nextArticles = [...state.articles, newArticle];
          dispatch({ type: 'SET_ARTICLES', payload: nextArticles });
          persistImmediately({ articles: nextArticles });

          console.log('✅ [addArticle] Artigo salvo com sucesso! Backend já consumiu o crédito automaticamente.');
          
          // ✅ O backend (ArtigoObserver) já consumiu o crédito automaticamente
          // Não precisamos consumir manualmente aqui para evitar duplicação
          console.log('💳 Crédito foi consumido automaticamente pelo ArtigoObserver');

          // Exibir sucesso
          toast.success('Artigo salvo com sucesso!');
          console.log('✅ Artigo salvo no backend e estado local atualizado:', newArticle);

          return { success: true, persistedIdeaId };
        } else {
          console.error('❌ Erro ao salvar artigo no backend:', result.error);
          toast.error(`Erro ao salvar artigo: ${result.error}`);
          return { success: false };
        }
      } catch (error) {
        console.error('❌ Erro ao adicionar artigo:', error);
        toast.error('Erro interno ao salvar artigo');
        return { success: false };
      }
    },

    updateArticle: (id: number, updates: Partial<Article>) => {
      try {
        // Atualizar estado local primeiro
        const nextArticles = state.articles.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        );
        dispatch({ type: 'SET_ARTICLES', payload: nextArticles });
        persistImmediately({ articles: nextArticles });

        // Sincronizar com backend de forma assíncrona
        (async () => {
          try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
              console.warn('⚠️ Token não encontrado, pulando sincronização do artigo');
              return;
            }

            // Preparar dados para o backend (formato Laravel)
            const backendData: any = {};
            if (updates.status) backendData.status = updates.status.toLowerCase();
            if (updates.scheduledDate) backendData.scheduled_date = updates.scheduledDate;
            if (updates.publishedUrl) {
              backendData.published_url = updates.publishedUrl;
              console.log('🔗 Salvando published_url no backend:', updates.publishedUrl);
            }
            if (updates.publishedAt) backendData.published_at = updates.publishedAt;
            if (updates.publishedDate) backendData.published_date = updates.publishedDate;
            if (updates.wordpressData) backendData.wordpress_data = updates.wordpressData;
            if (updates.wordpressPostId) backendData.wordpress_post_id = updates.wordpressPostId;
            if (updates.conteudo) backendData.conteudo = updates.conteudo;
            if (updates.titulo) backendData.titulo = updates.titulo;
            if (updates.categoria) backendData.categoria = updates.categoria;
            if (updates.tags) backendData.tags = updates.tags;
            if (updates.imageUrl) backendData.image_url = updates.imageUrl;

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com'}/api/artigos/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify(backendData),
            });

            if (!response.ok) {
              console.error(`❌ Erro ao sincronizar artigo ${id} com backend:`, response.status);
            } else {
              const result = await response.json();
              console.log(`✅ Artigo ${id} sincronizado com backend:`, result);
            }
          } catch (error) {
            console.error(`❌ Erro na sincronização assíncrona do artigo ${id}:`, error);
          }
        })();

        return true;
      } catch (error) {
        console.error('❌ Erro ao atualizar artigo:', error);
        return false;
      }
    },

    deleteArticle: (id: number) => {
      try {
        const nextArticles = state.articles.filter((a) => a.id !== id);
        dispatch({ type: 'SET_ARTICLES', payload: nextArticles });
        persistImmediately({ articles: nextArticles });
        return true;
      } catch (error) {
        console.error('❌ Erro ao deletar artigo:', error);
        return false;
      }
    },

    // Limites / Planos (mantém lógica original)
    checkFreePlanLimits: () => {
      const user = state.user;
      const plan = user?.plano || 'Free';

      // Dev/Admin nunca ficam bloqueados
      if (user?.is_admin || user?.is_developer) {
        return { sites: false, ideas: false, articles: false };
      }

      if (isFreePlanUtil(plan)) {
        const FREE_LIMITS = getPlanLimits('Free'); // Usar função consistente
        return {
          sites: state.sites.length >= FREE_LIMITS.sites,
          ideas: state.ideas.length >= FREE_LIMITS.ideas,
          articles: state.articles.filter((a) => a.status === "Concluído").length >= FREE_LIMITS.articles,
        };
      }

      const planLimits = getPlanLimits(plan);
      return {
        sites: !planLimits.isUnlimited && state.sites.length >= planLimits.sites,
        ideas: false, // Planos pagos têm ideias ilimitadas
        articles: state.articles.filter((a) => a.status === "Concluído").length >= planLimits.articles,
      };
    },

    isFreePlan: () => {
      const user = state.user;
      const plan = user?.plano || "Free";

      // Dev/Admin nunca são tratados como "Free"
      if (user?.is_admin || user?.is_developer) return false;

      return plan === "Free";
    },

    // Persistência pública
    loadFromStorage: () => loadFromLocalStorage(),
    saveToStorage: () => persistImmediately(),
    syncWithDatabase,
    loadFromDatabase,

    // "Forçados" com integração backend
    forceSyncToDatabase: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const isOnline = await apiService.testConnection();
        
        if (!isOnline) {
          toast.error('Não é possível sincronizar: backend offline');
          return false;
        }

        console.log('🔄 Iniciando sincronização forçada...');
        
        // Recarregar todos os dados do servidor
        await loadFromDatabase();
        
        // Removido: toast individual - usuário já verá a notificação principal
        return true;
      } catch (error: any) {
        console.error('❌ Erro na sync forçada:', error);
        toast.error('Erro na sincronização: ' + error.message);
        return false;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    forceLoadFromDatabase: async () => {
      try {
        await loadFromDatabase();
      } catch (error) {
        console.error('❌ Erro no load forçado:', error);
      }
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    },

    // Consumo (local)
    checkConsumptionLimits: async (resourceType: 'ideas' | 'articles' | 'sites') => {
      const userPlan = state.user?.plano || 'Free';
      const limits = getPlanLimits(userPlan);

      let currentUsage = 0;
      let limit = 0;

      switch (resourceType) {
        case 'sites':
          currentUsage = state.sites.length;
          limit = limits.sites;
          break;
        case 'ideas':
          currentUsage = state.ideas.length;
          limit = limits.ideas;
          break;
        case 'articles':
          currentUsage = state.articles.filter((a) => a.status === 'Concluído').length;
          limit = limits.articles;
          break;
      }

      if (state.user?.email === 'dev@bia.com' || state.user?.email === 'admin@bia.com') {
        return { canConsume: true, currentUsage, limit };
      }

      const canConsume = limits.isUnlimited ? true : currentUsage < limit;

      return {
        canConsume,
        currentUsage,
        limit,
        reason: canConsume ? undefined : `Limite de ${limit} ${resourceType} atingido para o plano ${userPlan}`,
      };
    },

    // ✅ FUNÇÃO REMOVIDA: recordResourceConsumption
    // O consumo de recursos deve ser controlado APENAS pelo backend
    // via ArtigoObserver e outros observers automáticos
    // Removido para evitar consumo duplicado de créditos
    recordResourceConsumption: async (resourceType: 'ideas' | 'articles' | 'sites', quantity: number = 1) => {
      console.warn('⚠️ recordResourceConsumption DESABILITADO - consumo controlado apenas pelo backend');
      console.log(`❌ Tentativa de consumir ${quantity} ${resourceType} bloqueada no frontend`);
      return true; // Retorna true para manter compatibilidade
    },
  };

  return (
    <BiaContext.Provider value={{ state, actions }}>
      {children}
    </BiaContext.Provider>
  );
}

// Hook para usar o contexto
export function useBia() {
  const context = useContext(BiaContext);
  if (context === undefined) {
    throw new Error('useBia must be used within a BiaProvider');
  }
  return context;
}

export default BiaContext;

// Utility: expose manual cleaner for orphan sites so developer can run from console
try {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (window as any).__BIA_CLEAN_ORPHANS__ = async () => {
      try {
        console.log('🧹 Executando __BIA_CLEAN_ORPHANS__: buscando sites do servidor...');
        const apiServiceModule = await import('../services/databaseService');
        const api = (apiServiceModule && apiServiceModule.default) ? apiServiceModule.default : apiServiceModule;
        const sitesResult = await api.getSites();

        const serverSites = (sitesResult && sitesResult.success && Array.isArray(sitesResult.data))
          ? sitesResult.data
          : (Array.isArray(sitesResult?.data?.data) ? sitesResult.data.data : []);

        const serverIds = new Set((serverSites || []).map((s: any) => String(s.id)));

        const raw = localStorage.getItem('bia-state') || localStorage.getItem('bia-app-state');
        const parsed = raw ? JSON.parse(raw) : null;
        const localSites = parsed?.sites || [];

        const isUuid = (v: string) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

        const orphanSites = localSites.filter((s: any) => {
          const id = String(s.id);
          return isUuid(id) && !serverIds.has(id);
        });

        if (!orphanSites || orphanSites.length === 0) {
          console.log('🧹 Nenhum site órfão encontrado.');
          return { removed: 0 };
        }

        const orphanIds = new Set(orphanSites.map((s: any) => String(s.id)));

        const newSites = (parsed?.sites || []).filter((s: any) => !orphanIds.has(String(s.id)));
        const newIdeas = (parsed?.ideas || []).map((i: any) => (orphanIds.has(String(i.siteId)) ? { ...i, siteId: null } : i));
        const newArticles = (parsed?.articles || []).map((a: any) => (orphanIds.has(String(a.siteId)) ? { ...a, siteId: null } : a));

        const now = Date.now();
        const newSnapshot = {
          meta: { lastUpdated: now },
          data: {
            sites: newSites,
            ideas: newIdeas,
            articles: newArticles,
            user: parsed?.user || null,
            lastSync: new Date().toISOString(),
          }
        };

        localStorage.setItem('bia-state', JSON.stringify(newSnapshot));

        // also clean WordPress local storage if present
        try {
          const wpRaw = localStorage.getItem('bia-wordpress-sites');
          if (wpRaw) {
            const wpArr = JSON.parse(wpRaw || '[]');
            const filtered = Array.isArray(wpArr) ? wpArr.filter((w: any) => !orphanIds.has(String(w.id))) : wpArr;
            localStorage.setItem('bia-wordpress-sites', JSON.stringify(filtered));
            console.log('🧹 WordPressService storage atualizado, removed:', wpArr.length - filtered.length);
          }
        } catch (wpErr) {
          console.warn('⚠️ Falha ao limpar storage do WordPressService:', wpErr);
        }

        console.log('✅ Remoção concluída. Sites removidos:', orphanSites.map(s => s.id));
        // return summary
        return { removed: orphanSites.length, ids: orphanSites.map(s => s.id) };
      } catch (err) {
        console.error('❌ Erro em __BIA_CLEAN_ORPHANS__:', err);
        throw err;
      }
    };
  }
} catch (err) {
  // ignore
}
