import { PLAN_MAPPINGS, type PlanMapping, type WooCommerceOrder } from '../utils/woocommerce-constants';

class WooCommerceService {
  private baseUrl = 'https://bloginfinitoautomatico.com.br/wp-json/wc/v3';
  private consumerKey = 'YOUR_CONSUMER_KEY_HERE'; // Configure in admin panel
  private consumerSecret = 'YOUR_CONSUMER_SECRET_HERE'; // Configure in admin panel

  // Configure WooCommerce credentials (for admin use)
  setCredentials(consumerKey: string, consumerSecret: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('woo-credentials', JSON.stringify({
        consumerKey,
        consumerSecret
      }));
    } catch (error) {
      console.error('Error saving WooCommerce credentials:', error);
    }
  }

  // Load saved credentials
  private loadCredentials() {
    try {
      const saved = localStorage.getItem('woo-credentials');
      if (saved) {
        const { consumerKey, consumerSecret } = JSON.parse(saved);
        if (consumerKey && consumerSecret) {
          this.consumerKey = consumerKey;
          this.consumerSecret = consumerSecret;
        }
      }
    } catch (error) {
      console.error('Error loading WooCommerce credentials:', error);
    }
  }

  // Check if credentials are configured
  hasValidCredentials(): boolean {
    return this.consumerKey !== 'YOUR_CONSUMER_KEY_HERE' && 
           this.consumerSecret !== 'YOUR_CONSUMER_SECRET_HERE';
  }

  constructor() {
    // Load saved credentials on initialization
    this.loadCredentials();
  }

  // Processar webhook do WooCommerce
  async processWebhook(orderData: WooCommerceOrder): Promise<boolean> {
    try {
      if (orderData.status !== 'completed') return false;

      const planData = this.getPlanByProductId(orderData.line_items[0]?.product_id);
      if (!planData) return false;

      return await this.activateUserPlan(orderData.customer_email, planData);
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return false;
    }
  }

  // Buscar plano pelo ID do produto
  private getPlanByProductId(productId: number): PlanMapping | null {
    return PLAN_MAPPINGS.find(plan => plan.product_id === productId) || null;
  }

  // Ativar plano para usuário
  private async activateUserPlan(customerEmail: string, planData: PlanMapping): Promise<boolean> {
    try {
      const users = this.getStoredUsers();
      const userIndex = users.findIndex(u => u.email === customerEmail);

      if (userIndex === -1) return false;

      users[userIndex] = {
        ...users[userIndex],
        plano: planData.plan_name,
        isActive: true,
        planActivatedAt: new Date().toISOString(),
        limits: {
          sites: planData.sites_limit,
          monthlyArticles: planData.monthly_articles,
          monthlyIdeas: planData.monthly_ideas
        }
      };

      localStorage.setItem('bia-users', JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Erro ao ativar plano:', error);
      return false;
    }
  }

  // Obter usuários salvos
  private getStoredUsers(): any[] {
    try {
      const users = localStorage.getItem('bia-users');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      return [];
    }
  }

  // Verificar status do plano de um usuário
  checkUserPlan(userEmail: string): any {
    const users = this.getStoredUsers();
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      return { plan: 'Free', isActive: false };
    }

    return {
      plan: user.plano || 'Free',
      isActive: user.isActive || false,
      limits: user.limits || { sites: 0, monthlyArticles: 10, monthlyIdeas: 5 },
      activatedAt: user.planActivatedAt
    };
  }

  // Simular compra (para testes)
  async simulatePurchase(customerEmail: string, productId: number): Promise<boolean> {
    const mockOrder: WooCommerceOrder = {
      id: Date.now(),
      customer_email: customerEmail,
      status: 'completed',
      total: '97.00',
      line_items: [{
        id: 1,
        product_id: productId,
        // Usar nome do plano derivado do mapping (remoção da marca antiga BIA)
        name: PLAN_MAPPINGS.find(p => p.product_id === productId)?.plan_name || 'Plano',
        quantity: 1,
        total: '97.00'
      }],
      date_created: new Date().toISOString(),
      date_paid: new Date().toISOString()
    };

    return this.processWebhook(mockOrder);
  }

  // Obter planos disponíveis
  getAvailablePlans(): PlanMapping[] {
    return PLAN_MAPPINGS;
  }

  // Buscar pedidos do WooCommerce (para admin)
  async getOrders(page: number = 1, per_page: number = 10): Promise<WooCommerceOrder[]> {
    try {
      // Se não tiver credenciais válidas, retornar dados mock
      if (!this.hasValidCredentials()) {
        console.log('WooCommerce credentials not configured, returning mock data');
        return this.getMockOrders();
      }

      // Em produção, faria uma requisição real para a API do WooCommerce
      const response = await fetch(`${this.baseUrl}/orders?page=${page}&per_page=${per_page}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar pedidos');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      // Retornar dados mock para demonstração
      return this.getMockOrders();
    }
  }

  // Dados mock para demonstração
  private getMockOrders(): WooCommerceOrder[] {
    return [
      {
        id: 1001,
        customer_email: 'cliente1@email.com',
        status: 'completed',
        total: '97.00',
        line_items: [{
          id: 1,
          product_id: 1873,
          name: '1 Site',
          quantity: 1,
          total: '97.00'
        }],
        date_created: '2025-01-15T10:30:00Z',
        date_paid: '2025-01-15T10:35:00Z'
      },
      {
        id: 1002,
        customer_email: 'cliente2@email.com',
        status: 'completed',
        total: '197.00',
        line_items: [{
          id: 2,
          product_id: 3379,
          name: '5 Sites',
          quantity: 1,
          total: '197.00'
        }],
        date_created: '2025-01-14T15:20:00Z',
        date_paid: '2025-01-14T15:25:00Z'
      }
    ];
  }
}

export const woocommerceService = new WooCommerceService();
export type { WooCommerceOrder, PlanMapping };