import { PrismaClient, AdPlacement } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Cities ───────────────────────────────────────────────────────────────────

const cities = [
  { name: 'Prishtinë',          slug: 'prishtine',          region: 'Kosovo' },
  { name: 'Prizren',            slug: 'prizren',            region: 'Kosovo' },
  { name: 'Pejë',               slug: 'peje',               region: 'Kosovo' },
  { name: 'Gjakovë',            slug: 'gjakove',            region: 'Kosovo' },
  { name: 'Mitrovicë',          slug: 'mitrovice',          region: 'Kosovo' },
  { name: 'Ferizaj',            slug: 'ferizaj',            region: 'Kosovo' },
  { name: 'Gjilan',             slug: 'gjilan',             region: 'Kosovo' },
  { name: 'Vushtrri',           slug: 'vushtrri',           region: 'Kosovo' },
  { name: 'Kastriot (Obiliq)',  slug: 'kastriot-obiliq',   region: 'Kosovo' },
  { name: 'Lipjan',             slug: 'lipjan',             region: 'Kosovo' },
  { name: 'Drenas (Gllogovc)',  slug: 'drenas-gllogovc',   region: 'Kosovo' },
  { name: 'Malishevë',          slug: 'malisheve',          region: 'Kosovo' },
  { name: 'Rahovec',            slug: 'rahovec',            region: 'Kosovo' },
  { name: 'Suharekë',           slug: 'suhareke',           region: 'Kosovo' },
  { name: 'Klinë',              slug: 'kline',              region: 'Kosovo' },
  { name: 'Istog',              slug: 'istog',              region: 'Kosovo' },
  { name: 'Skenderaj',          slug: 'skenderaj',          region: 'Kosovo' },
  { name: 'Deçan',              slug: 'decan',              region: 'Kosovo' },
  { name: 'Dragash',            slug: 'dragash',            region: 'Kosovo' },
  { name: 'Kaçanik',            slug: 'kacanik',            region: 'Kosovo' },
  { name: 'Shtërpcë',           slug: 'shterpce',           region: 'Kosovo' },
  { name: 'Shtime',             slug: 'shtime',             region: 'Kosovo' },
  { name: 'Viti',               slug: 'viti',               region: 'Kosovo' },
  { name: 'Artanë (Novobërdë)', slug: 'artane-novoberde',  region: 'Kosovo' },
  { name: 'Zubin Potok',        slug: 'zubin-potok',        region: 'Kosovo' },
  { name: 'Zveçan',             slug: 'zvecan',             region: 'Kosovo' },
  { name: 'Leposaviq',          slug: 'leposaviq',          region: 'Kosovo' },
  { name: 'Fushë Kosovë',       slug: 'fushe-kosove',       region: 'Kosovo' },
  { name: 'Hani i Elezit',      slug: 'hani-i-elezit',     region: 'Kosovo' },
  { name: 'Mamushë',            slug: 'mamushe',            region: 'Kosovo' },
  { name: 'Ranillug',           slug: 'ranillug',           region: 'Kosovo' },
  { name: 'Graçanicë',          slug: 'gracanice',          region: 'Kosovo' },
  { name: 'Shqipëri',           slug: 'shqiperi',           region: 'Shqipëri' },
];

// ─── Ad Zones ─────────────────────────────────────────────────────────────────

