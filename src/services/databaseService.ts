import { toast } from 'sonner';

interface SyncData {
  sites: any[];
  ideas: any[];
  articles: any[];
}

class DatabaseService {
  private readonly BASE_URL: string;
  private readonly AUTH_TOKEN: string;

  // Indica se o BiaContext já carregou o estado canônico do servidor
  private isServerSynced(): boolean {
    try {
      return Boolean((window as any).__BIA_SERVER_SYNCED);
    } catch (err) {
      return false;
    }
  }

  constructor() {

    // Usar backend local (Laravel) ou o definido no .env
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      this.BASE_URL = `${apiBase}/api`;
      this.AUTH_TOKEN = '';
    } catch (error) {
      console.warn('⚠️ Erro ao configurar BASE_URL, usando fallback');
      this.BASE_URL = 'http://127.0.0.1:8000/api';
      this.AUTH_TOKEN = '';
    }
  }


  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.BASE_URL) {
      throw new Error('Database não configurado');
    }

    const url = `${this.BASE_URL}${endpoint}`;
    
    // Obter token do localStorage a cada requisição
    const token = localStorage.getItem('auth_token') || this.AUTH_TOKEN;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        let errorMessage = 'Erro na requisição';
        let errorData = '';
        
        try {
          errorData = await response.text();
          
          if (errorData.trim()) {
            try {
              const parsedError = JSON.parse(errorData);
              errorMessage = parsedError.error || parsedError.details || errorMessage;
            } catch (parseError) {
              // Se não conseguir parsear como JSON, usar o texto diretamente
              errorMessage = errorData.length > 200 ? 
                errorData.substring(0, 200) + '...' : 
                errorData;
            }
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (textError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Verificar se a resposta tem conteúdo
      const responseText = await response.text();
      
      if (!responseText.trim()) {
        console.warn('⚠️ Resposta vazia do servidor para:', endpoint);
        return { success: false, error: 'Resposta vazia do servidor' };
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError: any) {
        console.error(`❌ Erro ao parsear JSON da resposta ${endpoint}:`, parseError);
        console.error('❌ Resposta bruta:', responseText);
        throw new Error(`Resposta JSON inválida do servidor: ${parseError.message}`);
      }
    } catch (error: any) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }

  // ===== USER METHODS =====

  async registerUser(userData: any): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Laravel: /api/auth/register
      const result = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      return {
        success: false,
        error: error.message || 'Erro no registro'
      };
    }
  }

  async loginUser(email: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Laravel: /api/auth/login
      const result = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      return {
        success: false,
        error: error.message || 'Erro no login'
      };
    }
  }

  async updateUser(userId: string, updateData: any): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const result = await this.makeRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro na atualização:', error);
      return {
        success: false,
        error: error.message || 'Erro na atualização'
      };
    }
  }

  // ===== SYNC METHODS =====

  async syncUserData(userId: string, data: SyncData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 === SINCRONIZAÇÃO COMPLETA DO USUÁRIO ${userId} ===`);
      console.log(`📊 Dados a sincronizar:`, {
        sites: data.sites?.length || 0,
        ideas: data.ideas?.length || 0,
        articles: data.articles?.length || 0
      });
      
      // Usar nova rota de dados completos
      const result = await this.makeRequest(`/user-data/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (result.success) {
        console.log('✅ Dados completos sincronizados com sucesso');
        console.log('📈 Metadata:', result.metadata);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erro na sincronização completa:', error);
      return {
        success: false,
        error: error.message || 'Erro na sincronização'
      };
    }
  }

  async loadUserData(userId: string): Promise<{ success: boolean; data?: SyncData; error?: string }> {
    try {
      console.log(`📥 === CARREGAMENTO COMPLETO DO USUÁRIO ${userId} ===`);
      
      // Usar nova rota de dados completos
      const result = await this.makeRequest(`/user-data/${userId}`, {
        method: 'GET',
      });

      if (result.success) {
        console.log('✅ Dados completos carregados com sucesso');
        console.log(`📊 Dados carregados:`, {
          sites: result.data?.sites?.length || 0,
          ideas: result.data?.ideas?.length || 0,
          articles: result.data?.articles?.length || 0
        });
        console.log('📈 Metadata:', result.metadata);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erro no carregamento completo:', error);
      return {
        success: false,
        error: error.message || 'Erro no carregamento'
      };
    }
  }

  // ===== SYNC METHODS ESPECÍFICOS POR TIPO =====

  async syncSpecificData(userId: string, dataType: 'sites' | 'ideas' | 'articles', data: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 Sincronizando ${dataType} específicos do usuário ${userId}...`);
      console.log(`📊 Quantidade de ${dataType}:`, data.length);
      
      const result = await this.makeRequest(`/sync-data/${userId}/${dataType}`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      });

      if (result.success) {
        console.log(`✅ ${dataType} sincronizados com sucesso: ${result.count} itens`);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Erro na sincronização de ${dataType}:`, error);
      return {
        success: false,
        error: error.message || `Erro na sincronização de ${dataType}`
      };
    }
  }

  // Métodos de conveniência para cada tipo de dado
  async syncSites(userId: string, sites: any[]): Promise<{ success: boolean; error?: string }> {
    return this.syncSpecificData(userId, 'sites', sites);
  }

  async syncIdeas(userId: string, ideas: any[]): Promise<{ success: boolean; error?: string }> {
    return this.syncSpecificData(userId, 'ideas', ideas);
  }

  async syncArticles(userId: string, articles: any[]): Promise<{ success: boolean; error?: string }> {
    return this.syncSpecificData(userId, 'articles', articles);
  }

  // ===== INDIVIDUAL DATA METHODS =====

  async saveSites(userId: string, sites: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.makeRequest(`/sites/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ sites }),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao salvar sites:', error);
      return {
        success: false,
        error: error.message || 'Erro ao salvar sites'
      };
    }
  }

  async loadSites(userId: string): Promise<{ success: boolean; sites?: any[]; error?: string }> {
    try {
      const result = await this.makeRequest(`/sites/${userId}`, {
        method: 'GET',
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar sites:', error);
      return {
        success: false,
        error: error.message || 'Erro ao carregar sites'
      };
    }
  }

  async saveIdeas(userId: string, ideas: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.makeRequest(`/ideas/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ ideas }),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao salvar ideias:', error);
      return {
        success: false,
        error: error.message || 'Erro ao salvar ideias'
      };
    }
  }

  async loadIdeas(userId: string): Promise<{ success: boolean; ideas?: any[]; error?: string }> {
    try {
      const result = await this.makeRequest(`/ideas/${userId}`, {
        method: 'GET',
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar ideias:', error);
      return {
        success: false,
        error: error.message || 'Erro ao carregar ideias'
      };
    }
  }

  async saveArticles(userId: string, articles: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.makeRequest(`/articles/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ articles }),
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao salvar artigos:', error);
      return {
        success: false,
        error: error.message || 'Erro ao salvar artigos'
      };
    }
  }

  async loadArticles(userId: string): Promise<{ success: boolean; articles?: any[]; error?: string }> {
    try {
      const result = await this.makeRequest(`/articles/${userId}`, {
        method: 'GET',
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao carregar artigos:', error);
      return {
        success: false,
        error: error.message || 'Erro ao carregar artigos'
      };
    }
  }

  // ===== CONNECTIVITY =====

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeRequest('/health', {
        method: 'GET',
      });

      return result.status === 'ok';
    } catch (error) {
      console.warn('⚠️ Teste de conectividade falhou:', error);
      return false;
    }
  }

  // ===== CREDITS METHODS =====

  async getUserCredits(userId: string): Promise<{ success: boolean; credits?: any; error?: string }> {
    try {
      const result = await this.makeRequest(`/users/${userId}/credits`, {
        method: 'GET',
      });

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao obter créditos do usuário:', error);
      return {
        success: false,
        error: error.message || 'Erro ao obter créditos'
      };
    }
  }

  async consumeCredits(userId: string, creditType: 'articles' | 'ideas' | 'sites', quantity: number = 1): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
    try {
      const result = await this.makeRequest(`/users/${userId}/consume-credits`, {
        method: 'POST',
        body: JSON.stringify({
          creditType,
          quantity
        })
      });

      if (result.success) {
        console.log(`✅ Créditos consumidos: ${quantity} ${creditType}`);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao consumir créditos:', error);
      return {
        success: false,
        error: error.message || 'Erro ao consumir créditos'
      };
    }
  }

  async checkCredits(userId: string, creditType: 'articles' | 'ideas' | 'sites', quantity: number = 1): Promise<{ hasCredits: boolean; currentCredits?: number; error?: string }> {
    try {
      const result = await this.makeRequest(`/users/${userId}/check-credits`, {
        method: 'POST',
        body: JSON.stringify({
          creditType,
          quantity
        })
      });

      return {
        hasCredits: result.hasCredits,
        currentCredits: result.currentCredits
      };
    } catch (error: any) {
      console.error('❌ Erro ao verificar créditos:', error);
      // Em caso de erro, permitir (fail open)
      return { hasCredits: true };
    }
  }

  // ===== AUTO SYNC =====

  async enableAutoSync(userId: string, userData: any): Promise<void> {
    if (!userId || !this.BASE_URL) {
      console.log('🔄 Auto-sync desabilitado (sem userId ou backend)');
      return;
    }

    try {
      // Auto-sync a cada 30 segundos
      setInterval(async () => {
        try {
          if (!this.isServerSynced()) {
            console.log('⏳ Auto-sync aguardando estado canônico do servidor...');
            return;
          }
          console.log('🔄 Auto-sync executando...');

          // Buscar dados atuais do contexto BIA a partir do estado canônico exposto
          const biaData = this.getBiaContextData();

          if (biaData) {
            await this.syncUserData(userId, biaData);
          }
        } catch (error) {
          console.warn('⚠️ Auto-sync falhou:', error);
        }
      }, 30000);

      // Se o BiaContext ainda não sincronizou, aguardar evento para tentar sync imediato
      window.addEventListener('bia:server-synced', async () => {
        try {
          console.log('📣 Evento recebido: bia:server-synced — acionando auto-sync imediato');
          const biaData = this.getBiaContextData();
          if (biaData) await this.syncUserData(userId, biaData);
        } catch (err) {
          console.warn('⚠️ Falha no sync após sinal do servidor:', err);
        }
      });

      console.log('✅ Auto-sync ativado para usuário', userId);
    } catch (error) {
      console.warn('⚠️ Erro ao ativar auto-sync:', error);
    }
  }

  private getBiaContextData(): SyncData | null {
    try {
      // Priorizar estado canônico exposto pelo BiaContext
      const canonical = (window as any).__BIA_STATE__;
      if (canonical && typeof canonical === 'object') {
        return {
          sites: canonical.sites || [],
          ideas: canonical.ideas || [],
          articles: canonical.articles || []
        };
      }

      // Não usar snapshot local se o servidor já não sincronizou — evita reenvio de dados antigos
      if (!this.isServerSynced()) {
        console.log('⚠️ getBiaContextData: sem estado canônico disponível e servidor não sincronizado — não retornar snapshot local');
        return null;
      }

      // Fallback seguro: ler localStorage apenas se for realmente necessário (rare path)
      const biaState = localStorage.getItem('bia-state');
      if (biaState) {
        const state = JSON.parse(biaState);
        return {
          sites: state.sites || [],
          ideas: state.ideas || [],
          articles: state.articles || []
        };
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do contexto BIA:', error);
      return null;
    }
  }
}



// Função para consumir créditos (Laravel)
async function consumeCredits(userId: string, creditType: 'articles' | 'ideas' | 'sites', quantity: number = 1): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/users/${userId}/consume-credits`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          creditType,
          quantity
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Créditos consumidos: ${quantity} ${creditType}`);
      return {
        success: true,
        remainingCredits: result.remainingCredits
      };
    } else {
      throw new Error(result.error || 'Erro ao consumir créditos');
    }
  } catch (error) {
    console.error('❌ Erro ao consumir créditos:', error);
    return {
      success: false,
      error: error.message || 'Erro ao consumir créditos'
    };
  }
}

// Função para verificar se tem créditos suficientes (Laravel)
async function checkCredits(userId: string, creditType: 'articles' | 'ideas' | 'sites', quantity: number = 1): Promise<{ hasCredits: boolean; currentCredits?: number; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/users/${userId}/check-credits`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          creditType,
          quantity
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      hasCredits: result.hasCredits,
      currentCredits: result.currentCredits
    };
  } catch (error) {
    console.error('❌ Erro ao verificar créditos:', error);
    // Em caso de erro, permitir (fail open)
    return { hasCredits: true };
  }
}

export const databaseService = new DatabaseService();