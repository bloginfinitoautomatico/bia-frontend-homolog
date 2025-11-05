import { useState, useEffect, useCallback } from 'react';
import { wordpressService } from '../services/wordpressService';

export interface WordPressPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  modified: string;
  status: 'publish' | 'draft' | 'future' | 'private';
  link: string;
  author: {
    id: number;
    name: string;
    slug: string;
  };
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  featured_media?: {
    id: number;
    source_url: string;
    alt_text: string;
  };
  type: 'wordpress';
  siteId: string;
  siteName: string;
}

export interface CalendarData {
  [date: string]: WordPressPost[];
}

export interface UseWordPressReturn {
  posts: WordPressPost[];
  calendarData: CalendarData;
  loading: boolean;
  error: string | null;
  fetchPosts: (siteId: string, params?: any) => Promise<void>;
  fetchCalendarPosts: (siteId: string, year?: number, month?: number) => Promise<void>;
  refreshData: (siteId: string, year?: number, month?: number) => Promise<void>;
}

export function useWordPress(): UseWordPressReturn {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar posts
  const fetchPosts = useCallback(async (siteId: string, params?: any) => {
    if (!siteId) {
      console.log('⚠️ SiteId não fornecido para fetchPosts');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Buscando posts do WordPress para site:', siteId);
      
      const result = await wordpressService.getPosts(siteId, params);
      
      if (result.success && result.posts) {
        console.log('✅ Posts do WordPress carregados:', result.posts.length);
        setPosts(result.posts);
      } else {
        const errorMsg = result.error || 'Erro ao buscar posts do WordPress';
        console.error('❌ Erro ao buscar posts:', errorMsg);
        setError(errorMsg);
        setPosts([]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao buscar posts';
      console.error('❌ Erro geral ao buscar posts:', err);
      setError(errorMsg);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para buscar dados do calendário
  const fetchCalendarPosts = useCallback(async (siteId: string, year?: number, month?: number) => {
    if (!siteId) {
      console.log('⚠️ SiteId não fornecido para fetchCalendarPosts');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 Buscando dados do calendário WordPress para site:', siteId, { year, month });
      
      const result = await wordpressService.getCalendarPosts(siteId, year, month);
      
      if (result.success && result.calendar) {
        console.log('✅ Dados do calendário WordPress carregados');
        setCalendarData(result.calendar);
      } else {
        const errorMsg = result.error || 'Erro ao buscar dados do calendário WordPress';
        console.error('❌ Erro ao buscar calendário:', errorMsg);
        setError(errorMsg);
        setCalendarData({});
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao buscar calendário';
      console.error('❌ Erro geral ao buscar calendário:', err);
      setError(errorMsg);
      setCalendarData({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para atualizar dados completos
  const refreshData = useCallback(async (siteId: string, year?: number, month?: number) => {
    if (!siteId) {
      console.log('⚠️ SiteId não fornecido para refreshData');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Atualizando dados WordPress completos para site:', siteId);
      
      // Buscar posts recentes e dados do calendário em paralelo
      const [postsResult, calendarResult] = await Promise.all([
        wordpressService.getPosts(siteId, { 
          status: 'publish,future,draft',
          per_page: 100
        }),
        wordpressService.getCalendarPosts(siteId, year, month)
      ]);
      
      if (postsResult.success && postsResult.posts) {
        console.log('✅ Posts atualizados:', postsResult.posts.length);
        setPosts(postsResult.posts);
      } else {
        console.error('❌ Erro ao atualizar posts:', postsResult.error);
      }
      
      if (calendarResult.success && calendarResult.calendar) {
        console.log('✅ Calendário atualizado');
        setCalendarData(calendarResult.calendar);
      } else {
        console.error('❌ Erro ao atualizar calendário:', calendarResult.error);
      }
      
      // Se pelo menos um funcionou, considerar sucesso
      if (!postsResult.success && !calendarResult.success) {
        const errorMsg = postsResult.error || calendarResult.error || 'Erro ao atualizar dados WordPress';
        setError(errorMsg);
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar dados';
      console.error('❌ Erro geral ao atualizar dados:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    posts,
    calendarData,
    loading,
    error,
    fetchPosts,
    fetchCalendarPosts,
    refreshData
  };
}
