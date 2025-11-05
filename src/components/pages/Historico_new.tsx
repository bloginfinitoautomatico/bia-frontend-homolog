import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { History, CheckCircle, ExternalLink, CalendarDays, Globe, FileText, Clock, Eye, BarChart3, Star, Calendar as CalendarIcon, Monitor } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { getPlanLimits } from '../../utils/constants';

interface HistoricoProps {
  userData: any;
}

export function Historico({ userData }: HistoricoProps) {
  const { state } = useBia();
  const { dashboardData, loading } = useDashboard();
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
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
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(article => article.status === filterStatus);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      } else {
        return a.titulo.localeCompare(b.titulo);
      }
    });
  };

  const filteredArticles = getFilteredArticles();
  const producedArticles = state.articles.filter(a => a.status === 'Concluído' || a.status === 'Publicado');
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
    switch (status) {
      case 'Publicado':
        return <CheckCircle className="h-4 w-4" style={{ color: '#8c52ff' }} />;
      case 'Concluído':
        return <FileText className="h-4 w-4" style={{ color: '#8c52ff' }} />;
      case 'Agendado':
        return <Clock className="h-4 w-4" style={{ color: '#8c52ff' }} />;
      default:
        return <History className="h-4 w-4" style={{ color: '#8c52ff' }} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Publicado':
        return 'border-green-200 text-green-700 bg-green-50';
      case 'Concluído':
        return 'border-blue-200 text-blue-700 bg-blue-50';
      case 'Agendado':
        return 'border-orange-200 text-orange-700 bg-orange-50';
      case 'Produzindo':
        return 'border-purple-200 text-purple-700 bg-purple-50';
      default:
        return 'border-gray-200 text-gray-700 bg-gray-50';
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
            Acompanhe todos os artigos processados, suas atividades e estatísticas detalhadas na plataforma BIA
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 font-montserrat">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Produzindo">Produzindo</SelectItem>
              <SelectItem value="Publicado">Publicado</SelectItem>
              <SelectItem value="Agendado">Agendado</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40 font-montserrat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Por Data</SelectItem>
              <SelectItem value="title">Por Título</SelectItem>
            </SelectContent>
          </Select>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <FileText size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Total de Artigos</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{state.articles.length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Artigos processados
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Produzidos</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{producedArticles.length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    de {planLimits.articles} créditos
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
                  <p className="font-poppins text-xl font-medium text-foreground">{publishedArticles.length}</p>
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
                          {article.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Criado: {formatDate(article.createdAt)}
                          </span>
                        </div>
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
                              ? state.sites.find(s => s.id === article.siteId)?.nome || 'Site não encontrado'
                              : 'Não vinculado'}
                          </span>
                        </div>
                      </div>

                      {article.conteudo && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                          <p className="font-montserrat text-sm text-muted-foreground line-clamp-3">
                            {article.conteudo.length > 200 
                              ? `${article.conteudo.substring(0, 200)}...` 
                              : article.conteudo
                            }
                          </p>
                        </div>
                      )}

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

                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                        <Button
                          className="font-montserrat text-sm"
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
                    variant="outline"
                    className="font-montserrat text-sm rounded"
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
