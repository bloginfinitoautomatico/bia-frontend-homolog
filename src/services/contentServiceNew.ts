// ContentService - Sistema unificado final
import { toast } from 'sonner';

// Helper function para verificar se string está vazia
function isEmpty(str: string | undefined): boolean {
  return !str || str.trim().length === 0;
}

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
  async generateIdeas(params: IdeaGenerationParams) {
    try {
      console.log('🚀 Gerando ideias com sistema unificado...');
      console.log('📊 Parâmetros recebidos:', params);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Chamar o endpoint de prompt primeiro
      const promptResponse = await fetch(`${apiUrl}/api/prompts/ideias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nicho: params.nicho,
          palavras_chave_texto: params.palavrasChave,
          quantidade: params.quantidade,
          idioma: params.idioma,
          conceito: params.contexto || '',
          empresa: params.empresa || ''
        }),
      });

      if (!promptResponse.ok) {
        console.error('❌ Erro ao buscar prompt:', promptResponse.status);
        return { 
          success: false, 
          error: 'Erro ao conectar com o sistema de prompts',
          ideas: []
        };
      }

      const promptData = await promptResponse.json();
      const prompt = promptData.prompt;
      
      if (!prompt) {
        console.error('❌ Prompt vazio recebido');
        return { 
          success: false, 
          error: 'Prompt não encontrado',
          ideas: []
        };
      }

      console.log('📝 Prompt obtido, buscando chave API...');

      // Buscar chave API
      const keyResponse = await fetch(`${apiUrl}/api/openai/get-key`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!keyResponse.ok) {
        console.error('❌ Erro ao buscar chave API');
        return { 
          success: false, 
          error: 'Sistema de IA temporariamente indisponível',
          ideas: []
        };
      }

      const keyData = await keyResponse.json();
      const apiKey = keyData.key;

      if (!apiKey) {
        console.error('❌ Chave API não encontrada');
        return { 
          success: false, 
          error: 'Sistema de IA não configurado',
          ideas: []
        };
      }

      console.log('🔑 Chave API obtida, chamando OpenAI...');

      // Chamar OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Você é um assistente especialista em SEO e criação de conteúdo.' 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!openaiResponse.ok) {
        console.error('❌ Erro na resposta da OpenAI:', openaiResponse.status);
        return { 
          success: false, 
          error: 'Erro na geração de ideias pela IA',
          ideas: []
        };
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0].message.content;

      console.log('📄 Conteúdo recebido da OpenAI:', content);

      // Processar e extrair as ideias
      const lines = content.split('\n');
      const ideas: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Regex flexível para capturar diferentes formatos
        const isNumbered = /^[\s\-•]*\d+[\.\)\:]/.test(trimmedLine);
        const isSubstantialContent = trimmedLine.length > 10 && 
                                   !trimmedLine.includes('ideias') && 
                                   !trimmedLine.includes('títulos') &&
                                   !trimmedLine.toLowerCase().includes('aqui estão') &&
                                   !trimmedLine.toLowerCase().includes('seguir estão');
        
        if (!isEmpty(trimmedLine) && (isNumbered || (ideas.length < params.quantidade && isSubstantialContent))) {
          // Limpar a numeração e prefixos da linha
          let cleanTitle = trimmedLine.replace(/^[\s\-•]*\d+[\.\)\:]\s*/, '');
          
          if (cleanTitle === trimmedLine && isSubstantialContent) {
            cleanTitle = trimmedLine;
          }
          
          if (!isEmpty(cleanTitle) && cleanTitle.length > 5) {
            ideas.push(cleanTitle);
            console.log('✅ Ideia extraída:', cleanTitle);
          }
        }
      }

      // Fallback se não encontrou ideias
      if (ideas.length === 0) {
        console.warn('⚠️ Tentando fallback...');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!isEmpty(trimmedLine) && 
              trimmedLine.length > 10 && 
              trimmedLine.length < 200 &&
              !trimmedLine.toLowerCase().includes('aqui estão') &&
              !trimmedLine.toLowerCase().includes('seguir estão') &&
              !trimmedLine.toLowerCase().includes('títulos') &&
              !trimmedLine.toLowerCase().includes('ideias') &&
              !trimmedLine.includes('```') &&
              ideas.length < params.quantidade) {
            
            ideas.push(trimmedLine);
            console.log('🔄 Fallback - Ideia adicionada:', trimmedLine);
          }
        }
      }

      const finalIdeas = ideas.slice(0, params.quantidade);

      console.log('🎯 Resultado final:', {
        ideasFound: finalIdeas.length,
        requested: params.quantidade,
        ideas: finalIdeas
      });

      if (finalIdeas.length === 0) {
        console.warn('⚠️ Nenhuma ideia foi extraída');
        console.warn('📄 Conteúdo completo:', content);
        return { 
          success: false, 
          error: 'Não foi possível extrair ideias válidas',
          ideas: []
        };
      }

      console.log('✅ Ideias geradas com sucesso');
      return { 
        success: true, 
        ideas: finalIdeas,
        message: `${finalIdeas.length} ideias geradas com sucesso`
      };

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
