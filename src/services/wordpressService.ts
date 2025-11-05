import { toast } from 'sonner';
import { getApiUrl } from '../config/api';

export interface WordPressSite {
  id: string;
  name: string;
  url: string;
  username: string;
  applicationPassword: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  postCount: number;
  categories: WordPressCategory[];
  authors: WordPressAuthor[];
  tags: WordPressTag[];
  isActive: boolean;
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
}

export interface WordPressAuthor {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export interface WordPressPost {
  id?: number;
  title: string;
  content: string;
  status: 'draft' | 'publish' | 'future';
  categories?: number[];
  tags?: number[];
  author?: number;
  excerpt?: string;
  date?: string;
  featured_media?: {
    imageUrl: string;
    alt: string;
  };
  meta?: {
    [key: string]: any;
  };
}

export interface ScheduledPost {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  content: string;
  scheduledDate: string;
  status: 'pending' | 'published' | 'failed';
  categories: number[];
  tags: number[];
  author?: number;
  error?: string;
  wpPostId?: number;
  createdAt: string;
}

class WordPressService {
  private readonly SITES_STORAGE_KEY = 'bia-wordpress-sites';
  private readonly POSTS_STORAGE_KEY = 'bia-scheduled-posts';
  private readonly INACCESSIBLE_SITES_KEY = 'bia-inaccessible-sites';
  
  // Cache de sites inacessíveis para evitar tentativas desnecessárias
  private inaccessibleSites: Map<string, number> = new Map(); // url -> timestamp
  
  // Reference to BiaContext data
  private biaContextData: any = null;
  private isContextSynced: boolean = false;

  // Método auxiliar para normalizar URLs
  private normalizeUrl(url: string): string {
    if (!url) return '';
    
    // Remover barra final
    let normalized = url.replace(/\/$/, '');
    
    // Garantir que tenha protocolo
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    return normalized;
  }

  // Método auxiliar para validar URL WordPress
  private isValidWordPressUrl(url: string): boolean {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const urlObj = new URL(normalizedUrl);
      
      // Verificar se é um domínio válido
      return urlObj.hostname.includes('.') && 
             (urlObj.protocol === 'http:' || urlObj.protocol === 'https:');
    } catch (error) {
      return false;
    }
  }

