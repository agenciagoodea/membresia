import { supabase } from '../services/supabaseClient';

/**
 * Resolve um caminho de storage ou uma URL completa para uma URL pública acessível.
 */
export const resolveFileUrl = (pathOrUrl: string | null | undefined, bucket: string = 'avatars'): string => {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  
  // Se for apenas o nome do arquivo ou caminho interno
  const { data } = supabase.storage.from(bucket).getPublicUrl(pathOrUrl);
  return data.publicUrl;
};

/**
 * Retorna a URL do avatar ou um fallback profissional baseado em iniciais.
 */
export const getAvatarUrl = (fullName: string | null | undefined, avatarUrl: string | null | undefined): string => {
  const resolved = resolveFileUrl(avatarUrl, 'avatars');
  if (resolved) return resolved;
  
  const name = encodeURIComponent(fullName || 'User');
  return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=fff&size=200`;
};
