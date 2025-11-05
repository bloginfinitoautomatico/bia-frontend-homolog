import { useMemo } from 'react';
import { useBia } from '../components/BiaContext';

interface Credits {
  articles: number;
  ideas: number;
  sites: number;
}

export function useCredits(refreshKey?: number): Credits {
  const { state } = useBia();

  return useMemo(() => {
    // Cálculo de créditos baseado em dados reais do BiaContext
    const user = state.user;
    if (!user) {
      return { articles: 0, ideas: 0, sites: 0 };
    }

    // Usar quotas (limites totais) menos consumo registrado
    const quotas = user.quotas || { articles: 0, ideas: 0, sites: 0 };
    const consumo = user.consumo || { articles: 0, ideas: 0, sites: 0 };
    
    const credits = {
      articles: Math.max(0, (quotas.articles || 0) - (consumo.articles || 0)),
      ideas: Math.max(0, (quotas.ideas || 0) - (consumo.ideas || 0)),
      sites: Math.max(0, (quotas.sites || 0) - (consumo.sites || 0))
    };

    console.log('🔄 useCredits calculados:', {
      refreshKey,
      quotas: user.quotas,
      consumo: user.consumo,
      credits,
      userId: user.id,
      email: user.email
    });

    return credits;
  }, [state.user?.quotas, state.user?.consumo, state.user?.id, refreshKey]);
}
