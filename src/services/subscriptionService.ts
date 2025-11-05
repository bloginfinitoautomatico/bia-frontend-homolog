import { getApiUrl } from '../config/api';

// Usar configuração dinâmica baseada no ambiente
// const getApiUrl = () => 'http://localhost:8000/api';

interface CustomerData {
  name: string;
  email: string;
  cpf_cnpj: string;
  phone?: string;
  postal_code?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

interface CreateSubscriptionRequest {
  plan_id: string | number;
  billing_type: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  customer_data: CustomerData;
  credit_card?: CreditCardData;
}

interface CreatePaymentRequest {
  plan_id: string | number;
  billing_type: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  customer_data: CustomerData;
  credit_card?: CreditCardData;
}

class SubscriptionService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Método helper para fazer requisições com retry
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} para ${url}`);
        
        // Criar AbortController compatível para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Limpar timeout se requisição foi bem-sucedida
        
        // Se a resposta for 502, 503 ou 504, tentar novamente
        if (attempt < maxRetries && (response.status === 502 || response.status === 503 || response.status === 504)) {
          console.warn(`⚠️ Status ${response.status} na tentativa ${attempt}, tentando novamente em ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Delay progressivo
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Erro na tentativa ${attempt}:`, error);
        
        // Se não for a última tentativa e for um erro de rede, tentar novamente
        if (attempt < maxRetries && (
          error instanceof Error && (
            error.name === 'TimeoutError' || 
            error.name === 'NetworkError' ||
            error.message.includes('fetch')
          )
        )) {
          console.warn(`⚠️ Tentando novamente em ${attempt * 2} segundos...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }

  async createSubscription(data: CreateSubscriptionRequest) {
    try {
      console.log('📤 Enviando dados para criação de assinatura:', {
        plan_id: data.plan_id,
        billing_type: data.billing_type,
        customer_name: data.customer_data.name,
        has_credit_card: !!data.credit_card,
        api_url: getApiUrl()
      });

      const response = await this.fetchWithRetry(`${getApiUrl()}/subscriptions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      // Verificar se houve erro de rede ou timeout
      if (!response.ok) {
        let errorMessage = 'Erro ao criar assinatura';
        
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorResult.error || errorMessage;
          
          console.error('❌ Erro na resposta da API:', {
            status: response.status,
            statusText: response.statusText,
            error: errorResult
          });
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta de erro:', parseError);
          
          // Para erro 500, dar uma mensagem mais específica
          if (response.status === 500) {
            errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
          } else if (response.status === 502) {
            errorMessage = 'Serviço temporariamente indisponível. Aguarde alguns segundos e tente novamente.';
          } else if (response.status === 504) {
            errorMessage = 'Timeout do servidor. Tente novamente em alguns instantes.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log('✅ Assinatura criada com sucesso:', {
        subscription_id: result.subscription?.id,
        payment_info: !!result.payment_info
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Erro ao criar assinatura:', error);
      
      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro ao criar assinatura. Tente novamente.';
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorMessage = 'A requisição está demorando mais que o esperado. Verifique sua conexão e tente novamente.';
        } else if (error.name === 'NetworkError') {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async createPayment(data: CreatePaymentRequest) {
    try {
      console.log('📤 Enviando dados para criação de pagamento:', {
        plan_id: data.plan_id,
        billing_type: data.billing_type,
        customer_name: data.customer_data.name
      });

      const response = await this.fetchWithRetry(`${getApiUrl()}/subscriptions/payment`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao criar pagamento';
        
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorResult.error || errorMessage;
        } catch (parseError) {
          if (response.status === 500) {
            errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
          } else if (response.status === 502) {
            errorMessage = 'Serviço temporariamente indisponível. Aguarde alguns segundos e tente novamente.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log('✅ Pagamento criado com sucesso:', {
        payment_id: result.payment?.id,
        payment_info: !!result.payment_info
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error);
      
      let errorMessage = 'Erro ao criar pagamento. Tente novamente.';
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorMessage = 'A requisição está demorando mais que o esperado. Verifique sua conexão e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getSubscriptions() {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao buscar assinaturas');
      }

      return {
        success: true,
        data: result.subscriptions
      };
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao cancelar assinatura');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async getPlans() {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions/plans`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao buscar planos');
      }

      return {
        success: true,
        data: result.plans
      };
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Criar pagamento com cartão de crédito
  async createCreditCardPayment(data: {
    plan_id: string | number;
    customer_data: CustomerData;
    credit_card: CreditCardData;
    is_subscription?: boolean;
  }) {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions/credit-card`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao processar pagamento');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Erro ao processar pagamento com cartão:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Obter cartões de teste
  async getTestCreditCards() {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions/test-cards`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao buscar cartões de teste');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Erro ao buscar cartões de teste:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Obter informações do ambiente
  async getEnvironmentInfo() {
    try {
      const response = await fetch(`${getApiUrl()}/subscriptions/environment`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao buscar informações do ambiente');
      }

      return {
        success: true,
        data: result.environment
      };
    } catch (error) {
      console.error('Erro ao buscar informações do ambiente:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();
export type { CustomerData, CreateSubscriptionRequest, CreatePaymentRequest };
