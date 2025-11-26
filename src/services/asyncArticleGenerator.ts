/**
 * Serviço para geração assíncrona de artigos
 * Permite que artigos sejam gerados em background mesmo que o usuário navegue
 */

export class AsyncArticleGenerator {
  private apiUrl: string;
  private token: string;
  private pollIntervalMs: number = 5000; // Poll a cada 5 segundos

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  /**
   * Iniciar geração assíncrona de artigo
   * Retorna jobKey para polling posterior
   */
  async startArticleGeneration(params: {
    titulo: string;
    nicho: string;
    palavras_chave?: string;
    idioma: string;
    conceito?: string;
    empresa?: string;
    idea_id?: string;
    site_id?: string;
  }): Promise<{ success: boolean; job_key?: string; error?: string }> {
    try {
      console.log('🚀 Iniciando geração assíncrona de artigo', { titulo: params.titulo });

      const response = await fetch(`${this.apiUrl}/api/openai/generate-article-async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Job despachado com sucesso', { job_key: data.job_key });
        return {
          success: true,
          job_key: data.job_key
        };
      } else {
        return {
          success: false,
          error: data.message || 'Erro ao iniciar geração'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar geração assíncrona', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verificar status da geração de artigo
   */
  async checkArticleStatus(jobKey: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    artigo_id?: string;
    artigo?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/openai/article-status/${jobKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        return {
          status: 'completed',
          artigo_id: data.artigo_id,
          artigo: data.artigo
        };
      } else if (data.status === 'processing') {
        return { status: 'processing' };
      } else if (data.status === 'failed') {
        return {
          status: 'failed',
          error: data.message
        };
      } else {
        return { status: 'processing' };
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro ao verificar status'
      };
    }
  }

  /**
   * Polling automático até artigo estar pronto
   * Útil para monitorar progresso em tempo real
   */
  async waitForArticleCompletion(
    jobKey: string,
    onProgress?: (status: string) => void,
    maxWaitMs: number = 600000 // 10 minutos
  ): Promise<{ success: boolean; artigo_id?: string; artigo?: any; error?: string }> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.checkArticleStatus(jobKey);

        onProgress?.(status.status);

        if (status.status === 'completed') {
          console.log('✅ Artigo completado!', { artigo_id: status.artigo_id });
          return {
            success: true,
            artigo_id: status.artigo_id,
            artigo: status.artigo
          };
        }

        if (status.status === 'failed') {
          console.error('❌ Falha na geração', { error: status.error });
          return {
            success: false,
            error: status.error
          };
        }

        // Ainda processando, aguardar antes de próxima verificação
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));

      } catch (error) {
        console.error('❌ Erro durante polling', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    }

    return {
      success: false,
      error: 'Timeout: artigo não foi gerado no tempo limite'
    };
  }

  /**
   * Salvar informações do job no localStorage para recuperação após navegação
   */
  saveJobToLocalStorage(jobKey: string, ideaId: string, titulo: string): void {
    const jobs = JSON.parse(localStorage.getItem('article_jobs') || '{}');
    jobs[jobKey] = {
      idea_id: ideaId,
      titulo,
      started_at: new Date().toISOString(),
      status: 'processing'
    };
    localStorage.setItem('article_jobs', JSON.stringify(jobs));
    console.log('💾 Job salvo no localStorage', { jobKey, ideaId });
  }

  /**
   * Recuperar jobs em progresso do localStorage
   */
  getActiveJobsFromLocalStorage(): Array<{ jobKey: string; ideaId: string; titulo: string }> {
    const jobs = JSON.parse(localStorage.getItem('article_jobs') || '{}');
    return Object.entries(jobs)
      .filter(([_key, job]: any) => job.status === 'processing')
      .map(([jobKey, job]: any) => ({
        jobKey,
        ideaId: job.idea_id,
        titulo: job.titulo
      }));
  }

  /**
   * Atualizar status do job no localStorage
   */
  updateJobStatusInLocalStorage(jobKey: string, status: 'processing' | 'completed' | 'failed'): void {
    const jobs = JSON.parse(localStorage.getItem('article_jobs') || '{}');
    if (jobs[jobKey]) {
      jobs[jobKey].status = status;
      localStorage.setItem('article_jobs', JSON.stringify(jobs));
    }
  }
}

/**
 * Hook React para usar geração assíncrona de artigos
 */
export function useAsyncArticleGenerator(apiUrl: string, token: string) {
  const generator = new AsyncArticleGenerator(apiUrl, token);

  const startGeneration = async (params: any) => {
    const result = await generator.startArticleGeneration(params);
    if (result.success && result.job_key) {
      generator.saveJobToLocalStorage(result.job_key, params.idea_id, params.titulo);
    }
    return result;
  };

  const checkStatus = (jobKey: string) => {
    return generator.checkArticleStatus(jobKey);
  };

  const waitForCompletion = (jobKey: string, onProgress?: (status: string) => void) => {
    return generator.waitForArticleCompletion(jobKey, onProgress);
  };

  const getActiveJobs = () => {
    return generator.getActiveJobsFromLocalStorage();
  };

  return {
    startGeneration,
    checkStatus,
    waitForCompletion,
    getActiveJobs
  };
}
