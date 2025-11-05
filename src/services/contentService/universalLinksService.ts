/**
 * SISTEMA UNIVERSAL DE BACKLINKS - V7
 * Adaptável para QUALQUER nicho e segmento
 * Funciona para milhares de usuários com nichos diversos
 */

export interface UniversalLink {
  url: string;
  anchor: string;
  category: string;
  keywords: string[];
  relevanceScore?: number;
}

export interface NicheProfile {
  name: string;
  relatedTerms: string[];
  authorityDomains: string[];
  commonTopics: string[];
}

/**
 * SISTEMA INTELIGENTE DE GERAÇÃO DE BACKLINKS UNIVERSAIS
 * Gera links contextuais para qualquer nicho automaticamente
 */
export class UniversalBacklinkSystem {
  
  /**
   * AUTORIDADES UNIVERSAIS POR CATEGORIA
   * Domínios respeitados em qualquer segmento
   */
  private static UNIVERSAL_AUTHORITIES = {
    research: [
      "statista.com", "pewresearch.org", "mckinsey.com", "bcg.com", 
      "deloitte.com", "pwc.com", "forrester.com", "gartner.com"
    ],
    business: [
      "hbr.org", "forbes.com", "entrepreneur.com", "inc.com",
      "fastcompany.com", "businessinsider.com", "bloomberg.com"
    ],
    technology: [
      "techcrunch.com", "wired.com", "venturebeat.com", "arstechnica.com",
      "theverge.com", "engadget.com", "mashable.com"
    ],
    education: [
      "coursera.org", "edx.org", "khanacademy.org", "udemy.com",
      "lynda.com", "skillshare.com", "masterclass.com"
    ],
    government: [
      "gov", "edu", "org", "who.int", "worldbank.org", "un.org"
    ]
  };

  /**
   * TEMPLATES DE BACKLINKS UNIVERSAIS
   * Funciona para qualquer nicho
   */
  private static UNIVERSAL_LINK_TEMPLATES = [
    {
      pattern: "estudos sobre {nicho}",
      url: "https://www.statista.com/search/?q={nicho_encoded}",
      category: "research"
    },
    {
      pattern: "tendências em {nicho}",
      url: "https://trends.google.com/trends/explore?q={nicho_encoded}",
      category: "trends"
    },
    {
      pattern: "melhores práticas de {nicho}",
      url: "https://www.hbr.org/search?term={nicho_encoded}",
      category: "business"
    },
    {
      pattern: "ferramentas para {nicho}",
      url: "https://www.capterra.com/search/?query={nicho_encoded}",
      category: "tools"
    },
    {
      pattern: "curso de {nicho}",
      url: "https://www.coursera.org/search?query={nicho_encoded}",
      category: "education"
    },
    {
      pattern: "guia completo de {nicho}",
      url: "https://blog.hubspot.com/search?term={nicho_encoded}",
      category: "guides"
    },
    {
      pattern: "como começar em {nicho}",
      url: "https://www.entrepreneur.com/search/{nicho_encoded}",
      category: "beginner"
    },
    {
      pattern: "especialistas em {nicho}",
      url: "https://www.linkedin.com/search/results/people/?keywords={nicho_encoded}",
      category: "experts"
    }
  ];

  /**
   * GERADOR DE ESTATÍSTICAS UNIVERSAIS
   * Cria estatísticas relevantes para qualquer nicho
   */
  private static UNIVERSAL_STATISTICS_TEMPLATES = [
    "O mercado de {nicho} tem crescido consistentemente nos últimos anos (fonte: análises de mercado)",
    "Profissionais especializados em {nicho} são cada vez mais demandados",
    "A digitalização tem transformado o setor de {nicho} significativamente",
    "Empresas que investem em {nicho} relatam melhorias na eficiência operacional",
    "O interesse por {nicho} aumentou substancialmente na última década",
    "Especialistas preveem crescimento contínuo no segmento de {nicho}",
    "A automação está revolucionando processos tradicionais em {nicho}",
    "Consumidores demonstram crescente interesse por soluções de {nicho}"
  ];