const adZones = [
  // Homepage
  // Homepage
  { name: 'Homepage Leaderboard', slug: 'homepage-leaderboard', placement: AdPlacement.SEARCH_TOP,       width: 728,  height: 90,  maxAds: 2, description: 'Under search bar on homepage' },
  { name: 'Homepage Mid',         slug: 'homepage-mid',         placement: AdPlacement.INLINE,            width: 300,  height: 250, maxAds: 2, description: 'Between listings and companies on homepage' },
  { name: 'Homepage Footer',      slug: 'homepage-footer',      placement: AdPlacement.FOOTER,            width: 728,  height: 90,  maxAds: 2, description: 'Above footer on homepage' },
  // Category pages
  { name: 'Category Top',         slug: 'category-top',         placement: AdPlacement.INLINE,            width: 728,  height: 90,  maxAds: 3, description: 'Top of any category listing page' },
  { name: 'Category Inline',      slug: 'category-inline',      placement: AdPlacement.INLINE,            width: 300,  height: 250, maxAds: 3, description: 'After 4th listing in category' },
  // Search
  { name: 'Search Top',           slug: 'search-top',           placement: AdPlacement.SEARCH_TOP,        width: 728,  height: 90,  maxAds: 2, description: 'Top of /shpallje search results' },
  { name: 'Search Inline',        slug: 'search-inline',        placement: AdPlacement.INLINE,            width: 728,  height: 90,  maxAds: 2, description: 'Between results and pagination on search' },
  // Sidebar
  { name: 'Sidebar Large',        slug: 'sidebar-large',        placement: AdPlacement.SIDEBAR,           width: 300,  height: 250, maxAds: 3, description: 'Right sidebar 300x250' },
  { name: 'Sidebar Skyscraper',   slug: 'sidebar-skyscraper',   placement: AdPlacement.SIDEBAR,           width: 160,  height: 600, maxAds: 2, description: 'Right sidebar skyscraper' },
  // Company spotlight
  { name: 'Company Spotlight',    slug: 'company-spotlight',    placement: AdPlacement.COMPANY_SPOTLIGHT, width: 300,  height: 250, maxAds: 4, description: 'Premium company spotlight zone' },
  // Header
  { name: 'Header Slider',        slug: 'header-slider',        placement: AdPlacement.HEADER_SLIDER,     width: 1200, height: 400, maxAds: 5, description: 'Full-width header slider' },
  // Site-wide footer
  { name: 'Site Footer',          slug: 'site-footer',          placement: AdPlacement.FOOTER,            width: 728,  height: 90,  maxAds: 1, description: 'Global banner above site footer' },
];

// ─── Categories ───────────────────────────────────────────────────────────────

