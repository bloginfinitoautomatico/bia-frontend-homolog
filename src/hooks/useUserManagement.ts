import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface User {
  id?: string;
  email: string;
  name: string;
  cpf: string;
  whatsapp?: string;
  dataNascimento?: string;
  plano: string;
  created_at?: string;
  updated_at?: string;
}

interface UseUserManagementReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  registerUser: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginUser: (email: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  refreshUsers: () => Promise<void>;
}

export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para registrar novo usuário
  const registerUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Registrando usuário via hook:', userData);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorResult = await response.json();
        const errorMessage = errorResult.error || `Erro HTTP ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Erro no cadastro');
        return { success: false, error: result.error };
      }

      // Atualizar lista local de usuários
      if (result.user) {
        setUsers(prev => [...prev, result.user]);
      }

      console.log('Usuário registrado com sucesso via hook:', result.user);
      return { success: true, user: result.user };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro no registro via hook:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Função para fazer login
  const loginUser = async (email: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fazendo login via hook:', email);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        const errorMessage = errorResult.error || `Erro HTTP ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Erro no login');
        return { success: false, error: result.error };
      }

      console.log('Login realizado com sucesso via hook:', result.user);
      return { success: true, user: result.user };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro no login via hook:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar todos os usuários
  const refreshUsers = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Buscando usuários via hook...');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Erro ao buscar usuários');
        return;
      }

      setUsers(result.users || []);
      console.log(`Usuários carregados via hook: ${result.users?.length || 0}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar usuários via hook:', error);
      setError(errorMessage);
      
      // Em caso de erro, manter array vazio
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar usuários na inicialização
  useEffect(() => {
    refreshUsers();
  }, []);

  return {
    users,
    isLoading,
    error,
    registerUser,
    loginUser,
    refreshUsers
  };
}

// Hook para estatísticas do sistema
export function useSystemStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    activeUsers: 0,
    totalRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.stats) {
        setStats(result.stats);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar estatísticas:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refreshStats
  };
}