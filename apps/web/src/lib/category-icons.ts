import { CATEGORIES } from '@/lib/constants';

// Keep the original category artwork when legacy records have no saved icon.
// Match slugs rather than IDs, which can differ between database imports.
export function withCategoryIcon<T extends { slug: string; icon?: string | null }>(
  category: T,
): T & { icon: string } {
  return {
    ...category,
    icon: category.icon?.trim()
      || CATEGORIES.find((original) => original.slug === category.slug)?.icon
      || '📁',
  };
}
