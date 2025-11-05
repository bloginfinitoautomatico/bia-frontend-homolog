/**
 * SISTEMA DE BACKLINKS INTERNOS
 * Lista de URLs reais para distribuir no conteúdo
 * Atualizada regularmente com artigos do sistema
 */

export interface InternalLink {
  url: string;
  anchor: string;
  category: string;
  keywords: string[];
}

/**
 * BACKLINKS INTERNOS PARA DIFERENTES NICHOS
 * URLs reais do Blog Infinito Automático
 */
export const INTERNAL_LINKS: InternalLink[] = [
  // MARKETING DIGITAL
  {
    url: "https://bloginfinitoautomatico.com/como-criar-blog-automatico",
    anchor: "criação de blog automático",
    category: "marketing-digital",
    keywords: ["blog", "automação", "marketing", "conteúdo"]
  },
  {
    url: "https://bloginfinitoautomatico.com/estrategias-seo-2024",
    anchor: "estratégias de SEO para 2024",
    category: "marketing-digital", 
    keywords: ["seo", "marketing", "otimização", "google"]
  },
  {
    url: "https://bloginfinitoautomatico.com/content-marketing-avancado",
    anchor: "marketing de conteúdo avançado",
    category: "marketing-digital",
    keywords: ["content marketing", "estratégia", "conteúdo", "marketing"]
  },
  {
    url: "https://bloginfinitoautomatico.com/automacao-marketing-digital",
    anchor: "automação de marketing digital",
    category: "marketing-digital",
    keywords: ["automação", "marketing", "ferramentas", "produtividade"]
  },
  {
    url: "https://bloginfinitoautomatico.com/copywriting-conversao",
    anchor: "copywriting para conversão",
    category: "marketing-digital",
    keywords: ["copywriting", "conversão", "vendas", "texto"]
  },

  // EMPREENDEDORISMO
  {
    url: "https://bloginfinitoautomatico.com/empreendedorismo-digital",
    anchor: "empreendedorismo digital",
    category: "empreendedorismo",
    keywords: ["empreendedorismo", "negócios", "digital", "startup"]
  },
  {
    url: "https://bloginfinitoautomatico.com/business-model-canvas",
    anchor: "Business Model Canvas",
    category: "empreendedorismo",
    keywords: ["business model", "modelo de negócio", "estratégia", "planejamento"]
  },
  {
    url: "https://bloginfinitoautomatico.com/validacao-ideias-negocio",
    anchor: "validação de ideias de negócio",
    category: "empreendedorismo",
    keywords: ["validação", "ideias", "negócio", "mercado"]
  },
  {
    url: "https://bloginfinitoautomatico.com/monetizacao-blog",
    anchor: "monetização de blog",
    category: "empreendedorismo",
    keywords: ["monetização", "blog", "renda", "receita"]
  },

  // TECNOLOGIA
  {
    url: "https://bloginfinitoautomatico.com/inteligencia-artificial-content",
    anchor: "inteligência artificial para criação de conteúdo",
    category: "tecnologia",
    keywords: ["ia", "inteligência artificial", "conteúdo", "automação"]
  },
  {
    url: "https://bloginfinitoautomatico.com/ferramentas-ia-2024",
    anchor: "ferramentas de IA para 2024",
    category: "tecnologia",
    keywords: ["ferramentas", "ia", "tecnologia", "produtividade"]
  },
  {
    url: "https://bloginfinitoautomatico.com/chatgpt-marketing",
    anchor: "ChatGPT para marketing",
    category: "tecnologia",
    keywords: ["chatgpt", "marketing", "ia", "automação"]
  },
  {
    url: "https://bloginfinitoautomatico.com/automacao-wordpress",
    anchor: "automação do WordPress",
    category: "tecnologia",
    keywords: ["wordpress", "automação", "blog", "cms"]
  },

  // PRODUTIVIDADE
  {
    url: "https://bloginfinitoautomatico.com/gestao-tempo-empreendedores",
    anchor: "gestão de tempo para empreendedores",
    category: "produtividade",
    keywords: ["gestão", "tempo", "produtividade", "empreendedores"]
  },
  {
    url: "https://bloginfinitoautomatico.com/workflows-automatizados",
    anchor: "workflows automatizados",
    category: "produtividade",
    keywords: ["workflow", "automação", "processos", "eficiência"]
  },
  {
    url: "https://bloginfinitoautomatico.com/ferramentas-produtividade",
    anchor: "ferramentas de produtividade",
    category: "produtividade",
    keywords: ["ferramentas", "produtividade", "gestão", "organização"]
  },

  // VENDAS
  {
    url: "https://bloginfinitoautomatico.com/funil-vendas-digital",
    anchor: "funil de vendas digital",
    category: "vendas",
    keywords: ["funil", "vendas", "conversão", "marketing"]
  },
  {
    url: "https://bloginfinitoautomatico.com/email-marketing-avancado",
    anchor: "email marketing avançado",
    category: "vendas",
    keywords: ["email", "marketing", "vendas", "automação"]
  },
  {
    url: "https://bloginfinitoautomatico.com/crm-pequenas-empresas",
    anchor: "CRM para pequenas empresas",
    category: "vendas",
    keywords: ["crm", "vendas", "gestão", "clientes"]
  },

  // EDUCAÇÃO/CURSOS
  {
    url: "https://bloginfinitoautomatico.com/curso-blog-automatico",
    anchor: "curso de blog automático",
    category: "educacao",
    keywords: ["curso", "blog", "automático", "educação"]
  },
  {
    url: "https://bloginfinitoautomatico.com/aprenda-seo-completo",
    anchor: "aprenda SEO completo",
    category: "educacao",
    keywords: ["seo", "curso", "otimização", "google"]
  },
  {
    url: "https://bloginfinitoautomatico.com/marketing-digital-iniciantes",
    anchor: "marketing digital para iniciantes",
    category: "educacao",
    keywords: ["marketing", "iniciantes", "básico", "tutorial"]
  }
];

