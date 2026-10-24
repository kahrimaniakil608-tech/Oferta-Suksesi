import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kushtet e Përdorimit — OfertaSuksesi',
  description:
    'Kushtet dhe rregullat e përdorimit të platformës OfertaSuksesi.com.',
};

const sections = [
  {
    title: '1. Pranimi i kushteve',
    content: `Duke përdorur platformën OfertaSuksesi.com (në tekstin e mëtejmë "Platforma"), ju pranoni të respektoni këto kushte përdorimi. Nëse nuk pajtoheni me ndonjë nga kushtet e mëposhtme, ju lutemi mos e përdorni Platformën. OfertaSuksesi rezervon të drejtën të ndryshojë këto kushte në çdo kohë, dhe ndryshimet hyjnë në fuqi menjëherë pas publikimit.`,
  },
  {
    title: '2. Përshkrimi i shërbimit',
    content: `OfertaSuksesi.com është platformë e shpalljeve të klasifikuara që u mundëson përdoruesve të publikojnë, kërkojnë dhe shikojnë shpallje në kategori të ndryshme si: punë, shërbime, patundshmëri, automjete, elektronikë, dhe të tjera. Platforma vepron si ndërmjetëse — nuk merr pjesë drejtpërdrejt në transaksionet midis palëve.`,
  },
  {
    title: '3. Regjistrimi dhe llogaria',
    content: `Për të publikuar shpallje duhet të krijoni llogari. Ju jeni përgjegjës për ruajtjen e fshehtësisë së fjalëkalimit tuaj dhe për të gjitha veprimet që ndodhin nëpërmjet llogarisë suaj. Informacionet e dhëna gjatë regjistrimit duhet të jenë të sakta dhe të përditësuara. OfertaSuksesi rezervon të drejtën të pezullojë ose fshijë llogari që shkelin këto kushte.`,
  },
  {
    title: '4. Publikimi i shpalljeve',
    content: `Çdo shpallje e publikuar kalon nëpër procesin e aprovimit nga ekipi ynë. Shpalljet duhet të jenë të sakta, të ligjshme, dhe të mos përmbajnë përmbajtje mashtruese, ofenduese, ose të paligjshme. Është e ndaluar publikimi i shpalljeve të rreme, përmbajtjeve të dyfishta, ose materialeve që shkelin të drejtat e autorit. OfertaSuksesi ka të drejtë të refuzojë ose heqë çdo shpallje pa njoftim paraprak.`,
  },
  {
    title: '5. Përmbajtja e ndaluar',
    content: `Në Platformë ndalohet rreptësisht publikimi i: produkteve të paligjshme ose të kontrabandës; shërbimeve mashtruese ose piramidale; materialeve pornografike ose që nxisin urrejtje; armëve, drogës, ose substancave të kontrolluara; informacioneve personale të personave të tretë pa pëlqimin e tyre; çdo përmbajtje tjetër që shkel legjislacionin e Republikës së Kosovës.`,
  },
  {
    title: '6. Privatësia dhe të dhënat',
    content: `OfertaSuksesi mbledh dhe përpunon të dhëna personale vetëm për qëllimet e shërbimit. Nuk i ndajmë të dhënat tuaja me palë të treta pa pëlqimin tuaj, përveç kur kërkohet me ligj. Për më shumë detaje, shikoni Politikën e Privatësisë.`,
  },
  {
    title: '7. Përgjegjësia',
    content: `OfertaSuksesi nuk mban përgjegjësi për: saktësinë e informacioneve të publikuara nga përdoruesit; transaksionet midis blerësve dhe shitësve; humbjet financiare që mund të rrjedhin nga përdorimi i Platformës; ndërprerjet teknike ose gabimet e sistemit. Përdoruesit janë plotësisht përgjegjës për veprimet e tyre në Platformë.`,
  },
  {
    title: '8. Prona intelektuale',
    content: `Të gjitha materialet në Platformë, duke përfshirë logon, dizajnin, kodin, dhe përmbajtjen origjinale, janë pronë e OfertaSuksesi ose licencuesve të saj. Ndalohet kopjimi, shpërndarja, ose përdorimi i paautorizuar i këtyre materialeve.`,
  },
  {
    title: '9. Ndërprerja e shërbimit',
    content: `OfertaSuksesi mund të pezullojë ose ndërpresë qasjen tuaj në Platformë nëse: shkelni këto kushte përdorimi; publikoni përmbajtje të ndaluar; përdorni Platformën për qëllime mashtruese; bëni veprime që dëmtojnë funksionimin e Platformës.`,
  },
  {
    title: '10. Ligji i zbatueshëm',
    content: `Këto kushte rregullohen nga ligjet e Republikës së Kosovës. Çdo mosmarrëveshje do të zgjidhet nëpërmjet gjykatave kompetente në Prishtinë, Kosovë.`,
  },
  {
    title: '11. Kontakti',
    content: `Për çdo pyetje lidhur me këto kushte, na kontaktoni në: info@ofertasuksesi.com ose përmes faqes së Kontaktit.`,
  },
];

export default function KushtetPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/80">Kushtet e Përdorimit</span>
          </nav>
          <div className="max-w-xl">
            <span className="inline-block bg-white/10 text-white/90 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Informacion ligjor
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-5">
              Kushtet e Përdorimit
            </h1>
            <p className="text-lg text-white/75 leading-relaxed">
              Ju lutemi lexoni me kujdes kushtet e mëposhtme para se të përdorni platformën tonë.
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
            Keni pyetje rreth kushteve? Na kontaktoni.
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
