import ListingSkeleton from '@/components/ui/ListingSkeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header skeleton */}
      <div className="mb-6 space-y-2 animate-pulse">
        <div className="h-3.5 w-32 bg-gray-200 rounded" />
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </aside>

        {/* Grid skeleton */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <ListingSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