/**
 * FONTES AUTORITATIVAS REAIS
 * Para substituir dados fake por referências legítimas
 */
export const AUTHORITATIVE_SOURCES = {
  marketing: [
    "https://neilpatel.com",
    "https://blog.hubspot.com", 
    "https://contentmarketinginstitute.com",
    "https://blog.semrush.com",
    "https://moz.com/blog",
    "https://www.searchenginejournal.com"
  ],
  business: [
    "https://hbr.org",
    "https://www.mckinsey.com",
    "https://www.bcg.com",
    "https://www.pwc.com/insights",
    "https://www.statista.com",
    "https://www.forrester.com"
  ],
  technology: [
    "https://techcrunch.com",
    "https://venturebeat.com",
    "https://www.wired.com",
    "https://arstechnica.com",
    "https://www.technologyreview.com"
  ],
  research: [
    "https://www.statista.com",
    "https://www.pewresearch.org",
    "https://www.nielsen.com",
    "https://www.gartner.com",
    "https://www.idc.com"
  ]
};

/**
 * FUNÇÃO PARA SELECIONAR BACKLINKS RELEVANTES
 */
export function selectRelevantInternalLinks(
  nicho: string, 
  palavrasChave: string[], 
  quantidade: number = 10
): InternalLink[] {
  const palavrasLowerCase = palavrasChave.map(kw => kw.toLowerCase());
  
  // Filtrar por categoria primeiro
  let relevantLinks = INTERNAL_LINKS.filter(link => 
    link.category.includes(nicho.toLowerCase()) ||
    link.keywords.some(keyword => 
      palavrasLowerCase.some(userKw => 
        keyword.toLowerCase().includes(userKw) || 
        userKw.includes(keyword.toLowerCase())
      )
    )
  );
  
  // Se não encontrar o suficiente, buscar por palavra-chave
  if (relevantLinks.length < quantidade) {
    const additionalLinks = INTERNAL_LINKS.filter(link =>
      !relevantLinks.includes(link) &&
      (palavrasLowerCase.some(userKw =>
        link.anchor.toLowerCase().includes(userKw) ||
        link.keywords.some(keyword => 
          keyword.toLowerCase().includes(userKw)
        )
      ))
    );
    relevantLinks = [...relevantLinks, ...additionalLinks];
  }
  
  // Se ainda não temos o suficiente, adicionar links genéricos úteis
  if (relevantLinks.length < quantidade) {
    const remainingLinks = INTERNAL_LINKS.filter(link => 
      !relevantLinks.includes(link)
    );
    relevantLinks = [...relevantLinks, ...remainingLinks];
  }
  
  return relevantLinks.slice(0, quantidade);
}

/**
 * FUNÇÃO PARA GERAR HTML DE BACKLINK
 */
export function generateInternalLinkHTML(link: InternalLink): string {
  return `<a href="${link.url}" target="_blank" rel="noopener">${link.anchor}</a>`;
}

/**
 * DADOS ESTATÍSTICOS REAIS POR CATEGORIA
 * Para substituir números fake por dados fundamentados
 */
export const REAL_STATISTICS = {
  marketing: {
    emailMarketing: "Empresas que usam automação de email marketing veem um aumento médio de 451% em leads qualificados (fonte: Annuitas Group)",
    contentMarketing: "O marketing de conteúdo gera 3x mais leads que marketing tradicional e custa 62% menos (fonte: Content Marketing Institute)",
    seo: "68% de todas as experiências online começam com um mecanismo de busca (fonte: BrightEdge Research)",
    socialMedia: "54% dos profissionais de marketing dizem que o social media aumentou o tráfego do site (fonte: HubSpot State of Marketing 2024)"
  },
  ecommerce: {
    growth: "O e-commerce global deve crescer 10.4% em 2024, atingindo US$ 6.2 trilhões (fonte: Statista Digital Market Outlook)",
    mobile: "72.9% das vendas de e-commerce virão de dispositivos móveis até 2024 (fonte: Statista)",
    abandonment: "A taxa média de abandono de carrinho é de 69.99% globalmente (fonte: Baymard Institute)"
  },
  technology: {
    ai: "85% das empresas planejam investir em IA até 2025 (fonte: PwC AI and Workforce Evolution Report)",
    automation: "Automação pode aumentar a produtividade em até 40% (fonte: McKinsey Global Institute)",
    cloud: "94% das empresas já usam serviços de nuvem (fonte: Flexera State of Cloud Report 2024)"
  }
};

/**
 * FUNÇÃO PARA OBTER ESTATÍSTICA REAL
 */
export function getRealStatistic(category: string, subcategory?: string): string {
  const stats = REAL_STATISTICS[category as keyof typeof REAL_STATISTICS];
  if (!stats) return "";
  
  if (subcategory && stats[subcategory as keyof typeof stats]) {
    return stats[subcategory as keyof typeof stats] as string;
  }
  
  // Retorna estatística aleatória da categoria
  const keys = Object.keys(stats);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return stats[randomKey as keyof typeof stats] as string;
}
