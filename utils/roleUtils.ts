import { Member, UserRole } from '../types';

/**
 * Normaliza a role para garantir que strings variadas sejam tratadas corretamente.
 */
export const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return 'MEMBER';
  const r = role.toUpperCase();
  
  if (r.includes('PASTOR')) return 'PASTOR';
  if (r.includes('ADMIN') && (r.includes('IGREJA') || r.includes('CHURCH'))) return 'CHURCH_ADMIN';
  if (r.includes('ADMIN') && r.includes('MASTER')) return 'MASTER_ADMIN';
  if (r.includes('SUPERVISOR')) return 'SUPERVISOR';
  if (r.includes('LIDER') || r.includes('DISCIPULADOR') || r.includes('CELL')) return 'CELL_LEADER_DISCIPLE';
  
  return role; // Mantém original se não houver regra específica
};

/**
 * Retorna o rótulo amigável da role, com suporte a flexão de gênero para PASTORA.
 */
export const getRoleLabel = (member: Partial<Member>): string => {
  if (!member || !member.role) return 'Membro';
  
  const role = member.role;
  const gender = String(member.gender || member.sex || '').toUpperCase();
  const isFemale = gender === 'FEMININO' || gender === 'FEMININO' || gender === 'F';

  if (role === UserRole.PASTOR || role === 'PASTOR') {
    return isFemale ? 'Pastora' : 'Pastor';
  }

  if (role === UserRole.CHURCH_ADMIN || role === 'CHURCH_ADMIN' || role === 'ADMINISTRADOR DA IGREJA') {
    return 'Admin Igreja';
  }

  if (role === UserRole.MASTER_ADMIN || role === 'MASTER_ADMIN') {
    return 'SaaS Admin';
  }

  if (role === UserRole.CELL_LEADER_DISCIPLE || role === 'CELL_LEADER_DISCIPLE' || role.includes('LÍDER')) {
    return isFemale ? 'Líder / Discipuladora' : 'Líder / Discipulador';
  }

  return 'Membro';
};
