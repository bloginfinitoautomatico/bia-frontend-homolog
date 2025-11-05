import { API_CONFIG } from '../config/api';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class APIService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Erro na requisição GET ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async post<T>(endpoint: string, body?: any): Promise<APIResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Erro na requisição POST ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async put<T>(endpoint: string, body?: any): Promise<APIResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Erro na requisição PUT ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Erro na requisição DELETE ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const api = new APIService();
export type { APIResponse };
