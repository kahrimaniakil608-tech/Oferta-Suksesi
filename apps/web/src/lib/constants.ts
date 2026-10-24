export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 1,  name: 'Patundshmëri',  slug: 'patundshmeri',  icon: '🏠' },
  { id: 13, name: 'Rreth Punës',   slug: 'rreth-punes',   icon: '💼' },
  { id: 7,  name: 'Automjete',     slug: 'automjete',     icon: '🚗' },
  { id: 16, name: 'Shtëpia Juaj',  slug: 'shtepia-juaj',  icon: '🛋️' },
  { id: 26, name: 'Shërbime',      slug: 'sherbime',      icon: '🔧' },
  { id: 27, name: 'Të Ndryshme',   slug: 'te-ndryshme',   icon: '📦' },
  { id: 19, name: 'Interesi Juaj', slug: 'interesi-juaj',  icon: '🎯' },
  { id: 12, name: 'Celular',       slug: 'celular',       icon: '📱' },
  { id: 23, name: 'PC, TV etj.',   slug: 'pc-tv',         icon: '💻' },
  { id: 20, name: 'Bujqësi',       slug: 'bujqesi',       icon: '🌾' },
  { id: 25, name: 'Bashkëpunim',   slug: 'bashkepunim',   icon: '🤝' },
  { id: 24, name: 'Kafshë',        slug: 'kafsha',        icon: '🐾' },
];

export const CITIES = [
  { name: 'Prishtinë',  slug: 'prishtine'  },
  { name: 'Prizren',    slug: 'prizren'    },
  { name: 'Pejë',       slug: 'peje'       },
  { name: 'Mitrovicë',  slug: 'mitrovice'  },
  { name: 'Ferizaj',    slug: 'ferizaj'    },
  { name: 'Gjakovë',    slug: 'gjakove'    },
  { name: 'Gjilan',     slug: 'gjilan'     },
  { name: 'Vushtrri',   slug: 'vushtrri'   },
  { name: 'Podujevë',   slug: 'podujeve'   },
  { name: 'Suharekë',   slug: 'suhareke'   },
  { name: 'Rahovec',    slug: 'rahovec'    },
  { name: 'Lipjan',     slug: 'lipjan'     },
];
