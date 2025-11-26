import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Lightbulb, CheckCircle, AlertCircle, Loader2, Zap, Monitor, RefreshCw, RotateCcw, User, Tag, FolderOpen, Megaphone, Image, Link, Type, Eye, ExternalLink, Edit3, ChevronRight, Plus, BarChart3 } from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { FREE_PLAN_LIMITS, getPlanLimits, isFreePlan } from '../../utils/constants';
import { toast } from 'sonner';
import { wordpressService, WordPressCategory, WordPressAuthor, WordPressTag } from '../../services/wordpressService';
import { contentService } from '../../services/contentService';
import { getSiteName } from '../../utils/siteUtils';

interface GerarIdeiasProps {
  userData: any;
  onPageChange?: (page: string) => void;
  onUpdateUser?: (userData: any) => Promise<boolean>;
}

interface FormData {
  siteId: string;
  nicho: string;
  palavrasChave: string;
  quantidade: number;
  idioma: string;
  contexto: string;
  autor: string;
  categorias: string[];
  tags: string[];
  ctaTitulo: string;
  ctaDescricao: string;
  ctaBotao: string;
  ctaLink: string;
  ctaImagem: string;
  ctaPosicao: 'inicio' | 'meio' | 'final';
}

interface WordPressData {
  categories: WordPressCategory[];
  authors: WordPressAuthor[];
  tags: WordPressTag[];
}

