'use client';

import DOMPurify from 'isomorphic-dompurify';

export default function PublishPreview({ title, slug, content, cover, published }: {
  title: string; slug: string; content: string; cover: string; published: boolean;
}) {
  return (
    <details className="bg-white border border-gray-200 rounded-xl p-4">
      <summary className="cursor-pointer font-semibold text-sm">Kontrollo përpara ruajtjes</summary>
      <p className="text-sm my-3">
        {published ? 'Artikulli do të jetë publik pas ruajtjes.' : 'Artikulli do të ruhet si draft dhe nuk do të jetë publik.'}
      </p>
      <p className="text-sm break-all mb-3">Adresa: /blog/{slug || 'adresa-e-artikullit'}</p>
      <article aria-label="Parashikimi i publikimit" className="border-t pt-4">
        <h2 className="text-xl font-bold mb-3">{title || 'Titulli mungon'}</h2>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title || 'Imazhi kryesor i artikullit'} className="w-full max-h-64 object-contain rounded-lg mb-4" />
        ) : <p className="text-sm text-gray-500 mb-4">Pa imazh kryesor.</p>}
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
      </article>
    </details>
  );
}
