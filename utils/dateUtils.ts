
export const toDateInputValue = (value: any): string => {
  if (!value) return '';
  
  // Se já for string YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Se for DD/MM/YYYY
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  }

  // Se for ISO ou Timestamp
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const formatDateBR = (value: any): string => {
  if (!value) return '';
  
  const isoDate = toDateInputValue(value);
  if (!isoDate) return '';
  
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const formatDateToDb = (value: any): string | null => {
  const isoDate = toDateInputValue(value);
  return isoDate || null;
};
