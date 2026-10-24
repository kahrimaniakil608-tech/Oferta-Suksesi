'use client';
import Feedback from '@/components/ui/Feedback';
import ValidatedForm from '@/components/ui/ValidatedForm';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const contactCards = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    label: 'Email i përgjithshëm',
    value: 'info@ofertasuksesi.com',
    href: 'mailto:info@ofertasuksesi.com',
    note: 'Përgjigje brenda 24 orëve',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    label: 'Telefon',
    value: <>+383 44 50 68 50<br />+383 49 50 68 50</>,
    href: 'tel:+38344506850',
    note: 'E hënë – E shtunë, 08:00–16:00',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: 'Adresa',
    value: 'Murat Mehmeti 7, Tophane, Prishtinë',
    href: 'https://maps.google.com/?q=Murat+Mehmeti+7+Tophane+Prishtine+Kosovo',
    note: 'Kosovë 10000',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    label: 'Shpalljet',
    value: 'shpallje@ofertasuksesi.com',
    href: 'mailto:shpallje@ofertasuksesi.com',
    note: 'Për pyetje rreth shpalljeve',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    label: 'Redaksia',
    value: 'redaksia@ofertasuksesi.com',
    href: 'mailto:redaksia@ofertasuksesi.com',
    note: 'Për lajme dhe artikuj',
  },
];

const departments = [
  { id: 'pergjithshme', label: 'Pyetje të përgjithshme' },
  { id: 'mbeshtetje', label: 'Mbështetje teknike' },
  { id: 'reklamat', label: 'Reklamat & partneritete' },
  { id: 'redaksia', label: 'Redaksia' },
  { id: 'tjera', label: 'Të tjera' },
];

export default function Kontakti() {
  useEffect(() => { const reference = new URLSearchParams(window.location.search).get('reference'); if (reference) setForm(p => ({...p, subject: `Shpallja: ${reference.slice(0,100)}`})); }, []);
  const [form, setForm] = useState({ name: '', email: '', dept: 'pergjithshme', subject: '', message: '' });
  const requestKey = useRef<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    requestKey.current = null;
    const { name, value } = e.currentTarget;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: requestKey.current, name: form.name, email: form.email, subject: `[${form.dept}] ${form.subject}`, message: form.message }),
      });
      if (!response.ok) throw new Error('Mesazhi nuk u pranua. Ju lutem provoni përsëri.');
      setStatus('sent');
    } catch (error) { setStatus('error'); setError(error instanceof Error ? error.message : 'Lidhja dështoi. Provoni përsëri.'); }

  }

  return (
    <div className="min-h-screen bg-gray-50">

      {error && <Feedback message={error} type="error" />}
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/80">Kontakti</span>
          </nav>
          <div className="max-w-xl">
            <span className="inline-block bg-white/10 text-white/90 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Na kontaktoni
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
              Si mund t'ju ndihmojmë?
            </h1>
            <p className="text-lg text-white/75 leading-relaxed">
              Ekipi ynë është këtu për çdo pyetje, sugjerim apo bashkëpunim.
              Shkruani dhe do t'ju kthejmë përgjigje sa më shpejt.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Contact cards */}
          <div className="space-y-4">
            {contactCards.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-accent/30 hover:shadow-sm transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{c.label}</p>
                  <p className="font-semibold text-dark text-sm">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.note}</p>
                </div>
              </a>
            ))}

            {/* Social links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 font-medium mb-3">Rrjetet sociale</p>
              <div className="flex gap-3">
                {[
                  {
                    label: 'Facebook',
                    href: 'https://www.facebook.com/OfertaSuksesi1996',
                    icon: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Instagram',
                    href: 'https://www.instagram.com/ofertasuksesi1996/',
                    icon: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'X',
                    href: 'https://x.com/ofertasuksesi96',
                    icon: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-accent hover:text-white text-gray-500 flex items-center justify-center transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {status === 'sent' ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-dark">Mesazhi u dërgua!</h2>
                <p className="text-gray-500 max-w-sm leading-relaxed">
                  Faleminderit që na kontaktuat. Do t'ju kthejmë përgjigje brenda
                  24 orëve në adresën tuaj të emailit.
                </p>
                <button
                  onClick={() => { requestKey.current = null; setStatus('idle'); setForm({ name: '', email: '', dept: 'pergjithshme', subject: '', message: '' }); }}
                  className="mt-2 text-sm text-accent font-semibold underline underline-offset-2 hover:text-accent-dark"
                >
                  Dërgoni mesazh tjetër
                </button>
              </div>
            ) : (
              <ValidatedForm
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5"
              >
                <h2 className="text-xl font-black text-dark">Dërgoni mesazh</h2>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1.5" htmlFor="name">
                      Emri i plotë <span className="text-accent">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="p.sh. Arta Gashi"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1.5" htmlFor="email">
                      Adresa e emailit <span className="text-accent">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="arta@shembull.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5" htmlFor="dept">
                    Departamenti
                  </label>
                  <select
                    id="dept"
                    name="dept"
                    value={form.dept}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5" htmlFor="subject">
                    Titulli i mesazhit <span className="text-accent">*</span>
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Shkruani titullin e mesazhit..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5" htmlFor="message">
                    Mesazhi <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Shkruani mesazhin tuaj këtu..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-accent hover:bg-accent-dark disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Duke dërguar...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      Dërgoni mesazhin
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Duke dërguar këtë formular, pranoni{' '}
                  <Link href="/politikat-e-privatesise" className="underline hover:text-accent">
                    Politikën e Privatësisë
                  </Link>{' '}
                  tonë.
                </p>
              </ValidatedForm>
            )}
          </div>
        </div>

        {/* FAQ teaser */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <h3 className="text-lg font-black text-dark mb-2">Keni pyetje të shpeshta?</h3>
          <p className="text-gray-500 text-sm mb-5">
            Ndoshta përgjigja është tashmë tek udhëzimet tona.
          </p>
          <Link
            href="/pyetjet-e-shpeshta"
            className="inline-flex items-center gap-2 text-accent font-semibold text-sm hover:underline"
          >
            Shiko pyetjet e shpeshta
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
