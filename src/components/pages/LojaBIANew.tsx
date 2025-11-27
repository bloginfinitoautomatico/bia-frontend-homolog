import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CheckoutModal } from '../ui/CheckoutModal';
import { 
  CheckCircle, 
  Star, 
  Shield, 
  Zap, 
  Sparkles, 
  Target,
  Users,
  Globe,
  Lightbulb,
  FileText,
  Calendar,
  Headphones,
  TrendingUp,
  Rocket,
  ArrowUpRight,
  ExternalLink,
  Clock,
  ShoppingBag,
  Plus,
  Heart
} from '../icons';
import { useBia } from '../BiaContext';
import { subscriptionService } from '../../services/subscriptionService';
import { toast } from 'sonner';
import MetaPixelService from '../../services/metaPixel';

interface LojaBIAProps {
  userData: any;
  onUpdateUser?: (userData: any) => Promise<boolean>;
  onRefreshUser?: () => Promise<boolean>;
}

export function LojaBIA({ userData, onUpdateUser, onRefreshUser }: LojaBIAProps) {
  const { state } = useBia();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansData, setPlansData] = useState<{
    monthly: any[];
    article_pack: any[];
    additional: any[];
  }>({
    monthly: [],
    article_pack: [],
    additional: []
  });
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    plan: any;
  }>({
    isOpen: false,
    plan: null
  });

  // Verificar se é desenvolvedor
  const isDev = userData?.email === 'dev@bia.com' || userData?.isDeveloper;
  const currentPlan = userData?.plano || 'Free';

  // Buscar planos da API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        console.log('🔄 Iniciando carregamento dos planos da API...');
        
        const result = await subscriptionService.getPlans();
        
        console.log('📥 Resultado do carregamento de planos:', {
          success: result.success,
          data: result.data,
          error: result.error
        });
        
        if (result.success && result.data) {
          // Ordenar planos mensais por preço
          const sortedData = {
            ...result.data,
            monthly: result.data.monthly?.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)) || []
          };
          setPlansData(sortedData);
          console.log('✅ Planos carregados com sucesso:', sortedData);
          
          // Disparar evento Meta Pixel - ViewContent (visualização de planos)
          const planSlugs = [
            ...(result.data.monthly || []).map((p: any) => p.slug),
            ...(result.data.article_pack || []).map((p: any) => p.slug)
          ];
          
          MetaPixelService.trackViewContent({
            name: 'Planos BIA',
            plans: planSlugs
          });
        } else {
          console.error('❌ Erro ao buscar planos da API:', result.error);
          console.log('🔄 Usando planos hardcoded como fallback');
          
          // Usar toast apenas se for um erro crítico
          if (result.error && !result.error.includes('fetch')) {
            toast.error('Erro ao carregar planos da API. Usando dados locais.');
          }
        }
      } catch (error) {
        console.error('❌ Erro crítico ao buscar planos:', error);
        console.log('🔄 Usando planos hardcoded como fallback');
        
        // Não mostrar toast se for erro de rede comum
        if (!error?.toString().includes('fetch')) {
          toast.error('Usando dados locais de planos');
        }
      } finally {
        setLoadingPlans(false);
        console.log('✅ Carregamento de planos finalizado');
      }
    };

    fetchPlans();
  }, []);

  // Dados dos planos mensais (sincronizado com backend)
  const monthlyPlans = [
    {
      id: 'start',
      name: 'Start',
      price: 99,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 50 artigos em até 5 sites diferentes.',
      icon: Target,
      color: 'green',
      popular: false,
      features: [
        '5 sites conectados',
        '50 artigos por mês',
        'Apenas R$1,98 por artigo',
        'Suporte por e-mail',
        'Dashboard completo'
      ]
    },
    {
      id: 'basico',
      name: 'Básico',
      price: 149,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 100 artigos em até 10 sites diferentes.',
      icon: Shield,
      color: 'blue',
      popular: false,
      features: [
        '10 sites conectados',
        '100 artigos por mês',
        'Apenas R$1,49 por artigo',
        'Suporte por e-mail',
        'Dashboard completo'
      ]
    },
    {
      id: 'intermediario',
      name: 'Intermediário',
      price: 249,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 200 artigos em 20 sites diferentes.',
      icon: Zap,
      color: 'purple',
      popular: true,
      features: [
        '20 sites conectados',
        '200 artigos por mês',
        'Apenas R$1,24 por artigo',
        'Suporte WhatsApp 24/7',
        'Bônus: Modelo de blog pronto (R$497)'
      ]
    },
    {
      id: 'avancado',
      name: 'Avançado',
      price: 599,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 500 artigos em 50 sites diferentes.',
      icon: Sparkles,
      color: 'gold',
      popular: false,
      features: [
        '50 sites conectados',
        '500 artigos por mês',
        'Apenas R$1,19 por artigo',
        'Suporte WhatsApp 24/7',
        'Dashboard Completo',
        'Bônus: Modelo de blog pronto (R$497)'
      ]
    },
    {
      id: 'ilimitado',
      name: 'Ilimitado',
      price: 999,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 1.000 artigos em quantos sites quiser.',
      icon: Rocket,
      color: 'gradient',
      popular: false,
      features: [
        'Sites ilimitados',
        '1.000 artigos por mês',
        'Apenas R$0,99 por artigo',
        'Suporte WhatsApp 24/7',
        'Dashboard Completo',
        'Bônus: Modelo de blog pronto (R$497)'
      ]
    }
  ];

  // Dados do plano Free separado
  const freePlan = {
    id: 'free',
    name: 'Grátis',
    price: 0,
    originalPrice: null,
    period: null,
    description: 'Publique até 5 artigos em 1 site',
    icon: Heart,
    color: 'gray',
    popular: false,
    isFree: true,
    features: [
      '1 site conectado',
      '5 artigos para testar',
      'R$0 por artigo',
      'Suporte por e-mail',
      'Dashboard completo'
    ]
  };

  // Packs de artigos
  const articlePacks = [
    {
      id: 'pack-50',
      name: '50 Artigos',
      price: 120,
      originalPrice: null,
      description: 'R$ 2,40 por artigo',
      icon: FileText,
      color: 'purple',
      popular: false,
      articles: 50,
      validity: '30 dias',
      features: [
        'Válido por 30 dias',
        'Uso imediato',
        'Requer Plano Pago'
      ]
    },
    {
      id: 'pack-100',
      name: '100 Artigos',
      price: 180,
      originalPrice: null,
      description: 'R$ 1,80 por artigo',
      icon: FileText,
      color: 'purple',
      popular: true,
      articles: 100,
      validity: '45 dias',
      features: [
        'Válido por 45 dias',
        'Melhor custo-benefício',
        'Requer Plano Pago'
      ]
    },
    {
      id: 'pack-200',
      name: '200 Artigos',
      price: 320,
      originalPrice: null,
      description: 'R$ 1,60 por artigo',
      icon: FileText,
      color: 'gold',
      popular: false,
      articles: 200,
      validity: '60 dias',
      features: [
        'Válido por 60 dias',
        'Economia de 20%',
        'Requer Plano Pago'
      ]
    },
    {
      id: 'pack-300',
      name: '300 Artigos',
      price: 450,
      originalPrice: null,
      description: 'R$ 1,50 por artigo',
      icon: FileText,
      color: 'green',
      popular: false,
      articles: 300,
      validity: '75 dias',
      features: [
        'Válido por 75 dias',
        'Economia de 27%',
        'Requer Plano Pago'
      ]
    },
    {
      id: 'pack-500',
      name: '500 Artigos',
      price: 700,
      originalPrice: null,
      description: 'R$ 1,40 por artigo',
      icon: FileText,
      color: 'indigo',
      popular: false,
      articles: 500,
      validity: '90 dias',
      features: [
        'Válido por 90 dias',
        'Economia de 33%',
        'Requer Plano Pago'
      ]
    },
    {
      id: 'pack-1000',
      name: '1000 Artigos',
      price: 1200,
      originalPrice: null,
      description: 'R$ 1,20 por artigo',
      icon: FileText,
      color: 'gradient',
      popular: false,
      articles: 1000,
      validity: '120 dias',
      features: [
        'Válido por 120 dias',
        'Máxima economia',
        'Requer Plano Pago'
      ]
    }
  ];

  // Produtos adicionais
  const additionalProducts = [
    {
      id: 'modelo-blog',
      name: 'Modelo de Blog Pronto',
      price: 197,
      originalPrice: 497,
      description: 'Site WordPress completo otimizado para SEO com tema profissional',
      icon: Globe,
      color: 'white',
      popular: false,
      features: [
        'Instalação 100% automática com 1 clique',
        'Design moderno, responsivo e otimizado',
        'Estrutura pensada para conversão e SEO',
        'Páginas modelo (home, blog, sobre, contato)',
        'Plugins essenciais pré-configurados',
        'Compatível com Elementor e WooCommerce'
      ]
    },
    {
      id: 'landing-blog-personalizada',
      name: 'Landing Blog Personalizada',
      price: 997,
      originalPrice: null,
      description: 'Landing page personalizada profissionalmente para seu negócio',
      icon: Target,
      color: 'purple',
      popular: true,
      features: [
        'Landing page personalizada para seu negócio',
        'Design responsivo e otimizado para conversão',
        'Integração com formulários de contato',
        'Configuração de Google Analytics e pixels',
        'Otimização SEO on-page completa',
        'Treinamento para uso da plataforma'
      ]
    }
  ];

  const formatPrice = (price: number) => {
    if (price === 0) return 'R$0';
    return `R$${Math.floor(price)}`;
  };

  const handleSelectPlan = async (plan: any) => {
    if (plan.isFree) {
      toast.info('Você já está no plano Free! Faça upgrade para desbloquear mais recursos.');
      return;
    }

    if (isDev) {
      toast.info('🧑‍💻 Modo desenvolvedor - links de pagamento desabilitados');
      return;
    }

    console.log('🎯 Plano selecionado:', plan);
    console.log('📊 Estado atual dos planos:', {
      plansData,
      hasApiPlans: plansData && Object.keys(plansData).length > 0,
      loadingPlans
    });

    // Buscar plano dinamicamente da API
    const findPlanBySlug = (slug: string) => {
      if (!plansData || Object.keys(plansData).length === 0) {
        console.warn('⚠️ Planos da API não disponíveis, usando dados hardcoded');
        return null;
      }

      // Buscar em todos os tipos de planos
      for (const planType of Object.keys(plansData)) {
        const plansOfType = plansData[planType as keyof typeof plansData];
        if (Array.isArray(plansOfType)) {
          const foundPlan = plansOfType.find((p: any) => p.slug === slug);
          if (foundPlan) {
            console.log('✅ Plano encontrado na API:', foundPlan);
            return foundPlan;
          }
        }
      }

      console.warn(`⚠️ Plano "${slug}" não encontrado na API`);
      return null;
    };

    // Buscar plano da API dinamicamente usando o ID (que agora é o slug)
    const apiPlan = findPlanBySlug(plan.id);
    
    let planData;
    
    if (apiPlan) {
      // Usar dados da API
      console.log('✅ Usando dados do plano da API');
      planData = {
        id: apiPlan.id, // UUID dinâmico da API
        name: apiPlan.name,
        price: parseFloat(apiPlan.price) || apiPlan.price,
        description: apiPlan.description,
        features: apiPlan.features || [],
        isRecurring: apiPlan.type === 'monthly' // Assinaturas recorrentes para planos mensais
      };
    } else {
      // Usar dados hardcoded como fallback
      console.log('🔄 Usando dados hardcoded do plano como fallback');
      
      // Para usar planos hardcoded, precisamos de um mapeamento para UUID
      // Por enquanto, vamos usar o plan.id original e tratar no backend
      planData = {
        id: plan.id, // Usar ID hardcoded - backend deve mapear para UUID
        name: plan.name,
        price: plan.price,
        description: plan.description,
        features: plan.features || [],
        isRecurring: true // Assumir recorrente para planos mensais
      };
      
      console.log('📦 Dados do plano preparados (hardcoded):', planData);
    }

    console.log('🚀 Abrindo modal de checkout com plano:', planData);

    // Abrir modal de checkout
    setCheckoutModal({
      isOpen: true,
      plan: planData
    });
  };

  const getPlanIcon = (plan: any) => {
    const Icon = plan.icon;
    return <Icon className="w-8 h-8" />;
  };

  const getIconForPlan = (slug: string) => {
    switch (slug) {
      case 'start':
        return Target;
      case 'basico':
        return Star;
      case 'intermediario':
        return Rocket;
      case 'avancado':
        return Zap;
      case 'bia':
        return Sparkles;
      default:
        return Star;
    }
  };

  const getColorForPack = (slug: string) => {
    switch (slug) {
      case 'pack-50':
        return 'blue';
      case 'pack-100':
        return 'purple';
      case 'pack-200':
        return 'gold';
      case 'pack-300':
        return 'green';
      case 'pack-500':
        return 'indigo';
      case 'pack-1000':
        return 'gradient';
      default:
        return 'blue';
    }
  };

  const getValidityForPack = (slug: string) => {
    switch (slug) {
      case 'pack-50':
        return '30 dias';
      case 'pack-100':
        return '45 dias';
      case 'pack-200':
        return '60 dias';
      case 'pack-300':
        return '75 dias';
      case 'pack-500':
        return '90 dias';
      case 'pack-1000':
        return '120 dias';
      default:
        return '30 dias';
    }
  };

  const getPlanCardStyle = (plan: any) => {
    if (plan.isFree) {
      return 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm';
    }
    if (plan.popular) {
      return 'border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg transform scale-105';
    }
    if (plan.color === 'gradient') {
      return 'border-gradient-to-r from-purple-300 to-indigo-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 shadow-lg';
    }
    return 'border-gray-200 hover:border-purple-200 hover:shadow-md transition-all duration-200';
  };

  const getPlanButtonStyle = (plan: any) => {
    if (plan.isFree && currentPlan === 'Free') {
      return 'bg-gray-400 text-white cursor-not-allowed';
    }
    if (plan.isFree) {
      return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
    if (plan.popular) {
      return 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg';
    }
    if (plan.color === 'gradient') {
      return 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-xl';
    }
    return 'bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50';
  };

  const renderPlanCard = (plan: any, isArticlePack = false, isAdditional = false) => (
    <Card 
      key={plan.id}
      data-plan={plan.id}
      className={`relative ${getPlanCardStyle(plan)} overflow-hidden`}
    >
      {/* Badge de popular */}
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 text-xs font-montserrat font-medium rounded-bl-lg">
          <Star className="w-3 h-3 inline mr-1" />
          {isArticlePack ? 'Mais Vendido' : 'Mais Popular'}
        </div>
      )}

      {/* Badge de plano atual */}
      {plan.id === currentPlan.toLowerCase() && (
        <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-montserrat font-medium rounded-br-lg">
          Plano Atual
        </div>
      )}

      <CardHeader className="text-center pb-4 p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center ${
            plan.isFree 
              ? 'bg-gray-100'
              : plan.popular 
                ? 'bg-gradient-to-r from-purple-100 to-indigo-100' 
                : plan.color === 'gradient' 
                  ? 'bg-gradient-to-r from-purple-200 to-indigo-200'
                  : plan.color === 'green'
                    ? 'bg-green-50'
                    : 'bg-purple-50'
          }`}>
            {getPlanIcon(plan)}
          </div>
          
          <CardTitle className="font-poppins text-lg sm:text-xl lg:text-2xl text-center text-gray-700">
            {plan.name}
          </CardTitle>
        </div>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-poppins text-2xl sm:text-3xl lg:text-4xl" style={{color: '#8c52ff'}}>
              {formatPrice(plan.price)}
            </span>
            {plan.period && !plan.isFree && (
              <span className="font-montserrat text-sm sm:text-base text-gray-600">/{plan.period}</span>
            )}
          </div>
          
          {plan.originalPrice && (
            <div className="flex items-center justify-center gap-2">
              <span className="font-montserrat text-sm text-gray-500 line-through">
                {formatPrice(plan.originalPrice)}
              </span>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}% OFF
              </Badge>
            </div>
          )}

          {isArticlePack && plan.articles && (
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Badge variant="outline" style={{color: '#8c52ff', borderColor: '#8c52ff', backgroundColor: '#f3f0ff'}}>
                  {plan.articles} artigos
                </Badge>
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {plan.description}
              </div>
              {plan.validity && (
                <div className="text-xs text-gray-500 text-center">
                  Válido por {plan.validity}
                </div>
              )}
            </div>
          )}
        </div>
        
        {!isArticlePack && plan.description && plan.description.length < 50 && (
          <div className="text-center mt-3">
            <p className="font-montserrat text-xs sm:text-sm lg:text-base text-gray-600 text-center px-2">
              {plan.description}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6 pt-0">
        {/* Lista de funcionalidades */}
        <div className="space-y-2 lg:space-y-3">
          {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, index: number) => (
            <div key={index} className="flex items-start gap-2 lg:gap-3">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-1 flex-shrink-0" />
              <span className="font-montserrat text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Botão de ação */}
        <Button
          onClick={() => handleSelectPlan(plan)}
          disabled={isLoading || (plan.isFree && currentPlan === 'Free')}
          className={`w-full font-montserrat font-medium h-10 sm:h-12 lg:h-14 text-sm sm:text-base ${getPlanButtonStyle(plan)} transition-all duration-200`}
        >
          {isLoading ? (
            'Processando...'
          ) : plan.isFree && currentPlan === 'Free' ? (
            'Plano Atual'
          ) : (
            <>
              {plan.isFree ? 'Quero esse!' : isArticlePack ? 'Comprar Pack' : isAdditional ? 'Contratar' : 'Quero esse!'}
              {!plan.isFree && <ArrowUpRight className="ml-2 w-4 h-4" />}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header - Seguindo padrão das outras páginas */}
      <div className="text-left">
        <h1 className="font-poppins text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground mb-2">
          Escolha seu Plano BIA
        </h1>
        <p className="font-montserrat text-sm sm:text-base text-muted-foreground">
          Transforme sua produção de conteúdo com inteligência artificial. Escolha o plano ideal para suas necessidades.
        </p>
      </div>

      {/* Alerta para desenvolvedores */}
      {isDev && (
        <Alert className="border-purple-200 bg-purple-50">
          <Rocket className="h-5 w-5" style={{ color: '#8B5FBF' }} />
          <AlertDescription className="text-purple-800">
            <strong>🧑‍💻 Modo Desenvolvedor:</strong> Você tem acesso ilimitado a todas as funcionalidades. 
            Os links de pagamento estão desabilitados para testes.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs para organizar os produtos - Seguindo padrão das Ações Rápidas */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-gray-50 rounded-lg p-1 gap-1">
              <TabsTrigger 
                value="monthly" 
                className="font-montserrat font-medium text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground rounded-md transition-all duration-200 px-2 sm:px-3 py-2"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Planos </span>Mensais
              </TabsTrigger>
              <TabsTrigger 
                value="packs" 
                className="font-montserrat font-medium text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground rounded-md transition-all duration-200 px-2 sm:px-3 py-2"
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Packs <span className="hidden xs:inline">de Artigos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="additional" 
                className="font-montserrat font-medium text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground rounded-md transition-all duration-200 px-2 sm:px-3 py-2"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Adicionais
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo da aba Planos Mensais - Seguindo padrão das outras páginas */}
            <TabsContent value="monthly" className="mt-6">
              <div className="space-y-4 lg:space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="font-poppins text-base sm:text-lg lg:text-xl font-medium text-foreground">
                    Planos de Assinatura Mensal
                  </h2>
                  <p className="font-montserrat text-xs sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto px-4">
                    Escolha o plano ideal para seu volume de produção de conteúdo
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 lg:gap-6">
                  {loadingPlans ? (
                    <div className="col-span-full flex justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#8c52ff' }}></div>
                        <p className="font-montserrat text-sm text-muted-foreground">Carregando planos...</p>
                      </div>
                    </div>
                  ) : plansData.monthly && plansData.monthly.length > 0 ? (
                    plansData.monthly.map((plan) => renderPlanCard({
                      ...plan,
                      id: plan.slug, // Usar slug como ID para consistência
                      price: parseFloat(plan.price),
                      icon: getIconForPlan(plan.slug),
                      popular: plan.slug === 'intermediario', // Marcar Intermediário como popular
                      period: 'mês'
                    }))
                  ) : (
                    monthlyPlans.map((plan) => renderPlanCard(plan))
                  )}
                </div>

                {/* Informações sobre os planos */}
                <div className="p-4 lg:p-6 rounded-lg bg-white border">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                      <Lightbulb className="w-4 h-4" style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-poppins text-sm lg:text-base font-medium text-foreground mb-2">
                        Como funcionam os Planos Mensais?
                      </h3>
                      <ul className="font-montserrat text-xs lg:text-sm text-muted-foreground space-y-1 lg:space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <li>• <strong>Renovação Automática:</strong> Cobrança mensal recorrente com cancelamento a qualquer momento</li>
                        <li>• <strong>Artigos Inclusos:</strong> Cota mensal de artigos que renova todo mês</li>
                        <li>• <strong>Sites Ilimitados:</strong> Conecte quantos sites WordPress desejar</li>
                        <li>• <strong>Suporte Prioritário:</strong> Atendimento especializado para assinantes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

        {/* Conteúdo da aba Packs de Artigos - Seguindo padrão harmonizado */}
            <TabsContent value="packs" className="mt-6">
              <div className="space-y-4 lg:space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="font-poppins text-base sm:text-lg lg:text-xl font-medium text-foreground">
                    Packs de Artigos Extras
                  </h2>
                  <p className="font-montserrat text-xs sm:text-sm lg:text-base text-muted-foreground max-w-3xl mx-auto px-4">
                    Precisa de mais artigos? Adquira packs extras com preços especiais e aumente sua produção de conteúdo.
                  </p>
                </div>

                <div className="packs-grid-2x3">
                  {loadingPlans ? (
                    <div className="col-span-full flex justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#8c52ff' }}></div>
                        <p className="font-montserrat text-sm text-muted-foreground">Carregando packs...</p>
                      </div>
                    </div>
                  ) : plansData.article_pack && plansData.article_pack.length > 0 ? (
                    plansData.article_pack.map((pack) => renderPlanCard({
                      ...pack,
                      id: pack.slug, // Usar slug como ID para consistência
                      price: parseFloat(pack.price),
                      articles: pack.articles_included,
                      validity: getValidityForPack(pack.slug),
                      color: getColorForPack(pack.slug),
                      icon: FileText,
                      popular: pack.slug === 'pack-100' // Marcar pack 100 como popular
                    }, true))
                  ) : (
                    articlePacks.slice(0, 6).map((pack) => renderPlanCard(pack, true))
                  )}
                </div>

                {/* Informações sobre os packs */}
                <div className="p-4 rounded-lg bg-white border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                      <ShoppingBag className="w-4 h-4" style={{ color: '#8c52ff' }} />
                    </div>
                    <div>
                      <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                        Como funcionam os Packs?
                      </h3>
                      <ul className="font-montserrat text-xs text-muted-foreground space-y-1">
                        <li>• <strong>Compra Única:</strong> Pague uma vez e use quando precisar</li>
                        <li>• <strong>Economia:</strong> Preço por artigo muito melhor que planos mensais</li>
                        <li>• <strong>Flexibilidade:</strong> Ideal para projetos pontuais ou demandas sazonais</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Conteúdo da aba Serviços Adicionais - Seguindo padrão harmonizado */}
            <TabsContent value="additional" className="mt-6">
              <div className="space-y-4 lg:space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="font-poppins text-base sm:text-lg lg:text-xl font-medium text-foreground">
                    Serviços Adicionais
                  </h2>
                  <p className="font-montserrat text-xs sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto px-4">
                    Maximize seus resultados com nossos serviços especializados
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-7xl mx-auto">
                  {loadingPlans ? (
                    <div className="col-span-full flex justify-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#8c52ff' }}></div>
                        <p className="font-montserrat text-sm text-muted-foreground">Carregando produtos...</p>
                      </div>
                    </div>
                  ) : plansData.additional && plansData.additional.length > 0 ? (
                    plansData.additional.map((product) => renderPlanCard({
                      ...product,
                      id: product.slug, // Usar slug como ID para consistência
                      price: parseFloat(product.price),
                      originalPrice: product.slug === 'modelo-blog' ? 497 : null,
                      icon: product.slug === 'modelo-blog' ? Globe : Target,
                      color: product.slug === 'modelo-blog' ? 'white' : 'purple',
                      popular: product.slug === 'landing-blog-personalizada'
                    }, false, true))
                  ) : (
                    additionalProducts.map((product) => renderPlanCard(product, false, true))
                  )}
                </div>

                {/* Benefícios dos serviços adicionais */}
                <div className="p-4 rounded-lg bg-white border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                      <Target className="w-4 h-4" style={{ color: '#8c52ff' }} />
                    </div>
                    <div>
                      <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                        Acelere seus Resultados
                      </h3>
                      <p className="font-montserrat text-xs text-muted-foreground">
                        Nossos serviços adicionais são projetados para acelerar sua implementação 
                        e maximizar o retorno sobre seu investimento em conteúdo automatizado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seção de benefícios - Seguindo padrão harmonizado */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <h2 className="text-xl font-semibold text-foreground font-poppins">
            Por que escolher a BIA?
          </h2>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                  <Zap className="w-4 h-4" style={{ color: '#8c52ff' }} />
                </div>
                <div>
                  <h3 className="font-poppins text-sm font-medium text-foreground mb-1">
                    Velocidade Incomparável
                  </h3>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Gere artigos completos em minutos, não horas
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                  <Shield className="w-4 h-4" style={{ color: '#8c52ff' }} />
                </div>
                <div>
                  <h3 className="font-poppins text-sm font-medium text-foreground mb-1">
                    Qualidade Garantida
                  </h3>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    IA treinada para produzir conteúdo relevante e engajante
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                  <Globe className="w-4 h-4" style={{ color: '#8c52ff' }} />
                </div>
                <div>
                  <h3 className="font-poppins text-sm font-medium text-foreground mb-1">
                    Integração Total
                  </h3>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Conecta diretamente com seu WordPress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de FAQ - Seguindo padrão harmonizado */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <h2 className="text-xl font-semibold text-foreground font-poppins">
            Perguntas Frequentes
          </h2>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white border">
              <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                Como funciona a cobrança?
              </h3>
              <p className="font-montserrat text-xs text-muted-foreground">
                A cobrança é mensal e processada automaticamente via Asaas. 
                Você pode cancelar a qualquer momento.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border">
              <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                Posso trocar de plano?
              </h3>
              <p className="font-montserrat text-xs text-muted-foreground">
                Sim! Você pode fazer upgrade ou downgrade do seu plano 
                a qualquer momento através da sua conta.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border">
              <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                Posso começar gratuitamente?
              </h3>
              <p className="font-montserrat text-xs text-muted-foreground">
                Sim! Oferecemos um plano gratuito com 5 artigos para você 
                testar a qualidade do nosso conteúdo antes de assinar.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border">
              <h3 className="font-poppins text-sm font-medium text-foreground mb-2">
                Terei garantia?
              </h3>
              <p className="font-montserrat text-xs text-muted-foreground">
                Sim, você pode testar gratuitamente o sistema antes de assinar um plano ou comprar um pack, isso garante que você vai comprar exatamente o que já testou.
                <br /><br />
                A BIA é um Saas pré-pago, e seguimos rigorosamente o artigo 49 do CDC, onde disponibilizamos todas as informações, atendimento tira dúvidas e teste antes da assinatura. Por se tratar de um serviço, é considerado plenamente executado após assinatura e consumo dos créditos, e não se enquadra na lei do arrependimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção do Plano Grátis - Seguindo padrão harmonizado */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4 p-4 sm:p-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground font-poppins">
              Quer começar gratuitamente?
            </h2>
            <p className="font-montserrat text-xs sm:text-sm lg:text-base text-muted-foreground max-w-lg mx-auto">
              Teste todas as funcionalidades da BIA sem compromisso
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 lg:space-y-6">
            <div className="max-w-sm sm:max-w-md mx-auto">
              {renderPlanCard(freePlan)}
            </div>

            <div className="p-4 lg:p-6 rounded-lg bg-white border max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
                  <Heart className="w-4 h-4" style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-poppins text-sm lg:text-base font-medium text-foreground mb-2">
                    Sobre o Plano Grátis
                  </h3>
                  <ul className="font-montserrat text-xs lg:text-sm text-muted-foreground space-y-1 lg:space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <li>• Perfeito para testar a qualidade dos nossos artigos</li>
                    <li>• Sem compromisso ou cartão de crédito necessário</li>
                    <li>• Upgrade a qualquer momento para planos pagos</li>
                    <li>• Suporte completo mesmo no plano gratuito</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Checkout */}
      <CheckoutModal
        isOpen={checkoutModal.isOpen}
        onClose={() => setCheckoutModal({ isOpen: false, plan: null })}
        plan={checkoutModal.plan}
        userData={userData}
        onSuccess={async (data) => {
          console.log('Pagamento/Assinatura criada:', data);
          // Forçar atualização dos dados do usuário após pagamento bem-sucedido
          if (onRefreshUser) {
            console.log('🔄 Atualizando dados do usuário após pagamento...');
            await onRefreshUser();
          }
        }}
      />
    </div>
  );
}
