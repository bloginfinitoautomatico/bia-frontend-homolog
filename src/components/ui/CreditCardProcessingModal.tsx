import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  XCircle, 
  CheckCircle,
  CreditCard,
  Loader2,
  AlertTriangle,
  RefreshCw
} from '../icons';
import { toast } from 'sonner';
import { getCurrentUser } from '../../services/auth';
import { useBia } from '../BiaContext';

interface CreditCardProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    id: string;
    value: number;
    planName: string;
    status: string;
  };
  onPaymentResult?: (result: 'success' | 'failed', data?: any) => void;
}

export function CreditCardProcessingModal({ 
  isOpen, 
  onClose, 
  paymentData, 
  onPaymentResult 
}: CreditCardProcessingModalProps) {
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Hook para acessar o contexto do BIA
  const { actions } = useBia();

  // Função para atualizar dados do usuário após pagamento confirmado
  const refreshUserPlanData = async () => {
    try {
      setIsUpdatingPlan(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('⚠️ Token não encontrado para atualizar dados do usuário');
        return;
      }

      console.log('🔄 Atualizando dados do usuário após pagamento confirmado...');
      
      // Buscar dados atualizados do usuário
      const result = await getCurrentUser(token);
      
      if (result.success && result.user) {
        console.log('✅ Dados do usuário atualizados:', result.user);
        
        // Atualizar contexto com novos dados
        actions.updateUser(result.user);
        
        // Recarregar dados do dashboard
        await actions.forceLoadFromDatabase();
        
        // Mostrar notificação de sucesso
        toast.success(`Plano atualizado para ${result.user.plano}! 🎉`, {
          description: 'Sua interface foi atualizada com os novos recursos.',
          duration: 5000,
        });
        
        console.log('🎯 Interface atualizada com novo plano:', result.user.plano);
      } else {
        console.error('❌ Erro ao buscar dados atualizados do usuário');
        toast.warning('Pagamento aprovado! Atualize a página para ver as mudanças.');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar dados do usuário:', error);
      toast.warning('Pagamento aprovado! Atualize a página para ver as mudanças.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Simular ou verificar status do pagamento
  useEffect(() => {
    if (!isOpen) return;

    const checkPaymentStatus = async () => {
      try {
        // Aguardar um pouco para simular processamento
        await new Promise(resolve => setTimeout(resolve, 3000));

        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/payments/${paymentData.id}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        const result = await response.json();
        
        if (result.success) {
          if (result.status === 'CONFIRMED' || result.status === 'RECEIVED') {
            setProcessingStatus('success');
            
            // Atualizar dados do usuário e plano
            await refreshUserPlanData();
            
            if (onPaymentResult) {
              onPaymentResult('success', result);
            }
          } else if (result.status === 'REFUSED' || result.status === 'CANCELLED') {
            setProcessingStatus('failed');
            setErrorMessage(result.message || 'Pagamento recusado');
            if (onPaymentResult) {
              onPaymentResult('failed', result);
            }
          } else {
            // Status pendente, continuar verificando
            setTimeout(checkPaymentStatus, 5000);
          }
        } else {
          setProcessingStatus('failed');
          setErrorMessage('Erro ao processar pagamento');
          if (onPaymentResult) {
            onPaymentResult('failed', result);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        setProcessingStatus('failed');
        setErrorMessage('Erro de comunicação');
        if (onPaymentResult) {
          onPaymentResult('failed', { error: error instanceof Error ? error.message : 'Erro desconhecido' });
        }
      }
    };

    checkPaymentStatus();
  }, [isOpen, paymentData.id, onPaymentResult]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <Card className="border-0">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="font-poppins text-xl flex items-center gap-2">
                {processingStatus === 'processing' && (
                  <>
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    Processando Pagamento
                  </>
                )}
                {processingStatus === 'success' && (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Pagamento Aprovado!
                  </>
                )}
                {processingStatus === 'failed' && (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Pagamento Recusado
                  </>
                )}
              </CardTitle>
              {processingStatus !== 'processing' && (
                <Button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Informações do pagamento */}
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="font-montserrat font-semibold text-blue-800 mb-2">
                {paymentData.planName}
              </h3>
              <p className="text-blue-600 text-2xl font-bold">
                {formatPrice(paymentData.value)}
              </p>
            </div>

            {processingStatus === 'processing' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-montserrat font-semibold text-blue-800">
                  Processando seu pagamento...
                </h3>
                <p className="text-gray-600">
                  Aguarde enquanto validamos as informações do seu cartão de crédito.
                </p>
                <div className="flex justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Não feche esta janela até o processamento ser concluído.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {processingStatus === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-montserrat font-semibold text-green-800">
                  Pagamento Aprovado!
                </h3>
                <p className="text-gray-600">
                  Seu pagamento foi processado com sucesso.
                </p>
                
                {isUpdatingPlan ? (
                  <Alert className="bg-blue-50 border-blue-200">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <AlertDescription className="text-blue-800">
                      Atualizando seu plano e carregando novos recursos...
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Seu plano foi atualizado! A interface já reflete suas novas funcionalidades.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  onClick={onClose} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isUpdatingPlan}
                >
                  {isUpdatingPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </div>
            )}

            {processingStatus === 'failed' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-montserrat font-semibold text-red-800">
                  Pagamento Recusado
                </h3>
                <p className="text-gray-600">
                  Não foi possível processar seu pagamento.
                </p>
                {errorMessage && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Possíveis motivos:
                  </p>
                  <ul className="text-sm text-gray-600 text-left space-y-1">
                    <li>• Dados do cartão incorretos</li>
                    <li>• Limite insuficiente</li>
                    <li>• Cartão bloqueado</li>
                    <li>• Problema temporário</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button onClick={onClose} className="flex-1 border border-gray-300 bg-white hover:bg-gray-50">
                    Tentar Novamente
                  </Button>
                  <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Usar PIX
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
