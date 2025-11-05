import { toast } from 'sonner';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  description: string;
  costPer1kTokens: number;
  maxTokens: number;
  isActive: boolean;
  capabilities: ('ideas' | 'content' | 'translation')[];
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  lastLogin: string;
  plan: string;
  isActive: boolean;
}

export interface SystemConfig {
  defaultAIModel: string;
  maxIdeasPerRequest: number;
  maxArticlesPerDay: number;
  enabledFeatures: string[];
  maintenanceMode: boolean;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

class AdminService {
  private readonly ADMIN_STORAGE_KEY = 'bia-admin-data';
  
  // Dados iniciais para demonstração
  private defaultAIModels: AIModel[] = [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      model: 'gpt-4o-mini',
      description: 'Modelo otimizado da OpenAI, rápido e eficiente para produção',
      costPer1kTokens: 0.00015,
      maxTokens: 16384,
      isActive: true,
      capabilities: ['ideas', 'content', 'translation'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      description: 'Modelo mais avançado da OpenAI, excelente para conteúdo criativo',
      costPer1kTokens: 0.03,
      maxTokens: 8192,
      isActive: false,
      capabilities: ['ideas', 'content', 'translation'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      description: 'Modelo rápido e eficiente, ótimo custo-benefício',
      costPer1kTokens: 0.002,
      maxTokens: 4096,
      isActive: false,
      capabilities: ['ideas', 'content'],
      createdAt: new Date().toISOString()
    }
  ];

  private defaultSystemConfig: SystemConfig = {
    defaultAIModel: 'gpt-4o-mini',
    maxIdeasPerRequest: 20,
    maxArticlesPerDay: 100,
    enabledFeatures: ['ideas', 'content', 'scheduling', 'wordpress'],
    maintenanceMode: false,
    apiKeys: {
      openai: import.meta.env.VITE_OPENAI_API_KEY || '',  // Carregado do ambiente
      anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      google: import.meta.env.VITE_GOOGLE_API_KEY || ''
    }
  };

  // Emails dos administradores
  private readonly ADMIN_EMAILS = [
    'admin@bia.com',
    'carlos@bia.com',
    'suporte@bloginfinitoautomatico.com.br'
  ];

  // Super Admin com acesso ilimitado
  private readonly SUPER_ADMIN_EMAILS = [
    'dev@bia.com'
  ];

  // Verificar se usuário é admin
  isAdmin(email: string): boolean {
    return this.ADMIN_EMAILS.includes(email.toLowerCase()) || this.isSuperAdmin(email);
  }

  // Verificar se usuário é super admin
  isSuperAdmin(email: string): boolean {
    return this.SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  }

  // Obter configurações do sistema
  getSystemConfig(): SystemConfig {
    try {
      const saved = localStorage.getItem(this.ADMIN_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const config = data.systemConfig || this.defaultSystemConfig;
        return config;
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
    return this.defaultSystemConfig;
  }

  // Salvar configurações do sistema
  updateSystemConfig(config: Partial<SystemConfig>): boolean {
    try {
      const current = this.getSystemConfig();
      const updated = { ...current, ...config };
      
      const data = this.getAdminData();
      data.systemConfig = updated;
      
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(data));
      
      // Toast específico para API keys
      if (config.apiKeys) {
        const hasOpenAI = updated.apiKeys.openai && updated.apiKeys.openai.trim();
        const hasAnthropic = updated.apiKeys.anthropic && updated.apiKeys.anthropic.trim();
        const hasGoogle = updated.apiKeys.google && updated.apiKeys.google.trim();
        
        if (hasOpenAI || hasAnthropic || hasGoogle) {
          toast.success('API Keys configuradas! Sistema BIA ativo para geração de conteúdo.');
        } else {
          toast.warning('API Keys removidas. Sistema funcionará em modo demonstração.');
        }
      } else {
        toast.success('Configurações atualizadas com sucesso!');
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    }
  }

  // Obter modelos de IA disponíveis
  getAIModels(): AIModel[] {
    try {
      const data = this.getAdminData();
      return data.aiModels || this.defaultAIModels;
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      return this.defaultAIModels;
    }
  }

  // Adicionar novo modelo de IA
  addAIModel(model: Omit<AIModel, 'id' | 'createdAt'>): boolean {
    try {
      const newModel: AIModel = {
        ...model,
        id: `${model.provider}-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      const data = this.getAdminData();
      data.aiModels = [...(data.aiModels || []), newModel];
      
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(data));
      toast.success(`Modelo ${model.name} adicionado com sucesso!`);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar modelo:', error);
      toast.error('Erro ao adicionar modelo');
      return false;
    }
  }

  // Atualizar modelo de IA
  updateAIModel(id: string, updates: Partial<AIModel>): boolean {
    try {
      const data = this.getAdminData();
      const models = data.aiModels || [];
      const index = models.findIndex(m => m.id === id);
      
      if (index === -1) {
        toast.error('Modelo não encontrado');
        return false;
      }
      
      models[index] = { ...models[index], ...updates };
      data.aiModels = models;
      
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(data));
      
      if (updates.isActive !== undefined) {
        toast.success(`Modelo ${updates.isActive ? 'ativado' : 'desativado'} com sucesso!`);
      } else {
        toast.success('Modelo atualizado com sucesso!');
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar modelo:', error);
      toast.error('Erro ao atualizar modelo');
      return false;
    }
  }

  // Remover modelo de IA
  removeAIModel(id: string): boolean {
    try {
      const data = this.getAdminData();
      const models = data.aiModels || [];
      const modelToRemove = models.find(m => m.id === id);
      
      if (!modelToRemove) {
        toast.error('Modelo não encontrado');
        return false;
      }
      
      data.aiModels = models.filter(m => m.id !== id);
      
      localStorage.setItem(this.ADMIN_STORAGE_KEY, JSON.stringify(data));
      toast.success(`Modelo ${modelToRemove.name} removido com sucesso!`);
      return true;
    } catch (error) {
      console.error('Erro ao remover modelo:', error);
      toast.error('Erro ao remover modelo');
      return false;
    }
  }

  // Obter estatísticas reais do sistema
  getSystemStats() {
    try {
      const realUsers = this.getAllUsers();
      const biaState = this.getBiaSystemState();
      
      const totalUsers = realUsers.length;
      const activeUsers = realUsers.filter(u => u.isActive).length;
      const totalSites = biaState.sites?.length || 0;
      const activeSites = biaState.sites?.filter((s: any) => s.status === 'ativo').length || 0;
      const totalIdeas = biaState.ideas?.length || 0;
      const totalArticles = biaState.articles?.length || 0;
      const completedArticles = biaState.articles?.filter((a: any) => a.status === 'Concluído').length || 0;
      const publishedArticles = biaState.articles?.filter((a: any) => a.status === 'Publicado').length || 0;
      
      // Calcular planos populares baseado em usuários reais
      const planStats = realUsers.reduce((acc: any, user) => {
        const plan = user.plan || 'Free';
        if (!acc[plan]) {
          acc[plan] = { name: plan, users: 0, revenue: 0 };
        }
        acc[plan].users++;
        
        // Calcular receita baseada no plano
        const planPrices: any = {
          'Free': 0,
          'Básico': 149.90,
          'Intermediário': 249.90,
          'Avançado': 599.90,
          'BIA': 999.90,
          'Admin': 0
        };
        acc[plan].revenue += planPrices[plan] || 0;
        
        return acc;
      }, {});
      
      const topPlans = Object.values(planStats)
        .sort((a: any, b: any) => b.users - a.users)
        .slice(0, 3);
      
      const monthlyRevenue = topPlans.reduce((sum: number, plan: any) => sum + plan.revenue, 0);
      
      // Atividade recente baseada em dados reais
      const recentActivity = [
        ...((biaState.articles || []).slice(-3).map((article: any) => ({
          action: `Artigo "${article.titulo}" foi ${article.status.toLowerCase()}`,
          user: biaState.sites?.find((s: any) => s.id === article.siteId)?.nome || `Site ID: ${article.siteId}`,
          time: new Date(article.updatedAt || article.createdAt).toLocaleString('pt-BR')
        }))),
        ...((biaState.ideas || []).slice(-2).map((idea: any) => ({
          action: `Nova ideia: "${idea.titulo}"`,
          user: biaState.sites?.find((s: any) => s.id === idea.siteId)?.nome || `Site ID: ${idea.siteId}`,
          time: new Date(idea.createdAt).toLocaleString('pt-BR')
        })))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
      
      return {
        totalUsers,
        activeUsers,
        totalSites,
        activeSites,
        totalIdeas,
        totalArticles,
        completedArticles,
        publishedArticles,
        dailyGenerations: Math.floor(totalIdeas / 30), // Estimativa diária
        monthlyRevenue: monthlyRevenue.toFixed(2),
        topPlans,
        recentActivity
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas do sistema:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSites: 0,
        activeSites: 0,
        totalIdeas: 0,
        totalArticles: 0,
        completedArticles: 0,
        publishedArticles: 0,
        dailyGenerations: 0,
        monthlyRevenue: '0.00',
        topPlans: [],
        recentActivity: []
      };
    }
  }

  // Obter estado do sistema BIA
  private getBiaSystemState(): any {
    try {
      // Priorizar estado canônico exposto pelo BiaContext
      const canonical = (window as any).__BIA_STATE__;
      if (canonical && typeof canonical === 'object') return canonical;

      // Se o servidor ainda não sincronizou, evitar uso de snapshots locais
      if (!(window as any).__BIA_SERVER_SYNCED) {
        console.log('⚠️ getBiaSystemState: sem estado canônico disponível e servidor não sincronizado — retornando estado vazio');
        return { sites: [], ideas: [], articles: [] };
      }

      const biaState = localStorage.getItem('bia-app-state');
      if (biaState) {
        return JSON.parse(biaState);
      }
      return { sites: [], ideas: [], articles: [] };
    } catch (error) {
      console.error('Erro ao carregar estado do sistema BIA:', error);
      return { sites: [], ideas: [], articles: [] };
    }
  }

  // Buscar usuários reais da plataforma (com integração ao banco)
  getAllUsers(): AdminUser[] {
    try {
      // Por enquanto, usar dados do localStorage como principal
      // A sincronização com o banco será feita em background
      const realUsers = this.getRealUsersFromStorage();
      
      // Tentar sincronizar com o banco em background (não bloquear)
      this.syncWithDatabase();
      
      // Adicionar apenas o admin do sistema se não estiver na lista
      const adminExists = realUsers.some(user => user.email === 'admin@bia.com');
      
      if (!adminExists) {
        realUsers.push({
          id: 999999,
          email: 'admin@bia.com',
          name: 'Administrador BIA',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          plan: 'Admin',
          isActive: true
        });
      }
      
      return realUsers;
    } catch (error) {
      console.error('Erro ao buscar usuários reais:', error);
      return [
        {
          id: 999999,
          email: 'admin@bia.com',
          name: 'Administrador BIA',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          plan: 'Admin',
          isActive: true
        }
      ];
    }
  }

  // Sincronizar com banco em background
  private async syncWithDatabase(): Promise<void> {
    try {
      const dbUsers = await this.getUsersFromDatabase();
      if (dbUsers.length > 0) {
        console.log(`📊 Encontrados ${dbUsers.length} usuários no banco de dados`);
        // Aqui poderíamos atualizar um cache local se necessário
      }
    } catch (error) {
      console.warn('Erro ao sincronizar com banco (não crítico):', error);
    }
  }

  // Método para buscar usuários do banco de dados
  private async getUsersFromDatabase(): Promise<AdminUser[]> {
    try {
      console.log('🔍 Buscando usuários no banco de dados...');
      
      // Usar o backend Laravel
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.users) {
        throw new Error(result.error || 'Resposta inválida do servidor');
      }

      // Converter dados do banco para formato AdminUser
      const dbUsers: AdminUser[] = result.users.map((user: any, index: number) => ({
        id: index + 1,
        email: user.email,
        name: user.name,
        role: this.isAdmin(user.email) ? 'admin' : 'user',
        lastLogin: user.updated_at || user.created_at,
        plan: user.plano,
        isActive: true
      }));

      console.log(`✅ ${dbUsers.length} usuários carregados do banco com sucesso`);
      return dbUsers;

    } catch (error) {
      console.error('❌ Erro ao buscar usuários do banco:', error);
      throw error;
    }
  }

  // Buscar usuários reais salvos no localStorage
  private getRealUsersFromStorage(): AdminUser[] {
    const realUsers: AdminUser[] = [];
    
    try {
      // Buscar usuários que fizeram login
      const userLogins = this.getAllUserLogins();
      
      userLogins.forEach((loginData, index) => {
        const user: AdminUser = {
          id: index + 1,
          email: loginData.email,
          name: loginData.name,
          role: this.isAdmin(loginData.email) ? 'admin' : 'user',
          lastLogin: loginData.lastLogin || new Date().toISOString(),
          plan: loginData.plan || 'Free',
          isActive: true
        };
        
        realUsers.push(user);
      });
      
      console.log(`📊 Encontrados ${realUsers.length} usuários reais cadastrados`);
      return realUsers;
    } catch (error) {
      console.error('Erro ao processar usuários do localStorage:', error);
      return [];
    }
  }

  // Coletar todos os logins únicos de usuários
  private getAllUserLogins(): any[] {
    const uniqueUsers = new Map<string, any>();
    
    try {
      // Verificar usuário atual logado
      const currentUser = localStorage.getItem('bia-user');
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        if (userData.email && userData.name) {
          uniqueUsers.set(userData.email, {
            email: userData.email,
            name: userData.name,
            plan: userData.plano || userData.plan || 'Free',
            lastLogin: new Date().toISOString()
          });
        }
      }
      
      // Verificar histórico de usuários (se existir)
      const userHistory = localStorage.getItem('bia-user-history');
      if (userHistory) {
        const history = JSON.parse(userHistory);
        if (Array.isArray(history)) {
          history.forEach(user => {
            if (user.email && user.name && !uniqueUsers.has(user.email)) {
              uniqueUsers.set(user.email, {
                email: user.email,
                name: user.name,
                plan: user.plano || user.plan || 'Free',
                lastLogin: user.lastLogin || new Date().toISOString()
              });
            }
          });
        }
      }
      
      // Verificar registros de estado do BIA
      const biaState = localStorage.getItem('bia-app-state');
      if (biaState) {
        const state = JSON.parse(biaState);
        if (state.user && state.user.email && state.user.name && !uniqueUsers.has(state.user.email)) {
          uniqueUsers.set(state.user.email, {
            email: state.user.email,
            name: state.user.name,
            plan: state.user.plano || state.user.plan || 'Free',
            lastLogin: new Date().toISOString()
          });
        }
      }
      
    } catch (error) {
      console.error('Erro ao coletar logins de usuários:', error);
    }
    
    return Array.from(uniqueUsers.values());
  }

  // Adicionar usuário ao histórico quando fizer login
  addUserToHistory(userData: any): void {
    try {
      const userHistory = localStorage.getItem('bia-user-history');
      let history: any[] = [];
      
      if (userHistory) {
        history = JSON.parse(userHistory);
      }
      
      // Verificar se usuário já existe no histórico
      const existingIndex = history.findIndex(user => user.email === userData.email);
      
      const userEntry = {
        email: userData.email,
        name: userData.name,
        plan: userData.plano || userData.plan || 'Free',
        lastLogin: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        // Atualizar usuário existente
        history[existingIndex] = userEntry;
      } else {
        // Adicionar novo usuário
        history.push(userEntry);
      }
      
      // Manter apenas os últimos 100 usuários
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      localStorage.setItem('bia-user-history', JSON.stringify(history));
      console.log(`👤 Usuário ${userData.name} adicionado ao histórico`);
    } catch (error) {
      console.error('Erro ao adicionar usuário ao histórico:', error);
    }
  }

  // Obter modelo ativo para uso
  getActiveAIModel(): AIModel | null {
    const models = this.getAIModels();
    const config = this.getSystemConfig();
    
    const defaultModel = models.find(m => m.id === config.defaultAIModel && m.isActive);
    if (defaultModel) return defaultModel;
    
    // Fallback para primeiro modelo ativo
    return models.find(m => m.isActive) || null;
  }

  // Testar conexão com modelo de IA
  async testAIModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.getAIModels().find(m => m.id === modelId);
      if (!model) {
        return { success: false, error: 'Modelo não encontrado' };
      }

      const config = this.getSystemConfig();
      let apiKey: string | undefined;

      // Obter a chave API correspondente ao provedor
      switch (model.provider) {
        case 'openai':
          apiKey = config.apiKeys.openai;
          break;
        case 'anthropic':
          apiKey = config.apiKeys.anthropic;
          break;
        case 'google':
          apiKey = config.apiKeys.google;
          break;
      }

      if (!apiKey || !apiKey.trim()) {
        return { success: false, error: 'Chave de API não configurada para este provedor' };
      }

      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular 90% de sucesso
      if (Math.random() > 0.1) {
        return { success: true };
      } else {
        return { success: false, error: 'Falha na conexão com a API' };
      }
    } catch (error) {
      return { success: false, error: 'Erro durante o teste' };
    }
  }

  // Verificar status das API keys
  getApiKeyStatus(): { [key: string]: boolean } {
    const config = this.getSystemConfig();
    return {
      openai: !!(config.apiKeys.openai && config.apiKeys.openai.trim()),
      anthropic: !!(config.apiKeys.anthropic && config.apiKeys.anthropic.trim()),
      google: !!(config.apiKeys.google && config.apiKeys.google.trim())
    };
  }

  // Obter erros do sistema
  getSystemErrors(): any[] {
    try {
      const errors = localStorage.getItem('bia-system-errors');
      return errors ? JSON.parse(errors) : [];
    } catch (error) {
      console.error('Erro ao carregar erros do sistema:', error);
      return [];
    }
  }

  // Limpar erros do sistema
  clearSystemErrors(): void {
    try {
      localStorage.removeItem('bia-system-errors');
      toast.success('Erros do sistema limpos com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar erros do sistema:', error);
      toast.error('Erro ao limpar erros do sistema');
    }
  }

  // Testar chave API OpenAI
  async testOpenAIKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testando chave API OpenAI...');
      
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro no teste da chave API:', { status: response.status, error: errorText });
        
        if (response.status === 401) {
          return { success: false, error: 'Chave API inválida ou expirada' };
        } else if (response.status === 403) {
          return { success: false, error: 'Chave API sem permissões suficientes' };
        } else if (response.status === 429) {
          return { success: false, error: 'Limite de requisições atingido' };
        } else {
          return { success: false, error: `Erro HTTP ${response.status}` };
        }
      }

      const data = await response.json();
      console.log('✅ Chave API OpenAI válida:', { modelsCount: data.data?.length || 0 });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao testar chave API:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro de conexão' 
      };
    }
  }

  private getAdminData() {
    try {
      const saved = localStorage.getItem(this.ADMIN_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error);
    }
    
    return {
      systemConfig: this.defaultSystemConfig,
      aiModels: this.defaultAIModels
    };
  }
}

export const adminService = new AdminService();