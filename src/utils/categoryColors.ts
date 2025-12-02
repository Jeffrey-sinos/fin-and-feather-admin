// Centralized category color system for consistent theming across all tables and charts

export interface CategoryColorConfig {
  bg: string;
  text: string;
  border: string;
  hex: string;
}

const CATEGORY_COLORS: Record<string, CategoryColorConfig> = {
  fish: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    hex: '#3B82F6'
  },
  seafood: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    hex: '#06B6D4'
  },
  chicken: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    hex: '#F97316'
  },
  eggs: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    hex: '#EAB308'
  },
  caviar: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    hex: '#8B5CF6'
  },
  premium_fish: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    hex: '#6366F1'
  },
  oils: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    hex: '#F59E0B'
  },
  oil: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    hex: '#F59E0B'
  },
  prepared_foods: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    hex: '#10B981'
  },
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    hex: '#6B7280'
  }
};

export const getCategoryColor = (category: string | null | undefined): CategoryColorConfig => {
  if (!category) return CATEGORY_COLORS.default;
  const normalizedCategory = category.toLowerCase().trim();
  return CATEGORY_COLORS[normalizedCategory] || CATEGORY_COLORS.default;
};

export const getCategoryBadgeClasses = (category: string | null | undefined): string => {
  const colors = getCategoryColor(category);
  return `${colors.bg} ${colors.text} ${colors.border}`;
};

export const getCategoryHexColor = (category: string | null | undefined): string => {
  return getCategoryColor(category).hex;
};

// Get all category colors for charts
export const getAllCategoryColors = (): Record<string, string> => {
  const colors: Record<string, string> = {};
  Object.keys(CATEGORY_COLORS).forEach(key => {
    if (key !== 'default') {
      colors[key] = CATEGORY_COLORS[key].hex;
    }
  });
  return colors;
};
