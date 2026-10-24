import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politika e Privatësisë — OfertaSuksesi',
  description:
    'Politika e privatësisë së platformës OfertaSuksesi.com — si i mbledhim, përdorim dhe mbrojmë të dhënat tuaja.',
};

const sections = [
  {
    title: '1. Hyrje',
    content: `Kjo Politikë e Privatësisë shpjegon se si OfertaSuksesi.com (në tekstin e mëtejmë "Platforma") mbledh, përdor, ruan dhe mbron të dhënat personale të përdoruesve. Duke përdorur Platformën, ju pranoni praktikat e përshkruara në këtë dokument.`,
  },
  {
    title: '2. Të dhënat që mbledhim',
    content: `Ne mbledhim këto lloje të dhënash: informacione identifikuese (emri, mbiemri, adresa e emailit, numri i telefonit) gjatë regjistrimit ose publikimit të shpalljeve; të dhëna teknike (adresa IP, lloji i shfletuesit, sistemi operativ, faqet e vizituara) përmes cookies dhe teknologjive të ngjashme; të dhëna të shpalljeve (titujt, përshkrimet, fotografitë, çmimet) që publikoni në Platformë; të dhëna komunikimi kur na kontaktoni përmes formularit ose emailit.`,
  },
  {
    title: '3. Si i përdorim të dhënat',
    content: `Të dhënat tuaja përdoren për: ofrimin dhe mirëmbajtjen e shërbimeve të Platformës; verifikimin e llogarive dhe sigurinë e përdoruesve; përmirësimin e përvojës së përdoruesit dhe funksionalitetit; komunikimin me ju rreth llogarisë, shpalljeve, ose ndryshimeve në shërbim; parandalimin e mashtrimit dhe veprimtarive të paligjshme; përmbushjen e detyrimeve ligjore.`,
  },
  {
    title: '4. Cookies dhe teknologjitë e ndjekjes',
    content: `Platforma përdor cookies për të ruajtur preferencat tuaja, për të mbajtur sesionin e llogarisë, dhe për të analizuar trafikun e faqes. Cookies esenciale janë të nevojshme për funksionimin e Platformës. Cookies analitike na ndihmojnë të kuptojmë si përdoret Platforma. Ju mund të menaxhoni cookies përmes cilësimeve të shfletuesit tuaj, por disa funksione të Platformës mund të mos funksionojnë pa to.`,
  },
  {
    title: '5. Ndarja e të dhënave me palë të treta',
    content: `Nuk i shesim, tregëtojmë, ose transferojmë të dhënat tuaja personale palëve të treta, përveç në rastet e mëposhtme: kur kërkohet me ligj ose urdhër gjyqësor; me ofrues shërbimesh që na ndihmojnë në operimin e Platformës (p.sh. hosting, email), të cilët janë të detyruar të mbrojnë të dhënat tuaja; kur është e nevojshme për mbrojtjen e të drejtave, pronës, ose sigurisë sonë.`,
  },
  {
    title: '6. Siguria e të dhënave',
    content: `Marrim masa të arsyeshme teknike dhe organizative për të mbrojtur të dhënat tuaja personale nga qasja e paautorizuar, humbja, shkatërrimi, ose ndryshimi. Megjithatë, asnjë metodë transmetimi ose ruajtjeje elektronike nuk është 100% e sigurt, dhe nuk mund të garantojmë siguri absolute.`,
  },
  {
    title: '7. Ruajtja e të dhënave',
    content: `Të dhënat tuaja personale ruhen për aq kohë sa është e nevojshme për qëllimet e përshkruara në këtë politikë, ose sipas kërkesave ligjore. Kur të dhënat nuk janë më të nevojshme, ato fshihen ose anonimizohen.`,
  },
  {
    title: '8. Të drejtat tuaja',
    content: `Ju keni të drejtë të: qaseni në të dhënat tuaja personale që ne mbajmë; kërkoni korrigjimin e të dhënave të pasakta; kërkoni fshirjen e të dhënave tuaja (me përjashtime ligjore); tërhiqni pëlqimin për përpunimin e të dhënave në çdo kohë; paraqisni ankesë pranë autoritetit përkatës për mbrojtjen e të dhënave.`,
  },
  {
    title: '9. Privatësia e fëmijëve',
    content: `Platforma nuk është e destinuar për personat nën moshën 16 vjeç. Nuk mbledhim me vetëdije të dhëna personale nga fëmijët. Nëse zbulojmë se kemi mbledhur të dhëna nga një fëmijë, do t'i fshijmë ato menjëherë.`,
  },
  {
    title: '10. Ndryshimet në politikë',
    content: `OfertaSuksesi rezervon të drejtën të përditësojë këtë Politikë të Privatësisë në çdo kohë. Ndryshimet hyjnë në fuqi menjëherë pas publikimit në Platformë. Ju inkurajojmë ta rishikoni këtë faqe rregullisht.`,
  },
  {
    title: '11. Kontakti',
    content: `Për çdo pyetje ose kërkesë lidhur me privatësinë dhe të dhënat tuaja personale, na kontaktoni në: info@ofertasuksesi.com ose përmes faqes së Kontaktit.`,
  },
];

export default function PolitikaPrivatesise() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/80">Politika e Privatësisë</span>
          </nav>
          <div className="max-w-xl">
            <span className="inline-block bg-white/10 text-white/90 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Informacion ligjor
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
              Politika e Privatësisë
            </h1>
            <p className="text-lg text-white/75 leading-relaxed">
              Mësoni se si i mbledhim, përdorim dhe mbrojmë të dhënat tuaja personale.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
          <p className="text-sm text-gray-400 mb-8">
            Përditësuar së fundi: Mars 2026
          </p>

          <div className="space-y-8">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-lg font-bold text-dark mb-3">{s.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Keni pyetje rreth privatësisë? Na kontaktoni.
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
