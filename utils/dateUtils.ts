
/**
 * Converte qualquer valor de data vindo do banco (ISO, YYYY-MM-DD, DD/MM/YYYY)
 * para o formato YYYY-MM-DD aceito pelo <input type="date" />.
 */
export const toDateInputValue = (date: any): string => {
  if (!date) return '';
  
  // Se já for YYYY-MM-DD
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Se for DD/MM/YYYY
  if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Tenta converter via objeto Date (ISO ou outros)
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Usar métodos UTC ou garantir que não haja mudança de dia por fuso horário
    // Para inputs de data de nascimento, o formato YYYY-MM-DD puro é o ideal
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    // Se a data original não tinha timezone (era apenas data), o Date() pode ter ajustado para o local
    // Mas vindo do Postgres tipo 'date', ele costuma vir como 'YYYY-MM-DD' que o Date interpreta como UTC 00:00
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

/**
 * Formata uma data para o padrão de salvamento no banco (YYYY-MM-DD)
 */
export const formatDateToDb = (date: string): string | null => {
  if (!date) return null;
  
  // Se vier do input date, já vem como YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Se vier como DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
};
