// Versão simplificada do ContentService para teste
export class ContentService {
  private readonly BASE_URL = 'https://api.openai.com/v1';

  async generateIdeas(params: any) {
    return { success: true, ideas: [] };
  }

  async generateContent(params: any) {
    return { success: true, content: 'teste' };
  }

  async generateImage(params: any) {
    return { success: true, image_url: '' };
  }

  async testConnection() {
    return { success: true, message: 'OK' };
  }
}

const contentService = new ContentService();
export { contentService };
export default contentService;
