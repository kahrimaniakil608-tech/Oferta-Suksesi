import { serverApiFetch } from '@/lib/server-fetch';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import sanitizeHtml from 'sanitize-html';
export const dynamic = 'force-dynamic';

function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 's', 'u', 'hr']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['style', 'class'] },
  });
}

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDesc?: string;
  isPublished: boolean;
  updatedAt: string;
}

async function getPage(slug: string): Promise<Page | null> {
  const res = await serverApiFetch(`${API}/pages/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Përmbajtja nuk mund të ngarkohet.');
  return res.json() as Promise<Page>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || !page.isPublished) return {};
  return {
    title: page.title,
    description: page.metaDesc,
  };
}

export default async function StaticPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page || !page.isPublished) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-accent transition-colors">Kryefaqja</Link>
          <span>/</span>
          <span className="text-dark font-medium">{page.title}</span>
        </nav>

        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-black text-dark mb-8 leading-tight">
            {page.title}
          </h1>

          {/* Rendered HTML content */}
          <div
            className="prose prose-gray max-w-none text-dark leading-relaxed
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-dark [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-dark [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-gray-600 [&_p]:mb-4 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1
              [&_li]:text-gray-600
              [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent-dark
              [&_strong]:font-semibold [&_strong]:text-dark
              [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: sanitize(page.content) }}
          />

          <div className="mt-10 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Përditësuar: {new Date(page.updatedAt).toLocaleDateString('sq-AL', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
