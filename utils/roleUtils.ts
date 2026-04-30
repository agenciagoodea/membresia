import { Member, UserRole } from '../types';

/**
 * Normaliza a role para garantir que strings variadas sejam tratadas corretamente.
 */
export const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return 'MEMBRO / VISITANTE';
  
  // Normalização agressiva: remove acentos, espaços extras e uppercase
  const value = String(role || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (['MASTER_ADMIN', 'MASTER ADMIN', 'ADMIN_MASTER'].includes(value)) return UserRole.MASTER_ADMIN;
  if (['CHURCH_ADMIN', 'ADMINISTRADOR DA IGREJA', 'ADMIN DA IGREJA', 'ADMIN_IGREJA'].includes(value)) return UserRole.CHURCH_ADMIN;
  if (['PASTOR', 'PASTORA'].includes(value)) return UserRole.PASTOR;
  if (['CELL_LEADER', 'LIDER DE CELULA', 'LIDER DE CELULA / DISCIPULADOR', 'LIDER DE CELULA / DISCIPULADORA', 'LIDER'].includes(value)) return UserRole.CELL_LEADER_DISCIPLE;
  if (['DISCIPULADOR', 'DISCIPULADORA'].includes(value)) return UserRole.CELL_LEADER_DISCIPLE;
  if (['MEMBER', 'MEMBRO', 'MEMBRO / VISITANTE', 'VISITANTE', 'VISITOR'].includes(value)) return UserRole.MEMBER_VISITOR;

  // Fallback para o valor original se não houver regra, ou Membro
  return role as string || UserRole.MEMBER_VISITOR;
};

/**
 * Retorna o rótulo amigável da role, com suporte a flexão de gênero.
 */
export const getRoleLabel = (member: Partial<Member>): string => {
  if (!member) return 'Membro';
  
  const role = normalizeRole(member.role);
  const gender = String(member.gender || (member as any).sex || '').toUpperCase();
  const isFemale = gender === 'FEMININO' || gender === 'F';

  if (role === UserRole.PASTOR) {
    return isFemale ? 'Pastora' : 'Pastor';
  }

  if (role === UserRole.CHURCH_ADMIN) {
    return 'Admin Igreja';
  }

  if (role === UserRole.MASTER_ADMIN) {
    return 'SaaS Admin';
  }

  if (role === UserRole.CELL_LEADER_DISCIPLE) {
    return isFemale ? 'Líder / Discipuladora' : 'Líder / Discipulador';
  }

  return 'Membro / Visitante';
};
