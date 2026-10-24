'use client';
import Feedback from '@/components/ui/Feedback';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder = 'Shkruaj përmbajtjen këtu…' }: TiptapEditorProps) {
  const [preview, setPreview] = useState(false);
  const [imageAlt, setImageAlt] = useState('');
  const [error, setError] = useState('');
  const [linkUrl, setLinkUrl]       = useState('');
  const [showLink, setShowLink]     = useState(false);
  const [imageUrl, setImageUrl]     = useState('');
  const [showImage, setShowImage]   = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Përmbajtja e artikullit', 'aria-multiline': 'true' } },
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function insertLink() {
    if (!editor || !linkUrl) return;
    if (!/^https?:\/\//i.test(linkUrl)) { setError('Lidhja duhet të fillojë me https:// ose http://.'); return; }
    setError('');
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setShowLink(false);
  }

  function insertImage() {
    if (!editor || !imageUrl) return;
    if (!/^https?:\/\//i.test(imageUrl) || !imageAlt.trim()) { setError('Vendosni URL të sigurt dhe përshkrimin e fotos.'); return; }
    setError('');
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt.trim() }).run();
    setImageUrl('');
    setShowImage(false);
  }

  const btnBase = 'px-2 py-1 text-xs rounded font-medium transition-colors';
  const btnActive = 'bg-accent text-white';
  const btnInactive = 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex gap-2 p-3 border-b"><button type="button" className="border rounded p-2" aria-pressed={!preview} onClick={() => setPreview(false)}>Redakto</button><button type="button" className="border rounded p-2" aria-pressed={preview} onClick={() => setPreview(true)}>Parashiko artikullin</button></div>
      {error && <Feedback message={error} type="error" />}
      {preview && <article aria-label="Parashikimi i artikullit" className="prose p-4" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(editor.getHTML())}} />}
      <div hidden={preview}>
      {/* Toolbar */}
      <div aria-label="Formatimi i përmbajtjes" className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap gap-1">
        {/* Text style */}
        <button type="button" aria-label="Tekst i trashë" title="Tekst i trashë" aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btnBase} ${editor.isActive('bold') ? btnActive : btnInactive}`}>B</button>
        <button type="button" aria-label="Tekst i pjerrët" title="Tekst i pjerrët" aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btnBase} italic ${editor.isActive('italic') ? btnActive : btnInactive}`}>I</button>
        <button type="button" aria-label="Nënvizo" title="Nënvizo" aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${btnBase} underline ${editor.isActive('underline') ? btnActive : btnInactive}`}>U</button>
        <button type="button" aria-label="Vijëzo tekstin" title="Vijëzo tekstin" aria-pressed={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${btnBase} line-through ${editor.isActive('strike') ? btnActive : btnInactive}`}>S</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* Headings */}
        <button type="button" aria-label="Titull niveli 2" title="Titull niveli 2" aria-pressed={editor.isActive('heading', {level: 2})} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btnBase} ${editor.isActive('heading', { level: 2 }) ? btnActive : btnInactive}`}>H2</button>
        <button type="button" aria-label="Titull niveli 3" title="Titull niveli 3" aria-pressed={editor.isActive('heading', {level: 3})} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${btnBase} ${editor.isActive('heading', { level: 3 }) ? btnActive : btnInactive}`}>H3</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* Lists */}
        <button type="button" aria-label="Listë me pika" title="Listë me pika" aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btnBase} ${editor.isActive('bulletList') ? btnActive : btnInactive}`}>• Listë</button>
        <button type="button" aria-label="Listë e numëruar" title="Listë e numëruar" aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btnBase} ${editor.isActive('orderedList') ? btnActive : btnInactive}`}>1. Listë</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* Alignment */}
        <button type="button" aria-label="Rreshto majtas" title="Rreshto majtas" aria-pressed={editor.isActive({textAlign: 'left'})} onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`${btnBase} ${editor.isActive({ textAlign: 'left' }) ? btnActive : btnInactive}`}>←</button>
        <button type="button" aria-label="Rreshto në qendër" title="Rreshto në qendër" aria-pressed={editor.isActive({textAlign: 'center'})} onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`${btnBase} ${editor.isActive({ textAlign: 'center' }) ? btnActive : btnInactive}`}>↔</button>
        <button type="button" aria-label="Rreshto djathtas" title="Rreshto djathtas" aria-pressed={editor.isActive({textAlign: 'right'})} onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`${btnBase} ${editor.isActive({ textAlign: 'right' }) ? btnActive : btnInactive}`}>→</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* Blockquote & Code */}
        <button type="button" aria-label="Citim" title="Citim" aria-pressed={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${btnBase} ${editor.isActive('blockquote') ? btnActive : btnInactive}`}>" "</button>
        <button type="button" aria-label="Bllok kodi" title="Bllok kodi" aria-pressed={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${btnBase} font-mono ${editor.isActive('codeBlock') ? btnActive : btnInactive}`}>{`</>`}</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* Link */}
        <button type="button" onClick={() => setShowLink(v => !v)}
          className={`${btnBase} ${editor.isActive('link') ? btnActive : btnInactive}`} aria-pressed={editor.isActive('link')}>🔗 Lidhje</button>
        {editor.isActive('link') && (
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}
            className={`${btnBase} ${btnInactive}`}>Hiq lidhjen</button>
        )}

        {/* Image */}
        <button type="button" onClick={() => setShowImage(v => !v)}
          className={`${btnBase} ${btnInactive}`}>🖼 Imazh</button>

        <span className="w-px bg-gray-300 mx-1" />

        {/* HR */}
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={`${btnBase} ${btnInactive}`}>Vijë ndarëse</button>
      </div>

      {/* Link input */}
      {showLink && (
        <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="URL e lidhjes" type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertLink(); } }}
            placeholder="https://..."
            className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 outline-none focus:border-accent"
          />
          <button type="button" onClick={insertLink}
            className="px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded hover:bg-accent-dark transition-colors">
            Vendos
          </button>
          <button type="button" aria-label="Mbyll lidhjen" onClick={() => setShowLink(false)}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">✕</button>
        </div>
      )}

      {/* Image input */}
      {showImage && (
        <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="URL e fotos" type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertImage(); } }}
            placeholder="URL e imazhit (https://...)"
            className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 outline-none focus:border-accent"
          />
          <label className="text-xs">Përshkrimi i fotos<input className="block border rounded p-2" value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="Çfarë tregon fotoja?" /></label>
          <button type="button" onClick={insertImage}
            className="px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded hover:bg-accent-dark transition-colors">
            Shto
          </button>
          <button type="button" aria-label="Mbyll foton" onClick={() => setShowImage(false)}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">✕</button>
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[320px] text-sm text-dark focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
      </div>
    </div>
  );
}
