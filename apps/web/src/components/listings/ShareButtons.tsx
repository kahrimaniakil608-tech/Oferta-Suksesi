'use client';

import { useRef, useState } from 'react';

interface ShareButtonsProps {
  title: string;
}

export default function ShareButtons({ title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const lock = useRef(false);

  async function copyLink() {
    if (lock.current) return;
    lock.current = true; setCopying(true); setCopied(false); setManualUrl('');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setManualUrl(window.location.href);
    } finally {
      lock.current = false; setCopying(false);
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`${title}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  function shareViber() {
    const text = encodeURIComponent(`${title}\n${window.location.href}`);
    window.open(`viber://forward?text=${text}`, '_blank', 'noopener');
  }

  function shareFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,width=600,height=400');
  }

  function shareX() {
    const text = encodeURIComponent(`${title}\n${window.location.href}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank', 'noopener,width=600,height=400');
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Ndaj me të tjerët
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyLink}
          disabled={copying}
          aria-label="Kopjo linkun" title="Kopjo linkun"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            copied
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
          {copying ? 'Duke kopjuar…' : copied ? 'Kopjuar!' : 'Kopjo'}
        </button>

        <button
          onClick={shareWhatsApp}
          aria-label="Ndaj në WhatsApp" title="Ndaj në WhatsApp"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <WAIcon className="w-3.5 h-3.5 text-[#25D366]" />
          WhatsApp
        </button>

        <button
          onClick={shareFacebook}
          aria-label="Ndaj në Facebook" title="Ndaj në Facebook"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <FBIcon className="w-3.5 h-3.5 text-[#1877F2]" />
          Facebook
        </button>

        <button
          onClick={shareX}
          aria-label="Ndaj në X" title="Ndaj në X"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <XIcon className="w-3.5 h-3.5 text-black" />
          X
        </button>

        <button
          onClick={shareViber}
          aria-label="Ndaj në Viber" title="Ndaj në Viber"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ViberIcon className="w-3.5 h-3.5 text-[#7360F2]" />
          Viber
        </button>
      </div>
      {copied && <p role="status" className="mt-2 text-sm text-primary">Linku u kopjua.</p>}
      {manualUrl && <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p role="alert" className="mb-2 text-sm text-gray-700">Kopjimi automatik nuk u lejua. Zgjidhni dhe kopjoni linkun më poshtë.</p>
        <label className="text-sm font-medium">Linku i shpalljes<input readOnly value={manualUrl} onFocus={event => event.target.select()} className="mt-1 w-full rounded border border-gray-300 bg-white p-2 text-sm" /></label>
      </div>}
    </div>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function WAIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function FBIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function ViberIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.4.002c-2 .026-7.46.593-9.44 6.86-.53 1.513-.78 2.97-.81 4.814-.047 2.532-.04 7.254 4.417 8.498v1.96s-.03.8.496.963c.638.196 1.013-.41 1.624-1.073l1.563-1.81c3.573.302 6.315-.39 6.62-.487.72-.233 4.796-1.51 5.154-6.163.37-4.8-.8-7.833-3.286-9.215C15.39.617 13.41-.024 11.4.002z" />
    </svg>
  );
}
