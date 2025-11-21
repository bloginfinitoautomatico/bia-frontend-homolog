import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Trash2, XCircle, RotateCcw, Clock, CheckCircle, AlertCircle, Star, BarChart3, Calendar as CalendarIcon, Monitor, Loader2 } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { toast } from 'sonner';

interface ExcluidosProps {
  userData: any;
}

export function Excluidos({ userData }: ExcluidosProps) {
  const { state, actions } = useBia();
  const { dashboardData } = useDashboard();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  
  // Estados para ações em massa
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<number[]>([]);
  const [isRestoringBatch, setIsRestoringBatch] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Filtrar ideias baseado nos filtros selecionados
  const getAllIdeasByStatus = () => {
    if (filterStatus === 'all') {
      return state.ideas; // Todas as ideias
    } else {
      return state.ideas.filter(idea => idea.status === filterStatus);
    }
  };

  const getFilteredIdeias = () => {
    let filtered = getAllIdeasByStatus();
    
    // Filtro por site
    if (filterSite !== 'all') {
      const siteId = parseInt(filterSite);
        filtered = filtered.filter(idea => 
          idea.siteId === siteId || 
          idea.siteId.toString() === siteId.toString()
        );
    }
    
    // Ordenação sempre por data (mais recente primeiro)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  const filteredIdeias = getFilteredIdeias();

  // Reset seleção quando filtros mudarem
  React.useEffect(() => {
    setSelectedIdeaIds([]);
  }, [filterStatus, filterSite]);

  const handleRestore = (ideaId: number) => {
    try {
      actions.updateIdea(ideaId, { 
        status: 'ativa' // Restaurar para status ativo (aparecerá na página "Produzir Artigos")
      });
      
      toast.success('Ideia restaurada e movida para "Produzir Artigos"!');
    } catch (error) {
      console.error('Erro ao restaurar ideia:', error);
      toast.error('Erro ao restaurar ideia');
    }
  };

  const handlePermanentDelete = (ideaId: number) => {
    try {
      // Excluir permanentemente do estado
      actions.deleteIdea(ideaId);
      
      toast.success('Ideia excluída permanentemente!');
    } catch (error) {
      console.error('Erro ao excluir permanentemente ideia:', error);
      toast.error('Erro ao excluir permanentemente ideia');
    }
  };

  // Funções para seleção em massa
  const handleSelectIdea = (ideaId: number, checked: boolean) => {
    setSelectedIdeaIds(prev => {
      if (checked) {
        return [...prev, ideaId];
      } else {
        return prev.filter(id => id !== ideaId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = filteredIdeias.map(idea => idea.id);
      setSelectedIdeaIds(currentPageIds);
    } else {
      setSelectedIdeaIds([]);
    }
  };

  const getFilteredIdeias = () => {
    let filtered = getAllIdeasByStatus();
    
    // Filtro por site - compatível com UUIDs
    if (filterSite !== 'all') {
      filtered = filtered.filter(idea => 
        idea.siteId === filterSite || 
        idea.siteId.toString() === filterSite.toString()
      );
    }
    
    // Ordenação sempre por data (mais recente primeiro)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  };

  const handleRestore = (ideaId: number) => {
    try {
      actions.updateIdea(ideaId, { 
        status: 'ativa' // Restaurar para status ativo (aparecerá na página "Produzir Artigos")
      });
      
      toast.success('Ideia restaurada e movida para "Produzir Artigos"!');
    } catch (error) {
      console.error('Erro ao restaurar ideia:', error);
      toast.error('Erro ao restaurar ideia');
    }
  };

  const handlePermanentDelete = (ideaId: number) => {
    try {
      // Excluir permanentemente do estado
      actions.deleteIdea(ideaId);
      
      toast.success('Ideia excluída permanentemente!');
    } catch (error) {
      console.error('Erro ao excluir permanentemente ideia:', error);
      toast.error('Erro ao excluir permanentemente ideia');
    }
  };

  // Funções para seleção em massa
  const handleSelectIdea = (ideaId: number, checked: boolean) => {
    setSelectedIdeaIds(prev => {
      if (checked) {
        return [...prev, ideaId];
      } else {
        return prev.filter(id => id !== ideaId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = filteredIdeias.map(idea => idea.id);
      setSelectedIdeaIds(currentPageIds);
    } else {
      setSelectedIdeaIds([]);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIdeaIds.length === 0) {
      toast.error('Selecione pelo menos uma ideia para restaurar');
      return;
    }

    if (!confirm(`Tem certeza que deseja restaurar ${selectedIdeaIds.length} ideia(s)? Elas serão movidas para "Produzir Artigos".`)) {
      return;
    }

    setIsRestoringBatch(true);
    let successCount = 0;

    try {
      for (const ideaId of selectedIdeaIds) {
        try {
          const success = actions.updateIdea(ideaId, { status: 'ativa' });
          if (success) {
            successCount++;
          }
        } catch (error) {
          console.error(`Erro ao restaurar ideia ${ideaId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ideia(s) restaurada(s) e movida(s) para "Produzir Artigos"!`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Nenhuma ideia foi restaurada');
      }
    } catch (error) {
      console.error('Erro na restauração em massa:', error);
      toast.error('Erro na restauração em massa');
    } finally {
      setIsRestoringBatch(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIdeaIds.length === 0) {
      toast.error('Selecione pelo menos uma ideia para excluir');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir permanentemente ${selectedIdeaIds.length} ideia(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeletingBatch(true);
    let successCount = 0;

    try {
      for (const ideaId of selectedIdeaIds) {
        try {
          actions.deleteIdea(ideaId);
          successCount++;
        } catch (error) {
          console.error(`Erro ao excluir ideia ${ideaId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ideia(s) excluída(s) permanentemente!`);
        setSelectedIdeaIds([]);
      } else {
        toast.error('Nenhuma ideia foi excluída');
      }
    } catch (error) {
      console.error('Erro na exclusão em massa:', error);
      toast.error('Erro na exclusão em massa');
    } finally {
      setIsDeletingBatch(false);
    }
  };

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

  const filteredIdeias = getFilteredIdeias();

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Filtrar Ideias por Status
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Visualize e gerencie todas as suas ideias organizadas por status e site
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
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="produzido">Produzidas</SelectItem>
                <SelectItem value="excluido">Excluídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="font-montserrat text-sm font-medium text-gray-700">Site</label>
            <Select value={filterSite} onValueChange={(value: any) => setFilterSite(value)}>
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
            Estatísticas por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total de Ideias Filtradas */}
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
              <div className="flex items-center space-x-3">
                <CalendarIcon size={20} style={{ color: '#8c52ff' }} />
                <div>
                  <p className="font-montserrat text-sm text-muted-foreground">
                    {filterStatus === 'all' ? 'Total de Ideias' : 
                     filterStatus === 'ativa' ? 'Ideias Ativas' :
                     filterStatus === 'produzido' ? 'Ideias Produzidas' :
                     'Ideias Excluídas'}
                  </p>
                  <p className="font-poppins text-xl font-medium text-foreground">{filteredIdeias.length}</p>
                </div>
              </div>
            </div>

            {/* Ativas */}
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
              <div className="flex items-center space-x-3">
                <Monitor size={20} style={{ color: '#8c52ff' }} />
                <div>
                  <p className="font-montserrat text-sm text-muted-foreground">Ideias Ativas</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{state.ideas.filter(i => i.status === 'ativa').length}</p>
                </div>
              </div>
            </div>

            {/* Produzidas */}
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(140, 82, 255, 0.1)' }}>
              <div className="flex items-center space-x-3">
                <BarChart3 size={20} style={{ color: '#8c52ff' }} />
                <div>
                  <p className="font-montserrat text-sm text-muted-foreground">Ideias Produzidas</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{state.ideas.filter(i => i.status === 'produzido').length}</p>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>      {/* Lista de Ideias Excluídas */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Trash2 size={20} style={{ color: '#8c52ff' }} />
            <span>
              {filterStatus === 'all' 
                ? `Todas as Ideias (${filteredIdeias.length})`
                : filterStatus === 'ativa' 
                  ? `Ideias Ativas (${filteredIdeias.length})`
                  : filterStatus === 'produzido'
                    ? `Ideias Produzidas (${filteredIdeias.length})`
                    : `Ideias Excluídas (${filteredIdeias.length})`
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIdeias.length > 0 ? (
            <>
              {/* Cabeçalho de Seleção em Massa - apenas para ideias excluídas */}
              {filterStatus === 'excluido' && (
                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border border-gray-200/50 mb-6">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIdeaIds.length === filteredIdeias.length && filteredIdeias.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-[#8c52ff] data-[state=checked]:border-[#8c52ff]"
                    />
                    <span className="font-montserrat text-sm text-gray-700">
                      {selectedIdeaIds.length > 0 
                        ? `${selectedIdeaIds.length} ideia(s) selecionada(s)`
                        : 'Selecionar todas'
                      }
                    </span>
                  </div>
                  
                  {selectedIdeaIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleBatchRestore}
                        disabled={isRestoringBatch || isDeletingBatch}
                        className="font-montserrat text-sm bg-white hover:bg-green-50"
                        style={{ 
                          borderColor: '#10b981', 
                          color: '#10b981',
                          border: '1px solid #10b981'
                        }}
                      >
                        {isRestoringBatch ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restaurando...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restaurar ({selectedIdeaIds.length})
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleBatchDelete}
                        disabled={isRestoringBatch || isDeletingBatch}
                        className="font-montserrat text-sm text-white"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        {isDeletingBatch ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir ({selectedIdeaIds.length})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
              {filteredIdeias.map((idea) => (
                <div key={idea.id} className="border-border bg-card p-6 rounded-lg border hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    {/* Checkbox para seleção (apenas para ideias excluídas) */}
                    {idea.status === 'excluido' && (
                      <div className="flex items-center justify-center pt-1">
                        <Checkbox
                          checked={selectedIdeaIds.includes(idea.id)}
                          onCheckedChange={(checked) => handleSelectIdea(idea.id, checked as boolean)}
                          className="data-[state=checked]:bg-[#8c52ff] data-[state=checked]:border-[#8c52ff]"
                        />
                      </div>
                    )}
                    
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <XCircle size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-poppins text-lg font-medium text-foreground flex-1 mr-4">{idea.titulo}</h3>
                        <Badge className="flex-shrink-0 border-red-200 text-red-700 bg-red-50">
                          <XCircle className="mr-1" size={12} />
                          Excluída
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Criada: {formatDate(idea.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Monitor size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Site: {idea.siteId 
                              ? state.sites.find(s => s.id === idea.siteId)?.nome || 'Site não encontrado'
                              : 'Não vinculado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Star size={14} style={{ color: '#8c52ff' }} />
                          <span className="font-montserrat text-muted-foreground">
                            Categoria: {idea.categoria || 'Não informado'}
                          </span>
                        </div>
                      </div>

                      {idea.tags && idea.tags.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50/50 rounded-lg border border-gray-200/50">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Star size={12} style={{ color: '#8c52ff' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-montserrat text-sm font-medium text-gray-700 mb-2">
                                Tags da Ideia
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {idea.tags.map((tag, index) => (
                                  <Badge key={index} className="border-purple-200 text-purple-700 bg-purple-50 text-xs font-montserrat">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                        {/* Mostrar botões apropriados baseado no status */}
                        {idea.status === 'excluido' && (
                          <>
                            <Button 
                              onClick={() => handleRestore(idea.id)}
                              className="font-montserrat text-sm bg-white hover:bg-green-50"
                              style={{ 
                                borderColor: '#10b981', 
                                color: '#10b981',
                                border: '1px solid #10b981'
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restaurar
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir permanentemente esta ideia? Esta ação não pode ser desfeita.')) {
                                  handlePermanentDelete(idea.id);
                                }
                              }}
                              className="font-montserrat text-sm text-white"
                              style={{ backgroundColor: '#dc2626' }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir Permanentemente
                            </Button>
                          </>
                        )}
                        
                        {/* Para ideias ativas - opção de excluir */}
                        {idea.status === 'ativa' && (
                          <Button 
                            onClick={() => {
                              if (confirm('Tem certeza que deseja mover esta ideia para excluídos?')) {
                                actions.updateIdea(idea.id, { status: 'excluido' });
                                toast.success('Ideia movida para excluídos');
                              }
                            }}
                            className="font-montserrat text-sm text-white"
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        )}
                        
                        {/* Para ideias produzidas - apenas visualização */}
                        {idea.status === 'produzido' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Produzida
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mx-auto mb-6">
                <Trash2 size={32} style={{ color: '#8c52ff' }} />
              </div>
              <h3 className="font-poppins text-xl text-foreground mb-2">
                {filterSite === 'all' 
                  ? 'Nenhuma ideia excluída' 
                  : `Nenhuma ideia excluída no site "${state.sites.find(s => s.id === parseInt(filterSite))?.nome || 'Selecionado'}"`
                }
              </h3>
              <p className="font-montserrat text-muted-foreground mb-6">
                {filterSite === 'all' 
                  ? 'As ideias excluídas aparecerão aqui e poderão ser restauradas para a página "Produzir Artigos".' 
                  : 'Tente alterar o filtro de site ou verificar outras opções.'
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
                {filterSite !== 'all' && (
                  <Button
                    className="font-montserrat text-sm bg-white hover:bg-purple-50 rounded"
                    style={{ 
                      borderColor: '#8c52ff', 
                      color: '#8c52ff',
                      border: '1px solid #8c52ff'
                    }}
                    onClick={() => setFilterSite('all')}
                  >
                    Ver Todos os Sites
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avisos importantes - Padronizado com estilo das outras páginas */}
      <Card className="border-border bg-card" style={{ backgroundColor: '#fff7ed' }}>
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <AlertCircle size={20} style={{ color: '#8c52ff' }} />
            ⚠️ Atenção - Ideias Produzidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-white/60 rounded-lg border border-green-200/50">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw size={16} style={{ color: '#10b981' }} />
                <span className="font-montserrat font-medium text-foreground">Ideias restauradas:</span>
              </div>
              <p className="font-montserrat text-sm text-gray-700">
                Quando você restaurar uma ideia, ela será movida automaticamente para a página "Produzir Artigos", onde poderá ser usada para gerar novos conteúdos.
              </p>
            </div>
            <div className="p-4 bg-white/60 rounded-lg border border-orange-200/50">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} style={{ color: '#8c52ff' }} />
                <span className="font-montserrat font-medium text-foreground">Ao restaurar uma ideia produzida:</span>
              </div>
              <p className="font-montserrat text-sm text-gray-700">
                Se a ideia já havia sido transformada em artigo, o artigo continuará existindo. Você terá tanto a ideia na página "Produzir Artigos" quanto o artigo gerado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dica para usuários - Padronizado com estilo das outras páginas */}
      <Card className="border-border bg-card" style={{ backgroundColor: '#f8f5ff' }}>
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Star size={20} style={{ color: '#8c52ff' }} />
            Como funciona a exclusão de ideias?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-white/60 rounded-lg border border-purple-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                  <span className="font-montserrat text-sm text-gray-700">Ideias excluídas ficam aqui por segurança</span>
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-purple-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                  <span className="font-montserrat text-sm text-gray-700">Você pode restaurá-las a qualquer momento</span>
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-purple-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                  <span className="font-montserrat text-sm text-gray-700">Ou excluí-las permanentemente se não precisar mais</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white/60 rounded-lg border border-purple-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                  <span className="font-montserrat text-sm text-gray-700">Para excluir: vá em "Produzir Artigos" e selecione as ideias</span>
                </div>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-purple-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={12} style={{ color: '#8c52ff' }} />
                  <span className="font-montserrat text-sm font-medium text-foreground">Restaurar ideia produzida:</span>
                </div>
                <span className="font-montserrat text-sm text-gray-700 ml-4">Mantém o artigo existente e permite gerar novos</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}