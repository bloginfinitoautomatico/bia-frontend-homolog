import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  XCircle, 
  CreditCard, 
  Copy,
  CheckCircle,
  Info
} from '../icons';
import { subscriptionService } from '../../services/subscriptionService';
import { toast } from 'sonner';

interface TestCard {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
  description: string;
}

interface TestCreditCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard?: (card: TestCard) => void;
}

export function TestCreditCardsModal({ isOpen, onClose, onSelectCard }: TestCreditCardsModalProps) {
  const [testCards, setTestCards] = useState<Record<string, TestCard>>({});
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTestCards();
    }
  }, [isOpen]);

  const loadTestCards = async () => {
    setIsLoading(true);
    try {
      const result = await subscriptionService.getTestCreditCards();
      
      if (result.success) {
        setTestCards(result.data.test_cards || {});
        setEnvironmentInfo(result.data.environment);
      } else {
        toast.error(result.error || 'Erro ao carregar cartões de teste');
      }
    } catch (error) {
      console.error('Erro ao carregar cartões de teste:', error);
      toast.error('Erro ao carregar cartões de teste');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const getCardTypeFromNumber = (number: string) => {
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5')) return 'MasterCard';
    return 'Cartão';
  };

  const getStatusColor = (key: string) => {
    if (key.includes('approved')) return 'bg-green-100 text-green-800';
    if (key.includes('insufficient')) return 'bg-yellow-100 text-yellow-800';
    if (key.includes('rejected')) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (key: string) => {
    if (key.includes('approved')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (key.includes('insufficient')) return <Info className="w-4 h-4 text-yellow-600" />;
    if (key.includes('rejected')) return <XCircle className="w-4 h-4 text-red-600" />;
    return <CreditCard className="w-4 h-4 text-blue-600" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <CardTitle className="font-poppins text-xl">
                  Cartões de Teste
                </CardTitle>
              </div>
              <Button onClick={onClose}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Informações do Ambiente */}
            {environmentInfo && (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Ambiente:</strong> {environmentInfo.environment}</p>
                    <p><strong>URL:</strong> {environmentInfo.base_url}</p>
                    <p><strong>Modo Teste:</strong> {environmentInfo.is_test ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando cartões de teste...</p>
              </div>
            ) : Object.keys(testCards).length === 0 ? (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Cartões de teste não estão disponíveis neste ambiente.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Instruções */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Como usar os cartões de teste:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use estes cartões apenas em ambiente de desenvolvimento/teste</li>
                    <li>• Nenhuma cobrança real será feita</li>
                    <li>• Clique em um cartão para preencher automaticamente no formulário</li>
                    <li>• Cada cartão simula um comportamento diferente</li>
                  </ul>
                </div>

                {/* Lista de Cartões */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(testCards).map(([key, card]) => (
                    <Card 
                      key={key} 
                      className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-purple-300 ${
                        onSelectCard ? 'hover:bg-purple-50' : ''
                      }`}
                      onClick={() => onSelectCard && onSelectCard(card)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(key)}
                            <span className="font-montserrat font-semibold text-sm">
                              {getCardTypeFromNumber(card.number)}
                            </span>
                          </div>
                          <Badge className={getStatusColor(key)}>
                            {card.description.split(' - ')[1] || 'Teste'}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Número:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{card.number}</span>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(card.number, 'Número do cartão');
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Validade:</span>
                            <span className="font-mono text-sm">{card.expiryMonth}/{card.expiryYear}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">CVV:</span>
                            <span className="font-mono text-sm">{card.cvv}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Nome:</span>
                            <span className="text-sm">{card.holderName}</span>
                          </div>
                        </div>

                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          {card.description}
                        </div>

                        {onSelectCard && (
                          <div className="mt-3 text-center">
                            <span className="text-xs text-purple-600 font-medium">
                              Clique para usar este cartão
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Avisos */}
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Estes cartões são apenas para testes. Use o cartão "Aprovado" 
                    para simular pagamentos bem-sucedidos, e os outros para testar cenários de erro.
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Botão de Fechar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onClose}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}