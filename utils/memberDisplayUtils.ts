import { Member } from '../types';
import { getRoleLabel } from './roleUtils';

/**
 * Retorna o nome formatado do casal ou o nome individual se não for casado.
 */
export const getCoupleDisplayName = (member: Member, allMembers: Member[]): string => {
  if (!member) return '';
  
  // Se for casado e tiver spouse_id, tenta encontrar o cônjuge
  if (member.maritalStatus === 'Casado(a)' && member.spouseId) {
    const spouse = allMembers.find(m => m.id === member.spouseId);
    if (spouse) {
      // Ordenar por gênero (Homem primeiro por convenção)
      const isMale = member.gender === 'MASCULINO';
      const names = isMale 
        ? [member.fullName, spouse.fullName] 
        : [spouse.fullName, member.fullName];
      
      return `${names[0]} & ${names[1]}`;
    }
  }
  
  return member.fullName || (member as any).name || 'Membro';
};

/**
 * Gera opções deduplicadas para selects, agrupando casais.
 */
export const getGroupedMemberOptions = (list: Member[]) => {
  const processed = new Set<string>();
  const options: { id: string, label: string }[] = [];

  for (const m of list) {
    if (processed.has(m.id)) continue;

    if (m.maritalStatus === 'Casado(a)' && m.spouseId) {
      const spouse = list.find(s => s.id === m.spouseId);
      if (spouse) {
        processed.add(m.id);
        processed.add(spouse.id);
        
        const isMale = m.gender === 'MASCULINO';
        const label = isMale 
          ? `${m.fullName} & ${spouse.fullName}` 
          : `${spouse.fullName} & ${m.fullName}`;
          
        // Mostra o cargo no label para facilitar identificação
        const roleLabel = getRoleLabel(m);
        options.push({ id: m.id, label: `${label} (${roleLabel})` });
        continue;
      }
    }
    
    // Individual
    processed.add(m.id);
    const roleLabel = getRoleLabel(m);
    options.push({ 
      id: m.id, 
      label: `${m.fullName || (m as any).name || ''} (${roleLabel})` 
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
};
