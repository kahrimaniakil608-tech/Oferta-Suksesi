'use client';
import PublishPreview from '@/components/editor/PublishPreview';
import ReferenceFeedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';
import Feedback from '@/components/ui/Feedback';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import Field from '@/components/ui/Field';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

const TiptapEditor = dynamic(() => import('@/components/editor/TiptapEditor'), { ssr: false });

interface BlogCategory {
  id: number;
  name: string;
}

function deriveSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/ä/g, 'a')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function NewBlogPostPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const { token } = useAuth();
  const [referenceError, setReferenceError] = useState('');
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceRevision, retryReferences] = useState(0);
  const router = useRouter();

  const [categories,   setCategories]   = useState<BlogCategory[]>([]);
  const [title,        setTitle]        = useState('');
  const [slug,         setSlug]         = useState('');
  const [excerpt,      setExcerpt]      = useState('');
  const [content,      setContent]      = useState('');
  const [featureImage, setFeatureImage] = useState('');
  const [categoryId,   setCategoryId]   = useState('');
  const [metaDesc,     setMetaDesc]     = useState('');
  const [isPublished,  setIsPublished]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const { dirty, markSaved } = useUnsavedChanges({title,slug,excerpt,content,featureImage,categoryId,metaDesc,isPublished}, !referenceLoading && !referenceError);


  useEffect(() => {
    if (!token) return;
    setReferenceLoading(true); setReferenceError('');
    adminFetch<BlogCategory[]>('/blog/categories', token).then(setCategories).catch(() => setReferenceError('Kategoritë nuk u ngarkuan.')).finally(() => setReferenceLoading(false));
  }, [token, referenceRevision]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug || slug === deriveSlug(title)) {
      setSlug(deriveSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
 return runAction(async () => {

    e.preventDefault();
    if (!token) return;
    if (!title.trim() || !slug.trim() || !content.trim() || !categoryId) {
      setError('Titulli, slug-u, kategoria dhe përmbajtja janë të detyrueshme.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminFetch('/blog/posts', token, {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          excerpt: excerpt || undefined,
          content,
          featureImage: featureImage || undefined,
          categoryId: Number(categoryId),
          metaDesc: metaDesc || undefined,
          isPublished,
        }),
      });
      markSaved();
      router.push('/admin/blog');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.');
    } finally {
      setSaving(false);
    }

 });
}

  if (referenceError) return <ReferenceFeedback message={referenceError} type="error" retry={() => retryReferences(n => n+1)} />;
  if (referenceLoading) return <p role="status">Duke ngarkuar formularin…</p>;
  return <ActionRegion busy={actionBusy} error={actionError}>
    {dirty && <p role="status" className="mb-3 text-sm text-amber-800">Keni ndryshime të paruajtura.</p>}
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/blog" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Blog
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-dark">Artikull i Ri</h1>
      </div>

      <ValidatedForm onSubmit={handleSubmit} className="space-y-5">
        <Feedback message={error} type="error" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              {/* Title */}
              <Field>
                <label className="block text-sm font-semibold text-dark mb-1.5">Titulli *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => handleTitleChange(e.currentTarget.value)}
                  placeholder="p.sh. 10 Këshilla për CV-në tuaj"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  required
                />
              </Field>

              {/* Slug */}
              <Field>
                <label className="block text-sm font-semibold text-dark mb-1.5">
                  Slug (URL) *
                  <span className="ml-2 text-xs text-gray-400 font-normal">/blog/{slug || 'slug-i-artikullit'}</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="10-keshilla-per-cv"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  required
                />
              </Field>

              {/* Excerpt */}
              <Field>
                <label className="block text-sm font-semibold text-dark mb-1.5">
                  Abstrakt
                  <span className="ml-2 text-xs text-gray-400 font-normal">opsionale — shfaqet në listë dhe SEO</span>
                </label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.currentTarget.value)}
                  rows={2}
                  placeholder="Përshkrim i shkurtër i artikullit…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </Field>
            </div>

            {/* Content editor */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-dark mb-3">Përmbajtja *</label>
              <TiptapEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <PublishPreview title={title} slug={slug} content={content} cover={featureImage} published={isPublished} />
            {/* Publish */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-dark">Publikimi</h2>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch" aria-label="Publiko artikullin" aria-checked={isPublished} onClick={() => setIsPublished(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    isPublished ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    isPublished ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className="text-sm text-dark font-medium">
                  {isPublished ? 'Publikuar' : 'Draft'}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Duke ruajtur…' : 'Ruaj'}
                </button>
                <Link
                  href="/admin/blog"
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anulo
                </Link>
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <label htmlFor="blog-category" className="block text-sm font-semibold text-dark mb-3">Kategoria *</label>
              {categories.length === 0 ? (
                <div className="text-xs text-gray-400">
                  Nuk ka kategori.{' '}
                  <Link href="/admin/blog/kategorite" className="text-primary underline">Shto një</Link>
                </div>
              ) : (
                <select id="blog-category" aria-label="Kategoria e artikullit"
                  value={categoryId}
                  onChange={e => setCategoryId(e.currentTarget.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white"
                  required
                >
                  <option value="">Zgjidh kategorinë…</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Feature image */}
            <Field className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-dark mb-3">Imazhi kryesor</label>
              <input
                type="url"
                value={featureImage}
                onChange={e => setFeatureImage(e.currentTarget.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              {featureImage && (
                <img src={featureImage} alt={title || "Imazhi kryesor i artikullit"} className="mt-3 w-full rounded-lg object-cover aspect-video" />
              )}
            </Field>

            {/* SEO */}
            <Field className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-dark mb-1.5">
                Meta Përshkrimi
                <span className="ml-1 text-xs text-gray-400 font-normal">SEO</span>
              </label>
              <textarea
                value={metaDesc}
                onChange={e => setMetaDesc(e.currentTarget.value)}
                rows={3}
                maxLength={160}
                placeholder="Përshkrim i shkurtër për motorët e kërkimit…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{metaDesc.length}/160</p>
            </Field>
          </div>
        </div>
      </ValidatedForm>
    </div>
  </ActionRegion>;
}