const categories = [
  {
    name: 'Patundshmëri',
    slug: 'patundshmeri',
    icon: '🏠',
    position: 1,
    attributeSchema: {
      fields: [
        { name: 'price',   type: 'number', label: 'Çmimi (€)',      required: true },
        { name: 'area_m2', type: 'number', label: 'Sipërfaqja (m²)' },
        { name: 'for',     type: 'select', label: 'Për', options: ['Shitje', 'Qira'] },
      ],
    },
    subcategories: [
      {
        name: 'Banesa',
        slug: 'banesa',
        position: 1,
        attributeSchema: {
          fields: [
            { name: 'price',   type: 'number', label: 'Çmimi (€)',      required: true },
            { name: 'area_m2', type: 'number', label: 'Sipërfaqja (m²)' },
            { name: 'rooms',   type: 'number', label: 'Dhoma' },
            { name: 'floor',   type: 'number', label: 'Kati' },
            { name: 'for',     type: 'select', label: 'Për', options: ['Shitje', 'Qira'] },
          ],
        },
      },
      {
        name: 'Me Qira',
        slug: 'me-qira',
        position: 2,
        attributeSchema: {
          fields: [
            { name: 'price',   type: 'number', label: 'Çmimi/muaj (€)', required: true },
            { name: 'area_m2', type: 'number', label: 'Sipërfaqja (m²)' },
            { name: 'rooms',   type: 'number', label: 'Dhoma' },
            { name: 'floor',   type: 'number', label: 'Kati' },
          ],
        },
      },
      {
        name: 'Lokale',
        slug: 'lokale',
        position: 3,
        attributeSchema: {
          fields: [
            { name: 'price',   type: 'number', label: 'Çmimi (€)',      required: true },
            { name: 'area_m2', type: 'number', label: 'Sipërfaqja (m²)' },
            { name: 'for',     type: 'select', label: 'Për', options: ['Shitje', 'Qira'] },
          ],
        },
      },
      {
        name: 'Toka',
        slug: 'toka',
        position: 4,
        attributeSchema: {
          fields: [
            { name: 'price',   type: 'number', label: 'Çmimi (€)',      required: true },
            { name: 'area_m2', type: 'number', label: 'Sipërfaqja (m²)' },
          ],
        },
      },
      {
        name: 'Garazha',
        slug: 'garazha',
        position: 5,
        attributeSchema: {
          fields: [
            { name: 'price', type: 'number', label: 'Çmimi (€)', required: true },
            { name: 'for',   type: 'select', label: 'Për', options: ['Shitje', 'Qira'] },
          ],
        },
      },
    ],
  },
  {
    name: 'Automjete',
    slug: 'automjete',
    icon: '🚗',
    position: 2,
    attributeSchema: {
      fields: [
        { name: 'price', type: 'number', label: 'Çmimi (€)', required: true },
        { name: 'year',  type: 'number', label: 'Viti' },
        { name: 'fuel',  type: 'select', label: 'Karburanti', options: ['Benzinë', 'Naftë', 'Gaz', 'Elektrik', 'Hibrid'] },
      ],
    },
    subcategories: [
      {
        name: 'Vetura',
        slug: 'vetura',
        position: 1,
        attributeSchema: {
          fields: [
            { name: 'price',       type: 'number', label: 'Çmimi (€)',     required: true },
            { name: 'brand',       type: 'text',   label: 'Marka' },
            { name: 'model',       type: 'text',   label: 'Modeli' },
            { name: 'year',        type: 'number', label: 'Viti' },
            { name: 'mileage_km',  type: 'number', label: 'Kilometrazhi' },
            { name: 'fuel',        type: 'select', label: 'Karburanti', options: ['Benzinë', 'Naftë', 'Gaz', 'Elektrik', 'Hibrid'] },
          ],
        },
      },
      {
        name: 'Kamionë',
        slug: 'kamione',
        position: 2,
        attributeSchema: {
          fields: [
            { name: 'price',      type: 'number', label: 'Çmimi (€)',     required: true },
            { name: 'brand',      type: 'text',   label: 'Marka' },
            { name: 'year',       type: 'number', label: 'Viti' },
            { name: 'mileage_km', type: 'number', label: 'Kilometrazhi' },
          ],
        },
      },
      {
        name: 'Motoçikleta',
        slug: 'motocikleta',
        position: 3,
        attributeSchema: {
          fields: [
            { name: 'price',      type: 'number', label: 'Çmimi (€)',     required: true },
            { name: 'brand',      type: 'text',   label: 'Marka' },
            { name: 'year',       type: 'number', label: 'Viti' },
            { name: 'mileage_km', type: 'number', label: 'Kilometrazhi' },
          ],
        },
      },
      {
        name: 'Pjesë Këmbimi',
        slug: 'pjese-kembimi',
        position: 4,
        attributeSchema: {
          fields: [
            { name: 'price',      type: 'number', label: 'Çmimi (€)', required: true },
            { name: 'compatible', type: 'text',   label: 'Kompatibël me' },
          ],
        },
      },
    ],
  },
  {
    name: 'Celular',
    slug: 'celular',
    icon: '📱',
    position: 3,
    attributeSchema: {
      fields: [
        { name: 'price',     type: 'number', label: 'Çmimi (€)',   required: true },
        { name: 'brand',     type: 'text',   label: 'Marka' },
        { name: 'model',     type: 'text',   label: 'Modeli' },
        { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur', 'Për pjesë'] },
      ],
    },
    subcategories: [],
  },
  {
    name: 'Rreth Punës',
    slug: 'rreth-punes',
    icon: '💼',
    position: 4,
    attributeSchema: {
      fields: [
        { name: 'salary',    type: 'number', label: 'Paga (€)' },
        { name: 'type',      type: 'select', label: 'Lloji', options: ['Me kohë të plotë', 'Me kohë të pjesshme', 'Freelance'] },
      ],
    },
    subcategories: [
      {
        name: 'Ofroj Punë',
        slug: 'ofroj-pune',
        position: 1,
        attributeSchema: {
          fields: [],
        },
      },
      {
        name: 'Kërkoj Punë',
        slug: 'kerkoj-pune',
        position: 2,
        attributeSchema: {
          fields: [
            { name: 'experience', type: 'number', label: 'Eksperienca (vite)' },
            { name: 'sector',     type: 'text',   label: 'Sektori' },
          ],
        },
      },
    ],
  },
  {
    name: 'Shtëpia Juaj',
    slug: 'shtepia-juaj',
    icon: '🛋️',
    position: 5,
    attributeSchema: {
      fields: [
        { name: 'price',     type: 'number', label: 'Çmimi (€)',  required: true },
        { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur'] },
      ],
    },
    subcategories: [
      {
        name: 'Mobilje',
        slug: 'mobilje',
        position: 1,
        attributeSchema: {
          fields: [
            { name: 'price',     type: 'number', label: 'Çmimi (€)',  required: true },
            { name: 'material',  type: 'text',   label: 'Materiali' },
            { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur'] },
          ],
        },
      },
      {
        name: 'Pajisje Shtëpiake',
        slug: 'pajisje-shtepiake',
        position: 2,
        attributeSchema: {
          fields: [
            { name: 'price',     type: 'number', label: 'Çmimi (€)',  required: true },
            { name: 'brand',     type: 'text',   label: 'Marka' },
            { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur', 'Për pjesë'] },
          ],
        },
      },
    ],
  },
  {
    name: 'Interesi Juaj',
    slug: 'interesi-juaj',
    icon: '🎯',
    position: 6,
    attributeSchema: {
      fields: [
        { name: 'price',     type: 'number', label: 'Çmimi (€)' },
        { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur'] },
      ],
    },
    subcategories: [],
  },
  {
    name: 'Bujqësi',
    slug: 'bujqesi',
    icon: '🌾',
    position: 7,
    attributeSchema: {
      fields: [
        { name: 'price', type: 'number', label: 'Çmimi (€)', required: true },
      ],
    },
    subcategories: [
      {
        name: 'Bagëti',
        slug: 'bageti',
        position: 1,
        attributeSchema: {
          fields: [
            { name: 'price',    type: 'number', label: 'Çmimi (€)',  required: true },
            { name: 'type',     type: 'text',   label: 'Lloji' },
            { name: 'quantity', type: 'number', label: 'Sasia' },
          ],
        },
      },
      {
        name: 'Pajisje Bujqësore',
        slug: 'pajisje-bujqesore',
        position: 2,
        attributeSchema: {
          fields: [
            { name: 'price',     type: 'number', label: 'Çmimi (€)',  required: true },
            { name: 'brand',     type: 'text',   label: 'Marka' },
            { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur'] },
          ],
        },
      },
      {
        name: 'Produkte Bujqësore',
        slug: 'produkte-bujqesore',
        position: 3,
        attributeSchema: {
          fields: [
            { name: 'price',    type: 'number', label: 'Çmimi (€)', required: true },
            { name: 'type',     type: 'text',   label: 'Lloji' },
            { name: 'quantity', type: 'number', label: 'Sasia' },
            { name: 'unit',     type: 'select', label: 'Njësia', options: ['kg', 'copë', 'litër', 'tjetër'] },
          ],
        },
      },
    ],
  },
  {
    name: 'PC, TV etj.',
    slug: 'pc-tv',
    icon: '💻',
    position: 8,
    attributeSchema: {
      fields: [
        { name: 'price',     type: 'number', label: 'Çmimi (€)',  required: true },
        { name: 'brand',     type: 'text',   label: 'Marka' },
        { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur', 'Për pjesë'] },
      ],
    },
    subcategories: [],
  },
  {
    name: 'Kafshë',
    slug: 'kafsha',
    icon: '🐾',
    position: 9,
    attributeSchema: {
      fields: [
        { name: 'price',   type: 'number', label: 'Çmimi (€)' },
        { name: 'species', type: 'text',   label: 'Lloji i kafshës' },
        { name: 'age',     type: 'text',   label: 'Mosha' },
      ],
    },
    subcategories: [],
  },
  {
    name: 'Bashkëpunim',
    slug: 'bashkepunim',
    icon: '🤝',
    position: 10,
    attributeSchema: {
      fields: [],
    },
    subcategories: [],
  },
  {
    name: 'Shërbime',
    slug: 'sherbime',
    icon: '🔧',
    position: 11,
    attributeSchema: {
      fields: [
        { name: 'price', type: 'number', label: 'Çmimi (€)' },
        { name: 'type',  type: 'select', label: 'Lloji', options: ['Orë', 'Projekt', 'Muaj', 'I negociueshëm'] },
      ],
    },
    subcategories: [],
  },
  {
    name: 'Të Ndryshme',
    slug: 'te-ndryshme',
    icon: '📦',
    position: 12,
    attributeSchema: {
      fields: [
        { name: 'price',     type: 'number', label: 'Çmimi (€)' },
        { name: 'condition', type: 'select', label: 'Gjendja', options: ['I ri', 'Përdorur'] },
      ],
    },
    subcategories: [],
  },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

const badges = [
  {
    name: 'verified',
    label: 'I Verifikuar',
    description: 'Përdoruesi ka verifikuar adresën e email-it',
    icon: '✓',
    color: '#1B5E3B',
    isAutomatic: true,
    criteria: { emailVerified: true },
  },
  {
    name: 'trusted_seller',
    label: 'Shitës i Besuar',
    description: 'Përdoruesi ka një rezultat besueshmërie prej 70 ose më shumë',
    icon: '⭐',
    color: '#2E7D32',
    isAutomatic: true,
    criteria: { trustScore: { min: 70 } },
  },
  {
    name: 'top_poster',
    label: 'Postues Top',
    description: 'Përdoruesi ka publikuar 50 ose më shumë njoftime',
    icon: '🏆',
    color: '#FFD700',
    isAutomatic: true,
    criteria: { listingCount: { min: 50 } },
  },
  {
    name: 'premium',
    label: 'Premium',
    description: 'Përdorues premium me qasje në veçori të avancuara',
    icon: '💎',
    color: '#E8793B',
    isAutomatic: false,
    criteria: {},
  },
  {
    name: 'new_user',
    label: 'I Ri',
    description: 'Përdorues i regjistruar së fundi (30 ditët e para)',
    icon: '🆕',
    color: '#2196F3',
    isAutomatic: true,
    criteria: { accountAgeDays: { max: 30 } },
  },
  {
    name: 'company_official',
    label: 'Kompani Zyrtare',
    description: 'Llogari zyrtare e kompanisë',
    icon: '🏢',
    color: '#1565C0',
    isAutomatic: true,
    criteria: { role: 'COMPANY' },
  },
  {
    name: 'featured_seller',
    label: 'Shitës i Dalluar',
    description: 'Shitës i zgjedhur nga ekipi i OfertaSuksesi',
    icon: '🌟',
    color: '#9C27B0',
    isAutomatic: false,
    criteria: {},
  },
  {
    name: 'warning',
    label: 'Paralajmërim',
    description: 'Ky përdorues ka marrë një paralajmërim nga moderatorët (i dukshëm vetëm për adminët)',
    icon: '⚠️',
    color: '#FF9800',
    isAutomatic: false,
    criteria: {},
  },
  {
    name: 'suspended',
    label: 'I Pezulluar',
    description: 'Llogaria e këtij përdoruesi është pezulluar',
    icon: '🚫',
    color: '#F44336',
    isAutomatic: true,
    criteria: { suspended: true },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...');

  // Cities
  console.log('📍 Seeding cities...');
  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
  }
  console.log(`   ✓ ${cities.length} cities`);

  // Ad Zones
  console.log('📢 Seeding ad zones...');
  for (const zone of adZones) {
    await prisma.adZone.upsert({
      where: { slug: zone.slug },
      update: {},
      create: zone,
    });
  }
  console.log(`   ✓ ${adZones.length} ad zones`);

  // Categories
  console.log('📂 Seeding categories...');
  let totalCategories = 0;
  for (const cat of categories) {
    const { subcategories, ...catData } = cat;

    const parent = await prisma.category.upsert({
      where: { slug: catData.slug },
      update: {},
      create: catData,
    });
    totalCategories++;

    for (const sub of subcategories) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {},
        create: { ...sub, parentId: parent.id },
      });
      totalCategories++;
    }
  }
  console.log(`   ✓ ${totalCategories} categories (including subcategories)`);

  // Optional bootstrap account; never create a known default password.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail || adminPassword) {
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || !adminPassword || adminPassword.length < 12) {
      throw new Error('Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters)');
    }
    await prisma.user.upsert({
      where: { email: adminEmail }, update: {},
      create: { email: adminEmail, name: 'Admin', slug: `admin-${require('crypto').randomUUID()}`, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'ADMIN', trustScore: 100, isVerified: true },
    });
    console.log('Admin bootstrap account ensured (existing accounts are unchanged)');
  } else {
    console.log('Skipping admin bootstrap: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not set');
  }

  // Badges
  console.log('🏅 Seeding badges...');
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }
  console.log(`   ✓ ${badges.length} badges`);

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
