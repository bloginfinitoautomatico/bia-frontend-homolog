import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  XCircle, 
  CreditCard, 
  Smartphone, 
  Shield,
  Loader2
} from '../icons';
import { subscriptionService, CustomerData, CreditCardData } from '../../services/subscriptionService';
import { toast } from 'sonner';
import { PixPaymentModal } from './PixPaymentModal';
import { CreditCardProcessingModal } from './CreditCardProcessingModal';
import MetaPixelService from '../../services/metaPixel';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features?: string[];
  isRecurring?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  userData: any;
  onSuccess?: (data: any) => void;
}

export function CheckoutModal({ isOpen, onClose, plan, userData, onSuccess }: CheckoutModalProps) {
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showCardProcessingModal, setShowCardProcessingModal] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [lastSubmissionData, setLastSubmissionData] = useState<any>(null);
  
  // Formulário de dados do cliente
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: userData?.name || '',
    email: userData?.email || '',
    cpf_cnpj: userData?.cpf || '',
    phone: userData?.whatsapp || userData?.telefone || '',
    postal_code: '',
    address: '',
    address_number: '',
    complement: '',
    province: '',
    city: '',
    state: ''
  });

  // Dados do cartão de crédito
  const [creditCard, setCreditCard] = useState<CreditCardData>({
    holderName: userData?.name || '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });

  const [step, setStep] = useState<'form'>('form');

  const handleCustomerDataChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cleanValue.substring(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Handler especial para CPF com formatação
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCustomerData(prev => ({ ...prev, cpf_cnpj: formatted }));
  };

  const handleCreditCardChange = (field: keyof CreditCardData, value: string) => {
    setCreditCard(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!customerData.name || !customerData.name.trim()) {
      toast.error('❌ Por favor, preencha o Nome Completo');
      return false;
    }

    if (!customerData.email || !customerData.email.trim()) {
      toast.error('❌ Por favor, preencha o E-mail');
      return false;
    }

    // Validar CPF - OBRIGATÓRIO
    const cleanCPF = customerData.cpf_cnpj.replace(/\D/g, '');
    if (!cleanCPF || cleanCPF.length < 11) {
      toast.error('❌ CPF é obrigatório! Mínimo 11 dígitos.');
      return false;
    }
    
    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
      toast.error('❌ CPF inválido. Verifique os dígitos.');
      return false;
    }

    if (billingType === 'CREDIT_CARD') {
      if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || 
          !creditCard.expiryYear || !creditCard.cvv) {
        toast.error('Por favor, preencha todos os dados do cartão');
        return false;
      }
      
      // Disparar evento Meta Pixel - AddPaymentInfo
      MetaPixelService.trackAddPaymentInfo({
        planName: plan.name,
        planSlug: plan.id,
        value: plan.price,
        paymentMethod: 'credit_card'
      });
    } else {
      // Disparar evento Meta Pixel - AddPaymentInfo para PIX
      MetaPixelService.trackAddPaymentInfo({
        planName: plan.name,
        planSlug: plan.id,
        value: plan.price,
        paymentMethod: billingType === 'PIX' ? 'pix' : 'boleto'
      });
    }

    return true;
  };

  const handleSubmit = async (retryData?: any) => {
    if (!retryData && !validateForm()) return;

    setIsLoading(true);
    setShowRetryButton(false);

    // Disparar evento Meta Pixel - InitiateCheckout
    MetaPixelService.trackInitiateCheckout({
      planName: plan.name,
      planSlug: plan.id,
      value: plan.price
    });

    try {
      const requestData = retryData || {
        plan_id: plan.id,
        billing_type: billingType,
        customer_data: {
          ...customerData,
          cpf_cnpj: customerData.cpf_cnpj.replace(/\D/g, '') // Remove formatação do CPF
        },
        ...(billingType === 'CREDIT_CARD' && { credit_card: creditCard })
      };

      // Salvar dados para retry se necessário
      if (!retryData) {
        setLastSubmissionData(requestData);
      }

      let result;
      
      if (billingType === 'CREDIT_CARD') {
        // Usar endpoint específico para cartão de crédito
        result = await subscriptionService.createCreditCardPayment({
          plan_id: plan.id,
          customer_data: {
            ...customerData,
            cpf_cnpj: customerData.cpf_cnpj.replace(/\D/g, '') // Remove formatação do CPF
          },
          credit_card: creditCard,
          is_subscription: plan.isRecurring
        });
      } else {
        // Usar endpoint padrão para PIX/Boleto
        if (plan.isRecurring) {
          // Criar assinatura recorrente
          result = await subscriptionService.createSubscription(requestData);
        } else {
          // Criar pagamento único
          result = await subscriptionService.createPayment(requestData);
        }
      }

      if (result.success) {
        setPaymentResult(result.data);
        
        if (billingType === 'PIX') {
          // Mostrar modal do PIX
          setShowPixModal(true);
        } else {
          // Mostrar modal de processamento do cartão
          setShowCardProcessingModal(true);
        }

        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        console.error('❌ Falha no processamento:', result.error);
        
        // Dar feedback mais específico baseado no tipo de erro
        if (result.error?.includes('servidor')) {
          toast.error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.', {
            duration: 6000
          });
        } else if (result.error?.includes('timeout') || result.error?.includes('demorado')) {
          toast.error('A operação está demorando mais que o esperado. Aguarde e tente novamente.', {
            duration: 6000
          });
        } else {
          toast.error(result.error || 'Erro ao processar pagamento');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      
      // Tratar diferentes tipos de erro
      if (error instanceof Error) {
        if (error.message.includes('servidor') || error.message.includes('500')) {
          toast.error('🔧 Nosso servidor está processando muitas requisições. Tente novamente em alguns segundos.', {
            duration: 8000
          });
        } else if (error.message.includes('timeout') || error.message.includes('demorado')) {
          toast.error('⏱️ A operação está demorando mais que o esperado. Aguarde alguns instantes e tente novamente.', {
            duration: 8000
          });
        } else if (error.message.includes('conexão') || error.message.includes('rede')) {
          toast.error('🌐 Problema de conexão detectado. Verifique sua internet e tente novamente.', {
            duration: 8000
          });
        } else {
          toast.error(`Erro: ${error.message}`, {
            duration: 6000
          });
        }
        
        // Mostrar botão de retry para erros de servidor/rede
        if (error.message.includes('servidor') || 
            error.message.includes('timeout') || 
            error.message.includes('conexão') ||
            error.message.includes('500') ||
            error.message.includes('502') ||
            error.message.includes('503') ||
            error.message.includes('504')) {
          setShowRetryButton(true);
        }
      } else {
        toast.error('Erro interno. Tente novamente em alguns instantes.');
        setShowRetryButton(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastSubmissionData) {
      toast.info('Tentando novamente...');
      handleSubmit(lastSubmissionData);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleClose = () => {
    setStep('form');
    setPaymentResult(null);
    setShowPixModal(false);
    setShowCardProcessingModal(false);
    onClose();
  };

  const handlePaymentConfirmed = (paymentId: string) => {
    // Modal PIX já fará a atualização dos dados do usuário
    setShowPixModal(false);
    handleClose();
  };

  const handlePaymentResult = (result: 'success' | 'failed', data?: any) => {
    if (result === 'success') {
      // Modal de cartão já fará a atualização dos dados do usuário
      setShowCardProcessingModal(false);
      handleClose();
    } else {
      setShowCardProcessingModal(false);
      // Modal será fechado e usuário pode tentar novamente
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <Card className="border-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="font-poppins text-xl">
                  {plan.isRecurring ? 'Finalizar Assinatura' : 'Finalizar Compra'}
                </CardTitle>
                <Button onClick={handleClose}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-montserrat font-semibold text-purple-800">{plan.name}</h3>
                <p className="text-purple-600 text-lg font-bold">{formatPrice(plan.price)}</p>
                {plan.isRecurring && (
                  <p className="text-purple-600 text-sm">Recorrente mensalmente</p>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Método de Pagamento */}
              <div>
                <Label className="font-montserrat font-semibold">Método de Pagamento</Label>
                <Tabs value={billingType} onValueChange={(value) => setBillingType(value as any)}>
                  <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-lg p-1 gap-1">
                    <TabsTrigger 
                      value="PIX" 
                      className="flex items-center gap-2 font-montserrat font-medium text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground rounded-md transition-all duration-200 px-3 py-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      PIX
                    </TabsTrigger>
                    <TabsTrigger 
                      value="CREDIT_CARD" 
                      className="flex items-center gap-2 font-montserrat font-medium text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground rounded-md transition-all duration-200 px-3 py-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Cartão
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Dados do Cliente */}
              <div className="space-y-4">
                <Label className="font-montserrat font-semibold">Dados do Cliente</Label>
                
                {/* Nota informativa se os dados foram preenchidos automaticamente */}
                {(userData?.name || userData?.email || userData?.cpf) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 font-montserrat">
                      ℹ️ Dados preenchidos automaticamente da sua conta. Você pode editá-los se necessário.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={customerData.name}
                      onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF/CNPJ *</Label>
                    <Input
                      id="cpf"
                      value={customerData.cpf_cnpj}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={customerData.phone}
                      onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Cartão (se necessário) */}
              {billingType === 'CREDIT_CARD' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-montserrat font-semibold">Dados do Cartão</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="cardHolder">Nome no Cartão *</Label>
                    <Input
                      id="cardHolder"
                      value={creditCard.holderName}
                      onChange={(e) => handleCreditCardChange('holderName', e.target.value)}
                      placeholder="Nome como no cartão"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardNumber">Número do Cartão *</Label>
                    <Input
                      id="cardNumber"
                      value={creditCard.number}
                      onChange={(e) => handleCreditCardChange('number', e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expMonth">Mês *</Label>
                      <Input
                        id="expMonth"
                        value={creditCard.expiryMonth}
                        onChange={(e) => handleCreditCardChange('expiryMonth', e.target.value)}
                        placeholder="12"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expYear">Ano *</Label>
                      <Input
                        id="expYear"
                        value={creditCard.expiryYear}
                        onChange={(e) => handleCreditCardChange('expiryYear', e.target.value)}
                        placeholder="2030"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV *</Label>
                      <Input
                        id="cvv"
                        value={creditCard.cvv}
                        onChange={(e) => handleCreditCardChange('cvv', e.target.value)}
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Informações de Segurança */}
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Seus dados estão protegidos com criptografia SSL. Processamento seguro via Asaas.
                </AlertDescription>
              </Alert>

              {/* Botão de Retry (aparece quando há erro de servidor) */}
              {showRetryButton && !isLoading && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertDescription className="text-orange-800 flex items-center justify-between">
                    <span>⚠️ Problema temporário detectado. Você pode tentar novamente.</span>
                    <Button
                      onClick={handleRetry}
                      className="ml-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm"
                    >
                      Tentar Novamente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleSubmit()}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      {plan.isRecurring ? 'Criar Assinatura' : 'Finalizar Compra'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal do PIX */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        paymentData={{
          id: paymentResult?.payment?.id?.toString() || paymentResult?.subscription?.id?.toString() || '',
          subscriptionId: paymentResult?.subscription?.id?.toString(),
          isSubscription: !!paymentResult?.subscription,
          qrCode: paymentResult?.payment_info?.pix_qr_code || paymentResult?.pix_qr_code || null,
          pixCopyPaste: paymentResult?.payment_info?.pix_copy_paste || paymentResult?.pix_copy_paste || null,
          value: plan.price,
          planName: plan.name
        }}
        onPaymentConfirmed={handlePaymentConfirmed}
      />

      {/* Modal de processamento do cartão */}
      <CreditCardProcessingModal
        isOpen={showCardProcessingModal}
        onClose={() => setShowCardProcessingModal(false)}
        paymentData={{
          id: paymentResult?.payment?.id || paymentResult?.subscription?.id || '',
          value: plan.price,
          planName: plan.name,
          status: paymentResult?.payment?.status || paymentResult?.subscription?.status || 'PENDING'
        }}
        onPaymentResult={handlePaymentResult}
      />
    </>
  );
}
