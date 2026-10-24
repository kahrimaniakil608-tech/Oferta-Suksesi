export default function ListingSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-2/5 mt-1" />
        <div className="flex justify-between mt-1">
          <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          <div className="h-2.5 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
