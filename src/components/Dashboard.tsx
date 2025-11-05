import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Monitor, 
  FileText, 
  Lightbulb, 
  Plus, 
  TrendingUp,
  BarChart3,
  Zap,
  Clock,
  Calendar,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  Globe,
  RefreshCw
} from './icons';
import { useBia } from './BiaContext';
import { useDashboard } from '../hooks/useDashboard';
import { useCredits } from '../hooks/useCredits';
import { FREE_PLAN_LIMITS, getPlanLimits, isFreePlan, ARTICLE_SAVINGS_VALUE, ARTICLE_TIME_SAVED_HOURS } from '../utils/constants';

interface DashboardProps {
  userData: any;
  onNavigate?: (page: string) => void;
  onUpdateUser?: (userData: any) => Promise<boolean>;
  onRefreshUser?: () => Promise<boolean>;
}

export function Dashboard({ userData, onNavigate, onUpdateUser, onRefreshUser }: DashboardProps) {
  const { state } = useBia();
  const { dashboardData, loading, error, refreshDashboard } = useDashboard();
  const availableCredits = useCredits();

  // Default navigation function if not provided
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.hash = page;
    }
  };

  // Show loading state while fetching dashboard data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-bia-purple mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if dashboard data failed to load
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="font-poppins text-lg text-red-800 mb-2">Erro ao carregar dashboard</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={refreshDashboard}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use data from API if available, fallback to props
  const user = dashboardData?.user || userData;
  const limits = dashboardData?.limits;
  const usage = dashboardData?.usage;
  const economics = dashboardData?.economics;
  const activities = dashboardData?.recent_activities;
  const alerts = dashboardData?.alerts;

  // Verificar tipo de usuário e plano usando dados da API
  const isDev = user?.email === 'dev@bia.com' || user?.is_admin || user?.is_developer;
  const currentPlan = isDev ? 'Developer' : (user?.plano || 'Free');
  const isFree = !isDev && currentPlan === 'Free';

  // Usar dados da API se disponíveis, senão calcular localmente
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
    articles: currentPlan === 'Free' ? (user?.quotas?.articles || 5) : calculatedLimits.articles
  };

  // Usar contagens da API se disponíveis, senão usar dados do contexto
  const realArticleCount = usage?.articles?.total ?? state.articles?.filter(a => a.status !== 'Excluído').length ?? 0;
  const realIdeaCount = usage?.ideas?.total ?? state.ideas?.length ?? 0;
  const realSiteCount = usage?.sites?.total ?? state.sites?.length ?? 0;
  const publishedArticles = usage?.articles?.published ?? state.articles?.filter(a => a.status === 'Publicado').length ?? 0;
  const activeSites = usage?.sites?.active ?? state.sites?.filter(s => s.status === 'ativo').length ?? 0;

  // Função para formatar valores de limite
  const formatLimitValue = (value: number, isUnlimited: boolean = false): string => {
    if (isDev || isUnlimited || value === Number.MAX_SAFE_INTEGER || value >= 999999) {
      return '∞';
    }
    return value.toString();
  };

  // Função para obter o label correto das ideias baseado no plano
  const getIdeasLabel = (): string => {
    if (currentPlan === 'Free' && !hasAnyPack) {
      return 'Ideias Limitadas';
    }
    return 'Ideias Ilimitadas';
  };

  // Verificar se sites são ilimitados no plano BIA
  const sitesUnlimited = usage?.sites?.unlimited ?? planLimits.isUnlimited ?? currentPlan === 'BIA';
  
  // CORREÇÃO: Detectar corretamente se usuário Free tem packs de artigos
  // Free puro = plano Free + exatamente 5 artigos (limite padrão)
  // Free + Pack = plano Free + mais de 5 artigos
  const isFreePlanOnly = currentPlan === 'Free';
  const freeBasicArticles = 5; // Limite base do plano Free
  const hasAnyPack = isFreePlanOnly && (user?.quotas?.articles || 0) > freeBasicArticles;
  
  // CORREÇÃO: Ideias são limitadas APENAS para usuários Free SEM packs
  // Free SEM pack = limitado (10 ideias)
  // Free COM pack = ilimitado
  // Qualquer plano pago = ilimitado
  const isFreeWithoutPack = currentPlan === 'Free' && !hasAnyPack;
  // FORÇAR lógica local para usuários Free, ignorar backend
  const ideasUnlimited = currentPlan === 'Free' ? hasAnyPack : (usage?.ideas?.unlimited ?? true);
  
  // Log para debug da lógica corrigida
  console.log('🎯 Lógica de ideias ilimitadas:', {
    currentPlan,
    userArticles: user?.quotas?.articles,
    freeBasicArticles,
    hasAnyPack,
    isFreeWithoutPack,
    ideasUnlimited,
    'Should show limited?': currentPlan === 'Free' && !hasAnyPack
  });

  // 🔍 Debug dos limites aplicados
  // Calcular alertas baseados em créditos disponíveis  
  const creditsAlerts = {
    articles_at_limit: availableCredits.articles <= 0 && planLimits.articles > 0,
    articles_near_limit: availableCredits.articles > 0 && availableCredits.articles <= Math.max(1, Math.floor(planLimits.articles * 0.1)) && planLimits.articles > 0
  };

  console.log('📊 Limites do plano atual:', {
    currentPlan,
    planLimits: {
      sites: planLimits.sites,
      ideas: planLimits.ideas,
      articles: planLimits.articles,
      isUnlimited: planLimits.isUnlimited
    },
    realCounts: {
      sites: realSiteCount,
      ideas: realIdeaCount, 
      articles: realArticleCount
    },
    unlimited: {
      sites: sitesUnlimited,
      ideas: ideasUnlimited
    },
    formatted: {
      sites: formatLimitValue(planLimits.sites, sitesUnlimited),
      ideas: formatLimitValue(planLimits.ideas, ideasUnlimited),
      articles: formatLimitValue(planLimits.articles)
    }
  });

  // 🔍 DEBUG DETALHADO - Investigar problema com plano
  console.log('🚨 DEBUG DETALHADO:', {
    userPlan: user?.plano,
    currentPlan,
    backendLimits: limits,
    calculatedLimits: planLimits,
    getPlanLimitsResult: getPlanLimits(currentPlan),
    shouldForceRecalculation,
    sitesUnlimited,
    finalSitesValue: formatLimitValue(planLimits.sites, sitesUnlimited)
  });

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Usar dados de economia da API se disponível
  const savedMoney = economics?.saved_money ?? realArticleCount * 50;
  const savedHours = economics?.saved_hours ?? realArticleCount * 0.5;

  // Estatísticas principais com design limpo
  const dashboardItems = [
    {
      title: 'Sites Conectados',
      value: realSiteCount,
      maxValue: formatLimitValue(planLimits.sites, sitesUnlimited),
      icon: Globe,
      description: 'WordPress conectados',
      action: 'sites' // → Meus Sites
    },
    {
      title: getIdeasLabel(),
      value: realIdeaCount,
      maxValue: formatLimitValue(planLimits.ideas, ideasUnlimited),
      icon: Lightbulb,
      description: currentPlan === 'Free' && !hasAnyPack ? 'Compre um pack para desbloquear' : 'Disponíveis para produção',
      action: 'articles' // → Produzir Artigos
    },
    {
      title: 'Artigos Produzidos',
      value: realArticleCount,
      maxValue: formatLimitValue(planLimits.articles),
      icon: FileText,
      description: `${publishedArticles} publicados`,
      action: 'history' // → Histórico
    }
  ];

  // Atividades recentes simplificadas - usar dados da API se disponível
  const recentActivities = activities ? [
    ...((activities.articles || [])
      .filter((a: any) => a.status === 'publicado')
      .slice(0, 3)
      .map((article: any) => ({
        id: `article-${article.id}`,
        title: `Artigo publicado: "${article.titulo.substring(0, 40)}..."`,
        time: new Date(article.updated_at).toLocaleDateString('pt-BR'),
        type: 'published',
        icon: CheckCircle
      }))),
    ...((activities.articles || [])
      .filter((a: any) => a.status === 'produzindo')
      .slice(0, 2)
      .map((article: any) => ({
        id: `producing-${article.id}`,
        title: `Produzindo: "${article.titulo.substring(0, 40)}..."`,
        time: new Date(article.updated_at).toLocaleDateString('pt-BR'),
        type: 'producing',
        icon: Zap
      }))),
    ...((activities.ideas || [])
      .slice(0, 2)
      .map((idea: any) => ({
        id: `idea-${idea.id}`,
        title: `Nova ideia: "${idea.titulo.substring(0, 40)}..."`,
        time: new Date(idea.created_at).toLocaleDateString('pt-BR'),
        type: 'ideas',
        icon: Lightbulb
      }))),
    ...((activities.sites || [])
      .slice(0, 1)
      .map((site: any) => ({
        id: `site-${site.id}`,
        title: `Site conectado: "${site.nome}"`,
        time: new Date(site.created_at).toLocaleDateString('pt-BR'),
        type: 'connected',
        icon: Globe
      })))
  ].slice(0, 6) : [
    // Fallback para dados do contexto se API não disponível
    ...(state.articles || [])
      .filter(a => a.status === 'Publicado')
      .slice(0, 3)
      .map(article => ({
        id: `article-${article.id}`,
        title: `Artigo publicado: "${article.titulo.substring(0, 40)}..."`,
        time: new Date(article.updatedAt).toLocaleDateString('pt-BR'),
        type: 'published',
        icon: CheckCircle
      })),
    ...(state.articles || [])
      .filter(a => a.status === 'Produzindo')
      .slice(0, 2)
      .map(article => ({
        id: `producing-${article.id}`,
        title: `Produzindo: "${article.titulo.substring(0, 40)}..."`,
        time: new Date(article.updatedAt).toLocaleDateString('pt-BR'),
        type: 'producing',
        icon: Zap
      })),
    ...(state.ideas || [])
      .slice(0, 2)
      .map(idea => ({
        id: `idea-${idea.id}`,
        title: `Nova ideia: "${idea.titulo.substring(0, 40)}..."`,
        time: new Date(idea.createdAt).toLocaleDateString('pt-BR'),
        type: 'ideas',
        icon: Lightbulb
      })),
    ...(state.sites || [])
      .slice(0, 1)
      .map(site => ({
        id: `site-${site.id}`,
        title: `Site conectado: "${site.nome}"`,
        time: new Date(site.createdAt).toLocaleDateString('pt-BR'),
        type: 'connected',
        icon: Globe
      }))
  ].slice(0, 6);

  // Ações rápidas
  const quickActions = [
    {
      title: 'Gerar Ideias',
      description: 'Crie novos temas com IA',
      icon: Lightbulb,
      action: 'ideas', // → Gerar Ideias
      badge: null
    },
    {
      title: 'Produzir Artigos',
      description: 'Transforme ideias em conteúdo',
      icon: FileText,
      action: 'history', // → Histórico
      badge: realIdeaCount > 0 ? `${realIdeaCount} disponíveis` : null
    },
    {
      title: 'Agendar Posts',
      description: 'Programe publicações',
      icon: Clock,
      action: 'schedule', // → Agendar Posts
      badge: null
    },
    {
      title: 'Calendário',
      description: 'Visualize programações',
      icon: Calendar,
      action: 'calendar', // → Calendário
      badge: null
    }
  ];

  // Adicionar botão de refresh no header se houve erro ou para forçar atualização
  const handleRefresh = async () => {
    try {
      console.log('🔄 Forçando refresh completo dos dados...');
      
      // 1. Refresh dashboard API data
      await refreshDashboard();
      
      // 2. Refresh user data via specific endpoint
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/auth/user/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && onRefreshUser) {
            await onRefreshUser();
          }
        }
      }
      
      console.log('✅ Refresh completo finalizado');
    } catch (error) {
      console.error('❌ Erro no refresh:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Olá, <span className="font-semibold" style={{ color: '#8c52ff' }}>{user?.name || 'Usuário'}</span>! 
            Aqui está o panorama da sua conta BIA.
            {isDev && (
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)', color: '#8c52ff' }}>
                🧑‍💻 Developer
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="font-montserrat bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 transition-all duration-200"
            style={{ borderColor: '#8c52ff', color: '#8c52ff' }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

        {/* Alertas - Seguindo padrão das Ações Rápidas */}
        {(creditsAlerts.articles_near_limit || creditsAlerts.articles_at_limit || (alerts && (alerts.sites_near_limit || alerts.sites_at_limit))) && (
          <div className="space-y-4">
            {creditsAlerts.articles_at_limit && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    📚 Limite de artigos atingido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
                    <p className="font-montserrat text-muted-foreground mb-4">
                      Você não tem mais créditos disponíveis (<span className="font-semibold" style={{ color: '#8c52ff' }}>{availableCredits.articles}/{planLimits.articles}</span>). 
                      Adquira packs extras para continuar produzindo conteúdo de qualidade!
                    </p>
                    <Button
                      onClick={() => handleNavigate('store')}
                      className="font-montserrat text-white"
                      style={{ backgroundColor: '#8c52ff' }}
                    >
                      Ver Packs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {alerts?.sites_at_limit && currentPlan !== 'BIA' && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                    <Star size={20} style={{ color: '#8c52ff' }} />
                    🚀 Hora de expandir seus sites!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                    <p className="font-montserrat text-muted-foreground mb-4">
                      Você está aproveitando ao máximo seu plano atual. 
                      <span className="font-semibold" style={{ color: '#8c52ff' }}> Desbloqueie mais sites e recursos avançados!</span>
                    </p>
                    <Button
                      onClick={() => handleNavigate('store')}
                      className="font-montserrat text-white"
                      style={{ backgroundColor: '#8c52ff' }}
                    >
                      Ver Planos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {creditsAlerts.articles_near_limit && !creditsAlerts.articles_at_limit && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                    <AlertCircle size={20} className="text-amber-600" />
                    ⚡ Poucos créditos restantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <p className="font-montserrat text-muted-foreground mb-4">
                      Você tem apenas <span className="font-semibold text-amber-700">{availableCredits.articles} créditos</span> restantes. 
                      Garanta mais créditos antes de precisar!
                    </p>
                    <Button
                      onClick={() => handleNavigate('store')}
                      className="font-montserrat bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Ver Packs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {alerts?.sites_near_limit && !alerts?.sites_at_limit && currentPlan !== 'BIA' && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                    <TrendingUp size={20} style={{ color: '#8c52ff' }} />
                    💡 Seu sucesso está crescendo!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                    <p className="font-montserrat text-muted-foreground mb-4">
                      Você já conectou <span className="font-semibold" style={{ color: '#8c52ff' }}>{realSiteCount} de {planLimits.sites} sites</span>. 
                      Que tal desbloquear recursos ilimitados?
                    </p>
                    <Button
                      onClick={() => handleNavigate('store')}
                      className="font-montserrat text-white"
                      style={{ backgroundColor: '#8c52ff' }}
                    >
                      Expandir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Status do Plano - Seguindo padrão das Ações Rápidas */}
        {isDev ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <BarChart3 size={20} style={{ color: '#8c52ff' }} />
                Modo Desenvolvedor Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Globe size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Sites Ilimitados</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realSiteCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Ideias Ilimitadas</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realIdeaCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <FileText size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                      <p className="font-poppins text-xl font-medium text-foreground">∞</p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        de ∞ do seu plano
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
                <p className="font-montserrat text-sm text-muted-foreground text-center">
                  ✨ Todas as funcionalidades desbloqueadas • 🐛 Debug ativo • 🚀 Sem limitações
                </p>
              </div>
            </CardContent>
          </Card>
        ) : currentPlan === 'BIA' ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <Star size={20} style={{ color: '#8c52ff' }} />
                Plano Ilimitado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Globe size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Sites Ilimitados</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realSiteCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Ideias Ilimitadas</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realIdeaCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <FileText size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{availableCredits.articles}</p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        de 1000 do seu plano
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
                <p className="font-montserrat text-sm text-muted-foreground text-center">
                  👑 Plano máximo da BIA • 📞 Suporte WhatsApp 24/7 • 🌐 Sites ilimitados
                </p>
              </div>
            </CardContent>
          </Card>
        ) : !isFree ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <CheckCircle size={20} style={{ color: '#10b981' }} />
                Plano {currentPlan} Ativo
                {handleRefresh && (
                  <button
                    onClick={handleRefresh}
                    className="ml-auto p-2 text-gray-400 rounded-lg transition-all duration-200"
                    style={{ color: '#8c52ff' }}
                    title="Atualizar dados do plano"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Globe size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Sites Conectados</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realSiteCount}/{formatLimitValue(planLimits.sites, sitesUnlimited)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Ideias Ilimitadas</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realIdeaCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <FileText size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{availableCredits.articles}</p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        de {planLimits.articles} do seu plano
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                <p className="font-montserrat text-sm text-muted-foreground text-center">
                  🚀 Recursos avançados desbloqueados • 🎧 Suporte premium • 💡 Ideias ilimitadas
                </p>
              </div>
            </CardContent>
          </Card>
        ) : hasAnyPack ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <Star size={20} style={{ color: '#3b82f6' }} />
                Plano Free + Pack de Artigos
                {handleRefresh && (
                  <button
                    onClick={handleRefresh}
                    className="ml-auto p-2 text-gray-400 rounded-lg transition-all duration-200"
                    style={{ color: '#8c52ff' }}
                    title="Atualizar dados do plano"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Globe size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Sites Básicos</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realSiteCount}/{formatLimitValue(planLimits.sites, sitesUnlimited)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Ideias Desbloqueadas</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{realIdeaCount}/∞</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <FileText size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                      <p className="font-poppins text-xl font-medium text-foreground">{availableCredits.articles}</p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        de {planLimits.articles} do seu plano
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                <p className="font-montserrat text-sm text-muted-foreground text-center">
                  🎉 Pack ativo desbloqueou ideias ilimitadas! • 📦 {user?.quotas?.articles || 0} artigos extras
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Estatísticas Principais - Seguindo padrão dos outros containers de plano - Apenas para plano Free PURO (sem packs) */}
        {isFree && !hasAnyPack && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <BarChart3 size={20} style={{ color: '#8c52ff' }} />
                Plano Free
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardItems.map((stat, index) => {
                  const Icon = stat.icon;
                  const isUnlimitedValue = stat.maxValue === '∞';
                  const numericMax = isUnlimitedValue ? Number.MAX_SAFE_INTEGER : Number(stat.maxValue);
                  const numericValue = typeof stat.value === 'number' ? stat.value : Number(String(stat.value).replace(/[^0-9.-]+/g, '')) || 0;
                  const isAtLimit = !isDev && !isUnlimitedValue && numericMax > 0 && numericValue >= numericMax;
                  
                  return (
                    <div key={index} className="space-y-3">
                      <div 
                        className={`flex items-center gap-3 ${stat.action ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        onClick={() => stat.action && handleNavigate(stat.action)}
                      >
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <Icon size={20} style={{ color: '#8c52ff' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-montserrat text-sm text-muted-foreground">{stat.title}</p>
                          <p className="font-poppins text-xl font-medium text-foreground">
                            {`${stat.value}${stat.maxValue ? `/${stat.maxValue}` : ''}`}
                          </p>
                          {!isDev && !isUnlimitedValue && numericMax > 0 && (
                            <div className="mt-2">
                              <Progress 
                                value={Math.min(100, (numericValue / numericMax) * 100)} 
                                className="h-1.5"
                                style={{ backgroundColor: 'rgba(140, 82, 255, 0.2)' }}
                              />
                              {isAtLimit && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertCircle size={12} className="text-red-500" />
                                  <span className="font-montserrat text-xs text-red-600">Limite atingido</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Texto explicativo */}
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
                <p className="font-montserrat text-sm text-muted-foreground text-center">
                  🆓 Plano gratuito • 💡 Ideias limitadas até comprar um pack • 🚀 Faça upgrade para desbloquear recursos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Container de Economia Separado - Logo abaixo do container do plano */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <TrendingUp size={20} style={{ color: '#8c52ff' }} />
            Economia Gerada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Economia de Tempo */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Clock size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Economia de Tempo</p>
                  <p className="font-poppins text-xl font-medium text-foreground">
                    {Math.floor((realArticleCount * 0.5) / 1) > 0 ? 
                      `${Math.floor((realArticleCount * 0.5) / 1)}h ${String(Math.round(((realArticleCount * 0.5) % 1) * 60)).padStart(2, '0')}min` :
                      `${realArticleCount * 30}min`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Economia de Dinheiro */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Economia de Dinheiro</p>
                  <p className="font-poppins text-xl font-medium text-foreground">
                    R$ {(realArticleCount * 50).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Texto explicativo */}
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
            <p className="font-montserrat text-sm text-muted-foreground text-center">
              💡 <em>Comparado ao quanto você investiria num redator, ou em tempo fazendo por conta própria mesmo com IA.</em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layout Principal - 2/3 + 1/3 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Ações Rápidas - 2/3 da largura */}
        <Card className="border-border xl:col-span-2 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
              <Zap size={20} style={{ color: '#8c52ff' }} />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                
                return (
                  <Card 
                    key={index} 
                    className="border-border hover:border-muted-foreground hover:shadow-sm transition-all cursor-pointer group bg-card"
                    onClick={() => handleNavigate(action.action)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
                          <Icon size={20} style={{ color: '#8c52ff' }} />
                        </div>
                        <ArrowUpRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      <div>
                        <h4 className="font-montserrat font-medium text-foreground mb-1">
                          {action.title}
                        </h4>
                        <p className="font-montserrat text-sm text-muted-foreground mb-2">
                          {action.description}
                        </p>
                        {action.badge && (
                          <Badge className="text-xs font-montserrat border-border bg-muted text-muted-foreground">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Atividade Recente - 1/3 da largura com fundo colorido */}
        <Card className="border-border bg-gradient-to-b from-purple-50 to-indigo-50">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
              <BarChart3 size={20} style={{ color: '#8c52ff' }} />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length > 0 ? recentActivities.map((activity) => {
                const Icon = activity.icon;
                
                return (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-purple-100">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-purple-200" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
                      <Icon size={14} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-montserrat text-sm text-foreground truncate">
                        {activity.title}
                      </p>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8">
                  <BarChart3 size={32} className="mx-auto mb-4" style={{ color: 'rgba(140, 82, 255, 0.3)' }} />
                  <p className="font-montserrat text-muted-foreground mb-2">Nenhuma atividade ainda</p>
                  <p className="font-montserrat text-sm text-muted-foreground">Comece gerando algumas ideias!</p>
                  <Button
                    onClick={() => handleNavigate('ideas')}
                    className="mt-3 font-montserrat bg-bia-purple hover:bg-bia-purple-dark text-white"
                  >
                    Gerar Primeira Ideia
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dicas com fundo colorido - estilo Figma */}
      <Card className="border-border bg-gradient-to-b from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Star size={20} style={{ color: '#8c52ff' }} />
            {isDev ? 'Recursos de Desenvolvimento' : 'Dicas da BIA para Maximizar Resultados'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isDev ? (
              <>
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Debug Mode Ativo
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Logs detalhados habilitados no console. Monitore processos em tempo real.
                  </p>
                </div>
                
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Quotas Bypass
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Todas as limitações foram removidas. Teste sem restrições.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Otimize palavras-chave
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Use palavras-chave de cauda longa nos títulos para melhorar o SEO e atrair tráfego qualificado.
                  </p>
                </div>
                
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Programe estrategicamente
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Publique nos horários de maior engajamento para maximizar o alcance dos seus artigos.
                  </p>
                </div>
                
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Diversifique nichos
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Explore diferentes ângulos do seu nicho para criar conteúdo variado e atrair audiências diversas.
                  </p>
                </div>
                
                <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} style={{ color: '#8c52ff' }} />
                    <h4 className="font-montserrat font-medium text-foreground">
                      Monitore métricas
                    </h4>
                  </div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Acompanhe o desempenho no Analytics para identificar os melhores tipos de conteúdo.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}