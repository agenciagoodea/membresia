/**
 * Valida se uma string é um UUID válido.
 */
export const isUUID = (id: any): boolean => {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Sanitiza campos UUID, convertendo strings vazias em null.
 */
export const sanitizeUUID = (id: any): string | null => {
  if (!id || typeof id !== 'string' || id.trim() === '') return null;
  if (isUUID(id)) return id;
  return null;
};