  /**
   * GERA BACKLINKS CONTEXTUAIS PARA QUALQUER NICHO
   */
  static generateContextualBacklinks(
    nicho: string, 
    palavrasChave: string[], 
    quantidade: number = 15
  ): UniversalLink[] {
    const backlinks: UniversalLink[] = [];
    const nichoLower = nicho.toLowerCase();
    const nichoEncoded = encodeURIComponent(nichoLower);
    
    // Validar e normalizar palavrasChave
    const validPalavrasChave = Array.isArray(palavrasChave) 
      ? palavrasChave.filter(p => p && typeof p === 'string')
      : [];

    // 1. Gerar links baseados em templates universais
    const templates = this.UNIVERSAL_LINK_TEMPLATES.slice(0, quantidade);
    
    templates.forEach(template => {
      const anchor = template.pattern.replace('{nicho}', nichoLower);
      const url = template.url.replace('{nicho_encoded}', nichoEncoded);
      
      backlinks.push({
        url,
        anchor,
        category: template.category,
        keywords: [nichoLower, ...validPalavrasChave],
        relevanceScore: this.calculateRelevance(nichoLower, validPalavrasChave, template.category)
      });
    });

    // 2. Se precisar de mais links, gerar variações
    while (backlinks.length < quantidade) {
      const randomTemplate = this.UNIVERSAL_LINK_TEMPLATES[
        Math.floor(Math.random() * this.UNIVERSAL_LINK_TEMPLATES.length)
      ];
      
      const variations = [
        `estratégias de ${nichoLower}`,
        `técnicas avançadas de ${nichoLower}`,
        `metodologias em ${nichoLower}`,
        `inovações em ${nichoLower}`,
        `futuro do ${nichoLower}`,
        `certificação em ${nichoLower}`,
        `comunidade de ${nichoLower}`,
        `pesquisa sobre ${nichoLower}`
      ];

      const randomVariation = variations[Math.floor(Math.random() * variations.length)];
      const url = randomTemplate.url.replace('{nicho_encoded}', nichoEncoded);

      backlinks.push({
        url,
        anchor: randomVariation,
        category: randomTemplate.category,
        keywords: [nichoLower, ...validPalavrasChave],
        relevanceScore: Math.random() * 0.3 + 0.7 // Score entre 0.7-1.0
      });
    }

    // 3. Ordenar por relevância e retornar quantidade solicitada
    return backlinks
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, quantidade);
  }

  /**
   * CALCULA RELEVÂNCIA DO LINK PARA O NICHO
   */
  private static calculateRelevance(
    nicho: string, 
    palavrasChave: string[], 
    category: string
  ): number {
    let score = 0.5; // Base score

    // Boost para categorias mais relevantes
    const categoryBoosts = {
      'research': 0.3,
      'business': 0.25,
      'tools': 0.2,
      'education': 0.15,
      'guides': 0.2,
      'trends': 0.15
    };

    score += categoryBoosts[category as keyof typeof categoryBoosts] || 0.1;

    // Validar se palavrasChave é um array válido
    if (Array.isArray(palavrasChave) && palavrasChave.length > 0) {
      // Boost se palavras-chave coincidem
      palavrasChave.forEach(keyword => {
        if (keyword && typeof keyword === 'string') {
          if (nicho.toLowerCase().includes(keyword.toLowerCase()) || 
              keyword.toLowerCase().includes(nicho.toLowerCase())) {
            score += 0.1;
          }
        }
      });
    }

    return Math.min(score, 1.0);
  }

  /**
   * GERA ESTATÍSTICAS UNIVERSAIS PARA QUALQUER NICHO
   */
  static generateUniversalStatistics(nicho: string): string[] {
    return this.UNIVERSAL_STATISTICS_TEMPLATES.map(template => 
      template.replace(/{nicho}/g, nicho.toLowerCase())
    );
  }

  /**
   * GERA FONTES AUTORITATIVAS PARA QUALQUER NICHO
   */
  static getAuthoritativeSources(nicho: string): string[] {
    const allSources = Object.values(this.UNIVERSAL_AUTHORITIES).flat();
    
    // Priorizar fontes mais relevantes para o nicho
    const nichoLower = nicho.toLowerCase();
    const prioritizedSources: string[] = [];

    // Lógica de priorização baseada no nicho
    if (nichoLower.includes('tech') || nichoLower.includes('digital') || 
        nichoLower.includes('software') || nichoLower.includes('ia')) {
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.technology);
    }
    
    if (nichoLower.includes('business') || nichoLower.includes('empresar') || 
        nichoLower.includes('gestão') || nichoLower.includes('admin')) {
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.business);
    }

    if (nichoLower.includes('pesquisa') || nichoLower.includes('estudo') || 
        nichoLower.includes('dados') || nichoLower.includes('análise')) {
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.research);
    }

    if (nichoLower.includes('curso') || nichoLower.includes('educação') || 
        nichoLower.includes('ensino') || nichoLower.includes('aprender')) {
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.education);
    }

    // Adicionar sources universais se lista ainda pequena
    if (prioritizedSources.length < 5) {
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.research);
      prioritizedSources.push(...this.UNIVERSAL_AUTHORITIES.business);
    }

    // Remover duplicatas e retornar top 10
    return [...new Set(prioritizedSources)].slice(0, 10);
  }

  /**
   * GERA ESTRUTURA DE TABELA UNIVERSAL
   */
  static generateUniversalTableStructures(nicho: string): Array<{
    title: string;
    columns: string[];
    description: string;
  }> {
    const nichoCapitalized = nicho.charAt(0).toUpperCase() + nicho.slice(1);
    
    return [
      {
        title: `Comparação de Abordagens em ${nichoCapitalized}`,
        columns: ['Abordagem', 'Vantagens', 'Desvantagens', 'Adequado Para'],
        description: 'Análise comparativa das principais metodologias'
      },
      {
        title: `Ferramentas Essenciais para ${nichoCapitalized}`,
        columns: ['Ferramenta', 'Categoria', 'Principais Recursos', 'Público-Alvo'],
        description: 'Seleção de ferramentas mais utilizadas no setor'
      },
      {
        title: `Métricas de Performance em ${nichoCapitalized}`,
        columns: ['Métrica', 'Como Medir', 'Frequência', 'Meta Sugerida'],
        description: 'Indicadores-chave para acompanhamento de resultados'
      }
    ];
  }

  /**
   * GERA CHECKLISTS UNIVERSAIS
   */
  static generateUniversalChecklists(nicho: string): Array<{
    title: string;
    items: string[];
  }> {
    const nichoCapitalized = nicho.charAt(0).toUpperCase() + nicho.slice(1);
    
    return [
      {
        title: `Preparação Inicial para ${nichoCapitalized}`,
        items: [
          `Definir objetivos claros para ${nicho}`,
          `Analisar o mercado e concorrência`,
          `Estabelecer orçamento e recursos necessários`,
          `Identificar público-alvo específico`,
          `Criar cronograma de implementação`
        ]
      },
      {
        title: `Durante a Implementação em ${nichoCapitalized}`,
        items: [
          `Monitorar progresso regularmente`,
          `Ajustar estratégia conforme necessário`,
          `Documentar lições aprendidas`,
          `Manter comunicação com stakeholders`,
          `Avaliar qualidade dos resultados`
        ]
      },
      {
        title: `Verificação Final em ${nichoCapitalized}`,
        items: [
          `Revisar todos os objetivos estabelecidos`,
          `Analisar métricas de performance`,
          `Coletar feedback dos usuários`,
          `Identificar oportunidades de melhoria`,
          `Planejar próximos passos e expansão`
        ]
      }
    ];
  }
}

