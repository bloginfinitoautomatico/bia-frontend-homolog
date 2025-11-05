import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useCredits } from '../../hooks/useCredits';
import { getPlanLimits } from '../../utils/constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import newsApi from '../../services/newsApi';
import { 
  Plus, 
  Newspaper,
  Rss,
  Globe,
  Clock,
  Settings,
  Trash2,
  Edit,
  Search,
  Loader2,
  Play,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  Monitor,
  Archive,
  X,
  Calendar,
  BarChart3,
  User,
  FolderOpen,
  Tag,
  FileText,
  Eye,
  Upload,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from '../icons';
import { toast } from 'sonner';
import { useBia } from '../BiaContext';
import { databaseService } from '../../services/databaseService';
import { wordpressService } from '../../services/wordpressService';

// Debug condicional - configurável por ambiente
const DEBUG = import.meta.env.MODE === 'development';
const PROD_LOGS = import.meta.env.VITE_ENABLE_PROD_LOGS === 'true'; // Para logs essenciais em produção
const debugLog = (...args) => (DEBUG || PROD_LOGS) && console.log(...args);
const debugWarn = (...args) => (DEBUG || PROD_LOGS) && console.warn(...args);
const debugError = (...args) => console.error(...args); // Erros sempre aparecem

export function BiaNews({ userData, onUpdateUser, onNavigate }) {
  const { state, dispatch, actions } = useBia();
  const planLimits = getPlanLimits(state.user?.plano || 'FREE');
  const [sources, setSources] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMonitoringIds, setLoadingMonitoringIds] = useState(new Set());
  const [rewritingArticleIds, setRewritingArticleIds] = useState(new Set());
  const [sourceProcessingStates, setSourceProcessingStates] = useState({});
  const [sourceArticles, setSourceArticles] = useState({}); // Artigos por fonte - carregados do backend
  const [sourceExecutions, setSourceExecutions] = useState({}); // Timestamp da ÚLTIMA VERIFICAÇÃO por fonte (diferente do contador no localStorage)
  const [expandedSources, setExpandedSources] = useState({}); // Fontes com lista expandida
  const [expandedMonitoring, setExpandedMonitoring] = useState({}); // Automações com lista expandida
  const [activeTab, setActiveTab] = useState('sources'); // 'sources', 'monitoring', 'articles', 'history', 'excluded'
  
  // Estados para adicionar nova fonte
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    target_site_id: '',
    // Configurações WordPress da fonte
    default_author_id: '',
    default_categories: [],
    default_tags: []
  });

  // Estados para configurar monitoramento
  const [showAddMonitoring, setShowAddMonitoring] = useState(false);
  const [editingMonitoring, setEditingMonitoring] = useState(null);
    const [newMonitoring, setNewMonitoring] = useState({ 
    source_id: '', 
    site_id: '',
    frequency: 'daily', 
    articles_count: 5, 
    active: true,
    rewrite_content: true,
    auto_publish: false,
    target_category: '',
    author_id: '',
    categories: [],
    tags: []
  });

  // Estados para edição de fonte
  const [editingSource, setEditingSource] = useState(null);

  // Estados para dados WordPress
  const [wordpressData, setWordpressData] = useState({
    categories: [],
    authors: [],
    tags: []
  });
  const [isLoadingWordPress, setIsLoadingWordPress] = useState(false);

  // Usar hook de créditos para sincronização global
  const userCredits = useCredits();

  // Estados para modal de visualização de artigo
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Estado para filtro de artigos processados (aba geral)
  const [articleFilter, setArticleFilter] = useState('all'); // 'all', 'pending', 'rewritten', 'published'
  
  // Estado para forçar re-render de componentes que dependem do localStorage
  const [forceRender, setForceRender] = useState(0);
  const forceUpdate = () => setForceRender(prev => prev + 1);
  
  // Estado para filtros individuais de cada fonte
  const [sourceFilters, setSourceFilters] = useState({}); // { sourceId: 'all'|'pending'|'rewritten'|'published' }

  useEffect(() => {
    loadData();
  }, []);

  // Nota: Artigos agora são carregados globalmente e sincronizados por fonte automaticamente



  // Sincronizar wordpressService quando sites mudarem (igual ao GerarIdeias)
  useEffect(() => {
    const syncWordPressOnSitesChange = async () => {
      try {
        debugLog('🔄 Sites do BiaContext foram atualizados, sincronizando wordpressService...');
        await wordpressService.syncFromBiaContext();
      } catch (error) {
        debugWarn('⚠️ Erro ao sincronizar wordpressService após mudança nos sites:', error);
      }
    };

    if (state.sites.length > 0) {
      syncWordPressOnSitesChange();
    }
  }, [state.sites]);

  // Carregar dados do WordPress quando site de destino for selecionado no formulário de fonte
  useEffect(() => {
    const loadSiteDataForNewSource = async () => {
      // Permite carregamento tanto para nova fonte quanto para edição
      if (!newSource.target_site_id || (!showAddSource && !editingSource)) {
        return;
      }
      
      debugLog('🔄 Site de destino selecionado (formulário fonte), carregando configurações WordPress...');
      await loadWordPressData(newSource.target_site_id);
    };

    loadSiteDataForNewSource();
  }, [newSource.target_site_id, showAddSource, editingSource]);

  // Carregar dados do WordPress quando site de destino for alterado na edição de fonte
  useEffect(() => {
    const loadSiteDataForEditSource = async () => {
      if (!newSource.target_site_id || !editingSource) {
        return;
      }
      
      debugLog('🔄 Site de destino alterado (editando fonte), carregando configurações WordPress...');
      await loadWordPressData(newSource.target_site_id);
    };

    loadSiteDataForEditSource();
  }, [newSource.target_site_id, editingSource]);

  // Escutar mensagens das janelas popup de artigos
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      
      const { action, articleId } = event.data;
      
      if (action === 'publishArticle') {
        const article = articles.find(a => a.id === articleId);
        if (article) {
          await handlePublishArticle(article);
        }
      } else if (action === 'scheduleArticle') {
        const article = articles.find(a => a.id === articleId);
        if (article) {
          await handleScheduleArticle(article);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [articles]);

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      debugLog('📊 Carregando dados do BIA News...', forceRefresh ? '(forçado)' : '');
      
      // Se for refresh forçado, limpar cache local
      if (forceRefresh) {
        debugLog('🗑️ Limpando cache local...');
        setSourceArticles({});
        setSourceExecutions({});
        
        // Limpar contadores do localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.endsWith('_executions')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      // Limpar apenas fontes e monitoramentos (manter sourceArticles para consistência)
      setSources([]);
      setMonitoring([]);
      
      // Carregar dados do BIA News da API - capturar dados das fontes para passá-los ao monitoramento
      await loadSources();
      
      // Aguardar atualização do estado e carregar monitoramentos
      setTimeout(async () => {
        await loadMonitoring();
      }, 100); // Pequeno delay para garantir que o estado foi atualizado
      
      // Carregar artigos e sincronizar por fonte (já acontece dentro do loadArticles)
      await loadArticles();
      
      // Carregar metadados de execução após carregar as fontes
      await loadSourceExecutionMetadata();
      
      // Validar integridade após carregamento
      setTimeout(() => {
        validateDataIntegrity();
      }, 500); // Pequeno delay para garantir que todos os estados foram atualizados
      
      debugLog('✅ Dados do BIA News carregados com sucesso');

    } catch (error) {
      debugError('❌ Erro ao carregar dados do BIA News:', error);
      toast.error('Erro ao carregar dados do BIA News');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para validar integridade dos dados
  const validateDataIntegrity = () => {
    debugLog('🔍 Validando integridade dos dados...');
    
    const issues = [];
    
    // Validar fontes órfãs (sem site associado válido)
    const orphanSources = sources.filter(source => {
      if (!source.target_site_id) return false;
      return !userSites.some(site => site.id === parseInt(source.target_site_id));
    });
    
    if (orphanSources.length > 0) {
      issues.push(`${orphanSources.length} fonte(s) associada(s) a site(s) inexistente(s)`);
    }
    
    // Validar monitoramentos órfãos
    const orphanMonitoring = monitoring.filter(monitor => {
      const sourceExists = sources.some(s => s.id === monitor.source_id);
      const siteExists = userSites.some(s => s.id === monitor.site_id);
      return !sourceExists || !siteExists;
    });
    
    if (orphanMonitoring.length > 0) {
      issues.push(`${orphanMonitoring.length} monitoramento(s) com associação inválida`);
    }
    
    // Validar artigos órfãos no cache
    const cachedSourceIds = Object.keys(sourceArticles);
    const orphanCacheEntries = cachedSourceIds.filter(sourceId => 
      !sources.some(s => s.id === parseInt(sourceId))
    );
    
    if (orphanCacheEntries.length > 0) {
      issues.push(`${orphanCacheEntries.length} entrada(s) de cache órfã(s)`);
      // Limpar automaticamente
      setSourceArticles(prev => {
        const clean = { ...prev };
        orphanCacheEntries.forEach(id => delete clean[id]);
        return clean;
      });
    }
    
    if (issues.length > 0) {
      debugWarn('⚠️ Problemas de integridade encontrados:', issues);
      toast.warn(`Integridade: ${issues.join(', ')}`);
    } else {
      debugLog('✅ Dados íntegros');
    }
    
    return issues.length === 0;
  };

  // Função para carregar e salvar metadados de execução no backend
  const loadSourceExecutionMetadata = async () => {
    try {
      debugLog('📊 Carregando metadados de execução do backend...');
      
      // Tentar carregar dados de execução salvos do backend
      let executionData = {};
      
      try {
        // Primeiro, tentar carregar metadados salvos via API (se existir endpoint)
        const metadataResponse = await newsApi.sources.getExecutionMetadata?.();
        if (metadataResponse?.data?.success) {
          executionData = metadataResponse.data.data || {};
          debugLog('✅ Metadados de execução carregados do backend:', executionData);
        }
      } catch (metadataError) {
        debugLog('ℹ️ Endpoint de metadados não disponível, usando fallback via artigos');
      }
      
      // Fallback: Carregar dados de execução baseado no último artigo de cada fonte
      for (const source of sources) {
        try {
          // Se não temos dados salvos para esta fonte, buscar pelo último artigo
          if (!executionData[source.id]) {
            const response = await newsApi.articles.list({
              per_page: 1,
              news_source_id: source.id,
              user_only: true,
              sort: 'created_at',
              order: 'desc'
            });
            
            const latestArticle = response.data.data?.data?.[0];
            if (latestArticle) {
              executionData[source.id] = latestArticle.created_at;
            }
          }
        } catch (error) {
          debugWarn(`⚠️ Erro ao carregar execução da fonte ${source.id}:`, error);
        }
      }
      
      setSourceExecutions(executionData);
      debugLog('✅ Metadados de execução processados:', executionData);
      
    } catch (error) {
      debugError('❌ Erro ao carregar metadados de execução:', error);
    }
  };

  // Função para salvar timestamp de execução no backend
  const saveSourceExecutionTimestamp = async (sourceId, timestamp) => {
    try {
      debugLog(`💾 Salvando timestamp de execução para fonte ${sourceId}...`);
      
      // Tentar salvar via API específica (se existir)
      try {
        await newsApi.sources.saveExecutionMetadata?.({
          source_id: sourceId,
          last_execution: timestamp,
          user_id: userData.id
        });
        debugLog('✅ Timestamp salvo via API de metadados');
      } catch (apiError) {
        debugLog('ℹ️ API de metadados não disponível, usando abordagem alternativa');
        
        // Fallback: salvar como comentário/nota na fonte
        try {
          await newsApi.sources.update(sourceId, {
            last_execution_timestamp: timestamp,
            last_user_check: new Date().toISOString()
          });
          debugLog('✅ Timestamp salvo como atributo da fonte');
        } catch (updateError) {
          debugWarn('⚠️ Não foi possível salvar timestamp:', updateError);
        }
      }
      
    } catch (error) {
      debugError(`❌ Erro ao salvar timestamp da fonte ${sourceId}:`, error);
    }
  };

  const loadSources = async () => {
    try {
      debugLog('🔄 Carregando fontes do backend...');
      const response = await newsApi.sources.list();
      const sourcesData = response.data.data || [];
      
      // Limpar estado de artigos de fontes que não existem mais
      setSourceArticles(prev => {
        const newState = {};
        sourcesData.forEach(source => {
          if (prev[source.id]) {
            newState[source.id] = prev[source.id];
          }
        });
        return newState;
      });
      
      // Validar associação com sites do usuário
      const validSources = sourcesData.filter(source => {
        if (!source.target_site_id) return true; // Permite fontes sem site associado
        const siteExists = userSites.some(site => site.id === parseInt(source.target_site_id));
        if (!siteExists) {
          debugWarn(`⚠️ Fonte "${source.name}" associada a site inexistente (ID: ${source.target_site_id})`);
        }
        return siteExists;
      });
      
      setSources(validSources);
      
      // Extrair timestamps de execução das fontes (se estiverem salvos)
      const sourceTimestamps = {};
      validSources.forEach(source => {
        if (source.last_execution_timestamp) {
          sourceTimestamps[source.id] = source.last_execution_timestamp;
        } else if (source.last_user_check) {
          sourceTimestamps[source.id] = source.last_user_check;
        }
      });
      
      // Atualizar timestamps se houver dados salvos
      if (Object.keys(sourceTimestamps).length > 0) {
        setSourceExecutions(prev => ({
          ...prev,
          ...sourceTimestamps
        }));
        debugLog('📅 Timestamps de execução carregados das fontes:', sourceTimestamps);
      }
      
      debugLog('✅ Fontes carregadas e validadas:', validSources.length);
      debugLog('🔍 Lista de fontes válidas:', validSources.map(s => ({ 
        id: s.id, 
        name: s.name, 
        url: s.url,
        target_site_id: s.target_site_id,
        last_execution: s.last_execution_timestamp || s.last_user_check,
        default_author_id: s.default_author_id,
        default_categories: s.default_categories,
        default_tags: s.default_tags
      })));
      
      if (sourcesData.length !== validSources.length) {
        debugWarn(`⚠️ ${sourcesData.length - validSources.length} fonte(s) removida(s) por associação inválida`);
      }
      
    } catch (error) {
      debugError('❌ Erro ao carregar fontes:', error);
      toast.error('Erro ao carregar fontes de notícias');
    }
  };

  const loadMonitoring = async (sourcesData = null, userSitesData = null) => {
    try {
      debugLog('🔄 Carregando monitoramentos do backend...');
      const response = await newsApi.monitoring.list();
      const monitoringData = response.data.data || response.data || [];
      
      // Usar dados passados como parâmetro ou do estado atual
      const currentSources = sourcesData || sources;
      const currentUserSites = userSitesData || userSites;
      
      debugLog('📊 Debug loadMonitoring:');
      debugLog('- Resposta da API:', response.data);
      debugLog('- Dados recebidos:', monitoringData);
      debugLog('- Sources disponíveis:', currentSources.map(s => ({ id: s.id, name: s.name })));
      debugLog('- Sites disponíveis:', currentUserSites.map(s => ({ id: s.id, nome: s.nome })));
      
      // Por enquanto, vamos carregar TODOS os monitoramentos sem validação restritiva
      // para identificar o problema
      setMonitoring(monitoringData);
      debugLog('✅ TODOS os monitoramentos carregados (sem validação):', monitoringData.length);
      debugLog('✅ Monitoramentos finais:', monitoringData);
      
      // Debug individual de cada monitoramento
      monitoringData.forEach((monitor, index) => {
        debugLog(`🔍 Monitoramento ${index + 1}:`, {
          id: monitor.id,
          news_source_id: monitor.news_source_id,
          source_id: monitor.source_id,
          site_id: monitor.site_id,
          active: monitor.active,
          settings: monitor.settings
        });
      });
      
    } catch (error) {
      debugError('❌ Erro ao carregar monitoramentos:', error);
      toast.error('Erro ao carregar monitoramentos');
    }
  };

  const loadArticles = async () => {
    try {
      debugLog('📰 Carregando todos os artigos do usuário...');
      
      // Carregar todos os artigos do usuário, garantindo que nada seja perdido
      const response = await newsApi.articles.list({ 
        per_page: 200, // Aumentar limite para garantir todos os artigos
        user_only: true, // Apenas artigos do usuário atual
        include_all: true, // Incluir todos os status
        sort: 'created_at',
        order: 'desc'
      });
      
      const articles = response.data.data?.data || [];
      setArticles(articles);
      
      debugLog('✅ Artigos carregados do backend:', articles.length);
      
      // Debug: mostrar distribuição por status
      const statusCount = {};
      const sourceCount = {};
      
      articles.forEach(article => {
        statusCount[article.status] = (statusCount[article.status] || 0) + 1;
        
        // Contar por fonte
        const sourceId = article.news_source_id || article.metadata?.source_id;
        if (sourceId) {
          sourceCount[sourceId] = (sourceCount[sourceId] || 0) + 1;
        }
      });
      
      debugLog('📊 Distribuição por status:', statusCount);
      debugLog('📊 Distribuição por fonte:', sourceCount);
      
      // Sincronizar artigos por fonte baseado nos artigos carregados
      syncArticlesBySource(articles);
      
      return articles;
    } catch (error) {
      debugError('❌ Erro ao carregar artigos:', error);
      toast.error('Erro ao carregar artigos do backend');
      return [];
    }
  };

  // Função para sincronizar artigos por fonte baseado na lista global
  const syncArticlesBySource = (articlesData) => {
    try {
      debugLog('🔄 Sincronizando artigos por fonte...');
      
      const articlesBySource = {};
      
      articlesData.forEach(article => {
        // Determinar a fonte do artigo
        let sourceId = null;
        
        if (article.news_source_id) {
          sourceId = article.news_source_id;
        } else if (article.metadata?.source_id) {
          sourceId = article.metadata.source_id;
        } else if (article.news_monitoring?.news_source?.id) {
          sourceId = article.news_monitoring.news_source.id;
        }
        
        if (sourceId) {
          if (!articlesBySource[sourceId]) {
            articlesBySource[sourceId] = [];
          }
          articlesBySource[sourceId].push(article);
        }
      });
      
      // Ordenar artigos de cada fonte por data
      Object.keys(articlesBySource).forEach(sourceId => {
        articlesBySource[sourceId].sort((a, b) => {
          const dateA = new Date(a.metadata?.published_date || a.created_at);
          const dateB = new Date(b.metadata?.published_date || b.created_at);
          return dateB - dateA; // Mais recente primeiro
        });
      });
      
      setSourceArticles(articlesBySource);
      
      debugLog('✅ Artigos sincronizados por fonte:', 
        Object.keys(articlesBySource).reduce((total, sourceId) => 
          total + articlesBySource[sourceId].length, 0
        )
      );
      
    } catch (error) {
      debugError('❌ Erro ao sincronizar artigos por fonte:', error);
    }
  };

  const loadSourceArticles = async (sourceId) => {
    try {
      // Verificar se a fonte existe
      const sourceExists = sources.find(s => s.id === sourceId);
      if (!sourceExists) {
        debugWarn(`⚠️ Fonte ${sourceId} não encontrada na lista de fontes`);
        setSourceArticles(prev => ({
          ...prev,
          [sourceId]: []
        }));
        return;
      }

      // Sempre recarregar artigos do backend para garantir sincronização
      debugLog(`🔄 Carregando artigos da fonte ${sourceId} do backend...`);
      
      // Carregar TODOS os artigos que foram criados a partir desta fonte específica DO USUÁRIO ATUAL
      const response = await newsApi.articles.list({ 
        per_page: 100,
        news_source_id: sourceId, // Filtrar pela fonte específica
        user_only: true // Garantir que só traga artigos do usuário atual
        // Não filtrar por status - queremos todos os artigos processados da fonte
      });
      const allArticles = response.data.data?.data || [];
      
      debugLog(`🔍 Total de artigos disponíveis:`, allArticles.length);
      debugLog(`🔍 Procurando por fonte ID:`, sourceId);
      debugLog(`🔍 Nome da fonte:`, sourceExists.name);
      
      // Debug: mostrar estrutura de alguns artigos
      if (allArticles.length > 0) {
        debugLog(`📝 Estrutura do primeiro artigo:`, allArticles[0]);
        debugLog(`🔍 Todos os artigos disponíveis:`, allArticles.map(article => ({
          id: article.id,
          title: article.title?.substring(0, 50) + '...',
          metadata: article.metadata,
          news_source_id: article.news_source_id,
          news_monitoring: article.news_monitoring,
          source_url: article.source_url
        })));
      }
      
      // Como já filtramos na API, todos os artigos retornados são desta fonte e usuário
      // Mas vamos manter uma validação de segurança
      const filteredArticles = allArticles.filter(article => {
        // Validação de segurança: garantir que o artigo pertence a esta fonte
        const belongsToSource = article.news_source_id == sourceId || 
                              article.metadata?.source_id == sourceId ||
                              article.news_monitoring?.news_source?.id == sourceId;
        
        const matches = belongsToSource;
        
        if (matches) {
          debugLog(`✅ Artigo encontrado da fonte ${sourceId} (${sourceExists.name}):`, {
            id: article.id,
            title: article.title.substring(0, 50) + '...',
            status: article.status,
            news_source_id: article.news_source_id,
            metadata_source_id: article.metadata?.source_id,
            monitoring_source_id: article.news_monitoring?.news_source?.id,
            created_at: article.created_at
          });
        }
        
        return matches;
      });
      
      // Debug: se nenhum artigo foi encontrado, mostrar por que
      if (filteredArticles.length === 0 && allArticles.length > 0) {
        debugLog(`❌ Nenhum artigo encontrado para fonte ${sourceId}. Analisando todos os artigos:`);
        allArticles.forEach((article, index) => {
          debugLog(`📄 Artigo ${index + 1}:`, {
            id: article.id,
            title: article.title?.substring(0, 50) + '...',
            metadata_source_id: article.metadata?.source_id,
            metadata_source_name: article.metadata?.source_name,
            news_source_id: article.news_source_id,
            news_monitoring_source_id: article.news_monitoring?.news_source?.id,
            source_criteria: {
              news_source_id: article.news_source_id,
              metadata_source_id: article.metadata?.source_id,
              monitoring_source_id: article.news_monitoring?.news_source?.id,
              belongs_to_source: article.news_source_id == sourceId || 
                               article.metadata?.source_id == sourceId ||
                               article.news_monitoring?.news_source?.id == sourceId
            }
          });
        });
      }
      
      // Ordenar artigos por data de publicação (mais recente primeiro)
      const sortedArticles = filteredArticles.sort((a, b) => {
        const dateA = new Date(a.metadata?.published_date || a.created_at);
        const dateB = new Date(b.metadata?.published_date || b.created_at);
        return dateB - dateA; // Mais recente primeiro
      });
      
      setSourceArticles(prev => ({
        ...prev,
        [sourceId]: sortedArticles
      }));
      
      // Atualizar timestamp de execução local e salvar no backend
      const newTimestamp = new Date().toISOString();
      setSourceExecutions(prev => ({
        ...prev,
        [sourceId]: newTimestamp
      }));
      
      // Salvar timestamp no backend de forma assíncrona
      saveSourceExecutionTimestamp(sourceId, newTimestamp);
      
      debugLog(`✅ Artigos da fonte ${sourceId} carregados:`, sortedArticles.length);
    } catch (error) {
      debugError('❌ Erro ao carregar artigos da fonte:', error);
    }
  };



  const loadWordPressData = async (siteId) => {
    if (!siteId) return;
    
    debugLog('🔄 Carregando dados WordPress para site ID:', siteId);
    setIsLoadingWordPress(true);
    
    try {
      // Primeiro, sincronizar o wordpressService com os dados do BiaContext
      await wordpressService.syncFromBiaContext();
      
      // Buscar o site no BiaContext
      const site = userSites.find(s => s.id == siteId);
      if (!site) {
        debugWarn('❌ Site não encontrado no BiaContext:', siteId);
        
        // Tentar buscar no wordpressService
        const wpSite = wordpressService.getSiteById(siteId.toString());
        if (wpSite) {
          debugLog('✅ Site encontrado no wordpressService');
          setWordpressData({
            categories: wpSite.categories || [],
            authors: wpSite.authors || [],
            tags: wpSite.tags || []
          });
        } else {
          debugLog('❌ Site não encontrado em lugar nenhum');
          setWordpressData({ categories: [], authors: [], tags: [] });
        }
        return;
      }

      debugLog('📝 Site encontrado:', site.nome, site.wordpressUrl);

      // Verificar se há dados em cache no wordpressService
      const cachedSite = wordpressService.getSiteById(siteId.toString());
      
      if (cachedSite && (cachedSite.categories?.length > 0 || cachedSite.authors?.length > 0)) {
        debugLog('✅ Usando dados em cache do wordpressService');
        setWordpressData({
          categories: cachedSite.categories || [],
          authors: cachedSite.authors || [],
          tags: cachedSite.tags || []
        });
      } else {
        debugLog('📡 Carregando dados frescos do WordPress...');
        
        if (site.wordpressUrl && site.wordpressUsername && site.wordpressPassword) {
          // Recarregar dados do WordPress
          const success = await wordpressService.reloadSiteData(siteId);
          
          if (success) {
            const updatedSite = wordpressService.getSiteById(siteId.toString());
            if (updatedSite) {
              debugLog('✅ Dados WordPress carregados com sucesso');
              setWordpressData({
                categories: updatedSite.categories || [],
                authors: updatedSite.authors || [],
                tags: updatedSite.tags || []
              });
            }
          } else {
            debugWarn('⚠️ Falha ao recarregar dados do WordPress');
            setWordpressData({
              categories: [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }],
              authors: [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }],
              tags: []
            });
          }
        } else {
          debugWarn('⚠️ Site sem configuração WordPress completa');
          setWordpressData({
            categories: [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }],
            authors: [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }],
            tags: []
          });
        }
      }

      debugLog('📊 Dados WordPress finais:', {
        categories: wordpressData.categories?.length || 0,
        authors: wordpressData.authors?.length || 0,
        tags: wordpressData.tags?.length || 0
      });

    } catch (error) {
      debugError('❌ Erro ao carregar dados WordPress:', error);
      setWordpressData({ categories: [], authors: [], tags: [] });
    } finally {
      setIsLoadingWordPress(false);
    }
  };

  // Funções para gerenciar categorias e tags no formulário de monitoramento
  const handleCategoryToggle = (categoryId, checked) => {
    const categories = [...newMonitoring.categories];
    if (checked) {
      categories.push(categoryId);
    } else {
      const index = categories.indexOf(categoryId);
      if (index > -1) categories.splice(index, 1);
    }
    setNewMonitoring({ ...newMonitoring, categories });
  };

  const handleTagToggle = (tagId, checked) => {
    const tags = [...newMonitoring.tags];
    if (checked) {
      tags.push(tagId);
    } else {
      const index = tags.indexOf(tagId);
      if (index > -1) tags.splice(index, 1);
    }
    setNewMonitoring({ ...newMonitoring, tags });
  };

  // Funções para gerenciar configurações WordPress no formulário de fonte
  const handleSourceCategoryToggle = (categoryId, checked) => {
    const categories = [...newSource.default_categories];
    if (checked) {
      categories.push(categoryId);
    } else {
      const index = categories.indexOf(categoryId);
      if (index > -1) categories.splice(index, 1);
    }
    setNewSource({ ...newSource, default_categories: categories });
  };

  const handleSourceTagToggle = (tagSlug, checked) => {
    const tags = [...newSource.default_tags];
    if (checked) {
      tags.push(tagSlug);
    } else {
      const index = tags.indexOf(tagSlug);
      if (index > -1) tags.splice(index, 1);
    }
    setNewSource({ ...newSource, default_tags: tags });
  };

  // Buscar todos os sites do usuário do BiaContext
  const userSites = React.useMemo(() => {
    if (!state.sites || !Array.isArray(state.sites)) {
      return [];
    }
    
    // Retornar todos os sites - a validação de WordPress será feita posteriormente
    const allSites = state.sites;
    
    debugLog(`📝 Sites do usuário carregados: ${allSites.length}`, allSites.map(site => ({
      id: site.id,
      nome: site.nome,
      wordpress_url: site.wordpress_url,
      wordpressUrl: site.wordpressUrl,
      wordpress_username: site.wordpress_username,
      wordpressUsername: site.wordpressUsername,
      wordpress_password: !!site.wordpress_password,
      wordpressPassword: !!site.wordpressPassword,
      hasWordPressConfig: !!(
        (site.wordpress_url || site.wordpressUrl) && 
        (site.wordpress_username || site.wordpressUsername) && 
        (site.wordpress_password || site.wordpressPassword)
      )
    })));
    return allSites;
  }, [state.sites]);

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url || !newSource.target_site_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validação simples - nome, URL e site de destino
    if (!newSource.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (!newSource.url?.trim()) {
      toast.error('URL é obrigatória');
      return;
    }
    
    if (!newSource.target_site_id?.trim()) {
      toast.error('Site de destino é obrigatório');
      return;
    }

    // Validar se o site pertence ao usuário e tem configuração WordPress
    const selectedSite = userSites.find(site => site.id === parseInt(newSource.target_site_id));
    if (!selectedSite) {
      debugLog('🚫 Site não encontrado:', {
        target_site_id: newSource.target_site_id,
        available_sites: userSites.map(s => ({ id: s.id, nome: s.nome }))
      });
      toast.error('Site de destino inválido ou não pertence ao usuário');
      return;
    }
    
    // Debug dos campos WordPress disponíveis
    debugLog('🔍 Verificando configuração WordPress do site:', {
      site_id: selectedSite.id,
      nome: selectedSite.nome,
      wordpress_url: selectedSite.wordpress_url,
      wordpressUrl: selectedSite.wordpressUrl,
      wordpress_username: selectedSite.wordpress_username,
      wordpressUsername: selectedSite.wordpressUsername,
      has_wordpress_password: !!selectedSite.wordpress_password,
      has_wordpressPassword: !!selectedSite.wordpressPassword
    });
    
    // Validar configuração WordPress do site (suporte aos dois formatos de campo)
    const hasWordPress = (selectedSite.wordpress_url || selectedSite.wordpressUrl) && 
                        (selectedSite.wordpress_username || selectedSite.wordpressUsername) && 
                        (selectedSite.wordpress_password || selectedSite.wordpressPassword);
    
    if (!hasWordPress) {
      debugLog('❌ Site sem configuração WordPress completa:', selectedSite);
      toast.error(`Site "${selectedSite.nome}" não possui configuração WordPress completa. Configure as credenciais WordPress primeiro.`);
      return;
    }
    
    try {
      new URL(newSource.url);
    } catch {
      toast.error('URL inválida');
      return;
    }

    try {
      setIsLoading(true);
      
      debugLog('📝 Adicionando nova fonte com configurações WordPress:', newSource);
      debugLog('🏢 Site selecionado:', selectedSite);
      debugLog('📋 Sites disponíveis do usuário:', userSites.map(s => ({ id: s.id, nome: s.nome })));
      
      const sourceData = {
        name: newSource.name.trim(),
        url: newSource.url.trim(),
        target_site_id: parseInt(newSource.target_site_id), // Garantir que seja número
        active: true,
        // Incluir configurações WordPress padrão
        default_author_id: newSource.default_author_id ? parseInt(newSource.default_author_id) : null,
        default_categories: newSource.default_categories.map(id => parseInt(id)),
        default_tags: newSource.default_tags
      };
      
      debugLog('📤 Dados enviados para o backend:', sourceData);
      
      const response = await newsApi.sources.createWithAutoDetection(sourceData);
      
      if (response.data.success) {
        await loadSources(); // Recarregar a lista
        
        // Limpar formulário
        setNewSource({ 
          name: '', 
          url: '', 
          target_site_id: '',
          default_author_id: '',
          default_categories: [],
          default_tags: []
        });
        
        // Limpar dados WordPress
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        
        setShowAddSource(false);
        toast.success('Fonte de notícias adicionada com sucesso! Configurações WordPress salvas.');
      } else {
        throw new Error(response.data.message || 'Erro ao adicionar fonte');
      }
    } catch (error) {
      debugError('❌ Erro ao adicionar fonte:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao adicionar fonte de notícias';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMonitoring = async () => {
    if (!newMonitoring.source_id) {
      toast.error('Selecione uma fonte de notícias');
      return;
    }

    if (!newMonitoring.site_id) {
      toast.error('Selecione um site WordPress para publicar as notícias');
      return;
    }

    // Verificar se o usuário tem créditos suficientes para reescrita de artigos
    if (newMonitoring.rewrite_content !== false) {
      const creditsCheck = await databaseService.checkCredits(userData.id, 'articles', 1);
      if (!creditsCheck.hasCredits) {
        toast.error('Você não tem créditos suficientes para reescrita de artigos. Configure o monitoramento sem reescrita ou adquira mais créditos.');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      debugLog('⚙️ Configurando novo monitoramento:', newMonitoring);
      
      const selectedSource = sources.find(s => s.id == newMonitoring.source_id);
      const selectedSite = userSites.find(s => s.id == newMonitoring.site_id);
      
      if (!selectedSite) {
        toast.error('Site selecionado não encontrado');
        return;
      }

      // Converter frequência para minutos
      const frequencyToMinutes = {
        'hourly': 60,
        'daily': 1440, // 24 horas
        'weekly': 10080 // 7 dias
      };

      const monitoringData = {
        news_source_id: parseInt(newMonitoring.source_id),
        site_id: parseInt(newMonitoring.site_id),
        active: newMonitoring.active || true,
        check_interval_minutes: frequencyToMinutes[newMonitoring.frequency] || 1440,
        auto_publish: newMonitoring.auto_publish || false,
        rewrite_content: newMonitoring.rewrite_content !== false, // default true
        target_category: newMonitoring.target_category || '',
        keywords_filter: newMonitoring.keywords_filter ? newMonitoring.keywords_filter.split(',').map(k => k.trim()).filter(k => k) : [],
        settings: {
          articles_count: newMonitoring.articles_count || 5,
          frequency: newMonitoring.frequency || 'daily'
        }
      };

      // Validar dados
      const validation = newsApi.format.validateMonitoring(monitoringData);
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(', ');
        toast.error(errorMessages);
        return;
      }

      debugLog('📤 Enviando dados para API:', monitoringData);
      
      let response;
      if (editingMonitoring) {
        response = await newsApi.monitoring.update(editingMonitoring.id, monitoringData);
      } else {
        response = await newsApi.monitoring.create(monitoringData);
      }
      
      debugLog('📨 Resposta da API:', response.data);
      
      if (response.data.success) {
        debugLog('✅ Monitoramento salvo com sucesso, recarregando lista...');
        await loadMonitoring(); // Recarregar a lista
        setNewMonitoring({ source_id: '', site_id: '', frequency: 'daily', articles_count: 5, active: true, rewrite_content: true, auto_publish: false, target_category: '' });
        setEditingMonitoring(null);
        setShowAddMonitoring(false);
        const action = editingMonitoring ? 'atualizado' : 'configurado';
        toast.success(`Automação ${action} para o site "${selectedSite.nome}"!`);
      } else {
        const action = editingMonitoring ? 'atualizar' : 'configurar';
        throw new Error(response.data.message || `Erro ao ${action} monitoramento`);
      }
    } catch (error) {
      debugError('❌ Erro ao configurar monitoramento:', error);
      debugError('Response data:', error.response?.data);
      
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.values(validationErrors).flat().join(', ');
        toast.error(`Erro de validação: ${errorMessages}`);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao configurar monitoramento');
      }
    } finally {
      setIsLoading(false);
    }
  };



  // Função para processar/executar fonte
  // LÓGICA DE CONTADORES:
  // - localStorage: conta QUANTAS vezes executamos (para calcular offset)
  // - sourceExecutions: guarda QUANDO foi a última verificação (timestamp)
  const handleProcessSource = async (source) => {
    try {
      debugLog('🚀 Processando fonte:', source.name);
      
      // Ativar loading para esta fonte específica
      setSourceProcessingStates(prev => ({ ...prev, [source.id]: true }));
      
      // Contabilizar execuções desta fonte - usar um contador separado dos timestamps
      const executionKey = `${source.id}_executions`;
      const currentExecutions = parseInt(localStorage.getItem(executionKey)) || 0;
      const offset = Math.max(0, currentExecutions * 10); // 10 artigos por execução, garantir que seja >= 0
      
      debugLog(`📊 Execução ${currentExecutions + 1} da fonte ${source.name} (offset: ${offset})`);
      
      toast.info(`Carregando artigos da fonte... (${currentExecutions > 0 ? 'Buscando mais artigos' : 'Buscando artigos mais recentes'})`);
      
      // Fazer requisição com timeout aumentado para produção
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos para fontes RSS
      
      try {
        // Fazer requisição com offset para buscar próximos 10 artigos (ordenados por mais recente primeiro)
        const response = await newsApi.sources.process(source.id, {
          limit: 10,
          offset: offset,
          order: 'desc', // Mais recentes primeiro
          sort_by: 'published_date' // Ordenar por data de publicação
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout na busca de artigos. O feed RSS pode estar lento ou indisponível.');
        }
        throw fetchError;
      }
      
      if (response.data.success) {
        const articlesCreated = response.data.articles_created || 0;
        const articlesExisting = response.data.articles_existing || 0;
        const articlesProcessed = response.data.articles_processed || 0;
        const validation = response.data.validation;
        
        // Atualizar contador de execuções no localStorage
        const executionKey = `${source.id}_executions`;
        const newExecutionCount = currentExecutions + 1;
        localStorage.setItem(executionKey, newExecutionCount.toString());
        
        // Verificar status de validação
        if (validation && validation.status === 'warning') {
          toast.warning(`⚠️ ${validation.message}`, { duration: 6000 });
        }
        
        if (articlesCreated === 0 && articlesExisting === 0) {
          toast.info(`📰 Nenhum artigo novo encontrado na fonte "${source.name}". Todos os artigos disponíveis já foram carregados.`);
        } else if (articlesCreated === 0 && articlesExisting > 0) {
          toast.success(`✅ ${articlesProcessed} artigos já existentes revinculados à fonte "${source.name}".`);
        } else if (articlesExisting === 0) {
          toast.success(`✅ ${articlesCreated} novos artigos carregados da fonte "${source.name}"!`);
        } else {
          toast.success(`✅ ${articlesProcessed} artigos carregados da fonte "${source.name}" (${articlesCreated} novos + ${articlesExisting} existentes).`);
        }
        
        // Forçar recarregamento dos artigos desta fonte para mostrar novos artigos
        await forceReloadSourceArticles(source.id);
        
        // Atualizar dados gerais
        await loadSources();
        await loadArticles();
      } else {
        // Tratar erro com informações de validação
        const validation = response.data.validation;
        
        if (validation && validation.status === 'invalid') {
          // Criar mensagem detalhada para fonte inválida
          let detailMessage = validation.message;
          
          if (validation.suggestions && validation.suggestions.length > 0) {
            detailMessage += '\n\n📝 Orientações:';
            validation.suggestions.forEach((suggestion, index) => {
              detailMessage += `\n${index + 1}. ${suggestion}`;
            });
          }
          
          // Usar modal ou toast longo para mostrar todas as informações
          toast.error(
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                ❌ Fonte Inválida: {source.name}
              </div>
              <div style={{ marginBottom: '8px' }}>
                {validation.message}
              </div>
              {validation.suggestions && validation.suggestions.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📝 Orientações:</div>
                  <ul style={{ margin: '0', paddingLeft: '16px' }}>
                    {validation.suggestions.map((suggestion, index) => (
                      <li key={index} style={{ marginBottom: '2px' }}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>,
            { 
              duration: 10000, // 10 segundos para ler
              style: { maxWidth: '500px', whiteSpace: 'pre-line' }
            }
          );
        } else {
          throw new Error(response.data.error || 'Erro ao processar fonte');
        }
      }
      
    } catch (error) {
      debugError('❌ Erro ao processar fonte:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao processar fonte';
      toast.error(`❌ Erro: ${errorMessage}`);
    } finally {
      // Desativar loading state independentemente do resultado
      setSourceProcessingStates(prev => ({ 
        ...prev, 
        [source.id]: false 
      }));
    }
  };

  // Função para alternar expansão da lista de artigos
  const toggleSourceExpansion = (sourceId) => {
    setExpandedSources(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const toggleMonitoringExpansion = (monitoringId) => {
    setExpandedMonitoring(prev => ({
      ...prev,
      [monitoringId]: !prev[monitoringId]
    }));
  };

  // Função para forçar recarregamento de artigos de uma fonte
  const forceReloadSourceArticles = async (sourceId) => {
    debugLog('🔄 Forçando reload da fonte:', sourceId);
    
    // Limpar artigos existentes da fonte
    setSourceArticles(prev => ({
      ...prev,
      [sourceId]: []
    }));
    
    // Recarregar artigos forçadamente do backend
    await loadSourceArticles(sourceId, true);
  };

  // Função para abrir URL da fonte
  const handleOpenUrl = (source) => {
    try {
      window.open(source.url, '_blank', 'noopener,noreferrer');
      debugLog('🔗 Abrindo URL:', source.url);
    } catch (error) {
      debugError('❌ Erro ao abrir URL:', error);
      toast.error('Erro ao abrir URL da fonte');
    }
  };

  // Função para resetar contador de execuções de uma fonte
  const handleResetSourceCounter = (source) => {
    const executionKey = `${source.id}_executions`;
    localStorage.removeItem(executionKey);
    debugLog(`🔄 Contador resetado para fonte ${source.name}`);
    toast.success(`Contador de execuções resetado para "${source.name}"`);
    
    // Forçar re-render do botão
    forceUpdate();
  };

  // Função para editar fonte
  const handleEditSource = (source) => {
    debugLog('✏️ Abrindo edição da fonte:', source.name);
    debugLog('📋 Dados da fonte:', {
      id: source.id,
      name: source.name,
      url: source.url,
      target_site_id: source.target_site_id,
      target_site_id_type: typeof source.target_site_id,
      default_author_id: source.default_author_id,
      default_categories: source.default_categories,
      default_tags: source.default_tags
    });
    
    debugLog('🏢 Sites disponíveis para comparação:', userSites.map(s => ({
      id: s.id,
      id_type: typeof s.id,
      nome: s.nome
    })));
    
    setEditingSource(source);
    setNewSource({
      name: source.name,
      url: source.url,
      target_site_id: source.target_site_id ? String(source.target_site_id) : '',
      default_author_id: source.default_author_id || '',
      default_categories: source.default_categories || [],
      default_tags: source.default_tags || []
    });
    
    // Carregar dados WordPress se um site estiver selecionado
    if (source.target_site_id) {
      debugLog('🔄 Carregando dados WordPress para site ID:', source.target_site_id);
      loadWordPressData(source.target_site_id);
    }
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!newSource.name || !newSource.url || !newSource.target_site_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoading(true);
      
      debugLog('💾 Salvando edição da fonte com configurações WordPress:', editingSource.id, newSource);
      
      const sourceData = {
        name: newSource.name.trim(),
        url: newSource.url.trim(),
        target_site_id: parseInt(newSource.target_site_id), // Garantir que seja número
        active: true,
        // Incluir configurações WordPress padrão
        default_author_id: newSource.default_author_id ? parseInt(newSource.default_author_id) : null,
        default_categories: newSource.default_categories.map(id => parseInt(id)),
        default_tags: newSource.default_tags
      };
      
      const response = await newsApi.sources.update(editingSource.id, sourceData);
      
      debugLog('📤 Dados enviados para salvar:', sourceData);
      debugLog('📥 Resposta da API:', response.data);
      
      if (response.data.success) {
        debugLog('✅ Fonte atualizada com sucesso');
        
        // Recarregar a lista para sincronizar os dados
        await loadSources(); 
        
        // Limpar estado WordPress
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        
        setEditingSource(null);
        
        toast.success(`Fonte "${newSource.name}" atualizada com sucesso! As configurações WordPress foram salvas.`);
        
        // Limpar formulário
        setNewSource({ 
          name: '', 
          url: '', 
          target_site_id: '',
          default_author_id: '',
          default_categories: [],
          default_tags: []
        });
        
        // Limpar dados WordPress
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        
        toast.success('Fonte atualizada com sucesso!');
      } else {
        throw new Error(response.data.message || 'Erro ao atualizar fonte');
      }
    } catch (error) {
      debugError('❌ Erro ao atualizar fonte:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao atualizar fonte';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditingSource(null);
    setNewSource({ 
      name: '', 
      url: '', 
      target_site_id: '',
      default_author_id: '',
      default_categories: [],
      default_tags: []
    });
    
    // Limpar dados WordPress
    setWordpressData({
      categories: [],
      authors: [],
      tags: []
    });
  };

  // Função para excluir fonte
  const handleDeleteSource = async (source) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a fonte "${source.name}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      setIsLoading(true);
      
      debugLog('🗑️ Excluindo fonte:', source.name);
      
      const response = await newsApi.sources.delete(source.id);
      
      if (response.data.success) {
        await loadSources(); // Recarregar a lista
        toast.success(`Fonte "${source.name}" excluída com sucesso`);
      } else {
        throw new Error(response.data.message || 'Erro ao excluir fonte');
      }
    } catch (error) {
      debugError('❌ Erro ao excluir fonte:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao excluir fonte';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para alternar status da fonte
  const handleToggleSource = async (source) => {
    try {
      setIsLoading(true);
      
      debugLog(`🔄 Alternando status da fonte: ${source.name}`);
      
      const response = await newsApi.sources.toggle(source.id);
      
      if (response.data.success) {
        await loadSources(); // Recarregar a lista
        const newStatus = response.data.data.active ? 'ativada' : 'desativada';
        toast.success(`Fonte "${source.name}" ${newStatus} com sucesso`);
      } else {
        throw new Error(response.data.message || 'Erro ao alterar status da fonte');
      }
    } catch (error) {
      debugError('❌ Erro ao alterar status da fonte:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao alterar status da fonte';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para excluir monitoramento
  const handleDeleteMonitoring = async (monitoring) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir este monitoramento?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      setIsLoading(true);
      
      debugLog('🗑️ Excluindo monitoramento:', monitoring.id);
      
      const response = await newsApi.monitoring.delete(monitoring.id);
      
      if (response.data.success) {
        await loadMonitoring(); // Recarregar a lista
        toast.success('Monitoramento excluído com sucesso');
      } else {
        throw new Error(response.data.message || 'Erro ao excluir monitoramento');
      }
    } catch (error) {
      debugError('❌ Erro ao excluir monitoramento:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao excluir monitoramento';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para alternar status do monitoramento
  const handleToggleMonitoring = async (monitoring) => {
    try {
      setIsLoading(true);
      
      debugLog(`🔄 Alternando status do monitoramento: ${monitoring.id}`);
      
      const response = await newsApi.monitoring.toggle(monitoring.id);
      
      if (response.data.success) {
        await loadMonitoring(); // Recarregar a lista
        const newStatus = response.data.data.active ? 'ativado' : 'desativado';
        toast.success(`Monitoramento ${newStatus} com sucesso`);
      } else {
        throw new Error(response.data.message || 'Erro ao alterar status do monitoramento');
      }
    } catch (error) {
      debugError('❌ Erro ao alterar status do monitoramento:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao alterar status do monitoramento';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextRun = (frequency) => {
    const now = new Date();
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    }
  };

  const formatFrequency = (freq) => {
    const frequencies = {
      'hourly': 'A cada hora',
      'daily': 'Diariamente',
      'weekly': 'Semanalmente'
    };
    return frequencies[freq] || freq;
  };

  const formatFrequencyFromMinutes = (minutes) => {
    if (minutes <= 60) return 'A cada hora';
    if (minutes <= 1440) return 'Diariamente';
    if (minutes <= 10080) return 'Semanalmente';
    return `A cada ${Math.floor(minutes / 1440)} dias`;
  };

  // Função para calcular próxima execução
  const calculateNextExecution = (monitor) => {
    if (!monitor.active) {
      return 'Pausado';
    }
    
    const intervalMinutes = monitor.check_interval_minutes || 60;
    const lastCheck = monitor.last_check_at ? new Date(monitor.last_check_at) : new Date();
    const nextExecution = new Date(lastCheck.getTime() + (intervalMinutes * 60 * 1000));
    
    // Se a próxima execução já passou, significa que deve executar agora
    const now = new Date();
    if (nextExecution <= now) {
      return 'Pronto para executar';
    }
    
    return nextExecution.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para executar monitoramento manualmente
  const handleExecuteMonitoring = async (monitoring) => {
    try {
      // Adicionar este ID ao conjunto de IDs carregando
      setLoadingMonitoringIds(prev => new Set(prev).add(monitoring.id));
      
      debugLog(`🚀 Executando automação ID ${monitoring.id} manualmente: ${monitoring.news_source?.name}`);
      debugLog('⚙️ Configurações da automação:', {
        rewrite_content: monitoring.rewrite_content,
        auto_publish: monitoring.auto_publish,
        articles_count: monitoring.settings?.articles_count || 5
      });
      
      // 1. PROCESSAR FONTE PARA OBTER NOVOS ARTIGOS
      toast.info(`🔄 Processando fonte "${monitoring.news_source?.name}"...`);
      
      const sourceResponse = await newsApi.sources.process(monitoring.news_source_id, {
        articles_count: monitoring.settings?.articles_count || 5
      });
      
      if (!sourceResponse.data.success) {
        throw new Error('Erro ao processar fonte');
      }
      
      let processedArticles = sourceResponse.data.articles || [];
      debugLog(`📰 ${processedArticles.length} artigos obtidos da fonte`);
      
      // GARANTIR LIMITE CONFIGURADO PELO USUÁRIO
      const maxArticles = monitoring.settings?.articles_count || 5;
      if (processedArticles.length > maxArticles) {
        debugLog(`⚠️ API retornou ${processedArticles.length} artigos, mas limite é ${maxArticles}. Limitando...`);
        processedArticles = processedArticles.slice(0, maxArticles);
        debugLog(`✅ Limitado para ${processedArticles.length} artigos conforme configuração`);
      }
      
      if (processedArticles.length === 0) {
        toast.info(`Nenhum artigo novo encontrado em "${monitoring.news_source?.name}"`);
        return;
      }
      
      // 2. REESCREVER ARTIGOS SE CONFIGURADO
      if (monitoring.rewrite_content !== false) {
        // Verificar créditos antes de iniciar
        const totalCreditsNeeded = processedArticles.length;
        const creditsCheck = await databaseService.checkCredits(userData.id, 'articles', totalCreditsNeeded);
        
        if (!creditsCheck.hasCredits) {
          toast.error(`Créditos insuficientes! Necessários: ${totalCreditsNeeded}, Disponíveis: ${creditsCheck.currentCredits || 0}`);
          return;
        }
        
        toast.info(`🤖 Reescrevendo ${processedArticles.length} artigos com IA...`);
        
        // Reescrever artigos sequencialmente (1 por vez)
        for (let i = 0; i < processedArticles.length; i++) {
          const article = processedArticles[i];
          
          try {
            toast.info(`📝 Reescrevendo artigo ${i + 1}/${processedArticles.length}: "${article.title}"`);
            debugLog(`🤖 Reescrevendo artigo ${article.id}: ${article.title}`);
            
            // Usar a mesma lógica de reescrita da aba Fontes
            const rewriteOptions = {
              style: 'comprehensive',
              min_words: 1000,
              tone: 'engaging',
              depth: 'detailed',
              expand_content: true,
              add_context: true,
              improve_readability: true,
              add_examples: true,
              preserve_image: true,
              natural_writing: true,
              enhance_title: true,
              investigative_tone: true,
              no_subtitles: true,
              fluid_narrative: true,
              conversational_flow: true
            };
            
            const rewriteResponse = await newsApi.articles.rewrite(article.id, rewriteOptions);
            
            if (rewriteResponse.data.success) {
              // ✅ CRÉDITO JÁ CONSUMIDO PELO BACKEND DO ENDPOINT REWRITE
              debugLog(`✅ Artigo ${i + 1} reescrito - crédito consumido pelo backend`);
              
              // Atualizar artigo local
              const updatedArticle = rewriteResponse.data.data;
              
              // 3. PUBLICAR AUTOMATICAMENTE SE CONFIGURADO
              if (monitoring.auto_publish && updatedArticle) {
                try {
                  toast.info(`🚀 Publicando automaticamente: "${updatedArticle.title}"`);
                  debugLog(`� Publicando artigo automaticamente no site ${monitoring.site_id}`);
                  
                  // Buscar site para validar
                  const targetSite = userSites.find(s => s.id === monitoring.site_id);
                  if (!targetSite) {
                    debugWarn(`⚠️ Site de destino não encontrado: ${monitoring.site_id}`);
                    continue; // Pular para próximo artigo
                  }
                  
                  const publishData = {
                    site_id: monitoring.site_id,
                    author_id: monitoring.author_id || monitoring.target_author_id || monitoring.default_author_id,
                    categories: monitoring.categories || monitoring.default_categories || [],
                    tags: monitoring.tags || monitoring.default_tags || []
                  };
                  
                  debugLog('📋 Dados de publicação:', publishData);
                  
                  const publishResponse = await newsApi.articles.publish(updatedArticle.id, publishData);
                  
                  if (publishResponse.data.success) {
                    debugLog(`✅ Artigo ${i + 1} publicado automaticamente`);
                  } else {
                    debugWarn(`⚠️ Falha na publicação automática do artigo ${i + 1}`);
                  }
                } catch (publishError) {
                  debugError(`❌ Erro na publicação automática:`, publishError);
                }
              }
              
            } else {
              debugWarn(`⚠️ Falha ao reescrever artigo ${i + 1}: ${article.title}`);
            }
            
          } catch (articleError) {
            debugError(`❌ Erro ao processar artigo ${i + 1}:`, articleError);
          }
        }
        
        toast.success(`✅ Automação concluída! ${processedArticles.length} artigos processados${monitoring.auto_publish ? ' e publicados' : ''}`);
        
        // ✅ REMOVIDO: REFRESH DUPLICADO DE CRÉDITOS NO BIA NEWS
        // O backend já consome os créditos automaticamente durante as reescritas
        // Não precisamos fazer refresh manual que causa consumo duplicado
        if (processedArticles.length > 0) {
          debugLog(`✅ ${processedArticles.length} reescritas concluídas - créditos já debitados pelo backend automaticamente`);
        }
      } else {
        // Se não reescrever, apenas processar
        toast.success(`✅ ${processedArticles.length} artigos processados (sem reescrita)`);
      }
      
      // 4. RECARREGAR DADOS PARA ATUALIZAR INTERFACE
      debugLog('🔄 Recarregando dados após execução da automação...');
      
      // ✅ OTIMIZAÇÃO: Recarregar apenas uma vez para manter o usuário na página
      await Promise.all([
        loadMonitoring(), // Recarregar automações e contadores
        loadArticles(),   // Recarregar lista global de artigos
        monitoring.news_source_id ? loadSourceArticles(monitoring.news_source_id) : Promise.resolve()
      ]);
      
      // ✅ MANTÉM USUÁRIO NA PÁGINA - removido refresh desnecessário
      debugLog('✅ Execução de automação concluída - permanecendo na mesma página do BIA News');
      
    } catch (error) {
      debugError('❌ Erro ao executar automação:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao executar automação';
      toast.error(`Erro na automação "${monitoring.news_source?.name}": ${errorMessage}`);
    } finally {
      // Remover este ID do conjunto de IDs carregando
      setLoadingMonitoringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitoring.id);
        return newSet;
      });
    }
  };

  // Função para editar monitoramento
  const handleEditMonitoring = (monitoring) => {
    debugLog('✏️ Editando monitoramento:', monitoring.id);
    
    // Definir que está editando
    setEditingMonitoring(monitoring);
    
    // Preencher o formulário com os dados do monitoramento
    setNewMonitoring({
      source_id: monitoring.news_source_id.toString(),
      site_id: monitoring.site_id.toString(),
      frequency: monitoring.check_interval_minutes <= 60 ? 'hourly' : 
                monitoring.check_interval_minutes <= 1440 ? 'daily' : 'weekly',
      articles_count: monitoring.settings?.articles_count || 5,
      active: monitoring.active,
      rewrite_content: monitoring.rewrite_content,
      auto_publish: monitoring.auto_publish,
      target_category: monitoring.target_category || '',
      author_id: '',
      categories: [],
      tags: []
    });
    
    // Carregar dados do WordPress para o site
    loadWordPressData(monitoring.site_id);
    
    // Mostrar o formulário de edição
    setShowAddMonitoring(true);
    
    toast.info('Formulário carregado para edição');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      'inactive': { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      'error': { color: 'bg-red-100 text-red-800', label: 'Erro' },
      'processing': { color: 'bg-blue-100 text-blue-800', label: 'Processando' },
      'published': { color: 'bg-green-100 text-green-800', label: 'Publicado' },
      'failed': { color: 'bg-red-100 text-red-800', label: 'Falhou' }
    };
    
    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={`${statusInfo.color} border-0`}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Funções para ações de artigos
  // Função para melhorar o conteúdo com SEO
  const enhanceSEOContent = (content, title) => {
    let enhancedContent = content || '';
    
    // Se o conteúdo não tem tags HTML, converter texto simples para HTML
    if (!enhancedContent.includes('<p>') && !enhancedContent.includes('<h2>') && !enhancedContent.includes('<h3>')) {
      // Converter quebras de linha para parágrafos
      enhancedContent = enhancedContent.split('\n\n').map(paragraph => {
        if (paragraph.trim()) {
          return `<p>${paragraph.trim()}</p>`;
        }
        return '';
      }).join('\n');
    }
    
    // Se já está em HTML mas não tem estrutura de títulos, melhorar
    if (enhancedContent.includes('<p>') && !enhancedContent.includes('<h2>') && !enhancedContent.includes('<h3>')) {
      const paragraphs = enhancedContent.split('</p>');
      if (paragraphs.length > 3) {
        paragraphs[Math.floor(paragraphs.length / 3)] += '<h2>Principais Pontos</h2><p>';
        paragraphs[Math.floor(2 * paragraphs.length / 3)] += '<h3>Detalhes Importantes</h3><p>';
      }
      enhancedContent = paragraphs.join('</p>');
    }
    
    // Adicionar FAQ básico se for um artigo longo (apenas se não for conteúdo reescrito premium)
    if (enhancedContent.length > 1000 && !enhancedContent.includes('html_formatted')) {
      enhancedContent += `
      <h2>Perguntas Frequentes</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>O que você precisa saber sobre: ${title}</h3>
        <p>Este artigo aborda os principais aspectos relacionados ao tema, fornecendo informações atualizadas e confiáveis.</p>
      </div>
      `;
    }
    
    // Adicionar conclusão se não existir (apenas se necessário)
    if (!enhancedContent.toLowerCase().includes('conclusão') && !enhancedContent.toLowerCase().includes('resumo') && !enhancedContent.includes('html_formatted')) {
      enhancedContent += `
      <h2>Conclusão</h2>
      <p>As informações apresentadas neste artigo oferecem uma visão abrangente sobre o tema. Para mais detalhes, consulte as fontes originais e mantenha-se atualizado com as últimas novidades.</p>
      `;
    }
    
    return enhancedContent;
  };

  const handleViewArticle = (article) => {
    debugLog('👀 Visualizando artigo:', article.id);
    
    // Abrir em nova aba com formatação SEO
    const articleWindow = window.open('', '_blank');
    
    // Obter conteúdo do artigo (reescrito ou original)
    const title = article.title || article.original_title || 'Artigo';
    const content = article.rewritten_content || article.content || article.original_content || '';
    const featuredImage = article.image_url || 
                          article.featured_image_url || 
                          article.metadata?.image_url ||
                          article.metadata?.featured_image ||
                          '';
    const excerpt = article.excerpt || '';
    
    // Processar o conteúdo com melhorias de SEO
    const enhancedContent = enhanceSEOContent(content, title);
    
    // Gerar HTML otimizado para SEO
    const seoHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | BIA News</title>
    <meta name="description" content="${excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160)}">
    <meta name="robots" content="index, follow">
    <meta name="author" content="BIA News">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${window.location.origin}/article/${article.id}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160)}">
    ${featuredImage ? `<meta property="og:image" content="${featuredImage}">` : ''}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${window.location.origin}/article/${article.id}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160)}">
    ${featuredImage ? `<meta property="twitter:image" content="${featuredImage}">` : ''}
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        
        .article-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        h1 {
            color: #2c3e50;
            font-size: 2.2em;
            margin-bottom: 20px;
            line-height: 1.3;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        .article-meta {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #3498db;
        }
        
        .featured-image {
            width: 100%;
            height: auto;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .article-content {
            font-size: 1.1em;
            line-height: 1.8;
            text-align: justify;
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 10px;
            word-wrap: break-word;
            white-space: normal;
        }
        
        .article-content p {
            margin-bottom: 20px;
            text-align: justify;
        }
        
        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4,
        .article-content h5,
        .article-content h6 {
            margin-top: 25px;
            margin-bottom: 15px;
            color: #2c3e50;
            line-height: 1.3;
        }
        
        .article-content strong,
        .article-content b {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .article-content em,
        .article-content i {
            font-style: italic;
        }
        
        .article-content blockquote {
            border-left: 4px solid #3498db;
            padding: 15px 20px;
            margin: 20px 0;
            background: #f8f9fa;
            font-style: italic;
        }
        
        .article-content ul,
        .article-content ol {
            margin: 15px 0 15px 25px;
            padding-left: 0;
        }
        
        .article-content li {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            margin: 15px 0;
        }
        
        .image-credit {
            font-size: 0.8em;
            color: #666;
            font-style: italic;
            margin-top: 5px;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 5px;
        }
        
        .seo-content {
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .seo-content h1 {
            color: #2c3e50;
            font-size: 1.8em;
            margin-top: 30px;
            margin-bottom: 20px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        .seo-content h2 {
            color: #2c3e50;
            font-size: 1.5em;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        
        .seo-content h3 {
            color: #34495e;
            font-size: 1.3em;
            margin-top: 25px;
            margin-bottom: 12px;
        }
        
        .seo-content h4 {
            color: #34495e;
            font-size: 1.2em;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        .seo-content h5,
        .seo-content h6 {
            color: #34495e;
            font-size: 1.1em;
            margin-top: 18px;
            margin-bottom: 8px;
        }
        
        .seo-content ul, .seo-content ol {
            margin-left: 20px;
            margin-bottom: 20px;
        }
        
        .seo-content li {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        .seo-content strong {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .seo-content em {
            font-style: italic;
        }
        
        .seo-content a {
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.3s;
        }
        
        .seo-content a:hover {
            border-bottom-color: #3498db;
        }
        
        .source-info {
            margin-top: 40px;
            padding: 20px;
            background: #e8f4f8;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .btn-action {
            display: inline-block;
            padding: 12px 24px;
            margin: 10px 5px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn-publish {
            background: #27ae60;
            color: white;
        }
        
        .btn-publish:hover {
            background: #229954;
            transform: translateY(-2px);
        }
        
        .btn-schedule {
            background: #f39c12;
            color: white;
        }
        
        .btn-schedule:hover {
            background: #e67e22;
            transform: translateY(-2px);
        }
        
        .btn-close {
            background: #e74c3c;
            color: white;
        }
        
        .btn-close:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }
        
        .actions-container {
            text-align: center;
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #eee;
        }
        
        @media (max-width: 768px) {
            .article-container {
                padding: 20px;
            }
            
            h1 {
                font-size: 1.8em;
            }
            
            .btn-action {
                display: block;
                width: 100%;
                margin: 10px 0;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="article-container">
        <h1>${title}</h1>
        
        <div class="article-meta">
            <strong>📰 Fonte:</strong> ${article.metadata?.source_name || article.news_monitoring?.news_source?.name || sources.find(s => s.id == article.news_source_id)?.name || 'Fonte não identificada'}<br>
            <strong>🌐 Site:</strong> ${(() => {
              // Priorizar site WordPress conectado (destino da publicação)
              const connectedSite = article.news_monitoring?.site?.nome || 
                                   article.metadata?.wordpress_site ||
                                   sources.find(s => s.id == article.news_source_id)?.target_site?.nome;
              return connectedSite || 'Nenhum site WordPress conectado';
            })()}<br>
            <strong>📅 Processado em:</strong> ${new Date(article.created_at).toLocaleString('pt-BR')}<br>
            <strong>🔗 URL Original:</strong> <a href="${article.original_url}" target="_blank">${article.original_url}</a><br>
            <strong>🤖 Reescrito com IA:</strong> ${article.rewritten_content ? '✅ Sim' : '❌ Não'}
        </div>
        
        ${featuredImage ? `
            <div>
                <img src="${featuredImage}" alt="${title}" class="featured-image">
                <div class="image-credit" style="text-align: center; font-size: 12px; color: #666; margin-top: 8px;">
                    Fonte: <a href="${article.original_url}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none;">${new URL(article.original_url).hostname}</a>
                </div>
            </div>
        ` : ''}
        
        <div class="article-content seo-content">
            ${enhancedContent}
        </div>
        
        <div class="source-info">
            <strong>ℹ️ Informações do Processamento:</strong><br>
            • Artigo processado automaticamente pelo sistema BIA News<br>
            • ${article.rewritten_content ? 'Conteúdo reescrito com inteligência artificial' : 'Conteúdo original preservado'}<br>
            • Status: ${article.status === 'processed' ? '✅ Processado' : '⏳ Pendente'}
        </div>
        
        <div class="actions-container">
            <h3>Ações do Artigo</h3>
            <button class="btn-action btn-publish" onclick="publishArticle(${article.id})">
                🚀 Publicar no WordPress
            </button>
            <button class="btn-action btn-schedule" onclick="scheduleArticle(${article.id})">
                📅 Agendar Publicação
            </button>
            <button class="btn-action btn-close" onclick="window.close()">
                ❌ Fechar
            </button>
        </div>
    </div>
    
    <script>
        function publishArticle(articleId) {
            if (confirm('Deseja publicar este artigo no WordPress?')) {
                // Comunicar com a janela pai
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        action: 'publishArticle',
                        articleId: articleId
                    }, '*');
                    
                    alert('Solicitação enviada! Verifique a janela principal.');
                } else {
                    alert('Janela principal não encontrada. Publique pela interface principal.');
                }
            }
        }
        
        function scheduleArticle(articleId) {
            if (confirm('Deseja agendar este artigo?')) {
                // Comunicar com a janela pai
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        action: 'scheduleArticle',
                        articleId: articleId
                    }, '*');
                    
                    alert('Solicitação enviada! Verifique a janela principal.');
                } else {
                    alert('Janela principal não encontrada. Agende pela interface principal.');
                }
            }
        }
    </script>
</body>
</html>`;
    
    articleWindow.document.write(seoHtml);
    articleWindow.document.close();
  };

  const handleScheduleArticle = async (article) => {
    try {
      debugLog('📅 Agendando artigo:', article.id);
      debugLog('🔍 Dados do artigo:', article);
      
      // Buscar site WordPress com lógica melhorada
      let site = null;
      
      // Método 1: Através do monitoramento
      if (article.news_monitoring?.site) {
        site = article.news_monitoring.site;
        debugLog('🌐 Site encontrado via monitoramento:', site);
      }
      
      // Método 2: Através da fonte
      if (!site && article.news_source_id) {
        const articleSource = sources.find(s => s.id === article.news_source_id);
        if (articleSource?.target_site_id) {
          site = userSites.find(s => s.id === parseInt(articleSource.target_site_id));
          debugLog('🌐 Site encontrado via fonte:', site);
        }
      }
      
      // Método 3: Através do site_id direto do artigo
      if (!site && article.site_id) {
        site = userSites.find(s => s.id === article.site_id);
        debugLog('🌐 Site encontrado via site_id:', site);
      }
      
      if (!site) {
        debugError('❌ Site não encontrado. Debug:', {
          article,
          sources,
          userSites
        });
        toast.error('Site WordPress não identificado para este artigo. Verifique se a fonte foi configurada corretamente.');
        return;
      }

      debugLog('🌐 Site WordPress selecionado:', site.nome, site.id);
      
      // Verificar se o site tem configuração WordPress
      if (!site.wordpress_url && !site.wordpressUrl) {
        toast.error(`Site "${site.nome}" não possui configuração WordPress. Configure as credenciais WordPress primeiro.`);
        return;
      }

      // Solicitar data/hora para agendamento
      const scheduleDate = prompt('Digite a data e hora para publicação (DD/MM/AAAA HH:MM):');
      if (!scheduleDate) return;

      // Validar formato da data
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/;
      const match = scheduleDate.match(dateRegex);
      
      if (!match) {
        toast.error('Formato de data inválido. Use: DD/MM/AAAA HH:MM');
        return;
      }

      const [, day, month, year, hour, minute] = match;
      const scheduledDate = new Date(year, month - 1, day, hour, minute);
      
      if (scheduledDate <= new Date()) {
        toast.error('A data deve ser no futuro');
        return;
      }

      toast.info('Agendando artigo...');
      
      // Chamar API para agendar
      const response = await newsApi.articles.schedule(article.id, {
        scheduled_date: scheduledDate.toISOString(),
        site_id: site.id
      });
      
      if (response.data.success) {
        toast.success(`Artigo agendado para ${scheduleDate} no site "${site.nome}"`);
        await loadArticles(); // Recarregar artigos
      } else {
        toast.error(response.data.message || 'Erro ao agendar artigo');
      }
      
    } catch (error) {
      debugError('Erro ao agendar artigo:', error);
      toast.error(error.response?.data?.message || 'Erro ao agendar artigo');
    }
  };

  const handlePublishArticle = async (article) => {
    try {
      debugLog('🚀 Publicando artigo BIA News:', article.id);
      
      // 1. BUSCAR SITE VIA FONTE (sem prompts)
      let site = null;
      
      // Primeiro tentar pelo monitoramento
      if (article.news_monitoring?.site) {
        site = article.news_monitoring.site;
        debugLog('✅ Site encontrado via monitoramento:', site.nome);
      } else {
        // Buscar site pela fonte vinculada
        const sourceForArticle = sources.find(s => {
          return s.id == article.news_source_id || 
                 s.id == article.metadata?.source_id ||
                 s.id == article.source_id;
        });
        
        if (sourceForArticle && sourceForArticle.target_site_id) {
          // Buscar o site real nos sites do usuário
          const targetSite = state.sites?.find(s => s.id == sourceForArticle.target_site_id);
          
          if (targetSite) {
            site = targetSite;
            debugLog('✅ Site encontrado via fonte vinculada:', site.nome);
          } else {
            debugError('❌ Site vinculado à fonte não encontrado nos sites do usuário');
            toast.error('Site vinculado à fonte não encontrado. Verifique a configuração da fonte.');
            return;
          }
        } else {
          
          // Se há apenas um site disponível, usar ele automaticamente
          if (state.sites?.length === 1) {
            debugLog('🔧 Auto-corrigindo: usando o único site disponível');
            site = state.sites[0];
            toast.warning(`Usando automaticamente o site "${site.nome}" para esta publicação. Recomendamos editar a fonte para configurar um site padrão.`);
          } else {
            toast.error('Esta fonte não tem um site de destino configurado. Edite a fonte e configure um site WordPress.');
            return;
          }
        }
      }
      
      if (!site) {
        toast.error('Site WordPress não identificado. Configure um site de destino na fonte.');
        return;
      }

      // 2. VALIDAR CONFIGURAÇÃO WORDPRESS (igual ao ProduzirArtigos)
      if (!site.wordpressUrl || !site.wordpressUsername || !site.wordpressPassword) {
        debugError(`❌ WordPress não configurado para site ${site.nome}`);
        toast.error(`WordPress não configurado para o site "${site.nome}". Configure na seção Meus Sites.`);
        return;
      }

      // 3. CONFIRMAR PUBLICAÇÃO
      const confirmed = confirm(`Publicar artigo "${article.title}" no site "${site.nome}"?`);
      if (!confirmed) return;

      toast.info('Publicando no WordPress...');

      // 4. USAR A MESMA LÓGICA DE PUBLICAÇÃO DO PRODUZIR ARTIGOS
      const getApiUrl = () => {
        if (typeof window !== 'undefined') {
          return window.location.hostname === 'localhost' 
            ? 'http://localhost:8000/api'
            : 'https://bloginfinitoautomatico.com/api';
        }
        return 'https://bloginfinitoautomatico.com/api';
      };

      const publishUrl = `${getApiUrl()}/wordpress/publish-post`;
      
      const requestData = {
        siteData: {
          url: site.wordpressUrl.trim(),
          username: site.wordpressUsername.trim(),
          applicationPassword: site.wordpressPassword.trim()
        },
        postData: {
          title: article.title,
          content: article.rewritten_content || article.content || article.original_content,
          status: 'publish',
          categoryName: '', // BIA News não tem categoria específica
          tagNames: []      // BIA News não tem tags específicas
        },
        // Imagem destacada se disponível
        imageData: article.featured_image_url ? {
          url: article.featured_image_url,
          alt: article.title,
          title: article.title
        } : undefined
      };
      
      debugLog('📋 Dados de publicação preparados:', {
        url: requestData.siteData.url,
        title: requestData.postData.title,
        hasContent: !!requestData.postData.content,
        hasImageData: !!requestData.imageData
      });

      // 5. FAZER A REQUISIÇÃO (com timeout igual ao ProduzirArtigos)
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
        
        debugLog('📨 Resposta da publicação:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorText = await response.text();
            errorDetails = errorText;
            debugError('❌ Erro HTTP na publicação:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
          } catch (parseError) {
            debugError('❌ Não foi possível ler resposta de erro:', parseError);
            errorDetails = 'Resposta de erro não legível';
          }
          
          // Mensagens de erro específicas (igual ao ProduzirArtigos)
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
          debugLog('✅ Artigo BIA News publicado com sucesso:', publishResult);
          
          // 6. ATUALIZAR DADOS DO ARTIGO (usar a API do newsApi para BIA News)
          try {
            const updateResponse = await newsApi.articles.update(article.id, {
              status: 'published',
              published_at: new Date().toISOString(),
              published_url: publishResult.postUrl,
              wordpress_post_id: publishResult.postId?.toString()
            });
            
            if (updateResponse.data.success) {
              debugLog('✅ Artigo BIA News atualizado no backend com sucesso');
              
              toast.success(
                <div>
                  Artigo publicado com sucesso no WordPress! 🎉
                  <div>
                    <a href={publishResult.postUrl} target="_blank" rel="noopener noreferrer">
                      Ver no WordPress ↗
                    </a>
                  </div>
                </div>
              );
              
              // Recarregar artigos para refletir mudanças
              await loadArticles();
              
              // Atualizar também os artigos específicos da fonte
              const sourceId = article.news_source_id || article.metadata?.source_id;
              if (sourceId) {
                await forceReloadSourceArticles(sourceId);
              }
              
              // Atualizar estado local do artigo imediatamente
              const updatedArticleData = {
                ...article,
                status: 'published',
                published_at: new Date().toISOString(),
                published_url: publishResult.postUrl,
                wordpress_post_id: publishResult.postId?.toString()
              };
              
              // Atualizar nos arrays de artigos
              setArticles(prev => prev.map(a => a.id === article.id ? updatedArticleData : a));
              
              // Atualizar nos artigos por fonte
              setSourceArticles(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(sId => {
                  updated[sId] = updated[sId].map(a => 
                    a.id === article.id ? updatedArticleData : a
                  );
                });
                return updated;
              });
              
            } else {
              debugWarn('⚠️ Erro ao atualizar artigo no backend:', updateResponse.data.message);
              toast.success(`Artigo publicado no WordPress, mas houve erro ao atualizar status local.`);
            }
          } catch (backendError) {
            debugWarn('⚠️ Erro na comunicação com backend BIA News:', backendError);
            toast.success(`Artigo publicado no WordPress! Verifique no seu site.`);
          }
          
        } else {
          debugError('❌ Falha na publicação BIA News:', publishResult);
          throw new Error(publishResult.error || 'Falha na publicação WordPress');
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      debugError(`❌ Erro na publicação do artigo BIA News ${article.id}:`, error);
      
      let errorMessage = 'Erro na publicação WordPress';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout na publicação. O WordPress pode estar lento ou indisponível.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Erro de conectividade. Verifique sua conexão e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`Erro na publicação: ${errorMessage}`);
    }
  };

  const handleDeleteArticle = async (article) => {
    if (!confirm(`Deseja realmente excluir o artigo "${article.title}"? Ele será movido para o histórico.`)) {
      return;
    }

    try {
      debugLog('🗑️ Excluindo artigo:', article.id);
      
      // Atualizar status para excluído (histórico)
      await newsApi.articles.update(article.id, { status: 'deleted' });
      
      toast.success('Artigo movido para o histórico!');
      await loadArticles(); // Recarregar artigos
    } catch (error) {
      debugError('Erro ao excluir artigo:', error);
      toast.error(error.response?.data?.message || 'Erro ao excluir artigo');
    }
  };

  const handleRewriteArticle = async (article) => {
    // 1. VERIFICAR CRÉDITOS ANTES DE PROSSEGUIR
    try {
      debugLog('💳 Verificando créditos disponíveis...');
      const creditsCheck = await databaseService.checkCredits(userData.id, 'articles', 1);
      
      if (!creditsCheck.hasCredits) {
        toast.error(`Você não tem créditos suficientes para reescrever artigos.\n\n📊 Créditos disponíveis: ${creditsCheck.currentCredits || 0}\n💡 Adquira mais créditos para continuar.`);
        return;
      }
      
      debugLog('✅ Créditos verificados - pode prosseguir com a reescrita');
    } catch (error) {
      debugError('❌ Erro ao verificar créditos:', error);
      toast.error('Erro ao verificar créditos. Tente novamente.');
      return;
    }

    // 2. CONFIRMAR COM O USUÁRIO
    if (!confirm(`Deseja reescrever "${article.title}" com qualidade jornalística premium?\n\n🏆 Criará um artigo investigativo de alto nível\n💳 Consome 1 crédito de artigo\n\n📊 Créditos disponíveis: ${userCredits.articles || 0}`)) {
      return;
    }

    // Adicionar o artigo aos que estão sendo reescritos
    setRewritingArticleIds(prev => new Set([...prev, article.id]));

    try {
      debugLog('🤖 Reescrevendo artigo com padrão jornalístico elite:', article.id);
      toast.info('� Gerando reportagem investigativa de alto nível... Aplicando padrões jornalísticos de elite (pode levar 2-3 minutos).');
      

      
      // Parâmetros para solicitar conteúdo mais denso e completo
      const rewriteOptions = {
        style: 'comprehensive', // Estilo abrangente
        min_words: 1000, // Mínimo de 1000 palavras
        tone: 'engaging', // Tom envolvente
        depth: 'detailed', // Análise detalhada
        expand_content: true, // Expandir conteúdo original
        add_context: true, // Adicionar contexto
        improve_readability: true, // Melhorar legibilidade
        add_examples: true, // Adicionar exemplos quando relevante
        preserve_image: true, // MANTER IMAGEM PRINCIPAL
        natural_writing: true, // Escrita natural
        enhance_title: true, // Melhorar título mantendo o tema original
        investigative_tone: true, // Tom investigativo profissional
        no_subtitles: true, // Proibir subtítulos estruturados
        fluid_narrative: true, // Narrativa fluida e orgânica
        conversational_flow: true, // Fluxo conversacional entre parágrafos
        prompt_instructions: `
          Você é um jornalista sênior de um grande jornal internacional. Sua missão é escrever uma reportagem completamente natural e fluida sobre este assunto.
          
          REGRAS ABSOLUTAS - SIGA RIGOROSAMENTE:
          
          1. PRESERVAR IMAGEM: Manter sempre a imagem principal do material original
          
          2. TÍTULO OTIMIZADO: 
          • Mantenha a MESMA IDEIA e TEMA CENTRAL do título original
          • Use palavras diferentes mas fale sobre o MESMO ASSUNTO
          • Exemplo: "Governo anuncia novo pacote fiscal" pode virar "Executivo revela medidas econômicas inéditas"
          • JAMAIS mude o tema principal ou crie títulos que soem como outro assunto
          
          3. TEXTO COMPLETAMENTE NATURAL: 
          • PROIBIDO usar subtítulos estruturados como "Raízes do Déficit", "Impactos Imediatos", "Análise Crítica", etc.
          • PROIBIDO dividir o texto em seções temáticas explícitas
          • PROIBIDO usar frases de transição como "Para entender...", "É essencial analisar...", "Historicamente..."
          • O texto deve fluir como uma conversa natural entre parágrafos
          
          4. COMO ESCREVER DE FORMA NATURAL:
          
          Comece direto com o fato mais impactante, como se estivesse contando uma história interessante para um amigo. Não anuncie o que vai falar.
          
          Continue escrevendo naturalmente, misturando:
          - Fatos principais
          - Contexto quando necessário (sem forçar)
          - Consequências possíveis
          - Informações relacionadas
          - Sua análise jornalística
          
          Cada parágrafo deve fluir naturalmente para o próximo, como em uma conversa. Use conectivos naturais e transições suaves.
          
          Termine de forma orgânica, com uma reflexão ou perspectiva sobre o futuro, mas sem soar forçado.
          
          5. EXEMPLO DE FLUXO NATURAL:
          Em vez de "Para entender as causas...", escreva algo como: "O problema começou quando..." ou "Três fatores convergiram para criar essa situação..."
          
          Em vez de subtítulos, continue o texto corrido com mudanças de assunto naturais.
          
          OBJETIVO: Escrever como se fosse um artigo do Financial Times ou The Economist - sofisticado, denso, mas completamente natural e fluido. O leitor não deve perceber nenhuma estrutura artificial.
          
          JAMAIS INCLUA: 
          - Comentários meta sobre o artigo
          - Análises sobre o processo de escrita  
          - Observações sobre metodologia
          - Frases como "Este texto mantém...", "O artigo ressalta...", "A narrativa desenvolve..."
          - Qualquer texto que não seja o próprio artigo jornalístico
          
          TERMINE O ARTIGO DE FORMA NATURAL: Simplesmente pare quando o conteúdo estiver completo. Não adicione conclusões sobre a escrita.
          
          Extensão mínima: 1000 palavras de alta qualidade jornalística.
        `
      };
      
      const response = await newsApi.articles.rewrite(article.id, rewriteOptions);
      
      if (response.data.success) {
        // ✅ CRÉDITO CONTROLADO PELO BACKEND
        // REMOVIDO: Consumo duplicado de crédito no frontend
        // O backend do endpoint rewrite deve ser responsável pelo consumo
        debugLog('✅ Artigo reescrito com sucesso - crédito gerenciado pelo backend');
        
        toast.success('� Reportagem investigativa criada com sucesso! Artigo com padrão jornalístico de elite gerado.');
        
        // Atualizar o artigo específico no estado com os novos dados
        const updatedArticle = response.data.data;
        if (updatedArticle) {
          setArticles(prevArticles => 
            prevArticles.map(a => 
              a.id === updatedArticle.id ? updatedArticle : a
            )
          );
          
          // Também atualizar nos artigos por fonte
          setSourceArticles(prev => {
            const newSourceArticles = { ...prev };
            Object.keys(newSourceArticles).forEach(sourceId => {
              newSourceArticles[sourceId] = newSourceArticles[sourceId].map(a => 
                a.id === updatedArticle.id ? updatedArticle : a
              );
            });
            return newSourceArticles;
          });
        }
        
        // ✅ OTIMIZAÇÃO: Estado local já atualizado - sem necessidade de recarregar
        // Mantém o usuário na mesma página e posição de scroll
        debugLog('✅ Estado local atualizado - evitando recarregamento desnecessário');
        
        // ✅ REMOVIDO: REFRESH DUPLICADO DE CRÉDITOS
        // O backend já consumiu o crédito automaticamente no endpoint rewrite
        // Não precisamos fazer refresh manual que causa consumo duplicado
        debugLog('✅ Crédito já foi debitado pelo backend - não fazendo refresh duplicado');
        
        // ✅ MANTÉM O USUÁRIO NA MESMA PÁGINA - SEM REFRESH
        // O estado local e contexto já foram atualizados automaticamente
        debugLog('✅ Reescrita concluída - permanecendo na mesma página do BIA News sem refresh duplicado');
        
      } else {
        toast.error(response.data.message || 'Erro ao reescrever artigo');
        
        // Se houve erro na reescrita, tentar devolver o crédito
        try {
          debugLog('🔄 Tentando devolver crédito devido ao erro...');
          await databaseService.restoreCredit(userData.id, 'articles', 1);
          toast.info('💳 Crédito devolvido devido ao erro na reescrita.');
        } catch (restoreError) {
          debugError('❌ Erro ao devolver crédito:', restoreError);
          toast.warn('⚠️ Não foi possível devolver o crédito automaticamente. Entre em contato com o suporte.');
        }
      }
    } catch (error) {
      debugError('Erro ao reescrever artigo:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao reescrever artigo';
      toast.error(`Erro na reescrita: ${errorMessage}`);
      
      // Se houve erro na reescrita, tentar devolver o crédito
      try {
        debugLog('🔄 Tentando devolver crédito devido ao erro...');
        await databaseService.restoreCredit(userData.id, 'articles', 1);
        toast.info('💳 Crédito devolvido devido ao erro na reescrita.');
      } catch (restoreError) {
        debugError('❌ Erro ao devolver crédito:', restoreError);
        toast.warn('⚠️ Não foi possível devolver o crédito automaticamente. Entre em contato com o suporte.');
      }
    } finally {
      // Remover o artigo da lista de reescrita em andamento
      setRewritingArticleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.id);
        return newSet;
      });
    }
  };

  const handleIgnoreArticle = async (article) => {
    if (!confirm(`Deseja ignorar o artigo "${article.title}"? Ele será movido para os excluídos.`)) {
      return;
    }

    try {
      debugLog('🚫 Ignorando artigo:', article.id);
      
      const response = await newsApi.articles.ignore(article.id);
      
      if (response.data.success) {
        toast.success('Artigo movido para excluídos!');
        await loadArticles(); // Recarregar artigos
        await loadSourceArticles(); // Atualizar artigos processados
        setActiveTab('deleted'); // Mudar para aba Excluídos
      } else {
        toast.error(response.data.message || 'Erro ao ignorar artigo');
      }
    } catch (error) {
      debugError('Erro ao ignorar artigo:', error);
      toast.error(error.response?.data?.message || 'Erro ao ignorar artigo');
    }
  };

  if (isLoading && sources.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Carregando BIA News...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">BIA News</h1>
            <p className="text-gray-600">Monitoramento automático de notícias com IA</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              title="Sincronizar com backend"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Sincronizar
            </button>
          </div>
        </div>
        
        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Rss size={20} style={{ color: '#8b5cf6' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Fontes Disponíveis</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{sources.length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    {sources.filter(s => s.status === 'active').length} ativas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Settings size={20} style={{ color: '#10b981' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Automações Ativas</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{monitoring.filter(m => m.active).length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    monitoramentos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} style={{ color: '#f97316' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Artigos Publicados</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{articles.filter(a => a.status === 'published').length}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    no total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Box de Créditos Disponíveis - Idêntico ao Dashboard */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <FileText size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Créditos Disponíveis</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{userCredits.articles}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    de {planLimits.articles} do seu plano
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert se não há sites WordPress */}
        {userSites.length === 0 && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa configurar pelo menos um site WordPress na seção <strong>"Meus Sites"</strong> antes de usar o BIA News.
              <br />
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('sites');
                  } else {
                    // Fallback se onNavigate não estiver disponível
                    window.location.hash = '#sites';
                  }
                }}
                className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
              >
                Configurar Sites WordPress →
              </button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabs de navegação */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sources' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Rss className="w-4 h-4 inline-block mr-2" />
            Fontes ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'monitoring' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Automações ({monitoring.length})
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'articles' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Newspaper className="w-4 h-4 inline-block mr-2" />
            Artigos ({articles.filter(a => a.status === 'processed').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Archive className="w-4 h-4 inline-block mr-2" />
            Histórico ({articles.filter(a => a.status === 'deleted').length})
          </button>
          <button
            onClick={() => setActiveTab('excluded')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'excluded' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <X className="w-4 h-4 inline-block mr-2" />
            Excluídos ({articles.filter(a => a.status === 'ignored').length})
          </button>
        </div>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Header da seção */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Fontes de Notícias</h2>
              <p className="text-gray-600">Gerencie suas fontes RSS e sites de notícias</p>
            </div>
            <Button 
              onClick={() => setShowAddSource(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fonte
            </Button>
          </div>

          {/* Formulário para adicionar/editar fonte */}
          {(showAddSource || editingSource) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingSource ? 'Editar Fonte de Notícias' : 'Nova Fonte de Notícias'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="source-name">Nome da Fonte</Label>
                  <Input
                    id="source-name"
                    placeholder="Ex: TechCrunch, G1 Tecnologia, Folha de S.Paulo"
                    value={newSource.name}
                    onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nome identificador para esta fonte de notícias
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="source-url">URL da Fonte</Label>
                  <Input
                    id="source-url"
                    placeholder="https://g1.globo.com/tecnologia/ ou https://feeds.feedburner.com/..."
                    value={newSource.url}
                    onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pode ser um feed RSS ou a página principal do site - o sistema detectará automaticamente
                  </p>
                </div>

                <div>
                  <Label htmlFor="target-site">Site de Destino</Label>
                  <select
                    id="target-site"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={newSource.target_site_id}
                    onChange={(e) => setNewSource({...newSource, target_site_id: e.target.value})}
                  >
                    <option value="">Selecione o site que receberá os artigos</option>
                    {userSites.map((site) => (
                      <option key={site.id} value={String(site.id)}>
                        {site.nome} ({site.url})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Site onde os artigos reescritos serão publicados/agendados
                  </p>
                </div>

                {/* Configurações WordPress - aparecem quando um site é selecionado */}
                {newSource.target_site_id && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Settings className="w-4 h-4 mr-2 text-purple-600" />
                      Configurações Padrão do WordPress
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure as preferências padrão que serão aplicadas aos artigos desta fonte.
                    </p>

                    {isLoadingWordPress ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        <span className="ml-2 text-sm text-gray-600">Carregando configurações do WordPress...</span>
                      </div>
                    ) : (
                      <>
                        {/* Autor Padrão */}
                        {wordpressData.authors.length > 0 && (
                          <div className="mb-4">
                            <Label htmlFor="default-author">Autor Padrão</Label>
                            <select
                              id="default-author"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              value={newSource.default_author_id}
                              onChange={(e) => setNewSource({...newSource, default_author_id: e.target.value})}
                            >
                              <option value="">Autor padrão do WordPress</option>
                              {wordpressData.authors.map((author) => (
                                <option key={author.id} value={author.id}>
                                  {author.name} (@{author.slug})
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Autor que será atribuído aos artigos desta fonte
                            </p>
                          </div>
                        )}

                        {/* Categorias Padrão */}
                        {wordpressData.categories.length > 0 && (
                          <div className="mb-4">
                            <Label>Categorias Padrão</Label>
                            <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                              <div className="space-y-2">
                                {wordpressData.categories.map((category) => (
                                  <div key={category.id} className="flex items-center">
                                    <Checkbox
                                      id={`source-category-${category.id}`}
                                      checked={newSource.default_categories.includes(category.id.toString())}
                                      onCheckedChange={(checked) => 
                                        handleSourceCategoryToggle(category.id.toString(), checked)
                                      }
                                    />
                                    <Label
                                      htmlFor={`source-category-${category.id}`}
                                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                                    >
                                      {category.name}
                                      {category.parent > 0 && (
                                        <span className="text-xs text-gray-500 ml-1">(subcategoria)</span>
                                      )}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Categorias que serão aplicadas aos artigos desta fonte
                            </p>
                          </div>
                        )}

                        {/* Tags Padrão */}
                        {wordpressData.tags.length > 0 && (
                          <div className="mb-4">
                            <Label>Tags Padrão</Label>
                            <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                              <div className="space-y-2">
                                {wordpressData.tags.map((tag) => (
                                  <div key={tag.id} className="flex items-center">
                                    <Checkbox
                                      id={`source-tag-${tag.id}`}
                                      checked={newSource.default_tags.includes(tag.slug)}
                                      onCheckedChange={(checked) => 
                                        handleSourceTagToggle(tag.slug, checked)
                                      }
                                    />
                                    <Label
                                      htmlFor={`source-tag-${tag.id}`}
                                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                                    >
                                      {tag.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Tags que serão aplicadas aos artigos desta fonte
                            </p>
                          </div>
                        )}

                        {/* Mensagem quando não há dados WordPress */}
                        {!isLoadingWordPress && 
                         wordpressData.authors.length === 0 && 
                         wordpressData.categories.length === 0 && 
                         wordpressData.tags.length === 0 && (
                          <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                            <p>📝 <strong>Configurações WordPress:</strong></p>
                            <p className="text-xs mt-1">
                              Não foram encontrados autores, categorias ou tags no WordPress deste site, 
                              ou ocorreu um erro na conexão. Verifique as configurações do site.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={editingSource ? handleSaveEdit : handleAddSource}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingSource ? 'Salvar Alterações' : 'Adicionar Fonte'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={editingSource ? handleCancelEdit : () => {
                      setShowAddSource(false);
                      setNewSource({ 
                        name: '', 
                        url: '', 
                        target_site_id: '',
                        default_author_id: '',
                        default_categories: [],
                        default_tags: []
                      });
                      setWordpressData({
                        categories: [],
                        authors: [],
                        tags: []
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de fontes */}
          <div className="space-y-4">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        source.detected_type === 'rss' ? 'bg-orange-100' : source.detected_type === 'url' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {source.detected_type === 'rss' ? 
                          <Rss className="w-6 h-6 text-orange-600" /> : 
                          source.detected_type === 'url' ?
                          <Globe className="w-6 h-6 text-blue-600" /> :
                          <Newspaper className="w-6 h-6 text-purple-600" />
                        }
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{source.name}</h3>
                        <p className="text-sm text-gray-600">{source.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {source.detected_type === 'rss' ? '📡 Feed RSS' : 
                             source.detected_type === 'url' ? '🌐 Website' : 
                             '🔍 Auto-detectado'}
                          </Badge>
                          {source.feed_url && source.feed_url !== source.url && (
                            <Badge variant="outline" className="text-xs">
                              📊 Feed: {new URL(source.feed_url).pathname}
                            </Badge>
                          )}
                          {/* Status de Validação */}
                          {source.validation_status === 'invalid' && (
                            <Badge 
                              variant="destructive" 
                              className="text-xs cursor-help"
                              title={`Fonte inválida: ${source.validation_message || 'Feed RSS não válido'}`}
                            >
                              ❌ Inválida
                            </Badge>
                          )}
                          {source.validation_status === 'warning' && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-yellow-500 text-yellow-700 cursor-help"
                              title={`Atenção: ${source.validation_message || 'Poucos artigos encontrados'}`}
                            >
                              ⚠️ Atenção
                            </Badge>
                          )}
                          {source.validation_status === 'valid' && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-green-500 text-green-700 cursor-help"
                              title={`Fonte válida: ${source.validation_message || 'Feed funcionando corretamente'}`}
                            >
                              ✅ Válida
                            </Badge>
                          )}
                          {source.validation_status === 'pending' && (
                            <Badge 
                              variant="outline" 
                              className="text-xs border-gray-400 text-gray-600 cursor-help"
                              title="Validação pendente - processe a fonte para verificar"
                            >
                              🔄 Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={source.active} 
                        onCheckedChange={() => handleToggleSource(source)}
                        disabled={isLoading}
                      />
                      {source.active ? (
                        <Badge className="bg-green-100 text-green-800 border-0">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border-0">Inativo</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Modelo de feed:</span>
                      <p className="font-medium capitalize">
                        {source.detected_type === 'rss' ? '✅ Feed RSS encontrado' : 
                         source.detected_type === 'url' ? '🔍 Website com feed detectado' : 
                         '⚡ Detecção automática'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Artigos encontrados:</span>
                      <p className="font-medium text-purple-600">
                        {sourceArticles[source.id] ? sourceArticles[source.id].length : 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span>Última verificação:</span>
                      <p>{sourceExecutions[source.id] ? 
                           new Date(sourceExecutions[source.id]).toLocaleString('pt-BR') : 
                           (source.last_check ? new Date(source.last_check).toLocaleString('pt-BR') : 'Nunca verificada')
                         }</p>
                    </div>
                    <div>
                      <span>Criada em:</span>
                      <p>{new Date(source.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleProcessSource(source)}
                      disabled={isLoading || sourceProcessingStates[source.id]}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {sourceProcessingStates[source.id] ? 'Buscando Artigos...' : `Buscar Artigos ${(parseInt(localStorage.getItem(`${source.id}_executions`)) || 0) > 0 ? '(+10)' : ''}`}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditSource(source)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    {(parseInt(localStorage.getItem(`${source.id}_executions`)) || 0) > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleResetSourceCounter(source)}
                        className="text-orange-600 hover:text-orange-700"
                        title="Resetar contador de execuções"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleOpenUrl(source)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir URL
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSource(source)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>

                  {/* Seção de artigos processados da fonte */}
                  {sourceArticles[source.id]?.filter(a => a.status !== 'published').length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium text-gray-900">
                            Artigos Encontrados ({sourceArticles[source.id]?.length || 0})
                          </h4>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={sourceFilters[source.id] || 'all'} 
                            onValueChange={(value) => setSourceFilters(prev => ({...prev, [source.id]: value}))}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="pending">Aguardando</SelectItem>
                              <SelectItem value="rewritten">Reescrito</SelectItem>
                              <SelectItem value="published">Publicado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Filtrar e mostrar artigos baseado no filtro selecionado */}
                        {(() => {
                          const currentFilter = sourceFilters[source.id] || 'all';
                          let filteredArticles = sourceArticles[source.id] || [];
                          
                          // Aplicar filtro
                          if (currentFilter === 'pending') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.status === 'pending' || (!a.rewritten_content && a.status !== 'published')
                            );
                          } else if (currentFilter === 'rewritten') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.rewritten_content && a.status !== 'published'
                            );
                          } else if (currentFilter === 'published') {
                            filteredArticles = filteredArticles.filter(a => a.status === 'published');
                          }
                          
                          return filteredArticles.slice(0, 5).map((article) => (
                          <div key={article.id} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="space-y-3">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
                                  {article.title}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                                  <Badge 
                                    className={
                                      article.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                      article.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                      article.rewritten_content ? 'bg-green-100 text-green-800' :
                                      article.status === 'processed' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {article.status === 'published' ? 'Publicado' :
                                     article.status === 'pending' ? 'Aguardando' :
                                     article.rewritten_content ? 'Reescrito' :
                                     article.status === 'processed' ? 'Processado' :
                                     'Outros'}
                                  </Badge>
                                  <span>{new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                              
                              {/* Botões de ação com estilo padronizado da aba Produzir Artigos */}
                              <div className="flex gap-2 flex-wrap">
                                {article.status === 'published' ? (
                                  // Botões para artigos publicados
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.published_url || article.wordpress_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Online
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-gray-600 hover:text-gray-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Original
                                    </Button>
                                  </>
                                ) : article.rewritten_content ? (
                                  // Botões para artigos reescritos
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => {
                                        setSelectedArticle(article);
                                        setShowArticleModal(true);
                                      }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Ver
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-green-600 hover:text-green-700 h-7 px-2 text-xs"
                                      onClick={() => handlePublishArticle(article)}
                                    >
                                      <Upload className="w-3 h-3 mr-1" />
                                      Publicar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-orange-600 hover:text-orange-700 h-7 px-2 text-xs"
                                      onClick={() => handleScheduleArticle(article)}
                                    >
                                      <Calendar className="w-3 h-3 mr-1" />
                                      Agendar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                      onClick={() => handleDeleteArticle(article)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </>
                                ) : (
                                  // Botões para artigos não reescritos
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-purple-600 hover:text-purple-700 h-7 px-2 text-xs"
                                      onClick={() => handleRewriteArticle(article)}
                                      disabled={rewritingArticleIds.has(article.id)}
                                    >
                                      {rewritingArticleIds.has(article.id) ? (
                                        <>
                                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                          Reescrevendo...
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="w-3 h-3 mr-1" />
                                          Reescrever
                                        </>
                                      )}                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                      onClick={() => handleIgnoreArticle(article)}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Ignorar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Original
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ));
                        })()}

                        {/* Lista expandida (artigos 6 em diante) - também precisa aplicar filtro */}
                        {expandedSources[source.id] && (() => {
                          const currentFilter = sourceFilters[source.id] || 'all';
                          let filteredArticles = sourceArticles[source.id] || [];
                          
                          // Aplicar mesmo filtro da lista principal
                          if (currentFilter === 'pending') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.status === 'pending' || (!a.rewritten_content && a.status !== 'published')
                            );
                          } else if (currentFilter === 'rewritten') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.rewritten_content && a.status !== 'published'
                            );
                          } else if (currentFilter === 'published') {
                            filteredArticles = filteredArticles.filter(a => a.status === 'published');
                          }
                          
                          return filteredArticles.slice(5).map((article) => (
                          <div key={article.id} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="space-y-3">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
                                  {article.title}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                                  <Badge 
                                    className={
                                      article.status === 'published' ? 'bg-blue-100 text-blue-800' :
                                      article.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                      article.rewritten_content ? 'bg-green-100 text-green-800' :
                                      article.status === 'processed' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {article.status === 'published' ? 'Publicado' :
                                     article.status === 'pending' ? 'Aguardando' :
                                     article.rewritten_content ? 'Reescrito' :
                                     article.status === 'processed' ? 'Processado' :
                                     'Outros'}
                                  </Badge>
                                  <span>{new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                              
                              {/* Botões de ação com estilo padronizado da aba Produzir Artigos */}
                              <div className="flex gap-2 flex-wrap">
                                {article.status === 'published' ? (
                                  // Botões para artigos publicados
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.published_url || article.wordpress_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Online
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-gray-600 hover:text-gray-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Original
                                    </Button>
                                  </>
                                ) : article.rewritten_content ? (
                                  // Botões para artigos reescritos
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => {
                                        setSelectedArticle(article);
                                        setShowArticleModal(true);
                                      }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Ver
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-green-600 hover:text-green-700 h-7 px-2 text-xs"
                                      onClick={() => handlePublishArticle(article)}
                                    >
                                      <Upload className="w-3 h-3 mr-1" />
                                      Publicar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-orange-600 hover:text-orange-700 h-7 px-2 text-xs"
                                      onClick={() => handleScheduleArticle(article)}
                                    >
                                      <Calendar className="w-3 h-3 mr-1" />
                                      Agendar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                      onClick={() => handleDeleteArticle(article)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </>
                                ) : (
                                  // Botões para artigos não reescritos
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-purple-600 hover:text-purple-700 h-7 px-2 text-xs"
                                      onClick={() => handleRewriteArticle(article)}
                                      disabled={rewritingArticleIds.has(article.id)}
                                    >
                                      {rewritingArticleIds.has(article.id) ? (
                                        <>
                                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                          Reescrevendo...
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="w-3 h-3 mr-1" />
                                          Reescrever
                                        </>
                                      )}                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                      onClick={() => handleIgnoreArticle(article)}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Ignorar
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                      onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Original
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          ));
                        })()}

                        {/* Botão Ver Mais / Ver Menos - baseado no filtro atual */}
                        {(() => {
                          const currentFilter = sourceFilters[source.id] || 'all';
                          let filteredArticles = sourceArticles[source.id] || [];
                          
                          // Aplicar mesmo filtro para contar
                          if (currentFilter === 'pending') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.status === 'pending' || (!a.rewritten_content && a.status !== 'published')
                            );
                          } else if (currentFilter === 'rewritten') {
                            filteredArticles = filteredArticles.filter(a => 
                              a.rewritten_content && a.status !== 'published'
                            );
                          } else if (currentFilter === 'published') {
                            filteredArticles = filteredArticles.filter(a => a.status === 'published');
                          }
                          
                          return filteredArticles.length > 5 && (
                          <div className="text-center py-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-purple-600 hover:text-purple-700"
                              onClick={() => toggleSourceExpansion(source.id)}
                            >
                              {expandedSources[source.id] ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Ver menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Ver mais ({sourceArticles[source.id].length - 3} artigos)
                                </>
                              )}
                            </Button>
                          </div>
                        );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {sources.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Rss className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma fonte configurada</h3>
                  <p className="text-gray-600 mb-4">Adicione suas primeiras fontes de notícias para começar</p>
                  <Button 
                    onClick={() => setShowAddSource(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Fonte
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Seção de Monitoramento */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configurações de Monitoramento</h2>
              <p className="text-gray-600">Vincule fontes a sites e configure frequência de monitoramento automático</p>
            </div>
            <Button 
              onClick={() => setShowAddMonitoring(true)}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={userSites.length === 0 || sources.filter(s => !s.status || s.status === 'active').length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
          </div>

          {/* Pré-requisitos para monitoramento */}
          {userSites.length === 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Passo 1:</strong> Configure pelo menos um site WordPress na seção "Meus Sites" para receber as publicações.
                <br />
                <button 
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('sites');
                    }
                  }}
                  className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer mt-1"
                >
                  Ir para Meus Sites →
                </button>
              </AlertDescription>
            </Alert>
          )}

          {userSites.length > 0 && sources.length === 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Passo 2:</strong> Adicione pelo menos uma fonte de notícias na aba "Fontes" antes de configurar o monitoramento.
                <br />
                <button 
                  onClick={() => setActiveTab('sources')}
                  className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer mt-1"
                >
                  Ir para Fontes →
                </button>
              </AlertDescription>
            </Alert>
          )}

          {userSites.length > 0 && sources.filter(s => s.status === 'active').length > 0 && monitoring.length === 0 && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Tudo pronto!</strong> Agora você pode configurar o monitoramento automático de notícias.
              </AlertDescription>
            </Alert>
          )}

          {/* Formulário para adicionar monitoramento */}
          {showAddMonitoring && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingMonitoring ? 'Editar Configuração de Monitoramento' : 'Nova Configuração de Monitoramento'}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Vincule uma fonte de notícias a um site WordPress e defina a frequência de monitoramento
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Passo 1: Site WordPress (obrigatório primeiro) */}
                  <div>
                    <Label htmlFor="monitoring-site" className="text-sm font-medium text-gray-900">
                      1. Selecione o Site WordPress <span className="text-red-500">*</span>
                    </Label>
                    <Select value={newMonitoring.site_id} onValueChange={(value) => {
                      setNewMonitoring({...newMonitoring, site_id: value, author_id: '', categories: [], tags: []});
                      loadWordPressData(value);
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Escolha onde publicar os artigos" />
                      </SelectTrigger>
                      <SelectContent>
                        {userSites.map((site) => (
                          <SelectItem key={site.id} value={site.id.toString()}>
                            <div className="flex flex-col py-1">
                              <span className="font-medium">{site.nome}</span>
                              <span className="text-xs text-gray-500">{site.wordpressUrl}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      Selecione o site onde os artigos reescritos serão publicados automaticamente
                    </p>
                  </div>

                  {/* Passo 2: Fonte de Notícias (após selecionar site) */}
                  <div className={`${!newMonitoring.site_id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Label htmlFor="monitoring-source" className="text-sm font-medium text-gray-900">
                      2. Selecione a Fonte de Notícias <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={newMonitoring.source_id} 
                      onValueChange={(value) => setNewMonitoring({...newMonitoring, source_id: value})}
                      disabled={!newMonitoring.site_id}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Escolha a fonte das notícias" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.filter(s => !s.status || s.status === 'active').map((source) => (
                          <SelectItem key={source.id} value={source.id.toString()}>
                            <div className="flex items-center gap-2">
                              {source.detected_type === 'rss' ? 
                                <Rss className="w-4 h-4 text-orange-500" /> : 
                                <Globe className="w-4 h-4 text-blue-500" />
                              }
                              <span>{source.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      RSS feed ou website que será monitorado para novas notícias
                    </p>
                  </div>

                  {/* Passo 3: Configurações (após selecionar fonte) */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!newMonitoring.source_id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <Label htmlFor="monitoring-frequency" className="text-sm font-medium text-gray-900">
                        3. Frequência de Monitoramento
                      </Label>
                      <Select 
                        value={newMonitoring.frequency} 
                        onValueChange={(value) => setNewMonitoring({...newMonitoring, frequency: value})}
                        disabled={!newMonitoring.source_id}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">A cada hora</SelectItem>
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600 mt-1">
                        Com que frequência verificar por novas notícias
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="monitoring-count" className="text-sm font-medium text-gray-900">
                        4. Limite de Artigos por Execução
                      </Label>
                      <Select 
                        value={newMonitoring.articles_count.toString()} 
                        onValueChange={(value) => setNewMonitoring({...newMonitoring, articles_count: parseInt(value)})}
                        disabled={!newMonitoring.source_id}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 artigo</SelectItem>
                          <SelectItem value="3">3 artigos</SelectItem>
                          <SelectItem value="5">5 artigos</SelectItem>
                          <SelectItem value="10">10 artigos</SelectItem>
                          <SelectItem value="15">15 artigos</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600 mt-1">
                        Máximo de artigos a processar por vez
                      </p>
                    </div>
                  </div>

                  {/* Configurações de IA */}
                  <div className={`border-t pt-4 ${!newMonitoring.source_id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">5. Configurações de Inteligência Artificial</h4>
                        <div className="flex items-center gap-3">
                          {newMonitoring.site_id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => loadWordPressData(newMonitoring.site_id)}
                              disabled={isLoadingWordPress}
                              className="text-xs px-2 py-1"
                            >
                              {isLoadingWordPress ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Settings className="h-3 w-3 mr-1" />
                              )}
                              Sincronizar WordPress
                            </Button>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600">Créditos disponíveis:</span>
                            <span className={`font-medium px-2 py-1 rounded ${userCredits.articles > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {userCredits.articles}
                            </span>
                            <span className="text-gray-500">artigos</span>
                          </div>
                        </div>
                      </div>                    <div className="space-y-4">
                      {/* Reescrita com IA */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-gray-900">
                            Reescrever artigos com IA
                          </Label>
                          <p className="text-xs text-gray-600">
                            A IA reescrevê os artigos originais para evitar plágio
                          </p>
                        </div>
                        <Switch
                          checked={newMonitoring.rewrite_content}
                          onCheckedChange={(checked) => setNewMonitoring({...newMonitoring, rewrite_content: checked})}
                          disabled={!newMonitoring.source_id}
                        />
                      </div>

                      {/* Auto-publicação */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-gray-900">
                            Publicar automaticamente
                          </Label>
                          <p className="text-xs text-gray-600">
                            Artigos serão publicados automaticamente após reescrita
                          </p>
                        </div>
                        <Switch
                          checked={newMonitoring.auto_publish}
                          onCheckedChange={(checked) => setNewMonitoring({...newMonitoring, auto_publish: checked})}
                          disabled={!newMonitoring.source_id}
                        />
                      </div>



                      {/* Campos WordPress */}
                      {newMonitoring.site_id && (
                        <>
                          {/* Loading state */}
                          {isLoadingWordPress && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando dados do WordPress...
                            </div>
                          )}

                          {/* Autor */}
                          {wordpressData.authors.length > 0 && (
                            <div>
                              <Label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <User className="h-4 w-4" />
                                Autor
                              </Label>
                              <Select
                                value={newMonitoring.author_id}
                                onValueChange={(value) => setNewMonitoring({...newMonitoring, author_id: value})}
                                disabled={!newMonitoring.site_id}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Selecione um autor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {wordpressData.authors.map((author) => (
                                    <SelectItem key={author.id} value={author.id.toString()}>
                                      {author.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Categorias WordPress */}
                          {wordpressData.categories.length > 0 && (
                            <div>
                              <Label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <FolderOpen className="h-4 w-4" />
                                Categorias WordPress
                              </Label>
                              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                                {wordpressData.categories.map((category) => (
                                  <div key={category.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`category-${category.id}`}
                                      checked={newMonitoring.categories.includes(category.id.toString())}
                                      onCheckedChange={(checked) => handleCategoryToggle(category.id.toString(), checked)}
                                      disabled={!newMonitoring.site_id}
                                    />
                                    <Label 
                                      htmlFor={`category-${category.id}`}
                                      className="text-sm text-gray-700 cursor-pointer"
                                    >
                                      {category.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags WordPress */}
                          {wordpressData.tags.length > 0 && (
                            <div>
                              <Label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <Tag className="h-4 w-4" />
                                Tags WordPress
                              </Label>
                              <div className="grid grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto">
                                {wordpressData.tags.map((tag) => (
                                  <div key={tag.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`tag-${tag.id}`}
                                      checked={newMonitoring.tags.includes(tag.id.toString())}
                                      onCheckedChange={(checked) => handleTagToggle(tag.id.toString(), checked)}
                                      disabled={!newMonitoring.site_id}
                                    />
                                    <Label 
                                      htmlFor={`tag-${tag.id}`}
                                      className="text-sm text-gray-700 cursor-pointer"
                                    >
                                      {tag.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mensagem quando não há dados WordPress */}
                          {!isLoadingWordPress && 
                           wordpressData.authors.length === 0 && 
                           wordpressData.categories.length === 0 && 
                           wordpressData.tags.length === 0 && (
                            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                              <p>📝 <strong>Campos WordPress:</strong></p>
                              <p className="text-xs mt-1">
                                Não foram encontrados autores, categorias ou tags no WordPress deste site, 
                                ou ocorreu um erro na conexão. Verifique as configurações do site.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAddMonitoring}
                    disabled={isLoading || !newMonitoring.source_id || !newMonitoring.site_id || userSites.length === 0 || sources.filter(s => !s.status || s.status === 'active').length === 0}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingMonitoring ? 'Salvar Alterações' : 'Configurar Automação'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddMonitoring(false);
                      setEditingMonitoring(null);
                      setNewMonitoring({ source_id: '', site_id: '', frequency: 'daily', articles_count: 5, active: true, rewrite_content: true, auto_publish: false, target_category: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de monitoramentos */}
          <div className="space-y-4">
            {monitoring.map((monitor) => (
              <Card key={monitor.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{monitor.news_source?.name || 'Fonte não encontrada'}</h3>
                        <p className="text-sm text-gray-600">→ {monitor.site?.nome || 'Site não encontrado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={monitor.active} 
                        onCheckedChange={() => handleToggleMonitoring(monitor)}
                        disabled={isLoading}
                      />
                      {monitor.active ? (
                        <Badge className="bg-green-100 text-green-800 border-0">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border-0">Pausado</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Frequência:</span>
                      <p className="font-medium">{formatFrequencyFromMinutes(monitor.check_interval_minutes)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Artigos por execução:</span>
                      <p className="font-medium">{monitor.settings?.articles_count || 5} artigos</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Processados hoje:</span>
                      <p className="font-medium text-green-600">
                        {(() => {
                          // Contar artigos processados hoje desta fonte/monitoramento
                          const today = new Date().toDateString();
                          
                          // Contar da lista de artigos do monitoramento
                          const monitoringCount = monitor.articles?.filter(a => {
                            return new Date(a.created_at).toDateString() === today;
                          }).length || 0;
                          
                          // Também contar da lista global de artigos para esta fonte
                          const globalCount = articles?.filter(a => {
                            return a.news_source_id === monitor.news_source_id && 
                                   new Date(a.created_at).toDateString() === today;
                          }).length || 0;
                          
                          // Retornar o maior valor (mais abrangente)
                          const finalCount = Math.max(monitoringCount, globalCount);
                          return finalCount;
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p>{monitor.active ? 
                        <span className="text-green-600 font-medium">✅ Ativo - monitorando</span> : 
                        <span className="text-gray-600 font-medium">⏸️ Pausado</span>
                      }</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Última execução:</span>
                      <p className="font-medium">{monitor.last_check_at ? new Date(monitor.last_check_at).toLocaleString('pt-BR') : 'Nunca executado'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Próxima execução:</span>
                      <p className="font-medium text-blue-600">{calculateNextExecution(monitor)}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleExecuteMonitoring(monitor)}
                      disabled={loadingMonitoringIds.has(monitor.id) || !monitor.active}
                      className="text-green-600 hover:text-green-700"
                    >
                      {loadingMonitoringIds.has(monitor.id) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Executar Agora
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditMonitoring(monitor)}
                      disabled={loadingMonitoringIds.has(monitor.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteMonitoring(monitor)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Seção de Artigos Processados */}
                  {(() => {
                    // Buscar artigos desta automação/fonte na lista global com critérios ampliados
                    const monitorArticles = articles.filter(article => {
                      // Critério 1: news_source_id corresponde
                      if (article.news_source_id === monitor.news_source_id) return true;
                      
                      // Critério 2: source_id corresponde (alternativa)
                      if (article.source_id === monitor.news_source_id) return true;
                      
                      // Critério 3: news_monitoring_id corresponde diretamente
                      if (article.news_monitoring_id === monitor.id) return true;
                      
                      // Critério 4: buscar por sourceArticles se disponível
                      if (sourceArticles[monitor.news_source_id]) {
                        return sourceArticles[monitor.news_source_id].some(sa => sa.id === article.id);
                      }
                      
                      return false;
                    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Ordenar por mais recentes
                    
                    debugLog('🔍 Debug artigos da automação:', {
                      monitoring_id: monitor.id,
                      news_source_id: monitor.news_source_id,
                      monitor_articles_direct: monitor.articles?.length || 0,
                      found_articles: monitorArticles.length,
                      all_articles_count: articles.length,
                      source_name: monitor.news_source?.name,
                      sample_articles: monitorArticles.slice(0, 3).map(a => ({
                        id: a.id,
                        title: a.title,
                        news_source_id: a.news_source_id,
                        source_id: a.source_id,
                        news_monitoring_id: a.news_monitoring_id,
                        status: a.status
                      }))
                    });
                    
                    if (monitorArticles.length === 0) {
                      return (
                        <div className="mt-6 border-t pt-4">
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="font-medium mb-1">Nenhum artigo processado ainda</p>
                            <p className="text-sm">
                              Clique em "Executar Agora" para processar artigos da fonte "{monitor.news_source?.name}"
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Artigos Encontrados ({monitorArticles.length})
                        </h4>
                        <div className="space-y-3">
                          {/* Mostrar os primeiros 3 artigos sempre */}
                          {monitorArticles.slice(0, 3).map((article) => (
                          <div key={article.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                            {/* URL Original como Informativo */}
                            <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-100">
                              <span className="font-medium">Artigo Original:</span> 
                              <a 
                                href={article.original_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 ml-1 break-all"
                                title="Abrir artigo original"
                              >
                                {new URL(article.original_url).hostname}
                              </a>
                            </div>
                            
                            {/* Título do Artigo Reescrito - DESTAQUE PRINCIPAL */}
                            <div className="mb-3">
                              <h5 className="font-semibold text-gray-900 text-base leading-tight mb-2">
                                {article.title || 'Artigo processado'}
                              </h5>
                              
                              {/* Status e Data */}
                              <div className="flex items-center justify-between">
                                <Badge className={
                                  article.status === 'published' ? 'bg-green-100 text-green-800 border-0' :
                                  article.status === 'processed' ? 'bg-blue-100 text-blue-800 border-0' :
                                  article.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-0' :
                                  'bg-gray-100 text-gray-800 border-0'
                                }>
                                  {article.status === 'published' ? '✅ Publicado' :
                                   article.status === 'processed' ? '📝 Processado' :
                                   article.status === 'pending' ? '⏳ Pendente' :
                                   '❌ Falhou'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(article.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>

                            {/* URL de Publicação (se publicado automaticamente) */}
                            {article.published_url && (
                              <div className="text-xs text-gray-600 mb-2">
                                <span className="font-medium">Publicado em:</span>
                                <a 
                                  href={article.published_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-800 ml-1"
                                >
                                  {article.published_url}
                                </a>
                              </div>
                            )}

                            {/* Botões de Ação */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {/* Botões baseados no status do artigo - mesma lógica da aba Fontes */}
                              {article.status === 'published' ? (
                                // Botões para artigos publicados
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                    onClick={() => window.open(article.published_url || article.wordpress_url, '_blank')}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Ver Online
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-gray-600 hover:text-gray-700 h-7 px-2 text-xs"
                                    onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Ver Original
                                  </Button>
                                </>
                              ) : article.rewritten_content ? (
                                // Botões para artigos reescritos mas não publicados
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                    onClick={() => {
                                      setSelectedArticle(article);
                                      setShowArticleModal(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-green-600 hover:text-green-700 h-7 px-2 text-xs"
                                    onClick={() => handlePublishArticle(article)}
                                  >
                                    <Upload className="w-3 h-3 mr-1" />
                                    Publicar
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-orange-600 hover:text-orange-700 h-7 px-2 text-xs"
                                    onClick={() => handleScheduleArticle(article)}
                                  >
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Agendar
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                    onClick={() => handleDeleteArticle(article)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Excluir
                                  </Button>
                                </>
                              ) : (
                                // Botões para artigos não reescritos
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-purple-600 hover:text-purple-700 h-7 px-2 text-xs"
                                    onClick={() => handleRewriteArticle(article)}
                                    disabled={rewritingArticleIds.has(article.id)}
                                  >
                                    {rewritingArticleIds.has(article.id) ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                        Reescrevendo...
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="w-3 h-3 mr-1" />
                                        Reescrever
                                      </>
                                    )}
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                    onClick={() => handleIgnoreArticle(article)}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Ignorar
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                    onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Ver Original
                                  </Button>
                                </>
                              )}
                            </div>
                            </div>
                          ))}

                          {/* Seção expandida com artigos adicionais */}
                          {expandedMonitoring[monitor.id] && monitorArticles.length > 3 && (
                            <>
                              {monitorArticles.slice(3, 20).map((article) => (
                                <div key={article.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                                  {/* URL Original como Informativo */}
                                  <div className="text-xs text-gray-500 mb-2 pb-2 border-b border-gray-100">
                                    <span className="font-medium">Artigo Original:</span> 
                                    <a 
                                      href={article.original_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 ml-1 break-all"
                                      title="Abrir artigo original"
                                    >
                                      {new URL(article.original_url).hostname}
                                    </a>
                                  </div>
                                  
                                  {/* Título do Artigo Reescrito - DESTAQUE PRINCIPAL */}
                                  <div className="mb-3">
                                    <h5 className="font-semibold text-gray-900 text-base leading-tight mb-2">
                                      {article.title || 'Artigo processado'}
                                    </h5>
                                    
                                    {/* Status e Data */}
                                    <div className="flex items-center justify-between">
                                      <Badge className={
                                        article.status === 'published' ? 'bg-green-100 text-green-800 border-0' :
                                        article.status === 'processed' ? 'bg-blue-100 text-blue-800 border-0' :
                                        article.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-0' :
                                        'bg-gray-100 text-gray-800 border-0'
                                      }>
                                        {article.status === 'published' ? '✅ Publicado' :
                                         article.status === 'processed' ? '📝 Processado' :
                                         article.status === 'pending' ? '⏳ Pendente' :
                                         '❌ Falhou'}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {new Date(article.created_at).toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* URL de Publicação (se publicado automaticamente) */}
                                  {article.published_url && (
                                    <div className="text-xs text-gray-600 mb-2">
                                      <span className="font-medium">Publicado em:</span>
                                      <a 
                                        href={article.published_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-800 ml-1"
                                      >
                                        {article.published_url}
                                      </a>
                                    </div>
                                  )}

                                  {/* Botões de Ação */}
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {/* Botões baseados no status do artigo - mesma lógica da aba Fontes */}
                                    {article.status === 'published' ? (
                                      // Botões para artigos publicados
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                          onClick={() => window.open(article.published_url || article.wordpress_url, '_blank')}
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Ver Online
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-gray-600 hover:text-gray-700 h-7 px-2 text-xs"
                                          onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Ver Original
                                        </Button>
                                      </>
                                    ) : article.rewritten_content ? (
                                      // Botões para artigos reescritos mas não publicados
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedArticle(article);
                                            setShowArticleModal(true);
                                          }}
                                        >
                                          <Eye className="w-3 h-3 mr-1" />
                                          Ver
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-green-600 hover:text-green-700 h-7 px-2 text-xs"
                                          onClick={() => handlePublishArticle(article)}
                                        >
                                          <Upload className="w-3 h-3 mr-1" />
                                          Publicar
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-orange-600 hover:text-orange-700 h-7 px-2 text-xs"
                                          onClick={() => handleScheduleArticle(article)}
                                        >
                                          <Calendar className="w-3 h-3 mr-1" />
                                          Agendar
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                          onClick={() => handleDeleteArticle(article)}
                                        >
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          Excluir
                                        </Button>
                                      </>
                                    ) : (
                                      // Botões para artigos não reescritos
                                      <>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-purple-600 hover:text-purple-700 h-7 px-2 text-xs"
                                          onClick={() => handleRewriteArticle(article)}
                                          disabled={rewritingArticleIds.has(article.id)}
                                        >
                                          {rewritingArticleIds.has(article.id) ? (
                                            <>
                                              <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                              Reescrevendo...
                                            </>
                                          ) : (
                                            <>
                                              <Edit className="w-3 h-3 mr-1" />
                                              Reescrever
                                            </>
                                          )}
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                                          onClick={() => handleIgnoreArticle(article)}
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Ignorar
                                        </Button>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className="text-blue-600 hover:text-blue-700 h-7 px-2 text-xs"
                                          onClick={() => window.open(article.original_url || article.source_url, '_blank')}
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Ver Original
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Botão Ver Mais / Ver Menos */}
                          {monitorArticles.length > 3 && (
                            <div className="text-center py-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-purple-600 hover:text-purple-700"
                                onClick={() => toggleMonitoringExpansion(monitor.id)}
                              >
                                {expandedMonitoring[monitor.id] ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    Ver menos
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                    Ver mais ({Math.min(monitorArticles.length - 3, 17)} artigos)
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                })()}
                </CardContent>
              </Card>
            ))}
            
            {monitoring.length === 0 && sources.length > 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum monitoramento configurado</h3>
                  <p className="text-gray-600 mb-4">Configure seus primeiros monitoramentos automáticos</p>
                  <Button 
                    onClick={() => setShowAddMonitoring(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Configurar Automação
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Seção de Artigos */}
      {activeTab === 'articles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Artigos Encontrados ({articles.filter(article => article.status === 'processed' || article.status === 'pending').length})
                </h2>
                <p className="text-gray-600">Visualize e gerencie os artigos gerados automaticamente</p>
              </div>
              <div className="flex gap-2">
                <Select value={articleFilter} onValueChange={setArticleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os artigos</SelectItem>
                    <SelectItem value="pending">Aguardando</SelectItem>
                    <SelectItem value="rewritten">Reescrito</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lista de artigos */}
          <div className="space-y-4">
            {articles.filter(article => {
              // Filtro básico - apenas artigos processados ou pendentes
              if (!(article.status === 'processed' || article.status === 'pending')) {
                return false;
              }
              
              // Aplicar filtro selecionado pelo usuário
              if (articleFilter === 'all') return true;
              if (articleFilter === 'pending') {
                return article.status === 'pending' || (!article.rewritten_content && article.status !== 'published');
              }
              if (articleFilter === 'rewritten') {
                return article.rewritten_content && article.status !== 'published';
              }
              if (articleFilter === 'published') {
                return article.status === 'published';
              }
              
              return true;
            }).map((article) => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  {/* URL Original como Informativo */}
                  <div className="text-xs text-gray-500 mb-3 pb-2 border-b border-gray-100">
                    <span className="font-medium">Artigo Original:</span> 
                    <a 
                      href={article.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-1"
                      title="Abrir artigo original"
                    >
                      {article.original_url ? new URL(article.original_url).hostname : 'URL não disponível'}
                    </a>
                  </div>
                  
                  {/* Título Reescrito - DESTAQUE PRINCIPAL */}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 leading-tight mb-3">
                      {article.title || 'Artigo processado'}
                    </h3>
                    
                    {/* Preview do Texto Reescrito */}
                    {(article.rewritten_content || article.original_content) && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {(() => {
                            const content = article.rewritten_content || article.original_content;
                            // Remove HTML tags para preview
                            const textContent = content.replace(/<[^>]+>/g, '').trim();
                            return textContent.length > 200 
                              ? textContent.substring(0, 200) + '...'
                              : textContent;
                          })()}
                        </p>
                      </div>
                    )}
                    
                    {/* Status e Metadados */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(article.status)}
                        {article.metadata?.source_name && (
                          <span className="text-gray-600">
                            Fonte: <span className="font-medium">{article.metadata.source_name}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500">
                        {new Date(article.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewArticle(article)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </Button>
                    
                    {article.status !== 'published' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleScheduleArticle(article)}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Agendar
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePublishArticle(article)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Publicar
                        </Button>
                      </>
                    )}
                    
                    {article.status === 'published' && (
                      <>
                        {/* Botão Ver Online */}
                        {article.published_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={article.published_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Online
                            </a>
                          </Button>
                        )}
                        
                        {/* Botão Ver Original */}
                        {article.original_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={article.original_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Original
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteArticle(article)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {articles.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum artigo processado</h3>
                  <p className="text-gray-600 mb-4">Os artigos aparecerão aqui conforme forem processados pelos monitoramentos</p>
                  {monitoring.length === 0 && (
                    <p className="text-sm text-gray-500">Configure um monitoramento na aba "Monitoramento" para começar</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Aba Histórico */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Histórico de Artigos</h2>
              <p className="text-gray-600">Artigos excluídos e movidos para o histórico</p>
            </div>
          </div>

          <div className="space-y-4">
            {articles.filter(article => article.status === 'deleted').length > 0 ? (
              articles.filter(article => article.status === 'deleted').map((article) => (
                <Card key={article.id}>
                  <CardContent className="p-6">
                    <div className="text-xs text-gray-500 mb-3">
                      Excluído em: {new Date(article.updated_at).toLocaleString('pt-BR')}
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-700 mb-2">{article.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {(article.rewritten_content || article.content || article.original_content || '')
                            .replace(/<[^>]*>/g, '')
                            .substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Fonte: {article.news_monitoring?.news_source?.name || 'N/A'}</span>
                          <span>Site: {article.news_monitoring?.site?.nome || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewArticle(article)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Restaurar artigo para processados?')) {
                              await newsApi.articles.update(article.id, { status: 'processed' });
                              toast.success('Artigo restaurado!');
                              await loadArticles();
                            }
                          }}
                        >
                          Restaurar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum artigo no histórico</h3>
                  <p className="text-gray-600">Os artigos excluídos aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Aba Excluídos */}
      {activeTab === 'excluded' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Artigos Excluídos</h2>
              <p className="text-gray-600">Artigos ignorados durante o processamento</p>
            </div>
          </div>

          <div className="space-y-4">
            {articles.filter(article => article.status === 'ignored').length > 0 ? (
              articles.filter(article => article.status === 'ignored').map((article) => (
                <Card key={article.id}>
                  <CardContent className="p-6">
                    <div className="text-xs text-gray-500 mb-3">
                      Ignorado em: {new Date(article.updated_at).toLocaleString('pt-BR')}
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-700 mb-2">{article.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {(article.original_content || '')
                            .replace(/<[^>]*>/g, '')
                            .substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Fonte: {article.news_monitoring?.news_source?.name || 'N/A'}</span>
                          <span>Site: {article.news_monitoring?.site?.nome || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const articleWindow = window.open('', '_blank');
                            articleWindow.document.write(`
                              <html><body>
                                <h1>${article.title}</h1>
                                <div>${article.original_content || 'Conteúdo não disponível'}</div>
                              </body></html>
                            `);
                          }}
                        >
                          Ver Original
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Reprocessar este artigo?')) {
                              await newsApi.articles.update(article.id, { status: 'pending' });
                              toast.success('Artigo marcado para reprocessamento!');
                              await loadArticles();
                            }
                          }}
                        >
                          Reprocessar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <X className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum artigo excluído</h3>
                  <p className="text-gray-600">Os artigos ignorados aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal de Visualização do Artigo */}
      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Visualizar Artigo</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowArticleModal(false);
                  setSelectedArticle(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Informações do Artigo */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={
                    selectedArticle.status === 'published' ? 'bg-green-100 text-green-800 border-0' :
                    selectedArticle.status === 'processed' ? 'bg-blue-100 text-blue-800 border-0' :
                    selectedArticle.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-0' :
                    'bg-gray-100 text-gray-800 border-0'
                  }>
                    {selectedArticle.status === 'published' ? '✅ Publicado' :
                     selectedArticle.status === 'processed' ? '📝 Processado' :
                     selectedArticle.status === 'pending' ? '⏳ Pendente' :
                     '❌ Falhou'}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Processado em {new Date(selectedArticle.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* URL Original */}
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Artigo Original:</span>
                  <a 
                    href={selectedArticle.original_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 ml-2"
                  >
                    {selectedArticle.original_url}
                  </a>
                </div>

                {/* Site de Destino */}
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Site de Destino:</span>
                  {(() => {
                    // Buscar informações do site de destino com lógica melhorada
                    let targetSite = null;
                    
                    // Prioridade 1: Através da fonte (news_source_id)
                    if (selectedArticle.news_source_id) {
                      const articleSource = sources.find(s => s.id === selectedArticle.news_source_id);
                      if (articleSource?.target_site_id) {
                        targetSite = userSites.find(site => site.id === parseInt(articleSource.target_site_id));
                        debugLog('🎯 Site encontrado via fonte:', targetSite);
                      }
                    }
                    
                    // Prioridade 2: Através do monitoramento (news_monitoring)
                    if (!targetSite && selectedArticle.news_monitoring?.site_id) {
                      targetSite = userSites.find(site => site.id === selectedArticle.news_monitoring.site_id);
                      debugLog('🎯 Site encontrado via monitoramento:', targetSite);
                    }
                    
                    // Prioridade 3: Buscar diretamente pelo site vinculado ao artigo
                    if (!targetSite && selectedArticle.site_id) {
                      targetSite = userSites.find(site => site.id === selectedArticle.site_id);
                      debugLog('🎯 Site encontrado via site_id do artigo:', targetSite);
                    }
                    
                    // Debug para entender a estrutura
                    debugLog('🔍 Debug site de destino:', {
                      article: selectedArticle,
                      sources: sources,
                      userSites: userSites,
                      targetSite: targetSite
                    });
                    
                    return targetSite ? (
                      <span className="ml-2 text-purple-600 font-medium">
                        {targetSite.nome} ({targetSite.wordpress_url || targetSite.wordpressUrl || 'WordPress URL não configurada'})
                      </span>
                    ) : (
                      <span className="ml-2 text-gray-500">Site não identificado</span>
                    );
                  })()}
                </div>
              </div>

              {/* Título Reescrito */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {selectedArticle.title || 'Título não disponível'}
                </h1>
              </div>

              {/* Imagem Destacada */}
              {selectedArticle.featured_image_url && (
                <div className="mb-6">
                  <img 
                    src={selectedArticle.featured_image_url} 
                    alt="Imagem do artigo" 
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  
                  {/* Defesa da Fonte */}
                  <div className="text-center mt-2 text-xs text-gray-500">
                    Fonte: 
                    <a 
                      href={selectedArticle.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      {selectedArticle.original_url ? 
                        new URL(selectedArticle.original_url).hostname : 
                        'Fonte original'
                      }
                    </a>
                  </div>
                </div>
              )}

              {/* Conteúdo Reescrito */}
              <div className="prose max-w-none">
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: selectedArticle.rewritten_content || selectedArticle.original_content || 'Conteúdo não disponível'
                  }}
                />
              </div>

              {/* Informações Adicionais */}
              {selectedArticle.metadata && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Informações do Processamento</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Fonte:</span>
                      <p className="font-medium">{selectedArticle.metadata.source_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Site de destino:</span>
                      <p className="font-medium">{(() => {
                        // Buscar site com a mesma lógica do início do modal
                        let targetSite = null;
                        
                        // 1. Tentar buscar pelo monitoramento
                        if (selectedArticle.news_monitoring?.site?.nome) {
                          return selectedArticle.news_monitoring.site.nome;
                        }
                        
                        // 2. Através da fonte (news_source_id)
                        if (selectedArticle.news_source_id) {
                          const articleSource = sources.find(s => s.id === selectedArticle.news_source_id);
                          if (articleSource?.target_site_id) {
                            targetSite = userSites.find(site => site.id === parseInt(articleSource.target_site_id));
                          }
                        }
                        
                        // 3. Através do site_id direto
                        if (!targetSite && selectedArticle.site_id) {
                          targetSite = userSites.find(site => site.id === selectedArticle.site_id);
                        }
                        
                        // 4. Tentar buscar em sites do usuário pelos metadados
                        if (!targetSite && selectedArticle.metadata?.wordpress_site) {
                          return selectedArticle.metadata.wordpress_site;
                        }
                        
                        return targetSite ? targetSite.nome : 'Site não identificado';
                        
                        // 4. Fallback
                        return 'Site não definido';
                      })()}</p>
                    </div>
                    {selectedArticle.metadata.target_category && (
                      <div>
                        <span className="text-gray-600">Categoria:</span>
                        <p className="font-medium">{selectedArticle.metadata.target_category}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Reescrita ativada:</span>
                      <p className="font-medium">{selectedArticle.metadata.rewrite_content ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal com Ações */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowArticleModal(false);
                  setSelectedArticle(null);
                }}
                className="text-gray-600 hover:text-gray-700"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
