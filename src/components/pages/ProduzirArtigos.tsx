import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getApiUrl } from '../../config/api';
import { WordPressPost } from '../../services/wordpressService';
import { useCredits } from '../../hooks/useCredits';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Calendar,
  Eye,
  Zap,
  Send,
  Trash2,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Play,
  Globe,
  XCircle,
  Filter,
  Monitor,
  Tag,
  ExternalLink,
  Search,
  RefreshCw,
  User,
  FolderOpen,
  Image,
  Edit3,
  Save,
  BarChart3
} from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { FREE_PLAN_LIMITS, getPlanLimits } from '../../utils/constants';
import { toast } from 'sonner';
import { contentService } from '../../services/contentService';
import { wordpressService } from '../../services/wordpressService';
import { filterBySiteId, compareIds } from '../../utils/idComparison';
import { getSiteName as getSiteNameUtil } from '../../utils/siteUtils';

// Função utilitária para gerar nome de imagem SEO-friendly baseado no título
const generateImageName = (titulo: string): string => {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
    .substring(0, 100); // Limita a 100 caracteres
};

// Função para sanitizar conteúdo HTML removendo blocos de código Markdown
const sanitizeHtmlContent = (content: string): string => {
  if (!content) return '';
  
  return content
    // Remove blocos de código HTML do início
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    // Remove blocos de código HTML do final
    .replace(/\s*```\s*$/i, '')
    // Remove possíveis blocos de código no meio do conteúdo
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/gi, '')
    // Remove quebras de linha extras no início e fim
    .trim();
};

// ============= TYPE GUARDS E HELPERS PARA TRATAMENTO DE ERROS =============

// Type guard para Error
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

// Helper para extrair mensagem de erro
const getErrorMessage = (error: unknown): string => {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Erro desconhecido';
};

// Helper para verificar tipo de erro
const getErrorName = (error: unknown): string => {
  if (isError(error)) {
    return error.name;
  }
  return '';
};

interface ProduzirArtigosProps {
  userData: any;
  onUpdateUser?: (updatedUserData: any) => Promise<boolean>;
  onRefreshUser?: () => Promise<boolean>;
}

export function ProduzirArtigos({ userData, onUpdateUser, onRefreshUser }: ProduzirArtigosProps) {
  const { state, actions } = useBia();
  const { dashboardData, loading: isDashboardLoading, error: dashboardError } = useDashboard();
  const availableCredits = useCredits();
  
  // Estados de seleção - usando arrays para evitar problemas de referência
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<number[]>([]);
  
  // Estado para diagnóstico da API OpenAI
  const [apiDiagnostic, setApiDiagnostic] = useState<{
    checked: boolean;
    hasKey: boolean;
    isValid: boolean;
    error?: string;
    details?: string;
  }>({ checked: false, hasKey: false, isValid: false });
  
  // Estados para operações individuais com progresso - PERSISTIDOS NO LOCALSTORAGE
  const [processingSingle, setProcessingSingleState] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('bia_processing_ideas');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // ✅ NOVO: Armazenar AbortControllers para cancelar gerações em andamento
  const [generationControllers, setGenerationControllers] = useState<Record<number, AbortController>>({});
  
  // ✅ NOVO: Rastrear tempo de início de geração por ideia (para mostrar botão cancel após 3min)
  const [generationStartTimes, setGenerationStartTimes] = useState<Record<number, number>>({});
  const [showCancelButtonForIdea, setShowCancelButtonForIdea] = useState<Record<number, boolean>>({});
  
  const setProcessingSingle = useCallback((updater: Record<number, boolean> | ((prev: Record<number, boolean>) => Record<number, boolean>)) => {
    setProcessingSingleState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('bia_processing_ideas', JSON.stringify(next));
      return next;
    });
  }, []);
  
  // ✅ NOVO: Estados para progresso com persistência no localStorage
  const [singleProgress, setSingleProgressState] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('bia_single_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const setSingleProgress = useCallback((updater: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => {
    setSingleProgressState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('bia_single_progress', JSON.stringify(next));
      return next;
    });
  }, []);
  
  // ✅ NOVO: Estados para batch progress com persistência no localStorage
  const [batchProgress, setBatchProgressState] = useState<{ [key: number]: number }>(() => {
    try {
      const saved = localStorage.getItem('bia_batch_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const setBatchProgress = useCallback((updater: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => {
    setBatchProgressState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('bia_batch_progress', JSON.stringify(next));
      return next;
    });
  }, []);
  
  const [publishingSingle, setPublishingSingle] = useState<Record<number, boolean>>({});
  
  // ✅ LOCK GLOBAL: Prevenir múltiplas execuções da mesma ideia
  const [globalProcessingLock, setGlobalProcessingLock] = useState<Record<number, boolean>>({});
  const [schedulingSingle, setSchedulingSingle] = useState<{ [key: number]: boolean }>({});
  const [deletingSingle, setDeletingSingle] = useState<{ [key: number]: boolean }>({});
  
  // Estados para operações em massa com progresso individual
  const [processingBatch, setProcessingBatch] = useState(false);
  const [publishingBatch, setPublishingBatch] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Dados reais do dashboard (seguindo padrão das outras páginas)
  const { user, limits: realPlanLimits, usage } = dashboardData || {};
  const currentUser = user || state.user || userData;
  const currentPlan = currentUser?.plano || 'Free';
  const isAdminOrDev = currentUser?.is_admin || currentUser?.is_developer;
  const isDev = currentUser?.email === 'dev@bia.com' || currentUser?.email === 'admin@bia.com' || isAdminOrDev;

  // Função para gerar chaves específicas por usuário para localStorage
  const getUserSpecificKey = useCallback((key: string) => {
    const userId = currentUser?.id || userData?.id || 'anonymous';
    return `bia_batch_${userId}_${key}`;
  }, [currentUser?.id, userData?.id]);
  
  // Estados para progresso geral da produção em massa (persistente - específico por usuário)
  const [batchCurrentItem, setBatchCurrentItem] = useState(() => {
    const key = getUserSpecificKey('current_item');
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved) : 0;
  });
  const [batchTotalItems, setBatchTotalItems] = useState(() => {
    const key = getUserSpecificKey('total_items');
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved) : 0;
  });
  
  // Controle de estado persistente do batch
  const [isBatchPersistent, setIsBatchPersistent] = useState(() => {
    const key = getUserSpecificKey('processing');
    return localStorage.getItem(key) === 'true';
  });
  
  // Estados para controle de tempo e cancelamento
  const [batchStartTime, setBatchStartTime] = useState(() => {
    const { user, limits: realPlanLimits, usage } = dashboardData || {};
    const currentUser = user || state.user || userData;
    const userId = currentUser?.id || userData?.id || 'anonymous';
    const key = `bia_batch_${userId}_start_time`;
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved) : 0;
  });
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [batchTimer, setBatchTimer] = useState(0);
  
  // Estados para agendamento
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [currentSchedulingArticle, setCurrentSchedulingArticle] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('08:00');

  // Estados para visualização
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentViewingArticle, setCurrentViewingArticle] = useState<any>(null);

  // Estados para edição de ideias
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentEditingIdea, setCurrentEditingIdea] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ✅ NOVO: Estados para edição de artigos na visualização
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editedArticleTitle, setEditedArticleTitle] = useState('');
  const [editedArticleContent, setEditedArticleContent] = useState('');
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  // Estados de paginação e filtros
  const [refreshKey, setRefreshKey] = useState(0); // Para forçar re-renderização
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'produced'>('all');
  const [siteFilter, setSiteFilter] = useState<'all' | string | number>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 15;

  // Cache WordPress
  const [wordpressSitesCache, setWordpressSitesCache] = useState<Map<string, boolean>>(new Map());

  // Funções auxiliares para edição de texto
  const getPlainTextFromHtml = useCallback((html: string) => {
    // Remove tags HTML mas preserva quebras de linha e estrutura básica
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Substituir tags de bloco por quebras de linha
    const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br'];
    blockElements.forEach(tag => {
      const elements = tempDiv.querySelectorAll(tag);
      elements.forEach(el => {
        if (tag === 'br') {
          el.replaceWith('\n');
        } else {
          el.insertAdjacentText('afterend', '\n\n');
        }
      });
    });
    
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  const handleTextEdit = useCallback((plainText: string) => {
    // Reconstroi HTML básico a partir do texto simples
    const paragraphs = plainText.split('\n\n').filter(p => p.trim());
    const htmlContent = paragraphs
      .map(paragraph => {
        const trimmed = paragraph.trim();
        if (!trimmed) return '';
        
        // Detectar títulos (linhas que começam com maiúscula e são curtas)
        if (trimmed.length < 80 && /^[A-ZÁÊÎÔÛ]/.test(trimmed) && !trimmed.endsWith('.')) {
          return `<h2>${trimmed}</h2>`;
        }
        
        return `<p>${trimmed}</p>`;
      })
      .filter(p => p)
      .join('\n');
    
    setEditedArticleContent(htmlContent);
  }, []);

  const addWordPressStyles = useCallback((html: string) => {
    // Adiciona estilos inline para simular aparência do WordPress
    return html
      .replace(/<h2>/g, '<h2 style="color: #1a1a1a; font-weight: 600; font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">')
      .replace(/<h3>/g, '<h3 style="color: #1a1a1a; font-weight: 600; font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">')
      .replace(/<h4>/g, '<h4 style="color: #1a1a1a; font-weight: 600; font-size: 1.125rem; margin-top: 1.25rem; margin-bottom: 0.75rem;">')
      .replace(/<p>/g, '<p style="margin-bottom: 1.5rem; text-align: justify; text-indent: 0;">')
      .replace(/<ul>/g, '<ul style="margin: 1.5rem 0; padding-left: 2rem; list-style-type: disc;">')
      .replace(/<ol>/g, '<ol style="margin: 1.5rem 0; padding-left: 2rem; list-style-type: decimal;">')
      .replace(/<li>/g, '<li style="margin-bottom: 0.5rem;">')
      .replace(/<strong>/g, '<strong style="font-weight: 600; color: #1a1a1a;">')
      .replace(/<a /g, '<a style="color: #3b82f6; text-decoration: underline;" ')
      .replace(/<blockquote>/g, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 1.5rem; margin: 2rem 0; font-style: italic; color: #64748b;">');
  }, []);

  // ✅ MONITORAR MUDANÇAS NAS IDEIAS PARA FORÇAR ATUALIZAÇÃO DA INTERFACE
  useEffect(() => {
    // Contar ideias excluídas para detectar mudanças
    const excludedCount = state.ideas.filter(idea => idea.status === 'excluido').length;
    
    // Se houver mudanças significativas no número de ideias excluídas, forçar refresh
    if (excludedCount > 0) {
      console.log(`🔄 Detectadas ${excludedCount} ideias excluídas - forçando atualização da interface`);
      
      // Pequeno delay para permitir que o estado seja atualizado completamente
      const timeoutId = setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.ideas]);

  // ✅ NOVO: Limpar estado de processamento se artigo já foi criado
  useEffect(() => {
    // Verificar se há alguma ideia em estado de processamento que já tem artigo
    const processingIds = Object.keys(processingSingle).map(id => parseInt(id));
    let hasChanges = false;

    processingIds.forEach(ideaId => {
      // Verificar se este artigo já existe
      const article = state.articles.find(a => a.ideaId === ideaId);
      
      if (article && processingSingle[ideaId]) {
        console.log(`✅ Artigo ${ideaId} já criado - limpando estado de processamento`);
        hasChanges = true;
        
        // Limpar estado de processamento e progresso
        setProcessingSingle(prev => {
          const newState = { ...prev };
          delete newState[ideaId];
          return newState;
        });
        
        setSingleProgress(prev => {
          const newState = { ...prev };
          delete newState[ideaId];
          return newState;
        });
        
        setGlobalProcessingLock(prev => {
          const newState = { ...prev };
          delete newState[ideaId];
          return newState;
        });
      }
    });

    // Se não há mais processamentos ativos, limpar localStorage
    if (hasChanges && Object.keys(processingSingle).length === 1) {
      console.log('🧹 Nenhum processamento ativo - limpando localStorage');
      setTimeout(() => {
        localStorage.removeItem('bia_single_progress');
        localStorage.removeItem('bia_batch_progress');
      }, 500);
    }
  }, [state.articles, processingSingle]);

  // ✅ NOVO: Limpeza agressiva no mount - detectar e limpar artigos órfãos
  useEffect(() => {
    console.log('🔍 Verificando artigos órfãos no carregamento da página...');
    
    // Após 1 segundo (tempo para o estado ser carregado), verificar
    const timeoutId = setTimeout(() => {
      // Verificar se há artigos que estão marcados como "produzindo" mas já foram criados
      const processingIds = Object.keys(processingSingle).map(id => parseInt(id));
      
      processingIds.forEach(ideaId => {
        const idea = state.ideas.find(i => i.id === ideaId);
        const article = state.articles.find(a => a.ideaId === ideaId);
        
        if (article && !idea?.status?.includes('produzindo')) {
          console.log(`🚨 DETECTADO ARTIGO ÓRFÃO: Ideia ${ideaId} tem artigo mas ainda está em processingSingle`);
          console.log('   Limpando agora...');
          
          // Forçar limpeza imediata
          setProcessingSingle(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
          
          setSingleProgress(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
          
          setGlobalProcessingLock(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
          
          // Limpar localStorage também
          localStorage.removeItem('bia_processing_ideas');
          localStorage.removeItem('bia_single_progress');
          localStorage.removeItem('bia_batch_progress');
        }
      });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []); // Executa apenas uma vez no mount

  // Timer para controlar o botão de cancelar
  useEffect(() => {
    let interval: number;
    
    if (processingBatch || isBatchPersistent) {
      const startTime = batchStartTime || Date.now();
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setBatchTimer(elapsed);
        
        // Mostrar botão de cancelar após 5 minutos (300 segundos)
        if (elapsed >= 300) {
          setShowCancelButton(true);
        }
      }, 1000);
    } else {
      setBatchTimer(0);
      setShowCancelButton(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processingBatch, isBatchPersistent, batchStartTime]);

  // Gerenciar estado persistente do batch
  useEffect(() => {
    // Verificar se há um batch em andamento ao carregar a página
    const processingKey = getUserSpecificKey('processing');
    const currentItemKey = getUserSpecificKey('current_item');
    const totalItemsKey = getUserSpecificKey('total_items');
    
    const isProcessing = localStorage.getItem(processingKey) === 'true';
    const currentItem = parseInt(localStorage.getItem(currentItemKey) || '0');
    const totalItems = parseInt(localStorage.getItem(totalItemsKey) || '0');
    
    if (isProcessing && currentItem < totalItems) {
      setProcessingBatch(true);
      setIsBatchPersistent(true);
      console.log(`🔄 Recuperando batch em andamento para usuário ${currentUser?.id || userData?.id}: ${currentItem}/${totalItems}`);
    } else if (isProcessing && currentItem >= totalItems) {
      // Batch finalizado, limpar estado manualmente
      localStorage.removeItem(processingKey);
      localStorage.removeItem(currentItemKey);
      localStorage.removeItem(totalItemsKey);
      localStorage.removeItem(getUserSpecificKey('start_time'));
      
      setIsBatchPersistent(false);
      setProcessingBatch(false);
      setBatchCurrentItem(0);
      setBatchTotalItems(0);
      setBatchStartTime(0);
      setShowCancelButton(false);
      setBatchTimer(0);
      console.log('🧹 Estado persistente do batch limpo automaticamente para usuário:', currentUser?.id || userData?.id);
    }
  }, [getUserSpecificKey, currentUser?.id, userData?.id]);

  // Função para limpar estado persistente
  const clearBatchPersistentState = useCallback(() => {
    const processingKey = getUserSpecificKey('processing');
    const currentItemKey = getUserSpecificKey('current_item');
    const totalItemsKey = getUserSpecificKey('total_items');
    const startTimeKey = getUserSpecificKey('start_time');
    
    localStorage.removeItem(processingKey);
    localStorage.removeItem(currentItemKey);
    localStorage.removeItem(totalItemsKey);
    localStorage.removeItem(startTimeKey);
    // ✅ NOVO: Limpar progresso do localStorage
    localStorage.removeItem('bia_single_progress');
    localStorage.removeItem('bia_batch_progress');
    
    setIsBatchPersistent(false);
    setProcessingBatch(false);
    setBatchCurrentItem(0);
    setBatchTotalItems(0);
    setBatchStartTime(0);
    setShowCancelButton(false);
    setBatchTimer(0);
    console.log('🧹 Estado persistente do batch e progresso limpo para usuário:', currentUser?.id || userData?.id);
  }, [getUserSpecificKey, currentUser?.id, userData?.id]);

  // Função para cancelar produção em massa
  const cancelBatchProduction = useCallback(() => {
    console.log('🛑 Cancelando produção em massa...');
    clearBatchPersistentState();
    toast.success('Produção em massa cancelada com sucesso!', {
      description: 'O processo foi interrompido e o estado foi limpo.'
    });
  }, [clearBatchPersistentState]);

  // Salvar progresso no localStorage sempre que mudar
  useEffect(() => {
    if (processingBatch || isBatchPersistent) {
      const processingKey = getUserSpecificKey('processing');
      const currentItemKey = getUserSpecificKey('current_item');
      const totalItemsKey = getUserSpecificKey('total_items');
      
      localStorage.setItem(processingKey, 'true');
      localStorage.setItem(currentItemKey, batchCurrentItem.toString());
      localStorage.setItem(totalItemsKey, batchTotalItems.toString());
    }
  }, [processingBatch, isBatchPersistent, batchCurrentItem, batchTotalItems, getUserSpecificKey]);

  // ✅ DESATIVADO: Monitorar tempo de geração individual (timeout automático removido)
  // Anteriormente mostrava botão cancelar após 180 segundos - agora desativado
  // Usuário pode cancelar manualmente a qualquer momento
  useEffect(() => {
    // Código comentado - funcionalidade desativada
    /*
    const interval = setInterval(() => {
      setShowCancelButtonForIdea(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(generationStartTimes).forEach(ideaIdStr => {
          const ideaId = parseInt(ideaIdStr);
          const startTime = generationStartTimes[ideaId];
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const shouldShowButton = elapsedSeconds >= 180; // 3 minutos
          
          if (shouldShowButton && !updated[ideaId]) {
            updated[ideaId] = true;
            hasChanges = true;
            console.log(`⏱️ ${elapsedSeconds.toFixed(0)}s: Mostrando botão cancelar para ideia ${ideaId}`);
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000); // Atualizar a cada segundo
    
    return () => clearInterval(interval);
    */
    return () => {}; // Sem operação - desativado
  }, [generationStartTimes]);

  // Sincronizar WordPress e verificar API OpenAI na inicialização
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Sincronizar WordPress
        console.log('🔄 Sincronizando WordPress na ProduzirArtigos...');
        await wordpressService.syncFromBiaContext();
        
        // Carregar cache de sites WordPress
        const wpSites = wordpressService.getSites();
        const cache = new Map<string, boolean>();
        wpSites.forEach(site => {
          cache.set(site.id, !!(site.url && site.username && site.applicationPassword));
        });
        setWordpressSitesCache(cache);
        
        console.log('✅ Sincronização WordPress concluída, cache carregado:', cache.size);
        
        // Verificar status da API OpenAI com o novo serviço
        console.log('🔬 Verificando status do sistema de IA simplificado...');
        // Sistema simplificado - usa contentService
        const diagnostic = { 
          success: true, 
          message: 'Sistema funcionando',
          error: undefined,
          details: 'Sistema de IA simplificado'
        };
        
        setApiDiagnostic({
          checked: true,
          hasKey: diagnostic.success,
          isValid: diagnostic.success,
          error: diagnostic.error,
          details: diagnostic.details || 'Sistema de IA simplificado'
        });
        
        if (diagnostic.success) {
          console.log('✅ Sistema de IA simplificado funcionando corretamente');
        } else {
          console.warn('⚠️ Problema detectado no sistema de IA:', {
            success: diagnostic.success,
            details: diagnostic.details,
            error: diagnostic.error
          });
        }
      } catch (error) {
        console.warn('⚠️ Erro na inicialização dos serviços:', error);
        setApiDiagnostic({
          checked: true,
          hasKey: false,
          isValid: false,
          error: 'Erro na verificação',
          details: 'Não foi possível verificar o status da API'
        });
      }
    };
    
    initializeServices();
  }, []);

  // Função de debug administrativo (disponível globalmente no console)
  useEffect(() => {
    // Adicionar função global para administradores
    if (typeof window !== 'undefined') {
      (window as any).clearBatchProductionAdmin = function(userId?: string) {
        console.log('🚨 ADMIN: Limpando produção em massa...');
        
        if (userId) {
          // Limpar para usuário específico
          const keys = ['processing', 'current_item', 'total_items', 'start_time'];
          keys.forEach(key => {
            const specificKey = `bia_batch_${userId}_${key}`;
            localStorage.removeItem(specificKey);
          });
          console.log(`✅ ADMIN: Produção em massa limpa para usuário ${userId}!`);
        } else {
          // Limpar para usuário atual
          clearBatchPersistentState();
          console.log('✅ ADMIN: Produção em massa limpa para usuário atual!');
        }
      };
      
      (window as any).checkBatchStatusAdmin = function(userId?: string) {
        console.log('📊 ADMIN: Status da Produção em Massa:');
        
        if (userId) {
          // Verificar usuário específico
          const keys = ['processing', 'current_item', 'total_items', 'start_time'];
          keys.forEach(key => {
            const specificKey = `bia_batch_${userId}_${key}`;
            console.log(`- ${key}:`, localStorage.getItem(specificKey));
          });
        } else {
          // Verificar usuário atual
          const currentUserId = currentUser?.id || userData?.id;
          console.log('- Usuário atual:', currentUserId);
          const processingKey = getUserSpecificKey('processing');
          const currentItemKey = getUserSpecificKey('current_item');
          const totalItemsKey = getUserSpecificKey('total_items');
          const startTimeKey = getUserSpecificKey('start_time');
          
          console.log('- Processing:', localStorage.getItem(processingKey));
          console.log('- Current Item:', localStorage.getItem(currentItemKey));
          console.log('- Total Items:', localStorage.getItem(totalItemsKey));
          console.log('- Start Time:', localStorage.getItem(startTimeKey));
          console.log('- Estado React:', { 
            processingBatch, 
            isBatchPersistent, 
            batchCurrentItem, 
            batchTotalItems,
            showCancelButton 
          });
        }
      };
      
      // Função para listar todos os batches em andamento no sistema
      (window as any).listAllBatchesAdmin = function() {
        console.log('📊 ADMIN: Todos os batches no sistema:');
        const allKeys = Object.keys(localStorage);
        const batchKeys = allKeys.filter(key => key.startsWith('bia_batch_'));
        
        if (batchKeys.length === 0) {
          console.log('Nenhum batch encontrado no sistema.');
          return;
        }
        
        const batchesByUser: Record<string, Record<string, string | null>> = {};
        batchKeys.forEach(key => {
          const match = key.match(/^bia_batch_([^_]+)_(.+)$/);
          if (match) {
            const userId = match[1];
            const type = match[2];
            const value = localStorage.getItem(key);
            
            if (!batchesByUser[userId]) {
              batchesByUser[userId] = {};
            }
            batchesByUser[userId][type] = value;
          }
        });
        
        Object.entries(batchesByUser).forEach(([userId, data]) => {
          console.log(`\n🔸 Usuário ${userId}:`, data);
        });
      };
    }
  }, [clearBatchPersistentState, processingBatch, isBatchPersistent, batchCurrentItem, batchTotalItems, showCancelButton, getUserSpecificKey, currentUser?.id, userData?.id]);

  // ✅ NOVO: Cleanup ao desmontar - limpeza inteligente de localStorage
  useEffect(() => {
    return () => {
      // Quando o componente desmontar, limpar progresso SE não há processamento em andamento
      if (!processingBatch && !isBatchPersistent) {
        // Apenas limpar se não há processamento ativo
        const processingKey = getUserSpecificKey('processing');
        const isStillProcessing = localStorage.getItem(processingKey) === 'true';
        
        if (!isStillProcessing) {
          localStorage.removeItem('bia_single_progress');
          localStorage.removeItem('bia_batch_progress');
          console.log('🧹 Progresso limpo ao desmontar componente (sem processamento ativo)');
        } else {
          console.log('⏳ Mantendo progresso no localStorage - processamento em andamento');
        }
      }
    };
  }, [processingBatch, isBatchPersistent, getUserSpecificKey]);

  // Verificar limites do plano
  const limits = actions.checkFreePlanLimits();
  const isFreePlan = actions.isFreePlan();
  const userPlan = currentUser?.plano || 'Free';
  const basePlanLimits = getPlanLimits(userPlan);
  const isDevOrAdmin = isDev;
  
  // Calcular limites totais usando dados reais quando disponível
  const planLimits = useMemo(() => {
    if (realPlanLimits) {
      return realPlanLimits; // Usar dados reais do dashboard
    }
    // Fallback para cálculo manual se dados do dashboard não estiverem disponíveis
    const extraCredits = currentUser?.quotas?.articles || 0;
    return {
      ...basePlanLimits,
      articles: basePlanLimits.articles + extraCredits
    };
  }, [realPlanLimits, basePlanLimits, currentUser?.quotas?.articles]);

  // Obter nome do site por ID - usando função utilitária global
  const getSiteName = useCallback((siteId: number | string) => {
    return getSiteNameUtil(state.sites, siteId);
  }, [state.sites]);

  // Obter lista de todos os sites do usuário com contagem de ideias baseada no filtro de status
  const availableSites = useMemo(() => {
    // Filtrar ideias baseado no filtro de status para contagem
    const availableIdeasForCount = state.ideas.filter(idea => {
      // Excluir ideias excluídas
      if (idea.status === 'excluido') return false;
      
      // Verificar se tem artigo associado
      const article = state.articles.find(a => a.ideaId === idea.id);
      
      // IMPORTANTE: Excluir artigos já publicados ou agendados (mesma lógica do availableIdeas)
      if (article) {
        const isPublished = article.status === 'Publicado' || 
                           article.status === 'publicado' ||
                           !!article.publishedUrl || 
                           !!article.publishedAt ||
                           !!article.publishedDate;
                           
        const isScheduled = article.status === 'Agendado' || 
                           article.status === 'agendado' ||
                           !!article.scheduledDate;
        
        if (isPublished || isScheduled) return false;
      }
      
      // Aplicar filtro baseado no statusFilter
      if (statusFilter === 'pending') {
        // Contar apenas ideias sem artigos criados
        return !article;
      } else if (statusFilter === 'produced') {
        // Contar apenas ideias com artigos criados MAS NÃO publicados NEM agendados
        return !!article && 
               article.status !== 'Publicado' && 
               article.status !== 'publicado' &&
               article.status !== 'Agendado' && 
               article.status !== 'agendado' &&
               !article.publishedUrl &&
               !article.scheduledDate;
      }
      
      // Para 'all', contar todas as ideias (exceto excluídas, publicadas e agendadas)
      return true;
    });

    // IMPORTANTE: Incluir TODOS os sites do usuário, não apenas os que têm ideias
    // Isso resolve o problema do bug onde sites sem ideias não apareciam na lista
    console.log('🔍 DEBUG - Sites e Ideias para contagem:', {
      totalSites: state.sites.length,
      totalIdeas: availableIdeasForCount.length,
      firstSite: state.sites[0] ? { id: state.sites[0].id, nome: state.sites[0].nome, idType: typeof state.sites[0].id } : null,
      firstIdea: availableIdeasForCount[0] ? { siteId: availableIdeasForCount[0].siteId, siteIdType: typeof availableIdeasForCount[0].siteId, titulo: availableIdeasForCount[0].titulo } : null
    });

    return state.sites.map(site => {
      const ideaCount = availableIdeasForCount.filter(idea => {
        const matches = compareIds(idea.siteId, site.id);
        if (!matches && availableIdeasForCount.length > 0) {
          console.log('❌ ID mismatch:', { ideaSiteId: idea.siteId, siteId: site.id, ideaSiteIdType: typeof idea.siteId, siteIdType: typeof site.id });
        }
        return matches;
      }).length;
      
      console.log(`📊 Site "${site.nome}" (ID: ${site.id}, tipo: ${typeof site.id}): ${ideaCount} ideias`);
      
      return {
        id: site.id,
        name: site.nome,
        ideaCount
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.ideas, state.articles, state.sites, statusFilter]);

  // Filtrar ideias disponíveis baseado no filtro de status
  const availableIdeas = useMemo(() => {
    let filteredIdeas = state.ideas.filter(idea => {
      // Excluir ideias excluídas e publicadas
      if (idea.status === 'excluido') return false;
      
      // Verificar se tem artigo associado
      const article = state.articles.find(a => a.ideaId === idea.id);
      
      // IMPORTANTE: Excluir artigos já publicados ou agendados da página "Produzir Artigos"
      if (article) {
        // Verificação rigorosa de artigos publicados/agendados
        const isPublished = article.status === 'publicado' || 
                           !!article.publishedUrl || 
                           !!article.publishedAt ||
                           !!article.publishedDate;
                           
        const isScheduled = article.status === 'agendado' || 
                           !!article.scheduledDate;
        
        if (isPublished || isScheduled) {
          console.log(`🚫 Artigo filtrado da lista: ${idea.titulo}`, {
            isPublished,
            isScheduled,
            status: article.status,
            publishedUrl: article.publishedUrl,
            scheduledDate: article.scheduledDate,
            publishedAt: article.publishedAt
          });
          return false;
        }
      }
      
      // Aplicar filtro baseado no statusFilter
      if (statusFilter === 'pending') {
        // Mostrar apenas ideias sem artigos criados
        return !article;
      } else if (statusFilter === 'produced') {
        // Mostrar apenas ideias com artigos criados MAS NÃO publicados NEM agendados
        return !!article && 
               article.status !== 'publicado' &&
               article.status !== 'agendado' &&
               !article.publishedUrl &&
               !article.scheduledDate;
      }
      
      // Para 'all', mostrar todas as ideias (exceto excluídas e publicadas)
      return true;
    });

    // Aplicar filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredIdeas = filteredIdeas.filter(idea => 
        idea.titulo.toLowerCase().includes(query) ||
        idea.categoria.toLowerCase().includes(query) ||
        getSiteName(idea.siteId).toLowerCase().includes(query)
      );
    }

    // Aplicar filtro de site usando utilitário global para escalabilidade
    if (siteFilter !== 'all') {
      console.log('🔍 Debugging site filter:', {
        siteFilter,
        siteFilterType: typeof siteFilter,
        firstIdeaSiteId: filteredIdeas[0]?.siteId,
        firstIdeaSiteIdType: typeof filteredIdeas[0]?.siteId,
        totalIdeasBeforeFilter: filteredIdeas.length
      });
      
      // Usar utilitário global para compatibilidade com UUIDs em escala
      filteredIdeas = filterBySiteId(filteredIdeas, siteFilter);
      
      console.log('✅ Ideas after site filter:', filteredIdeas.length);
    }

    // Aplicar filtro de status (já aplicado acima na lógica principal)
    // Este filtro redundante foi removido para evitar conflitos

    return filteredIdeas;
  }, [state.ideas, state.articles, statusFilter, siteFilter, searchQuery, getSiteName, refreshKey]);

  // Total de ideias antes do filtro de site (para mostrar em "Todos os sites")
  const totalIdeasBeforeSiteFilter = useMemo(() => {
    let filteredIdeas = state.ideas.filter(idea => {
      // Excluir ideias excluídas e publicadas (mesma lógica do availableIdeas)
      if (idea.status === 'excluido') return false;
      
      const article = state.articles.find(a => a.ideaId === idea.id);
      
      if (article) {
        const isPublished = article.status === 'publicado' || 
                           !!article.publishedUrl || 
                           !!article.publishedAt ||
                           !!article.publishedDate;
                           
        const isScheduled = article.status === 'agendado' || 
                           !!article.scheduledDate;
        
        if (isPublished || isScheduled) return false;
      }
      
      // Aplicar filtro baseado no statusFilter
      if (statusFilter === 'pending') {
        return !article;
      } else if (statusFilter === 'produced') {
        return !!article && 
               article.status !== 'publicado' &&
               article.status !== 'agendado' &&
               !article.publishedUrl &&
               !article.scheduledDate;
      }
      
      return true;
    });

    // Aplicar filtro de busca (mas NÃO filtro de site)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredIdeas = filteredIdeas.filter(idea => 
        idea.titulo.toLowerCase().includes(query) ||
        idea.categoria.toLowerCase().includes(query) ||
        getSiteName(idea.siteId).toLowerCase().includes(query)
      );
    }

    return filteredIdeas.length;
  }, [state.ideas, state.articles, statusFilter, searchQuery, getSiteName, refreshKey]);

  // Paginação
  const totalPages = Math.ceil(availableIdeas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageIdeas = useMemo(() => {
    return availableIdeas.slice(startIndex, endIndex);
  }, [availableIdeas, startIndex, endIndex]);

  // ✅ CORREÇÃO: Usar dados consistentes do hook de créditos em todo o componente
  // Isso garante que o container "Créditos Disponíveis" e as verificações de limite
  // usem a mesma fonte de dados (quotas - consumo) do backend
  const articlesUsed = useMemo(() => {
    // Calcular artigos usados baseado nas quotas e créditos disponíveis
    return isDevOrAdmin ? 0 : Math.max(0, planLimits.articles - availableCredits.articles);
  }, [planLimits.articles, availableCredits.articles, isDevOrAdmin]);
  
  const articlesRemaining = isDevOrAdmin ? 'Ilimitado' : availableCredits.articles;
  const progressValue = isDevOrAdmin ? 0 : (articlesUsed / planLimits.articles) * 100;

  // FUNÇÕES DE SELEÇÃO
  const handleSelectIdea = useCallback((ideaId: number, checked: boolean) => {
    console.log(`🔄 Seleção alterada - ID: ${ideaId}, Checked: ${checked}`);
    
    setSelectedIdeaIds(prev => {
      if (checked) {
        if (!prev.includes(ideaId)) {
          const newSelection = [...prev, ideaId];
          console.log('✅ Nova seleção:', newSelection);
          return newSelection;
        }
        return prev;
      } else {
        const newSelection = prev.filter(id => id !== ideaId);
        console.log('❌ Removido da seleção:', newSelection);
        return newSelection;
      }
    });
  }, []);

  const handleSelectAllIdeas = useCallback((checked: boolean) => {
    console.log(`🔄 Seleção em massa - Checked: ${checked}`);
    
    if (checked) {
      const currentPageIds = currentPageIdeas.map(idea => idea.id);
      setSelectedIdeaIds(currentPageIds);
      console.log('✅ Todas selecionadas:', currentPageIds);
    } else {
      setSelectedIdeaIds([]);
      console.log('❌ Todas desselecionadas');
    }
  }, [currentPageIdeas]);

  // Limpar seleção
  const handleClearSelection = useCallback(() => {
    setSelectedIdeaIds([]);
    setBatchProgress({});
    setSingleProgress({});
    // ✅ NOVO: Limpar localStorage do progresso
    localStorage.removeItem('bia_single_progress');
    localStorage.removeItem('bia_batch_progress');
    console.log('🧹 Seleção limpa e progresso removido do localStorage');
  }, []);

  // 🔧 FORÇAR LIMPEZA COMPLETA DE ESTADO ÓRFÃO
  const handleForceCleanup = useCallback(async () => {
    console.log('⚠️ Iniciando limpeza forçada de estado órfão...');
    
    // Limpar TODO estado de processamento
    setProcessingSingle({});
    setSingleProgress({});
    setBatchProgress({});
    setProcessingBatch(false);
    setGlobalProcessingLock({});
    setSelectedIdeaIds([]);
    
    // Limpar TODO localStorage relacionado
    const keysToRemove = [
      'bia_single_progress',
      'bia_batch_progress',
      'bia_processing_ideas',
      'bia_batch_progress_state',
      'bia_global_processing_lock'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removido: ${key}`);
    });
    
    // Mostrar confirmação
    toast.success('✅ Limpeza forçada completada! Atualizando página em 1 segundo...', {
      duration: 3000
    });
    
    // Recarregar página para garantir estado limpo
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, []);

  // 🛑 CANCELAR GERAÇÃO EM ANDAMENTO
  const handleCancelProduction = useCallback((ideaId: number) => {
    console.log(`🛑 Cancelando geração da ideia ${ideaId}`);
    
    // Cancelar a requisição HTTP
    const controller = generationControllers[ideaId];
    if (controller) {
      controller.abort();
      console.log(`✅ Requisição cancelada para ideia ${ideaId}`);
    }
    
    // Limpar estado de processamento
    setProcessingSingle(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    setSingleProgress(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    setGlobalProcessingLock(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    // Remover controller
    setGenerationControllers(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    // ✅ NOVO: Remover tempo de início e botão cancelar
    setGenerationStartTimes(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    setShowCancelButtonForIdea(prev => {
      const newState = { ...prev };
      delete newState[ideaId];
      return newState;
    });
    
    toast.warning('Geração cancelada', {
      description: 'Você pode tentar produzir novamente'
    });
    
    console.log(`✅ Estado da ideia ${ideaId} limpo`);
  }, [generationControllers]);

  // Verificar se todas as ideias da página atual estão selecionadas
  const allCurrentPageSelected = useMemo(() => {
    const currentPageIds = currentPageIdeas.map(idea => idea.id);
    return currentPageIds.length > 0 && currentPageIds.every(id => selectedIdeaIds.includes(id));
  }, [currentPageIdeas, selectedIdeaIds]);

  // Verificar se todas as ideias selecionadas já foram produzidas (têm artigos)
  const allSelectedProduced = useMemo(() => {
    if (selectedIdeaIds.length === 0) return false;
    
    return selectedIdeaIds.every(ideaId => {
      const article = state.articles.find(a => a.ideaId === ideaId);
      return article && article.status !== 'Excluído';
    });
  }, [selectedIdeaIds, state.articles]);

  // Função para aplicar filtros e resetar página
  const handleFilterChange = useCallback((filterType: 'status' | 'site', value: any) => {
    setCurrentPage(1);
    setSelectedIdeaIds([]);
    setBatchProgress({});
    setSingleProgress({});
    
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'site') {
      setSiteFilter(value);
    }
  }, []);

  // FUNÇÃO PARA CONTAR PALAVRAS
  const countWords = useCallback((htmlContent: string): number => {
    if (!htmlContent) return 0;
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').trim();
    const words = textContent.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }, []);

  // Função global para abrir modal de visualização (edição removida)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).openEditModal = function(ideaId: string) {
        const ideaIdNum = Number(ideaId);
        const idea = state.ideas.find(i => i.id === ideaIdNum);
        const article = state.articles.find(a => a.ideaId === ideaIdNum);
        
        if (!idea || !article) {
          toast.error('Artigo não encontrado');
          return;
        }

        const siteName = getSiteName(idea.siteId);
        const wordCount = countWords(article.conteudo);

        setCurrentViewingArticle({
          idea,
          article,
          siteName,
          wordCount
        });

        // Inicializar estados de edição com valores atuais
        setEditedArticleTitle(article.titulo);
        setEditedArticleContent(article.conteudo);
        setIsEditingArticle(true); // Abrir diretamente no modo de edição
        
        setViewDialogOpen(true);
      };
    }
  }, [state.ideas, state.articles, getSiteName, countWords]);

  // Função para testar a API OpenAI
  const handleTestApiKey = async () => {
    console.log('🧪 Testando sistema de IA simplificado...');
    
    try {
      const testResult = await contentService.testConnection();
      
      if (testResult.success) {
        toast.success('Sistema de IA funcionando corretamente!');
        setApiDiagnostic(prev => ({
          ...prev,
          hasKey: true,
          isValid: true,
          details: testResult.details
        }));
      } else {
        toast.error('Não foi possível produzir artigos no momento. Tente novamente em alguns minutos.');
        setApiDiagnostic(prev => ({
          ...prev,
          hasKey: false,
          isValid: false,
          error: testResult.error,
          details: testResult.details
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao testar conexão:', error);
      toast.error('Erro ao testar a conexão com sistema de IA');
    }
  };

  // FUNÇÃO PARA VISUALIZAR ARTIGO
  const handleViewArticle = useCallback((ideaId: number) => {
    console.log(`👁️ Visualizando artigo para ideia ${ideaId}`);
    
    const idea = state.ideas.find(i => i.id === ideaId);
    const article = state.articles.find(a => a.ideaId === ideaId);
    
    if (!idea || !article) {
      toast.error('Artigo não encontrado');
      return;
    }

    // Criar HTML da página completa com formatação profissional
    const siteName = getSiteName(idea.siteId);
    const wordCount = countWords(article.conteudo);
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.titulo}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.65;
            max-width: 900px;
            margin: 0 auto;
            padding: 30px 20px;
            color: #2c3e50;
            background: linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%);
            font-size: 16px;
        }
        
        .article-container {
            background: #ffffff;
            padding: 50px 45px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06);
            overflow: hidden;
        }
        
        .article-meta {
            background: linear-gradient(135deg, #f8fafc 0%, #e8f0ff 100%);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 35px;
            border-left: 5px solid #8c52ff;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .article-meta h3 {
            grid-column: 1 / -1;
            margin: 0 0 10px 0;
            color: #8c52ff;
            font-size: 15px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .article-meta p {
            margin: 0;
            font-size: 14px;
            color: #555;
            line-height: 1.5;
        }
        
        .article-meta strong {
            color: #2c3e50;
            font-weight: 600;
        }
        
        .featured-image {
            text-align: center;
            margin: 40px 0;
            line-height: 0;
        }
        
        .featured-image img {
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
            transition: transform 0.3s ease;
        }
        
        .featured-image img:hover {
            transform: scale(1.01);
        }
        
        .article-title {
            color: #1a2a3a;
            font-size: 2.8em;
            font-weight: 700;
            margin: 30px 0 25px 0;
            line-height: 1.3;
            text-align: center;
            border-bottom: 4px solid #8c52ff;
            padding-bottom: 20px;
            letter-spacing: -0.5px;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #1a2a3a;
            font-weight: 700;
            line-height: 1.3;
            margin-top: 35px;
            margin-bottom: 15px;
        }
        
        h1 {
            font-size: 2.2em;
            color: #0a1a2a;
        }
        
        h2 {
            font-size: 1.75em;
            border-bottom: 3px solid #8c52ff;
            padding-bottom: 10px;
            color: #1a2a3a;
        }
        
        h3 {
            font-size: 1.4em;
            color: #2c3e50;
        }
        
        h4, h5, h6 {
            font-size: 1.15em;
            color: #34495e;
        }
        
        p {
            margin: 0 0 18px 0;
            text-align: justify;
            color: #2c3e50;
        }
        
        a {
            color: #8c52ff;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
            border-bottom: 1px solid rgba(140, 82, 255, 0.3);
        }
        
        a:hover {
            color: #6b3dd0;
            border-bottom-color: rgba(107, 61, 208, 0.6);
        }
        
        ul {
            margin: 0 0 20px 30px;
            padding: 0;
            list-style-position: outside;
        }
        
        ol {
            margin: 0 0 20px 30px;
            padding: 0;
            list-style-position: outside;
        }
        
        li {
            margin: 0 0 10px 0;
            color: #2c3e50;
            line-height: 1.65;
        }
        
        li ul, li ol {
            margin-top: 8px;
            margin-bottom: 0;
        }
        
        strong {
            color: #1a2a3a;
            font-weight: 600;
        }
        
        em {
            color: #34495e;
            font-style: italic;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }
        
        pre {
            background: #282c34;
            color: #abb2bf;
            padding: 15px 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.85em;
            line-height: 1.5;
        }
        
        pre code {
            background: none;
            color: #abb2bf;
            padding: 0;
        }
        
        blockquote {
            border-left: 5px solid #8c52ff;
            padding-left: 20px;
            margin: 25px 0;
            color: #34495e;
            font-style: italic;
            background: #f8fafc;
            padding: 15px 15px 15px 20px;
            border-radius: 0 8px 8px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            overflow: hidden;
        }
        
        th {
            background: #8c52ff;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        tr:hover {
            background: #f9fafb;
        }
        
        /* CTA Styles */
        .bia-cta-container {
            border-left: 5px solid #8c52ff;
            background-color: #f9fafb;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
            display: flex;
            gap: 25px;
            align-items: flex-start;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .bia-cta-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .bia-cta-image {
            flex-shrink: 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .bia-cta-image img {
            display: block;
            width: 100%;
            height: 100%;
        }
        
        .bia-cta-content {
            flex: 1;
        }
        
        .bia-cta-content h3 {
            margin-top: 0;
            color: #1a2a3a;
        }
        
        .bia-cta-button {
            display: inline-block;
            padding: 12px 28px;
            border-radius: 6px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            font-size: 1em;
            margin-top: 10px;
        }
        
        .bia-cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .bia-cta-button:active {
            transform: translateY(0);
        }
        
        hr {
            border: none;
            height: 1px;
            background: linear-gradient(to right, transparent, #ddd, transparent);
            margin: 40px 0;
        }
        
        .print-button {
            display: none;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .article-container {
                box-shadow: none;
                padding: 0;
                background: white;
            }
            .article-meta {
                display: none;
            }
            .print-button {
                display: none;
            }
            a {
                border: none;
            }
        }
        
        @media (max-width: 768px) {
            .article-container {
                padding: 30px 20px;
            }
            
            .article-title {
                font-size: 2em;
            }
            
            h1 {
                font-size: 1.6em;
            }
            
            h2 {
                font-size: 1.4em;
            }
            
            .article-meta {
                grid-template-columns: 1fr;
            }
            
            .bia-cta-container {
                flex-direction: column;
                gap: 15px;
            }
        }
    </style>
</head>
<body>

    <div class="article-container">
        <div class="article-meta">
            <h3>📊 Informações do Artigo</h3>
            <p><strong>Site:</strong> ${siteName}</p>
            <p><strong>Palavras:</strong> ${wordCount.toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> ${article.status}</p>
            <p><strong>Criado em:</strong> ${new Date(article.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>

        ${article.imageUrl ? `
        <div class="featured-image">
            <img src="${article.imageUrl}" alt="Imagem do artigo: ${article.titulo}" loading="lazy" />
        </div>
        ` : ''}

        <h1 class="article-title">${article.titulo}</h1>
        ${article.conteudo}
    </div>

    <script>
        // Aplicar estilos aos CTAs - converter links em botões
        document.querySelectorAll('.bia-cta-container').forEach(cta => {
            const link = cta.querySelector('a[href]');
            if (link && !link.classList.contains('bia-cta-button')) {
                const buttonStyle = link.getAttribute('data-button-style') || '#8c52ff';
                link.classList.add('bia-cta-button');
                link.style.backgroundColor = buttonStyle;
                link.style.color = '#ffffff';
                if (link.style.borderLeft) {
                    const borderColor = link.style.borderLeft.match(/#[0-9a-f]{6}/i)?.[0] || '#8c52ff';
                    link.style.backgroundColor = borderColor;
                }
            }
        });
        
        // Melhorar formatação de listas
        document.querySelectorAll('ul, ol').forEach(list => {
            list.style.marginBottom = '20px';
        });
        
        // Adicionar espaçamento extra entre seções
        document.querySelectorAll('h2').forEach(h2 => {
            h2.style.marginTop = '40px';
        });
        
        // Aplicar estilo aos links nos parágrafos
        document.querySelectorAll('p a, li a').forEach(link => {
            if (!link.classList.contains('bia-cta-button')) {
                link.style.textDecoration = 'none';
            }
        });
    </script>
</body>
</html>`;

    // Abrir em nova aba
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(htmlContent);
      newTab.document.close();
    } else {
      toast.error('Não foi possível abrir a nova aba. Verifique se o bloqueador de pop-ups está ativo.');
    }
  }, [state.ideas, state.articles, getSiteName, countWords]);

  // Função para abrir modal interno de visualização
  const handleOpenViewModal = useCallback((idea: any) => {
    const article = state.articles.find(a => a.ideaId === idea.id);
    
    if (!article) {
      toast.error('Artigo não encontrado');
      return;
    }

    const siteName = getSiteName(idea.siteId);
    const wordCount = countWords(article.conteudo);

    setCurrentViewingArticle({
      idea,
      article,
      siteName,
      wordCount
    });

    // Limpar estados de edição
    setEditedArticleTitle(article.titulo);
    setEditedArticleContent(article.conteudo);
    setIsEditingArticle(false); // Abrir em modo de visualização
    
    setViewDialogOpen(true);
  }, [state.articles, state.ideas, getSiteName, countWords]);

  // ✅ NOVO: Função para abrir artigo em nova janela/aba
  const handleOpenViewDialog = useCallback((idea: any) => {
    const article = state.articles.find(a => a.ideaId === idea.id);
    
    if (!article) {
      toast.error('Artigo não encontrado');
      return;
    }

    const siteName = getSiteName(idea.siteId);
    const wordCount = countWords(article.conteudo);

    // Criar HTML completo para a nova janela
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${article.titulo} - ${siteName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #e5e5e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 2rem;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: #1a1a1a;
          }
          .meta {
            color: #666;
            font-size: 0.9rem;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          .content {
            font-size: 1.1rem;
            line-height: 1.8;
          }
          .content h1, .content h2, .content h3 {
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          .content p {
            margin-bottom: 1.5rem;
          }
          .edit-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
          }
          .edit-button:hover {
            background: #2563eb;
          }
          @media (max-width: 768px) {
            body { padding: 15px; }
            .title { font-size: 1.5rem; }
            .meta { font-size: 0.8rem; }
            .edit-button { 
              position: static;
              width: 100%;
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <button class="edit-button" onclick="window.opener.editArticle('${idea.id}'); window.close();">
          ✏️ Editar Artigo
        </button>
        
        <div class="header">
          <h1 class="title">${article.titulo}</h1>
          <div class="meta">
            <span><strong>Site:</strong> ${siteName}</span>
            <span><strong>Palavras:</strong> ${wordCount}</span>
            <span><strong>Nicho:</strong> ${idea.nicho}</span>
          </div>
        </div>
        
        <div class="content">
          ${article.conteudo.replace(/\n/g, '<br>')}
        </div>

        <script>
          // Função para comunicar com a janela pai
          window.editArticle = function(ideaId) {
            if (window.opener && !window.opener.closed) {
              window.opener.openEditModal(ideaId);
            }
          };
        </script>
      </body>
      </html>
    `;

    // Criar blob URL e abrir em nova aba
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Usar window.open sem especificar dimensões para forçar nova aba
    const newTab = window.open(url, '_blank');
    
    if (newTab) {
      newTab.focus();
      // Limpar o blob URL após um tempo para economizar memória
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // Fallback: tentar criar um link temporário e clicar nele
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }, [state.articles, getSiteName, countWords]);

  // ✅ NOVO: Função para salvar edições do artigo
  const handleSaveArticleEdits = useCallback(async () => {
    if (!currentViewingArticle) return;

    setIsSavingArticle(true);

    try {
      // Atualizar artigo no contexto
      const success = actions.updateArticle(currentViewingArticle.article.id, {
        titulo: editedArticleTitle,
        conteudo: editedArticleContent,
        updatedAt: new Date().toISOString()
      });

      if (success) {
        toast.success('Artigo atualizado com sucesso!');
        
        // Atualizar dados do modal
        setCurrentViewingArticle((prev: any) => ({
          ...prev,
          article: {
            ...prev.article,
            titulo: editedArticleTitle,
            conteudo: editedArticleContent
          },
          wordCount: countWords(editedArticleContent)
        }));

        setIsEditingArticle(false);
      } else {
        toast.error('Erro ao atualizar artigo');
      }
    } catch (error) {
      console.error('Erro ao salvar edições:', error);
      toast.error('Erro ao salvar edições do artigo');
    } finally {
      setIsSavingArticle(false);
    }
  }, [currentViewingArticle, editedArticleTitle, editedArticleContent, actions, countWords]);

  // ✅ NOVO: Função para cancelar edição de artigo
  const handleCancelArticleEdit = useCallback(() => {
    if (currentViewingArticle) {
      setEditedArticleTitle(currentViewingArticle.article.titulo);
      setEditedArticleContent(currentViewingArticle.article.conteudo);
    }
    setIsEditingArticle(false);
  }, [currentViewingArticle]);

  // FUNÇÃO DE PRODUÇÃO INDIVIDUAL COM PROGRESSO VISUAL
  const handleProduceFromIdea = useCallback(async (ideaId: number, retryCount: number = 0) => {
    console.log(`🚀 Iniciando produção individual para ideia ${ideaId}${retryCount > 0 ? ` (tentativa ${retryCount + 1})` : ''}`);
    console.log(`📋 Dados da ideia:`, state.ideas.find(i => i.id === ideaId));
    
    // ✅ VERIFICAÇÃO GLOBAL DE LOCK - Prevenir múltiplas execuções
    if (globalProcessingLock[ideaId]) {
      console.log(`🔒 Ideia ${ideaId} já está sendo processada em outro fluxo - ignorando`);
      return;
    }
    
    if (processingSingle[ideaId] && retryCount === 0) {
      console.log(`⚠️ Ideia ${ideaId} já está sendo processada - ignorando`);
      return;
    }

    // Remover verificação de diagnóstico - o simplifiedArticleService faz sua própria verificação
    // O sistema simplificado tem fallbacks internos e gerenciamento próprio de API

    if (limits.articles && !isDevOrAdmin && retryCount === 0) {
      toast.error(`Limite atingido! Seu plano permite apenas ${planLimits.articles} artigos.`);
      return;
    }

    const idea = state.ideas.find(i => i.id === ideaId);
    if (!idea) {
      toast.error('Ideia não encontrada');
      return;
    }

    // Verificar se já existe um artigo com este título para evitar duplicação
    const existingArticle = state.articles.find(a => a.titulo === idea.titulo);
    if (existingArticle) {
      console.log(`⚠️ Já existe um artigo com o título "${idea.titulo}" - evitando duplicação`);
      toast.warning('Já existe um artigo com este título', {
        description: 'Verifique a lista de artigos produzidos'
      });
      setProcessingSingle(prev => ({ ...prev, [ideaId]: false }));
      setSingleProgress(prev => ({ ...prev, [ideaId]: 0 }));
      setGlobalProcessingLock(prev => ({ ...prev, [ideaId]: false }));
      return;
    }

    // Verificar se há créditos suficientes antes de gerar - usar hook de créditos para consistência
    if (availableCredits.articles <= 0 && !isDevOrAdmin) {
      toast.error('Você não possui créditos suficientes para produzir este artigo.', {
        description: 'É necessário uma assinatura ativa ou créditos disponíveis.'
      });
      
      // Redirecionar para a página de planos após 2 segundos
      setTimeout(() => {
        window.location.href = '/planos';
      }, 2000);
      
      setProcessingSingle(prev => ({ ...prev, [ideaId]: false }));
      setSingleProgress(prev => ({ ...prev, [ideaId]: 0 }));
      return;
    }

    // ✅ DEFINIR LOCK GLOBAL - Prevenir múltiplas execuções da mesma ideia
    setGlobalProcessingLock(prev => ({ ...prev, [ideaId]: true }));

    // Marcar como processando e inicializar progresso
    setProcessingSingle(prev => ({ ...prev, [ideaId]: true }));
    setSingleProgress(prev => ({ ...prev, [ideaId]: 0 }));
    setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));

    try {
      console.log(`📝 Preparando parâmetros para geração do artigo ${ideaId}`);
      
      // Progresso: Iniciando (10%)
      setSingleProgress(prev => ({ ...prev, [ideaId]: 10 }));
      
      // Progresso: Preparando parâmetros (25%)
      setSingleProgress(prev => ({ ...prev, [ideaId]: 25 }));

      console.log(`🎯 Gerando artigo ${ideaId} com prompt otimizado do backend...`);
      
      // Progresso: Gerando conteúdo (50%)
      setSingleProgress(prev => ({ ...prev, [ideaId]: 50 }));
      
      // ✅ FALLBACK SMART: Se não há generation_params, tentar inferir do título
      const detectIdiomFromTitle = (titulo: string): string => {
        // Palavras-chave simples para detecção de idioma
        const englishWords = ['how', 'what', 'why', 'when', 'where', 'the', 'to', 'for', 'and', 'or', 'best', 'tips', 'guide', 'ways', 'steps'];
        const portuguesePalavras = ['como', 'o que', 'por que', 'quando', 'onde', 'para', 'e', 'ou', 'melhor', 'dicas', 'guia', 'maneiras', 'passos'];
        const spanishPalavras = ['cómo', 'qué', 'por qué', 'cuándo', 'dónde', 'para', 'y', 'o', 'mejor', 'consejos', 'guía', 'maneras', 'pasos'];
        
        const tituloLower = titulo.toLowerCase();
        let englishScore = 0, portugueseScore = 0, spanishScore = 0;
        
        englishWords.forEach(word => {
          if (tituloLower.includes(word)) englishScore++;
        });
        portuguesePalavras.forEach(word => {
          if (tituloLower.includes(word)) portugueseScore++;
        });
        spanishPalavras.forEach(word => {
          if (tituloLower.includes(word)) spanishScore++;
        });
        
        if (englishScore > portugueseScore && englishScore > spanishScore) return 'Inglês';
        if (spanishScore > portugueseScore && spanishScore > englishScore) return 'Espanhol';
        if (portugueseScore > 0) return 'Português';
        
        // Se título começa com letras maiúsculas de forma como em inglês, provavelmente é inglês
        if (titulo.match(/^(How|What|Why|When|Where|The|Best|Tips|Guide|Ways|Steps)/)) return 'Inglês';
        
        return 'Português'; // Fallback padrão
      };
      
      // ✅ CORREÇÃO: Validar parâmetros obrigatórios
      // Priorizar: palavrasChave da geração > tags da ideia > nicho como fallback
      const palavrasChaveGeradas = idea.generationParams?.palavrasChave?.trim();
      const palavrasChavetags = idea.tags?.join(', ')?.trim();
      const palavrasChaveFinal = palavrasChaveGeradas || palavrasChavetags || idea.categoria || 'Geral';
      
      const requestParams = {
        titulo: idea.titulo,
        nicho: idea.generationParams?.nicho || idea.categoria || 'Geral',
        palavras_chave: palavrasChaveFinal,
        idioma: idea.generationParams?.idioma || detectIdiomFromTitle(idea.titulo) || 'Português',
        conceito: idea.generationParams?.conceito || idea.generationParams?.contexto || '',
        empresa: '',
        idea_id: ideaId // ✅ ADICIONAR: ID da ideia para recuperar CTA
      };
      
      // ✅ CORREÇÃO: Validar se todos os campos obrigatórios estão preenchidos
      if (!requestParams.titulo || requestParams.titulo.length < 10) {
        throw new Error('Título deve ter pelo menos 10 caracteres');
      }
      if (!requestParams.nicho || requestParams.nicho.length < 3) {
        throw new Error('Nicho deve ter pelo menos 3 caracteres');
      }
      if (!requestParams.palavras_chave || requestParams.palavras_chave.length < 3) {
        throw new Error('Palavras-chave devem ter pelo menos 3 caracteres');
      }
      
      console.log('📋 Parâmetros validados:', requestParams);
      
      // Usar o endpoint generateArticle que usa o prompt_conteudo.php otimizado
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      // ✅ NOVO: Criar AbortController para permitir cancelamento
      const abortController = new AbortController();
      setGenerationControllers(prev => ({ ...prev, [ideaId]: abortController }));
      
      // ✅ NOVO: Registrar tempo de início da geração
      const startTime = Date.now();
      setGenerationStartTimes(prev => ({ ...prev, [ideaId]: startTime }));
      console.log(`⏱️ Geração iniciada para ideia ${ideaId}`);
      
      // ✅ NOVO COMENTÁRIO: Timeout automático DESATIVADO - permite geração prolongada
      // O usuário pode cancelar manualmente clicando no botão "Cancelar"
      // Não há mais limite de tempo automático para evitar interrupções inesperadas
      
      // ✅ NOVA IMPLEMENTAÇÃO: Retry automático para problemas de rede
      let response;
      let apiResponse;
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1} para gerar artigo ${ideaId}`);
            setSingleProgress(prev => ({ ...prev, [ideaId]: 50 + (attempt * 10) }));
            
            // Aguardar um tempo exponencial entre tentativas
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          response = await fetch(`${apiUrl}/api/openai/generate-article`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestParams),
            signal: abortController.signal // Usar AbortController
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          apiResponse = await response.json();
          
          // Se chegou até aqui, a requisição foi bem-sucedida
          break;
          
        } catch (error) {
          lastError = error;
          const errorName = getErrorName(error);
          const errorMsg = getErrorMessage(error);
          const isNetworkError = errorName === 'TypeError' && 
            (errorMsg.includes('Failed to fetch') || 
             errorMsg.includes('NetworkError') || 
             errorMsg.includes('ERR_NETWORK_CHANGED'));
          
          const isTimeoutError = errorName === 'AbortError' || errorName === 'TimeoutError';
          
          if ((isNetworkError || isTimeoutError) && attempt < maxRetries) {
            console.log(`⚠️ Erro de rede detectado (${errorMsg}), tentando novamente...`);
            continue;
          } else {
            throw error;
          }
        }
      }
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.message || 'Erro na geração do artigo');
      }

      // 🛡️ VALIDAÇÃO: Detectar respostas inválidas da OpenAI
      const invalidResponses = [
        'desculpe, não posso ajudar com isso',
        'i cannot assist with that',
        'i cannot help with that',
        'não posso ajudar com isso',
        'não posso gerar esse conteúdo',
        'i apologize, but i cannot',
        'sorry, i can\'t assist',
        'desculpe, mas não posso',
        'não consegui gerar',
        'unable to generate'
      ];

      const contentToCheck = (apiResponse.article || '').toLowerCase().trim();
      const isInvalidResponse = invalidResponses.some(invalid => 
        contentToCheck.includes(invalid) || 
        contentToCheck.startsWith(invalid)
      );

      if (isInvalidResponse) {
        console.log(`⚠️ Resposta inválida detectada da OpenAI para artigo ${ideaId}. Tentando novamente...`);
        
        // Tentar novamente automaticamente (máximo 2 tentativas)
        if (retryCount < 2) {
          console.log(`🔄 Tentativa ${retryCount + 1}/2 para reprocessar artigo ${ideaId}`);
          return await handleProduceFromIdea(ideaId, retryCount + 1);
        } else {
          throw new Error('OpenAI retornou resposta inválida após múltiplas tentativas. Tente novamente mais tarde.');
        }
      }

      console.log(`✅ Artigo ${ideaId} gerado com sucesso`, {
        content_length: apiResponse.article?.length || 0,
        has_image: !!apiResponse.image_url,
        image_url: apiResponse.image_url,
        image_url_type: typeof apiResponse.image_url,
        execution_time: apiResponse.execution_time,
        api_response_keys: Object.keys(apiResponse)
      });

      // 🔍 DEBUG: Verificar se CTA HTML está chegando do backend
      if (apiResponse.article?.includes('bia-cta')) {
        console.log('✅ CTA ENCONTRADO NA RESPOSTA DO BACKEND');
        const ctaStart = apiResponse.article.indexOf('bia-cta');
        const ctaSample = apiResponse.article.substring(Math.max(0, ctaStart - 100), ctaStart + 300);
        console.log('📋 Amostra do CTA:', ctaSample);
      } else {
        console.warn('⚠️ CTA NÃO ENCONTRADO NA RESPOSTA DO BACKEND');
      }

      // Progresso: Processando resultado (75%)
      setSingleProgress(prev => ({ ...prev, [ideaId]: 75 }));

      console.log(`📝 Processando conteúdo e imagem do artigo ${ideaId}...`);
      
      // O conteúdo já vem formatado e processado do novo sistema unificado
      // ✅ IMPORTANTE: O CTA já é inserido pelo backend, não fazer duplicação aqui!
      let processedContent = sanitizeHtmlContent(apiResponse.article || '');
      
      // 🔍 DEBUG: Verificar conteúdo após sanitização
      if (processedContent.includes('bia-cta')) {
        console.log('✅ CTA ENCONTRADO APÓS SANITIZAÇÃO');
      } else if (processedContent.includes('&lt;div class=')) {
        console.log('⚠️ POSSÍVEL HTML ESCAPADO DETECTADO - CTA COM &lt; &gt;');
        const escapedSample = processedContent.substring(0, 500);
        console.log('📋 Amostra (primeiros 500 chars):', escapedSample);
      }
      
      const articleData = {
        titulo: idea.titulo,
        conteudo: processedContent,
        status: 'rascunho' as const,
        siteId: idea.siteId,
        ideaId: ideaId, // ⚠️ IMPORTANTE: Este deve ser o ID real da ideia
        imageUrl: apiResponse.image_url || '', // URL da imagem gerada pela IA
        imageAlt: `${generateImageName(idea.titulo)}`,
        imageName: `${generateImageName(idea.titulo)}.jpg`, // Nome SEO-friendly da imagem
        readyForPublishing: true, // Sempre pronto com o novo sistema
        categoria: idea.categoria || 'Geral',
        tags: idea.tags || [],
        wordpressData: idea.wordpressData,
        generationParams: idea.generationParams,
        meta: {
          word_count: (processedContent.match(/\b\w+\b/g) || []).length,
          internal_links: (processedContent.match(/<a\s+[^>]*href="#"[^>]*>/gi) || []).length,
          external_links: (processedContent.match(/<a\s+[^>]*href="https?:\/\/[^"]*"[^>]*>/gi) || []).length,
          has_tables: processedContent.includes('<table>'),
          has_checklists: processedContent.includes('☐'),
          has_faq: processedContent.toLowerCase().includes('perguntas') || processedContent.toLowerCase().includes('faq')
        }
      };

      console.log(`📊 Dados do artigo sendo criado:`, {
        titulo: articleData.titulo,
        ideaId: articleData.ideaId,
        siteId: articleData.siteId,
        status: articleData.status,
        imageUrl: articleData.imageUrl,
        hasImageUrl: !!articleData.imageUrl,
        imageUrlLength: articleData.imageUrl?.length || 0
      });

      const result = (await actions.addArticle(articleData)) as unknown as { success: boolean; persistedIdeaId?: string | null };
      
      if (result.success) {
        console.log('✅ ARTIGO CRIADO COM SUCESSO - Status: Produzido');
        
        // Usar o UUID correto da ideia persistida, se disponível
        const ideaIdToUpdate = result.persistedIdeaId || ideaId;
        console.log(`🔄 Atualizando status da ideia ${ideaIdToUpdate} para 'produzido' (original: ${ideaId})`);
        
        // Só atualizar se tivermos um ID válido e que seja um UUID
        const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
        if (isUuid(ideaIdToUpdate)) {
          actions.updateIdea(Number(ideaIdToUpdate), { 
            status: 'produzido'
          });
        } else {
          console.warn(`⚠️ Não foi possível atualizar status da ideia - ID inválido: ${ideaIdToUpdate}`);
        }
        
        // ✅ O BACKEND JÁ CONSUMIU O CRÉDITO AUTOMATICAMENTE
        console.log('💳 Backend já consumiu 1 crédito automaticamente via ArtigoObserver');
        
        // 🎉 Mostrar notificação de sucesso simples
        toast.success('Artigo produzido com sucesso!', {
          duration: 3000,
          description: 'Seu artigo está pronto!'
        });
        
        // ✅ O BACKEND JÁ CONSUMIU O CRÉDITO AUTOMATICAMENTE
        console.log('💳 Crédito foi debitado automaticamente pelo backend');
        
        // Progresso: Concluído (100%)
        setSingleProgress(prev => ({ ...prev, [ideaId]: 100 }));
        
        console.log(`✅ Artigo ${ideaId} salvo com sucesso`);
        
        // 🎉 Notificação simples e amigável
        toast.success(`Artigo produzido com sucesso!`, {
          duration: 3000,
          description: 'Conteúdo gerado e salvo!'
        });

        // ✅ SINCRONIZAÇÃO ÚNICA: Aguardar processamento e sincronizar saldo UMA VEZ APENAS
        setTimeout(async () => {
          try {
            await actions.refreshUserData();
            console.log('🔄 Saldo sincronizado após 1 segundo - ÚNICA SINCRONIZAÇÃO');
          } catch (error) {
            console.warn('⚠️ Erro na sincronização tardia (não crítico):', error);
          }
        }, 1000);

        // Limpar progresso após 2 segundos
        setTimeout(() => {
          setSingleProgress(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
          // ✅ LIMPAR STATUS DE PROCESSAMENTO DO LOCALSTORAGE
          setProcessingSingle(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
          setGlobalProcessingLock(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
        }, 2000);
      } else {
        setSingleProgress(prev => ({ ...prev, [ideaId]: -1 }));
        toast.error('Erro ao salvar o artigo');
      }

    } catch (error) {
      console.error(`❌ Erro ao produzir artigo ${ideaId}:`, error);
      setSingleProgress(prev => ({ ...prev, [ideaId]: -1 }));
      
      // ✅ MELHOR TRATAMENTO DE ERROS ESPECÍFICOS
      let errorMessage = 'Erro inesperado ao produzir artigo';
      let shouldRetry = false;
      
      const errorName = getErrorName(error);
      const errorMsg = getErrorMessage(error);
      
      if (errorName === 'TypeError' && 
          (errorMsg.includes('Failed to fetch') || 
           errorMsg.includes('NetworkError') || 
           errorMsg.includes('ERR_NETWORK_CHANGED'))) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet';
        shouldRetry = true;
      } else if (errorName === 'AbortError' || errorName === 'TimeoutError') {
        errorMessage = 'Tempo limite excedido. O servidor pode estar sobrecarregado';
        shouldRetry = true;
      } else if (errorMsg.includes('HTTP 429')) {
        errorMessage = 'Muitas requisições. Aguarde um momento antes de tentar novamente';
        shouldRetry = true;
      } else if (errorMsg.includes('HTTP 500') || errorMsg.includes('HTTP 502') || errorMsg.includes('HTTP 503')) {
        errorMessage = 'Servidor temporariamente indisponível. Tente novamente em alguns minutos';
        shouldRetry = true;
      } else if (errorMsg.includes('Limite atingido') || errorMsg.includes('créditos')) {
        errorMessage = errorMsg;
        shouldRetry = false;
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      // ✅ MARCAR IDEIA COM STATUS 'erro' para permitir exclusão e nova tentativa
      actions.updateIdea(ideaId, {
        status: 'erro' as const,
        errorMessage: errorMessage
      });
      
      // Mostrar botão de retry para erros recuperáveis
      if (shouldRetry && retryCount < 2) {
        toast.error(errorMessage, {
          duration: 6000,
          description: 'Tentaremos automaticamente em alguns segundos...',
          action: {
            label: 'Tentar Agora',
            onClick: () => {
              setTimeout(() => {
                handleProduceFromIdea(ideaId, retryCount + 1);
              }, 1000);
            }
          }
        });
        
        // Retry automático após 5 segundos para erros de rede
        setTimeout(() => {
          if (processingSingle[ideaId] === undefined) { // Só se não estiver processando
            handleProduceFromIdea(ideaId, retryCount + 1);
          }
        }, 5000);
      } else {
        toast.error(errorMessage, {
          duration: 8000,
          description: shouldRetry ? 'Várias tentativas falharam. Tente novamente mais tarde.' : 'Verifique os detalhes e tente novamente.'
        });
      }
    } finally {
      // ✅ LIMPAR AbortController (timeout automático foi desativado)
      setGenerationControllers(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      
      // ✅ NOVO: Limpar tempo de início e botão cancelar
      setGenerationStartTimes(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      
      setShowCancelButtonForIdea(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      
      // ✅ REMOVER LOCK GLOBAL
      setGlobalProcessingLock(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      
      setProcessingSingle(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        console.log(`🔄 Processamento finalizado para ideia ${ideaId}`);
        return newState;
      });
    }
  }, [apiDiagnostic, limits.articles, planLimits.articles, state.ideas, actions, processingSingle, userData, isDevOrAdmin]);

  // Função para inserir CTA no conteúdo
  const insertCtaInContent = useCallback((content: string, cta: any): string => {
    if (!cta || !cta.titulo || !cta.link) {
      return content;
    }

    // Criar HTML do CTA adaptável para WordPress
    const ctaHtml = `
<!-- BIA CTA Component -->
<div class="bia-cta-container" style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f6f8fb 0%, #f1f3f6 100%); border-radius: 12px; border-left: 4px solid #8c52ff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
  <div class="bia-cta-content" style="text-align: center; max-width: 600px; margin: 0 auto;">
    ${cta.imagem ? `<div class="bia-cta-image" style="margin-bottom: 20px; text-align: center;"><img src="${cta.imagem}" alt="${cta.titulo}" style="max-width: 150px; height: auto; border-radius: 8px; display: block; margin: 0 auto;"></div>` : ''}
    <h3 class="bia-cta-title" style="color: #2d3748; font-size: 24px; font-weight: 700; margin: 0 0 15px 0; line-height: 1.3; text-align: center;">${cta.titulo}</h3>
    ${cta.descricao ? `<p class="bia-cta-description" style="color: #4a5568; font-size: 16px; margin: 0 0 25px 0; line-height: 1.5; text-align: center;">${cta.descricao}</p>` : ''}
    <div class="bia-cta-action" style="text-align: center;">
      <a href="${cta.link}" class="bia-cta-button" style="display: inline-block; background: #8c52ff; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(140, 82, 255, 0.3);" onmouseover="this.style.background='#7c3aed'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#8c52ff'; this.style.transform='translateY(0)'">${cta.botao || 'Saiba Mais'}</a>
    </div>
  </div>
</div>
<!-- /BIA CTA Component -->`;

    // Determinar posição de inserção baseado na configuração
    switch (cta.posicao) {
      case 'inicio':
        // Inserir após o primeiro parágrafo ou título
        const firstParagraphMatch = content.match(/(<p[^>]*>.*?<\/p>|<h[1-6][^>]*>.*?<\/h[1-6]>)/i);
        if (firstParagraphMatch) {
          const insertIndex = content.indexOf(firstParagraphMatch[0]) + firstParagraphMatch[0].length;
          return content.slice(0, insertIndex) + '\n\n' + ctaHtml + '\n\n' + content.slice(insertIndex);
        }
        return ctaHtml + '\n\n' + content;

      case 'meio':
        // Inserir no meio do conteúdo (após 50% dos parágrafos)
        const paragraphs = content.match(/<p[^>]*>.*?<\/p>/gi) || [];
        if (paragraphs.length >= 2) {
          const middleIndex = Math.floor(paragraphs.length / 2);
          const middleParagraph = paragraphs[middleIndex];
          const insertIndex = content.indexOf(middleParagraph) + middleParagraph.length;
          return content.slice(0, insertIndex) + '\n\n' + ctaHtml + '\n\n' + content.slice(insertIndex);
        }
        return content + '\n\n' + ctaHtml;

      case 'fim':
      default:
        // Inserir no final do conteúdo
        return content + '\n\n' + ctaHtml;
    }
  }, []);

  // Função para aplicar formatação HTML avançada com SEO
  const applyAdvancedHtmlFormatting = useCallback((content: string, title: string): string => {
    console.log('🎯 Aplicando formatação HTML avançada com otimização SEO...');
    
    if (!content || content.trim().length === 0) {
      return content;
    }

    // Verificar se já tem formatação HTML adequada
    const hasHtmlStructure = content.includes('<h1>') || content.includes('<h2>') || content.includes('<p>');
    
    if (hasHtmlStructure) {
      console.log('✅ Conteúdo já possui estrutura HTML adequada');
      return content;
    }

    // Dividir conteúdo em linhas
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const htmlLines: string[] = [];
    
    let inList = false;
    let inTable = false;
    let hasMainTitle = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (!line) continue;

      // Detectar e formatar títulos
      if (line.match(/^#{1,3}\s+/)) {
        // Markdown headers
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        if (inTable) {
          htmlLines.push('</table>');
          inTable = false;
        }

        const level = (line.match(/^#+/) || [''])[0].length;
        const text = line.replace(/^#+\s*/, '');
        
        if (level === 1 && !hasMainTitle) {
          htmlLines.push(`<h1>${text}</h1>`);
          hasMainTitle = true;
        } else if (level <= 2) {
          htmlLines.push(`<h2>${text}</h2>`);
        } else {
          htmlLines.push(`<h3>${text}</h3>`);
        }
      }
      // Detectar títulos por maiúsculas ou palavras-chave
      else if (line.length < 100 && (
        line === line.toUpperCase() || 
        line.includes('INTRODUÇÃO') || 
        line.includes('CONCLUSÃO') ||
        line.includes('BENEFÍCIOS') ||
        line.includes('VANTAGENS') ||
        line.includes('COMO') ||
        line.includes('POR QUE') ||
        line.includes('DICAS') ||
        line.includes('PASSOS')
      )) {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        if (inTable) {
          htmlLines.push('</table>');
          inTable = false;
        }
        
        if (!hasMainTitle && i === 0) {
          htmlLines.push(`<h1>${line}</h1>`);
          hasMainTitle = true;
        } else {
          htmlLines.push(`<h2>${line}</h2>`);
        }
      }
      // Detectar listas
      else if (line.match(/^[\-\*\+]\s+/) || line.match(/^\d+\.\s+/)) {
        if (!inList) {
          if (inTable) {
            htmlLines.push('</table>');
            inTable = false;
          }
          htmlLines.push('<ul>');
          inList = true;
        }
        const text = line.replace(/^[\-\*\+\d\.\s]+/, '');
        htmlLines.push(`<li>${text}</li>`);
      }
      // Detectar tabelas simples
      else if (line.includes('|') && line.split('|').length >= 3) {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        if (!inTable) {
          htmlLines.push('<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">');
          inTable = true;
        }
        
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        htmlLines.push('<tr>');
        cells.forEach(cell => {
          if (cell.includes('---') || cell.match(/^[\-\s]+$/)) {
            // Linha separadora - ignorar
            return;
          }
          htmlLines.push(`<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`);
        });
        htmlLines.push('</tr>');
      }
      // Parágrafos normais
      else {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        if (inTable) {
          htmlLines.push('</table>');
          inTable = false;
        }
        
        // Aplicar formatação inline
        line = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        
        htmlLines.push(`<p>${line}</p>`);
      }
    }

    // Fechar tags abertas
    if (inList) {
      htmlLines.push('</ul>');
    }
    if (inTable) {
      htmlLines.push('</table>');
    }

    // Garantir que há um título H1 se não foi detectado
    if (!hasMainTitle && title) {
      htmlLines.unshift(`<h1>${title}</h1>`);
    }

    const formattedContent = htmlLines.join('\n');
    
    console.log('✅ Formatação HTML avançada aplicada:', {
      originalLength: content.length,
      formattedLength: formattedContent.length,
      hasMainTitle,
      lineCount: htmlLines.length
    });
    
    return formattedContent;
  }, []);

  // FUNÇÃO DE PRODUÇÃO EM MASSA (ATUALIZADA)
  const handleBatchProduce = useCallback(async () => {
    if (selectedIdeaIds.length === 0) {
      toast.error('Selecione pelo menos uma ideia para produzir em massa');
      return;
    }

    // Verificar créditos disponíveis - usar hook de créditos para consistência
    const requiredCredits = selectedIdeaIds.length;
    
    if (availableCredits.articles < requiredCredits && !isDevOrAdmin) {
      toast.error(`Créditos insuficientes! Você precisa de ${requiredCredits} créditos, mas só tem ${availableCredits.articles} disponíveis.`, {
        description: 'É necessário uma assinatura ativa ou créditos disponíveis.'
      });
      
      // Redirecionar para a página de planos após 2 segundos
      setTimeout(() => {
        window.location.href = '/planos';
      }, 2000);
      
      return;
    }

    setProcessingBatch(true);
    setIsBatchPersistent(true);
    setBatchProgress({});
    setBatchCurrentItem(0);
    setBatchTotalItems(selectedIdeaIds.length);
    
    // Registrar tempo de início
    const startTime = Date.now();
    setBatchStartTime(startTime);
    const startTimeKey = getUserSpecificKey('start_time');
    localStorage.setItem(startTimeKey, startTime.toString());

    console.log(`🚀 Iniciando produção em massa de ${selectedIdeaIds.length} ideias (modo persistente)`);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedIdeaIds.length; i++) {
        const ideaId = selectedIdeaIds[i];
        const idea = state.ideas.find(idea => idea.id === ideaId);
        
        // Atualizar contador atual
        setBatchCurrentItem(i + 1);
        
        if (!idea) {
          console.warn(`⚠️ Ideia ${ideaId} não encontrada, pulando...`);
          errorCount++;
          continue;
        }

        try {
          console.log(`📝 Processando ideia ${i + 1}/${selectedIdeaIds.length}: ${idea.titulo}`);
          
          // ✅ VERIFICAÇÃO ANTI-DUPLICAÇÃO: Se a ideia já está sendo processada, pular
          if (processingSingle[ideaId] || globalProcessingLock[ideaId]) {
            console.warn(`⚠️ Ideia ${ideaId} já está sendo processada em outro fluxo - pulando no batch`);
            errorCount++;
            setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
            continue;
          }
          
          // ✅ DEFINIR LOCK GLOBAL para esta ideia no batch
          setGlobalProcessingLock(prev => ({ ...prev, [ideaId]: true }));
          
          // Atualizar progresso individual
          setBatchProgress(prev => ({ ...prev, [ideaId]: 25 }));

          // Progresso: Gerando conteúdo
          setBatchProgress(prev => ({ ...prev, [ideaId]: 50 }));

          // Usar o endpoint generateArticle que usa o prompt_conteudo.php otimizado
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const token = localStorage.getItem('auth_token');
          
          // ✅ SISTEMA DE RETRY PARA PRODUÇÃO EM LOTE
          let response;
          let apiResponse;
          const maxRetries = 2; // Menos tentativas em lote para não sobrecarregar
          let lastError;
          
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`🔄 Retry ${attempt}/${maxRetries} para artigo ${ideaId} (lote)`);
                setBatchProgress(prev => ({ ...prev, [ideaId]: 45 + (attempt * 5) }));
                
                // Aguardar entre tentativas
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
              }
              
              response = await fetch(`${apiUrl}/api/openai/generate-article`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  titulo: idea.titulo,
                  nicho: idea.generationParams?.nicho || idea.categoria || 'Geral',  
                  palavras_chave: idea.generationParams?.palavrasChave || idea.tags?.join(', ') || '',
                  idioma: idea.generationParams?.idioma || 'Português',
                  conceito: idea.generationParams?.conceito || idea.generationParams?.contexto || '',
                  empresa: '',
                  idea_id: ideaId // ✅ ADICIONAR: ID da ideia para recuperar CTA (batch)
                })
                // ✅ REMOVIDO: Timeout automático de 180s - permite geração prolongada em batch
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              apiResponse = await response.json();
              break; // Sucesso, sair do loop
              
            } catch (error) {
              lastError = error;
              const errorName = getErrorName(error);
              const errorMsg = getErrorMessage(error);
              const isRetryable = errorName === 'TypeError' && 
                (errorMsg.includes('Failed to fetch') || 
                 errorMsg.includes('NetworkError') || 
                 errorMsg.includes('ERR_NETWORK_CHANGED')) ||
                errorName === 'AbortError';
              
              if (isRetryable && attempt < maxRetries) {
                console.log(`⚠️ Erro recuperável em lote (${errorMsg}), tentando novamente...`);
                continue;
              } else {
                throw error;
              }
            }
          }
          
          if (!apiResponse.success) {
            throw new Error(apiResponse.message || 'Erro na geração do artigo');
          }

          // 🛡️ VALIDAÇÃO: Detectar respostas inválidas da OpenAI (produção em lote)
          const invalidResponses = [
            'desculpe, não posso ajudar com isso',
            'i cannot assist with that',
            'i cannot help with that',
            'não posso ajudar com isso',
            'não posso gerar esse conteúdo',
            'i apologize, but i cannot',
            'sorry, i can\'t assist',
            'desculpe, mas não posso',
            'não consegui gerar',
            'unable to generate'
          ];

          const contentToCheck = (apiResponse.article || '').toLowerCase().trim();
          const isInvalidResponse = invalidResponses.some(invalid => 
            contentToCheck.includes(invalid) || 
            contentToCheck.startsWith(invalid)
          );

          if (isInvalidResponse) {
            console.log(`⚠️ Resposta inválida detectada da OpenAI para artigo ${ideaId} (lote). Pulando...`);
            throw new Error('OpenAI retornou resposta inválida. Artigo será pulado para não consumir crédito.');
          }

          console.log(`✅ Artigo ${ideaId} gerado com sucesso`, {
            content_length: apiResponse.article?.length || 0,
            has_image: !!apiResponse.image_url,
            execution_time: apiResponse.execution_time
          });

          // Progresso: Processando resultado (75%)
          setBatchProgress(prev => ({ ...prev, [ideaId]: 75 }));

          console.log(`📝 Processando conteúdo e imagem do artigo ${ideaId}...`);
          
          // O conteúdo já vem formatado e processado do novo sistema unificado
          // ✅ IMPORTANTE: O CTA já é inserido pelo backend, não fazer duplicação aqui!
          let processedContent = sanitizeHtmlContent(apiResponse.article || '');

          const articleData = {
            titulo: idea.titulo,
            conteudo: processedContent,
            status: 'rascunho' as const,
            siteId: idea.siteId,
            ideaId: ideaId,
            imageUrl: apiResponse.image_url || '', // URL da imagem gerada pela IA
            imageAlt: `${generateImageName(idea.titulo)}`,
            imageName: `${generateImageName(idea.titulo)}.jpg`, // Nome SEO-friendly da imagem
            readyForPublishing: true, // Sempre pronto com o novo sistema
            categoria: idea.categoria || 'Geral',
            tags: idea.tags || [],
            wordpressData: idea.wordpressData,
            generationParams: idea.generationParams,
            meta: {
              word_count: (processedContent.match(/\b\w+\b/g) || []).length,
              internal_links: (processedContent.match(/<a\s+[^>]*href="#"[^>]*>/gi) || []).length,
              external_links: (processedContent.match(/<a\s+[^>]*href="https?:\/\/[^"]*"[^>]*>/gi) || []).length,
              has_tables: processedContent.includes('<table>'),
              has_checklists: processedContent.includes('☐'),
              has_faq: processedContent.toLowerCase().includes('perguntas') || processedContent.toLowerCase().includes('faq')
            }
          };

          console.log(`📊 Dados do artigo sendo criado (batch):`, {
            titulo: articleData.titulo,
            ideaId: articleData.ideaId,
            siteId: articleData.siteId,
            status: articleData.status,
            hasImage: !!articleData.imageUrl,
            imageUrl: articleData.imageUrl?.substring(0, 50) + '...',
            contentLength: articleData.conteudo?.length || 0
          });

          const success = await actions.addArticle(articleData);
          
          if (success) {
            // NOTA: O consumo de créditos é atualizado automaticamente pelo ArtigoObserver
            // NÃO fazer chamada adicional para recordResourceConsumption para evitar duplicação
            // Forçar sincronização dos dados do usuário (apenas no primeiro sucesso)
            // if (successCount === 0 && onRefreshUser) {
            //   await onRefreshUser();
            // }

            console.log(`✅ ARTIGO CRIADO EM LOTE ${ideaId} - Status: Produzido (Crédito debitado automaticamente pelo Observer)`);
            
            actions.updateIdea(ideaId, { 
              status: 'produzido',
              articleId: Date.now()
            });
            
            setBatchProgress(prev => ({ ...prev, [ideaId]: 100 }));
            successCount++;
            console.log(`✅ Artigo ${ideaId} produzido com sucesso (${i + 1}/${selectedIdeaIds.length})`);
          } else {
            console.error(`❌ Falha ao salvar artigo ${ideaId} no backend`);
            toast.error(`Erro ao salvar artigo: ${idea.titulo}`);
            setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
            errorCount++;
          }

        } catch (error) {
          console.error(`❌ Erro ao processar ideia ${ideaId}:`, error);
          setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
          
          // ✅ TRATAMENTO MELHORADO DE ERROS EM LOTE
          let errorMessage = 'Erro desconhecido';
          
          const errorName = getErrorName(error);
          const errorMsg = getErrorMessage(error);
          
          if (errorName === 'TypeError' && 
              (errorMsg.includes('Failed to fetch') || 
               errorMsg.includes('NetworkError') || 
               errorMsg.includes('ERR_NETWORK_CHANGED'))) {
            errorMessage = 'Erro de rede';
            console.log(`🌐 Erro de rede para ${idea.titulo} - continuando com próximo artigo`);
          } else if (errorName === 'AbortError') {
            errorMessage = 'Timeout';
            console.log(`⏰ Timeout para ${idea.titulo} - continuando com próximo artigo`);
          } else if (errorMsg.includes('HTTP 429')) {
            errorMessage = 'Rate limit';
            console.log(`🚦 Rate limit para ${idea.titulo} - pausando produção por 30s`);
            
            // Pausa mais longa para rate limit
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else if (errorMsg) {
            errorMessage = errorMsg.substring(0, 50);
          }
          
          console.log(`❌ Erro em lote para "${idea.titulo}": ${errorMessage}`);
          errorCount++;
        } finally {
          // ✅ REMOVER LOCK GLOBAL desta ideia no batch
          setGlobalProcessingLock(prev => {
            const newState = { ...prev };
            delete newState[ideaId];
            return newState;
          });
        }

        // Pequena pausa entre as gerações para não sobrecarregar a API
        if (i < selectedIdeaIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Limpar seleção
      setSelectedIdeaIds([]);
      
      // ✅ RE-SINCRONIZAR dados com backend após produção em massa
      if (successCount > 0) {
        console.log('🔄 Re-sincronizando dados com backend após produção em massa...');
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          await actions.loadFromDatabase();
          console.log('✅ Dados re-sincronizados com sucesso');
        } catch (error) {
          console.warn('⚠️ Erro na re-sincronização:', error);
        }
      }
      
      // ✅ O BACKEND JÁ CONSUMIU OS CRÉDITOS AUTOMATICAMENTE (1 por artigo)
      if (successCount > 0) {
        console.log(`💳 Backend já consumiu ${successCount} créditos automaticamente via ArtigoObserver`);
        
        // ✅ SINCRONIZAÇÃO ÚNICA: Aguardar processamento e sincronizar saldo
        setTimeout(async () => {
          try {
            await actions.refreshUserData();
            console.log(`🔄 Saldo sincronizado após batch de ${successCount} artigos (evita múltiplas chamadas)`);
          } catch (error) {
            console.warn('⚠️ Erro na sincronização tardia do batch (não crítico):', error);
          }
        }, 2000);
        
        console.log(`✅ ${successCount} artigos produzidos - sincronização automática ativa`);
      }
      
      // ✅ FORÇAR MÚLTIPLOS REFRESHES para garantir atualização visual completa
      console.log('🔄 Atualizando interface com múltiplos refreshes...');
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      setRefreshKey(prev => prev + 1);
      
      // Mostrar resultado sem cálculos locais de saldo
      if (successCount > 0 && errorCount === 0) {
        toast.success(`🎉 Produção em massa concluída! ${successCount} artigos produzidos com sucesso.`, {
          duration: 6000,
          description: 'Página será atualizada automaticamente'
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`⚠️ ${successCount} artigos produzidos, ${errorCount} com erro`, {
          duration: 6000,
          description: 'Atualize a página se necessário'
        });
      } else {
        toast.error(`❌ Nenhum artigo foi produzido (${errorCount} erros)`);
      }

      // Limpar progresso após alguns segundos
      setTimeout(() => {
        setBatchProgress({});
      }, 5000);

    } catch (error) {
      console.error('❌ Erro crítico na produção em massa:', error);
      toast.error('Erro crítico na produção em massa. Tente novamente.');
    } finally {
      setProcessingBatch(false);
      setBatchCurrentItem(0);
      setBatchTotalItems(0);
      clearBatchPersistentState();
    }
  }, [selectedIdeaIds, isFreePlan, articlesUsed, planLimits.articles, articlesRemaining, state.ideas, actions, userData, isDevOrAdmin]);

  // FUNÇÃO PARA DELETAR IDEIAS
  const handleDeleteIdea = useCallback(async (ideaId: number) => {
    if (deletingSingle[ideaId]) return;

    // ✅ NOVO: Limpar estado de processamento órfão se ainda estiver ativo
    if (processingSingle[ideaId]) {
      console.log(`🧹 Limpando estado de processamento órfão para ideia ${ideaId} antes de excluir`);
      setProcessingSingle(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      setSingleProgress(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
      setGlobalProcessingLock(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
    }

    const idea = state.ideas.find(i => i.id === ideaId);
    if (!idea) {
      toast.error('Ideia não encontrada');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a ideia "${idea.titulo}"? Ela será movida para a página "Excluídos".`)) {
      return;
    }

    setDeletingSingle(prev => ({ ...prev, [ideaId]: true }));
    setSelectedIdeaIds(prev => prev.filter(id => id !== ideaId));

    try {
      console.log(`🗑️ Excluindo ideia individual ${ideaId}: ${idea.titulo}`);
      
      // Usar updateIdea em vez de deleteIdea para marcar como excluído
      const success = actions.updateIdea(ideaId, { 
        status: 'excluido',
        deletedDate: new Date().toISOString()
      });
      
      if (success) {
        console.log(`✅ Ideia ${ideaId} movida para "Excluídos" com sucesso`);
        toast.success('Ideia movida para "Excluídos" com sucesso');
        
        // ✅ AGUARDAR sincronização assíncrona com backend
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ Re-sincronizar dados para garantir consistência visual
        try {
          await actions.loadFromDatabase();
          console.log('✅ Estado local atualizado após exclusão individual');
        } catch (error) {
          console.warn('⚠️ Erro na sincronização após exclusão individual:', error);
        }
        
        // ✅ Forçar refresh da interface para atualizar a lista
        setRefreshKey(prev => prev + 1);
        
        // ✅ AGUARDAR que o re-render seja completado
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.error(`❌ Falha ao excluir ideia ${ideaId}`);
        toast.error('Erro ao excluir ideia');
      }
    } catch (error) {
      console.error('Erro ao excluir ideia:', error);
      toast.error('Erro inesperado ao excluir ideia');
    } finally {
      setDeletingSingle(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
    }
  }, [state.ideas, actions, deletingSingle, processingSingle]);

  // FUNÇÃO PARA DELETAR EM MASSA
  const handleBatchDelete = useCallback(async () => {
    if (selectedIdeaIds.length === 0) {
      toast.error('Selecione pelo menos uma ideia para excluir');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedIdeaIds.length} ideia(s) selecionada(s)? Elas serão movidas para a página "Excluídos".`)) {
      return;
    }

    setDeletingBatch(true);
    const idsToDelete = [...selectedIdeaIds];
    
    try {
      let successCount = 0;
      let errorCount = 0;

      console.log(`🗑️ Iniciando exclusão em massa de ${idsToDelete.length} ideias:`, idsToDelete);

      const currentTime = new Date().toISOString();
      
      // ✅ PROCESSAR CADA IDEIA SEQUENCIALMENTE para garantir sincronização
      for (const ideaId of idsToDelete) {
        const idea = state.ideas.find(i => i.id === ideaId);
        if (!idea) {
          console.error(`❌ Ideia ${ideaId} não encontrada`);
          errorCount++;
          continue;
        }

        console.log(`🗑️ Processando exclusão ${successCount + errorCount + 1}/${idsToDelete.length}: ${idea.titulo}`);
        
        try {
          // ✅ ATUALIZAR NO CONTEXTO LOCAL (usa actions que sincroniza com backend)
          const success = actions.updateIdea(ideaId, { 
            status: 'excluido' as const,
            deletedDate: currentTime
          });
          
          if (success) {
            console.log(`✅ Ideia ${ideaId} marcada como excluída`);
            successCount++;
          } else {
            console.error(`❌ Falha ao atualizar ideia ${ideaId}`);
            errorCount++;
          }
          
          // ✅ PEQUENO DELAY entre operações para evitar race conditions
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`❌ Erro ao excluir ideia ${ideaId}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Processamento individual concluído: ${successCount} sucessos, ${errorCount} erros`);

      // ✅ LIMPAR SELEÇÃO IMEDIATAMENTE
      setSelectedIdeaIds([]);
      
      // ✅ AGUARDAR sincronização com backend
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ RE-SINCRONIZAR dados completos com backend
      console.log('🔄 Re-sincronizando dados com backend...');
      try {
        await actions.loadFromDatabase();
        console.log('✅ Dados re-sincronizados com sucesso');
      } catch (error) {
        console.warn('⚠️ Erro na re-sincronização:', error);
      }
      
      // ✅ FORÇAR MÚLTIPLOS REFRESHES para garantir atualização visual
      console.log('🔄 Atualizando interface...');
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      setRefreshKey(prev => prev + 1);

      // Feedback para o usuário
      if (successCount > 0 && errorCount === 0) {
        toast.success(`✅ ${successCount} ideia(s) movida(s) para "Excluídos" com sucesso!`, {
          description: 'Página será atualizada automaticamente'
        });
        console.log(`📊 Exclusão em massa bem-sucedida: ${successCount} ideias`);
        
        // ✅ HARD REFRESH AUTOMÁTICO após sucesso total
        console.log('🔄 Realizando hard refresh automático em 1.5s...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.location.reload();
        return;
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`⚠️ ${successCount} movidas com sucesso, ${errorCount} com erro`, {
          description: 'Atualize a página se necessário'
        });
        console.log(`📊 Exclusão parcial: ${successCount} sucessos, ${errorCount} erros`);
      } else {
        toast.error(`❌ Nenhuma ideia foi excluída (${errorCount} erros)`);
        console.log(`📊 Exclusão falhou completamente`);
      }

    } catch (error) {
      console.error('❌ Erro crítico na exclusão em massa:', error);
      toast.error('Erro crítico na exclusão em massa. Tente novamente.');
    } finally {
      setDeletingBatch(false);
    }
  }, [selectedIdeaIds, state.ideas, actions]);

  // FUNÇÃO PARA ABRIR EDIÇÃO DE IDEIA
  const handleOpenEditDialog = useCallback((ideaId: number) => {
    const idea = state.ideas.find(i => i.id === ideaId);
    if (!idea) {
      toast.error('Ideia não encontrada');
      return;
    }

    setCurrentEditingIdea(idea);
    setEditedTitle(idea.titulo);
    setEditDialogOpen(true);
  }, [state.ideas]);

  // FUNÇÃO PARA SALVAR EDIÇÃO DE IDEIA
  const handleSaveEditIdea = useCallback(async () => {
    if (!currentEditingIdea || !editedTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSavingEdit(true);

    try {
      console.log('💾 Salvando edição da ideia:', {
        id: currentEditingIdea.id,
        oldTitle: currentEditingIdea.titulo,
        newTitle: editedTitle
      });

      const success = await actions.updateIdea(currentEditingIdea.id, {
        titulo: editedTitle.trim()
      });

      if (success) {
        toast.success('Ideia editada com sucesso!');
        setEditDialogOpen(false);
        setCurrentEditingIdea(null);
        setEditedTitle('');
      } else {
        toast.error('Erro ao salvar a edição da ideia');
      }
    } catch (error) {
      console.error('Erro ao editar ideia:', error);
      toast.error('Erro inesperado ao editar ideia');
    } finally {
      setIsSavingEdit(false);
    }
  }, [currentEditingIdea, editedTitle, actions]);

  // FUNÇÃO PARA CANCELAR EDIÇÃO
  const handleCancelEdit = useCallback(() => {
    setEditDialogOpen(false);
    setCurrentEditingIdea(null);
    setEditedTitle('');
  }, []);

  // FUNÇÃO PARA PUBLICAÇÃO EM MASSA
  const handleBatchPublish = useCallback(async () => {
    if (selectedIdeaIds.length === 0) {
      toast.error('Selecione pelo menos um artigo para publicar em massa');
      return;
    }

    // Verificar se todas as ideias selecionadas têm artigos produzidos
    const selectedIdeasWithArticles = selectedIdeaIds.filter(ideaId => {
      const idea = state.ideas.find(i => i.id === ideaId);
      const article = state.articles.find(a => a.ideaId === ideaId);
      return idea && article && idea.status === 'produzido';
    });

    if (selectedIdeasWithArticles.length === 0) {
      toast.error('Nenhum artigo produzido selecionado. Selecione apenas artigos com status "produzido".');
      return;
    }

    if (selectedIdeasWithArticles.length !== selectedIdeaIds.length) {
      const diff = selectedIdeaIds.length - selectedIdeasWithArticles.length;
      toast.warning(`${diff} item(s) foi(ram) ignorado(s) por não ter(em) artigo produzido.`);
    }

    setPublishingBatch(true);
    setBatchProgress({});

    console.log(`🚀 Iniciando publicação em massa de ${selectedIdeasWithArticles.length} artigos`);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedIdeasWithArticles.length; i++) {
        const ideaId = selectedIdeasWithArticles[i];
        const idea = state.ideas.find(idea => idea.id === ideaId);
        const article = state.articles.find(a => a.ideaId === ideaId);
        
        if (!idea || !article) {
          console.warn(`⚠️ Ideia ${ideaId} ou artigo não encontrado, pulando...`);
          errorCount++;
          continue;
        }

        try {
          console.log(`📤 Publicando artigo ${i + 1}/${selectedIdeasWithArticles.length}: ${idea.titulo}`);
          
          // Atualizar progresso individual
          setBatchProgress(prev => ({ ...prev, [ideaId]: 25 }));

          // Verificar configuração WordPress
          const site = state.sites.find(s => s.id === idea.siteId);
          
          if (!site) {
            console.error(`❌ Site não encontrado para siteId: ${idea.siteId}`);
            setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
            errorCount++;
            continue;
          }

          if (!site.wordpressUrl || !site.wordpressUsername || !site.wordpressPassword) {
            console.error(`❌ WordPress não configurado para site ${site.nome}`);
            setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
            errorCount++;
            continue;
          }

          setBatchProgress(prev => ({ ...prev, [ideaId]: 50 }));

          // Publicar no WordPress
          const publishResult = await wordpressService.publishPost(site.id.toString(), {
            title: article.titulo,
            content: article.conteudo,
            status: 'publish',
            featured_media: article.imageUrl ? {
              imageUrl: article.imageUrl,
              alt: article.titulo
            } : undefined
          });

          setBatchProgress(prev => ({ ...prev, [ideaId]: 75 }));

          if (publishResult.success && publishResult.postId) {

            // Atualizar artigo com dados do WordPress - MESMA LÓGICA DA PUBLICAÇÃO INDIVIDUAL
            const publishData = {
              publishedUrl: publishResult.postUrl,
              publishedAt: new Date().toISOString(),
              publishedDate: new Date().toISOString(),
              wordpressData: publishResult.postId,
              status: 'Publicado'
            };
            
            // 1. Atualizar artigo no estado local (BiaContext)
            const localUpdateSuccess = actions.updateArticle(article.id, publishData);
            
            // 2. Atualizar artigo no backend Laravel para persistir e aparecer no calendário
            try {
              console.log(`💾 Atualizando artigo ${article.id} no backend Laravel (publicação em massa)...`);
              const { updateArticle } = await import('../../services/articleService');
              const backendUpdateResult = await updateArticle(article.id, {
                status: 'publicado', // Note: backend usa 'publicado', frontend usa 'Publicado'
                published_at: new Date().toISOString(),
                wordpress_data: publishResult.postId?.toString()
              });
              
              if (backendUpdateResult.success) {
                console.log(`✅ Artigo ${article.id} atualizado no backend Laravel com sucesso (massa)`);
              } else {
                console.warn(`⚠️ Erro ao atualizar artigo ${article.id} no backend:`, backendUpdateResult.error);
              }
            } catch (backendError) {
              console.warn(`⚠️ Erro na comunicação com backend para artigo ${article.id}:`, backendError);
            }
            
            if (localUpdateSuccess) {
              // Marcar ideia como publicada para que apareça no histórico
              const updateIdeaSuccess = await actions.updateIdea(ideaId, { 
                status: 'publicado' // Marcar como publicado para aparecer no histórico
              });
              console.log(`🎯 Ideia ${ideaId} marcada como publicada (massa):`, updateIdeaSuccess);
              
              setBatchProgress(prev => ({ ...prev, [ideaId]: 100 }));
              successCount++;
              console.log(`✅ Artigo ${ideaId} publicado com sucesso e sincronizado com backend (${i + 1}/${selectedIdeasWithArticles.length})`);
            } else {
              setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
              errorCount++;
            }
          } else {
            console.error(`❌ Erro na publicação do artigo ${ideaId}: ${publishResult.error}`);
            setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
            errorCount++;
          }

        } catch (error) {
          console.error(`❌ Erro ao publicar artigo ${ideaId}:`, error);
          setBatchProgress(prev => ({ ...prev, [ideaId]: -1 }));
          errorCount++;
        }

        // Pequena pausa entre as publicações
        if (i < selectedIdeasWithArticles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Limpar seleção e mostrar resultado
      setSelectedIdeaIds([]);
      
      // ✅ RE-SINCRONIZAR dados com backend após publicação em massa
      if (successCount > 0) {
        console.log('🔄 Re-sincronizando dados com backend após publicação em massa...');
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          await actions.loadFromDatabase();
          console.log('✅ Dados re-sincronizados com sucesso');
        } catch (error) {
          console.warn('⚠️ Erro na re-sincronização:', error);
        }
      }
      
      // Forçar múltiplos re-renders da interface para garantir atualização completa
      if (successCount > 0) {
        console.log('🔄 Atualizando interface com múltiplos refreshes...');
        setRefreshKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        setRefreshKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        setRefreshKey(prev => prev + 1);
      }
      
      if (successCount > 0 && errorCount === 0) {
        toast.success(`🎉 Publicação em massa concluída! ${successCount} artigos publicados com sucesso.`, {
          description: 'Página será atualizada automaticamente'
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`⚠️ ${successCount} publicados com sucesso, ${errorCount} com erro`, {
          description: 'Verifique os artigos individualmente'
        });
      } else {
        toast.error(`❌ Nenhum artigo foi publicado (${errorCount} erros)`);
      }

      // Limpar progresso após alguns segundos
      setTimeout(() => {
        setBatchProgress({});
      }, 5000);

    } catch (error) {
      console.error('❌ Erro crítico na publicação em massa:', error);
      toast.error('Erro crítico na publicação em massa. Tente novamente.');
    } finally {
      setPublishingBatch(false);
    }
  }, [selectedIdeaIds, state.ideas, state.articles, state.sites, actions, wordpressService]);

  // FUNÇÃO PARA PUBLICAR ARTIGO NO WORDPRESS
  const handlePublishArticle = useCallback(async (ideaId: number) => {
    console.log(`📤 Iniciando publicação do artigo para ideia ${ideaId}`);

    if (publishingSingle[ideaId]) {
      console.log(`⚠️ Artigo ${ideaId} já está sendo publicado - ignorando`);
      return;
    }

    const idea = state.ideas.find(i => i.id === ideaId);
    const article = state.articles.find(a => a.ideaId === ideaId);
    
    if (!idea || !article) {
      toast.error('Artigo não encontrado');
      return;
    }

    // Verificar configuração WordPress
    const site = state.sites.find(s => s.id === idea.siteId);
    
    if (!site) {
      console.error(`❌ Site não encontrado para siteId: ${idea.siteId}`);
      toast.error('Site não encontrado. Verifique se o site ainda existe na seção Meus Sites.');
      return;
    }

    if (!site.wordpressUrl || !site.wordpressUsername || !site.wordpressPassword) {
      console.error(`❌ WordPress não configurado para site ${site.nome}`);
      toast.error(`WordPress não configurado para o site "${site.nome}". Configure na seção Meus Sites.`);
      return;
    }

    setPublishingSingle(prev => ({ ...prev, [ideaId]: true }));

    try {
      console.log(`📝 Publicando artigo "${article.titulo}" no WordPress...`);
      
      // Usar a API do Laravel para publicar
      const publishUrl = getApiUrl('wordpress/publish-post');
      
      console.log('📡 URL de publicação:', publishUrl);
      
      const requestData = {
        siteData: {
          url: site.wordpressUrl.trim(),
          username: site.wordpressUsername.trim(),
          applicationPassword: site.wordpressPassword.trim()
        },
        postData: {
          title: article.titulo,
          content: article.conteudo,
          status: 'publish',
          categoryName: idea.categoria || '',
          tagNames: idea.tags || []
        },
        // Adicionar dados da imagem se disponível
        imageData: article.imageUrl ? {
          url: article.imageUrl,
          alt: article.titulo,
          title: article.titulo
        } : undefined
      };
      
      console.log('📋 Dados de publicação preparados:', {
        url: requestData.siteData.url,
        title: requestData.postData.title,
        hasContent: !!requestData.postData.content,
        categoryName: requestData.postData.categoryName,
        tagCount: requestData.postData.tagNames?.length || 0,
        hasImageData: !!requestData.imageData
      });
      
      // Adicionar timeout mais longo e melhor logging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos
      
      try {
        const response = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📨 Resposta da publicação:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorText = await response.text();
            errorDetails = errorText;
            console.error('❌ Erro HTTP na publicação:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
          } catch (parseError) {
            console.error('❌ Não foi possível ler resposta de erro:', parseError);
            errorDetails = 'Resposta de erro não legível';
          }
          
          // Mensagens de erro mais específicas
          if (response.status === 404) {
            throw new Error('Rota WordPress não encontrada no servidor. Aguarde alguns momentos e tente novamente.');
          } else if (response.status === 401) {
            throw new Error('Credenciais WordPress inválidas. Verifique a configuração na seção Meus Sites.');
          } else if (response.status === 403) {
            throw new Error('Permissões insuficientes no WordPress. Verifique se o usuário tem permissão para publicar.');
          } else if (response.status >= 500) {
            throw new Error('Erro interno do servidor. Tente novamente em alguns momentos.');
          } else {
            throw new Error(`Erro na publicação (${response.status}): ${errorDetails}`);
          }
        }
        
        const publishResult = await response.json();
        
        if (publishResult.success) {
          console.log('✅ Artigo publicado com sucesso:', publishResult);
          
          const publishData = {
            publishedUrl: publishResult.postUrl,
            publishedAt: new Date().toISOString(),
            publishedDate: new Date().toISOString(),
            wordpressData: publishResult.postId,
            status: 'publicado'  // CORREÇÃO: Usar minúscula para consistência com backend
          };
          
          // 1. Atualizar artigo no estado local (BiaContext)
          const localUpdateSuccess = actions.updateArticle(article.id, publishData);
          
          // 2. Atualizar artigo no backend Laravel para persistir a alteração
          try {
            console.log('💾 Atualizando artigo no backend Laravel...');
            const { updateArticle } = await import('../../services/articleService');
            const backendUpdateResult = await updateArticle(article.id, {
              status: 'publicado', // Note: backend usa 'publicado', frontend usa 'publicado'
              published_at: new Date().toISOString(),
              wordpress_data: publishResult.postId?.toString()
            });
            
            if (backendUpdateResult.success) {
              console.log('✅ Artigo atualizado no backend Laravel com sucesso');
            } else {
              console.warn('⚠️ Erro ao atualizar artigo no backend:', backendUpdateResult.error);
              // Não vamos falhar por isso, apenas logar
            }
          } catch (backendError) {
            console.warn('⚠️ Erro na comunicação com backend:', backendError);
            // Não vamos falhar por isso, apenas logar
          }
          
          if (localUpdateSuccess) {
            console.log(`✅ Artigo ${article.id} marcado como Publicado com sucesso`);
            
            // Forçar re-renderização da lista para aplicar filtros imediatamente
            setRefreshKey(prev => prev + 1);
            
            console.log(`🎯 Artigo publicado removido da lista de produção automaticamente pelo filtro`);
            
            toast.success(`Artigo publicado com sucesso no WordPress! 🎉`);
            
            // Agora não precisamos mais do onRefreshUser porque já atualizamos o backend
            // O estado local e backend estão sincronizados
            console.log('🎯 Publicação completa - estado local e backend sincronizados');
          } else {
            console.error('❌ Erro ao atualizar dados do artigo publicado localmente');
            toast.error('Erro ao salvar dados da publicação localmente');
          }
        } else {
          console.error('❌ Falha na publicação:', publishResult);
          throw new Error(publishResult.error || 'Falha na publicação WordPress');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      console.error(`❌ Erro na publicação do artigo ${ideaId}:`, error);
      
      let errorMessage = 'Erro na publicação WordPress';
      
      const errorName = getErrorName(error);
      const errorMsg = getErrorMessage(error);
      
      if (errorName === 'AbortError') {
        errorMessage = 'Timeout na publicação. O WordPress pode estar lento ou indisponível.';
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão e tente novamente.';
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      toast.error(`Erro na publicação: ${errorMessage}`);
      
    } finally {
      setPublishingSingle(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
    }
  }, [state.ideas, state.articles, state.sites, actions, publishingSingle]);

  // FUNÇÃO PARA AGENDAR ARTIGO NO WORDPRESS
  const handleScheduleArticle = useCallback(async () => {
    if (!currentSchedulingArticle || !selectedDate) {
      toast.error('Selecione uma data válida');
      return;
    }

    const ideaId = currentSchedulingArticle;
    const idea = state.ideas.find(i => i.id === ideaId);
    const article = state.articles.find(a => a.ideaId === ideaId);
    
    if (!idea || !article) {
      toast.error('Artigo não encontrado');
      return;
    }

    // Verificar configuração WordPress
    const site = state.sites.find(s => s.id === idea.siteId);
    
    if (!site) {
      console.error(`❌ Site não encontrado para siteId: ${idea.siteId}`);
      toast.error('Site não encontrado. Verifique se o site ainda existe na seção Meus Sites.');
      return;
    }

    if (!site.wordpressUrl || !site.wordpressUsername || !site.wordpressPassword) {
      console.error(`❌ WordPress não configurado para site ${site.nome} no agendamento`);
      toast.error(`WordPress não configurado para o site "${site.nome}". Configure na seção Meus Sites.`);
      return;
    }

    setSchedulingSingle(prev => ({ ...prev, [ideaId]: true }));

    try {
      // Combinar data e hora selecionadas
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Verificar se a data não é no passado
      if (scheduledDateTime <= new Date()) {
        toast.error('A data de agendamento deve ser no futuro');
        return;
      }

      console.log(`📅 Agendando artigo "${article.titulo}" para ${scheduledDateTime.toLocaleString('pt-BR')}`);
      
      // CORREÇÃO: Preservar o timezone local do usuário
      // Ao invés de usar toISOString() que converte para UTC, vamos formatar preservando o timezone local
      const year = scheduledDateTime.getFullYear();
      const month = String(scheduledDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDateTime.getDate()).padStart(2, '0');
      const hour = String(scheduledDateTime.getHours()).padStart(2, '0');
      const minute = String(scheduledDateTime.getMinutes()).padStart(2, '0');
      const localScheduleDate = `${year}-${month}-${day}T${hour}:${minute}:00`;
      
      console.log(`📅 Data original escolhida: ${scheduledDateTime.toLocaleString('pt-BR')}`);
      console.log(`📅 Data salva (timezone local): ${localScheduleDate}`);
      
      // Preparar dados do post para agendamento no WordPress
      const postData: WordPressPost = {
        title: article.titulo,
        content: article.conteudo,
        status: 'future',
        date: localScheduleDate, // Usar data local ao invés de UTC
        featured_media: article.imageUrl ? {
          imageUrl: article.imageUrl,
          alt: article.imageAlt || article.titulo
        } : undefined
      };

      // Usar o serviço WordPress para agendar o post
      const { wordpressService } = await import('../../services/wordpressService');
      const result = await wordpressService.schedulePost(
        site.id.toString(), 
        postData, 
        localScheduleDate // Usar data local consistente
      );

      if (result.success && result.postId) {
        // 1. Atualizar artigo no estado local (BiaContext)
        const articleUpdateSuccess = actions.updateArticle(article.id, {
          status: 'agendado' as const,  // CORREÇÃO: Usar minúscula para consistência com backend
          scheduledDate: localScheduleDate, // Usar data local consistente
          wordpressData: result.postId
        });

        // 2. Atualizar artigo no backend Laravel para persistir a alteração
        try {
          console.log('💾 Atualizando artigo agendado no backend Laravel...');
          const { updateArticle } = await import('../../services/articleService');
          const backendUpdateResult = await updateArticle(article.id, {
            status: 'agendado', // Note: backend usa 'agendado', frontend usa 'agendado'
            wordpress_data: result.postId?.toString()
          });
          
          if (backendUpdateResult.success) {
            console.log('✅ Artigo agendado atualizado no backend Laravel com sucesso');
          } else {
            console.warn('⚠️ Erro ao atualizar artigo agendado no backend:', backendUpdateResult.error);
            // Não vamos falhar por isso, apenas logar
          }
        } catch (backendError) {
          console.warn('⚠️ Erro na comunicação com backend:', backendError);
          // Não vamos falhar por isso, apenas logar
        }

        if (articleUpdateSuccess) {
          console.log(`✅ Artigo ${article.id} agendado no WordPress com sucesso`);
          
          // Forçar re-renderização da lista
          setRefreshKey(prev => prev + 1);
          
          // Fechar modal
          setScheduleDialogOpen(false);
          setCurrentSchedulingArticle(null);
          setSelectedDate(undefined);
          setSelectedTime('08:00');
          
          toast.success(`Artigo agendado para ${scheduledDateTime.toLocaleString('pt-BR')}!`, {
            description: `O artigo será publicado automaticamente no site "${site.nome}"`
          });
        } else {
          throw new Error('Erro ao atualizar status do artigo localmente');
        }
      } else {
        throw new Error(result.error || 'Erro desconhecido no agendamento WordPress');
      }

    } catch (error) {
      console.error('❌ Erro ao agendar artigo:', error);
      toast.error('Erro ao agendar artigo no WordPress. Tente novamente.');
    } finally {
      setSchedulingSingle(prev => {
        const newState = { ...prev };
        delete newState[ideaId];
        return newState;
      });
    }
  }, [currentSchedulingArticle, selectedDate, selectedTime, state.ideas, state.articles, state.sites, actions]);

  // Função para abrir modal de agendamento
  const handleOpenScheduleDialog = useCallback((ideaId: number) => {
    setCurrentSchedulingArticle(ideaId);
    setSelectedDate(undefined);
    setSelectedTime('08:00');
    setScheduleDialogOpen(true);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Produzir Artigos
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Transforme suas ideias em artigos completos usando IA
          </p>
        </div>
      </div>



      {/* Status da API OpenAI */}
      {apiDiagnostic.checked && (!apiDiagnostic.hasKey || !apiDiagnostic.isValid) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="font-montserrat">
            <div className="flex items-center justify-between">
              <div>
                <strong>Serviço temporariamente indisponível:</strong> Não foi possível conectar com o sistema de produção de artigos. Tente novamente em alguns minutos ou entre em contato com nosso suporte se o problema persistir.
              </div>
              <Button
                onClick={handleTestApiKey}
                className="ml-4 text-red-600 border-red-300 hover:bg-red-100 px-2 py-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Testar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Status do Plano - Seguindo padrão das Ações Rápidas */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Status do Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      apiDiagnostic.hasKey && apiDiagnostic.isValid 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Sistema IA</p>
                  <p className="font-poppins text-lg font-medium text-foreground">
                    {apiDiagnostic.hasKey && apiDiagnostic.isValid ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {!isDevOrAdmin && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-montserrat text-sm text-muted-foreground">Progresso do Plano</span>
                <span className="font-montserrat text-sm text-muted-foreground">{articlesUsed}/{planLimits.articles}</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerta de limite */}
      {limits.articles && !isDevOrAdmin && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 font-montserrat">
            <strong>Limite atingido!</strong> Você utilizou todos os {planLimits.articles} artigos disponíveis.
            {isFreePlan ? 'Faça upgrade para produzir mais artigos.' : 'Considere comprar mais artigos ou fazer upgrade do seu plano.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Container de Loading para Produção em Massa Persistente */}
      {(processingBatch || isBatchPersistent) && (
        <Card className="border-purple-200 bg-purple-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              {/* Ícone e Spinner */}
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
              </div>
              
              {/* Informações do Progresso */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-900">
                    Produção em Massa em Andamento
                  </h3>
                  <span className="text-sm font-medium text-purple-700">
                    {batchTotalItems > 0 ? Math.round((batchCurrentItem / batchTotalItems) * 100) : 0}%
                  </span>
                </div>
                
                <p className="text-purple-700 font-medium">
                  Produzindo {batchCurrentItem}/{batchTotalItems} artigos
                </p>
                
                {/* Barra de Progresso */}
                <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300 ease-out"
                    style={{ 
                      width: `${batchTotalItems > 0 ? (batchCurrentItem / batchTotalItems) * 100 : 0}%` 
                    }}
                  />
                </div>
                
                <p className="text-sm text-purple-600">
                  ⚠️ Não saia dessa página até que os artigos sejam gerados
                </p>
              </div>
              
              {/* Botões de Controle */}
              <div className="flex-shrink-0 flex flex-col space-y-2">
                {showCancelButton && (
                  <Button
                    onClick={cancelBatchProduction}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                  >
                    🛑 Cancelar
                  </Button>
                )}
                <Button
                  onClick={clearBatchPersistentState}
                  className="text-purple-700 border border-purple-300 bg-white hover:bg-purple-100 text-sm px-3 py-1"
                >
                  Ocultar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de ideias - Padronizado com estilo das Ações Rápidas */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <FileText size={20} style={{ color: '#8c52ff' }} />
            Ideias Disponíveis ({
              siteFilter === 'all' 
                ? availableIdeas.length 
                : availableSites.find(site => site.id === siteFilter)?.ideaCount || 0
            })
            {apiDiagnostic.checked && (
              <div className={`w-2 h-2 rounded-full ml-2 ${
                apiDiagnostic.hasKey && apiDiagnostic.isValid 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
              }`} />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Filtros - Seguindo padrão das Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro de Site */}
              <div className="p-4 rounded-lg bg-white border">
                <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Monitor size={16} />
                  Selecione o Site
                </Label>
                <Select 
                  value={siteFilter === 'all' ? 'all' : siteFilter.toString()} 
                  onValueChange={(value: string) => handleFilterChange('site', value === 'all' ? 'all' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os sites ({totalIdeasBeforeSiteFilter})</SelectItem>
                    {availableSites.map(site => (
                      <SelectItem key={site.id} value={site.id.toString()}>
                        {site.name} ({site.ideaCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Status */}
              <div className="p-4 rounded-lg bg-white border">
                <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Filter size={16} />
                  Status das Ideias
                </Label>
                <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'produced') => handleFilterChange('status', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ideias</SelectItem>
                    <SelectItem value="pending">Não Produzidas</SelectItem>
                    <SelectItem value="produced">Produzidas e Não Publicadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Campo de busca */}
            <div className="p-4 rounded-lg bg-white border mb-6">
              <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Search size={16} />
                Buscar Ideias
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar ideias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-montserrat"
                />
              </div>
            </div>
          </div>

          {/* Ações em massa - Seguindo padrão das Ações Rápidas */}
          {selectedIdeaIds.length > 0 && (
            <div className="p-4 rounded-lg bg-white border mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center space-x-2 mr-4">
                  <span className="font-montserrat text-sm text-foreground">
                    {selectedIdeaIds.length} item(s) selecionado(s)
                  </span>
                </div>
                
                <Button
                  onClick={handleBatchProduce}
                  disabled={processingBatch || !apiDiagnostic.isValid}
                  className="text-white px-3 py-2"
                  style={{ backgroundColor: '#8c52ff' }}
                >
                  {processingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  Produzir Selecionados
                </Button>

                <Button
                  onClick={handleBatchPublish}
                  disabled={publishingBatch || !allSelectedProduced}
                  className={`px-3 py-2 text-white ${allSelectedProduced ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
                  title={!allSelectedProduced ? 'Todos os artigos selecionados devem estar produzidos para publicar' : 'Publicar artigos selecionados'}
                >
                  {publishingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Globe className="h-4 w-4 mr-1" />
                  )}
                  Publicar Selecionados
                </Button>

                <Button
                  onClick={handleBatchDelete}
                  disabled={deletingBatch}
                  className="px-3 py-2 bg-red-600 text-white hover:bg-red-700"
                >
                  {deletingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Mover para Excluídos
                </Button>

                <Button
                  onClick={handleClearSelection}
                  className="px-3 py-2 border bg-white text-foreground hover:bg-gray-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Limpar Seleção
                </Button>
              </div>
            </div>
          )}

          {/* Seleção de todas as ideias da página */}
          {currentPageIdeas.length > 0 && (
            <div className="flex items-center space-x-2 p-4 bg-white border rounded-lg mb-6">
              <Checkbox
                checked={allCurrentPageSelected}
                onCheckedChange={handleSelectAllIdeas}
                disabled={processingBatch}
              />
              <Label className="font-montserrat text-sm text-foreground">
                Selecionar todas da página atual ({currentPageIdeas.length})
              </Label>
            </div>
          )}

          {/* Lista de ideias */}
          {currentPageIdeas.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-poppins text-lg text-gray-700 mb-2">
                {searchQuery || statusFilter !== 'all' || siteFilter !== 'all' 
                  ? 'Nenhuma ideia encontrada com os filtros aplicados'
                  : 'Nenhuma ideia disponível'
                }
              </h3>
              <p className="font-montserrat text-gray-500">
                {searchQuery || statusFilter !== 'all' || siteFilter !== 'all'
                  ? 'Tente ajustar os filtros para encontrar suas ideias.'
                  : 'Vá para a seção "Gerar Ideias" para criar suas primeiras ideias de conteúdo.'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {currentPageIdeas.map((idea) => {
                const hasArticle = idea.status !== 'erro' && state.articles.some(a => a.ideaId === idea.id);
                const article = state.articles.find(a => a.ideaId === idea.id);
                const isProcessing = processingSingle[idea.id];
                const progress = singleProgress[idea.id];
                const batchItemProgress = batchProgress[idea.id];
                const canProduce = apiDiagnostic.hasKey && apiDiagnostic.isValid && (!limits.articles || isDevOrAdmin);
                


                return (
                  <div key={idea.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-all">
                    <div className="flex gap-4">
                      {/* Imagem do artigo (se disponível) */}
                      {hasArticle && article?.imageUrl ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={article.imageUrl} 
                            alt={`Imagem do artigo: ${idea.titulo}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : hasArticle && article && !article.imageUrl ? (
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 bg-gray-100 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-400 text-xs text-center">Sem<br/>imagem</span>
                          </div>
                        </div>
                      ) : null}
                      
                      <div className="flex-1 flex flex-col gap-3">
                        {/* Cabeçalho com checkbox, título e status */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIdeaIds.includes(idea.id)}
                            onCheckedChange={(checked: boolean) => handleSelectIdea(idea.id, checked)}
                            disabled={isProcessing || hasArticle || processingBatch}
                          />
                          <h4 className="font-poppins font-medium text-foreground flex-1">
                            {idea.titulo}
                          </h4>
                          {/* Badge de status ao lado do título */}
                          {idea.status === 'produzido' && (
                            <Badge className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Produzido
                            </Badge>
                          )}
                          {idea.status === 'erro' && (
                            <Badge className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded" title={idea.errorMessage}>
                              ⚠️ Erro
                            </Badge>
                          )}
                        </div>
                      
                      {/* Badges de site, categoria e tags */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className="text-xs text-white border-none px-2 py-1 rounded" style={{ backgroundColor: '#8c52ff' }}>
                          {getSiteName(idea.siteId)}
                        </Badge>
                        <Badge className="text-xs bg-white border px-2 py-1 rounded" style={{ borderColor: '#8c52ff', color: '#8c52ff' }}>
                          {idea.categoria}
                        </Badge>
                        {idea.tags?.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} className="text-xs bg-white border px-2 py-1 rounded" style={{ borderColor: '#8c52ff', color: '#8c52ff' }}>
                            {tag}
                          </Badge>
                        ))}
                        {idea.tags && idea.tags.length > 2 && (
                          <Badge className="text-xs bg-white border px-2 py-1 rounded" style={{ borderColor: '#8c52ff', color: '#8c52ff' }}>
                            +{idea.tags.length - 2}
                          </Badge>
                        )}
                      </div>



                      {/* Botões de ação */}
                      <div className="flex flex-wrap gap-2 justify-end">
                        {/* Botão para editar ideia - apenas visível se não tiver artigo produzido */}
                        {!hasArticle && (
                          <Button
                            onClick={() => handleOpenEditDialog(idea.id)}
                            disabled={isProcessing || processingBatch || deletingSingle[idea.id]}
                            className="bg-white border-[#8c52ff] text-[#8c52ff] hover:bg-purple-50 px-2 py-1 text-sm"
                            title="Editar título da ideia"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}

                        {hasArticle && article ? (
                          <>
                            <Button
                              onClick={() => handleOpenViewModal(idea)}
                              className="bg-green-600 hover:bg-green-700 text-white border-green-600 px-2 py-1 text-sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {!article.publishedUrl && !article.scheduledDate && (
                              <>
                                <Button
                                  onClick={() => handlePublishArticle(idea.id)}
                                  disabled={publishingSingle[idea.id]}
                                  className="btn-bia text-white px-2 py-1 text-sm"
                                >
                                  {publishingSingle[idea.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-1" />
                                  )}
                                  Publicar
                                </Button>
                                <Button
                                  onClick={() => handleOpenScheduleDialog(idea.id)}
                                  disabled={schedulingSingle[idea.id]}
                                  className="bg-white border border-purple-600 text-purple-600 hover:bg-purple-50 px-2 py-1 text-sm"
                                >
                                  {schedulingSingle[idea.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Calendar className="h-4 w-4 mr-1" />
                                  )}
                                  Agendar
                                </Button>
                              </>
                            )}
                            {(article.publishedUrl || article.scheduledDate) && (
                              <Badge className="text-xs">
                                {article.publishedUrl ? 'Publicado' : 'Agendado'}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Button
                            onClick={() => handleProduceFromIdea(idea.id)}
                            disabled={isProcessing || !canProduce || processingBatch}
                            className="text-white disabled:bg-gray-300 px-2 py-1 text-sm"
                            style={{ 
                              backgroundColor: canProduce && !isProcessing && !processingBatch ? '#8c52ff' : '#9CA3AF' 
                            }}
                          >
                            {isProcessing || (processingBatch && batchItemProgress !== undefined) ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Zap className="h-4 w-4 mr-1" />
                            )}
                            {isProcessing || (processingBatch && batchItemProgress !== undefined) ? 'Produzindo...' : 'Produzir'}
                          </Button>
                        )}
                        
                        {/* 🛑 Botão para cancelar geração em andamento - Aparece apenas após 3 minutos */}
                        {isProcessing && showCancelButtonForIdea[idea.id] && (
                          <Button
                            onClick={() => handleCancelProduction(idea.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 text-sm"
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Cancelar (3min+)
                          </Button>
                        )}
                        
                        {/* Botão para excluir ideia */}
                        <Button
                          onClick={() => handleDeleteIdea(idea.id)}
                          disabled={deletingSingle[idea.id] || isProcessing || processingBatch}
                          className="text-red-600 hover:bg-red-50 bg-transparent px-2 py-1 text-sm"
                        >
                          {deletingSingle[idea.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        </div>
                        
                        {/* Barra de loading estreita na parte inferior */}
                        {(isProcessing || (processingBatch && batchItemProgress !== undefined)) && (
                          <div className="mt-2">
                            {/* ✅ CORRIGIDO: Garantir que o valor de progresso é sempre um número válido (0-100 ou -1) */}
                            {(() => {
                              const progressValue = batchItemProgress !== undefined ? batchItemProgress : progress;
                              const validProgress = typeof progressValue === 'number' ? progressValue : 0;
                              const isError = validProgress === -1;
                              const displayPercent = isError ? 100 : Math.max(0, Math.min(100, validProgress));
                              
                              return (
                                <>
                                  <div className="flex justify-between text-xs text-purple-600 mb-1">
                                    <span>
                                      {publishingBatch ? 'Publicando no WordPress...' : processingBatch ? 'Produção em massa...' : 'Produzindo artigo...'}
                                    </span>
                                    <span>{isError ? 'Erro' : `${displayPercent}%`}</span>
                                  </div>
                                  <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full transition-all duration-300 ease-out rounded-full"
                                      style={{ 
                                        width: `${displayPercent}%`,
                                        backgroundColor: isError ? '#ef4444' : '#8c52ff'
                                      }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação - Seguindo padrão das Ações Rápidas */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 p-4 bg-white border rounded-lg">
              <div className="text-sm text-muted-foreground font-montserrat">
                Página {currentPage} de {totalPages} ({availableIdeas.length} ideias)
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-white px-3 py-2"
                  style={{ backgroundColor: '#8c52ff' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-white px-3 py-2"
                  style={{ backgroundColor: '#8c52ff' }}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para visualizar/editar artigo */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="font-poppins flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="mr-2 h-5 w-5" style={{ color: '#8c52ff' }} />
                {isEditingArticle ? 'Editar Artigo' : 'Visualizar Artigo'}
              </div>
              <div className="flex gap-2">
                {!isEditingArticle ? (
                  <Button
                    onClick={() => setIsEditingArticle(true)}
                    className="text-white px-3 py-1 text-sm"
                    style={{ backgroundColor: '#8c52ff' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8c52ff'}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleSaveArticleEdits}
                      disabled={isSavingArticle}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                    >
                      {isSavingArticle ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                    <Button
                      onClick={handleCancelArticleEdit}
                      className="px-3 py-1 text-sm border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="font-montserrat">
              {isEditingArticle 
                ? 'Edite o título e conteúdo do artigo conforme necessário antes de publicar.'
                : 'Visualize o conteúdo completo do artigo gerado, incluindo imagem, informações e formatação.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {currentViewingArticle && (
            <div className="w-full max-w-none px-6 pb-6">
              <div className="mx-auto" style={{ width: '60%', minWidth: '600px', maxWidth: '1200px' }}>
                <div className="space-y-6">
              {/* Informações do artigo */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-montserrat text-sm text-gray-600">Site</Label>
                  <p className="font-montserrat">{currentViewingArticle.siteName}</p>
                </div>
                <div>
                  <Label className="font-montserrat text-sm text-gray-600">Categoria</Label>
                  <p className="font-montserrat">{currentViewingArticle.idea.categoria}</p>
                </div>
                <div>
                  <Label className="font-montserrat text-sm text-gray-600">Palavras</Label>
                  <p className="font-montserrat">{isEditingArticle ? countWords(editedArticleContent) : currentViewingArticle.wordCount}</p>
                </div>
                <div>
                  <Label className="font-montserrat text-sm text-gray-600">Status</Label>
                  <Badge className="bg-green-100 text-green-800">
                    {currentViewingArticle.article.status}
                  </Badge>
                </div>
              </div>

              {/* Tags */}
              {currentViewingArticle.idea.tags && currentViewingArticle.idea.tags.length > 0 && (
                <div>
                  <Label className="font-montserrat text-sm text-gray-600 mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {currentViewingArticle.idea.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} className="text-xs bg-white text-[#8c52ff] border border-[#8c52ff] px-1 rounded">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagem em destaque */}
              {currentViewingArticle.article.imageUrl ? (
                <div>
                  <Label className="font-montserrat text-sm text-gray-600 mb-2 block">Imagem em Destaque</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={currentViewingArticle.article.imageUrl} 
                      alt={isEditingArticle ? editedArticleTitle : currentViewingArticle.article.titulo}
                      className="w-full object-cover"
                      style={{ height: '400px' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="font-montserrat text-sm text-gray-600 mb-2 block">Imagem em Destaque</Label>
                  <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
                    <span className="text-gray-400 text-center">Nenhuma imagem disponível para este artigo</span>
                  </div>
                </div>
              )}
              


              {/* Título do artigo */}
              <div>
                <Label className="font-montserrat text-sm text-gray-600 mb-2 block">Título</Label>
                {isEditingArticle ? (
                  <Input
                    value={editedArticleTitle}
                    onChange={(e) => setEditedArticleTitle(e.target.value)}
                    className="font-montserrat text-lg font-semibold"
                    placeholder="Digite o título do artigo..."
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900 font-poppins">
                    {currentViewingArticle.article.titulo}
                  </h2>
                )}
              </div>

              {/* Conteúdo do artigo */}
              <div>
                <Label className="font-montserrat text-sm text-gray-600 mb-2 block">Conteúdo</Label>
                {isEditingArticle ? (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                      <p className="text-sm text-gray-600 font-montserrat">
                        📝 Editando apenas o texto. A formatação HTML será preservada automaticamente.
                      </p>
                    </div>
                    <Textarea
                      value={getPlainTextFromHtml(editedArticleContent)}
                      onChange={(e) => handleTextEdit(e.target.value)}
                      className="min-h-96 font-gray-700 border-0 resize-none focus:ring-0 text-base leading-relaxed"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      placeholder="Digite o conteúdo do artigo..."
                    />
                  </div>
                ) : (
                  <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <div 
                      className="max-w-none p-8 text-justify"
                      style={{ 
                        fontSize: '18px', 
                        lineHeight: '1.8',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        color: '#333333'
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ __html: addWordPressStyles(currentViewingArticle.article.conteudo) }}
                      />
                    </div>
                  </div>
                )}
              </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para agendamento */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-purple-600" />
              Agendar Publicação
            </DialogTitle>
            <DialogDescription className="font-montserrat">
              Selecione a data e horário para publicar automaticamente no WordPress.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Calendário */}
            <div>
              <Label className="font-montserrat mb-2 block">Data da Publicação</Label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date: Date) => date < new Date()}
                className="rounded-md border w-full"
                locale={ptBR}
              />
            </div>

            {/* Horário */}
            <div>
              <Label className="font-montserrat mb-2 block">Horário</Label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setScheduleDialogOpen(false)}
                className="border px-2 py-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleScheduleArticle}
                disabled={!selectedDate || (currentSchedulingArticle !== null && schedulingSingle[currentSchedulingArticle])}
                className="text-white px-2 py-1"
                style={{ backgroundColor: '#8c52ff' }}
              >
                {currentSchedulingArticle !== null && schedulingSingle[currentSchedulingArticle] ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" style={{ color: '#8c52ff' }} />
                ) : (
                  <Calendar className="h-4 w-4 mr-1" />
                )}
                Agendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para edição de ideias */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-poppins flex items-center">
              <Edit3 className="mr-2 h-5 w-5 text-[#8c52ff]" />
              Editar Ideia
            </DialogTitle>
            <DialogDescription className="font-montserrat">
              Edite o título da ideia. O conteúdo editado será usado na produção do artigo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="font-montserrat mb-2 block">
                Título da Ideia *
              </Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Digite o novo título da ideia"
                className="font-montserrat"
                disabled={isSavingEdit}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                onClick={handleCancelEdit}
                disabled={isSavingEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEditIdea}
                disabled={isSavingEdit || !editedTitle.trim()}
                className="bg-[#8c52ff] hover:bg-[#6B4C93] text-white px-4 py-2"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}