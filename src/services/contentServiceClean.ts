// ContentService sem dependências externas
import { toast } from 'sonner';

interface CTAData {
  titulo?: string;
  descricao?: string;
  botao?: string;
  link?: string;
  imagem?: string;
  posicao?: 'inicio' | 'meio' | 'final';
}

interface IdeaGenerationParams {
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

interface ContentGenerationParams {
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

export class ContentService {
  private readonly BASE_URL = 'https://api.openai.com/v1';

  // Obter chave API através do backend Laravel
  private async getApiKey(): Promise<string | null> {
    try {
      console.log('🔑 Buscando chave API OpenAI...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/openai/get-key`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chave API obtida com sucesso');
        return data.api_key;
      } else {
        console.error('❌ Erro ao obter chave API:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar chave API:', error);
      return null;
    }
  }

  async generateIdeas(params: IdeaGenerationParams) {
    try {
      console.log('🚀 Gerando ideias com sistema unificado...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/prompts/ideias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ideias geradas com sucesso');
        return { 
          success: true, 
          ideas: data.ideas || [],
          message: data.message 
        };
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na geração de ideias:', errorData);
        return { 
          success: false, 
          error: errorData.error || 'Erro na geração de ideias',
          ideas: []
        };
      }
    } catch (error) {
      console.error('❌ Erro na geração de ideias:', error);
      return { 
        success: false, 
        error: 'Erro na comunicação com o servidor',
        ideas: []
      };
    }
  }

  async generateContent(params: ContentGenerationParams) {
    try {
      console.log('🚀 Gerando conteúdo com sistema unificado...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/prompts/conteudo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conteúdo gerado com sucesso');
        return { 
          success: true, 
          content: data.content || '',
          message: data.message 
        };
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na geração de conteúdo:', errorData);
        return { 
          success: false, 
          error: errorData.error || 'Erro na geração de conteúdo'
        };
      }
    } catch (error) {
      console.error('❌ Erro na geração de conteúdo:', error);
      return { 
        success: false, 
        error: 'Erro na comunicação com o servidor'
      };
    }
  }

  async generateImage(params: { tema: string; nicho: string }) {
    try {
      console.log('🚀 Gerando imagem com sistema unificado...');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/prompts/imagem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Imagem gerada com sucesso');
        return { 
          success: true, 
          image_url: data.image_url || '',
          message: data.message 
        };
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na geração de imagem:', errorData);
        return { 
          success: false, 
          error: errorData.error || 'Erro na geração de imagem'
        };
      }
    } catch (error) {
      console.error('❌ Erro na geração de imagem:', error);
      return { 
        success: false, 
        error: 'Erro na comunicação com o servidor'
      };
    }
  }

  async testConnection() {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Conexão com API funcionando' };
      } else {
        return { 
          success: false, 
          message: 'Erro na conexão',
          error: `HTTP ${response.status}`,
          details: 'Falha ao conectar com a API'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Erro de conexão',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: 'Falha na comunicação com o servidor'
      };
    }
  }
}

// Criar e exportar instância
const contentService = new ContentService();
export { contentService };
export default contentService;
