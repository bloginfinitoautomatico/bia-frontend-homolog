import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
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
  Clock
} from '../icons';
import { useBia } from '../BiaContext';
import { toast } from 'sonner';

interface LojaBIAProps {
  userData: any;
  onUpdateUser?: (userData: any) => Promise<boolean>;
}

export function LojaBIA({ userData, onUpdateUser }: LojaBIAProps) {
  const { state } = useBia();
  const [isLoading, setIsLoading] = useState(false);

  // Verificar se é desenvolvedor
  const isDev = userData?.email === 'dev@bia.com' || userData?.isDeveloper;
  const currentPlan = userData?.plano || 'Free';

  // Dados dos planos
  const plans = [
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
      stripeLink: 'https://buy.stripe.com/4gMaEW6568hYbjHd1y8EM00',
      features: [
        '10 sites conectados',
        '100 artigos por mês',
        'Apenas R$1,49 por artigo',
        'Suporte por e-mail',
        'Dashboard completo'
      ],
      limits: {
        sites: 10,
        ideas: 100,
        articles: 100
      }
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
      stripeLink: 'https://buy.stripe.com/00wcN4almdCi4Vj2mU8EM01',
      features: [
        '20 sites conectados',
        '200 artigos por mês',
        'Apenas R$1,24 por artigo',
        'Suporte WhatsApp 24/7',
        'Bônus: Modelo de blog pronto (R$497)'
      ],
      limits: {
        sites: 20,
        ideas: 200,
        articles: 200
      }
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
      stripeLink: 'https://buy.stripe.com/bJe6oGfFG8hY0F3e5C8EM02',
      features: [
        '50 sites conectados',
        '500 artigos por mês',
        'Apenas R$1,19 por artigo',
        'Suporte WhatsApp 24/7',
        'Dashboard Completo',
        'Bônus: Modelo de blog pronto (R$497)'
      ],
      limits: {
        sites: 50,
        ideas: 500,
        articles: 500
      }
    },
    {
      id: 'bia',
      name: 'BIA',
      price: 999,
      originalPrice: null,
      period: 'mês',
      description: 'Publique até 1.000 artigos em quantos sites quiser.',
      icon: Rocket,
      color: 'gradient',
      popular: false,
      stripeLink: 'https://buy.stripe.com/6oUeVcfFGbua5Zn1iQ8EM03',
      features: [
        'Sites ilimitados',
        '1.000 artigos por mês',
        'Apenas R$0,99 por artigo',
        'Suporte WhatsApp 24/7',
        'Dashboard Completo',
        'Bônus: Modelo de blog pronto (R$497)'
      ],
      limits: {
        sites: -1,
        ideas: 1000,
        articles: 1000
      }
    }
  ];

  // Plano gratuito separado
  const freePlan = {
    id: 'gratuito',
    name: 'Grátis',
    price: 0,
    originalPrice: null,
    period: '',
    description: 'Publique até 5 artigos em 1 site',
    icon: Shield,
    color: 'blue',
    popular: false,
    stripeLink: '',
    features: [
      '1 site conectado',
      '5 artigos para testar',
      'R$0 por artigo',
      'Suporte por e-mail',
      'Dashboard completo'
    ],
    limits: {
      sites: 1,
      ideas: 5,
      articles: 5
    }
  };

  const handleSelectPlan = async (plan: any) => {
    if (isDev) {
      toast.info('🧑‍💻 Modo desenvolvedor: Redirecionamento para Stripe desabilitado');
      return;
    }

    setIsLoading(true);
    
    try {
      // Abrir link do Stripe em nova aba
      window.open(plan.stripeLink, '_blank', 'noopener,noreferrer');
      
      toast.success(`Redirecionando para o pagamento do plano ${plan.name}...`);
      
    } catch (error) {
      console.error('Erro ao redirecionar para o Stripe:', error);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) {
      return 'R$0';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getPlanIcon = (plan: any) => {
    const Icon = plan.icon;
    return <Icon className="w-8 h-8" />;
  };

  const getPlanCardStyle = (plan: any) => {
    if (plan.popular) {
      return 'border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg transform scale-105';
    }
    if (plan.color === 'gradient') {
      return 'border-gradient-to-r from-purple-300 to-indigo-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 shadow-lg';
    }
    return 'border-gray-200 hover:border-purple-200 hover:shadow-md transition-all duration-200';
  };

  const getPlanButtonStyle = (plan: any) => {
    if (plan.popular) {
      return 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg';
    }
    if (plan.color === 'gradient') {
      return 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-xl';
    }
    return 'bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50';
  };

  // Estatísticas do usuário atual
  const userStats = {
    sites: state.sites.length,
    ideas: state.ideas.length,
    articles: state.articles.length
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-3xl text-black mb-2">
            {currentPlan === 'Free' 
              ? 'Upgrade seu Plano BIA' 
              : 'Escolha seu Plano BIA'
            }
          </h1>
          <p className="font-montserrat text-gray-600 max-w-2xl">
            {currentPlan === 'Free' 
              ? 'Você já experimentou o poder da BIA! Agora libere todo o potencial e escale sua produção de conteúdo sem limites.'
              : 'Transforme sua produção de conteúdo com inteligência artificial. Escolha o plano ideal para suas necessidades e comece a gerar artigos de qualidade automaticamente.'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6" style={{ color: '#8B5FBF' }} />
          </div>
          
          {/* Badge de economia */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-full px-4 py-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-montserrat text-sm text-green-700">
              {currentPlan === 'Free' 
                ? <><strong>10x mais produção</strong> com apenas R$ 149/mês</>
                : <><strong>Economize até 100x mais</strong> vs. contratar redatores</>
              }
            </span>
          </div>
        </div>
      </div>

      {/* Status do plano atual */}
      {!isDev && currentPlan === 'Free' && (
        <Card className="border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-poppins text-lg text-green-800">
                    ✅ Você está no Plano Gratuito
                  </h3>
                  <p className="font-montserrat text-sm text-green-600">
                    {userStats.sites} sites • {userStats.ideas} ideias • {userStats.articles} artigos criados
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                Ativo
              </Badge>
            </div>
            
            {/* Barra de progresso do uso */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-montserrat text-green-700">Uso do plano gratuito:</span>
                <span className="font-montserrat text-green-600">{userStats.articles}/5 artigos</span>
              </div>
              <div className="w-full bg-green-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((userStats.articles / 5) * 100, 100)}%` }}
                ></div>
              </div>
              {userStats.articles >= 4 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-montserrat">
                    {userStats.articles >= 5 
                      ? '🚨 Limite atingido! Faça upgrade para continuar criando.' 
                      : '⚠️ Restam apenas ' + (5 - userStats.articles) + ' artigos. Considere fazer upgrade.'
                    }
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isDev && currentPlan !== 'Free' && (
        <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6" style={{ color: '#8B5FBF' }} />
                </div>
                <div>
                  <h3 className="font-poppins text-lg text-purple-800">
                    Plano Atual: {currentPlan}
                  </h3>
                  <p className="font-montserrat text-sm text-purple-600">
                    {userStats.sites} sites • {userStats.ideas} ideias • {userStats.articles} artigos
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white text-purple-700 border-purple-300">
                Premium
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner especial para desenvolvedor */}
      {isDev && (
        <Alert className="border-purple-200 bg-gradient-to-r from-purple-100 to-indigo-100">
          <Rocket className="h-5 w-5" style={{ color: '#8B5FBF' }} />
          <AlertDescription className="text-purple-800">
            <strong>🧑‍💻 Modo Desenvolvedor:</strong> Você tem acesso ilimitado a todas as funcionalidades. 
            Os links de pagamento estão desabilitados para testes.
          </AlertDescription>
        </Alert>
      )}

      {/* Grid de planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            data-plan={plan.id}
            className={`relative ${getPlanCardStyle(plan)} overflow-hidden`}
          >
            {/* Badge de popular */}
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 text-xs font-montserrat font-medium rounded-bl-lg">
                <Star className="w-3 h-3 inline mr-1" />
                Mais Popular
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-purple-100 to-indigo-100' 
                    : plan.color === 'gradient' 
                      ? 'bg-gradient-to-r from-purple-200 to-indigo-200'
                      : 'bg-purple-50'
                }`}>
                  {getPlanIcon(plan)}
                </div>
              </div>
              
              <CardTitle className="font-poppins text-xl text-black mb-2">
                {plan.name}
              </CardTitle>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-poppins text-3xl text-black">
                    {formatPrice(plan.price)}
                  </span>
                  {plan.period && (
                    <span className="font-montserrat text-gray-600">/{plan.period}</span>
                  )}
                </div>
                
                {plan.originalPrice && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-montserrat text-sm text-gray-500 line-through">
                      {formatPrice(plan.originalPrice)}
                    </span>
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                      -{Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
              
              <p className="font-montserrat text-sm text-gray-600 mt-2">
                {plan.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Lista de funcionalidades */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="font-montserrat text-sm text-gray-700">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Botão de ação */}
              <Button
                onClick={() => handleSelectPlan(plan)}
                disabled={isLoading}
                className={`w-full font-montserrat font-medium h-12 ${getPlanButtonStyle(plan)} transition-all duration-200`}
              >
                {isLoading ? (
                  'Processando...'
                ) : (
                  <>
                    Quero esse!
                    <ArrowUpRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Link direto para o Stripe */}
              {!isDev && (
                <div className="pt-2 text-center">
                  <a
                    href={plan.stripeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-montserrat text-xs text-gray-500 hover:text-purple-600 transition-colors duration-200 inline-flex items-center gap-1"
                  >
                    Pagamento seguro via Stripe
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Seção de benefícios */}
      <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="font-poppins text-2xl text-black mb-4">
            Por que escolher a BIA?
          </h2>
          <p className="font-montserrat text-gray-600 max-w-2xl mx-auto">
            A BIA revoluciona a criação de conteúdo com inteligência artificial avançada
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" style={{ color: '#8B5FBF' }} />
            </div>
            <h3 className="font-poppins text-lg text-black mb-2">
              Velocidade Incrível
            </h3>
            <p className="font-montserrat text-sm text-gray-600">
              Gere artigos completos em minutos, não em horas
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6" style={{ color: '#8B5FBF' }} />
            </div>
            <h3 className="font-poppins text-lg text-black mb-2">
              SEO Otimizado
            </h3>
            <p className="font-montserrat text-sm text-gray-600">
              Conteúdo otimizado para mecanismos de busca
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6" style={{ color: '#8B5FBF' }} />
            </div>
            <h3 className="font-poppins text-lg text-black mb-2">
              Integração Total
            </h3>
            <p className="font-montserrat text-sm text-gray-600">
              Conecta diretamente com seu WordPress
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Rápido */}
      <div className="space-y-6">
        <h2 className="font-poppins text-2xl text-black text-center">
          Perguntas Frequentes
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-poppins text-lg text-black mb-3">
                Como funciona a cobrança?
              </h3>
              <p className="font-montserrat text-sm text-gray-600">
                A cobrança é mensal e processada automaticamente via Stripe. 
                Você pode cancelar a qualquer momento.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-poppins text-lg text-black mb-3">
                Posso trocar de plano?
              </h3>
              <p className="font-montserrat text-sm text-gray-600">
                Sim! Você pode fazer upgrade ou downgrade do seu plano 
                a qualquer momento através da sua conta.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-poppins text-lg text-black mb-3">
                Há garantia de reembolso?
              </h3>
              <p className="font-montserrat text-sm text-gray-600">
                Oferecemos garantia de 7 dias. Se não estiver satisfeito, 
                reembolsamos 100% do valor.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-poppins text-lg text-black mb-3">
                Preciso de conhecimento técnico?
              </h3>
              <p className="font-montserrat text-sm text-gray-600">
                Não! A BIA foi projetada para ser simples. 
                Basta conectar seu WordPress e começar a usar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Container do Plano Gratuito - Apenas para usuários no plano Free */}
      {currentPlan === 'Free' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-poppins text-2xl text-amber-800 mb-4">
              🚀 Pronto para Escalar sua Produção?
            </h2>
            <p className="font-montserrat text-amber-700 max-w-2xl mx-auto">
              Você já experimentou o poder da BIA! Agora é hora de liberar todo o potencial 
              e criar conteúdo sem limites.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Seu uso atual */}
              <Card className="border border-amber-300 bg-white">
                <CardHeader className="text-center">
                  <h3 className="font-poppins text-lg text-amber-800">
                    📊 Seu Uso Atual
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="font-poppins text-2xl text-amber-800 mb-1">
                      {userStats.articles}/5
                    </div>
                    <div className="font-montserrat text-sm text-amber-600">Artigos Criados</div>
                    <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full"
                        style={{ width: `${Math.min((userStats.articles / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-montserrat text-gray-600">Sites conectados:</span>
                      <span className="font-montserrat font-medium">{userStats.sites}/1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-montserrat text-gray-600">Ideias geradas:</span>
                      <span className="font-montserrat font-medium">{userStats.ideas}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefícios do upgrade */}
              <Card className="border border-green-300 bg-white">
                <CardHeader className="text-center">
                  <h3 className="font-poppins text-lg text-green-800">
                    ⬆️ Benefícios do Upgrade
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-montserrat text-sm text-green-700">
                      <strong>10x mais artigos</strong> (100/mês)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-montserrat text-sm text-green-700">
                      <strong>10x mais sites</strong> conectados
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-montserrat text-sm text-green-700">
                      <strong>Apenas R$ 1,49</strong> por artigo
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-montserrat text-sm text-green-700">
                      <strong>Suporte dedicado</strong>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Call to action para upgrade */}
            <div className="text-center">
              <Button
                onClick={() => {
                  // Scroll para o plano Básico
                  document.querySelector('[data-plan="basico"]')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }}
                className="font-montserrat font-medium h-14 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 text-lg"
              >
                Ver Planos Premium
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="font-montserrat text-sm text-amber-600 mt-2">
                Comece com apenas R$ 149/mês • Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action Final */}
      <div className="text-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <h2 className="font-poppins text-2xl mb-4">
          Pronto para revolucionar seu conteúdo?
        </h2>
        <p className="font-montserrat text-purple-100 mb-6 max-w-2xl mx-auto">
          Junte-se a centenas de blogueiros e empresas que já transformaram 
          sua produção de conteúdo com a BIA.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Headphones className="w-5 h-5" />
          <span className="font-montserrat text-sm">
            Suporte especializado em português
          </span>
        </div>
      </div>
    </div>
  );
}