import { useState, useEffect, useCallback } from 'react';

// Função auxiliar para fazer requisições autenticadas
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Token de autenticação não encontrado');
  }

  const baseUrl = (((import.meta as any).env && (import.meta as any).env.VITE_BACKEND_URL) || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}/api${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok || (data && data.success === false)) {
    throw new Error(data?.message || `Erro HTTP ${response.status}`);
  }

  return data;
}

interface DashboardData {
  user: any;
  limits: {
    articles: number;
    ideas: number;
    sites: number;
    isUnlimited?: boolean;
  };
  usage: {
    articles: {
      total: number;
      published: number;
      producing: number;
      limit: number;
      percentage: number;
      unlimited: boolean;
    };
    ideas: {
      total: number;
      limit: number;
      unlimited: boolean;
    };
    sites: {
      total: number;
      active: number;
      limit: number;
      percentage: number;
      unlimited: boolean;
    };
  };
  economics: {
    saved_money: number;
    saved_hours: number;
    cost_per_article: number;
    time_per_article: number;
  };
  recent_activities: {
    articles: Array<{
      id: number;
      titulo: string;
      status: string;
      updated_at: string;
    }>;
    ideas: Array<{
      id: number;
      titulo: string;
      created_at: string;
    }>;
    sites: Array<{
      id: number;
      nome: string;
      created_at: string;
    }>;
  };
  alerts: {
    articles_near_limit: boolean;
    sites_near_limit: boolean;
    articles_at_limit: boolean;
    sites_at_limit: boolean;
  };
}

interface UseDashboardReturn {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeAuthenticatedRequest('/dashboard', {
        method: 'GET'
      });

      if (response.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.message || 'Erro ao obter dados do dashboard');
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err.message || 'Erro interno do servidor');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    refreshDashboard
  };
}
