// Função para construir URLs da API
function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Garantir compatibilidade com o padrão usado pelo app: backend base + /api
  const raw = (((import.meta as any).env && (import.meta as any).env.VITE_BACKEND_URL) || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const apiBase = raw.endsWith('/api') ? raw : `${raw}/api`;
  return `${apiBase}${cleanEndpoint}`;
}

// Função para obter headers autenticados
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export interface SchedulingRequest {
  site_id: number;
  article_id: number;
  data_agendamento: string; // ISO date string
  status?: 'pendente' | 'publicado' | 'falhou' | 'cancelado';
}

export interface SchedulingResponse {
  id: number;
  user_id: number;
  site_id: number;
  article_id: number;
  data_agendamento: string;
  status: string;
  wordpress_post_id?: any;
  log?: any;
  created_at: string;
  updated_at: string;
  site?: {
    id: number;
    nome: string;
    url: string;
  };
  artigo?: {
    id: number;
    titulo: string;
    categoria: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string[]>;
}

class SchedulingService {
  private baseUrl = '/agendamentos';

  async createScheduling(data: SchedulingRequest): Promise<SchedulingResponse> {
    try {
      const response = await api.post<ApiResponse<SchedulingResponse>>(
        this.baseUrl,
        data,
        { headers: getAuthHeaders() }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao criar agendamento');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        throw new Error(Array.isArray(firstError) ? firstError[0] : 'Erro de validação');
      }
      
      throw new Error('Erro ao agendar artigo');
    }
  }

  async cancelScheduling(schedulingId: number): Promise<SchedulingResponse> {
    try {
      const response = await api.post<ApiResponse<SchedulingResponse>>(
        `${this.baseUrl}/${schedulingId}/cancel`,
        {},
        { headers: getAuthHeaders() }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao cancelar agendamento');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao cancelar agendamento:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erro ao cancelar agendamento');
    }
  }

  async reschedule(schedulingId: number, newDate: string): Promise<SchedulingResponse> {
    try {
      const response = await api.post<ApiResponse<SchedulingResponse>>(
        `${this.baseUrl}/${schedulingId}/reschedule`,
        { data_agendamento: newDate },
        { headers: getAuthHeaders() }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao reagendar');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao reagendar:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erro ao reagendar artigo');
    }
  }

  async getSchedulings(filters?: {
    status?: string;
    site_id?: number;
    data_inicio?: string;
    data_fim?: string;
    pendentes_only?: boolean;
    per_page?: number;
  }): Promise<{
    data: SchedulingResponse[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await api.get<ApiResponse<any>>(
        `${this.baseUrl}?${params}`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao listar agendamentos');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar agendamentos:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Erro ao carregar agendamentos');
    }
  }
}

export const schedulingService = new SchedulingService();
