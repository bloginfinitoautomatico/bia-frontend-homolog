/**
 * Utilitários para comparação de IDs compatível com UUIDs e números
 * Garante escalabilidade para centenas de milhares de usuários e sites
 */

/**
 * Compara dois IDs de forma compatível com UUIDs (string) e números
 * @param id1 - Primeiro ID (pode ser string UUID, número ou null)
 * @param id2 - Segundo ID (pode ser string UUID, número ou null)
 * @returns boolean - true se os IDs são equivalentes
 */
export const compareIds = (id1: string | number | null | undefined, id2: string | number | null | undefined): boolean => {
  // Verificar valores nulos/undefined primeiro
  if (id1 == null && id2 == null) return true;
  if (id1 == null || id2 == null) return false;
  
  // Comparação direta primeiro (mais eficiente)
  if (id1 === id2) return true;
  
  // Comparação como strings (para compatibilidade UUID/número)
  return id1.toString() === id2.toString();
};

/**
 * Filtra um array baseado na comparação de siteId
 * @param items - Array de items com propriedade siteId
 * @param targetSiteId - ID do site para filtrar ('all' retorna todos)
 * @returns Array filtrado
 */
export const filterBySiteId = <T extends { siteId: string | number }>(
  items: T[], 
  targetSiteId: 'all' | string | number
): T[] => {
  if (targetSiteId === 'all') return items;
  
  return items.filter(item => compareIds(item.siteId, targetSiteId));
};

/**
 * Encontra um site por ID de forma compatível
 * @param sites - Array de sites
 * @param siteId - ID do site a ser encontrado
 * @returns Site encontrado ou undefined
 */
export const findSiteById = <T extends { id: string | number }>(
  sites: T[], 
  siteId: string | number
): T | undefined => {
  return sites.find(site => compareIds(site.id, siteId));
};

/**
 * Valida se um valor pode ser usado como ID de site
 * @param value - Valor a ser validado
 * @returns boolean - true se é um ID válido
 */
export const isValidSiteId = (value: any): value is string | number => {
  if (value === 'all') return false;
  if (typeof value === 'string' && value.trim().length > 0) return true;
  if (typeof value === 'number' && value > 0) return true;
  return false;
};

/**
 * Normaliza um ID para string para armazenamento/comparação
 * @param id - ID a ser normalizado
 * @returns string - ID como string
 */
export const normalizeId = (id: string | number): string => {
  return id.toString();
};