import { serverApiFetch } from '@/lib/server-fetch';
import Link from 'next/link';
import Image from 'next/image';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  _count: { posts: number };
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featureImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: { id: number; name: string; slug: string };
  author: { id: string; name: string; avatarUrl: string | null };
}

interface PostsResponse {
  data: BlogPost[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function getCategories(): Promise<BlogCategory[]> {
  try {
    const res = await serverApiFetch(`${API}/blog/categories`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('Kategoritë e blogut nuk u ngarkuan.');
    return res.json();
  } catch {
    throw new Error('Kategoritë e blogut nuk u ngarkuan.');
  }
}

async function getPosts(category?: string, page = 1): Promise<PostsResponse> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (category) params.set('category', category);
    const res = await serverApiFetch(`${API}/blog/posts?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Artikujt nuk u ngarkuan.');
    return res.json();
  } catch {
    throw new Error('Artikujt nuk u ngarkuan.');
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageStr } = await searchParams;
  const currentPage = Number(pageStr ?? 1);

  const [categories, postsRes] = await Promise.all([
    getCategories(),
    getPosts(category, currentPage),
  ]);

  const { data: posts, meta } = postsRes;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#1B3A2D] text-white py-14 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Blog</h1>
          <p className="text-white/70 text-sm md:text-base max-w-xl mx-auto">
            Artikuj, këshilla dhe lajme nga tregu i punës dhe karriera.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Categories grid */}
        {categories.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Kategoritë</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* All posts tab */}
              <Link
                href="/blog"
                className={`rounded-xl border px-4 py-3 text-center transition-all ${
                  !category
                    ? 'bg-[#1B3A2D] text-white border-[#1B3A2D] shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#1B3A2D]/30 hover:shadow-sm'
                }`}
              >
                <p className="font-semibold text-sm">Të Gjitha</p>
                <p className={`text-xs mt-0.5 ${!category ? 'text-white/70' : 'text-gray-400'}`}>
                  {meta.total} artikuj
                </p>
              </Link>

              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className={`rounded-xl border px-4 py-3 text-center transition-all ${
                    category === cat.slug
                      ? 'bg-[#1B3A2D] text-white border-[#1B3A2D] shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#1B3A2D]/30 hover:shadow-sm'
                  }`}
                >
                  <p className="font-semibold text-sm truncate">{cat.name}</p>
                  <p className={`text-xs mt-0.5 ${category === cat.slug ? 'text-white/70' : 'text-gray-400'}`}>
                    {cat._count.posts} artikuj
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Posts grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-500 font-medium">Nuk ka artikuj ende.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {posts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                    {/* Feature image */}
                    <div className="relative w-full aspect-[3/2] bg-gray-100 overflow-hidden shrink-0">
                      {post.featureImage ? (
                        <Image
                          src={post.featureImage}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1B3A2D]/10 to-[#1B3A2D]/5">
                          <span className="text-2xl opacity-30">📰</span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-[#1B3A2D]/90 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        {post.category.name}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-xs sm:text-sm text-dark leading-snug mb-1 group-hover:text-accent transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2 min-h-[2.5em]">
                        {post.excerpt || ''}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">Oferta Suksesi</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(post.publishedAt ?? post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {currentPage > 1 && (
                  <Link
                    href={`/blog?${category ? `category=${category}&` : ''}page=${currentPage - 1}`}
                    className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    ← Para
                  </Link>
                )}
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
                  <Link
                    key={p}
                    href={`/blog?${category ? `category=${category}&` : ''}page=${p}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                      p === currentPage
                        ? 'bg-[#1B3A2D] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {currentPage < meta.totalPages && (
                  <Link
                    href={`/blog?${category ? `category=${category}&` : ''}page=${currentPage + 1}`}
                    className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    Pas →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
