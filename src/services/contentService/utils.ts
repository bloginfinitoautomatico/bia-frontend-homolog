import type { CTAData } from './types';

// Helper function para verificar se string está vazia
export function isEmpty(str: string | undefined): boolean {
  return !str || str.trim().length === 0;
}

// Gerar HTML do CTA baseado no código PHP oficial
export function gerarHtmlCTA(cta: CTAData): string {
  if (!cta.titulo && !cta.descricao && !cta.botao && !cta.link && !cta.imagem) {
    return '';
  }

  let html = "\n\n";
  html += '<div class="wp-block-group aligncenter" style="margin: 30px 0; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto;">';

  // Imagem (com ou sem link)
  if (cta.imagem) {
    html += '<div style="margin-bottom: 15px; text-align: center;">';
    if (cta.link) {
      html += `<a href="${cta.link}" target="_blank" rel="noopener noreferrer">`;
      html += `<img src="${cta.imagem}" alt="${cta.titulo || 'CTA'}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;">`;
      html += '</a>';
    } else {
      html += `<img src="${cta.imagem}" alt="${cta.titulo || 'CTA'}" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;">`;
    }
    html += '</div>';
  }

  // Título
  if (cta.titulo) {
    html += `<h3 style="font-size: 22px; margin-bottom: 10px; text-align: center;">${cta.titulo}</h3>`;
  }

  // Descrição
  if (cta.descricao) {
    html += `<p style="font-size: 16px; color: #555; margin-bottom: 20px; text-align: center;">${cta.descricao}</p>`;
  }

  // Botão
  if (cta.botao && cta.link) {
    html += '<div class="wp-block-button aligncenter" style="text-align: center;">';
    html += `<a class="wp-block-button__link" href="${cta.link}" target="_blank" rel="noopener noreferrer" style="display: inline-block;">${cta.botao}</a>`;
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// Função para gerar mensagem de erro amigável para usuários finais
export function generateUserFriendlyError(originalError: string): string {
  // Para usuários finais, não mostrar detalhes técnicos sobre API keys
  if (originalError.includes('Chave API OpenAI não configurada') || 
      originalError.includes('painel administrativo') ||
      originalError.includes('inválida ou expirada')) {
    return 'O sistema de geração de conteúdo está temporariamente indisponível. Tente novamente em alguns minutos ou entre em contato com o suporte.';
  }
  
  if (originalError.includes('alta demanda')) {
    return 'Sistema com alta demanda no momento. Aguarde alguns segundos e tente novamente.';
  }
  
  if (originalError.includes('temporariamente indisponível')) {
    return 'Serviço de IA temporariamente indisponível. Tente novamente em alguns instantes.';
  }
  
  // Para outros erros, manter a mensagem original se for user-friendly
  return originalError;
}

// Notificar administradores sobre erro de API key
export function notifyApiKeyError(errorDetails: any): void {
  try {
    // Salvar erro para que administradores vejam
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'api_key_error',
      details: errorDetails,
      message: 'Chave API OpenAI inválida ou expirada'
    };

    // Salvar no localStorage para visualização no painel admin
    const existingErrors = JSON.parse(localStorage.getItem('bia-system-errors') || '[]');
    existingErrors.unshift(errorLog);
    
    // Manter apenas os últimos 10 erros
    if (existingErrors.length > 10) {
      existingErrors.splice(10);
    }
    
    localStorage.setItem('bia-system-errors', JSON.stringify(existingErrors));
    
    console.error('🚨 Erro de API key salvo para revisão administrativa');
  } catch (notificationError) {
    console.error('Erro ao notificar problema de API key:', notificationError);
  }
}