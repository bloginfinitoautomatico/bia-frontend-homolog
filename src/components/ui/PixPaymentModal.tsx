import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  XCircle, 
  Copy, 
  CheckCircle,
  Clock,
  RefreshCw,
  Smartphone
} from '../icons';
import { toast } from 'sonner';
import { getCurrentUser } from '../../services/auth';
import { useBia } from '../BiaContext';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    id: string;
    subscriptionId?: string; // ID da assinatura se for uma assinatura
    qrCode?: string;
    pixCopyPaste?: string;
    value: number;
    planName: string;
    isSubscription?: boolean; // Flag para indicar se é uma assinatura
  };
  onPaymentConfirmed?: (paymentId: string) => void;
}

export function PixPaymentModal({ 
  isOpen, 
  onClose, 
  paymentData, 
  onPaymentConfirmed 
}: PixPaymentModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutos em segundos
  const [pixInfo, setPixInfo] = useState({
    qrCode: paymentData.qrCode || null,
    pixCopyPaste: paymentData.pixCopyPaste || null
  });
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [realPaymentId, setRealPaymentId] = useState<string | null>(null); // ID real do pagamento no Asaas
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
        toast.warning('Pagamento confirmado! Atualize a página para ver as mudanças.');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar dados do usuário:', error);
      toast.warning('Pagamento confirmado! Atualize a página para ver as mudanças.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Atualizar dados PIX quando os props mudarem
  useEffect(() => {
    setPixInfo({
      qrCode: paymentData.qrCode || null,
      pixCopyPaste: paymentData.pixCopyPaste || null
    });
  }, [paymentData.qrCode, paymentData.pixCopyPaste]);

  // Atualizar pixInfo quando as props mudarem (dados já disponíveis)
  useEffect(() => {
    console.log('PixPaymentModal - Props recebidas:', {
      isOpen,
      paymentData,
      hasQrCode: !!pixInfo.qrCode,
      hasPixCopyPaste: !!pixInfo.pixCopyPaste,
      paymentId: paymentData.id,
      propsQrCode: !!paymentData.qrCode,
      propsPixCopyPaste: !!paymentData.pixCopyPaste
    });
    
    // Se os dados PIX vieram nas props, usar eles diretamente
    if (paymentData.qrCode || paymentData.pixCopyPaste) {
      setPixInfo({
        qrCode: paymentData.qrCode || null,
        pixCopyPaste: paymentData.pixCopyPaste || null
      });
      console.log('PIX dados obtidos das props:', {
        qrCode: !!paymentData.qrCode,
        pixCopyPaste: !!paymentData.pixCopyPaste
      });
      return; // Não precisa buscar via API
    }
    
    // Só tentar buscar se:
    // 1. Modal está aberto
    // 2. Não tem dados PIX nas props nem no estado
    // 3. Não está carregando
    // 4. Tem um ID válido
    if (isOpen && !pixInfo.qrCode && !pixInfo.pixCopyPaste && !isLoadingPix && paymentData.id) {
      const fetchPixCode = async () => {
        setIsLoadingPix(true);
        try {
          const token = localStorage.getItem('auth_token');
          
          // Determinar o endpoint correto baseado no tipo
          let endpoint: string;
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          if (paymentData.isSubscription && paymentData.subscriptionId) {
            // Para assinaturas, usar o novo endpoint
            endpoint = `${apiUrl}/api/subscriptions/${paymentData.subscriptionId}/pix`;
            console.log(`Buscando PIX Code para assinatura ID: ${paymentData.subscriptionId}`);
          } else {
            // Para pagamentos diretos, usar o endpoint original
            endpoint = `${apiUrl}/api/subscriptions/payment/${paymentData.id}/pix-code`;
            console.log(`Buscando PIX Code para pagamento ID: ${paymentData.id}`);
          }

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          const result = await response.json();
          
          if (result.success) {
            setPixInfo({
              qrCode: result.pix_qr_code,
              pixCopyPaste: result.pix_copy_paste
            });
            // Armazenar o ID real do pagamento para verificação de status
            if (result.payment_id) {
              setRealPaymentId(result.payment_id);
            }
            console.log('PIX Code obtido via API:', result);
          } else {
            console.error('Erro na resposta da API:', result);
          }
        } catch (error) {
          console.error('Erro ao buscar PIX Code:', error);
        } finally {
          setIsLoadingPix(false);
        }
      };

      // Aguardar 3 segundos e tentar buscar (só se realmente não há dados)
      const timeout = setTimeout(fetchPixCode, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, pixInfo.qrCode, pixInfo.pixCopyPaste, paymentData.id, paymentData.subscriptionId, paymentData.isSubscription, paymentData.qrCode, paymentData.pixCopyPaste, isLoadingPix]);

  // Timer para expiração do PIX (30 minutos)
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus]);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending' || !paymentData.id) return;

    const checkPayment = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        // Usar o endpoint correto conforme definido no backend
        const response = await fetch(`http://localhost:8000/api/payments/${paymentData.id}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        const result = await response.json();
        
        if (result.success && result.status === 'RECEIVED') {
          setPaymentStatus('confirmed');
          
          // Atualizar dados do usuário e plano
          await refreshUserPlanData();
          
          if (onPaymentConfirmed) {
            onPaymentConfirmed(paymentData.id);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    };

    // Verificar a cada 10 segundos
    const interval = setInterval(checkPayment, 10000);
    
    return () => clearInterval(interval);
  }, [isOpen, paymentStatus, paymentData.id, onPaymentConfirmed]);

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixInfo.pixCopyPaste || '');
      toast.success('Código PIX copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código PIX');
    }
  };

  const checkPaymentManually = async () => {
    setIsChecking(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      
      // Usar o ID real do pagamento se disponível, senão usar o ID dos props
      const paymentIdToCheck = realPaymentId || paymentData.id;
      
      console.log('Verificando pagamento:', {
        paymentIdToCheck,
        realPaymentId,
        paymentDataId: paymentData.id,
        isSubscription: paymentData.isSubscription
      });
      
      const response = await fetch(`http://localhost:8000/api/payments/${paymentIdToCheck}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      
      console.log('Resultado da verificação:', result);
      
      if (result.success && result.status === 'RECEIVED') {
        setPaymentStatus('confirmed');
        
        // Atualizar dados do usuário e plano
        await refreshUserPlanData();
        
        if (onPaymentConfirmed) {
          onPaymentConfirmed(paymentIdToCheck);
        }
      } else {
        toast.info('Pagamento ainda não foi confirmado');
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      toast.error('Erro ao verificar pagamento');
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full h-[85vh] overflow-hidden shadow-2xl">
        <Card className="border-0 h-full flex flex-col">
          <CardHeader className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="font-poppins text-xl flex items-center gap-3">
                {paymentStatus === 'confirmed' ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    Pagamento Confirmado!
                  </>
                ) : paymentStatus === 'expired' ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    PIX Expirado
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-purple-600" />
                    </div>
                    Pagar com PIX
                  </>
                )}
              </CardTitle>
              <Button 
                onClick={onClose} 
                className="text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white px-4 py-2"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Fechar
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto bg-white">
            {paymentStatus === 'confirmed' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="font-poppins text-2xl font-semibold text-green-800">
                    Pagamento Confirmado!
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Seu pagamento de {formatPrice(paymentData.value)} para o plano {paymentData.planName} foi confirmado com sucesso.
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
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            ) : paymentStatus === 'expired' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                  <h3 className="font-poppins text-2xl font-semibold text-red-800">
                    PIX Expirado
                  </h3>
                  <p className="text-gray-600 text-lg">
                    O tempo para pagamento via PIX expirou. Por favor, gere um novo código para continuar.
                  </p>
                  <Button 
                    onClick={onClose} 
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 h-full">
                {/* Grid com 2 colunas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  {/* Coluna 1: Informações do Pagamento e QR Code */}
                  <div className="space-y-6">
                    {/* Informações do pagamento */}
                    <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl text-center">
                      <h3 className="font-poppins text-xl font-semibold text-purple-800 mb-3">
                        {paymentData.planName}
                      </h3>
                      <p className="text-purple-600 text-3xl font-bold mb-2">
                        {formatPrice(paymentData.value)}
                      </p>
                      
                      {/* Timer */}
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Clock className="w-5 h-5 text-orange-600" />
                        <span className="text-orange-600 font-mono text-xl font-bold">
                          {formatTime(timeLeft)}
                        </span>
                        <span className="text-orange-700 text-sm font-medium">restantes</span>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="text-center space-y-4">
                      <h4 className="font-poppins text-lg font-semibold text-gray-800">
                        Escaneie o QR Code
                      </h4>
                      
                      {pixInfo.qrCode ? (
                        <div className="bg-white p-6 rounded-xl border-2 border-purple-200 inline-block shadow-sm">
                          <img 
                            src={pixInfo.qrCode.startsWith('data:') ? pixInfo.qrCode : `data:image/png;base64,${pixInfo.qrCode}`}
                            alt="QR Code PIX"
                            className="w-64 h-64 mx-auto"
                            onError={(e) => {
                              console.error('Erro ao carregar QR Code:', pixInfo.qrCode);
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'text-red-600 text-sm p-4';
                              errorDiv.textContent = 'Erro ao carregar QR Code. Use o código PIX ao lado.';
                              img.parentNode?.appendChild(errorDiv);
                            }}
                          />
                        </div>
                      ) : isLoadingPix ? (
                        <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                            <h4 className="font-poppins font-semibold text-blue-800">Carregando QR Code...</h4>
                            <p className="text-sm text-blue-700 text-center">
                              Aguarde enquanto geramos o QR Code PIX
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
                          <h4 className="font-poppins font-semibold text-yellow-800 mb-2">QR Code Indisponível</h4>
                          <p className="text-sm text-yellow-700 mb-4">
                            Use o código PIX ao lado para realizar o pagamento
                          </p>
                          <Button 
                            onClick={async () => {
                              setIsLoadingPix(true);
                              try {
                                const token = localStorage.getItem('auth_token');
                                
                                let endpoint: string;
                                if (paymentData.isSubscription && paymentData.subscriptionId) {
                                  endpoint = `http://localhost:8000/api/subscriptions/${paymentData.subscriptionId}/pix`;
                                } else {
                                  endpoint = `http://localhost:8000/api/subscriptions/payment/${paymentData.id}/pix-code`;
                                }

                                const response = await fetch(endpoint, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Accept': 'application/json'
                                  }
                                });

                                const result = await response.json();
                                
                                if (result.success) {
                                  setPixInfo({
                                    qrCode: result.pix_qr_code,
                                    pixCopyPaste: result.pix_copy_paste
                                  });
                                  if (result.payment_id) {
                                    setRealPaymentId(result.payment_id);
                                  }
                                  toast.success('Dados PIX carregados!');
                                } else {
                                  toast.error('Dados PIX ainda não disponíveis');
                                }
                              } catch (error) {
                                console.error('Erro ao buscar PIX Code:', error);
                                toast.error('Erro ao carregar PIX');
                              } finally {
                                setIsLoadingPix(false);
                              }
                            }}
                            disabled={isLoadingPix}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {isLoadingPix ? 'Carregando...' : 'Tentar Carregar PIX'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna 2: Código PIX e Instruções */}
                  <div className="space-y-6">
                    {/* Código PIX para copiar */}
                    {pixInfo.pixCopyPaste && (
                      <div className="space-y-4">
                        <h4 className="font-poppins text-lg font-semibold text-gray-800">
                          Código PIX para Copiar
                        </h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex gap-3">
                            <div className="flex-1 bg-white border border-gray-200 p-4 rounded-lg font-mono text-sm break-all max-h-32 overflow-y-auto">
                              {pixInfo.pixCopyPaste}
                            </div>
                            <Button 
                              onClick={copyPixCode} 
                              className="px-4 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex-shrink-0"
                            >
                              <Copy className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instruções */}
                    <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl">
                      <h5 className="font-poppins font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-purple-600" />
                        Como pagar:
                      </h5>
                      <ol className="list-decimal list-inside space-y-3 text-gray-700">
                        <li className="font-medium">Abra o app do seu banco</li>
                        <li className="font-medium">Escolha a opção PIX</li>
                        <li className="font-medium">Escaneie o QR Code ou cole o código</li>
                        <li className="font-medium">Confirme o pagamento</li>
                      </ol>
                    </div>

                    {/* Status e botão de verificar */}
                    <div className="space-y-4">
                      <Alert className="border-purple-200 bg-purple-50">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <AlertDescription className="text-purple-800">
                          Aguardando confirmação do pagamento. Você será notificado automaticamente quando o pagamento for confirmado.
                        </AlertDescription>
                      </Alert>

                      <Button 
                        onClick={checkPaymentManually} 
                        disabled={isChecking}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 py-3"
                      >
                        {isChecking ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Verificar Pagamento
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Botão fechar secundário */}
                    <Button 
                      onClick={onClose} 
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3"
                    >
                      Cancelar e Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
