export const PLAN_DATA = [
  {
    name: 'Free',
    price: 'Gratuito',
    originalPrice: null,
    sites: 1,
    articles: 5,
    features: ['1 Site Conectado', '5 Artigos por mês', '10 Ideias', 'Suporte por E-mail', 'Dashboard Básico'],
    popular: false,
    link: null
  },
  {
    name: 'Start',
    price: 'R$ 99,90',
    originalPrice: null,
    sites: 5,
    articles: 50,
    features: ['5 Sites Conectados', '50 Artigos por mês', 'Ideias Ilimitadas', 'Suporte por E-mail', 'Dashboard Completo'],
    popular: false,
    link: null // Adicionar link quando disponível
  },
  {
    name: 'Básico',
    price: 'R$ 149,90',
    originalPrice: null,
    sites: 10,
    articles: 100,
    features: ['10 Sites Conectados', '100 Artigos por mês', 'Ideias Ilimitadas', 'Suporte por E-mail', 'Dashboard Completo'],
    popular: false,
    link: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=97b424da556e48eea6a25c38f3a61d23'
  },
  {
    name: 'Intermediário',
    price: 'R$ 249,90',
    originalPrice: null,
    sites: 20,
    articles: 200,
    features: ['20 Sites Conectados', '200 Artigos por mês', 'Ideias Ilimitadas', 'Suporte WhatsApp 24/7', 'Modelo de Blog Pronto'],
    popular: true,
    link: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=d50bade979014049807da793fc376907'
  },
  {
    name: 'Avançado',
    price: 'R$ 599,90',
    originalPrice: null,
    sites: 50,
    articles: 500,
    features: ['50 Sites Conectados', '500 Artigos por mês', 'Ideias Ilimitadas', 'Suporte WhatsApp 24/7', 'Modelo de Blog Pronto'],
    popular: false,
    link: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=2cbd40eae7de49dcbebc4e15cdf7d793'
  },
  {
    name: 'Ilimitado',
    price: 'R$ 999,90',
    originalPrice: null,
    sites: 'Ilimitados',
    articles: 1000,
    features: ['Sites Ilimitados', '1.000 Artigos por mês', 'Ideias Ilimitadas', 'Suporte WhatsApp 24/7', 'Modelo de Blog Pronto'],
    popular: false,
    link: 'https://mpago.la/1TMKvPa'
  }
];

export const FREE_PLAN_LIMITS = {
  sites: 1,
  ideas: 10,
  articles: 5,
  name: 'Gratuito'
};

// Função para obter limites baseados no plano do usuário
export const getPlanLimits = (planName: string) => {
  // Normalizar nome do plano
  const normalizedPlan = planName?.toLowerCase();
  
  // Buscar plano nos dados - USAR COMPARAÇÃO EXATA para evitar conflitos
  const planData = PLAN_DATA.find(plan => 
    plan.name.toLowerCase() === normalizedPlan
  );
  
  if (!planData) {
    // Plano não encontrado, usar limites gratuitos
    return {
      sites: FREE_PLAN_LIMITS.sites,
      ideas: FREE_PLAN_LIMITS.ideas,
      articles: FREE_PLAN_LIMITS.articles,
      isUnlimited: false,
      planName: 'Free'
    };
  }
  
  // Determinar se sites são ilimitados
  const sitesUnlimited = typeof planData.sites === 'string' && planData.sites.toLowerCase().includes('ilimitado');
  
  return {
    sites: sitesUnlimited ? Number.MAX_SAFE_INTEGER : planData.sites as number,
    ideas: planData.name === 'Free' ? FREE_PLAN_LIMITS.ideas : Number.MAX_SAFE_INTEGER, // Free tem limite, outros ilimitados
    articles: planData.articles,
    isUnlimited: sitesUnlimited,
    planName: planData.name
  };
};

// Função para verificar se um plano é gratuito
export const isFreePlan = (planName: string): boolean => {
  const normalizedPlan = planName?.toLowerCase();
  return !planName || normalizedPlan === 'free' || normalizedPlan === 'gratuito';
};

export const ARTICLE_PACKS = [
  {
    quantity: 50,
    price: 'R$ 75',
    pricePerArticle: 'R$ 1,50',
    features: ['50 Artigos Extras', 'Válido por 30 dias', 'Uso imediato'],
    link: 'https://mpago.la/2HTRSzY'
  },
  {
    quantity: 100,
    price: 'R$ 135',
    pricePerArticle: 'R$ 1,35',
    features: ['100 Artigos Extras', 'Válido por 60 dias', 'Melhor custo-benefício'],
    popular: true,
    link: 'https://mpago.la/1HzhrW7'
  },
  {
    quantity: 200,
    price: 'R$ 240',
    pricePerArticle: 'R$ 1,20',
    features: ['200 Artigos Extras', 'Válido por 90 dias', 'Economia de 20%'],
    link: 'https://mpago.la/2xxVivb'
  },
  {
    quantity: 300,
    price: 'R$ 330',
    pricePerArticle: 'R$ 1,10',
    features: ['300 Artigos Extras', 'Válido por 120 dias', 'Economia de 27%'],
    link: 'https://mpago.la/1MMkoYK'
  },
  {
    quantity: 500,
    price: 'R$ 500',
    pricePerArticle: 'R$ 1,00',
    features: ['500 Artigos Extras', 'Válido por 180 dias', 'Economia de 33%'],
    link: 'https://mpago.la/21y8jva'
  },
  {
    quantity: 1000,
    price: 'R$ 950',
    pricePerArticle: 'R$ 0,95',
    features: ['1000 Artigos Extras', 'Válido por 365 dias', 'Máxima economia'],
    link: 'https://mpago.la/32h6FdK'
  }
];



export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const IDIOMA_OPTIONS = [
  { value: 'Português', label: 'Português' },
  { value: 'Inglês', label: 'Inglês' },
  { value: 'Espanhol', label: 'Espanhol' },
  { value: 'Francês', label: 'Francês' },
  { value: 'Italiano', label: 'Italiano' },
  { value: 'Mandarim', label: 'Mandarim' },
  { value: 'Russo', label: 'Russo' }
];

export const FREQUENCIA_OPTIONS = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' }
];

export const STATUS_COLORS = {
  'Publicado': '#10B981',
  'Concluído': '#8B5FBF',
  'Produzindo': '#F59E0B',
  'Pendente': '#F59E0B',
  'Agendado': '#3B82F6',
  'Excluído': '#EF4444'
};

export const BIA_PURPLE = '#8B5FBF';

// Calculation constants
export const ARTICLE_SAVINGS_VALUE = 50; // R$ per article saved
export const ARTICLE_TIME_SAVED_HOURS = 0.5; // 30 minutes = 0.5 hours per article

// ESTADOS BRASILEIROS
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];