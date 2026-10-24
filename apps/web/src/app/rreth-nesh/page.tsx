import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Rreth Nesh — OfertaSuksesi',
  description:
    'Mëso më shumë rreth OfertaSuksesi — platforma kryesore e shpalljeve në Kosovë.',
};

const stats = [
  { value: 'Shpallje', label: 'Produkte, prona dhe shërbime' },
  { value: 'Komunitet', label: 'Blerës dhe shitës' },
  { value: 'Kosovë', label: 'Kërkim sipas qytetit' },
  { value: '1996', label: 'Viti i themelimit' },
];

const values = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Besueshmëri',
    desc: 'Çdo shpallje kalon nëpër filtrim për të garantuar cilësi dhe saktësi.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Komunitet',
    desc: 'Ndërtojmë lidhje mes blerësve dhe shitësve me transparencë të plotë.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Shpejtësi',
    desc: 'Dërgo shpalljen dhe ndiq statusin e shqyrtimit në panel.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Inovacion',
    desc: 'Platformën e zhvillojmë vazhdimisht bazuar në komentet e komunitetit tonë.',
  },
];

export default function RrethNesh() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28">
          <nav className="flex items-center gap-2 text-sm text-white/90 mb-10">
            <Link href="/" className="hover:text-white transition-colors">Kryefaqja</Link>
            <span>/</span>
            <span className="text-white/90">Rreth Nesh</span>
          </nav>
          <div className="max-w-2xl">
            <span className="inline-block bg-white/10 text-white text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
              Rreth Nesh
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              Platforma e shpalljeve<br />
              <span className="text-orange-200">në Kosovë</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              OfertaSuksesi është tregu dixhital ku çdo gjë mund të shitet, blihet
              ose jepet me qira — shpejt, lehtë dhe me besim.
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-gray-100">
            {stats.map((s) => (
              <div key={s.label} className="text-center md:px-6">
                <p className="text-2xl sm:text-3xl font-black text-accent">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">

        {/* Story */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Historia jonë</span>
            <h2 className="text-3xl font-black text-dark mt-2 mb-5 leading-tight">
              Më e vjetra e këtij lloji në hapësirën shqiptare
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Revista – ueb faqja Oferta Suksesi, si më e vjetra e këtij lloji në gjithë
                hapësirën shqiptare, u dedikohet gjithë atyre që koha e tyre ka vlerë — që
                të mos lundrojnë në oqeanin e internetit për të gjetur ofertën më të mirë
                dhe më të duhur për ta, por ta kenë këtu.
              </p>
              <p>
                Qëllimet tona mbeten të njëjtat: krijimi i një hapësire ku ju mund të
                komunikoni me njëri-tjetrin në kohë reale dhe me shpenzime jashtëzakonisht
                të vogla, si dhe publikimi i ofertave tuaja <strong className="text-dark">pa pagesë — falas</strong>.
              </p>
              <p>
                Ne mundohemi që t'ju shkurtojmë kohën në plotësimin e nevojave dhe kërkesave
                tuaja të panumërta për shitje dhe blerje.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative pl-8 border-l-2 border-gray-100 space-y-8">
            {[
              { year: '1996', title: 'Themelimi', desc: 'Oferta Suksesi themelohet si revistë e shpalljeve të klasifikuara.' },
              { year: '2000+', title: 'Prania online', desc: 'Kalimi nga revista e shtypur në platformën online ofertasuksesi.com.' },
              { year: '2025', title: 'Ridizajnimi', desc: 'Platforma ridizajnohet plotësisht me teknologji moderne.' },
              { year: 'Sot', title: 'Vazhdojmë', desc: 'Platforma lider e shpalljeve falas në hapësirën shqiptare.' },
            ].map((item) => (
              <div key={item.year} className="relative">
                <div className="absolute -left-10 w-4 h-4 rounded-full bg-accent border-4 border-white shadow-sm" />
                <span className="text-xs font-bold text-accent uppercase tracking-wider">{item.year}</span>
                <h3 className="font-bold text-dark mt-0.5">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section>
          <div className="text-center mb-12">
            <span className="text-accent font-bold text-sm uppercase tracking-wider">Vlerat tona</span>
            <h2 className="text-3xl font-black text-dark mt-2">Çfarë na udhëzon</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                  {v.icon}
                </div>
                <h3 className="font-bold text-dark mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white">
          <h2 className="text-3xl font-black mb-4">Bëhu pjesë e komunitetit</h2>
          <p className="text-white/75 max-w-lg mx-auto mb-8 leading-relaxed">
            Regjistrohu falas dhe fillo të postosh shpalljet tua brenda minutave.
            Lidhu me blerës dhe shitës në komunitetin tonë.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/regjistrohu"
              className="bg-accent hover:bg-accent-dark text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Regjistrohu falas
            </Link>
            <Link
              href="/kontakti"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Na kontakto
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
