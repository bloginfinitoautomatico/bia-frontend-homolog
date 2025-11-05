import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  Activity, 
  Database, 
  Settings, 
  TrendingUp,
  Server,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield
} from 'lucide-react';
import { AdminUsers } from './admin/AdminUsers';
import { OpenAISystemStatus } from './admin/OpenAISystemStatus';
import { toast } from 'sonner';
import { getApiUrl } from '../../config/api';

interface AdminPanelProps {
  onUpdateUser: (userData: any) => Promise<boolean>;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  usersByPlan: { [plan: string]: number };
  usersByStatus: { [status: string]: number };
  recentSignups: number;
  totalSites: number;
  timestamp: string;
}

interface SystemHealth {
  database: 'operational' | 'degraded' | 'offline';
  server: 'operational' | 'degraded' | 'offline';
  openai: 'operational' | 'degraded' | 'offline';
  lastCheck: string;
}

export function AdminPanel({ onUpdateUser }: AdminPanelProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Carregar estatísticas do sistema
  const loadSystemStats = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      console.log('📊 Carregando estatísticas administrativas...');
      
      const token = localStorage.getItem('auth_token');
      
      // Fazer requisição para as estatísticas do Laravel
      const response = await fetch(`${getApiUrl()}/admin/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Estatísticas carregadas:', data);
        
        if (data.success && data.data) {
          // Adaptar os dados do Laravel para nossa interface
          const statsData = data.data;
          const adaptedStats: SystemStats = {
            totalUsers: statsData.users?.total || 0,
            activeUsers: statsData.users?.active || 0,
            usersByPlan: statsData.users?.by_plan || { 'Free': 0 },
            usersByStatus: {
              'active': statsData.users?.active || 0,
              'inactive': statsData.users?.inactive || 0
            },
            recentSignups: statsData.recent_activity?.new_users || 0,
            totalSites: statsData.content?.total_sites || 0,
            timestamp: new Date().toISOString()
          };
          
          setStats(adaptedStats);
        } else {
          throw new Error('Estrutura de dados inválida');
        }
        
        // Atualizar health do database
        setHealth(prev => ({
          database: 'operational',
          server: prev?.server || 'operational',
          openai: prev?.openai || 'operational',
          lastCheck: new Date().toISOString()
        }));
        
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas do sistema');
      
      // Fallback com dados mock se houver erro
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        usersByPlan: { 'Free': 0 },
        usersByStatus: { 'active': 0 },
        recentSignups: 0,
        totalSites: 0,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Verificar saúde do sistema
  const checkSystemHealth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      // Verificar servidor Laravel
      let serverStatus: 'operational' | 'degraded' | 'offline' = 'offline';
      try {
        const healthResponse = await fetch(`${getApiUrl()}/health`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        serverStatus = healthResponse.ok ? 'operational' : 'degraded';
      } catch {
        serverStatus = 'offline';
      }

      // Verificar OpenAI
      let openaiStatus: 'operational' | 'degraded' | 'offline' = 'offline';
      try {
        // Buscar chave OpenAI do backend
        const token = localStorage.getItem('auth_token');
        const openaiResponse = await fetch(`${getApiUrl()}/openai/get-key`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          openaiStatus = openaiData.success && openaiData.key ? 'operational' : 'degraded';
        } else {
          openaiStatus = 'degraded';
        }
      } catch {
        openaiStatus = 'offline';
      }

      setHealth({
        database: 'operational', // Assumir que está funcionando se chegou até aqui
        server: serverStatus,
        openai: openaiStatus,
        lastCheck: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro ao verificar saúde do sistema:', error);
      setHealth({
        database: 'offline',
        server: 'offline',
        openai: 'offline',
        lastCheck: new Date().toISOString()
      });
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadSystemStats();
    checkSystemHealth();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      loadSystemStats(false);
      checkSystemHealth();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Função para obter badge de status
  const getStatusBadge = (status: 'operational' | 'degraded' | 'offline') => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800">Operacional</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degradado</Badge>;
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
    }
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: 'operational' | 'degraded' | 'offline') => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#8B5FBF]" />
            <h3 className="font-poppins text-lg mb-2">Carregando Painel Administrativo</h3>
            <p className="font-montserrat text-gray-600">Aguarde enquanto carregamos as informações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-poppins text-2xl mb-2">Painel Administrativo</h1>
          <p className="font-montserrat text-gray-600">
            Monitor geral do sistema BIA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => loadSystemStats(false)}
            disabled={isRefreshing}
            className="font-montserrat h-8 px-3 text-sm bg-[#8B5FBF] text-white border border-[#8B5FBF] hover:bg-[#7A4F9A] focus:ring-2 focus:ring-[#8B5FBF] focus:ring-opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Badge className="bg-[#8B5FBF] text-white">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
      </div>

      {/* Status de Saúde do Sistema */}
      {health && (
        <Alert className={`${
          health.server === 'operational' && health.openai === 'operational' 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          {health.server === 'operational' && health.openai === 'operational' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          <AlertDescription className="font-montserrat">
            <div className="flex items-center gap-4">
              <span>Status do Sistema:</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(health.server)}
                <span className="text-sm">Servidor</span>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(health.openai)}
                <span className="text-sm">OpenAI</span>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(health.database)}
                <span className="text-sm">Database</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas Rápidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-poppins text-sm font-medium">Usuários Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-poppins text-2xl">{stats.totalUsers}</div>
              <p className="font-montserrat text-xs text-muted-foreground">
                {stats.activeUsers} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-poppins text-sm font-medium">Novos Usuários</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-poppins text-2xl">{stats.recentSignups}</div>
              <p className="font-montserrat text-xs text-muted-foreground">
                Últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-poppins text-sm font-medium">Sites Conectados</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-poppins text-2xl">{stats.totalSites}</div>
              <p className="font-montserrat text-xs text-muted-foreground">
                WordPress conectados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-poppins text-sm font-medium">Status Geral</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-poppins text-lg">
                {health?.server === 'operational' && health?.openai === 'operational' ? 'Ótimo' : 'Limitado'}
              </div>
              <p className="font-montserrat text-xs text-muted-foreground">
                Sistema operacional
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Principal */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="font-montserrat">Visão Geral</TabsTrigger>
          <TabsTrigger value="users" className="font-montserrat">Usuários</TabsTrigger>
          <TabsTrigger value="system" className="font-montserrat">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Planos dos Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-poppins">Distribuição por Plano</CardTitle>
                  <CardDescription className="font-montserrat">
                    Usuários cadastrados por tipo de plano
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.usersByPlan).length > 0 ? (
                      Object.entries(stats.usersByPlan)
                        .sort((a, b) => b[1] - a[1])
                        .map(([planName, userCount], index) => {
                          const percentage = stats.totalUsers > 0 ? ((userCount / stats.totalUsers) * 100).toFixed(1) : '0';
                          const planPrices = {
                            'Free': 0,
                            'Básico': 149.90,
                            'Intermediário': 249.90,
                            'Avançado': 599.90,
                            'BIA': 999.90
                          };
                          const revenue = (planPrices[planName as keyof typeof planPrices] || 0) * userCount;
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                              <div className="font-montserrat">
                                <div className="font-medium">{planName}</div>
                                <div className="text-sm text-gray-600">{userCount} usuários ({percentage}%)</div>
                              </div>
                              <div className="font-montserrat text-right">
                                <div className="font-medium">R$ {revenue.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">receita potencial</div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <p className="font-montserrat text-gray-500 text-center py-4">
                        Nenhum dado de planos disponível
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status dos Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-poppins">Status dos Usuários</CardTitle>
                  <CardDescription className="font-montserrat">
                    Distribuição por status de conta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.usersByStatus).length > 0 ? (
                      Object.entries(stats.usersByStatus).map(([status, count], index) => {
                        const percentage = stats.totalUsers > 0 ? ((count / stats.totalUsers) * 100).toFixed(1) : '0';
                        const statusColor = status === 'active' ? 'text-green-600' : 
                                           status === 'inactive' ? 'text-yellow-600' : 'text-red-600';
                        const bgColor = status === 'active' ? 'bg-green-50 border-green-200' : 
                                       status === 'inactive' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                        
                        return (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}>
                            <div className="font-montserrat">
                              <div className={`font-medium ${statusColor}`}>
                                {status === 'active' ? 'Ativo' : 
                                 status === 'inactive' ? 'Inativo' : 'Suspenso'}
                              </div>
                              <div className="text-sm text-gray-600">{count} usuários</div>
                            </div>
                            <div className="font-montserrat text-right">
                              <div className="font-medium">{percentage}%</div>
                              <div className="text-xs text-gray-500">do total</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="font-montserrat text-gray-500 text-center py-4">
                        Nenhum dado de status disponível
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <AdminUsers onUpdateUser={onUpdateUser} />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Status OpenAI */}
            <OpenAISystemStatus />

            {/* Status do Servidor */}
            <Card>
              <CardHeader>
                <CardTitle className="font-poppins flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Status do Servidor
                </CardTitle>
                <CardDescription className="font-montserrat">
                  Monitor do backend Laravel e conectividade
                </CardDescription>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="font-montserrat font-medium text-gray-700">
                        Servidor Laravel
                      </label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(health.server)}
                        {getStatusBadge(health.server)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="font-montserrat font-medium text-gray-700">
                        Base de Dados
                      </label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(health.database)}
                        {getStatusBadge(health.database)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="font-montserrat font-medium text-gray-700">
                        Última Verificação
                      </label>
                      <div className="font-montserrat text-sm text-gray-600">
                        {new Date(health.lastCheck).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="font-montserrat text-gray-600">Verificando status...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
