import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Filter,
  XCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  AlertCircle,
  Tag,
  BarChart3
} from '../icons';
import { useBia } from '../BiaContext';
import { useDashboard } from '../../hooks/useDashboard';
import { getSiteName as getSiteNameUtil } from '../../utils/siteUtils';

interface CalendarioProps {
  userData: any;
  onUpdateUser?: (updatedUserData: any) => Promise<boolean>;
}

// =====================
// Helpers de normalização
// =====================
const sanitizeApiBase = (raw?: string) => {
  const base = (raw || '').replace(/\/+$/, ''); // remove barra final
  return base.replace(/\/api$/, ''); // remove /api final se existir (evita /api/api)
};

const toDateKey = (d: string | Date) => {
  let dt: Date;
  
  if (d instanceof Date) {
    dt = d;
  } else {
    // Se a string já está no formato local (YYYY-MM-DDTHH:mm:ss), preservar o timezone
    if (typeof d === 'string' && d.includes('T') && !d.includes('Z') && !d.includes('+') && !d.includes('-', 10)) {
      // Formato local, tratar como tal
      dt = new Date(d + (d.length === 19 ? '' : '')); // Adicionar nada se já tem segundos
    } else {
      // Formato UTC ou com timezone, converter normalmente
      dt = new Date(d);
    }
  }
  
  if (isNaN(dt.getTime())) return null;
  
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`; // chave estável por dia (timezone preservado)
};

const toSiteIdNumber = (val: any): number | null => {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

export function Calendario({ userData, onUpdateUser }: CalendarioProps) {
  const { state } = useBia();
  const { dashboardData } = useDashboard();

  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSiteId, setSelectedSiteId] = useState<'all' | string | number>('all');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  const [apiArticles, setApiArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // =====================
  // Fetchers (em callbacks para reuso)
  // =====================
  const fetchAgendamentos = useCallback(async () => {
    try {
      setLoadingAgendamentos(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const raw = import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com';
      const apiBase = sanitizeApiBase(raw);
      const response = await fetch(`${apiBase}/api/agendamentos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const agendamentosData = data.data?.data || data.data || [];
        console.log('📅 Agendamentos carregados da API:', agendamentosData.length);
        setAgendamentos(agendamentosData);
      } else {
        console.warn('⚠️ Falha ao carregar agendamentos:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar agendamentos:', error);
    } finally {
      setLoadingAgendamentos(false);
    }
  }, []);

  const fetchPublishedArticles = useCallback(async () => {
    try {
      setLoadingArticles(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const raw = import.meta.env.VITE_BACKEND_URL || 'https://api.bloginfinitoautomatico.com';
      const base = sanitizeApiBase(raw);

      const endpoints = [
        `${base}/api/artigos?status=publicado`,
        `${base}/api/articles?status=publicado`,
        `${base}/api/posts?type=article&status=publicado`,
        `${base}/api/posts?type=article&status=published`,
      ];

      let found: any[] = [];
      for (const url of endpoints) {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (res.ok) {
          const j = await res.json();
          const arr = j.data?.data || j.data || j || [];
          if (Array.isArray(arr) && arr.length) { found = arr; break; }
        }
      }

      const mapped = (found || []).map((article: any) => {
        const siteIdNum = toSiteIdNumber(article.site_id ?? article.siteId) ?? 0; // 0 para posts sem site
        const dateVal = article.published_at ?? article.publishedAt ?? article.created_at ?? article.createdAt;
        return {
          id: `api-article-${article.id}`,
          title: article.titulo ?? article.title ?? '(Sem título)',
          content: article.conteudo ?? article.content ?? '',
          date: dateVal,
          dateKey: toDateKey(dateVal),
          type: 'published',
          status: 'Publicado',
          siteId: siteIdNum,
          url: article.published_url ?? article.publishedUrl ?? article.link ?? '#',
          articleId: article.id,
          article,
          source: 'api-articles',
        };
      }).filter((x: any) => x.dateKey);

      setApiArticles(mapped);
      console.log('🛰️ Artigos publicados (API):', mapped.length);
    } catch (e) {
      console.error('❌ Erro ao buscar artigos publicados:', e);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  // Buscar dados ao montar
  useEffect(() => {
    fetchAgendamentos();
    fetchPublishedArticles();
  }, [fetchAgendamentos, fetchPublishedArticles]);

  // Revalidar quando voltar o foco na aba
  useEffect(() => {
    const onFocus = () => {
      fetchAgendamentos();
      fetchPublishedArticles();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchAgendamentos, fetchPublishedArticles]);

  // Mês e ano atual
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Nomes
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Nome do site - usando função utilitária global
  const getSiteName = useCallback((siteId: number | null) => {
    if (siteId == null || siteId === 0) return 'Sem Site';
    return getSiteNameUtil(state.sites, siteId);
  }, [state.sites]);

  // Sites disponíveis
  const availableSites = useMemo(() => {
    const articleSiteIds = state.articles.map((a: any) => a.siteId);
    const ideaSiteIds = state.ideas.map((i: any) => i.siteId);
    const apiSiteIds = apiArticles.map((p: any) => p.siteId);
    const allSiteIds = [...articleSiteIds, ...ideaSiteIds, ...apiSiteIds];
    const uniqueSiteIds = [...new Set(allSiteIds)];
    
    // Incluir sites válidos e o site padrão (0) se houver posts sem site
    const validSiteIds = uniqueSiteIds.filter(id => {
      const num = toSiteIdNumber(id);
      return num !== null;
    });
    
    // Verificar se há posts com siteId 0 (sem site)
    const hasPostsWithoutSite = allSiteIds.includes(0) || allSiteIds.includes(null) || allSiteIds.includes(undefined);
    if (hasPostsWithoutSite && !validSiteIds.includes(0)) {
      validSiteIds.push(0);
    }

    return validSiteIds
      .map((siteId: any) => {
        const idNum = toSiteIdNumber(siteId) ?? 0;
        return { id: idNum, name: getSiteName(idNum) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.articles, state.ideas, apiArticles, getSiteName]);

  // Coleta de posts normalizados (API publicados + locais + agendamentos API)
  const allPosts = useMemo(() => {
    const posts: any[] = [];
    const seenArticleIds = new Set<number>(); // Para evitar duplicatas baseadas no articleId

    // (A) publicados — API (prioridade máxima)
    apiArticles.forEach((a: any) => {
      if (!a.dateKey) return;
      if (a.articleId && seenArticleIds.has(a.articleId)) return; // Evitar duplicata
      if (a.articleId) seenArticleIds.add(a.articleId);
      
      // Garantir que temos uma URL válida para posts publicados
      const postUrl = a.url || a.link || a.publishedUrl || '#';
      
      posts.push({
        ...a,
        url: postUrl,
        type: 'published' // Garantir que posts da API são marcados como publicados
      });
    });

    // (B) publicados — local (apenas se não estiver já na API)
    state.articles.forEach((article: any) => {
      if (article.status?.toLowerCase() === 'publicado') {
        if (seenArticleIds.has(article.id)) return; // Evitar duplicata
        
        const siteIdNum = toSiteIdNumber(article.siteId ?? article.site_id) ?? 0; // 0 para posts sem site
        const dateVal = article.publishedAt || article.createdAt;
        const dateKey = toDateKey(dateVal);
        if (!dateKey) return;
        
        // Capturar URL de várias fontes possíveis
        const postUrl = article.publishedUrl || 
                       article.published_url || 
                       article.wordpressUrl || 
                       article.wordpress_url ||
                       article.link ||
                       '#';
        
        seenArticleIds.add(article.id);
        posts.push({
          id: `local-article-${article.id}`,
          title: article.titulo,
          content: article.conteudo || '',
          date: dateVal,
          dateKey,
          type: 'published',
          status: 'Publicado',
          siteId: siteIdNum,
          url: postUrl,
          articleId: article.id,
          article,
          source: 'produzir-artigos'
        });
      }
    });

    // (C) agendados — local (apenas se não estiver já processado)
    state.articles.forEach((article: any) => {
      const isScheduled = /(agendado)$/i.test(article.status || '');
      const scheduledDate = article.scheduledDate || article.scheduled_date;
      if (isScheduled && scheduledDate) {
        if (seenArticleIds.has(article.id)) return; // Evitar duplicata
        
        const siteIdNum = toSiteIdNumber(article.siteId ?? article.site_id) ?? 0; // 0 para posts sem site
        const dateKey = toDateKey(scheduledDate);
        if (!dateKey) return;
        
        seenArticleIds.add(article.id);
        posts.push({
          id: `local-scheduled-${article.id}`,
          title: article.titulo,
          content: article.conteudo || '',
          date: scheduledDate,
          dateKey,
          type: 'scheduled',
          status: 'Agendado localmente',
          siteId: siteIdNum,
          url: '#',
          articleId: article.id,
          article,
          source: 'produzir-artigos-local',
          isLocalScheduled: true
        });
      }
    });

    // (D) agendamentos — API (apenas se não estiver já processado)
    agendamentos.forEach((agendamento: any) => {
      const article = agendamento.artigo;
      if (!article) return;
      
      if (seenArticleIds.has(article.id)) return; // Evitar duplicata

      const siteIdNum = toSiteIdNumber(
        agendamento.site_id ?? agendamento.site?.id ?? article.site_id ?? article.siteId
      ) ?? 0; // 0 para posts sem site
      const dateVal = agendamento.data_agendamento;
      const dateKey = toDateKey(dateVal);
      if (!dateKey) return;

      let postUrl = '#';
      // Tentar extrair URL do WordPress de várias fontes
      if (agendamento.wordpress_post_id) {
        try {
          const wp = JSON.parse(agendamento.wordpress_post_id);
          if (wp?.link) postUrl = wp.link;
        } catch {}
      }
      
      // Fallback para outras possíveis fontes de URL
      if (postUrl === '#') {
        postUrl = agendamento.published_url || 
                  agendamento.publishedUrl || 
                  agendamento.link || 
                  agendamento.wordpress_url ||
                  article.published_url ||
                  article.publishedUrl ||
                  article.link ||
                  '#';
      }

      const dt = new Date(dateVal);
      const isFuture = dt.getTime() > Date.now();
      const type = isFuture ? 'scheduled' : (agendamento.status === 'publicado' ? 'published' : 'scheduled');
      const status = isFuture
        ? `Agendado para ${agendamento.site?.nome || 'WordPress'}`
        : (agendamento.status === 'publicado'
          ? `Publicado via ${agendamento.site?.nome || 'WordPress'}`
          : `Pendente (${agendamento.site?.nome || 'WordPress'})`);

      seenArticleIds.add(article.id);
      posts.push({
        id: `agendamento-${agendamento.id}`,
        title: article.titulo,
        content: article.conteudo || agendamento.conteudo || '',
        date: dateVal,
        dateKey,
        type,
        status,
        siteId: siteIdNum,
        scheduledDate: dateVal,
        url: postUrl,
        articleId: article.id,
        agendamentoId: agendamento.id,
        article,
        agendamento,
        source: 'agendamento-massa',
        isDataFutura: isFuture
      });
    });

    console.log('📅 Posts processados no calendário:', {
      total: posts.length,
      duplicatasEvitadas: apiArticles.length + state.articles.length + agendamentos.length - posts.length,
      fontes: {
        apiArticles: apiArticles.length,
        localArticles: state.articles.length,
        agendamentos: agendamentos.length
      },
      postsPublicados: posts.filter(p => p.type === 'published').length,
      postsComURL: posts.filter(p => p.url && p.url !== '#').length,
      postsPublicadosComURL: posts.filter(p => p.type === 'published' && p.url && p.url !== '#').length,
      postsSemSite: posts.filter(p => p.siteId === 0).length,
      siteIds: [...new Set(posts.map(p => p.siteId))].sort()
    });

    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [apiArticles, state.articles, agendamentos]);

  // Filtrar por site - compatível com UUIDs e números
  const filteredPosts = useMemo(() => {
    if (selectedSiteId === 'all') return allPosts;
    return allPosts.filter(post => 
      post.siteId === selectedSiteId || 
      post.siteId.toString() === selectedSiteId.toString()
    );
  }, [allPosts, selectedSiteId]);

  // Posts por dia via dateKey (evita bugs de timezone)
  const getPostsForDay = useCallback((day: number) => {
    const key = toDateKey(new Date(currentYear, currentMonth, day));
    if (!key) return [];
    return filteredPosts.filter(p => p.dateKey === key);
  }, [filteredPosts, currentMonth, currentYear]);

  const selectedDayPosts = useMemo(() => {
    return selectedDay ? getPostsForDay(selectedDay) : [];
  }, [selectedDay, getPostsForDay]);

  // Navegação do calendário
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }
    setSelectedDay(null);
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  }, []);

  const handleFilterChange = useCallback((filterType: 'site', value: any) => {
    if (filterType === 'site') {
      setSelectedSiteId(value);
    }
    setSelectedDay(null);
  }, []);

  const countWords = useCallback((htmlContent: string): number => {
    if (!htmlContent) return 0;
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').trim();
    const words = textContent.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }, []);

  const openArticleInNewTab = useCallback((post: any) => {
    try {
      console.log('🚀 Iniciando visualização do artigo:', post.id);
      if (!post) {
        console.error('❌ Post não fornecido');
        alert('Erro: Dados do post não encontrados');
        return;
      }

      const article = post.article || {};
      let content = article.conteudo || post.content || '';
      if (!content || content === 'Conteúdo não disponível') {
        if (post.agendamento?.artigo?.conteudo) {
          content = post.agendamento.artigo.conteudo;
        } else if (post.agendamento?.conteudo) {
          content = post.agendamento.conteudo;
        } else {
          content = 'Consulte a página histórico para ver o conteúdo completo';
        }
      }

      const title = article.titulo || post.title || 'Título não disponível';
      const wordCount = countWords(content);

      let imageUrl = article?.imageUrl || article?.image_url || article?.imagem || null;
      if (!imageUrl) imageUrl = post.imageUrl || post.image_url || post.imagem || null;
      if (!imageUrl && post.agendamento) {
        const agendamento = post.agendamento;
        imageUrl = agendamento.imageUrl || agendamento.image_url || agendamento.imagem || null;
        if (agendamento.artigo) {
          imageUrl = imageUrl || agendamento.artigo.imageUrl || agendamento.artigo.image_url || agendamento.artigo.imagem || null;
        }
      }
      let imgMatch: RegExpMatchArray | null = null;
      if (!imageUrl && content && content !== 'Consulte a página histórico para ver o conteúdo completo') {
        imgMatch = content.match(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/i);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      const articleWindow = window.open('', '_blank');
      if (!articleWindow) {
        alert('Não foi possível abrir uma nova aba. Verifique se o bloqueador de popup está ativo.');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { font-family: 'Montserrat', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; }
            .article-title { font-family: 'Poppins', Arial, sans-serif; font-size: 2rem; margin-bottom: 20px; color: #8c52ff; line-height: 1.3; }
            .article-meta { color: #666; margin-bottom: 20px; font-size: 0.9rem; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .article-content { line-height: 1.6; color: #333; font-size: 16px; }
            .article-content h1, .article-content h2 { color: #8c52ff; margin-top: 30px; }
            .article-content h3 { color: #7a47e6; margin-top: 25px; }
            .article-content h4, .article-content h5, .article-content h6 { color: #333; margin-top: 20px; }
            .article-content p { margin-bottom: 16px; }
            .article-content ul, .article-content ol { margin-bottom: 16px; padding-left: 30px; }
            .article-content li { margin-bottom: 8px; }
            .article-image { width: 100%; max-width: 600px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; }
            .content-images img { width: 100%; max-width: 500px; margin: 15px 0; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
            .bia-cta-container { margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f6f8fb 0%, #f1f3f6 100%); border-radius: 12px; border-left: 4px solid #8c52ff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <h1 class="article-title">${title}</h1>
          <div class="article-meta">
            📅 ${post.type === 'published' ? 'Publicado' : 'Agendado para'} ${new Date(post.date).toLocaleString('pt-BR')} • 📊 ${wordCount} palavras • 🌐 ${getSiteName(post.siteId)}
          </div>
          ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="article-image" onerror="this.style.display='none';" />` : ''}
          <div class="article-content">${content}</div>
        </body>
        </html>
      `;

      articleWindow.document.write(htmlContent);
      articleWindow.document.close();
    } catch (error: any) {
      console.error('❌ Erro ao visualizar artigo:', error);
      alert(`Erro ao abrir artigo: ${error.message}`);
    }
  }, [countWords, getSiteName]);

  // Renderização do calendário
  const renderCalendar = (): React.ReactElement[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay();

    const calendarDays: React.ReactElement[] = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    for (let i = 0; i < startDay; i++) {
      calendarDays.push(
        <div key={`prev-${i}`} className="h-24 bg-gray-50 border border-gray-100 opacity-40"></div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayPosts = getPostsForDay(day);
      const isToday = isCurrentMonth && today.getDate() === day;
      const isSelected = selectedDay === day;
      const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const publishedPosts = dayPosts.filter(p => p.type === 'published');
      const scheduledPosts = dayPosts.filter(p => p.type === 'scheduled');

      calendarDays.push(
        <div
          key={day}
          onClick={() => setSelectedDay(day)}
          className={`
            h-24 border border-gray-200 p-2 cursor-pointer transition-all duration-200 overflow-hidden relative
            ${isToday
              ? 'bg-[#8c52ff]/10 border-[#8c52ff] ring-2 ring-[#8c52ff]/20'
              : isSelected
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                : isPast
                  ? 'bg-gray-50/50 hover:bg-gray-100/50'
                  : 'bg-white hover:bg-gray-50 hover:border-gray-300'
            }
            ${dayPosts.length > 0 ? 'border-l-4 border-l-[#8c52ff]' : ''}
          `}
        >
          <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
            isToday ? 'text-[#8c52ff]' : isSelected ? 'text-blue-800' : isPast ? 'text-gray-400' : 'text-foreground'
          }`}>
            <span>{day}</span>
            {dayPosts.length > 0 && (
              <div className="flex items-center gap-1">
                {publishedPosts.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-green-500" title={`${publishedPosts.length} publicado(s)`}></div>
                )}
                {scheduledPosts.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" title={`${scheduledPosts.length} agendado(s)`}></div>
                )}
              </div>
            )}
          </div>

          {isToday && (
            <div className="text-xs text-[#8c52ff] font-medium mb-1">Hoje</div>
          )}

          <div className="space-y-1">
            {dayPosts.slice(0, 2).map((post: any) => (
              <div
                key={post.id}
                className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 ${
                  post.type === 'published'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
                title={`${post.title} (${post.type === 'published' ? 'Publicado' : 'Agendado'})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDay(day);
                }}
              >
                {post.title}
              </div>
            ))}
            {dayPosts.length > 2 && (
              <div className="text-xs text-gray-500 px-1.5 font-medium">
                +{dayPosts.length - 2} mais
              </div>
            )}
          </div>

          {dayPosts.length > 0 && (
            <div className="absolute bottom-1 right-1 bg-[#8c52ff] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {dayPosts.length}
            </div>
          )}
        </div>
      );
    }

    return calendarDays;
  };

  // Estatísticas
  const stats = useMemo(() => {
    const published = filteredPosts.filter(p => p.type === 'published').length;
    const scheduled = filteredPosts.filter(p => p.type === 'scheduled').length;
    const total = filteredPosts.length;

    const postsByDay: Record<number, any[]> = {};
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      postsByDay[day] = getPostsForDay(day);
    }

    const daysWithPosts = Object.values(postsByDay).filter(posts => posts.length > 0).length;
    const avgPostsPerDay = daysWithPosts > 0 ? (total / daysWithPosts).toFixed(1) : '0';

    return { published, scheduled, total, daysWithPosts, avgPostsPerDay, postsByDay };
  }, [filteredPosts, currentYear, currentMonth, getPostsForDay]);

  // Debug
  useEffect(() => {
    console.log('📅 Calendário atualizado:', {
      posts: allPosts.length,
      filteredPosts: filteredPosts.length,
      selectedSite: selectedSiteId,
      currentMonth: `${monthNames[currentMonth]} ${currentYear}`,
      selectedDay: selectedDay
    });
  }, [allPosts.length, filteredPosts.length, selectedSiteId, currentMonth, currentYear, selectedDay]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-2xl font-semibold text-foreground mb-2">
            Calendário de Conteúdo
          </h1>
          <p className="font-montserrat text-muted-foreground">
            Visualize e gerencie todos os seus artigos publicados e agendados em uma visão macro mensal
          </p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-poppins text-lg font-medium text-foreground flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#8c52ff' }} />
            Estatísticas do Calendário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <CalendarIcon size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Total de Posts</p>
                  <p className="font-poppins text-xl font-medium text-foreground">{stats.total}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">No período selecionado</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Publicados</p>
                  <p className="font-poppins text-xl font-medium text-green-600">{stats.published}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">Artigos online</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Clock size={20} style={{ color: '#8c52ff' }} />
                </div>
                <div className="flex-1">
                  <p className="font-montserrat text-sm text-muted-foreground">Agendados</p>
                  <p className="font-poppins text-xl font-medium text-amber-600">{stats.scheduled}</p>
                  <p className="font-montserrat text-xs text-muted-foreground">Aguardando publicação</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigateMonth('prev')} className="h-11 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-48">
                <h2 className="font-poppins text-xl text-foreground">{monthNames[currentMonth]} {currentYear}</h2>
              </div>
              <Button onClick={() => navigateMonth('next')} className="h-11 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={goToToday} className="h-11 px-4 text-white font-montserrat" style={{ backgroundColor: '#8c52ff' }}>
                Hoje
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Filter size={16} className="text-gray-600" />
                </div>
                <Label className="font-montserrat font-medium text-foreground">Filtrar por Site</Label>
              </div>

              <Select value={selectedSiteId?.toString() || 'all'} onValueChange={(value) => handleFilterChange('site', value === 'all' ? 'all' : value)}>
                <SelectTrigger className="w-48 h-11">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Sites</SelectItem>
                  {availableSites.map(site => (
                    <SelectItem key={site.id} value={site.id?.toString() || ''}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSiteId !== 'all' && (
                <Button onClick={() => handleFilterChange('site', 'all')} className="h-11 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400">
                  <XCircle size={16} className="mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="space-y-8">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {dayNames.map(day => (
                  <div key={day} className="h-12 flex items-center justify-center bg-gray-50 border-r border-gray-200 last:border-r-0">
                    <span className="font-poppins font-medium text-gray-700">{day}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </CardContent>
          </Card>

          {filteredPosts.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <CalendarIcon size={24} className="text-gray-400" />
                </div>
                <h3 className="font-poppins text-xl font-medium text-foreground mb-3">
                  {selectedSiteId === 'all' ? 'Nenhum conteúdo encontrado' : 'Nenhum conteúdo para este site'}
                </h3>
                <p className="font-montserrat text-gray-600 max-w-md mx-auto mb-6">
                  {selectedSiteId === 'all'
                    ? 'Você ainda não possui artigos publicados ou agendados. Publique ou agende seus artigos na seção "Produzir Artigos" para vê-los aqui.'
                    : `O site "${availableSites.find(s => s.id === selectedSiteId)?.name}" ainda não possui conteúdo publicado ou agendado.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => window.location.hash = 'articles'} className="bg-[#8c52ff] hover:bg-[#7a47e6] text-white">
                    Produzir Artigos
                  </Button>
                  {selectedSiteId !== 'all' && (
                    <Button onClick={() => handleFilterChange('site', 'all')} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-montserrat">
                      Ver Todos os Sites
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="font-poppins font-semibold text-foreground mb-4">Legenda</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="font-montserrat text-sm text-gray-600">Posts Publicados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  </div>
                  <span className="font-montserrat text-sm text-gray-600">Posts Agendados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#8c52ff]/10 border border-[#8c52ff]/20 rounded"></div>
                  <span className="font-montserrat text-sm text-gray-600">Dia Atual</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-4 bg-[#8c52ff] rounded-full"></div>
                  <span className="font-montserrat text-sm text-gray-600">Borda: Dias com Posts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedDay && (
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-poppins text-xl font-semibold text-foreground">
                    Posts de {selectedDay} de {monthNames[currentMonth]}
                  </h3>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-[#8c52ff]/10 text-[#8c52ff] px-2 py-0.5 rounded text-sm">
                      {selectedDayPosts.length} post(s)
                    </Badge>
                    <Button onClick={() => setSelectedDay(null)} className="bg-white border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 p-2 rounded">
                      <XCircle size={16} />
                    </Button>
                  </div>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <h4 className="font-poppins font-medium text-gray-700 mb-2">Nenhum post neste dia</h4>
                    <p className="font-montserrat text-gray-500">Não há artigos publicados ou agendados para esta data.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDayPosts.map((post: any) => (
                      <Card key={post.id} className="border-border bg-card hover:shadow-sm transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Monitor size={14} className="mr-1" />
                                  {getSiteName(post.siteId)}
                                </div>
                                <Badge className={`text-xs ${post.type === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                  {post.type === 'published' ? (<><CheckCircle size={10} className="mr-1" />Publicado</>) : (<><Clock size={10} className="mr-1" />Agendado</>)}
                                </Badge>
                              </div>

                              <h4 className="font-poppins font-medium text-foreground mb-2 line-clamp-2 leading-tight">{post.title}</h4>

                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-sm text-gray-600">
                                  {post.type === 'published' ? 'Publicado em' : 'Agendado para'}: {new Date(post.date).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="text-sm text-gray-500">{countWords(post.content)} palavras</div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button onClick={() => openArticleInNewTab(post)} className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>

                              {post.type === 'published' && post.url && post.url !== '#' && (
                                <Button 
                                  onClick={() => window.open(post.url, '_blank')} 
                                  className="h-10 px-4 bg-[#8c52ff] hover:bg-[#7a47e6] text-white shadow-sm"
                                  title={`Abrir artigo publicado: ${post.url}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver Online
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {stats.total > 0 && (
            <Card className="border-border bg-card" style={{ backgroundColor: 'rgba(140, 82, 255, 0.05)' }}>
              <CardContent className="p-6">
                <h3 className="font-poppins font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Monitor size={20} style={{ color: '#8c52ff' }} />
                  Resumo de {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white/60 rounded-lg border border-purple-100">
                    <div className="font-poppins text-2xl text-[#8c52ff] mb-1">{stats.total}</div>
                    <div className="font-montserrat text-sm text-gray-600">Total de Posts</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-lg border border-purple-100">
                    <div className="font-poppins text-2xl text-green-600 mb-1">{stats.daysWithPosts}</div>
                    <div className="font-montserrat text-sm text-gray-600">Dias com Conteúdo</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-lg border border-purple-100">
                    <div className="font-poppins text-2xl text-amber-600 mb-1">{stats.avgPostsPerDay}</div>
                    <div className="font-montserrat text-sm text-gray-600">Média por Dia Ativo</div>
                  </div>
                  <div className="text-center p-4 bg-white/60 rounded-lg border border-purple-100">
                    <div className="font-poppins text-2xl text-blue-600 mb-1">{selectedSiteId === 'all' ? availableSites.length : '1'}</div>
                    <div className="font-montserrat text-sm text-gray-600">{selectedSiteId === 'all' ? 'Sites Ativos' : 'Site Selecionado'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}