  // Método para carregar sites diretamente da API com dados WordPress completos
  private async loadSitesFromAPI(): Promise<void> {
    try {
      console.log('🚀 Carregando sites FRESCOS diretamente da API...');
      
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        console.log('⚠️ Sem token de autenticação, não é possível carregar dados da API');
        return;
      }

      const response = await fetch(`${getApiUrl()}/sites?include_wordpress_data=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Sites carregados da API:', result.data.length);
        
        // Converter para formato WordPress
        const wpSites: WordPressSite[] = result.data
          .filter((site: any) => {
            const hasWordPressData = site.wordpress_url && site.wordpress_username && site.wordpress_password;
            if (!hasWordPressData) {
              console.log(`⏭️ Site ${site.nome || site.id} não tem dados WordPress completos`);
            }
            return hasWordPressData;
          })
          .map((site: any) => ({
            id: site.id.toString(),
            name: site.nome || site.name || 'Site sem nome',
            url: this.normalizeUrl(site.wordpress_url),
            username: site.wordpress_username || '',
            applicationPassword: site.wordpress_password || '',
            status: 'connected' as const,
            lastSync: new Date().toISOString(),
            postCount: 0,
            categories: [],
            authors: [],
            tags: [],
            isActive: site.status === 'ativo'
          }));

        if (wpSites.length > 0) {
          this.saveSites(wpSites);
          console.log(`✅ ${wpSites.length} sites WordPress salvos no storage local`);
        } else {
          console.log('⚠️ Nenhum site com dados WordPress válidos encontrado na API');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar sites da API:', error);
    }
  }

  // Método para sincronizar com BiaContext
  async syncFromBiaContext(): Promise<void> {
    try {
      console.log('🔄 Sincronizando dados WordPress com BiaContext...');
      
      // Primeiro, tentar carregar dados FRESCOS diretamente da API
      await this.loadSitesFromAPI();
      
      if (typeof window !== 'undefined') {
        // Priorizar estado canônico exposto em window.__BIA_STATE__ (evita ler snapshots locais inválidos)
        let parsedData: any = (window as any)?.__BIA_STATE__ || null;

        if (!parsedData) {
          // Se o servidor ainda não sinalizou, não usar fallback local para evitar reintroduzir dados deletados
          if (!((window as any).__BIA_SERVER_SYNCED)) {
            console.log('⏳ syncFromBiaContext: estado canônico indisponível e servidor não sincronizado — abortando sync para evitar re-hidratação de snapshots locais');
            this.isContextSynced = false;
            return;
          }

          // Tentar ler localStorage como fallback apenas se o servidor já sincronizou
          try {
            let biaData = localStorage.getItem('bia-state') || localStorage.getItem('bia-app-state');
            if (biaData) {
              parsedData = JSON.parse(biaData);
              console.log('📦 Dados BIA carregados do localStorage (fallback)');
            }
          } catch (parseError) {
            console.warn('❌ Erro ao fazer parse dos dados BIA do localStorage:', parseError);
          }
        } else {
          console.log('📦 Usando estado canônico window.__BIA_STATE__');
        }
        
        if (parsedData?.sites && Array.isArray(parsedData.sites)) {
          console.log('🏢 Sites encontrados no BiaContext:', parsedData.sites.length);
          
          // Converter sites do BiaContext para formato WordPress
          const wpSites: WordPressSite[] = parsedData.sites
            .filter((site: any) => {
              const hasWordPressData = site.wordpressUrl && site.wordpressUsername && site.wordpressPassword;
              if (!hasWordPressData) {
                console.log(`⏭️ Site ${site.nome || site.id} não tem dados WordPress completos`);
              }
              return hasWordPressData;
            })
            .map((site: any) => ({
              id: site.id.toString(),
              name: site.nome || site.name || 'Site sem nome',
              url: this.normalizeUrl(site.wordpressUrl),
              username: site.wordpressUsername || '',
              applicationPassword: site.wordpressPassword || '',
              status: 'connected' as const,
              lastSync: new Date().toISOString(),
              postCount: 0,
              categories: [],
              authors: [],
              tags: [],
              isActive: site.status === 'ativo'
            }));

          console.log('✅ Sites WordPress válidos encontrados:', wpSites.length);

          if (wpSites.length > 0) {
            // Preservar dados já carregados do localStorage próprio
            const existingSites = this.getStoredSites();
            const mergedSites = wpSites.map(newSite => {
              const existing = existingSites.find(s => s.id === newSite.id);
              if (existing) {
                console.log(`🔄 Mesclando dados do site ${newSite.name} (${newSite.id}):`, {
                  categories: existing.categories?.length || 0,
                  authors: existing.authors?.length || 0,
                  tags: existing.tags?.length || 0
                });
                return {
                  ...newSite,
                  categories: existing.categories || [],
                  authors: existing.authors || [],
                  tags: existing.tags || [],
                  lastSync: existing.lastSync || newSite.lastSync,
                  status: existing.status || newSite.status
                };
              }
              console.log(`🆕 Novo site adicionado: ${newSite.name} (${newSite.id})`);
              return newSite;
            });

            this.saveSites(mergedSites);
            this.biaContextData = parsedData;
            this.isContextSynced = true;
            
            console.log(`✅ Sincronização concluída: ${mergedSites.length} sites WordPress`);
            return; // Sucesso
          } else {
            console.log('⚠️ Nenhum site com dados WordPress válidos encontrado');
          }
        } else {
          console.log('⚠️ Nenhum array de sites encontrado nos dados do BiaContext');
        }
      }
      
      // Se chegou aqui, não conseguiu sincronizar
      console.log('❌ Falha na sincronização: dados inválidos ou indisponíveis');
      this.isContextSynced = false;
    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error);
      this.isContextSynced = false;
      throw error; // Re-lançar para tratamento superior
    }
  }

  constructor() {
    // Quando BiaContext sinalizar que o servidor carregou o estado canônico, tentar sincronizar automaticamente
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('bia:server-synced', async () => {
          try {
            console.log('📣 wordpressService recebeu bia:server-synced — tentando syncFromBiaContext');
            await this.syncFromBiaContext();
          } catch (err) {
            console.warn('⚠️ Falha ao sincronizar WordPress após sinal do servidor:', err);
          }
        });
      }
    } catch (err) {
      // ignore
    }
  }

  // Método para obter sites - sempre retorna dados já processados e salvos
  getSites(): WordPressSite[] {
    try {
      // Usar dados do localStorage próprio do WordPressService
      const sitesData = localStorage.getItem(this.SITES_STORAGE_KEY);
      const sites = sitesData ? JSON.parse(sitesData) : [];
      
      console.log('📦 Retornando sites do WordPressService:', 
        sites.map((s: any) => `${s.id} (${s.name}) - Categories: ${s.categories?.length || 0}, Authors: ${s.authors?.length || 0}`)
      );
      
      return sites;
    } catch (error) {
      console.error('❌ Erro ao carregar sites:', error);
      return [];
    }
  }

  // Método auxiliar para obter sites diretamente do storage (sem logs)
  private getStoredSites(): WordPressSite[] {
    try {
      const sitesData = localStorage.getItem(this.SITES_STORAGE_KEY);
      return sitesData ? JSON.parse(sitesData) : [];
    } catch (error) {
      console.error('❌ Erro ao carregar sites do storage:', error);
      return [];
    }
  }

  // Método para salvar sites no localStorage
  saveSites(sites: WordPressSite[]): void {
    try {
      localStorage.setItem(this.SITES_STORAGE_KEY, JSON.stringify(sites));
      console.log('💾 Sites salvos no localStorage do WordPressService:', 
        sites.map(s => `${s.id} (${s.name})`)
      );
    } catch (error) {
      console.error('❌ Erro ao salvar sites no localStorage:', error);
    }
  }

  // Método para obter site por ID com busca mais robusta
  getSiteById(siteId: string | number): WordPressSite | null {
    try {
      const searchId = siteId.toString();
      console.log('🔍 Buscando site por ID:', searchId);
      
      const sites = this.getSites();
      
      if (sites.length === 0) {
        console.log('⚠️ Nenhum site WordPress encontrado no storage');
        return null;
      }
      
      // Tentar múltiplas formas de comparação (mais robusta)
      let site = sites.find(s => s.id === searchId);
      if (!site) {
        site = sites.find(s => s.id.toString() === searchId);
      }
      if (!site) {
        site = sites.find(s => parseInt(s.id) === parseInt(searchId));
      }
      if (!site && !isNaN(parseInt(searchId))) {
        site = sites.find(s => parseInt(s.id) === parseInt(searchId));
      }
      
      if (site) {
        console.log('✅ Site encontrado:', {
          id: site.id,
          name: site.name,
          categories: site.categories?.length || 0,
          authors: site.authors?.length || 0,
          tags: site.tags?.length || 0
        });
      } else {
        console.log('❌ Site não encontrado. Sites disponíveis:', 
          sites.map(s => `${s.id} (${s.name})`)
        );
      }
      
      return site || null;
    } catch (error) {
      console.error('Erro ao buscar site por ID:', error);
      return null;
    }
  }

  // Método para recarregar dados FRESCOS de um site específico
  async reloadSiteData(siteId: string | number): Promise<boolean> {
    try {
      const searchId = siteId.toString();
      console.log('🚀 FORÇANDO recarregamento de dados FRESCOS do site:', searchId);
      
      // Primeiro, sincronizar com BiaContext para ter dados atualizados
      await this.syncFromBiaContext();
      
      // Buscar site com método mais robusto
      let site = this.getSiteById(searchId);
      
      // Se não encontrou, tentar buscar nos dados do BiaContext diretamente
      if (!site && this.biaContextData?.sites) {
        console.log('🔄 Site não encontrado no cache, buscando no BiaContext...');
        
        const biaContextSite = this.biaContextData.sites.find((s: any) => {
          const sId = s.id.toString();
          return sId === searchId || s.id === parseInt(searchId) || parseInt(sId) === parseInt(searchId);
        });
        
        if (biaContextSite && biaContextSite.wordpressUrl && biaContextSite.wordpressUsername && biaContextSite.wordpressPassword) {
          console.log('✅ Site encontrado no BiaContext, criando entrada temporária...');
          
          site = {
            id: biaContextSite.id.toString(),
            name: biaContextSite.nome || biaContextSite.name || 'Site sem nome',
            url: this.normalizeUrl(biaContextSite.wordpressUrl),
            username: biaContextSite.wordpressUsername,
            applicationPassword: biaContextSite.wordpressPassword,
            status: 'connected' as const,
            lastSync: new Date().toISOString(),
            postCount: 0,
            categories: [],
            authors: [],
            tags: [],
            isActive: biaContextSite.status === 'ativo'
          };
        }
      }
      
      if (!site) {
        console.warn('❌ Site não encontrado para recarregamento:', searchId);
        return false;
      }

      console.log('📋 Site encontrado, verificando credenciais WordPress:', {
        hasUrl: !!site.url,
        hasUsername: !!site.username,
        hasPassword: !!site.applicationPassword
      });

      // Verificar se tem credenciais WordPress
      if (!site.url || !site.username || !site.applicationPassword) {
        console.warn('⚠️ Site sem credenciais WordPress completas');
        return false;
      }

      // Criar credenciais para o teste de conexão
      const credentials = {
        url: site.url,
        username: site.username,
        applicationPassword: site.applicationPassword
      };

      console.log('🧪 Testando conexão WordPress para obter dados FRESCOS...');

      // Testar conexão para obter dados atualizados DIRETO do WordPress
      const testResult = await this.testConnection(credentials);
      
      if (testResult.success) {
        console.log('✅ Conexão bem-sucedida, processando dados FRESCOS:', {
          categories: testResult.categories?.length || 0,
          authors: testResult.authors?.length || 0,
          tags: testResult.tags?.length || 0
        });

        // Atualizar dados do site com dados FRESCOS
        const updatedSite = {
          ...site,
          categories: testResult.categories || [],
          authors: testResult.authors || [],
          tags: testResult.tags || [],
          status: 'connected' as const,
          lastSync: new Date().toISOString()
        };

        // Atualizar no storage
        const currentSites = this.getSites();
        const updatedSites = currentSites.map(s => 
          s.id === searchId ? updatedSite : s
        );
        
        // Se o site não estava no storage, adicionar
        if (!currentSites.find(s => s.id === searchId)) {
          updatedSites.push(updatedSite);
          console.log('🆕 Site adicionado ao storage WordPress');
        }
        
        this.saveSites(updatedSites);

        console.log('✅ Dados FRESCOS do site recarregados e salvos com sucesso!');
        return true;
      }

      console.warn('❌ Falha ao recarregar dados do site:', testResult.error);
      return false;
      
    } catch (error) {
      console.error('❌ Erro ao recarregar dados do site:', error);
      return false;
    }
  }

  // Testar conexão usando a API do servidor (bypass CORS)
  async testConnection(credentials: { url: string; username: string; applicationPassword: string }): Promise<{ success: boolean; error?: string; categories?: any[]; authors?: any[]; tags?: any[]; preCheck?: any; errorCategory?: string; serverTested?: boolean; summary?: any; details?: any; loadedFromWordPress?: boolean }> {
    try {
      console.log('🧪 Iniciando teste de conexão WordPress via servidor:', {
        url: credentials.url,
        username: credentials.username,
        hasPassword: !!credentials.applicationPassword
      });

      // Validações básicas
      if (!credentials.url || !credentials.username || !credentials.applicationPassword) {
        return { success: false, error: 'Todos os campos são obrigatórios' };
      }
      
      // Validar formato da URL
      if (!this.isValidWordPressUrl(credentials.url)) {
        return { success: false, error: 'URL inválida. Use o formato completo: https://seusite.com' };
      }

      console.log('🚀 Enviando teste para o servidor...');

      // Usar a API do backend Laravel
      const response = await fetch(`${getApiUrl()}/wordpress/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          wordpress_url: credentials.url,
          wordpress_username: credentials.username,
          wordpress_password: credentials.applicationPassword
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      // Testar conexão bem-sucedida, agora buscar dados adicionais
      const [categoriesRes, authorsRes, tagsRes] = await Promise.all([
        fetch(`${getApiUrl()}/wordpress/get-categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            wordpress_url: credentials.url,
            wordpress_username: credentials.username,
            wordpress_password: credentials.applicationPassword
          })
        }),
        fetch(`${getApiUrl()}/wordpress/get-authors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            wordpress_url: credentials.url,
            wordpress_username: credentials.username,
            wordpress_password: credentials.applicationPassword
          })
        }),
        fetch(`${getApiUrl()}/wordpress/get-tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            wordpress_url: credentials.url,
            wordpress_username: credentials.username,
            wordpress_password: credentials.applicationPassword
          })
        })
      ]);

      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const authors = authorsRes.ok ? await authorsRes.json() : [];
      const tags = tagsRes.ok ? await tagsRes.json() : [];

      console.log('✅ Dados WordPress carregados com sucesso via backend Laravel:', {
        categoriesCount: categories?.length || 0,
        authorsCount: authors?.length || 0,
        tagsCount: tags?.length || 0
      });

      return {
        success: true,
        categories: categories || [],
        authors: authors || [],
        tags: tags || [],
        serverTested: true,
        loadedFromWordPress: true
      };

    } catch (error: any) {
      console.error('❌ Erro geral no teste de conexão WordPress:', error);
      
      let errorMessage = 'Erro de comunicação com o servidor';
      let errorCategory = 'server_error';
      
      if (error.message?.includes('401')) {
        errorCategory = 'credentials';
        errorMessage = 'Credenciais inválidas. Verifique o nome de usuário e Application Password.';
      } else if (error.message?.includes('403')) {
        errorCategory = 'permissions';
        errorMessage = 'Usuário sem permissões suficientes. Use um usuário Administrador.';
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorCategory = 'connectivity';
        errorMessage = 'Site inacessível ou offline. Verifique se a URL está correta.';
      } else if (error.name === 'AbortError') {
        errorCategory = 'timeout';
        errorMessage = 'Timeout na conexão. O teste demorou muito para responder. Verifique sua conexão e tente novamente.';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorCategory = 'network';
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
      } else if (error instanceof SyntaxError) {
        errorCategory = 'response';
        errorMessage = 'Resposta inválida do servidor. Tente novamente em alguns minutos.';
      } else if (error instanceof Error) {
        errorMessage = `Erro técnico: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage,
        errorCategory,
        serverTested: true
      };
    }
  }

  // Obter status de conectividade de um site
  getSiteConnectivityStatus(siteId: string): { status: string; message: string; canRetry: boolean } {
    const sites = this.getSites();
    const site = sites.find(s => s.id === siteId);
    
    if (!site) {
      return { status: 'not_found', message: 'Site não encontrado', canRetry: false };
    }
    
    switch (site.status) {
      case 'connected':
        const lastSyncTime = new Date(site.lastSync).getTime();
        const hoursSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 48) {
          return { 
            status: 'outdated', 
            message: 'Dados desatualizados. Sincronização recomendada.', 
            canRetry: true 
          };
        }
        
        return { 
          status: 'connected', 
          message: 'Site conectado e funcionando', 
          canRetry: false 
        };
        
      case 'error':
        return { 
          status: 'error', 
          message: 'Site com problemas de conectividade. Usando dados em cache.', 
          canRetry: true 
        };
        
      case 'disconnected':
      default:
        return { 
          status: 'disconnected', 
          message: 'Site não testado ou desconectado. Clique para conectar.', 
          canRetry: true 
        };
    }
  }

  // Método para obter categorias de um site
  async getCategories(site: any): Promise<WordPressCategory[]> {
    try {
      console.log('📂 Buscando categorias do WordPress...');

      const normalizedUrl = this.normalizeUrl(site.url);
      const endpoint = `${normalizedUrl}/wp-json/wp/v2/categories?per_page=100`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${site.username}:${site.applicationPassword}`)}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const categories = await response.json();
      
      return categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }];
    }
  }

  // Método para obter autores de um site
  async getAuthors(site: any): Promise<WordPressAuthor[]> {
    try {
      console.log('👥 Buscando autores do WordPress...');

      const normalizedUrl = this.normalizeUrl(site.url);
      const endpoint = `${normalizedUrl}/wp-json/wp/v2/users?per_page=100&context=edit`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${site.username}:${site.applicationPassword}`)}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const authors = await response.json();
      
      return authors.map((author: any) => ({
        id: author.id,
        name: author.name,
        slug: author.slug,
        description: author.description || ''
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar autores:', error);
      return [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }];
    }
  }

  // Método para obter tags de um site
  async getTags(site: any): Promise<WordPressTag[]> {
    try {
      console.log('🏷️ Buscando tags do WordPress...');

      const normalizedUrl = this.normalizeUrl(site.url);
      const endpoint = `${normalizedUrl}/wp-json/wp/v2/tags?per_page=100`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${site.username}:${site.applicationPassword}`)}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tags = await response.json();
      
      return tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        count: tag.count || 0
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar tags:', error);
      return [];
    }
  }

  // Método para criar uma nova tag no WordPress
  async createTag(site: any, tagData: { name: string; slug: string }): Promise<WordPressTag> {
    try {
      console.log('🏷️ Criando nova tag no WordPress via backend:', tagData);

      const response = await fetch(`${getApiUrl()}/wordpress/create-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          wordpress_url: site.wordpressUrl || site.url,
          wordpress_username: site.wordpressUsername || site.username,
          wordpress_password: site.wordpressPassword || site.applicationPassword,
          name: tagData.name,
          slug: tagData.slug
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const createdTag = await response.json();
      
      console.log('✅ Tag criada com sucesso via backend:', createdTag);
      
      return {
        id: createdTag.id,
        name: createdTag.name,
        slug: createdTag.slug,
        count: createdTag.count || 0
      };

    } catch (error) {
      console.error('❌ Erro ao criar tag via backend:', error);
      throw error;
    }
  }

  // Método para publicar posts no WordPress via servidor
  async publishPost(siteId: string, postData: WordPressPost): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    try {
      console.log('🚀 Iniciando publicação no WordPress via servidor:', {
        siteId,
        title: postData.title,
        status: postData.status
      });

      // Buscar dados do site localmente primeiro
      const site = this.getSiteById(siteId);
      if (!site) {
        console.error(`❌ Site não encontrado localmente: ${siteId}`);
        return { 
          success: false, 
          error: `Site não encontrado: ${siteId}` 
        };
      }

      console.log('✅ Site encontrado localmente:', {
        id: site.id,
        name: site.name,
        hasWordPressUrl: !!site.url,
        hasCredentials: !!(site.username && site.applicationPassword)
      });

      // Preparar dados da imagem se existe featured_media
      const imageData = postData.featured_media ? {
        url: postData.featured_media.imageUrl,
        alt: postData.featured_media.alt || postData.title,
        title: postData.title
      } : undefined;

      // Remover featured_media do postData para evitar conflitos
      const { featured_media, ...cleanPostData } = postData;

      console.log('🖼️ Dados da imagem preparados:', imageData);

      // Usar a API do backend Laravel para publicar posts
      const response = await fetch(`${getApiUrl()}/wordpress/publish-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          siteId,
          postData: cleanPostData,
          imageData: imageData, // Adicionar dados da imagem
          // Enviar dados completos do site como fallback
          siteData: {
            id: site.id,
            name: site.name,
            url: site.url,
            username: site.username,
            applicationPassword: site.applicationPassword
          }
        })
      });

      const result = await response.json();
      
      console.log('📋 Resposta do servidor para publicação:', result);

      if (!response.ok || !result.success) {
        console.log('❌ Falha na publicação via servidor:', result);
        return { 
          success: false, 
          error: result.error || `Erro HTTP ${response.status}: ${response.statusText}` 
        };
      }

      console.log('✅ Publicação bem-sucedida via servidor:', {
        postId: result.postId,
        status: postData.status
      });

      return { 
        success: true, 
        postId: result.postId,
        postUrl: result.postUrl || result.link
      };

    } catch (error) {
      console.error('❌ Erro geral na publicação via servidor:', error);
      
      let errorMessage = 'Erro de comunicação com o servidor de publicação';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
      } else if (error instanceof Error) {
        errorMessage = `Erro técnico: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // Método para buscar posts do WordPress via servidor
  async getPosts(siteId: string, params?: { 
    status?: string; 
    per_page?: number; 
    page?: number; 
    after?: string; 
    before?: string; 
  }): Promise<{ success: boolean; posts?: any[]; error?: string }> {
    try {
      console.log('📋 Buscando posts do WordPress via servidor:', {
        siteId,
        params
      });

      // Buscar dados do site localmente primeiro
      const site = this.getSiteById(siteId);
      if (!site) {
        console.error(`❌ Site não encontrado localmente: ${siteId}`);
        return { 
          success: false, 
          error: `Site não encontrado: ${siteId}` 
        };
      }

      // Usar a API do backend Laravel para buscar posts
      const response = await fetch(`${getApiUrl()}/wordpress/get-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          siteId,
          params: params || {},
          // Enviar dados completos do site como fallback
          siteData: {
            id: site.id,
            name: site.name,
            url: site.url,
            username: site.username,
            applicationPassword: site.applicationPassword
          }
        })
      });

      const result = await response.json();
      
      console.log('📋 Resposta do servidor para busca de posts:', {
        success: result.success,
        postsCount: result.posts?.length || 0
      });

      if (!response.ok || !result.success) {
        console.log('❌ Falha na busca de posts via servidor:', result);
        return { 
          success: false, 
          error: result.error || `Erro HTTP ${response.status}: ${response.statusText}` 
        };
      }

      console.log('✅ Posts buscados com sucesso via servidor:', {
        count: result.posts?.length || 0
      });

      return { 
        success: true, 
        posts: result.posts || []
      };

    } catch (error) {
      console.error('❌ Erro geral na busca de posts via servidor:', error);
      
      let errorMessage = 'Erro de comunicação com o servidor';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
      } else if (error instanceof Error) {
        errorMessage = `Erro técnico: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // Método para buscar posts do calendário do WordPress via servidor
  async getCalendarPosts(siteId: string, year?: number, month?: number): Promise<{ success: boolean; calendar?: any; error?: string }> {
    try {
      console.log('📅 Buscando posts do calendário do WordPress via servidor:', {
        siteId,
        year,
        month
      });

      // Buscar dados do site localmente primeiro
      const site = this.getSiteById(siteId);
      if (!site) {
        console.error(`❌ Site não encontrado localmente: ${siteId}`);
        return { 
          success: false, 
          error: `Site não encontrado: ${siteId}` 
        };
      }

      // Usar a API do backend Laravel para buscar posts do calendário
      const response = await fetch(`${getApiUrl()}/wordpress/get-calendar-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          siteId,
          year: year || new Date().getFullYear(),
          month: month || new Date().getMonth() + 1,
          // Enviar dados completos do site como fallback
          siteData: {
            id: site.id,
            name: site.name,
            url: site.url,
            username: site.username,
            applicationPassword: site.applicationPassword
          }
        })
      });

      const result = await response.json();
      
      console.log('📋 Resposta do servidor para busca de calendário:', {
        success: result.success,
        calendarData: result.calendar ? 'dados encontrados' : 'nenhum dado'
      });

      if (!response.ok || !result.success) {
        console.log('❌ Falha na busca de calendário via servidor:', result);
        return { 
          success: false, 
          error: result.error || `Erro HTTP ${response.status}: ${response.statusText}` 
        };
      }

      console.log('✅ Calendário buscado com sucesso via servidor');

      return { 
        success: true, 
        calendar: result.calendar || {}
      };

    } catch (error) {
      console.error('❌ Erro geral na busca de calendário via servidor:', error);
      
      let errorMessage = 'Erro de comunicação com o servidor';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
      } else if (error instanceof Error) {
        errorMessage = `Erro técnico: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  // Método para agendar posts no WordPress
  async schedulePost(siteId: string, postData: WordPressPost, scheduledDate: string): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    try {
      console.log('📅 Iniciando agendamento no WordPress via servidor:', {
        siteId,
        title: postData.title,
        scheduledDate
      });

      // Buscar dados do site localmente primeiro
      const site = this.getSiteById(siteId);
      if (!site) {
        console.error(`❌ Site não encontrado localmente: ${siteId}`);
        return { 
          success: false, 
          error: `Site não encontrado: ${siteId}` 
        };
      }

      console.log('✅ Site encontrado para agendamento:', {
        id: site.id,
        name: site.name,
        hasWordPressUrl: !!site.url,
        hasCredentials: !!(site.username && site.applicationPassword)
      });

      // Preparar dados da imagem se existe featured_media
      const imageData = postData.featured_media ? {
        url: postData.featured_media.imageUrl,
        alt: postData.featured_media.alt || postData.title,
        title: postData.title
      } : undefined;

      // Remover featured_media do postData para evitar conflitos
      const { featured_media, ...cleanPostData } = postData;

      // Definir status como 'future' para agendamento
      const scheduledPostData = {
        ...cleanPostData,
        status: 'future' as const,
        date: scheduledDate
      };

      console.log('🖼️ Dados do post agendado preparados:', {
        title: scheduledPostData.title,
        status: scheduledPostData.status,
        date: scheduledPostData.date,
        hasImage: !!imageData
      });

      // Usar a API do backend Laravel para agendar posts
      const response = await fetch(`${getApiUrl()}/wordpress/schedule-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          siteId,
          postData: scheduledPostData,
          imageData: imageData,
          scheduledDate,
          // Enviar dados completos do site como fallback
          siteData: {
            id: site.id,
            name: site.name,
            url: site.url,
            username: site.username,
            applicationPassword: site.applicationPassword
          }
        })
      });

      const result = await response.json();
      
      console.log('📋 Resposta do servidor para agendamento:', result);

      if (!response.ok || !result.success) {
        console.log('❌ Falha no agendamento via servidor:', result);
        return { 
          success: false, 
          error: result.error || `Erro HTTP ${response.status}: ${response.statusText}` 
        };
      }

      console.log('✅ Agendamento bem-sucedido via servidor:', {
        postId: result.postId,
        scheduledDate
      });

      return { 
        success: true, 
        postId: result.postId,
        postUrl: result.postUrl || result.link
      };

    } catch (error) {
      console.error('❌ Erro geral no agendamento via servidor:', error);
      
      let errorMessage = 'Erro de comunicação com o servidor de agendamento';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
      } else if (error instanceof Error) {
        errorMessage = `Erro técnico: ${error.message}`;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }
}

// Exportar instância singleton
export const wordpressService = new WordPressService();