export function GerarIdeias({ userData, onPageChange, onUpdateUser }: GerarIdeiasProps) {
  const { state, actions } = useBia();
  const { dashboardData, loading: isDashboardLoading, error: dashboardError } = useDashboard();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    siteId: '',
    nicho: '',
    palavrasChave: '',
    quantidade: 5,
    idioma: 'Português',
    contexto: '',
    autor: 'none',
    categorias: [],
    tags: [],
    ctaTitulo: '',
    ctaDescricao: '',
    ctaBotao: '',
    ctaLink: '',
    ctaImagem: '',
    ctaPosicao: 'final'
  });

  const [wordpressData, setWordpressData] = useState<WordPressData>({
    categories: [],
    authors: [],
    tags: []
  });
  const [isLoadingWordPress, setIsLoadingWordPress] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [apiDiagnostic, setApiDiagnostic] = useState<{
    checked: boolean;
    hasKey: boolean;
    isValid: boolean;
    error?: string;
    details?: string;
  }>({ checked: false, hasKey: false, isValid: false });

  // Estado para dados da última geração
  const [lastGenerationData, setLastGenerationData] = useState<FormData | null>(null);
  const [hasLastGeneration, setHasLastGeneration] = useState(false);
  
  // Usar ref para evitar recarregamentos desnecessários
  const loadingRef = useRef<string | null>(null);
  // Dados reais do dashboard (seguindo padrão das outras páginas)
  const { user, limits: realPlanLimits, usage } = dashboardData || {};
  const currentUser = user || state.user || userData;
  const planLimits = realPlanLimits || getPlanLimits(currentUser?.plano || 'Free');
  const currentPlan = currentUser?.plano || 'Free';
  const isAdminOrDev = currentUser?.is_admin || currentUser?.is_developer;
  const isDev = currentUser?.email === 'dev@bia.com' || currentUser?.email === 'admin@bia.com' || isAdminOrDev;

  // Ref para controle de site carregado
  const lastLoadedSiteRef = useRef<string | null>(null);

  // Verificar limites do plano e obter dados corretos
  const limits = actions.checkFreePlanLimits();
  const isFree = actions.isFreePlan();

  // Filtrar apenas sites ativos - memorizar para evitar recriação
  const activeSites = React.useMemo(() => 
    state.sites.filter(site => site.status === 'ativo'), 
    [state.sites]
  );

  // Auto-selecionar primeiro site se nenhum estiver selecionado
  React.useEffect(() => {
    if (!formData.siteId && activeSites.length > 0) {
      const firstSite = activeSites[0];
      console.log('🎯 Auto-selecionando primeiro site ativo:', firstSite.nome, 'ID:', firstSite.id);
      setFormData(prev => ({
        ...prev,
        siteId: firstSite.id.toString()
      }));
    }
  }, [activeSites, formData.siteId]);

  // Filtrar ideias pendentes para exibir na seção "Produzir a partir de Ideias"
  const pendingIdeas = React.useMemo(() => 
    state.ideas.filter(idea => idea.status === 'ativa'),
    [state.ideas]
  );

  // Estatísticas com dados reais do dashboard
  const ideasUsed = state.ideas.length;
  const ideasUnlimited = usage?.ideas?.unlimited ?? (isDev || planLimits.ideas >= 999999);
  const isReallyFreePlan = currentPlan === 'Free';
  
  // LÓGICA SIMPLIFICADA E CORRIGIDA:
  // - Usuários Free: têm direito a 10 ideias SEMPRE (é o limite básico do plano)
  // - Outros planos: ilimitado
  const freeBasicIdeas = 10; // Limite base do plano Free
  
  const hasUnlimitedIdeas = isDev || !isReallyFreePlan;
  
  const ideasRemaining = hasUnlimitedIdeas ? 'Ilimitado' : Math.max(0, freeBasicIdeas - ideasUsed);
  const progressValue = hasUnlimitedIdeas ? 0 : (ideasUsed / freeBasicIdeas) * 100;

  // Verificar se tem dados suficientes para mostrar preview do CTA
  const hasCtaContent = formData.ctaTitulo || formData.ctaDescricao || formData.ctaBotao || formData.ctaLink;

  // Verificar se o formulário está válido para permitir geração
  const isFormValid = formData.siteId && formData.nicho.trim() && formData.palavrasChave.trim() && formData.quantidade >= 1;

  // Função para salvar dados da última geração no localStorage
  const saveLastGenerationData = useCallback((data: FormData) => {
    try {
      const dataToSave = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(`bia_last_generation_${currentUser?.id || 'guest'}`, JSON.stringify(dataToSave));
      console.log('💾 Dados da última geração salvos');
    } catch (error) {
      console.warn('Erro ao salvar dados da última geração:', error);
    }
  }, [currentUser?.id]);

  // Função para carregar dados da última geração
  const loadLastGenerationData = useCallback(() => {
    try {
      const saved = localStorage.getItem(`bia_last_generation_${currentUser?.id || 'guest'}`);
      if (saved) {
        const data = JSON.parse(saved);
        // Verificar se os dados não são muito antigos (7 dias)
        if (data.timestamp && (Date.now() - data.timestamp) < 7 * 24 * 60 * 60 * 1000) {
          delete data.timestamp; // Remover timestamp antes de usar
          setLastGenerationData(data);
          setHasLastGeneration(true);
          console.log('📂 Dados da última geração carregados');
          return data;
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar dados da última geração:', error);
    }
    setHasLastGeneration(false);
    return null;
  }, [currentUser?.id]);

  // Função para aplicar dados da última geração ao formulário
  const applyLastGenerationData = useCallback(() => {
    if (lastGenerationData) {
      // Aplicar apenas os dados relevantes, mantendo o siteId atual se já selecionado
      setFormData(prev => ({
        ...prev,
        nicho: lastGenerationData.nicho || prev.nicho,
        palavrasChave: lastGenerationData.palavrasChave || prev.palavrasChave,
        quantidade: lastGenerationData.quantidade || prev.quantidade,
        idioma: lastGenerationData.idioma || prev.idioma,
        contexto: lastGenerationData.contexto || prev.contexto,
        autor: lastGenerationData.autor || prev.autor,
        categorias: lastGenerationData.categorias || prev.categorias,
        tags: lastGenerationData.tags || prev.tags,
        ctaTitulo: lastGenerationData.ctaTitulo || prev.ctaTitulo,
        ctaDescricao: lastGenerationData.ctaDescricao || prev.ctaDescricao,
        ctaBotao: lastGenerationData.ctaBotao || prev.ctaBotao,
        ctaLink: lastGenerationData.ctaLink || prev.ctaLink,
        ctaImagem: lastGenerationData.ctaImagem || prev.ctaImagem,
        ctaPosicao: lastGenerationData.ctaPosicao || prev.ctaPosicao
      }));
      
      toast.success('Dados da última geração aplicados!', {
        description: 'Revise e ajuste conforme necessário'
      });
      
      console.log('✅ Dados da última geração aplicados ao formulário');
    }
  }, [lastGenerationData]);

  // Sincronizar dados WordPress na inicialização e verificar OpenAI
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Sincronizar WordPress
        await wordpressService.syncFromBiaContext();
        
        // Verificar status da API OpenAI
        console.log('🔬 Verificando status da chave OpenAI...');
        const diagnostic = await contentService.testConnection();
        
        setApiDiagnostic({
          checked: true,
          hasKey: diagnostic.success,
          isValid: diagnostic.success,
          error: diagnostic.error,
          details: diagnostic.details
        });
        
        if (diagnostic.success) {
          console.log('✅ Sistema OpenAI funcionando corretamente');
        } else {
          console.warn('⚠️ Problema detectado no sistema OpenAI:', {
            success: diagnostic.success,
            message: diagnostic.message,
            details: diagnostic.details
          });
        }
      } catch (error) {
        console.warn('Erro na inicialização dos serviços:', error);
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

  // Carregar dados da última geração quando o usuário estiver disponível
  useEffect(() => {
    if (currentUser?.id) {
      loadLastGenerationData();
    }
  }, [currentUser?.id, loadLastGenerationData]);

  // Recarregar wordpressService quando sites do BiaContext mudarem
  useEffect(() => {
    const syncWordPressOnSitesChange = async () => {
      try {
        console.log('🔄 Sites do BiaContext foram atualizados, sincronizando wordpressService...');
        await wordpressService.syncFromBiaContext();
      } catch (error) {
        console.warn('⚠️ Erro ao sincronizar wordpressService após mudança nos sites:', error);
      }
    };

    if (state.sites.length > 0) {
      syncWordPressOnSitesChange();
    }
  }, [state.sites]);

  // Função para testar a API OpenAI
  const handleTestApiKey = async () => {
    console.log('🧪 Testando sistema de IA...');
    
    try {
      const testResult = await contentService.testConnection();
      
      if (testResult.success) {
        toast.success('Sistema de IA funcionando corretamente!');
        setApiDiagnostic(prev => ({
          ...prev,
          hasKey: true,
          isValid: true,
          error: undefined,
          details: testResult.details
        }));
      } else {
        toast.error('Não foi possível gerar ideias no momento. Tente novamente em alguns minutos.');
        setApiDiagnostic(prev => ({
          ...prev,
          hasKey: false,
          isValid: false,
          error: testResult.error,
          details: testResult.details
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao testar sistema:', error);
      toast.error('Erro ao testar a conexão com o sistema de IA');
    }
  };

  // Funções de WordPress permanecem as mesmas...
  const loadCachedWordPressData = useCallback((site: any) => {
    try {
      console.log('🔍 Tentando carregar dados WordPress do cache para site:', site.nome);
      
      // Primeiro, verificar se o site já tem dados WordPress no BiaContext
      if (site.wordpressData && typeof site.wordpressData === 'object') {
        const wpData = site.wordpressData;
        const hasDirectData = (wpData.categories?.length || 0) > 0 || 
                             (wpData.authors?.length || 0) > 0 || 
                             (wpData.tags?.length || 0) > 0;
        
        if (hasDirectData) {
          console.log('✅ Dados WordPress encontrados diretamente no site do BiaContext');
          
          setWordpressData({
            categories: wpData.categories || [],
            authors: wpData.authors || [],
            tags: wpData.tags || []
          });
          
          setIsLoadingWordPress(false);
          return true;
        }
      }
      
      // Se não encontrou dados diretos, verificar cache do wordpressService
      const cachedSite = wordpressService.getSiteById(site.id.toString());
      
      if (cachedSite) {
        const hasRealData = (cachedSite.categories?.length || 0) > 0 || 
                           (cachedSite.authors?.length || 0) > 0 || 
                           (cachedSite.tags?.length || 0) > 0;
        
        if (hasRealData) {
          console.log('✅ Cache contém dados reais, usando cache');
          
          setWordpressData({
            categories: cachedSite.categories || [],
            authors: cachedSite.authors || [],
            tags: cachedSite.tags || []
          });
          
          setIsLoadingWordPress(false);
          return true;
        }
      }
    } catch (error) {
      console.warn('❌ Erro ao carregar dados do cache:', error);
    }
    
    return false;
  }, []);

  const loadWordPressData = useCallback(async (site: any) => {
    const siteKey = `${site.id}-${site.wordpressUrl}`;
    if (loadingRef.current === siteKey) {
      console.log('🔄 Carregamento já em andamento para este site, ignorando...');
      return;
    }

    loadingRef.current = siteKey;
    setIsLoadingWordPress(true);
    
    try {
      console.log('🔄 Carregando dados FRESCOS do WordPress para site:', site.nome);
      
      if (!site.wordpressUrl || !site.wordpressUsername || !site.wordpressPassword) {
        console.warn('⚠️ Site não tem dados WordPress completos');
        setWordpressData({
          categories: [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }],
          authors: [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }],
          tags: []
        });
        lastLoadedSiteRef.current = siteKey;
        return;
      }

      const success = await wordpressService.reloadSiteData(site.id);
      
      if (success) {
        const updatedSite = wordpressService.getSiteById(site.id.toString());
        
        if (updatedSite && (updatedSite.categories.length > 0 || updatedSite.authors.length > 0)) {
          console.log('✅ Dados WordPress FRESCOS recarregados com sucesso');
          
          setWordpressData({
            categories: updatedSite.categories,
            authors: updatedSite.authors,
            tags: updatedSite.tags
          });
          
          lastLoadedSiteRef.current = siteKey;
          return;
        }
      }
      
      setWordpressData({
        categories: [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }],
        authors: [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }],
        tags: []
      });
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar dados do WordPress:', error);
      setWordpressData({
        categories: [{ id: 1, name: 'Sem categoria', slug: 'sem-categoria', parent: 0 }],
        authors: [{ id: 1, name: 'Admin', slug: 'admin', description: 'Administrador' }],
        tags: []
      });
    } finally {
      setIsLoadingWordPress(false);
      loadingRef.current = null;
    }
  }, []);

  // Função para sincronização manual
  const handleManualSync = async () => {
    if (!formData.siteId) {
      toast.error('Selecione um site primeiro');
      return;
    }
    
    const selectedSite = activeSites.find(site => site.id.toString() === formData.siteId);
    if (!selectedSite) {
      toast.error('Site não encontrado');
      return;
    }

    try {
      toast.info('Sincronizando dados do WordPress...', {
        duration: 0, // Manter toast até a conclusão
        id: 'sync-toast'
      });

      // Forçar sincronização completa do BiaContext
      console.log('🔄 Iniciando sincronização completa...');
      
      // 1. Forçar sincronização do wordpressService com dados atualizados
      await wordpressService.syncFromBiaContext();
      
      // 2. Recarregar dados específicos do site com dados frescos do WordPress
      if (selectedSite) {
        await loadWordPressData(selectedSite);
      }
      
      toast.dismiss('sync-toast');
      toast.success('Dados sincronizados com sucesso!');
      
      console.log('✅ Sincronização completa finalizada');
    } catch (error) {
      console.error('Erro na sincronização manual:', error);
      toast.dismiss('sync-toast');
      
      // Fornecer feedback mais específico sobre o erro
      let errorMessage = 'Erro ao sincronizar dados. ';
      if (error instanceof Error) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage += 'Verifique sua conexão com a internet.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage += 'Credenciais WordPress inválidas.';
        } else if (error.message.includes('404')) {
          errorMessage += 'Site WordPress não encontrado.';
        } else {
          errorMessage += 'Tente atualizar a página e tentar novamente.';
        }
      } else {
        errorMessage += 'Se o problema persistir, tente atualizar a página.';
      }
      
      toast.error(errorMessage);
    }
  };

  // Carregar dados do WordPress quando um site for selecionado
  useEffect(() => {
    const loadSiteData = async () => {
      if (!formData.siteId) {
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        setIsLoadingWordPress(false);
        lastLoadedSiteRef.current = null;
        return;
      }

      const site = activeSites.find(s => s.id.toString() === formData.siteId);
      if (!site) {
        console.warn('❌ Site não encontrado no BiaContext:', formData.siteId);
        
        // Se o site não foi encontrado, pode ser que o BiaContext não esteja sincronizado
        // Tentar forçar sincronização do WordPress
        try {
          console.log('🔄 Site não encontrado, tentando sincronizar dados WordPress...');
          await wordpressService.syncFromBiaContext();
          
          // Após sincronizar, buscar no WordPress Service
          const wpSite = wordpressService.getSiteById(formData.siteId);
          if (wpSite) {
            console.log('✅ Site encontrado no WordPress Service');
            // Continuar com o carregamento usando o site encontrado do WordPress
            if (wpSite.url && wpSite.username && wpSite.applicationPassword) {
              const hasCachedData = loadCachedWordPressData({
                id: wpSite.id,
                wordpressUrl: wpSite.url,
                wordpressUsername: wpSite.username,
                wordpressPassword: wpSite.applicationPassword
              });
              
              if (hasCachedData) {
                console.log('✅ Dados em cache encontrados e carregados - usando cache');
              } else {
                console.log('📡 Sem dados válidos no cache, carregando dados frescos...');
                setIsLoadingWordPress(true);
                await loadWordPressData({
                  id: wpSite.id,
                  wordpressUrl: wpSite.url,
                  wordpressUsername: wpSite.username,
                  wordpressPassword: wpSite.applicationPassword
                });
              }
            } else {
              console.log('⚠️ Site encontrado sem dados WordPress completos');
              setWordpressData({
                categories: [],
                authors: [],
                tags: []
              });
              setIsLoadingWordPress(false);
            }
          } else {
            console.log('❌ Site ainda não encontrado após recarregar BiaContext');
          }
        } catch (error) {
          console.error('❌ Erro ao tentar recarregar sites:', error);
        }
        
        return;
      }

      if (site.wordpressUrl && site.wordpressUsername && site.wordpressPassword) {
        const hasCachedData = loadCachedWordPressData(site);
        
        if (hasCachedData) {
          console.log('✅ Dados em cache encontrados e carregados - usando cache');
          // Não chama loadWordPressData quando há cache válido
        } else {
          console.log('📡 Sem dados válidos no cache, carregando dados frescos...');
          setIsLoadingWordPress(true);
          await loadWordPressData(site);
        }
      } else {
        console.log('⚠️ Site sem dados WordPress completos');
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        setIsLoadingWordPress(false);
        lastLoadedSiteRef.current = null;
      }
    };

    loadSiteData();
  }, [formData.siteId, state.sites, actions, loadCachedWordPressData, loadWordPressData]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuantidadeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const quantidade = parseInt(numericValue) || 0;
    const validQuantidade = Math.min(Math.max(quantidade, 0), 99);
    
    setFormData(prev => ({ ...prev, quantidade: validQuantidade }));
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorias: checked 
        ? [...prev.categorias, categoryId]
        : prev.categorias.filter(id => id !== categoryId)
    }));
  };

  const handleTagToggle = (tagSlug: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tags: checked 
        ? [...prev.tags, tagSlug]
        : prev.tags.filter(slug => slug !== tagSlug)
    }));
  };

  const handleAddNewTag = async () => {
    if (!newTag.trim()) {
      toast.error('Digite o nome da nova tag');
      return;
    }

    const tagSlug = newTag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    
    if (wordpressData.tags.some(tag => tag.slug === tagSlug)) {
      toast.error('Esta tag já existe');
      return;
    }

    try {
      // Buscar site selecionado
      const selectedSite = activeSites.find(site => site.id.toString() === formData.siteId);
      
      if (!selectedSite || !selectedSite.wordpressUrl) {
        toast.error('Site WordPress não encontrado ou não configurado');
        return;
      }

      console.log('🏷️ Criando tag no WordPress:', newTag.trim());
      toast.loading('Criando tag no WordPress...');

      // Criar tag no WordPress usando o wordpressService
      const createdTag = await wordpressService.createTag(selectedSite, {
        name: newTag.trim(),
        slug: tagSlug
      });

      // Adicionar a tag criada ao estado local
      setWordpressData(prev => ({
        ...prev,
        tags: [...prev.tags, createdTag]
      }));

      // Selecionar a nova tag automaticamente
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagSlug]
      }));

      setNewTag('');
      toast.dismiss();
      toast.success(`Tag "${createdTag.name}" criada no WordPress e selecionada`);

    } catch (error: any) {
      console.error('❌ Erro ao criar tag no WordPress:', error);
      toast.dismiss();
      toast.error(`Erro ao criar tag: ${error.message || 'Erro desconhecido'}`);
      
      // Fallback: adicionar apenas localmente se a criação no WordPress falhar
      const newTagObject = {
        id: Date.now(),
        name: newTag.trim(),
        slug: tagSlug,
        count: 0
      };

      setWordpressData(prev => ({
        ...prev,
        tags: [...prev.tags, newTagObject]
      }));

      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagSlug]
      }));

      setNewTag('');
      toast.warning(`Tag "${newTag.trim()}" adicionada apenas localmente (erro no WordPress)`);
    }
  };

  const handleGenerate = async () => {
    // Verificar se o plano permite gerar ideias - CORREÇÃO: usuários Free têm direito a 10 ideias
    if (isReallyFreePlan && !isDev && ideasUsed >= freeBasicIdeas) {
      toast.error(`Limite atingido! Seu plano permite apenas ${freeBasicIdeas} ideias. Faça upgrade para gerar mais ideias.`);
      return;
    }

    if (!formData.siteId) {
      toast.error('Selecione um site para gerar ideias.');
      return;
    }

    if (!formData.nicho.trim() || !formData.palavrasChave.trim()) {
      toast.error('Preencha o nicho e as palavras-chave para gerar ideias.');
      return;
    }

    if (formData.quantidade < 1 || formData.quantidade > 99) {
      toast.error('A quantidade deve ser entre 1 e 99 ideias.');
      return;
    }

    // Verificar se a API está funcionando
    if (!apiDiagnostic.hasKey || !apiDiagnostic.isValid) {
      toast.error('Não foi possível gerar ideias no momento. Tente novamente em alguns minutos.');
      return;
    }

    setIsGenerating(true);

    try {
      const selectedSite = activeSites.find(site => site.id.toString() === formData.siteId);
      const selectedAuthor = formData.autor && formData.autor !== 'none'
        ? wordpressData.authors.find(author => author.id.toString() === formData.autor)
        : null;
      
      const selectedCategories = formData.categorias.map(catId => 
        wordpressData.categories.find(cat => cat.id.toString() === catId)
      ).filter(Boolean);

      // Usar contentService para gerar ideias
      console.log('🤖 Gerando ideias com contentService...');
      
      // Montar objeto CTA se configurado
      const ctaData = formData.ctaTitulo || formData.ctaDescricao || formData.ctaBotao || formData.ctaLink ? {
        titulo: formData.ctaTitulo,
        descricao: formData.ctaDescricao,
        botao: formData.ctaBotao,
        link: formData.ctaLink,
        imagem: formData.ctaImagem,
        posicao: formData.ctaPosicao
      } : undefined;

      console.log('📢 CTA configurado:', ctaData ? 'SIM' : 'NÃO', ctaData);
      
      const result = await contentService.generateIdeas({
        nicho: formData.nicho,
        palavrasChave: formData.palavrasChave,
        quantidade: formData.quantidade,
        idioma: formData.idioma,
        contexto: formData.contexto,
        empresa: selectedSite?.nome || '',
        siteId: formData.siteId, // Manter como string UUID
        autor: formData.autor,
        categorias: formData.categorias,
        tags: formData.tags,
        cta: ctaData
      });

      console.log('🔍 DEBUG - Resultado completo do generateIdeas:', {
        success: result.success,
        hasIdeas: !!result.ideas,
        ideasLength: result.ideas?.length || 0,
        ideas: result.ideas,
        error: result.error
      });

      if (!result.success) {
        console.error('❌ Falha na geração de ideias:', result.error);
        toast.error(result.error || 'Erro ao gerar ideias');
        return;
      }

      // Processar resposta do contentService
      let ideiasList: string[] = result.ideas || [];

      // Se ideas não é um array, tentar extrair de diferentes estruturas possíveis
      if (!Array.isArray(ideiasList)) {
        console.warn('⚠️ Ideas não é um array, tentando extrair...', ideiasList);
        
        // Tentar diferentes estruturas de resposta possíveis
        if (typeof ideiasList === 'string') {
          // Se for string, pode ser uma lista separada por quebras de linha
          ideiasList = (ideiasList as string).split('\n').filter(line => line.trim());
        } else if (ideiasList && typeof ideiasList === 'object') {
          // Se for objeto, tentar acessar propriedades comuns
          const ideasObj = ideiasList as any;
          ideiasList = ideasObj.data || ideasObj.items || ideasObj.list || [];
        }
      }

      console.log('🔍 DEBUG - IdeiasList após processamento:', {
        ideiasList,
        length: ideiasList.length,
        type: typeof ideiasList,
        isArray: Array.isArray(ideiasList)
      });

      if (!ideiasList || !Array.isArray(ideiasList) || ideiasList.length === 0) {
        console.warn('⚠️ Array de ideias está vazio ou inválido');
        console.log('📊 Debug completo da resposta:', result);
        toast.error('Nenhuma ideia foi gerada. Tente novamente.');
        return;
      }

      // Criar objetos de ideia para adicionar ao contexto
      console.log('🔍 DEBUG - Dados para criação de ideias:', {
        selectedSiteId: selectedSite?.id,
        selectedSiteIdType: typeof selectedSite?.id,
        formDataSiteId: formData.siteId,
        formDataSiteIdType: typeof formData.siteId,
        selectedSiteName: selectedSite?.nome
      });

      const newIdeas = ideiasList.map((titulo: string, index: number) => {
        const tituloLimpo = (titulo as string).replace(/^\d+\.\s*/, '').replace(/['"]/g, '').trim();
        
        console.log('🔍 DEBUG - Criando ideia:', {
          titulo: tituloLimpo,
          formDataSiteId: formData.siteId,
          formDataSiteIdType: typeof formData.siteId,
          selectedSite: selectedSite ? { id: selectedSite.id, uuid: selectedSite.uuid, nome: selectedSite.nome } : null
        });
        
        const ideaData = {
          titulo: tituloLimpo,
          descricao: `Ideia gerada para o nicho de ${formData.nicho}, focando nas palavras-chave: ${formData.palavrasChave}. Site: ${selectedSite?.nome}. ${selectedAuthor ? `Autor: ${selectedAuthor.name}. ` : ''}${selectedCategories.length > 0 ? `Categorias: ${selectedCategories.map(c => c?.name).join(', ')}. ` : ''}${formData.contexto ? `Contexto adicional: ${formData.contexto}` : ''}`,
          categoria: selectedCategories.length > 0 ? selectedCategories[0]?.name || formData.nicho : formData.nicho,
          tags: [
            ...formData.palavrasChave.split(',').map(tag => tag.trim()),
            ...formData.tags.map(tagSlug => {
              const tag = wordpressData.tags.find(t => t.slug === tagSlug);
              return tag ? tag.name : tagSlug;
            })
          ],
          siteId: formData.siteId,
          status: 'ativa' as const,
          wordpressData: {
            autor: selectedAuthor?.id || null,
            categorias: formData.categorias.map(id => parseInt(id)),
            tags: formData.tags,
          },
          cta: formData.ctaTitulo || formData.ctaDescricao || formData.ctaBotao ? {
            titulo: formData.ctaTitulo,
            descricao: formData.ctaDescricao,
            botao: formData.ctaBotao,
            link: formData.ctaLink,
            imagem: formData.ctaImagem,
            posicao: formData.ctaPosicao
          } : null,
          generationParams: {
            nicho: formData.nicho,
            palavrasChave: formData.palavrasChave,
            idioma: formData.idioma,
            contexto: formData.contexto
          }
        };

        console.log('💡 Ideia criada:', { titulo: ideaData.titulo, siteId: ideaData.siteId, siteIdType: typeof ideaData.siteId });
        return ideaData;
      });

      const success = await actions.addIdeas(newIdeas);
      
      if (success) {
        // ✅ CORREÇÃO: Forçar atualização do estado após adicionar ideias
        console.log('🔄 Forçando atualização do estado após geração de ideias...');
        try {
          await actions.loadFromDatabase();
          console.log('✅ Estado atualizado após geração de ideias');
        } catch (error) {
          console.error('⚠️ Erro ao atualizar estado após geração:', error);
        }
        
        // Salvar dados da geração bem-sucedida ANTES do reset
        saveLastGenerationData(formData);
        
        toast.success(`${newIdeas.length} ideia(s) gerada(s) com sucesso usando IA para ${selectedSite?.nome}!`);
        
        // Reset form on success (mantendo apenas o siteId)
        const currentSiteId = formData.siteId;
        setFormData({
          siteId: currentSiteId, // Manter site selecionado
          nicho: '',
          palavrasChave: '',
          quantidade: 5,
          idioma: 'Português',
          contexto: '',
          autor: 'none',
          categorias: [],
          tags: [],
          ctaTitulo: '',
          ctaDescricao: '',
          ctaBotao: '',
          ctaLink: '',
          ctaImagem: '',
          ctaPosicao: 'final'
        });
        
        // Atualizar estado para mostrar que temos dados da última geração
        setHasLastGeneration(true);
        setWordpressData({
          categories: [],
          authors: [],
          tags: []
        });
        lastLoadedSiteRef.current = null;
      } else {
        toast.error('Erro ao salvar as ideias. Verifique se não atingiu o limite do seu plano.');
      }

    } catch (error) {
      console.error('Erro ao gerar ideias:', error);
      toast.error('Erro temporário na geração de ideias. Tente novamente em alguns instantes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoToArticles = () => {
    if (onPageChange) {
      onPageChange('articles');
    }
  };

  const renderCtaPreview = () => {
    if (!hasCtaContent) return null;

    const ctaComponent = (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-dashed border-purple-300 rounded-lg p-6" style={{ textAlign: 'center' }}>
        <div className="max-w-2xl mx-auto" style={{ textAlign: 'center' }}>
          {formData.ctaImagem && (
            <div className="mb-4 flex justify-center" style={{ textAlign: 'center' }}>
              <div className="relative inline-block">
                <img 
                  src={formData.ctaImagem} 
                  alt="CTA Preview" 
                  className="rounded-lg shadow-lg border-2 border-purple-200"
                  style={{
                    maxWidth: '400px',
                    maxHeight: '300px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    console.log('Imagem CTA carregada:', {
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight,
                      displayWidth: img.width,
                      displayHeight: img.height
                    });
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full shadow-md">
                  Preview
                </div>
              </div>
            </div>
          )}
          
          {formData.ctaTitulo && (
            <h3 className="font-poppins text-xl text-purple-800 mb-3" style={{ textAlign: 'center' }}>
              {formData.ctaTitulo}
            </h3>
          )}
          
          {formData.ctaDescricao && (
            <p className="font-montserrat text-gray-700 mb-4" style={{ textAlign: 'center' }}>
              {formData.ctaDescricao}
            </p>
          )}
          
          {formData.ctaBotao && (
            <div style={{ textAlign: 'center' }}>
              <Button 
                className="font-montserrat btn-bia px-6 py-2"
                disabled
              >
                {formData.ctaBotao}
                {formData.ctaLink && <ExternalLink className="ml-2 h-4 w-4 text-current" />}
              </Button>
            </div>
          )}
          
          {formData.ctaLink && (
            <div className="mt-2" style={{ textAlign: 'center' }}>
              <span className="font-montserrat text-xs text-gray-500">
                Link: {formData.ctaLink}
              </span>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-poppins flex items-center">
            <Eye className="mr-2 h-5 w-5 text-purple-600" />
            Preview do CTA (Aparecerá no {formData.ctaPosicao} do artigo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ctaComponent}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header - Padronizado com estilo das outras páginas */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Gerar Ideias
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Use IA para criar ideias de conteúdo otimizadas para seu nicho
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
                <strong>Serviço temporariamente indisponível:</strong> {
                  apiDiagnostic.error === 'Token de autenticação inválido'
                    ? 'Sua sessão expirou. Faça login novamente para continuar.'
                    : 'Não foi possível conectar com o sistema de geração de ideias. Tente novamente em alguns minutos ou entre em contato com nosso suporte se o problema persistir.'
                }
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

      {/* Status do Plano - Seguindo padrão do Calendário */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Status do Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Ideias Restantes</p>
                  <p className="font-poppins text-lg font-medium text-foreground">{ideasRemaining}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Disponíveis para uso
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Ideias Utilizadas</p>
                  <p className="font-poppins text-lg font-medium text-foreground">{ideasUsed}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Geradas neste período
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
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
                    {apiDiagnostic.hasKey && apiDiagnostic.isValid ? 'Online' : 'Offline'}
                  </p>
                  <p className="font-montserrat text-xs text-muted-foreground">
                    Status do serviço
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra de progresso */}
          {!hasUnlimitedIdeas && (
            <div className="mt-4 p-3 rounded-lg bg-white border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-montserrat text-sm text-muted-foreground">Progresso do plano</span>
                  <span className="font-montserrat text-sm font-medium">{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            </div>
          )}
          
          {hasUnlimitedIdeas && (
            <div className="mt-4 p-3 rounded-lg bg-white border">
              <p className="font-montserrat text-sm text-muted-foreground text-center">
                ✨ Plano {currentPlan} • 💡 Ideias ilimitadas • 🚀 Sem limitações
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerta de limite - só para planos realmente gratuitos que atingiram o limite */}
      {isReallyFreePlan && !isDev && ideasUsed >= freeBasicIdeas && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 font-montserrat">
            <strong>Limite atingido!</strong> Você utilizou todas as {freeBasicIdeas} ideias do plano gratuito.
            Faça upgrade para gerar mais ideias.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulário de geração - Seguindo padrão do Calendário */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <Lightbulb size={20} style={{ color: '#8c52ff' }} />
            Gerar Novas Ideias
            {apiDiagnostic.checked && (
              <div className={`w-2 h-2 rounded-full ml-2 ${
                apiDiagnostic.hasKey && apiDiagnostic.isValid 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
              }`} />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção do Site */}
          <div className="space-y-2">
            <Label className="font-montserrat">Site</Label>
            <Select value={formData.siteId} onValueChange={(value) => handleInputChange('siteId', value)}>
              <SelectTrigger className="font-montserrat">
                <SelectValue placeholder="Selecione um site ativo" />
              </SelectTrigger>
              <SelectContent>
                {activeSites.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum site ativo encontrado
                  </SelectItem>
                ) : (
                  activeSites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <span className="font-montserrat">{site.nome}</span>
                        <Badge className="text-xs bg-[#8B5FBF] text-white border-none px-1 rounded">
                          {site.categoria}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Botão para carregar últimas informações */}
          {formData.siteId && hasLastGeneration && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={applyLastGenerationData}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Carregar Últimas Informações</span>
              </button>
              <p className="text-sm text-gray-600 text-center">
                Preenche automaticamente com os dados da última geração de ideias
              </p>
            </div>
          )}

          {/* Dados básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-montserrat">Nicho</Label>
              <Input
                value={formData.nicho}
                onChange={(e) => handleInputChange('nicho', e.target.value)}
                placeholder="Ex: Marketing Digital, Culinária, Tecnologia"
                className="font-montserrat"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-montserrat">Palavras-chave</Label>
              <Input
                value={formData.palavrasChave}
                onChange={(e) => handleInputChange('palavrasChave', e.target.value)}
                placeholder="Ex: SEO, redes sociais, estratégias"
                className="font-montserrat"
              />
            </div>
          </div>

          {/* Configurações de geração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-montserrat">Quantidade de ideias (1-99)</Label>
              <Input
                type="text"
                value={formData.quantidade.toString()}
                onChange={(e) => handleQuantidadeChange(e.target.value)}
                placeholder="Digite um número de 1 a 99"
                className="font-montserrat"
                min="1"
                max="99"
              />
              <p className="text-xs text-gray-500 font-montserrat">
                Digite um número entre 1 e 99
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-montserrat">Idioma</Label>
              <Select value={formData.idioma} onValueChange={(value) => handleInputChange('idioma', value)}>
                <SelectTrigger className="font-montserrat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Português">Português</SelectItem>
                  <SelectItem value="Inglês">Inglês</SelectItem>
                  <SelectItem value="Espanhol">Espanhol</SelectItem>
                  <SelectItem value="Francês">Francês</SelectItem>
                  <SelectItem value="Italiano">Italiano</SelectItem>
                  <SelectItem value="Mandarim">Mandarim</SelectItem>
                  <SelectItem value="Russo">Russo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contexto adicional */}
          <div className="space-y-2">
            <Label className="font-montserrat">Contexto adicional (opcional)</Label>
            <Textarea
              value={formData.contexto}
              onChange={(e) => handleInputChange('contexto', e.target.value)}
              placeholder="Forneça informações adicionais sobre o público-alvo, tom desejado, objetivos específicos..."
              className="font-montserrat min-h-[80px]"
            />
          </div>

          {/* Dados WordPress - Seguindo padrão das Ações Rápidas */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
                <Monitor size={20} style={{ color: '#8c52ff' }} />
                Configurações WordPress
                {isLoadingWordPress && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </h3>
              
              {/* Botão de Sincronização */}
              <Button
                type="button"
                onClick={handleManualSync}
                disabled={!formData.siteId || isLoadingWordPress}
                className="px-3 py-2 border text-white"
                style={{ backgroundColor: '#8c52ff' }}
                title="Sincronizar dados do WordPress"
              >
                {isLoadingWordPress ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar
              </Button>
            </div>

            {!formData.siteId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="font-montserrat">Selecione um site para configurar as opções do WordPress</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Autor */}
                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <User size={16} />
                    Autor
                  </Label>
                  <Select value={formData.autor} onValueChange={(value) => handleInputChange('autor', value)} disabled={isLoadingWordPress}>
                    <SelectTrigger className="font-montserrat">
                      <SelectValue placeholder="Selecione um autor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum autor específico</SelectItem>
                      {wordpressData.authors.map((author) => (
                        <SelectItem key={author.id} value={author.id.toString()}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categorias */}
                {wordpressData.categories.length > 0 && (
                  <div className="p-4 rounded-lg bg-white border">
                    <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                      <FolderOpen size={16} />
                      Categorias WordPress
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {wordpressData.categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={formData.categorias.includes(category.id.toString())}
                            onCheckedChange={(checked) => handleCategoryToggle(category.id.toString(), checked as boolean)}
                            disabled={isLoadingWordPress}
                          />
                          <Label htmlFor={`category-${category.id}`} className="text-sm font-montserrat">
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <Tag size={16} />
                    Tags WordPress
                  </Label>
                  
                  {/* Input para nova tag */}
                  <div className="flex space-x-2 mb-3">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nova tag..."
                      className="font-montserrat"
                      disabled={isLoadingWordPress}
                    />
                    <Button
                      onClick={handleAddNewTag}
                      disabled={!newTag.trim() || isLoadingWordPress}
                      className="font-montserrat px-3 py-2 text-white"
                      style={{ backgroundColor: '#8c52ff' }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Lista de tags existentes */}
                  {wordpressData.tags.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {wordpressData.tags.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={formData.tags.includes(tag.slug)}
                            onCheckedChange={(checked) => handleTagToggle(tag.slug, checked as boolean)}
                            disabled={isLoadingWordPress}
                          />
                          <Label htmlFor={`tag-${tag.id}`} className="text-sm font-montserrat">
                            {tag.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CTA (Call-to-Action) - Seguindo padrão das Ações Rápidas */}
          <div className="border-t pt-6">
            <h3 className="font-poppins text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Megaphone size={20} style={{ color: '#8c52ff' }} />
              CTA (Call-to-Action) - Opcional
            </h3>

            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <Type size={16} />
                    Título do CTA
                  </Label>
                  <Input
                    value={formData.ctaTitulo}
                    onChange={(e) => handleInputChange('ctaTitulo', e.target.value)}
                    placeholder="Ex: Quer saber mais sobre o assunto?"
                    className="font-montserrat"
                  />
                </div>

                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <Link size={16} />
                    Texto do Botão
                  </Label>
                  <Input
                    value={formData.ctaBotao}
                    onChange={(e) => handleInputChange('ctaBotao', e.target.value)}
                    placeholder="Ex: Clique aqui"
                    className="font-montserrat"
                  />
                </div>

                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <ExternalLink size={16} />
                    Link do CTA
                  </Label>
                  <Input
                    value={formData.ctaLink}
                    onChange={(e) => handleInputChange('ctaLink', e.target.value)}
                    placeholder="https://seusite.com/pagina"
                    className="font-montserrat"
                  />
                </div>

                <div className="p-4 rounded-lg bg-white border">
                  <Label className="font-montserrat text-sm font-medium text-foreground mb-2">Posição do CTA</Label>
                  <Select value={formData.ctaPosicao} onValueChange={(value: 'inicio' | 'meio' | 'final') => handleInputChange('ctaPosicao', value)}>
                    <SelectTrigger className="font-montserrat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicio">Início do artigo</SelectItem>
                      <SelectItem value="meio">Meio do artigo</SelectItem>
                      <SelectItem value="final">Final do artigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white border">
                <Label className="font-montserrat text-sm font-medium text-foreground mb-2">Descrição do CTA</Label>
                <Textarea
                  value={formData.ctaDescricao}
                  onChange={(e) => handleInputChange('ctaDescricao', e.target.value)}
                  placeholder="Descrição complementar do CTA..."
                  className="font-montserrat"
                />
              </div>

              <div className="p-4 rounded-lg bg-white border">
                <Label className="font-montserrat text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Image size={16} />
                  URL da Imagem do CTA (opcional)
                </Label>
                <Input
                  value={formData.ctaImagem}
                  onChange={(e) => handleInputChange('ctaImagem', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="font-montserrat"
                />
              </div>
            </div>
          </div>

          {/* Preview do CTA */}
          {renderCtaPreview()}

          {/* Botão de gerar */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating || 
                !isFormValid || 
                !apiDiagnostic.hasKey || 
                !apiDiagnostic.isValid ||
                (isReallyFreePlan && !isDev && ideasUsed >= freeBasicIdeas)
              }
              className="font-montserrat px-8 py-3 text-white disabled:bg-gray-300"
              style={{ 
                backgroundColor: isFormValid && apiDiagnostic.hasKey && apiDiagnostic.isValid && !(isReallyFreePlan && !isDev && ideasUsed >= freeBasicIdeas) 
                  ? '#8c52ff' 
                  : '#9CA3AF' 
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando ideias...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Gerar {formData.quantidade} Ideias
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ideias pendentes - Seguindo padrão do Calendário */}
      {pendingIdeas.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
              <Edit3 size={20} style={{ color: '#8c52ff' }} />
              Ideias Pendentes ({pendingIdeas.length})
              <Button
                onClick={handleGoToArticles}
                className="ml-auto font-montserrat text-white"
                style={{ backgroundColor: '#8c52ff' }}
              >
                Produzir Artigos
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {pendingIdeas.slice(0, 6).map((idea) => (
                <div key={idea.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lightbulb size={20} style={{ color: '#8c52ff' }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-poppins font-medium text-foreground mb-2">
                        {idea.titulo}
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className="text-xs text-white border-none px-2 py-1 rounded" style={{ backgroundColor: '#8c52ff' }}>
                          {idea.categoria}
                        </Badge>
                        {idea.tags?.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} className="text-xs bg-white border px-2 py-1 rounded" style={{ borderColor: '#8c52ff', color: '#8c52ff' }}>
                            {tag}
                          </Badge>
                        ))}
                        {idea.tags && idea.tags.length > 3 && (
                          <Badge className="text-xs bg-white border px-2 py-1 rounded" style={{ borderColor: '#8c52ff', color: '#8c52ff' }}>
                            +{idea.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      <p className="font-montserrat text-sm text-muted-foreground line-clamp-2">
                        {idea.descricao || 'Sem descrição adicional'}
                      </p>
                    </div>
                    <div className="flex items-center ml-4">
                      <Badge className="text-xs text-white border-none px-2 py-1 rounded" style={{ backgroundColor: '#8c52ff' }}>
                        {getSiteName(state.sites, idea.siteId)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              
              {pendingIdeas.length > 6 && (
                <div className="text-center pt-4">
                  <Button
                    onClick={handleGoToArticles}
                    className="font-montserrat text-white"
                    style={{ backgroundColor: '#8c52ff' }}
                  >
                    Ver todas as {pendingIdeas.length} ideias
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}