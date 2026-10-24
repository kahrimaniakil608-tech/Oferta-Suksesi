'use client';

import { useState } from 'react';
import { contactListing } from '@/lib/client-api';

interface ContactSectionProps {
  listingId: string;
  phone?: string;
  phones?: string[];
  email?: string | null;
  title: string;
}

/**
 * Format phone numbers for display.
 * Kosovo numbers get +383 formatting; international numbers with + are shown as-is.
 * Supports: Kosovo (+383), Albania (+355), Montenegro (+382), North Macedonia (+389),
 *           Serbia (+381), Slovenia (+386), Croatia (+385)
 */
function formatPhone(num: string): string {
  const trimmed = num.trim();

  // Already has international prefix (not Kosovo) — return as-is
  if (trimmed.startsWith('+') && !trimmed.startsWith('+383')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');

  // Known international prefixes (non-Kosovo) — return formatted with +
  const intlPrefixes = ['355', '382', '389', '381', '386', '385'];
  for (const pfx of intlPrefixes) {
    if (digits.startsWith(pfx)) return `+${digits}`;
  }

  // Kosovo: +383 or 383 prefix
  if (digits.startsWith('383') && digits.length >= 12) {
    const rest = digits.slice(3);
    return `+383 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  }

  // Kosovo local format: 044, 045, 048, 049, 043
  if (digits.startsWith('0') && digits.length >= 9) {
    const rest = digits.slice(1);
    return `+383 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  }

  // Kosovo operator prefix without 0 or 383
  if (digits.startsWith('4') && digits.length >= 8) {
    return `+383 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  // Fallback: return as-is
  return trimmed;
}

/** Ensure number is in E.164 digits for tel/wa/viber links */
function toE164(num: string): string {
  const trimmed = num.trim();
  const digits = trimmed.replace(/\D/g, '');

  // Already has known international prefix — return digits as-is
  const intlPrefixes = ['355', '382', '389', '381', '386', '385', '383'];
  for (const pfx of intlPrefixes) {
    if (digits.startsWith(pfx)) return digits;
  }

  // Kosovo local format
  if (digits.startsWith('0')) return `383${digits.slice(1)}`;
  if (digits.startsWith('4') && digits.length >= 8) return `383${digits}`;

  return digits;
}

export default function ContactSection({ listingId, phone, phones, email, title }: ContactSectionProps) {
  const [contactIndex, setContactIndex] = useState(0);
  const allPhones = phones?.length ? phones : (phone ? [phone] : []);

  function handleContact(type: 'PHONE' | 'WHATSAPP' | 'VIBER', num: string) {
    void contactListing(listingId, type);
    const e164 = toE164(num);
    const urls: Record<typeof type, string> = {
      PHONE:    `tel:+${e164}`,
      WHATSAPP: `https://wa.me/${e164}?text=${encodeURIComponent(`Përshëndetje, jam i interesuar për: ${title}`)}`,
      VIBER:    `viber://chat?number=%2B${e164}`,
    };
    window.open(urls[type], type === 'PHONE' ? '_self' : '_blank', 'noopener');
  }

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
      <h2 className="font-bold text-dark mb-3 text-sm">Kontakto Shitësin</h2>

      {allPhones.length > 0 ? (
        <div className="space-y-2">
          {allPhones.map((num, idx) => (
            <button
              key={idx}
              onClick={() => handleContact('PHONE', num)}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              {formatPhone(num)}
            </button>
          ))}

          {allPhones.length > 1 && <label className="block text-sm">Numri për WhatsApp / Viber
            <select className="w-full border rounded p-2 mt-1 bg-white" value={contactIndex} onChange={e => setContactIndex(Number(e.target.value))}>
              {allPhones.map((num, i) => <option key={i} value={i}>{formatPhone(num)}</option>)}
            </select>
          </label>}
          <p className="text-xs text-gray-600">Përdorni aplikacionin ku ky numër është i regjistruar.</p>
          <button
            onClick={() => handleContact('WHATSAPP', allPhones[Math.min(contactIndex, allPhones.length - 1)])}
            className="w-full flex items-center justify-center gap-2 bg-[#16793c] hover:bg-[#126332] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            WhatsApp
          </button>

          <button
            onClick={() => handleContact('VIBER', allPhones[Math.min(contactIndex, allPhones.length - 1)])}
            className="w-full flex items-center justify-center gap-2 bg-[#6251d8] hover:bg-[#6251d8] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <ViberIcon className="w-4 h-4" />
            Viber
          </button>

          {email && (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(`Interesim për: ${title}`)}`}
              className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <EmailIcon className="w-4 h-4" />
              {email}
            </a>
          )}
        </div>
      ) : email ? (
        <div className="space-y-2">
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(`Interesim për: ${title}`)}`}
            className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <EmailIcon className="w-4 h-4" />
            {email}
          </a>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2">
          Kontakti nuk është i disponueshëm.
        </p>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function ViberIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.398.002C8.473.028 3.01.595 1.03 6.862.5 8.375.25 9.833.216 11.676c-.046 2.532-.04 7.254 4.418 8.498v1.96s-.03.8.496.963c.637.196 1.013-.41 1.623-1.073l1.564-1.81c3.572.302 6.314-.39 6.62-.487.72-.233 4.795-1.51 5.153-6.163.37-4.8-.8-7.833-3.286-9.215C15.39.617 13.41-.024 11.4.002zm.077 1.638c1.74-.02 3.5.434 4.666 1.11 2.098 1.19 3.092 3.824 2.77 8.07-.306 3.89-3.635 4.84-4.263 5.043-.254.082-2.724.7-5.851.44l-.38-.032-2.204 2.545v-2.578l-.358-.11C2.73 15.064 2.7 10.8 2.74 8.616c.028-1.585.23-2.842.682-4.135C5.117 1.3 9.7 1.66 11.475 1.64zm-.18 2.39c-.1 0-.198.04-.272.112L9.67 5.45l-.047.042a.453.453 0 00-.03.55c.23.428.688 1.028.993 1.28l.055.046.057.038a.46.46 0 00.468.013l.474-.24.08-.038a2.28 2.28 0 01.226-.067c.09.02.14.088.16.108l.01.01.005.005 1.21 1.21.005.005.005.006c.016.02.09.076.11.16a2.28 2.28 0 01-.068.228l-.037.08-.24.473a.46.46 0 00.012.468l.039.057.045.055c.252.304.852.762 1.28.993a.453.453 0 00.55-.03l.042-.047 1.307-1.35a.38.38 0 00.112-.273c.03-1.76-2.69-3.72-3.51-3.81a.5.5 0 00-.05-.003zm-.127 2.543a3.888 3.888 0 00-3.9 3.88 3.888 3.888 0 003.9 3.882 3.888 3.888 0 003.9-3.882 3.888 3.888 0 00-3.9-3.88zm-.013 1.003a2.877 2.877 0 012.877 2.877 2.877 2.877 0 01-2.877 2.878 2.877 2.877 0 01-2.877-2.878 2.877 2.877 0 012.877-2.877zm0 1.003a1.874 1.874 0 100 3.748 1.874 1.874 0 000-3.748z" />
    </svg>
  );
}
