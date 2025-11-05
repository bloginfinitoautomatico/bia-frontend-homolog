export interface CTAData {
  titulo?: string;
  descricao?: string;
  botao?: string;
  link?: string;
  imagem?: string;
  posicao?: 'inicio' | 'meio' | 'final';
}

export interface IdeaGenerationParams {
  nicho: string;
  palavrasChave: string;
  quantidade: number;
  idioma: string;
  contexto?: string;
  empresa?: string;
  siteId: number;
  autor?: string;
  categorias?: string[];
  tags?: string[];
  cta?: CTAData;
}

export interface ContentGenerationParams {
  tema: string;
  nicho: string;
  palavrasChave: string;
  idioma: string;
  contexto?: string;
  empresa?: string;
  siteId: number;
  ideaId: number;
  cta?: CTAData;
}