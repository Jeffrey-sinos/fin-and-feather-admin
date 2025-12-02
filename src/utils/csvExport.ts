export interface CSVColumn<T> {
  key: keyof T | ((item: T) => string | number | null | undefined);
  header: string;
}

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: CSVColumn<T>[]
): void => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create header row
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value: string | number | null | undefined;
      
      if (typeof col.key === 'function') {
        value = col.key(item);
      } else {
        value = item[col.key];
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""';
      }

      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  // Combine header and rows
  const csvContent = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
