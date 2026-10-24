import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Redaksia — OfertaSuksesi',
  description:
    'Njihuni me ekipin editorial të OfertaSuksesi dhe misionin tonë për cilësi dhe transparencë.',
};

const team: { name: string; role: string; initials: string; color: string; bio?: string }[] = [
  {
    name: 'Nexhmedin Kahrimani',
    role: 'CEO',
    initials: 'NK',
    color: 'bg-primary',
  },
  {
    name: 'Sabedin Kahrimani',
    role: 'Redaktor',
    initials: 'SK',
    color: 'bg-accent',
  },
  {
    name: 'Muhamed Shala',
    role: 'Digital Marketing',
    initials: 'MS',
    color: 'bg-primary-light',
  },
  {
    name: 'Rumejsa Kahrimani',
    role: 'Sales Associate',
    initials: 'RK',
    color: 'bg-dark',
  },
  {
    name: 'Hilmi Hajra',
    role: 'Marketing Manager',
    initials: 'HH',
    color: 'bg-primary',
  },
  {
    name: 'Erda Kahrimani',
    role: 'Redaktor',
    initials: 'EK',
    color: 'bg-accent',
  },
];

const principles = [
  {
    num: '01',
    title: 'Verifikim i rreptë',
    desc: 'Çdo shpallje i nënshtrohet procesit tonë të verifikimit. Marrim masa aktive kundër shpalljeve mashtruese apo informacionit të pasaktë.',
  },
  {
    num: '02',
    title: 'Transparencë totale',
    desc: 'Politikat tona janë publike dhe të qarta. Çdo vendim editorial dokumentohet dhe mund të kontestohet nga komuniteti.',
  },
  {
    num: '03',
    title: 'Pavarësi editoriale',
    desc: 'Redaksia operon pavarësisht nga interesat komerciale. Vendimet merren vetëm në bazë të interesit të komunitetit.',
  },
  {
    num: '04',
    title: 'Reagim i shpejtë',
    desc: 'Raportimet e shpalljeve problematike trajtohen brenda 24 orëve. Transparenca është prioriteti ynë kryesor.',
  },
];

export default function Redaksia() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="bg-dark text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/80">Redaksia</span>
          </nav>
          <div className="max-w-2xl">
            <span className="inline-block bg-white/10 text-orange-200 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Ekipi Editorial
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              Njerëzit pas<br />
              <span className="text-orange-200">OfertaSuksesi</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Redaksia jonë punon çdo ditë për të garantuar platformën më të besueshme,
              të sigurt dhe të dobishme për komunitetin kosovar.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">

        {/* Mission banner */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-accent font-bold text-sm uppercase tracking-wider">Misioni ynë</span>
              <h2 className="text-2xl font-black text-dark mt-2 mb-4 leading-tight">
                Cilësia dhe besimi mbi çdo gjë
              </h2>
              <div className="text-gray-600 leading-relaxed space-y-3">
                <p>
                  Lexues të nderuar, shpalljet në këtë ueb faqe para publikimit kontrollohen
                  nga stafi përgjegjës i redaksisë. Shpalljet zakonisht qëndrojnë 30 ditë, por
                  ju ofrojmë edhe mundësinë që të caktoni afatin kohor sipas nevojës suaj (45 ditë, 60 ditë apo 90 ditë).
                </p>
                <p>
                  Shpalljet tuaja mundeni edhe vet t'i menaxhoni, për këtë duhet vetëm një
                  herë të vertetohemi për identitetin tuaj, që ju jeni person serioz — ku
                  ueb-in tonë e keni në dispozicion 24/7/365 ditë online.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: '1000+', l: 'Shpallje të moderuara në muaj' },
                { n: '<24h', l: 'Koha mesatare e shqyrtimit' },
                { n: '98%', l: 'Shkalla e saktësisë' },
                { n: '4.9★', l: 'Vlerësimi mesatar i shërbimit' },
              ].map((s) => (
                <div key={s.l} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-accent">{s.n}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section>
          <div className="mb-10">
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Ekipi ynë</span>
            <h2 className="text-3xl font-black text-dark mt-2">Takoni redaktorët</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-accent/20 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${member.color} text-white font-black text-lg flex items-center justify-center flex-shrink-0`}>
                    {member.initials}
                  </div>
                  <div>
                    <p className="font-bold text-dark">{member.name}</p>
                    <p className="text-sm text-accent font-medium">{member.role}</p>
                  </div>
                </div>
                {member.bio && <p className="text-sm text-gray-500 leading-relaxed">{member.bio}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section>
          <div className="mb-10">
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Parimet tona</span>
            <h2 className="text-3xl font-black text-dark mt-2">Si punojmë</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((p) => (
              <div
                key={p.num}
                className="bg-white rounded-2xl border border-gray-100 p-8 flex gap-6 hover:border-accent/30 hover:shadow-sm transition-all"
              >
                <span className="text-4xl font-black text-gray-500 flex-shrink-0 leading-none">{p.num}</span>
                <div>
                  <h3 className="font-bold text-dark mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact editorial */}
        <section className="bg-accent/5 border border-accent/15 rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-dark mb-3">Keni një sugjerim për redaksinë?</h2>
            <p className="text-gray-600 leading-relaxed">
              Jemi gjithmonë të hapur ndaj komenteve nga komuniteti. Nëse keni
              vërejtje, sugjerime apo dëshironi të raportoni diçka, na shkruani.
            </p>
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0">
            <Link
              href="mailto:redaksia@ofertasuksesi.com"
              className="bg-accent hover:bg-accent-dark text-white font-bold px-8 py-3 rounded-xl transition-colors text-center"
            >
              redaksia@ofertasuksesi.com
            </Link>
            <Link
              href="/kontakti"
              className="border border-accent/30 text-accent hover:bg-accent/5 font-semibold px-8 py-3 rounded-xl transition-colors text-center"
            >
              Forma e kontaktit
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
