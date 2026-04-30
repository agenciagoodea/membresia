import { UserRole } from '../types';

export const formatRoleLabel = (role: UserRole | string, gender?: 'M' | 'F' | 'MASCULINO' | 'FEMININO' | string): string => {
  const isFemale = gender === 'F' || gender === 'FEMININO';
  
  switch (role) {
    case UserRole.PASTOR:
    case 'PASTOR':
      return isFemale ? 'Pastora' : 'Pastor';
    case UserRole.CELL_LEADER_DISCIPLE:
    case 'CELL LEADER/DISCIPLE':
      return isFemale ? 'Líder de Célula' : 'Líder de Célula';
    case UserRole.MEMBER_VISITOR:
    case 'MEMBER/VISITOR':
      return isFemale ? 'Membro / Visitante' : 'Membro / Visitante';
    case UserRole.CHURCH_ADMIN:
    case 'CHURCH ADMIN':
      return 'Admin da Igreja';
    case UserRole.MASTER_ADMIN:
    case 'MASTER ADMIN':
      return 'Master Admin';
    default:
      return role || '';
  }
};
