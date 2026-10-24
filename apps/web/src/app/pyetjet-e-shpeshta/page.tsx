'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  {
    category: 'Publikimi i shpalljeve',
    items: [
      {
        q: 'Si mund të publikoj një shpallje?',
        a: 'Mund të postoni me llogari ose si mysafir. Për të filluar, klikoni butonin "Posto Shpallje" dhe plotësoni formularin me informacionet e nevojshme: titullin, përshkrimin, kategorinë, foton, dhe çmimin. Pas dërgimit, shpallja do të kalojë në procesin e aprovimit.',
      },
      {
        q: 'A mund ta dërgoj shpalljen përmes Viber ose WhatsApp?',
        a: 'Po! Nëse keni vështirësi me publikimin online, mund të na dërgoni detajet e shpalljes përmes WhatsApp ose Viber në numrin +383 44 50 68 50. Dërgoni foton, përshkrimin, çmimin, dhe numrin tuaj të kontaktit. Ekipi ynë do ta publikojë shpalljen për ju.',
      },
      {
        q: 'Sa kushton publikimi i një shpallje?',
        a: 'Publikimi i shpalljeve bazë është falas. Nëse dëshironi që shpallja juaj të jetë më e dukshme, ofrojmë opsione premium si shpallje të sponsorizuara dhe pozicionim më të lartë në rezultate.',
      },
      {
        q: 'Sa foto mund të shtoj në një shpallje?',
        a: 'Formulari tregon kufirin aktual të fotove (deri në 8) dhe nëse fotoja është e detyrueshme. Rekomandojmë të përdorni foto të qarta dhe cilësore për të tërhequr më shumë interes.',
      },
    ],
  },
  {
    category: 'Aprovimi i shpalljeve',
    items: [
      {
        q: 'Sa kohë duhet që shpallja të aprovohet?',
        a: 'Zakonisht shpalljet aprovohen brenda 1-24 orëve gjatë ditëve të punës (E hënë - E shtunë). Gjatë fundjavës ose festave, aprovimi mund të zgjasë pak më shumë.',
      },
      {
        q: 'Pse nuk u aprovua shpallja ime?',
        a: 'Shpalljet mund të refuzohen nëse: përmbajnë informacione të pasakta ose mashtruese; fotot janë të cilësisë së dobët ose nuk përputhen me produktin; përmbajtja shkel kushtet e përdorimit; shpallja është e dyfisht (tashmë ekziston); kategoria e zgjedhur nuk përputhet me produktin/shërbimin.',
      },
      {
        q: 'Çfarë bëj nëse shpallja ime nuk aprovohet?',
        a: 'Nëse shpallja juaj nuk aprovohet, mund të: kontrolloni emailin për arsyen e refuzimit; korrigjoni problemet dhe ripublikoni shpalljen; na kontaktoni në info@ofertasuksesi.com ose na thirrni në +383 44 50 68 50 për ndihmë.',
      },
    ],
  },
  {
    category: 'Llogaria dhe siguria',
    items: [
      {
        q: 'Si mund ta ndryshoj fjalëkalimin?',
        a: 'Hyni në llogarinë tuaj, shkoni tek "Paneli" > "Cilësimet" dhe aty do të gjeni opsionin për ndryshimin e fjalëkalimit. Nëse keni harruar fjalëkalimin, përdorni opsionin "Keni harruar fjalëkalimin?" në faqen e kyqjes.',
      },
      {
        q: 'Si mund ta fshij llogarinë time?',
        a: 'Për fshirjen e llogarisë, na kontaktoni në info@ofertasuksesi.com me kërkesën tuaj. Ekipi ynë do ta përpunojë kërkesën brenda 48 orëve.',
      },
    ],
  },
  {
    category: 'Kontakti dhe mbështetja',
    items: [
      {
        q: 'Si mund t\'ju kontaktoj?',
        a: 'Mund të na kontaktoni në disa mënyra: përmes formularit të kontaktit në faqen e Kontaktit; me email në info@ofertasuksesi.com; me telefon në +383 44 50 68 50 (E hënë – E shtunë, 08:00–16:00); përmes rrjeteve sociale (Facebook, Instagram).',
      },
      {
        q: 'Sa shpejt përgjigjeni?',
        a: 'Përpiqemi t\'ju kthejmë përgjigje brenda 24 orëve gjatë ditëve të punës. Për çështje urgjente, rekomandojmë të na thirrni direkt në telefon.',
      },
    ],
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenIndex((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/80">Pyetjet e Shpeshta</span>
          </nav>
          <div className="max-w-xl">
            <span className="inline-block bg-white/10 text-white/90 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Ndihmë
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
              Pyetjet e Shpeshta
            </h1>
            <p className="text-lg text-white/75 leading-relaxed">
              Gjeni përgjigje për pyetjet më të zakonshme rreth platformës sonë.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-10">
          {faqs.map((group) => (
            <div key={group.category}>
              <h2 className="text-lg font-bold text-dark mb-4">{group.category}</h2>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const id = `${group.category}-${item.q}`;
                  const isOpen = openIndex === id;
                  return (
                    <div
                      key={id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    >
                      <button
                        aria-expanded={isOpen} aria-controls={`faq-${id}`} onClick={() => toggle(id)}
                        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                      >
                        <span className="font-semibold text-dark text-sm">{item.q}</span>
                        <svg
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div id={`faq-${id}`} className="px-6 pb-5">
                          <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <h3 className="text-lg font-black text-dark mb-2">Nuk e gjeni përgjigjen?</h3>
          <p className="text-gray-500 text-sm mb-5">
            Na kontaktoni dhe do t&apos;ju ndihmojmë sa më shpejt.
          </p>
          <Link
            href="/kontakti"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Na kontaktoni
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
