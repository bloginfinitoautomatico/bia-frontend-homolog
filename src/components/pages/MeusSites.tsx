import React, { useState } from 'react';
// WordPress API Fix - Build 2025-01-15 v1.2.3
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { getApiUrl } from '../../config/api';
import { useCredits } from '../../hooks/useCredits';
import { 
  Plus, 
  Monitor, 
  CheckCircle, 
  ExternalLink, 
  Trash2, 
  FileText, 
  Settings, 
  Loader2, 
  AlertCircle,
  Globe,
  Wifi,
  WifiOff,
  ArrowUpRight,
  Clock,
  Lightbulb,
  BarChart3
} from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { getPlanLimits } from '../../utils/constants';
import { toast } from 'sonner';

interface MeusSitesProps {
  userData: any;
  onUpdateUser?: (userData: any) => Promise<boolean>;
  onNavigate?: (page: string) => void;
}

interface SiteConnectionForm {
  nome: string;
  url: string;
  username: string;
  applicationPassword: string;
}

interface WordPressData {
  categories: any[];
  authors: any[];
  tags: any[];
}

export function MeusSites({ userData, onUpdateUser, onNavigate }: MeusSitesProps) {
  const { state, actions } = useBia();
  const { dashboardData, loading, error, refreshDashboard } = useDashboard();
  const availableCredits = useCredits();
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [siteForm, setSiteForm] = useState<SiteConnectionForm>({ 
    nome: '', 
    url: '',
    username: '',
    applicationPassword: ''
  });
  const [connectionResult, setConnectionResult] = useState<WordPressData | null>(null);

  // Use data from API if available, fallback to props (mesma lógica do Dashboard)
  const user = dashboardData?.user || userData;
  const limits = dashboardData?.limits;
  const usage = dashboardData?.usage;
  const economics = dashboardData?.economics;

  // Verificar tipo de usuário e plano usando dados da API (mesma lógica do Dashboard)
  const isDev = user?.email === 'dev@bia.com' || user?.is_admin || user?.is_developer;
  const isAdmin = user?.is_admin === true;
  const currentPlan = isDev ? 'Developer' : (user?.plano || 'Free');
  const isFree = !isDev && currentPlan === 'Free';

  // Usar dados da API se disponíveis, senão calcular localmente (mesma lógica do Dashboard)
  const calculatedLimits = getPlanLimits(currentPlan);
  
  // 🔧 VALIDAÇÃO: Verificar se os dados do backend estão corretos para cada plano
  const validateBackendLimits = (plan: string, backendLimits: any) => {
    if (!backendLimits) return false;
    
    const expected = getPlanLimits(plan);
    const issues: string[] = [];
    
    // Validar sites
    if (backendLimits.sites !== expected.sites) {
      issues.push(`Sites: esperado ${expected.sites}, recebido ${backendLimits.sites}`);
    }
    
    // Validar ideias (apenas para Free, outros são ilimitados)
    if (plan === 'Free' && backendLimits.ideas !== expected.ideas) {
      issues.push(`Ideias: esperado ${expected.ideas}, recebido ${backendLimits.ideas}`);
    }
    
    // Validar artigos base (sem quotas)
    if (backendLimits.articles !== expected.articles) {
      issues.push(`Artigos: esperado ${expected.articles}, recebido ${backendLimits.articles}`);
    }
    
    if (issues.length > 0) {
      console.warn(`🚨 Dados incorretos do backend para plano ${plan}:`, issues);
      return true; // Precisa forçar recálculo
    }
    
    return false; // Dados corretos
  };
  
  // Forçar recálculo se backend retornar dados incorretos para qualquer plano
  const shouldForceRecalculation = limits && validateBackendLimits(currentPlan, limits);
  
  const planLimits = (limits && !shouldForceRecalculation) ? {
    // Se backend retornar limites corretos, usar eles
    sites: limits.sites || calculatedLimits.sites,
    ideas: limits.ideas || calculatedLimits.ideas,
    articles: limits.articles || calculatedLimits.articles, // CORREÇÃO: Usar diretamente, sem somar
    isUnlimited: limits.isUnlimited || calculatedLimits.isUnlimited
  } : {
    // Senão, calcular localmente (forçado para Avançado se backend estiver errado)
    ...calculatedLimits,
    // CORREÇÃO: Para usuários Free, usar sempre quotas do usuário direto
    articles: calculatedLimits.articles
  };

  // Usar contagens da API se disponíveis, senão usar dados do contexto (mesma lógica do Dashboard)
  const realArticleCount = usage?.articles?.total ?? state.articles?.filter(a => a.status !== 'Excluído').length ?? 0;
  const realIdeaCount = usage?.ideas?.total ?? state.ideas?.length ?? 0;
  const realSiteCount = usage?.sites?.total ?? state.sites?.length ?? 0;
  const publishedArticles = usage?.articles?.published ?? state.articles?.filter(a => a.status === 'Publicado').length ?? 0;
  const activeSites = usage?.sites?.active ?? state.sites?.filter(s => s.status === 'ativo').length ?? 0;

  // Função para formatar valores de limite (mesma lógica do Dashboard)
  const formatLimitValue = (value: number, isUnlimited: boolean = false): string => {
    if (isDev || isUnlimited || value === Number.MAX_SAFE_INTEGER || value >= 999999) {
      return '∞';
    }
    return value.toString();
  };

  // Verificar se sites são ilimitados (mesma lógica do Dashboard)
  const sitesUnlimited = usage?.sites?.unlimited ?? planLimits.isUnlimited ?? currentPlan === 'BIA' ?? currentPlan === 'Ilimitado';
  const articlesUnlimited = usage?.articles?.unlimited ?? (isDev || planLimits.articles >= 999999);

  // Verificar se é desenvolvedor ou tem plano ilimitado (corrigido para incluir plano Ilimitado)
  const isUnlimitedSites = isDev || sitesUnlimited || planLimits.sites === Number.MAX_SAFE_INTEGER || planLimits.sites === -1 || planLimits.sites >= 999999;
  
  // Limites baseados nos dados reais da API (corrigido)
  const sitesLimit = isUnlimitedSites ? '∞' : planLimits.sites;
  const sitesUsed = realSiteCount;
  const canAddSite = isUnlimitedSites || sitesUsed < planLimits.sites;

  const handleConnectSite = async () => {
    if (!siteForm.nome.trim()) {
      toast.error('Nome do site é obrigatório');
      return;
    }
    
    if (!siteForm.url || !siteForm.url.startsWith('http')) {
      toast.error('URL deve começar com http:// ou https://');
      return;
    }

    if (!siteForm.username.trim()) {
      toast.error('Usuário WordPress é obrigatório');
      return;
    }

    if (!siteForm.applicationPassword.trim()) {
      toast.error('Application Password é obrigatória');
      return;
    }

        // Verificar limite baseado nos dados reais da API (corrigido)
        if (!isUnlimitedSites && sitesUsed >= planLimits.sites) {
          const planName = currentPlan || 'gratuito';
          toast.error(`Limite de ${planLimits.sites} site(s) atingido no plano ${planName}. Faça upgrade.`);
          return;
        }    setConnecting(true);
    
    try {
      // 🔐 VALIDAÇÃO CRÍTICA: Verificar token ANTES de fazer requisições
      const token = localStorage.getItem('auth_token');
      
      if (!token || token.trim() === '') {
        console.error('❌ Token vazio ou inválido - sessão expirada');
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        setConnecting(false);
        window.location.hash = '#/login';
        return;
      }
      
      console.log('🔐 Token validado:', {
        exists: !!token,
        length: token.length,
        preview: token.substring(0, 30) + '...',
        timestamp: new Date().toISOString()
      });

      // 1. Testar conexão WordPress primeiro
      console.log('🔄 Testando conexão WordPress...');
      
      const testResult = await fetch(getApiUrl('wordpress/test-connection'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          wordpress_url: siteForm.url,
          wordpress_username: siteForm.username,
          wordpress_password: siteForm.applicationPassword
        })
      });

      // 🔍 DEBUG: Log detalhado da resposta
      console.log('📊 Response from test-connection:', {
        status: testResult.status,
        statusText: testResult.statusText,
        contentType: testResult.headers.get('content-type'),
        timestamp: new Date().toISOString()
      });

      if (!testResult.ok) {
        const errorBody = await testResult.text();
        console.error('❌ Erro na resposta:', {
          status: testResult.status,
          body: errorBody.substring(0, 500)
        });
        
        // Verificar se é erro 401 do BIA (token expirado)
        if (testResult.status === 401 && errorBody.includes('"code":"INTERNAL_SERVER_ERROR"')) {
          toast.error('Autenticação expirada. Fazendo login novamente...');
          await actions.refreshUserData();
          throw new Error('Token expirado - por favor, tente novamente');
        }
        
        // Verificar se é erro 401 do WordPress (credenciais inválidas)
        if (testResult.status === 401 || testResult.status === 403) {
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message && errorJson.message.includes('senha de aplica')) {
              throw new Error('❌ Senha de aplicação inválida no WordPress. Verifique o usuário e a Application Password.');
            } else if (errorJson.message && errorJson.message.includes('desconhecido')) {
              throw new Error('❌ Usuário WordPress não encontrado. Verifique o nome de usuário.');
            }
          } catch (e) {
            // Se não conseguir parsear, use a mensagem genérica
          }
          throw new Error('❌ Falha na autenticação do WordPress. Verifique as credenciais.');
        }
        
        throw new Error(`Falha na conexão com WordPress (${testResult.status})`);
      }

      // 2. Buscar dados WordPress (categorias, autores, tags)
      console.log('📊 Buscando dados do WordPress...');
      
      const [categoriesRes, authorsRes, tagsRes] = await Promise.all([
        fetch(getApiUrl('wordpress/get-categories'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            wordpress_url: siteForm.url,
            wordpress_username: siteForm.username,
            wordpress_password: siteForm.applicationPassword
          })
        }),
        fetch(getApiUrl('wordpress/get-authors'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            wordpress_url: siteForm.url,
            wordpress_username: siteForm.username,
            wordpress_password: siteForm.applicationPassword
          })
        }),
        fetch(getApiUrl('wordpress/get-tags'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            wordpress_url: siteForm.url,
            wordpress_username: siteForm.username,
            wordpress_password: siteForm.applicationPassword
          })
        })
      ]);

      // Verificar se todas as respostas foram bem-sucedidas
      if (!categoriesRes.ok || !authorsRes.ok || !tagsRes.ok) {
        console.warn('⚠️ Algumas requisições falharam, mas continuando...', {
          categories: { status: categoriesRes.status, ok: categoriesRes.ok },
          authors: { status: authorsRes.status, ok: authorsRes.ok },
          tags: { status: tagsRes.status, ok: tagsRes.ok }
        });
      }

      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const authors = authorsRes.ok ? await authorsRes.json() : [];
      const tags = tagsRes.ok ? await tagsRes.json() : [];

      // 3. Criar site com dados WordPress integrados
      const siteData = {
        nome: siteForm.nome,
        url: siteForm.url,
        status: 'ativo' as 'ativo',
        wordpressUrl: siteForm.url,
        wordpressUsername: siteForm.username,
        wordpressPassword: siteForm.applicationPassword,
        descricao: `Site WordPress conectado automaticamente`,
        categoria: 'wordpress',
        nicho: 'automatico'
      };

      const success = await actions.addSite(siteData);
      
      if (success) {
        // Salvar dados WordPress para resultado
        setConnectionResult({
          categories: categories || [],
          authors: authors || [],
          tags: tags || []
        });

        // Resetar formulário
        setSiteForm({ nome: '', url: '', username: '', applicationPassword: '' });
        setShowConnectForm(false);
        
        // Mostrar resultado
        const categoriesCount = categories?.length || 0;
        const authorsCount = authors?.length || 0;
        const tagsCount = tags?.length || 0;
        
        toast.success(
          `🎉 Uhu! Site conectado com sucesso!\n` +
          `📂 ${categoriesCount} categorias sincronizadas com a BIA\n` +
          `👥 ${authorsCount} autores sincronizados com a BIA\n` +
          `🏷️ ${tagsCount} tags sincronizadas com a BIA\n` +
          `Atualizando a página...`,
          {
            duration: 3000
          }
        );

        // Forçar refresh da página após sincronização bem-sucedida
        // Isso garante que todos os dados sejam atualizados corretamente
        setTimeout(() => {
          console.log('🔄 Forçando refresh da página após sincronização bem-sucedida...');
          
          // Salvar a página atual no localStorage antes do refresh
          localStorage.setItem('bia-return-to-page', 'sites');
          localStorage.setItem('bia-refresh-timestamp', Date.now().toString());
          
          window.location.reload();
        }, 2000); // Aguarda 2 segundos para o usuário ver a mensagem de sucesso
      } else {
        throw new Error('Erro ao salvar site no banco de dados');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao conectar site:', error);
      toast.error('Erro ao conectar site: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleRemoveSite = (site: any) => {
    if (confirm('Tem certeza que deseja remover este site? Todos os artigos e ideias relacionados também serão removidos.')) {
      actions.deleteSite(site.id);
    }
  };

  // Calcular estatísticas (usando dados validados)
  const totalArticles = realArticleCount;
  const siteArticles = state.sites.map(site => ({
    ...site,
    articleCount: state.articles.filter(article => article.siteId === site.id).length
  }));

  // 🔍 DEBUG DETALHADO - Investigar problema com planos
  console.log('� DEBUG MEUS SITES:', {
    userPlan: user?.plano,
    currentPlan,
    backendLimits: limits,
    calculatedLimits: planLimits,
    getPlanLimitsResult: getPlanLimits(currentPlan),
    shouldForceRecalculation,
    sitesUnlimited,
    finalSitesValue: formatLimitValue(planLimits.sites, sitesUnlimited),
    realSiteCount,
    activeSites
  });

  // Estatísticas principais (corrigidas com dados reais da API)
  const mainStats = [
    {
      title: 'Sites Conectados',
      value: realSiteCount,
      maxValue: isUnlimitedSites ? '∞' : formatLimitValue(planLimits.sites, isUnlimitedSites),
      icon: Monitor,
      description: 'Total de sites',
      isUnlimited: isUnlimitedSites
    },
    {
      title: 'Créditos Disponíveis',
      value: availableCredits.articles,
      maxValue: articlesUnlimited ? '∞' : planLimits.articles,
      icon: FileText,
      description: `do seu plano`,
      isUnlimited: articlesUnlimited
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl text-black mb-2">
            Meus Sites
          </h1>
          <p className="font-montserrat text-gray-600">
            Gerencie seus sites WordPress para publicação automática de conteúdo
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowConnectForm(true)}
            disabled={!canAddSite}
            className="font-montserrat disabled:bg-gray-300"
            style={{ backgroundColor: '#8c52ff' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Conectar Site
          </Button>
        </div>
      </div>

      {/* Alerta sobre limite - Não mostrar para usuários com sites ilimitados */}
      {!canAddSite && !isUnlimitedSites && (
        <Card className="border-border bg-gradient-to-b from-purple-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-white/60 rounded-lg flex-shrink-0 border border-purple-200">
                <AlertCircle className="h-5 w-5" style={{ color: '#8c52ff' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-poppins text-lg font-bold text-black mb-2">
                  Limite de Sites Atingido
                </h3>
                <p className="font-montserrat text-gray-600 mb-4">
                  Você atingiu o limite de <strong>{sitesLimit} sites</strong> do seu plano atual. 
                  Para conectar mais sites, faça upgrade para um plano superior.
                </p>
                <Button
                  onClick={() => onNavigate && onNavigate('store')}
                  className="font-montserrat font-bold text-white border-0 hover:opacity-90 transition-all duration-300"
                  style={{ 
                    backgroundColor: '#8c52ff',
                    boxShadow: '0 0 20px rgba(140, 82, 255, 0.4), 0 0 40px rgba(140, 82, 255, 0.2)',
                  }}
                >
                  Assinar um Plano Agora
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas - Seguindo padrão do Calendário */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Estatísticas dos Sites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mainStats.map((stat, index) => {
              const Icon = stat.icon;
              const progressValue = !stat.isUnlimited && stat.maxValue && stat.maxValue !== '∞' ? 
                Math.min(100, (stat.value / Number(stat.maxValue)) * 100) : 0;
              
              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.title === 'Créditos Disponíveis' ? 'bg-green-50' : 'bg-purple-50'} rounded-lg flex items-center justify-center`}>
                      <Icon size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">{stat.title}</p>
                      <p className="font-poppins text-xl font-medium text-foreground">
                        {stat.title === 'Créditos Disponíveis' ? stat.value : `${stat.value}/${stat.maxValue}`}
                      </p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        {stat.title === 'Créditos Disponíveis' ? `de ${stat.maxValue} do seu plano` : stat.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar para limites - exceto créditos disponíveis */}
                  {!stat.isUnlimited && stat.maxValue && stat.maxValue !== '∞' && stat.title !== 'Créditos Disponíveis' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Progress 
                        value={progressValue} 
                        variant="bia-purple"
                        className="h-1.5"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Formulário de conectar site */}
      {showConnectForm && (
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg text-black flex items-center gap-2">
              <Plus size={20} style={{ color: '#8c52ff' }} />
              Conectar Site WordPress
            </CardTitle>
            <p className="font-montserrat text-gray-600">
              Configure seu site WordPress em um único passo. Conectaremos automaticamente e sincronizaremos todos os dados.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-purple-200 bg-purple-50">
              <Lightbulb className="h-5 w-5" style={{ color: '#8c52ff' }} />
              <AlertDescription className="text-purple-800">
                <strong>Como obter uma Application Password:</strong><br />
                1. Acesse: <em>Painel WordPress → Usuários → Perfil</em><br />
                2. Role até <em>"Application Passwords"</em><br />
                3. Digite um nome (ex: "BIA") e clique <em>"Add New"</em><br />
                4. Copie a senha gerada completa e cole abaixo
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName" className="font-montserrat text-black">Nome do Site *</Label>
                <Input
                  id="siteName"
                  value={siteForm.nome}
                  onChange={(e) => setSiteForm({ ...siteForm, nome: e.target.value })}
                  placeholder="Ex: MeuBlog.com"
                  className="font-montserrat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl" className="font-montserrat text-black">URL do Site *</Label>
                <Input
                  id="siteUrl"
                  value={siteForm.url}
                  onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                  placeholder="https://meublog.com"
                  className="font-montserrat"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="wpUsername" className="font-montserrat text-black">Usuário WordPress *</Label>
                <Input
                  id="wpUsername"
                  value={siteForm.username}
                  onChange={(e) => setSiteForm({ ...siteForm, username: e.target.value })}
                  placeholder="admin"
                  className="font-montserrat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wpPassword" className="font-montserrat text-black">Application Password *</Label>
                <Input
                  id="wpPassword"
                  type="password"
                  value={siteForm.applicationPassword}
                  onChange={(e) => setSiteForm({ ...siteForm, applicationPassword: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  className="font-montserrat"
                />
                <p className="font-montserrat text-xs text-gray-500">
                  ⚠️ NÃO use sua senha normal do WordPress. Use apenas Application Password.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={handleConnectSite}
                disabled={connecting}
                className="font-montserrat text-white"
                style={{ backgroundColor: '#8c52ff' }}
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Conectar Site
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  setShowConnectForm(false);
                  setSiteForm({ nome: '', url: '', username: '', applicationPassword: '' });
                }} 
                className="font-montserrat bg-white border border-red-500 text-red-600 hover:bg-red-50"
                disabled={connecting}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Sites */}
      <div className="space-y-4">
        {state.sites.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mx-auto mb-6">
                <Monitor size={32} style={{ color: '#8c52ff' }} />
              </div>
              <h3 className="font-poppins text-xl text-black mb-2">
                Nenhum site conectado ainda
              </h3>
              <p className="font-montserrat text-gray-600 mb-6 max-w-md mx-auto">
                Conecte seu primeiro site WordPress para começar a publicar conteúdo automaticamente.
              </p>
              <Button
                onClick={() => setShowConnectForm(true)}
                disabled={!canAddSite}
                className="font-montserrat text-white"
                style={{ backgroundColor: '#8c52ff' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Conectar Primeiro Site
              </Button>
            </CardContent>
          </Card>
        ) : (
          state.sites
            .sort((a, b) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase()))
            .map((site) => {
            const siteStats = siteArticles.find(s => s.id === site.id);
            const articleCount = siteStats?.articleCount || 0;
            const isConnected = !!site.wordpressUrl;
            const isActive = site.status === 'ativo';
            
            return (
              <Card 
                key={site.id} 
                className="border border-gray-200 hover:shadow-md transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {isConnected ? (
                          <Wifi size={24} className={isActive ? 'text-green-600' : 'text-gray-500'} />
                        ) : (
                          <Monitor size={24} style={{ color: isActive ? '#8c52ff' : '#9CA3AF' }} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-poppins text-lg text-black truncate">
                            {site.nome}
                          </h3>
                          
                          {/* Badge de Proprietário (somente para admins) */}
                          {isAdmin && site.user && (
                            <Badge 
                              className="border-purple-200 text-purple-700 bg-purple-50 text-xs font-montserrat"
                              title={`Email: ${site.user.email}`}
                            >
                              👤 {site.user.name || site.user.email.split('@')[0]}
                            </Badge>
                          )}
                          
                          <Badge 
                            className={`text-xs font-montserrat ${
                              isActive 
                                ? 'border-green-200 text-green-700 bg-green-50' 
                                : 'border-gray-200 text-gray-600 bg-gray-50'
                            }`}
                          >
                            {isActive ? 'Ativo' : 'Pausado'}
                          </Badge>
                          {isConnected && (
                            <Badge 
                              className="border-blue-200 text-blue-700 bg-blue-50 text-xs font-montserrat"
                            >
                              <Wifi size={10} className="mr-1" />
                              WordPress
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {site.url && (
                            <div className="flex items-center gap-1">
                              <Globe size={14} />
                              <a 
                                href={site.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-montserrat hover:text-purple-600 truncate max-w-48"
                              >
                                {site.url.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <FileText size={14} />
                            <span className="font-montserrat">{articleCount} artigos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => handleRemoveSite(site)}
                        className="font-montserrat bg-white border border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}