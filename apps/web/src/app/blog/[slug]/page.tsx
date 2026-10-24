import { serverApiFetch } from '@/lib/server-fetch';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
export const dynamic = 'force-dynamic';

function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 's', 'u', 'hr']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['style', 'class'] },
  });
}

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featureImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  metaDesc: string | null;
  category: { id: number; name: string; slug: string };
  author: { id: string; name: string; avatarUrl: string | null };
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const res = await serverApiFetch(`${API}/blog/posts/${slug}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Artikulli nuk u ngarkua.');
  return res.json();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Postimi nuk u gjet' };
  return {
    title: post.title,
    description: post.metaDesc ?? post.excerpt ?? `${post.title} — Oferta Suksesi Blog`,
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feature image */}
      {post.featureImage && (
        <div className="relative w-full h-72 md:h-96 bg-gray-200 overflow-hidden">
          <Image
            src={post.featureImage}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Kreu</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-accent transition-colors">Blog</Link>
          <span>/</span>
          <Link href={`/blog?category=${post.category.slug}`} className="hover:text-accent transition-colors">
            {post.category.name}
          </Link>
          <span>/</span>
          <span className="text-gray-600 font-medium truncate max-w-[180px]">{post.title}</span>
        </nav>

        {/* Category badge */}
        <Link
          href={`/blog?category=${post.category.slug}`}
          className="inline-block mb-4 px-3 py-1 bg-[#1B3A2D]/10 text-[#1B3A2D] text-xs font-semibold rounded-full hover:bg-[#1B3A2D]/20 transition-colors"
        >
          {post.category.name}
        </Link>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-dark leading-tight mb-4">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-gray-500 text-base leading-relaxed mb-6 border-l-4 border-[#1B3A2D]/30 pl-4">
            {post.excerpt}
          </p>
        )}

        {/* Author & date */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-[#1B3A2D] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {post.author.avatarUrl ? (
              <Image src={post.author.avatarUrl} alt={post.author.name} width={40} height={40} className="rounded-full object-cover" />
            ) : (
              post.author.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-dark">{post.author.name}</p>
            <p className="text-xs text-gray-400">{formatDate(post.publishedAt ?? post.createdAt)}</p>
          </div>
        </div>

        {/* Content */}
        <div
          className="blog-content text-dark text-[15px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitize(post.content) }}
        />

        {/* Back to blog */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3A2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1B3A2D]/90 transition-colors"
          >
            ← Kthehu tek Blogu
          </Link>
        </div>
      </div>

      <style>{`
        .blog-content h2 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 0.75rem; color: #1a1a1a; }
        .blog-content h3 { font-size: 1.15rem; font-weight: 700; margin: 1.5rem 0 0.5rem; color: #1a1a1a; }
        .blog-content p  { margin: 0 0 1rem; }
        .blog-content ul { list-style: disc; padding-left: 1.5rem; margin: 0 0 1rem; }
        .blog-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0 0 1rem; }
        .blog-content li { margin-bottom: 0.25rem; }
        .blog-content a  { color: #1B3A2D; text-decoration: underline; }
        .blog-content a:hover { opacity: 0.8; }
        .blog-content blockquote { border-left: 4px solid #1B3A2D; padding-left: 1rem; color: #555; font-style: italic; margin: 1.5rem 0; }
        .blog-content pre { background: #f4f4f4; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; font-family: monospace; font-size: 0.875rem; margin: 1rem 0; }
        .blog-content code { background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-size: 0.875em; }
        .blog-content img { max-width: 100%; border-radius: 0.75rem; margin: 1.5rem 0; }
        .blog-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
        .blog-content strong { font-weight: 700; }
        .blog-content em { font-style: italic; }
        .blog-content s { text-decoration: line-through; }
        .blog-content [style*="text-align: center"] { text-align: center; }
        .blog-content [style*="text-align: right"]  { text-align: right; }
      `}</style>
    </div>
  );
}
