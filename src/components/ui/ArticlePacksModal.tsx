import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  XCircle, 
  Package, 
  FileText, 
  Zap,
  Star,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  Info
} from '../icons';
import { toast } from 'sonner';
import { useBia } from '../BiaContext';
import { CheckoutModal } from './CheckoutModal';
import { subscriptionService } from '../../services/subscriptionService';

interface ArticlePack {
  id: string | number;
  name: string;
  articles: number;
  price: number;
  originalPrice?: number;
  description: string;
  popular?: boolean;
  badge?: string;
  savings?: string;
}

interface ArticlePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}

export function ArticlePacksModal({ isOpen, onClose, userData }: ArticlePacksModalProps) {
  const { state } = useBia();
  const [selectedPack, setSelectedPack] = useState<ArticlePack | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePacks, setAvailablePacks] = useState<ArticlePack[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadArticlePacks();
    }
  }, [isOpen]);

  const loadArticlePacks = async () => {
    setIsLoadingPacks(true);
    try {
      const response = await fetch('/api/subscriptions/article-packs');
      if (response.ok) {
        const data = await response.json();
        
        // Converter dados do backend para o formato do componente
        const packs = data.article_packs.map((pack: any) => ({
          id: Number(pack.id), // Garantir que seja number
          name: pack.name,
          articles: extractArticleCount(pack.name),
          price: pack.price,
          originalPrice: calculateOriginalPrice(pack.price),
          description: generateDescription(pack.name), // Usar função que gera descrição com preço por artigo
          popular: isPopularPack(pack.name),
          badge: generateBadge(pack.name),
          savings: calculateSavings(pack.price, calculateOriginalPrice(pack.price))
        }));

        setAvailablePacks(packs);
      } else {
        console.error('Erro ao carregar packs:', response.statusText);
        // Fallback para dados mockados em caso de erro
        setAvailablePacks(articlePacks);
      }
    } catch (error) {
      console.error('Erro ao carregar packs:', error);
      // Fallback para dados mockados em caso de erro
      setAvailablePacks(articlePacks);
    } finally {
      setIsLoadingPacks(false);
    }
  };

  // Funções auxiliares para processar dados do backend
  const extractArticleCount = (planName: string): number => {
    const match = planName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const calculateOriginalPrice = (price: number): number => {
    // Simular preços originais baseado nos preços atuais (25-37% de desconto)
    return Math.round(price * 1.35);
  };

  const generateDescription = (planName: string): string => {
    const articles = extractArticleCount(planName);
    const price = getPriceForArticles(articles);
    const pricePerArticle = price / articles;
    
    return `R$ ${pricePerArticle.toFixed(2).replace('.', ',')} por artigo`;
  };

  const getPriceForArticles = (articles: number): number => {
    switch (articles) {
      case 50: return 85;
      case 100: return 160;
      case 200: return 270;
      case 300: return 420;
      case 500: return 650;
      case 1000: return 1300;
      default: return articles * 2.60; // Fallback com preço médio
    }
  };

  const isPopularPack = (planName: string): boolean => {
    return planName.includes('100');
  };

  const generateBadge = (planName: string): string => {
    const articles = extractArticleCount(planName);
    if (articles <= 50) return 'Econômico';
    if (articles <= 100) return 'Mais Popular';
    if (articles <= 200) return 'Melhor Custo';
    if (articles <= 300) return 'Empresarial';
    if (articles <= 500) return 'Agências';
    return 'Enterprise';
  };

  const calculateSavings = (currentPrice: number, originalPrice: number): string => {
    const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    return `${discount}% OFF`;
  };

  // Dados dos packs de artigos (fallback)
  const articlePacks: ArticlePack[] = [
    {
      id: '5',
      name: '50 Artigos',
      articles: 50,
      price: 120,
      originalPrice: 160,
      description: 'R$ 2,40 por artigo',
      badge: 'Econômico',
      savings: '23% OFF'
    },
    {
      id: '6',
      name: '100 Artigos',
      articles: 100,
      price: 180,
      originalPrice: 240,
      description: 'R$ 1,80 por artigo',
      popular: true,
      badge: 'Mais Popular',
      savings: '25% OFF'
    },
    {
      id: '7',
      name: '200 Artigos',
      articles: 200,
      price: 320,
      originalPrice: 440,
      description: 'R$ 1,60 por artigo',
      badge: 'Melhor Custo',
      savings: '27% OFF'
    },
    {
      id: '8',
      name: '300 Artigos',
      articles: 300,
      price: 450,
      originalPrice: 630,
      description: 'R$ 1,50 por artigo',
      badge: 'Empresarial',
      savings: '29% OFF'
    },
    {
      id: '9',
      name: '500 Artigos',
      articles: 500,
      price: 700,
      originalPrice: 1000,
      description: 'R$ 1,40 por artigo',
      badge: 'Agências',
      savings: '30% OFF'
    },
    {
      id: '10',
      name: '1000 Artigos',
      articles: 1000,
      price: 1200,
      originalPrice: 1700,
      description: 'R$ 1,20 por artigo',
      badge: 'Corporativo',
      savings: '29% OFF'
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const calculatePricePerArticle = (price: number, articles: number) => {
    return price / articles;
  };

  const handleSelectPack = (pack: ArticlePack) => {
    setSelectedPack(pack);
    setShowCheckout(true);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    setSelectedPack(null);
  };

  const handleCheckoutSuccess = async (data: any) => {
    try {
      // O CheckoutModal já fará o hard refresh automático
      toast.success('Pack de artigos adquirido com sucesso!');
      handleCheckoutClose();
      onClose();
    } catch (error) {
      console.error('Erro ao processar sucesso do checkout:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <Card className="border-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-poppins text-2xl flex items-center gap-2">
                    <Package className="w-7 h-7 text-purple-600" />
                    Packs de Artigos
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Compre créditos avulsos para produzir mais artigos além do seu plano
                  </p>
                </div>
                <Button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Informações importantes */}
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Como funcionam os packs:</strong> Os créditos são adicionados à sua conta e podem ser usados a qualquer momento, sem prazo de validade. Cada artigo produzido consome 1 crédito.
                </AlertDescription>
              </Alert>

              {/* Loading State */}
              {isLoadingPacks && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Carregando packs de artigos...</p>
                </div>
              )}

              {/* Grid de packs */}
              {!isLoadingPacks && availablePacks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availablePacks.map((pack) => (
                    <Card 
                      key={pack.id} 
                      className={`relative transition-all duration-200 hover:shadow-lg cursor-pointer border-2 ${
                        pack.popular 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-200'
                      }`}
                      onClick={() => handleSelectPack(pack)}
                    >
                      {pack.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-purple-600 text-white px-3 py-1">
                            <Star className="w-3 h-3 mr-1" />
                            {pack.badge}
                          </Badge>
                        </div>
                      )}

                      {!pack.popular && pack.badge && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="text-xs">
                            {pack.badge}
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="text-center pb-3">
                        <div className="flex flex-col items-center justify-center mb-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                            <FileText className="w-6 h-6 text-purple-600" />
                          </div>
                          
                          <CardTitle className="font-montserrat text-lg">
                            {pack.name}
                          </CardTitle>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            {pack.originalPrice && (
                              <span className="text-sm text-gray-500 line-through">
                                {formatPrice(pack.originalPrice)}
                              </span>
                            )}
                            <span className="text-2xl font-bold" style={{color: '#8c52ff'}}>
                              {formatPrice(pack.price)}
                            </span>
                          </div>
                          
                          {pack.savings && (
                            <div className="text-sm text-green-600 font-semibold">
                              {pack.savings}
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-4">
                        <p className="text-gray-600 text-sm text-center">
                          {pack.description}
                        </p>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Artigos inclusos:</span>
                            <span className="font-semibold">{pack.articles}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Preço por artigo:</span>
                            <span className="font-semibold text-green-600">
                              {formatPrice(calculatePricePerArticle(pack.price, pack.articles))}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Validade:</span>
                            <span className="font-semibold" style={{color: '#8c52ff'}}>Sem prazo</span>
                          </div>
                        </div>

                        <Button 
                          className={`w-full mt-4 ${
                            pack.popular 
                              ? 'bg-purple-600 hover:bg-purple-700' 
                              : 'border border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white'
                          }`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Comprar Agora
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoadingPacks && availablePacks.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-poppins text-xl text-gray-600 mb-2">
                    Nenhum pack disponível
                  </h3>
                  <p className="text-gray-500">
                    Não foi possível carregar os packs de artigos no momento.
                  </p>
                </div>
              )}

              {/* Informações adicionais */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-montserrat font-semibold mb-3">Por que comprar packs de artigos?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Créditos sem prazo de validade</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Use quando precisar</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Preços mais baixos que planos mensais</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ideal para projetos específicos</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de checkout */}
      {showCheckout && selectedPack && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={handleCheckoutClose}
          plan={{
            id: Number(selectedPack.id), // Garantir conversão para number
            name: selectedPack.name,
            price: selectedPack.price,
            description: `${selectedPack.articles} artigos para produção`,
            isRecurring: false, // Packs são pagamentos únicos
          }}
          userData={userData}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </>
  );
}
