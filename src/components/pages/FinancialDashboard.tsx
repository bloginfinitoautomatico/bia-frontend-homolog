import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Clock
} from '../icons';
import { toast } from 'sonner';
import { getApiUrl } from '../../config/api';

interface FinancialMetrics {
  active_users: number;
  mrr: number;
  packs_revenue: number;
  churn_rate: number;
  conversion_rate: number;
  total_revenue_month: number;
  avg_ltv: number;
}

interface PayingUser {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  plan: string;
  plan_type: string;
  subscription_status: string;
  expiration: string;
  value: number;
  status_color: 'success' | 'warning' | 'danger' | 'secondary' | 'info';
}

interface RevenueChart {
  month: string;
  mrr: number;
  packs: number;
  total: number;
  is_total?: boolean; // Flag para linha de consolidado
}

interface PaymentMethodData {
  count: number;
  total: number;
  label: string;
}

interface FinancialMetricsFromAsaas {
  total_revenue: number;
  predicted_revenue: number;
  payment_methods: {
    pix: PaymentMethodData;
    credit_card: PaymentMethodData;
    boleto: PaymentMethodData;
  };
}

interface DashboardData {
  metrics: FinancialMetrics;
  financial_metrics: FinancialMetricsFromAsaas;
  paying_users: PayingUser[];
  revenue_chart: RevenueChart[];
}

export function FinancialDashboard({ userData }: { userData?: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se o usuário é admin
  useEffect(() => {
    if (userData && !userData.is_admin) {
      setError('Acesso negado. Você precisa ser administrador para acessar esta página.');
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [userData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Você precisa fazer login para acessar esta página.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/financial-dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado. Você precisa ser administrador para acessar esta página.');
        }
        throw new Error('Erro ao carregar dados do dashboard');
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiUrl()}/financial-dashboard/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }

      const result = await response.json();
      
      // Download do arquivo JSON
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || 'usuarios_pagantes.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && error.includes('login')) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 space-y-2">
            <p>{error}</p>
            <Button onClick={() => window.location.reload()}>
              Fazer Login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum dado encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (color: string) => {
    switch (color) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'danger':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Smartphone className="w-4 h-4" />;
      case 'CREDIT_CARD':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Financeiro</h1>
          <p className="text-gray-600">Acompanhe métricas e usuários pagantes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchDashboardData}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={exportUsers}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alerta sobre fontes de dados */}
      <Alert className="border-green-200 bg-green-50">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Dados Exclusivos BIA:</strong> Este painel mostra apenas cobranças e pagamentos gerados pelo sistema BIA. 
          <br />
          <strong>• Receita Total:</strong> Pagamentos confirmados da BIA
          <br />
          <strong>• Receita Prevista:</strong> Cobranças pendentes + assinaturas ativas da BIA
          <br />
          Dados podem estar zerados em ambiente de desenvolvimento sem transações reais.
        </AlertDescription>
      </Alert>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.active_users}</div>
            <p className="text-xs text-gray-600">
              Taxa de conversão: {data.metrics.conversion_rate.toFixed(1)}%
            </p>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">Base Local</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Planos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.metrics.mrr)}</div>
            <p className="text-xs text-gray-600">
              Receita recorrente mensal
            </p>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">Base Local</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Packs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.metrics.packs_revenue)}</div>
            <p className="text-xs text-gray-600">
              Últimos 30 dias
            </p>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">Base Local</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            {data.metrics.churn_rate > 5 ? 
              <AlertCircle className="h-4 w-4 text-red-600" /> : 
              <TrendingUp className="h-4 w-4 text-green-600" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.churn_rate.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">
              Este mês
            </p>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">Base Local</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias - Dados do Asaas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita Total (Mês)</CardTitle>
            <p className="text-sm text-gray-600">Pagamentos recebidos - Asaas</p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(data.financial_metrics?.total_revenue || 0)}
            </div>
            <div className="mt-2">
              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Pagamentos BIA Confirmados</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita Prevista</CardTitle>
            <p className="text-sm text-gray-600">Renovações + já recebido</p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(data.financial_metrics?.predicted_revenue || 0)}
            </div>
            <div className="mt-2">
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">Cobranças BIA Pendentes</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
            <p className="text-sm text-gray-600">Distribuição por método</p>
            <div className="mt-2">
              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">Métodos BIA</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.financial_metrics?.payment_methods && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">PIX</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(data.financial_metrics.payment_methods.pix.total)}</div>
                      <div className="text-xs text-gray-600">{data.financial_metrics.payment_methods.pix.count} pagamentos</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Cartão</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(data.financial_metrics.payment_methods.credit_card.total)}</div>
                      <div className="text-xs text-gray-600">{data.financial_metrics.payment_methods.credit_card.count} pagamentos</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <span className="text-sm">Boleto</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(data.financial_metrics.payment_methods.boleto.total)}</div>
                      <div className="text-xs text-gray-600">{data.financial_metrics.payment_methods.boleto.count} pagamentos</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários Pagantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Usuários Pagantes</CardTitle>
          <p className="text-gray-600">
            {data.paying_users.length} usuários com assinaturas ativas ou pagamentos recentes
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Nome</th>
                  <th className="text-left p-3 font-semibold">WhatsApp</th>
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-left p-3 font-semibold">Plano</th>
                  <th className="text-left p-3 font-semibold">Expiração</th>
                  <th className="text-left p-3 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.paying_users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status_color)}
                        <Badge variant={getStatusBadgeVariant(user.status_color)}>
                          {user.subscription_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 font-medium">{user.name}</td>
                    <td className="p-3">{user.whatsapp}</td>
                    <td className="p-3 text-sm text-gray-600">{user.email}</td>
                    <td className="p-3">
                      <Badge variant="outline">{user.plan}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {user.expiration}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{formatCurrency(user.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Receita (Últimos 6 Meses) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Evolução da Receita</CardTitle>
          <p className="text-gray-600">Últimos 6 meses</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.revenue_chart.map((month, index) => (
              <div 
                key={month.month} 
                className={`border rounded-lg p-4 ${
                  month.is_total 
                    ? 'bg-green-50 border-green-200 border-2' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold ${
                    month.is_total ? 'text-green-800 text-lg' : 'text-gray-900'
                  }`}>
                    {month.month}
                  </h4>
                  <div className={`text-lg font-bold ${
                    month.is_total ? 'text-green-800 text-xl' : 'text-gray-900'
                  }`}>
                    {formatCurrency(month.total)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">MRR: </span>
                    <span className={`font-semibold ${
                      month.is_total ? 'text-green-700' : 'text-gray-900'
                    }`}>
                      {formatCurrency(month.mrr)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Packs: </span>
                    <span className={`font-semibold ${
                      month.is_total ? 'text-green-700' : 'text-gray-900'
                    }`}>
                      {formatCurrency(month.packs)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
