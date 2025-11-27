import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Calendar, AlertCircle, Loader2, CheckCircle, Clock, Monitor, Star, BarChart3, Eye, Edit, Trash2 } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { toast } from 'sonner';

interface AgendarPostsProps {
  userData: any;
}

export function AgendarPosts({ userData }: AgendarPostsProps) {
  const { state, actions } = useBia();
  const { dashboardData, loading: isDashboardLoading, error: dashboardError } = useDashboard();
  
  // Verificação de segurança inicial - prevenir "tela azul"
  if (!state || !state.sites || !state.articles) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#8c52ff' }} />
          <span className="font-montserrat text-foreground">Carregando dados...</span>
        </div>
      </div>
    );
  }
  
  // Função auxiliar para converter data para string no fuso horário do Brasil
  const formatDateToBrazilTime = (date: Date): string => {
    // Criar uma nova data ajustada para UTC-3 (Brasília)
    const brazilOffset = -3 * 60; // UTC-3 em minutos
    const localOffset = date.getTimezoneOffset(); // Offset local em minutos
    const targetOffset = brazilOffset - localOffset;
    
    const brazilDate = new Date(date.getTime() + (targetOffset * 60 * 1000));
    return brazilDate.toISOString().slice(0, 19) + '-03:00';
  };

  // Função auxiliar para obter data atual no formato YYYY-MM-DD (fuso Brasil)
  const getTodayInBrazil = (): string => {
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3 em minutos
    const localOffset = now.getTimezoneOffset();
    const targetOffset = brazilOffset - localOffset;
    
    const brazilNow = new Date(now.getTime() + (targetOffset * 60 * 1000));
    return brazilNow.toISOString().split('T')[0];
  };

  // Função auxiliar para criar data a partir de string garantindo fuso Brasil
  const createBrazilDate = (dateString: string): Date => {
    // Se a string já tem timezone, usar diretamente
    if (dateString.includes('T') && (dateString.includes('-03:00') || dateString.includes('Z'))) {
      return new Date(dateString);
    }
    
    // Se é uma string simples de data (YYYY-MM-DD), criar explicitamente no fuso Brasil
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };
  
  // Dados reais do dashboard (seguindo padrão das outras páginas)
  const { user, limits: realPlanLimits, usage } = dashboardData || {};
  const currentUser = user || state.user || userData;
  const currentPlan = currentUser?.plano || 'Free';
  const isAdminOrDev = currentUser?.is_admin || currentUser?.is_developer;
  const isDev = currentUser?.email === 'dev@bia.com' || currentUser?.email === 'admin@bia.com' || isAdminOrDev;
  
  const [formData, setFormData] = useState({
    siteId: '',
    total: 1,
    quantidade: 1,
    frequencia: 'diaria',
    horario: '08:00',
    dataInicio: '' // Nova data de início
  });

  const [isScheduling, setIsScheduling] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sites WordPress conectados (verificar se tem configuração WordPress)
  const connectedSites = React.useMemo(() => {
    try {
      if (!Array.isArray(state.sites)) {
        console.warn('🚨 state.sites não é um array:', state.sites);
        return [];
      }
      
      return state.sites.filter(site => {
        if (!site) return false;
        return (
          site.status === 'ativo' && 
          site.wordpressUrl && 
          site.wordpressUsername && 
          site.wordpressPassword
        );
      });
    } catch (error) {
      console.error('🚨 Erro ao filtrar sites conectados:', error);
      return [];
    }
  }, [state.sites]);

  // Artigos disponíveis para agendamento (rascunho sem data de agendamento)
  const availableArticles = React.useMemo(() => {
    try {
      if (!Array.isArray(state.articles)) {
        console.warn('🚨 state.articles não é um array:', state.articles);
        return [];
      }
      
      return state.articles.filter(article => {
        try {
          if (!article) return false;
          
          // Verificar se é rascunho (case insensitive para compatibilidade)
          const isRascunho = article.status?.toLowerCase() === 'rascunho';
          const hasNoScheduleDate = !article.scheduledDate && !article.publishedDate;
          const isAvailable = isRascunho && hasNoScheduleDate;
          
          // Verificação segura de siteId - proteger contra valores null/undefined
          const isSiteSelected = formData.siteId ? 
            (article.siteId && article.siteId.toString() === formData.siteId.toString()) : 
            true;
          
          console.log(`🔍 DEBUG Agendamento - Artigo "${article.titulo}":`, {
            status: article.status,
            isRascunho,
            hasNoScheduleDate,
            isAvailable,
            siteId: article.siteId,
            selectedSiteId: formData.siteId,
            isSiteSelected,
            finalResult: isAvailable && isSiteSelected
          });
          
          return isAvailable && isSiteSelected;
        } catch (error) {
          console.error('🚨 Erro ao filtrar artigo para agendamento:', error, article);
          return false;
        }
      });
    } catch (error) {
      console.error('🚨 Erro geral ao filtrar artigos:', error);
      return [];
    }
  }, [state.articles, formData.siteId]);

  // Artigos já agendados
  const scheduledArticles = React.useMemo(() => {
    try {
      if (!Array.isArray(state.articles)) {
        return [];
      }
      
      return state.articles.filter(article => {
        if (!article) return false;
        return article.status === 'Agendado' && article.scheduledDate;
      });
    } catch (error) {
      console.error('🚨 Erro ao filtrar artigos agendados:', error);
      return [];
    }
  }, [state.articles]);

  // Site selecionado com proteção contra erros
  const selectedSite = React.useMemo(() => {
    try {
      return formData.siteId 
        ? connectedSites.find(site => site?.id && site.id.toString() === formData.siteId)
        : null;
    } catch (error) {
      console.error('🚨 Erro ao encontrar site selecionado:', error);
      return null;
    }
  }, [formData.siteId, connectedSites]);

  // Atualizar total baseado nos artigos disponíveis
  useEffect(() => {
    try {
      if (availableArticles?.length > 0 && formData.total > availableArticles.length) {
        setFormData(prev => ({
          ...prev,
          total: Math.min(10, availableArticles.length)
        }));
      }
    } catch (error) {
      console.error('🚨 Erro ao atualizar total baseado em artigos disponíveis:', error);
    }
  }, [availableArticles?.length, formData.total]);

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'diaria': return 'Diária';
      case 'semanal': return 'Semanal';
      case 'mensal': return 'Mensal';
      default: return freq;
    }
  };

  const calculateNextDates = (total: number, frequencia: string, quantidade: number, dataInicio?: string) => {
    const dates: Date[] = [];
    let currentDate = new Date();
    
    // Usar data de início se fornecida, senão começar amanhã
    if (dataInicio) {
      // Criar data explicitamente no fuso horário do Brasil (UTC-3)
      const [year, month, day] = dataInicio.split('-').map(Number);
      currentDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Meio-dia para evitar problemas de fuso
      
      // Se a data de início for hoje ou no passado, começar amanhã
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (currentDate <= today) {
        currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(12, 0, 0, 0); // Meio-dia
      }
    } else {
      currentDate.setDate(currentDate.getDate() + 1); // Começar amanhã
      currentDate.setHours(12, 0, 0, 0); // Meio-dia
    }
    
    let remaining = total;
    while (remaining > 0) {
      const postsThisPeriod = Math.min(quantidade, remaining);
      
      // Distribuir os posts do período de forma inteligente
      for (let i = 0; i < postsThisPeriod; i++) {
        // Criar nova data mantendo o fuso horário local do Brasil
        const postDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const [baseHours, baseMinutes] = formData.horario.split(':').map(Number);
        
        if (postsThisPeriod === 1) {
          // Um post só: usar o horário exato escolhido
          postDate.setHours(baseHours, baseMinutes, 0, 0);
        } else {
          // Múltiplos posts: distribuir ao longo do dia
          let targetHour = baseHours;
          
          if (postsThisPeriod === 2) {
            // 2 posts: manhã e tarde (ex: 8h e 16h)
            targetHour = i === 0 ? baseHours : baseHours + 8;
          } else if (postsThisPeriod === 3) {
            // 3 posts: manhã, tarde e noite (ex: 8h, 14h, 20h)
            const intervals = [0, 6, 12]; // 8h, 14h, 20h
            targetHour = baseHours + intervals[i];
          } else if (postsThisPeriod >= 4) {
            // 4+ posts: distribuir uniformemente no dia (máx 24h / quantidade)
            const interval = Math.floor(24 / postsThisPeriod);
            targetHour = baseHours + (i * interval);
          }
          
          // Garantir que não passe de 23h
          if (targetHour >= 24) {
            targetHour = 23;
          }
          
          postDate.setHours(targetHour, baseMinutes, 0, 0);
        }
        
        dates.push(postDate);
        remaining--;
      }
      
      // Próximo período - manter fuso horário local
      switch (frequencia) {
        case 'diaria':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 12, 0, 0, 0);
          break;
        case 'semanal':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7, 12, 0, 0, 0);
          break;
        case 'mensal':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate(), 12, 0, 0, 0);
          break;
      }
    }
    
    return dates;
  };

  const handleSchedule = async () => {
    try {
      if (!formData.siteId) {
        toast.error('Selecione um site para agendar os posts.');
        return;
      }

      const articlesLength = availableArticles?.length || 0;
      if (articlesLength === 0) {
        toast.error(`Você não tem artigos rascunho disponíveis para o site ${selectedSite?.nome || 'selecionado'}.`);
        return;
      }

      if (formData.total > articlesLength) {
        toast.error(`Você só tem ${articlesLength} artigos disponíveis para este site.`);
        return;
      }
    } catch (error) {
      console.error('🚨 Erro nas validações iniciais do agendamento:', error);
      toast.error('Erro interno nas validações. Tente novamente.');
      return;
    }

    // Verificar se o site tem configuração WordPress
    if (!selectedSite?.wordpressUrl || !selectedSite?.wordpressUsername || !selectedSite?.wordpressPassword) {
      toast.error(`O site "${selectedSite?.nome}" não tem WordPress configurado. Configure na seção Meus Sites.`);
      return;
    }

    setIsScheduling(true);
    setProgress(0);

    try {
      console.log('🗓️ Iniciando agendamento em massa...');
      
      const dates = calculateNextDates(formData.total, formData.frequencia, formData.quantidade, formData.dataInicio);
      const articlesToSchedule = availableArticles.slice(0, formData.total);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Agendar artigos um por um usando a API do Laravel
      for (let i = 0; i < articlesToSchedule.length; i++) {
        const article = articlesToSchedule[i];
        const scheduledDate = dates[i];
        
        console.log(`📅 Agendando artigo ${i + 1}/${articlesToSchedule.length}: "${article.titulo}" para ${scheduledDate.toLocaleString('pt-BR')}`);
        
        try {
          // CORREÇÃO: Preservar o timezone local do usuário
          const year = scheduledDate.getFullYear();
          const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
          const day = String(scheduledDate.getDate()).padStart(2, '0');
          const hour = String(scheduledDate.getHours()).padStart(2, '0');
          const minute = String(scheduledDate.getMinutes()).padStart(2, '0');
          const localScheduleDate = `${year}-${month}-${day}T${hour}:${minute}:00`;
          
          // Preparar dados do post para agendamento no WordPress (igual ao individual)
          const postData = {
            title: article.titulo,
            content: article.conteudo,
            status: 'future' as const,
            date: localScheduleDate, // Usar data local ao invés de UTC
            featured_media: article.imageUrl ? {
              imageUrl: article.imageUrl,
              alt: article.imageAlt || article.titulo
            } : undefined
          };

          // Usar o serviço WordPress para agendar o post direto
          const { wordpressService } = await import('../../services/wordpressService');
          const result = await wordpressService.schedulePost(
            formData.siteId, 
            postData, 
            localScheduleDate // Usar data local consistente
          );

          if (result.success && result.postId) {
            // Atualizar artigo com dados do agendamento WordPress
            // ⚠️ IMPORTANTE: usar status 'agendado' (minúsculo) para compatibilidade com filtros
            const success = actions.updateArticle(article.id, { 
              status: 'agendado' as const,
              scheduledDate: localScheduleDate, // Usar data local consistente
              wordpressData: result.postId
            });
            
            if (success) {
              console.log(`✅ Artigo "${article.titulo}" agendado no WordPress com sucesso`);
              successCount++;
            } else {
              console.error(`❌ Falha ao atualizar dados locais do artigo "${article.titulo}"`);
              errorCount++;
            }
          } else {
            throw new Error(result.error || 'Erro desconhecido no agendamento WordPress');
          }
        } catch (error) {
          console.error(`❌ Erro ao agendar artigo "${article.titulo}":`, error);
          errorCount++;
        }
        
        // Atualizar progresso
        setProgress(Math.round(((i + 1) / articlesToSchedule.length) * 100));
        
        // Pequena pausa para evitar sobrecarga do servidor
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Mostrar resultado final
      if (successCount > 0 && errorCount === 0) {
        toast.success(`🎉 Todos os ${successCount} posts foram agendados com sucesso no WordPress!`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`✅ ${successCount} posts agendados com sucesso. ${errorCount} falharam.`);
      } else {
        toast.error(`❌ Nenhum post foi agendado. Todos os ${errorCount} tentativas falharam.`);
      }

      // ✅ CORREÇÃO CRÍTICA: Forçar sync com backend após agendamento
      if (successCount > 0) {
        console.log('🔄 Forçando sincronização com backend após agendamento...');
        
        try {
          // 1. Forçar refresh dos dados da API
          console.log('📡 Sincronizando dados do backend...');
          await actions.refreshUserData();
          console.log('✅ Dados sincronizados com sucesso');
          
          // 2. Pequeno delay para garantir que o estado foi atualizado
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 3. Forçar re-renderização de todas as páginas
          // Isso atualiza:
          // - ProduzirArtigos (remove artigos agendados da lista)
          // - Calendario (mostra artigos agendados)
          // - AgendarPosts (mostra artigos agendados existentes)
          console.log('🔁 Forçando re-renderização de componentes...');
          window.dispatchEvent(new CustomEvent('articles-updated', { detail: { type: 'scheduled', count: successCount } }));
          
        } catch (refreshError) {
          console.error('❌ Erro ao sincronizar dados:', refreshError);
          toast.error('⚠️ Agendamento concluído, mas houve erro ao atualizar a interface. Recarregue a página.');
        }
      }
      
      // Reset form (mantendo o site selecionado)
      setFormData({
        siteId: formData.siteId,
        total: 1,
        quantidade: 1,
        frequencia: 'diaria',
        horario: '08:00',
        dataInicio: ''
      });

    } catch (error) {
      console.error('❌ Erro geral no agendamento:', error);
      toast.error('Erro inesperado ao agendar posts. Tente novamente.');
    } finally {
      setIsScheduling(false);
      setProgress(0);
    }
  };

  const handleRemoveSchedule = async (articleId: number) => {
    try {
      console.log(`🗑️ Removendo agendamento do artigo ${articleId}`);
      
      // Primeiro atualizar o artigo local para "rascunho"
      const success = await actions.updateArticle(articleId, { 
        status: 'rascunho',
        scheduledDate: undefined,
        wordpressData: undefined
      });
      
      if (success) {
        console.log(`✅ Agendamento do artigo ${articleId} removido localmente`);
        
        // Opcionalmente, também tentar cancelar no backend Laravel
        // (se houver um endpoint específico para cancelamento)
        try {
          const apiBase = import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com';
          const response = await fetch(`${apiBase}/api/agendamentos/article/${articleId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            console.log(`✅ Agendamento cancelado também no backend`);
          } else {
            console.log(`⚠️ Agendamento removido localmente, mas backend retornou: ${response.status}`);
          }
        } catch (backendError) {
          console.log(`⚠️ Agendamento removido localmente, mas erro ao cancelar no backend:`, backendError);
        }
        
        toast.success('Agendamento removido com sucesso!');
      } else {
        toast.error('Erro ao remover agendamento.');
      }
    } catch (error) {
      console.error('❌ Erro ao remover agendamento:', error);
      toast.error('Erro ao remover agendamento.');
    }
  };

  const calculateEndDate = () => {
    const dates = calculateNextDates(formData.total, formData.frequencia, formData.quantidade, formData.dataInicio);
    if (dates.length > 0) {
      return (dates[dates.length - 1] as Date).toLocaleDateString('pt-BR');
    }
    return null;
  };  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Agendar Posts
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Configure o agendamento automático dos seus posts WordPress
          </p>
        </div>
      </div>

      {/* Estatísticas - Padronizado com estilo das Ações Rápidas */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Estatísticas de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">
                    {formData.siteId ? `Artigos Disponíveis (${selectedSite?.nome})` : 'Artigos Disponíveis'}
                  </p>
                  <p className="font-poppins text-xl font-medium text-foreground">
                    {availableArticles?.length || 0}
                  </p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Prontos para agendamento
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Monitor size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Sites Conectados
                  </p>
                  <p className="font-poppins text-xl font-medium text-foreground">
                    {connectedSites?.length || 0}
                  </p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Com WordPress ativo
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Clock size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">
                    Posts Agendados
                  </p>
                  <p className="font-poppins text-xl font-medium text-foreground">
                    {scheduledArticles?.length || 0}
                  </p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Aguardando publicação
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {!formData.siteId && (
        <Alert className="border-purple-200 bg-purple-50">
          <AlertCircle className="h-4 w-4" style={{ color: '#8c52ff' }} />
          <AlertDescription className="text-purple-800">
            <strong>Selecione um site</strong> para ver os artigos disponíveis para agendamento.
          </AlertDescription>
        </Alert>
      )}

      {formData.siteId && (availableArticles?.length || 0) === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" style={{ color: '#8c52ff' }} />
          <AlertDescription className="text-orange-800">
            {selectedSite?.nome ? `O site "${selectedSite.nome}" não tem artigos` : 'Você não tem artigos'} <strong>rascunho</strong> disponíveis para agendamento.
            <button 
              onClick={() => window.location.hash = 'articles'}
              className="ml-1 text-orange-800 underline hover:no-underline"
            >
              Vá para "Produzir Artigos" primeiro →
            </button>
          </AlertDescription>
        </Alert>
      )}
      
      {connectedSites.length === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" style={{ color: '#8c52ff' }} />
          <AlertDescription className="text-orange-800">
            Você precisa ter pelo menos um <strong>site WordPress conectado</strong> para agendar posts.
            <button 
              onClick={() => window.location.hash = 'sites'}
              className="ml-1 text-orange-800 underline hover:no-underline"
            >
              Vá para "Meus Sites" e configure WordPress →
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Formulário de Agendamento - Padronizado com estilo das Ações Rápidas */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
              <Calendar size={20} style={{ color: '#8c52ff' }} />
              Configurações de Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de Site - PRIMEIRO CAMPO */}
            <div className="space-y-2">
              <Label htmlFor="siteId" className="font-montserrat text-foreground flex items-center gap-2">
                <Monitor size={16} style={{ color: '#8c52ff' }} />
                <span>Selecionar Site *</span>
              </Label>
              <Select 
                value={formData.siteId} 
                onValueChange={(value) => {
                  try {
                    setFormData({...formData, siteId: value, total: 1});
                  } catch (error) {
                    console.error('🚨 Erro ao selecionar site:', error);
                  }
                }}
                disabled={isScheduling}
              >
                <SelectTrigger className="font-montserrat">
                  <SelectValue placeholder="Escolha um site WordPress conectado" />
                </SelectTrigger>
                <SelectContent>
                  {connectedSites && connectedSites.length > 0 ? (
                    connectedSites.map(site => {
                      // Validação mais robusta para evitar valores vazios
                      if (!site?.id || !site?.nome || site.id === '' || site.id === null || site.id === undefined) {
                        console.warn('🚨 Site com dados inválidos ignorado:', site);
                        return null;
                      }
                      const siteIdString = site.id.toString();
                      if (!siteIdString || siteIdString === 'null' || siteIdString === 'undefined') {
                        console.warn('🚨 Site com ID inválido ignorado:', site);
                        return null;
                      }
                      return (
                        <SelectItem key={site.id} value={siteIdString}>
                          {site.nome} - {site.url || 'URL não definida'}
                        </SelectItem>
                      );
                    }).filter(Boolean)
                  ) : (
                    <SelectItem value="no-sites" disabled>
                      Nenhum site conectado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(connectedSites?.length || 0) === 0 && (
                <p className="font-montserrat text-sm text-red-600">
                  Nenhum site WordPress conectado encontrado
                </p>
              )}
            </div>

            {/* Quantidade Total - só aparece quando site estiver selecionado */}
            {formData.siteId && (
              <div className="space-y-2">
                <Label htmlFor="total" className="font-montserrat text-foreground">Quantidade Total de Posts</Label>
                <Input
                  id="total"
                  type="number"
                  min="1"
                  max={(availableArticles?.length || 1)}
                  value={formData.total}
                  onChange={(e) => setFormData({...formData, total: parseInt(e.target.value) || 1})}
                  className="font-montserrat"
                  disabled={isScheduling || (availableArticles?.length || 0) === 0}
                />
                <p className="font-montserrat text-sm text-gray-500">
                  {availableArticles?.length || 0} artigos rascunho disponíveis para {selectedSite?.nome || 'site selecionado'}
                </p>
              </div>
            )}

            {/* Configurações de agendamento - só aparecem quando site estiver selecionado */}
            {formData.siteId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="quantidade" className="font-montserrat text-foreground">Posts por Período</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 1})}
                    className="font-montserrat"
                    disabled={isScheduling}
                  />
                  <p className="font-montserrat text-sm text-gray-500">
                    Quantos posts publicar por período
                  </p>
                </div>

                {/* Grid de 3 colunas: Frequência | Data de Início | Horário de Início */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Frequência */}
                  <div className="space-y-2">
                    <Label htmlFor="frequencia" className="font-montserrat text-foreground">Frequência</Label>
                    <Select 
                      value={formData.frequencia} 
                      onValueChange={(value) => setFormData({...formData, frequencia: value})}
                      disabled={isScheduling}
                    >
                      <SelectTrigger className="font-montserrat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diária</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="font-montserrat text-xs text-gray-500">
                      Intervalo entre posts
                    </p>
                  </div>

                  {/* Data de Início */}
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio" className="font-montserrat text-foreground">Data de Início</Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={formData.dataInicio}
                      onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                      className="font-montserrat"
                      disabled={isScheduling}
                      min={getTodayInBrazil()} // Não permitir datas passadas (fuso Brasil)
                    />
                    <p className="font-montserrat text-xs text-gray-500">
                      Quando começar a publicar
                    </p>
                  </div>

                  {/* Horário de Início */}
                  <div className="space-y-2">
                    <Label htmlFor="horario" className="font-montserrat text-foreground">Horário de Início</Label>
                    <Input
                      id="horario"
                      type="time"
                      value={formData.horario}
                      onChange={(e) => setFormData({...formData, horario: e.target.value})}
                      className="font-montserrat"
                      disabled={isScheduling}
                    />
                    <p className="font-montserrat text-xs text-gray-500">
                      Horário base das publicações
                    </p>
                  </div>
                </div>
              </>
            )}

            {isScheduling && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#8c52ff' }} />
                  <span className="font-montserrat text-sm text-muted-foreground">Agendando posts...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: '#8c52ff',
                      width: `${progress}%`
                    }}
                  ></div>
                </div>
                <p className="font-montserrat text-xs text-gray-500">{progress}% concluído</p>
              </div>
            )}

            {formData.siteId && (
              <Button 
                onClick={handleSchedule}
                disabled={isScheduling || !formData.siteId || (availableArticles?.length || 0) === 0 || formData.total > (availableArticles?.length || 0)}
                className="w-full font-montserrat text-white"
                style={{ backgroundColor: '#8c52ff' }}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2" size={16} />
                    Agendar {formData.total} Posts
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Prévia do agendamento com fundo colorido - só aparece quando site estiver selecionado */}
        {formData.siteId && (
          <Card className="border-border bg-card" style={{ backgroundColor: '#f0fff4' }}>
            <CardHeader className="pb-4">
              <CardTitle className="font-poppins text-lg text-foreground flex items-center gap-2">
                <BarChart3 size={20} style={{ color: '#8c52ff' }} />
                Prévia do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                  <span className="font-montserrat text-sm text-gray-700">Site selecionado:</span>
                  <span className="font-montserrat text-sm font-medium text-foreground">{selectedSite?.nome}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                  <span className="font-montserrat text-sm text-gray-700">Total de posts:</span>
                  <span className="font-montserrat text-sm font-medium text-foreground">{formData.total}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                  <span className="font-montserrat text-sm text-gray-700">Frequência:</span>
                  <span className="font-montserrat text-sm font-medium text-foreground">{getFrequencyLabel(formData.frequencia)}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                  <span className="font-montserrat text-sm text-gray-700">Posts por período:</span>
                  <span className="font-montserrat text-sm font-medium text-foreground">{formData.quantidade}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                  <span className="font-montserrat text-sm text-gray-700">Horário:</span>
                  <span className="font-montserrat text-sm font-medium text-foreground">{formData.horario}</span>
                </div>
                {calculateEndDate() && (
                  <div className="flex justify-between p-3 bg-white/60 rounded-lg border border-green-100">
                    <span className="font-montserrat text-sm text-gray-700">Término previsto:</span>
                    <span className="font-montserrat text-sm font-medium text-foreground">{calculateEndDate()}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-green-200 pt-4">
                <h4 className="font-montserrat font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock size={16} style={{ color: '#8c52ff' }} />
                  Próximos agendamentos:
                </h4>
                <div className="space-y-2">
                  {calculateNextDates(Math.min(formData.total, 5), formData.frequencia, formData.quantidade, formData.dataInicio).map((date, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/60 rounded border border-green-100">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                      <span className="font-montserrat text-sm text-gray-700">
                        {index + 1}º post: {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {formData.total > 5 && (
                    <div className="flex items-center gap-2 p-2 bg-white/60 rounded border border-green-100">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8c52ff' }}></div>
                      <span className="font-montserrat text-sm text-gray-700">
                        E mais {formData.total - 5} posts...
                      </span>
                    </div>
                  )}
                  {formData.quantidade > 1 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="font-montserrat text-xs text-blue-700">
                        <strong>💡 Distribuição inteligente:</strong> {formData.quantidade} posts por {formData.frequencia.replace('a', 'o').replace('l', 'l').replace('semanal', 'semana').replace('mensal', 'mês').replace('diario', 'dia')} são distribuídos automaticamente ao longo do período para maximizar o engajamento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Posts agendados existentes */}
      {scheduledArticles.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg text-foreground flex items-center gap-2">
              <Calendar size={20} style={{ color: '#8c52ff' }} />
              Posts Já Agendados ({scheduledArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledArticles
                .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
                .slice(0, 10)
                .map(article => {
                  const site = state.sites.find(s => s.id === article.siteId);
                  return (
                    <div key={article.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar size={14} style={{ color: '#8c52ff' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-montserrat text-sm font-medium text-foreground">{article.titulo}</p>
                          <p className="font-montserrat text-xs text-muted-foreground">
                            {new Date(article.scheduledDate!).toLocaleDateString('pt-BR')} às {new Date(article.scheduledDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {site && ` • ${site.nome}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="border-purple-200 text-purple-700 bg-purple-50 text-xs font-montserrat px-2 py-0.5 rounded">
                          <Clock size={10} className="mr-1" />
                          Agendado
                        </Badge>
                        <button
                          onClick={() => handleRemoveSchedule(article.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 bg-transparent border-0 rounded cursor-pointer flex items-center justify-center"
                          title="Remover agendamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              {scheduledArticles.length > 10 && (
                <p className="font-montserrat text-sm text-gray-500 text-center pt-2">
                  E mais {scheduledArticles.length - 10} posts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dicas com fundo colorido */}
      <Card className="border-border bg-card" style={{ backgroundColor: '#f8f5ff' }}>
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg text-foreground flex items-center gap-2">
            <Star size={20} style={{ color: '#8c52ff' }} />
            Dicas para Agendamento Eficaz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} style={{ color: '#8c52ff' }} />
                  <h4 className="font-montserrat font-medium text-foreground">
                    Consistência é chave
                  </h4>
                </div>
                <p className="font-montserrat text-sm text-muted-foreground">
                  Mantenha uma frequência regular de publicação para engajar melhor sua audiência.
                </p>
              </div>
              <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={16} style={{ color: '#8c52ff' }} />
                  <h4 className="font-montserrat font-medium text-foreground">
                    Analise o engajamento
                  </h4>
                </div>
                <p className="font-montserrat text-sm text-muted-foreground">
                  Monitore os horários de maior engajamento do seu público-alvo.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} style={{ color: '#8c52ff' }} />
                  <h4 className="font-montserrat font-medium text-foreground">
                    Prepare com antecedência
                  </h4>
                </div>
                <p className="font-montserrat text-sm text-muted-foreground">
                  Tenha conteúdo suficiente produzido antes de configurar agendamentos.
                </p>
              </div>
              <div className="p-4 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} style={{ color: '#8c52ff' }} />
                  <h4 className="font-montserrat font-medium text-foreground">
                    Use o calendário
                  </h4>
                </div>
                <p className="font-montserrat text-sm text-muted-foreground">
                  Visualize suas publicações agendadas no calendário para melhor organização.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}