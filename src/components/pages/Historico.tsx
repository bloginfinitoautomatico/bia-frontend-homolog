import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { History, CheckCircle, ExternalLink, CalendarDays, Globe, FileText, Clock, Eye, BarChart3, Star, Calendar as CalendarIcon, Monitor } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useCredits } from '../../hooks/useCredits';
import { getPlanLimits } from '../../utils/constants';
import { getSiteName } from '../../utils/siteUtils';

interface HistoricoProps {
  userData: any;
}

export function Historico({ userData }: HistoricoProps) {
  const { state } = useBia();
  const { dashboardData, loading } = useDashboard();
  const availableCredits = useCredits();
  const [sortBy, setSortBy] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Usar dados do Dashboard ou fallback para o userData
  const planLimits = dashboardData?.limits || (() => {
    const basePlanLimits = getPlanLimits(userData?.plano || 'Free');
    const extraCredits = userData?.quotas?.artigos || 0;
    return {
      ...basePlanLimits,
      articles: basePlanLimits.articles + extraCredits
    };
  })();

  const getFilteredArticles = () => {
    let filtered = state.articles.filter(a => a.status !== 'Excluído');
    
    // Filtro por status
    if (filterStatus !== 'all') {
      if (filterStatus === 'Produzidos') {
        // PRODUZIDOS = todos os artigos que foram gerados (qualquer status exceto exclusão)
        filtered = filtered.filter(article => 
          article.status !== 'Excluído' && 
          article.status !== 'Publicado' && 
          article.status !== 'Agendado'
        );
      } else if (filterStatus === 'Publicado') {
        filtered = filtered.filter(article => article.status === 'Publicado');
      } else if (filterStatus === 'Agendado') {
        filtered = filtered.filter(article => article.status === 'Agendado');
      } else {
        filtered = filtered.filter(article => article.status === filterStatus);
      }
    }

    // Filtro por site (usando sortBy que agora é o filtro de site)
    if (sortBy !== 'all') {
      const siteId = parseInt(sortBy);
      filtered = filtered.filter(article => article.siteId === siteId);
    }

    // Ordenar sempre por data (mais recente primeiro) - PRIORIDADE: publishedAt > scheduledDate > updatedAt > createdAt
    return filtered.sort((a, b) => {
      // Para artigos publicados, usar data de publicação
      const dateA = a.publishedAt || a.publishedDate || a.scheduledDate || a.updatedAt || a.createdAt;
      const dateB = b.publishedAt || b.publishedDate || b.scheduledDate || b.updatedAt || b.createdAt;
      
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  };

  const filteredArticles = getFilteredArticles();
  
  // Usar dados reais do Dashboard (mesma lógica das outras páginas)
  const realArticleCount = dashboardData?.usage?.articles?.total ?? state.articles?.filter(a => a.status !== 'Excluído').length ?? 0;
  const publishedCount = dashboardData?.usage?.articles?.published ?? state.articles?.filter(a => a.status === 'Publicado').length ?? 0;
  
  // Artigos produzidos = todos os artigos que foram gerados (consumiram crédito)
  // Excluir apenas os que foram deletados, publicados ou agendados (que têm status específicos)
  const producedArticles = state.articles.filter(a => 
    a.status !== 'Excluído' && 
    a.status !== 'Publicado' && 
    a.status !== 'Agendado'
  );
  const publishedArticles = state.articles.filter(a => a.status === 'Publicado');
  const scheduledArticles = state.articles.filter(a => a.status === 'Agendado');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    // Ícones baseados nos 3 status do sistema
    
    // PUBLICADO = CheckCircle
    if (status === 'Publicado') {
      return <CheckCircle className="h-4 w-4" style={{ color: '#8c52ff' }} />;
    }
    
    // AGENDADO = Clock
    if (status === 'Agendado') {
      return <Clock className="h-4 w-4" style={{ color: '#8c52ff' }} />;
    }
    
    // PRODUZIDO = FileText (todos os outros status)
    return <FileText className="h-4 w-4" style={{ color: '#8c52ff' }} />;
  };

  const getStatusBadgeClass = (status: string) => {
    // Cores baseadas nos 3 status do sistema
    
    // PUBLICADO = Verde
    if (status === 'Publicado') {
      return 'border-green-200 text-green-700 bg-green-50';
    }
    
    // AGENDADO = Laranja  
    if (status === 'Agendado') {
      return 'border-orange-200 text-orange-700 bg-orange-50';
    }
    
    // PRODUZIDO = Azul (todos os outros status)
    // Rascunho, Concluído, Processado, Produzido, Produzindo, Em Revisão, Pendente
    return 'border-blue-200 text-blue-700 bg-blue-50';
  };

  const getStatusDisplayName = (status: string) => {
    // Simplificar: apenas 3 status existem no sistema
    // PRODUZIDO = qualquer artigo que foi gerado (consumiu crédito)
    if (status === 'Rascunho' || 
        status === 'Concluído' || 
        status === 'Processado' || 
        status === 'Produzido' ||
        status === 'Produzindo' ||
        status === 'Em Revisão' ||
        status === 'Pendente') {
      return 'Produzido';
    }
    
    // PUBLICADO = artigo que está online
    if (status === 'Publicado') {
      return 'Publicado';
    }
    
    // AGENDADO = artigo programado para publicar
    if (status === 'Agendado') {
      return 'Agendado';
    }
    
    // Fallback para qualquer outro status
    return 'Produzido';
  };

  // Função para limpar HTML e extrair texto para preview
  const getCleanPreview = (htmlContent: string, maxLength: number = 200) => {
    // Remover apenas tags específicas mantendo quebras de linha importantes
    let cleanContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<\/?(?:div|span|p|br|h[1-6])[^>]*>/gi, ' ') // Remove divs, spans, p, br, headings
      .replace(/<[^>]*>/g, '') // Remove outras tags
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    // Truncar se necessário
    return cleanContent.length > maxLength 
      ? `${cleanContent.substring(0, maxLength)}...` 
      : cleanContent;
  };

  // Função para visualizar artigo em nova janela
  const visualizarArtigo = (article: any) => {
    // Debug logs
    console.log('Artigo para visualização:', article);
    console.log('ImageUrl:', article.imageUrl);
    
    // Preparar dados antes de usar na string HTML
    const siteName = article.siteId 
      ? getSiteName(state.sites, article.siteId)
      : '';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${article.titulo}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: 'Georgia', serif; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px; 
              line-height: 1.6; 
              background-color: #f9f9f9;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 { 
              color: #333; 
              border-bottom: 3px solid #8c52ff; 
              padding-bottom: 15px;
              margin-bottom: 20px;
              font-size: 28px;
            }
            .meta { 
              color: #666; 
              font-size: 14px; 
              margin-bottom: 30px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #8c52ff;
            }
            .featured-image {
              margin: 30px 0;
              text-align: center;
              background-color: #f0f0f0;
              padding: 20px;
              border-radius: 10px;
            }
            .featured-image img {
              max-width: 100%;
              height: auto;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .no-image {
              color: #666;
              font-style: italic;
              text-align: center;
              padding: 40px;
              background-color: #f8f9fa;
              border: 2px dashed #ddd;
              border-radius: 10px;
            }
            .content { 
              font-size: 16px; 
              color: #444;
              line-height: 1.8;
            }
            .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
              color: #333;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            .content p {
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${article.titulo}</h1>
            <div class="meta">
              <strong>Status:</strong> ${getStatusDisplayName(article.status)} | 
              <strong>Atualizado em:</strong> ${formatDate(article.updatedAt)}
              ${siteName ? ` | <strong>Site:</strong> ${siteName}` : ''}
            </div>
            ${article.imageUrl ? `
              <div class="featured-image">
                <img src="${article.imageUrl}" alt="${article.titulo}" onload="console.log('✅ Imagem carregada:', this.src)" onerror="console.error('❌ Erro ao carregar imagem:', this.src)" />
              </div>
            ` : `
              <div class="no-image">
                📷 Nenhuma imagem disponível para este artigo
              </div>
            `}
            <div class="content">
              ${article.conteudo || '<p>Conteúdo não disponível</p>'}
            </div>
          </div>
        </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Histórico de Artigos
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Acompanhe todos os artigos processados, suas atividades e estatísticas detalhadas na plataforma BIA • <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">📅 Ordenado do mais recente para o mais antigo</span>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="space-y-2">
            <label className="font-montserrat text-sm font-medium text-gray-700">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 font-montserrat">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Produzidos">Produzidos</SelectItem>
                <SelectItem value="Publicado">Publicados</SelectItem>
                <SelectItem value="Agendado">Agendados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="font-montserrat text-sm font-medium text-gray-700">Site</label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40 font-montserrat">
                <SelectValue placeholder="Todos os Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Sites</SelectItem>
                {state.sites.map(site => (
                  <SelectItem key={site.id} value={site.id.toString()}>{site.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Estatísticas - Padronizado com estilo das Ações Rápidas */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Estatísticas do Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <FileText size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{availableCredits.articles}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    de {planLimits.articles} do seu plano
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ExternalLink size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Publicados</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{publishedCount}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Artigos online
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Clock size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Agendados</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{scheduledArticles.length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Aguardando publicação
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Artigos */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <History size={20} style={{ color: '#8c52ff' }} />
            <span>
              {filterStatus === 'all' 
                ? `Histórico Completo (${filteredArticles.length})` 
                : `Artigos ${filterStatus} (${filteredArticles.length})`
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredArticles.length > 0 ? (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div key={article.id} className="border-border bg-card p-6 rounded-lg border hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(article.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-poppins text-lg font-medium text-foreground flex-1 mr-4">{article.titulo}</h3>
                        <Badge className={`flex-shrink-0 ${getStatusBadgeClass(article.status)}`}>
                          {getStatusDisplayName(article.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {/* Mostrar data mais relevante primeiro (conforme ordenação) */}
                        {(article.publishedDate || article.publishedAt) ? (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle size={14} style={{ color: '#10b981' }} />
                            <span className="font-montserrat text-muted-foreground">
                              <strong>Publicado:</strong> {formatDate(article.publishedDate || article.publishedAt || '')}
                            </span>
                          </div>
                        ) : article.scheduledDate ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock size={14} style={{ color: '#f59e0b' }} />
                            <span className="font-montserrat text-muted-foreground">
                              <strong>Agendado:</strong> {formatDate(article.scheduledDate)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon size={14} style={{ color: '#8c52ff' }} />
                            <span className="font-montserrat text-muted-foreground">
                              <strong>Criado:</strong> {formatDate(article.createdAt)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Atualizado: {formatDate(article.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Monitor size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Site: {article.siteId 
                              ? getSiteName(state.sites, article.siteId)
                              : 'Não vinculado'}
                          </span>
                        </div>
                      </div>

                      {article.scheduledDate && (
                        <div className="mt-4 p-3 bg-orange-50/50 rounded-lg border border-orange-200/50">
                          <div className="flex items-center gap-2">
                            <Clock size={14} style={{ color: '#f59e0b' }} />
                            <p className="font-montserrat text-sm text-orange-700">
                              Agendado para: {formatDate(article.scheduledDate)}
                            </p>
                          </div>
                        </div>
                      )}

                      {article.publishedDate && (
                        <div className="mt-4 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} style={{ color: '#10b981' }} />
                            <p className="font-montserrat text-sm text-green-700">
                              Publicado em: {formatDate(article.publishedDate)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Preview do artigo */}
                      {article.conteudo && (
                        <div className="mt-4 p-4 bg-gray-50/50 rounded-lg border border-gray-200/50">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText size={16} style={{ color: '#8c52ff' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-montserrat text-sm font-medium text-gray-700 mb-2">
                                Preview do Artigo
                              </p>
                              <div className="prose prose-sm max-w-none">
                                <div className="font-montserrat text-sm text-gray-600 leading-relaxed" 
                                   style={{
                                     display: '-webkit-box',
                                     WebkitLineClamp: 3,
                                     WebkitBoxOrient: 'vertical',
                                     overflow: 'hidden'
                                   }}>
                                  {getCleanPreview(article.conteudo)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                        <Button
                          className="font-montserrat text-sm text-white"
                          style={{ backgroundColor: '#8c52ff' }}
                          onClick={() => visualizarArtigo(article)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </Button>
                        
                        {article.wpPostUrl && (
                          <Button
                            className="font-montserrat text-sm"
                            onClick={() => window.open(article.wpPostUrl, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver no Site
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mx-auto mb-6">
                <History size={32} style={{ color: '#8c52ff' }} />
              </div>
              <h3 className="font-poppins text-xl text-foreground mb-2">
                {filterStatus === 'all' 
                  ? 'Nenhum artigo no histórico' 
                  : `Nenhum artigo com status "${filterStatus}"`
                }
              </h3>
              <p className="font-montserrat text-muted-foreground mb-6">
                {filterStatus === 'all' 
                  ? 'Você ainda não possui artigos processados na plataforma BIA.' 
                  : 'Tente alterar o filtro ou produzir mais artigos.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  className="font-montserrat text-white"
                  style={{ backgroundColor: '#8c52ff' }}
                  onClick={() => window.location.hash = 'articles'}
                >
                  Produzir Artigos
                </Button>
                {filterStatus !== 'all' && (
                  <Button
                    className="font-montserrat text-sm bg-white hover:bg-purple-50 rounded"
                    style={{ 
                      borderColor: '#8c52ff', 
                      color: '#8c52ff',
                      border: '1px solid #8c52ff'
                    }}
                    onClick={() => setFilterStatus('all')}
                  >
                    Ver Todos os Artigos
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
