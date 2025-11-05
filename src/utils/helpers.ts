export const formatMoney = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date?: string | Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }
    
    return dateObj.toLocaleDateString('pt-BR', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Data inválida';
  }
};

export const getStatusColor = (status: string) => {
  const colors = {
    'Publicado': '#10B981',
    'Produzido': '#8B5FBF',
    'Pendente': '#F59E0B',
    'Excluído': '#EF4444'
  };
  return colors[status as keyof typeof colors] || '#6B7280';
};

export const getFrequencyLabel = (freq: string) => {
  switch (freq) {
    case 'diaria': return 'Diário';
    case 'semanal': return 'Semanal';
    case 'mensal': return 'Mensal';
    default: return freq;
  }
};

export const calculateEndDate = (total: number, frequencia: string) => {
  if (total === 0) return null;
  const days = total * (frequencia === 'diaria' ? 1 : frequencia === 'semanal' ? 7 : 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  return endDate.toLocaleDateString('pt-BR');
};

export const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const validateApiKey = (key: string) => {
  if (!key) return null;
  if (!key.startsWith('sk-')) return 'Chave deve começar com "sk-"';
  if (key.length < 20) return 'Chave muito curta';
  return null;
};

export const generateIdeasTemplates = [
  'Como dominar {nicho} em 2025: Guia completo',
  '{quantidade} estratégias de {nicho} que funcionam',
  'O futuro do {nicho}: Tendências e oportunidades',
  'Erros comuns em {nicho} e como evitá-los',
  'Ferramentas essenciais para {nicho}',
  'Case study: Sucesso em {nicho}',
  'Primeiros passos em {nicho} para iniciantes',
  'Métricas importantes para {nicho}',
  'Como monetizar {nicho} efetivamente',
  'Automatização em {nicho}: Dicas práticas'
];

// Cálculos de economia de tempo e dinheiro
export const calculateTimeSaved = (articleCount: number) => {
  const HOURS_PER_ARTICLE = 0.5; // 30 minutos por artigo
  return (articleCount * HOURS_PER_ARTICLE).toFixed(1);
};

export const calculateMoneySaved = (articleCount: number) => {
  const VALUE_PER_ARTICLE = 50; // R$ 50 por artigo
  return articleCount * VALUE_PER_ARTICLE;
};

export const formatTimeSaved = (articleCount: number) => {
  const hours = calculateTimeSaved(articleCount);
  return `${hours}h`;
};

export const formatMoneySaved = (articleCount: number) => {
  const value = calculateMoneySaved(articleCount);
  return formatMoney(value);
};