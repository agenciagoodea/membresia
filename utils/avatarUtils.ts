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
 * Suporta objeto member completo ou parâmetros individuais.
 */
export const getAvatarUrl = (
  fullNameOrMember: string | any | null | undefined, 
  avatarUrl?: string | null | undefined
): string => {
  let name = '';
  let url = '';

  if (fullNameOrMember && typeof fullNameOrMember === 'object') {
    const m = fullNameOrMember;
    name = m.fullName || m.name || 'User';
    // Ordem de prioridade: avatarUrl -> fotoUrl -> photoUrl -> imageUrl
    url = m.avatarUrl || m.avatar || m.fotoUrl || m.foto || m.photoUrl || m.photo || m.imageUrl || m.image;
  } else {
    name = (fullNameOrMember as string) || 'User';
    url = avatarUrl || '';
  }

  const resolved = resolveFileUrl(url, 'avatars');
  if (resolved) return resolved;
  
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=2563eb&color=fff&size=200`;
};
