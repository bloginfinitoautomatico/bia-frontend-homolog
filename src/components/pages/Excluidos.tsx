import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Trash2, XCircle, RotateCcw, Clock, CheckCircle, AlertCircle, Star, BarChart3, Calendar as CalendarIcon, Monitor, Loader2, Search } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { toast } from 'sonner';

interface ExcluidosProps {
  userData: any;
}

export function Excluidos({ userData }: ExcluidosProps) {
  const { state, actions } = useBia();
  const { dashboardData } = useDashboard();
  const [filterSite, setFilterSite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // ✅ NOVO: Estado para ideias excluídas carregadas do backend
  const [deletedIdeas, setDeletedIdeas] = useState<any[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(true);
  
  // Estados para ações em massa
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<number[]>([]);
  const [isRestoringBatch, setIsRestoringBatch] = useState(false);

  // ✅ NOVO: Carregar ideias excluídas do backend
  useEffect(() => {
    const loadDeletedIdeasFromBackend = async () => {
      try {
        setIsLoadingDeleted(true);
        console.log('🗑️ Carregando ideias excluídas para página Excluídos...');
        const backendDeletedIdeas = await actions.loadDeletedIdeas();
        console.log(`✅ ${backendDeletedIdeas.length} ideias excluídas carregadas`);
        setDeletedIdeas(backendDeletedIdeas);
      } catch (error) {
        console.error('❌ Erro ao carregar ideias excluídas:', error);
        toast.error('Erro ao carregar ideias excluídas');
        // Fallback: usar apenas ideias excluídas do estado local
        setDeletedIdeas(state.ideas.filter(idea => idea.status === 'excluido'));
      } finally {
        setIsLoadingDeleted(false);
      }
    };

    loadDeletedIdeasFromBackend();
  }, [actions, state.ideas]);

  // Filtrar ideias baseado nos filtros selecionados
  // ✅ ATUALIZADO: Usar ideias excluídas do backend + estado local
  const getAllIdeasByStatus = () => {
    // Combinar ideias excluídas do backend com as do estado local para garantir completude
    const localDeletedIdeas = state.ideas.filter(idea => idea.status === 'excluido');
    const combinedIdeas = [...deletedIdeas];
    
    // Adicionar ideias excluídas locais que não estão no backend (recém excluídas)
    localDeletedIdeas.forEach(localIdea => {
      if (!combinedIdeas.find(backendIdea => backendIdea.id === localIdea.id)) {
        combinedIdeas.push(localIdea);
      }
    });
    
    return combinedIdeas;
  };

  const getFilteredIdeias = () => {
    let filtered = getAllIdeasByStatus();
    
    // Filtro por site
    if (filterSite !== 'all') {
      const siteId = parseInt(filterSite);
      filtered = filtered.filter(idea => idea.siteId === siteId);
    }
    
    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(idea => 
        idea.titulo.toLowerCase().includes(query) ||
        (idea.descricao && idea.descricao.toLowerCase().includes(query)) ||
        (idea.categoria && idea.categoria.toLowerCase().includes(query)) ||
        (idea.tags && idea.tags.some(tag => tag.toLowerCase().includes(query)))
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
  }, [filterSite, searchQuery]);

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

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Ideias Excluídas
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Visualize e gerencie todas as suas ideias excluídas
          </p>
        </div>
        <div className="flex gap-3">
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

      {/* Lista de Ideias - Seguindo padrão do Calendário */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Trash2 size={20} style={{ color: '#8c52ff' }} />
            <span>Ideias Excluídas ({filteredIdeias.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Campo de busca */}
          <div className="p-4 rounded-lg bg-white border mb-6">
            <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <Search size={16} />
              Buscar Ideias Excluídas
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por título, descrição, categoria ou tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-montserrat"
              />
            </div>
          </div>

          {isLoadingDeleted ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-2 font-montserrat text-muted-foreground">
                Carregando ideias excluídas...
              </span>
            </div>
          ) : filteredIdeias.length > 0 ? (
            <>
              {/* Cabeçalho de Seleção em Massa */}
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
                        disabled={isRestoringBatch}
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
                    </div>
                  )}
                </div>
              
              <div className="space-y-4">
              {filteredIdeias.map((idea) => (
                <div key={idea.id} className="border-border bg-card p-6 rounded-lg border hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    {/* Checkbox para seleção */}
                    <div className="flex items-center justify-center pt-1">
                      <Checkbox
                        checked={selectedIdeaIds.includes(idea.id)}
                        onCheckedChange={(checked) => handleSelectIdea(idea.id, checked as boolean)}
                        className="data-[state=checked]:bg-[#8c52ff] data-[state=checked]:border-[#8c52ff]"
                      />
                    </div>
                    
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <XCircle size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-poppins text-lg font-medium text-foreground mb-2 line-clamp-2">
                            {idea.titulo}
                          </h3>
                          <p className="font-montserrat text-sm text-muted-foreground line-clamp-3 mb-3">
                            {idea.descricao || 'Sem descrição adicional'}
                          </p>
                        </div>
                        
                        <Badge 
                          className="ml-4 flex-shrink-0"
                          style={{ 
                            backgroundColor: idea.status === 'ativa' ? '#10b981' : 
                                           idea.status === 'produzido' ? '#8c52ff' : '#dc2626',
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          {idea.status === 'ativa' ? 'Ativa' : 
                           idea.status === 'produzido' ? 'Produzida' : 'Excluída'}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} style={{ color: '#8c52ff' }} />
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
                                  <Badge 
                                    key={index}
                                    className="text-xs bg-white border px-2 py-1 rounded"
                                    style={{ 
                                      borderColor: '#8c52ff', 
                                      color: '#8c52ff'
                                    }}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
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
                {searchQuery.trim() ? 'Nenhuma ideia encontrada' : 'Nenhuma ideia excluída encontrada'}
              </h3>
              <p className="font-montserrat text-muted-foreground mb-6">
                {searchQuery.trim() 
                  ? `Não encontramos ideias excluídas que correspondam à sua busca "${searchQuery}".`
                  : 'As ideias excluídas aparecerão aqui e poderão ser restauradas para a página "Produzir Artigos".'
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
                {(filterSite !== 'all' || searchQuery.trim()) && (
                  <Button
                    className="font-montserrat text-sm bg-white hover:bg-purple-50 rounded"
                    style={{ 
                      borderColor: '#8c52ff', 
                      color: '#8c52ff',
                      border: '1px solid #8c52ff'
                    }}
                    onClick={() => {
                      setFilterSite('all');
                      setSearchQuery('');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards informativos */}
      <Card className="border-border bg-card" style={{ backgroundColor: 'rgba(255, 165, 0, 0.05)', borderColor: 'rgba(255, 165, 0, 0.2)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            Como funciona a restauração
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

      <Card className="border-border bg-card" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Star size={20} style={{ color: '#3b82f6' }} />
            Dicas de Gestão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle size={12} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
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
