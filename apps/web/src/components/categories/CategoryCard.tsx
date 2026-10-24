import Link from 'next/link';
import type { Category } from '@/lib/constants';

interface CategoryCardProps {
  category: Category;
  count?: number;
}

export default function CategoryCard({ category, count }: CategoryCardProps) {
  return (
    <Link
      href={`/kategorite/${category.slug}`}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group"
    >
      <span
        className="text-2xl leading-none shrink-0"
        role="img"
        aria-label={category.name}
      >
        {category.icon}
      </span>
      <span className="text-sm font-semibold text-dark group-hover:text-accent transition-colors leading-tight">
        {category.name}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">{count} shpallje</span>
      )}
    </Link>
  );
}
