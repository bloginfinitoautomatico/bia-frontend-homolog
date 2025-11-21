/**
 * Utilitários para obter informações de sites de forma compatível com UUIDs e números
 * Garante escalabilidade para centenas de milhares de usuários e sites
 */

import { compareIds } from './idComparison';

/**
 * Obtém o nome do site por ID de forma compatível
 * @param sites - Array de sites
 * @param siteId - ID do site (pode ser string UUID ou número)
 * @returns Nome do site ou fallback
 */
export const getSiteName = (sites: any[], siteId: string | number): string => {
  if (!siteId) return 'Site não especificado';
  
  const site = sites.find(s => compareIds(s.id, siteId));
  return site?.nome || site?.name || `Site ${siteId}`;
};

/**
 * Obtém o site completo por ID de forma compatível
 * @param sites - Array de sites
 * @param siteId - ID do site (pode ser string UUID ou número)
 * @returns Site encontrado ou undefined
 */
export const getSiteById = (sites: any[], siteId: string | number): any => {
  if (!siteId) return undefined;
  
  return sites.find(s => compareIds(s.id, siteId));
};

/**
 * Obtém informações do site formatadas para exibição
 * @param sites - Array de sites
 * @param siteId - ID do site (pode ser string UUID ou número)
 * @returns Objeto com informações formatadas do site
 */
export const getSiteDisplayInfo = (sites: any[], siteId: string | number) => {
  const site = getSiteById(sites, siteId);
  
  if (!site) {
    return {
      name: `Site ${siteId}`,
      status: 'unknown',
      hasWordPress: false,
      displayBadge: 'secondary'
    };
  }
  
  return {
    name: site.nome || site.name || `Site ${siteId}`,
    status: site.status || 'unknown',
    hasWordPress: !!(site.wordpressUrl && site.wordpressUsername && site.wordpressPassword),
    displayBadge: site.status === 'ativo' ? 'default' : 'secondary'
  };
};

/**
 * Filtra sites por critérios específicos
 * @param sites - Array de sites
 * @param criteria - Critérios de filtro
 * @returns Array de sites filtrados
 */
export const filterSites = (sites: any[], criteria: {
  status?: string;
  hasWordPress?: boolean;
  searchQuery?: string;
}) => {
  return sites.filter(site => {
    // Filtro por status
    if (criteria.status && site.status !== criteria.status) {
      return false;
    }
    
    // Filtro por WordPress
    if (criteria.hasWordPress !== undefined) {
      const hasWP = !!(site.wordpressUrl && site.wordpressUsername && site.wordpressPassword);
      if (hasWP !== criteria.hasWordPress) {
        return false;
      }
    }
    
    // Filtro por busca
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const siteName = (site.nome || site.name || '').toLowerCase();
      if (!siteName.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
};