/**
 * FUNÇÃO PRINCIPAL PARA COMPATIBILIDADE
 * Substitui o sistema anterior mantendo a interface
 */
export function selectRelevantInternalLinks(
  nicho: string, 
  palavrasChave: string[], 
  quantidade: number = 15
): UniversalLink[] {
  return UniversalBacklinkSystem.generateContextualBacklinks(nicho, palavrasChave, quantidade);
}

/**
 * GERAÇÃO DE HTML PARA BACKLINKS UNIVERSAIS
 */
export function generateInternalLinkHTML(link: UniversalLink): string {
  return `<a href="${link.url}" target="_blank" rel="noopener">${link.anchor}</a>`;
}

/**
 * OBTÉM ESTATÍSTICA UNIVERSAL PARA QUALQUER NICHO
 */
export function getRealStatistic(nicho: string): string {
  const stats = UniversalBacklinkSystem.generateUniversalStatistics(nicho);
  return stats[Math.floor(Math.random() * stats.length)];
}

/**
 * FONTES AUTORITATIVAS UNIVERSAIS
 */
export const AUTHORITATIVE_SOURCES = {
  universal: UniversalBacklinkSystem.getAuthoritativeSources('universal'),
  marketing: UniversalBacklinkSystem.getAuthoritativeSources('marketing'),
  business: UniversalBacklinkSystem.getAuthoritativeSources('business'),
  technology: UniversalBacklinkSystem.getAuthoritativeSources('technology'),
  education: UniversalBacklinkSystem.getAuthoritativeSources('education')
};
