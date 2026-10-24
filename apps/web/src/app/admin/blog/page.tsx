'use client';
import ValidatedForm from '@/components/ui/ValidatedForm';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  category: { id: number; name: string; slug: string };
  author: { id: string; name: string };
}

interface PostsResponse {
  data: BlogPost[];
  meta: { total: number };
}

export default function AdminBlogPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [revision, reload] = useState(0);
  const [error, setError] = useState('');
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError('');
    let active = true;
    adminFetch<PostsResponse>(`/blog/posts/admin?limit=25&page=${page}&search=${encodeURIComponent(search)}&published=${published}`, token)
      .then(res => { if (!active) return; setPosts(res.data); setTotal(res.meta.total); })
      .catch(() => { if (active) setError('Artikujt nuk u ngarkuan.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, page, revision, search, published]);

  async function togglePublished(post: BlogPost) {
 return runAction(async () => {

    if (!token) return;
    try {
    const updated = await adminFetch<BlogPost>(`/blog/posts/${post.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: !post.isPublished }),
    });
    setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, isPublished: updated.isPublished } : p)); reload(n => n+1);
    } catch { setError("Ndryshimi dështoi. Provoni përsëri."); }

 });
}

  async function deletePost(id: string) {
 return runAction(async () => {

    if (!token || !window.confirm('Jeni i sigurt që doni ta fshini këtë artikull?')) return;
    try {
    await adminFetch(`/blog/posts/${id}`, token, { method: 'DELETE' });
    setPosts(prev => prev.filter(p => p.id !== id));
    if (posts.length === 1 && page > 1) setPage(p => p-1); else reload(n => n+1);
    } catch { setError("Fshirja dështoi. Provoni përsëri."); }

 });
}

  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-5">
      {error && <p role="alert">{error} <button onClick={() => reload(n => n+1)}>Provo përsëri</button></p>}
      <ValidatedForm className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}><input aria-label="Kërko artikuj" className="border rounded p-2" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Titulli i artikullit"/><select aria-label="Statusi i artikullit" className="border rounded p-2" value={published} onChange={e => {setPublished(e.target.value); setPage(1);}}><option value="">Të gjitha</option><option value="true">Publikuar</option><option value="false">Draft</option></select><button className="border rounded p-2">Kërko</button></ValidatedForm>
      <nav aria-label="Faqet e artikujve" className="flex gap-4"><button disabled={page === 1} onClick={() => setPage(p => p-1)}>← Para</button><span>Faqja {page} / {Math.max(1,Math.ceil(total/25))}</span><button disabled={page*25 >= total} onClick={() => setPage(p => p+1)}>Tjetër →</button></nav>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Blog</h1>
          <p className="text-gray-500 text-sm">{total} artikuj gjithsej</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/blog/kategorite"
            className="px-3 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Kategoritë
          </Link>
          <Link
            href="/admin/blog/e-re"
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            + Artikull i Ri
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? <p className="p-5">Lista nuk është e disponueshme. Përdorni butonin për riprovim.</p> : posts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-4">Nuk ka artikuj ende.</p>
            <Link
              href="/admin/blog/e-re"
              className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
              Krijo artikullin e parë
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm" data-responsive="cards">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Titulli</th>
                <th className="hidden md:table-cell text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Kategoria</th>
                <th className="hidden lg:table-cell text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Autori</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase">Statusi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3" data-label="Titulli">
                    <p className="font-semibold text-dark text-sm line-clamp-1">{post.title}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">/blog/{post.slug}</p>
                  </td>
                  <td className="hidden md:table-cell px-3 py-3" data-label="Kategoria">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {post.category.name}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-3 py-3 text-xs text-gray-500" data-label="Autori">
                    {post.author.name}
                  </td>
                  <td className="px-3 py-3" data-label="Statusi">
                    <button
                      onClick={() => togglePublished(post)}
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                        post.isPublished
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {post.isPublished ? 'Publikuar' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3" data-label="Veprime">
                    <div className="flex items-center justify-end gap-1.5">
                      {post.isPublished && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="px-2 py-1 border border-gray-200 text-gray-500 text-xs font-bold rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Shiko
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="px-2 py-1 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-dark transition-colors"
                      >
                        Edito
                      </Link>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md hover:bg-red-100 transition-colors"
                      >
                        Fshij
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </ActionRegion>;
}
