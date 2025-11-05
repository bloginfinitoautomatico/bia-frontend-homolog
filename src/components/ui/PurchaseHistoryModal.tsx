import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Label } from '../ui/label';
import { 
  XCircle, 
  History, 
  CreditCard,
  Smartphone,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  RefreshCw,
  Calendar,
  Eye,
  Download,
  Loader2,
  Info,
  DollarSign
} from '../icons';
import { toast } from 'sonner';
import { useBia } from '../BiaContext';

interface PurchaseHistoryItem {
  id: string;
  type: 'subscription' | 'article_pack';
  planName: string;
  amount: number;
  paymentMethod: 'PIX' | 'CREDIT_CARD';
  status: 'pending' | 'confirmed' | 'expired' | 'canceled';
  dateCreated: string;
  dateConfirmed?: string;
  expirationDate?: string;
  nextBillingDate?: string;
  isActive?: boolean;
  articlesRemaining?: number;
  totalArticles?: number;
  description?: string;
}

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}

export function PurchaseHistoryModal({ isOpen, onClose, userData }: PurchaseHistoryModalProps) {
  const { state } = useBia();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'subscriptions' | 'packs'>('all');

  // Mock data para demonstração - substituir por chamada real da API
  const mockPurchases: PurchaseHistoryItem[] = [
    // Dados fictícios removidos - apenas dados reais serão exibidos
  ];

  useEffect(() => {
    if (isOpen) {
      loadPurchaseHistory();
    }
  }, [isOpen]);

  const loadPurchaseHistory = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar chamada real da API
      // const response = await purchaseService.getUserPurchaseHistory(userData.id);
      
      // Por enquanto, não há dados fictícios - apenas dados reais serão exibidos
      // Quando a API real estiver implementada, descomente as linhas abaixo:
      // const realPurchases = response.data.purchases || [];
      // setPurchases(realPurchases);
      
      // Simular carregamento sem dados fictícios
      setTimeout(() => {
        setPurchases([]); // Array vazio - apenas dados reais
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de compras');
      setPurchases([]); // Array vazio em caso de erro
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, type: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Confirmado
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Aguardando
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle size={12} className="mr-1" />
            Expirado
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Smartphone size={16} className="text-green-600" />;
      case 'CREDIT_CARD':
        return <CreditCard size={16} className="text-blue-600" />;
      default:
        return <DollarSign size={16} className="text-gray-600" />;
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    if (filter === 'all') return true;
    if (filter === 'subscriptions') return purchase.type === 'subscription';
    if (filter === 'packs') return purchase.type === 'article_pack';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-poppins text-2xl flex items-center gap-2">
                  <History className="w-7 h-7 text-purple-600" />
                  Histórico de Compras
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Veja todas as suas assinaturas e compras de packs de artigos
                </p>
              </div>
              <Button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                onClick={() => setFilter('all')}
                className={`font-montserrat ${
                  filter === 'all' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Todos ({purchases.length})
              </Button>
              <Button
                onClick={() => setFilter('subscriptions')}
                className={`font-montserrat ${
                  filter === 'subscriptions' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <RefreshCw size={14} className="mr-1" />
                Assinaturas ({purchases.filter(p => p.type === 'subscription').length})
              </Button>
              <Button
                onClick={() => setFilter('packs')}
                className={`font-montserrat ${
                  filter === 'packs' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package size={14} className="mr-1" />
                Packs ({purchases.filter(p => p.type === 'article_pack').length})
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando histórico de compras...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredPurchases.length === 0 && (
              <div className="text-center py-8">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-poppins text-xl text-gray-600 mb-2">
                  Nenhuma compra encontrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Você ainda não possui nenhuma transação registrada em nosso sistema.
                </p>
                <p className="text-sm text-gray-400">
                  Quando você realizar compras ou assinaturas, elas aparecerão aqui.
                </p>
              </div>
            )}

            {/* Purchase List */}
            {!isLoading && filteredPurchases.length > 0 && (
              <div className="space-y-4">
                {filteredPurchases.map((purchase) => (
                  <Card key={purchase.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              {purchase.type === 'subscription' ? 
                                <RefreshCw className="w-5 h-5 text-purple-600" /> :
                                <Package className="w-5 h-5 text-purple-600" />
                              }
                            </div>
                            
                            <div>
                              <h4 className="font-poppins font-semibold text-lg">
                                {purchase.planName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {purchase.description}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            <div>
                              <Label className="text-xs text-gray-500">Valor</Label>
                              <p className="font-semibold text-lg text-green-600">
                                {formatPrice(purchase.amount)}
                              </p>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">Data da Compra</Label>
                              <p className="font-medium">
                                {formatDate(purchase.dateCreated)}
                              </p>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">Método de Pagamento</Label>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(purchase.paymentMethod)}
                                <span className="font-medium">
                                  {purchase.paymentMethod === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
                                </span>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">Status</Label>
                              <div className="mt-1">
                                {getStatusBadge(purchase.status, purchase.type)}
                              </div>
                            </div>
                          </div>

                          {/* Informações específicas por tipo */}
                          {purchase.type === 'subscription' && purchase.status === 'confirmed' && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-blue-600">Status da Assinatura</Label>
                                  <p className="font-medium text-blue-800">
                                    {purchase.isActive ? '✅ Ativa' : '❌ Inativa'}
                                  </p>
                                </div>
                                {purchase.nextBillingDate && purchase.isActive && (
                                  <div>
                                    <Label className="text-xs text-blue-600">Próxima Cobrança</Label>
                                    <p className="font-medium text-blue-800">
                                      {formatDate(purchase.nextBillingDate)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {purchase.type === 'article_pack' && purchase.status === 'confirmed' && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-green-600">Total de Artigos</Label>
                                  <p className="font-medium text-green-800">
                                    {purchase.totalArticles}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-green-600">Artigos Restantes</Label>
                                  <p className="font-medium text-green-800">
                                    {purchase.articlesRemaining}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-green-600">Utilização</Label>
                                  <p className="font-medium text-green-800">
                                    {purchase.totalArticles && purchase.articlesRemaining !== undefined
                                      ? `${Math.round(((purchase.totalArticles - purchase.articlesRemaining) / purchase.totalArticles) * 100)}%`
                                      : '0%'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1">
                            <Eye size={12} className="mr-1" />
                            Detalhes
                          </Button>
                          {purchase.status === 'confirmed' && (
                            <Button className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1">
                              <Download size={12} className="mr-1" />
                              Comprovante
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Resumo financeiro - apenas se houver compras */}
            {!isLoading && purchases.length > 0 && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-montserrat font-semibold mb-3">Resumo Financeiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total gasto:</span>
                    <p className="font-semibold text-lg text-purple-600">
                      {formatPrice(
                        purchases
                          .filter(p => p.status === 'confirmed')
                          .reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Assinaturas ativas:</span>
                    <p className="font-semibold text-lg text-blue-600">
                      {purchases.filter(p => p.type === 'subscription' && p.isActive).length}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Packs comprados:</span>
                    <p className="font-semibold text-lg text-green-600">
                      {purchases.filter(p => p.type === 'article_pack' && p.status === 'confirmed').length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Informações importantes */}
            <Alert className="mt-6 bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Dica:</strong> Os créditos de packs de artigos não possuem prazo de validade e podem ser usados a qualquer momento. As assinaturas são renovadas automaticamente até o cancelamento.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
