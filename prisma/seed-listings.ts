/**
 * seed-listings.ts
 * Generates 12 realistic Albanian/Kosovan marketplace listings with
 * placeholder WebP images (colored SVG → WebP via Sharp).
 *
 * Run:
 *   node_modules/.bin/ts-node --project apps/api/tsconfig.json prisma/seed-listings.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

const prisma = new PrismaClient();

// ─── Config ───────────────────────────────────────────────────────────────────

const IMAGE_SERVICE_PUBLIC_URL = process.env.IMAGE_SERVICE_URL ?? 'http://localhost:3002';
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const NOW = new Date();
const YEAR  = NOW.getFullYear().toString();
const MONTH = String(NOW.getMonth() + 1).padStart(2, '0');

// ─── Image generation helpers ─────────────────────────────────────────────────

/** Escape XML special characters for safe SVG text content. */
function xmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build an SVG placeholder image with a solid background, large icon, and text.
 */
function buildSvg(
  bg: string,
  textColor: string,
  icon: string,
  title: string,
  subtitle: string,
  width = 800,
  height = 600,
): Buffer {
  // Truncate long titles
  const short = title.length > 30 ? title.slice(0, 28) + '…' : title;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <defs>
    <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${textColor}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="${width / 2}" y="${height / 2 - 60}"
    font-family="serif" font-size="120"
    text-anchor="middle" dominant-baseline="middle">${xmlEsc(icon)}</text>
  <text x="${width / 2}" y="${height / 2 + 70}"
    font-family="Arial, sans-serif" font-size="36" font-weight="bold"
    fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${xmlEsc(short)}</text>
  <text x="${width / 2}" y="${height / 2 + 120}"
    font-family="Arial, sans-serif" font-size="24"
    fill="${textColor}" fill-opacity="0.75" text-anchor="middle" dominant-baseline="middle">${xmlEsc(subtitle)}</text>
  <text x="${width - 16}" y="${height - 16}"
    font-family="Arial, sans-serif" font-size="18"
    fill="${textColor}" fill-opacity="0.35" text-anchor="end">OfertaSuksesi.com</text>
</svg>`.trim();
  return Buffer.from(svg, 'utf-8');
}

interface ImageSet {
  url: string;
  thumbUrl: string;
  mediumUrl: string;
}

async function generateImage(
  listingId: string,
  bg: string,
  textColor: string,
  icon: string,
  title: string,
  subtitle: string,
  index: number,
): Promise<ImageSet> {
  const baseDir = path.join(UPLOAD_DIR, 'listings', YEAR, MONTH, listingId);
  const thumbDir  = path.join(baseDir, 'thumb');
  const mediumDir = path.join(baseDir, 'medium');
  const origDir   = path.join(baseDir, 'original');

  [thumbDir, mediumDir, origDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

  const ts   = Date.now() + index;
  const rand = crypto.randomBytes(4).toString('hex');
  const filename = `${ts}-${rand}.webp`;

  const svgBuf = buildSvg(bg, textColor, icon, title, subtitle);
  const base   = sharp(svgBuf, { density: 96 }).rotate();

  await Promise.all([
    base.clone().resize(150, 150, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toFile(path.join(thumbDir, filename)),
    base.clone().resize(600, undefined, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(mediumDir, filename)),
    base.clone().resize(1200, undefined, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(origDir, filename)),
  ]);

  // Store relative paths — matching the normalise() pattern used by the upload forms:
  //   url:       listings/.../original/file.webp   (no leading /uploads/)
  //   thumbUrl:  /uploads/listings/.../thumb/file.webp
  //   mediumUrl: /uploads/listings/.../medium/file.webp
  return {
    url:       `listings/${YEAR}/${MONTH}/${listingId}/original/${filename}`,
    thumbUrl:  `/uploads/listings/${YEAR}/${MONTH}/${listingId}/thumb/${filename}`,
    mediumUrl: `/uploads/listings/${YEAR}/${MONTH}/${listingId}/medium/${filename}`,
  };
}

// ─── Listing definitions ──────────────────────────────────────────────────────

interface ListingDef {
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  subcategorySlug?: string;
  citySlug: string;
  attributes: Record<string, unknown>;
  isFeatured?: boolean;
  isUrgent?: boolean;
  viewsCount?: number;
  contactClicks?: number;
  userEmail: string;
  /** [bg, textColor, icon, subtitle] */
  image: [string, string, string, string];
  imageCount: number;
}

const listingDefs: ListingDef[] = [
  // 1 — Real estate / apartment for sale
  {
    title: 'Banesa 3+1 dhoma, kati 5, Arbëria',
    slug: 'banesa-3-1-dhoma-kati-5-arberia',
    description:
      'Shitet banesa e re 3+1 dhoma në lagjen Arbëria, Prishtinë. Ndërtim 2022, kati 5 nga 8, sipërfaqe 92m², ballkon 8m². ' +
      'Dysheme parcet, çelik i dyfishtë, central me gaz. Dokumentacion i rregullt, tapu e gatshme. Çmimi final, pa komisione të fshehura.',
    categorySlug: 'patundshmeri',
    subcategorySlug: 'banesa',
    citySlug: 'prishtine',
    attributes: { price: 85000, area_m2: 92, rooms: 3, floor: 5, for: 'Shitje' },
    isFeatured: true,
    viewsCount: 342,
    contactClicks: 28,
    userEmail: 'arben.krasniqi@test.com',
    image: ['#1565C0', '#ffffff', '🏠', '85,000 € · 92m² · 3+1'],
    imageCount: 3,
  },

  // 2 — Vehicle / car
  {
    title: 'Mercedes-Benz E220d AMG Line 2019',
    slug: 'mercedes-benz-e220d-amg-line-2019',
    description:
      'Shitet Mercedes E220d, prodhim 2019, naftë, 194 CV. AMG Line paketë e jashtme dhe e brendshme. Kilometrazhi 87,000 km, ' +
      'shërbim i rregullt tek Mercedes Kosovë. Ngjyra Selenite Grey, sedilje lëkure beige. Panoramik, kamera 360°, asistencë rruge.',
    categorySlug: 'automjete',
    subcategorySlug: 'vetura',
    citySlug: 'prishtine',
    attributes: { price: 28500, brand: 'Mercedes-Benz', model: 'E220d AMG Line', year: 2019, mileage_km: 87000, fuel: 'Naftë' },
    isFeatured: true,
    isUrgent: true,
    viewsCount: 510,
    contactClicks: 45,
    userEmail: 'valdrin.berisha@test.com',
    image: ['#B71C1C', '#ffffff', '🚗', '28,500 € · 2019 · 87,000 km'],
    imageCount: 3,
  },

  // 3 — Phone
  {
    title: 'iPhone 15 Pro Max 256GB Natural Titanium',
    slug: 'iphone-15-pro-max-256gb-natural-titanium',
    description:
      'Shitet iPhone 15 Pro Max 256GB, ngjyra Natural Titanium. I blerë para 4 muajsh, gjendje si i ri, pa gërvishtje. ' +
      'Vjen me kuti origjinale, karikator, kablë USB-C. Bllokimi i operatorit i hequr (Unlocked). Garanci Apple deri mars 2025.',
    categorySlug: 'celular',
    citySlug: 'prizren',
    attributes: { price: 950, brand: 'Apple', model: 'iPhone 15 Pro Max', condition: 'Përdorur' },
    viewsCount: 198,
    contactClicks: 17,
    userEmail: 'mirela.hoxha@test.com',
    image: ['#4A148C', '#ffffff', '📱', '950 € · 256GB · Titanium'],
    imageCount: 2,
  },

  // 4 — Job offer
  {
    title: 'Kërkohet Inxhinier Software - React & Node.js',
    slug: 'kerkohet-inxhinier-software-react-nodejs',
    description:
      'Kompania jonë e teknologjisë kërkon Inxhinier Software me përvojë në React dhe Node.js. Pozita me kohë të plotë, ' +
      'pune hibride (3 ditë remote). Kërkohet: 3+ vite përvojë, njohuri TypeScript, Git, REST API. ' +
      'Ofrojmë: pagë konkurruese, sigurim shëndetësor, trajnime, laptop modern. Aplikoni me CV në email.',
    categorySlug: 'rreth-punes',
    subcategorySlug: 'ofroj-pune',
    citySlug: 'prishtine',
    attributes: { salary: 1500, type: 'Me kohë të plotë', sector: 'IT / Teknologji', deadline: '30 Prill 2026' },
    viewsCount: 284,
    contactClicks: 62,
    userEmail: 'arben.krasniqi@test.com',
    image: ['#E65100', '#ffffff', '💼', '1,500 €/muaj · Full-time · Hibride'],
    imageCount: 1,
  },

  // 5 — Home furniture
  {
    title: 'Set Mobilje Dhome Gjumi - Lisi Masiv',
    slug: 'set-mobilje-dhome-gjumi-lisi-masiv',
    description:
      'Shitet set i kompletë mobilje dhome gjumi prej lisi masiv. Përfshin: shtrat 180×200cm me baza dyjaterë, ' +
      '2 mobilje anash, garderobë 3 dyer me pasqyrë, komodinë 5 sirtar. Gjendje shumë e mirë, pa defekte. ' +
      'Arsyeja e shitjes: lëvizja në banesë të re. Transport i lirë brenda Pejës.',
    categorySlug: 'shtepia-juaj',
    subcategorySlug: 'mobilje',
    citySlug: 'peje',
    attributes: { price: 650, material: 'Lis masiv', condition: 'Përdorur' },
    viewsCount: 87,
    contactClicks: 11,
    userEmail: 'mirela.hoxha@test.com',
    image: ['#4E342E', '#ffffff', '🛋️', '650 € · Lisi masiv · Pejë'],
    imageCount: 3,
  },

  // 6 — Vehicle / car 2
  {
    title: 'BMW 320d xDrive 2018 - Full Opsion',
    slug: 'bmw-320d-xdrive-2018-full-opsion',
    description:
      'Shitet BMW 320d xDrive, model 2018, naftë, 190 CV, 4WD. Kilometrazhi 112,000 km. Full opsion: ' +
      'LED adaptive, Head-Up Display, NavPro, sedilje elektrike me kujtesë, kamera 360°, akustikë Harman Kardon. ' +
      'Histori komplet servisi, asnjë aksident. Çmimi 22,000€, i negociueshëm.',
    categorySlug: 'automjete',
    subcategorySlug: 'vetura',
    citySlug: 'ferizaj',
    attributes: { price: 22000, brand: 'BMW', model: '320d xDrive', year: 2018, mileage_km: 112000, fuel: 'Naftë' },
    isUrgent: true,
    viewsCount: 431,
    contactClicks: 38,
    userEmail: 'valdrin.berisha@test.com',
    image: ['#212121', '#ffffff', '🚗', '22,000 € · 2018 · 112,000 km'],
    imageCount: 3,
  },

  // 7 — Commercial real estate
  {
    title: 'Lokal Biznesi 120m² - Rruga B, Prishtinë',
    slug: 'lokal-biznesi-120m2-rruga-b-prishtine',
    description:
      'Shitet/Jepet me qira lokal biznesi 120m² në Rrugën "B", qendër Prishtinë. Kati i parë, fasadë xhami, ' +
      'hyrje direkte nga rruga kryesore. Trafikut intensiv pedestrian. Rrym trefazore, klimë central. ' +
      'Ideal për restorant, showroom apo zyrë. Dokumentacion i plotë. Çmim shitje 180,000€ ose qira 1,800€/muaj.',
    categorySlug: 'patundshmeri',
    subcategorySlug: 'lokale',
    citySlug: 'prishtine',
    attributes: { price: 180000, area_m2: 120, for: 'Shitje' },
    isFeatured: true,
    viewsCount: 267,
    contactClicks: 33,
    userEmail: 'arben.krasniqi@test.com',
    image: ['#0D47A1', '#ffffff', '🏢', '180,000 € · 120m² · Qendër'],
    imageCount: 2,
  },

  // 8 — Electronics / laptop
  {
    title: 'Dell XPS 15 9530 - i7-13700H, 32GB, RTX 4060',
    slug: 'dell-xps-15-9530-i7-13700h-32gb-rtx-4060',
    description:
      'Shitet Dell XPS 15 9530, proçesor Intel Core i7-13700H, 32GB RAM DDR5, SSD 1TB NVMe, GPU NVIDIA RTX 4060 8GB. ' +
      'Ekran OLED 3.5K 60Hz 100% DCI-P3. Gjendje si i ri, blerë para 6 muajsh. Garanci Dell aktive deri shtator 2025. ' +
      'Ideal për zhvillues, dizajner, video editor.',
    categorySlug: 'pc-tv',
    citySlug: 'gjilan',
    attributes: { price: 1200, brand: 'Dell', condition: 'Përdorur' },
    viewsCount: 156,
    contactClicks: 14,
    userEmail: 'mirela.hoxha@test.com',
    image: ['#37474F', '#ffffff', '💻', '1,200 € · i7-13H · 32GB · RTX 4060'],
    imageCount: 2,
  },

  // 9 — Phone 2
  {
    title: 'Samsung Galaxy S24 Ultra 512GB - Titanium Black',
    slug: 'samsung-galaxy-s24-ultra-512gb-titanium-black',
    description:
      'Shitet Samsung Galaxy S24 Ultra 512GB, ngjyra Titanium Black. Gjendje e shkëlqyer, pa dëmtime. ' +
      'Vjen me S-Pen origjinal, kuti e plotë. Ekran Dynamic AMOLED 2X 6.8", kamera 200MP. ' +
      'I blerë nga Germany, shfajlluar (unlocked) për të gjithë operatorët.',
    categorySlug: 'celular',
    citySlug: 'mitrovice',
    attributes: { price: 720, brand: 'Samsung', model: 'Galaxy S24 Ultra', condition: 'Përdorur' },
    viewsCount: 223,
    contactClicks: 21,
    userEmail: 'valdrin.berisha@test.com',
    image: ['#6A1B9A', '#ffffff', '📱', '720 € · 512GB · S24 Ultra'],
    imageCount: 2,
  },

  // 10 — Land
  {
    title: 'Tokë Bujqësore 2ha - Lipjan, afër autostradës',
    slug: 'toke-bujqesore-2ha-lipjan-afar-autostrades',
    description:
      'Shitet tokë bujqësore 2 hektarë (20,000m²) në fshatin Gadime, Lipjan. 500m nga autostrada Prishtinë-Ferizaj. ' +
      'Tokë e rrafshët, e ujitshme, aksesibël gjatë gjithë vitit. Zona zhvilluese - mundësi ndryshimi destinacioni. ' +
      'Çmim 45,000€, i negociueshëm.',
    categorySlug: 'patundshmeri',
    subcategorySlug: 'toka',
    citySlug: 'lipjan',
    attributes: { price: 45000, area_m2: 20000 },
    viewsCount: 134,
    contactClicks: 9,
    userEmail: 'arben.krasniqi@test.com',
    image: ['#2E7D32', '#ffffff', '🌾', '45,000 € · 20,000m² · Lipjan'],
    imageCount: 2,
  },

  // 11 — Job seeking
  {
    title: 'Kërkoj Punë - Elektricist 8 Vite Përvojë',
    slug: 'kerkoj-pune-elektricist-8-vite-pervoje',
    description:
      'Jam elektricist me 8 vite përvojë në instalime industriale dhe banesore. Kualifikime: certifikatë KAK, ' +
      'njohuri sisteme fotovoltaike, BMS, panele elektrike. Kam punuar me kompani ndërtimi në Kosovë dhe Gjermani. ' +
      'Kërkoj pozitë me kohë të plotë ose kontrakte individuale. I disponueshëm menjëherë.',
    categorySlug: 'rreth-punes',
    subcategorySlug: 'kerkoj-pune',
    citySlug: 'gjakove',
    attributes: { experience: 8, sector: 'Elektricitet / Energji' },
    viewsCount: 76,
    contactClicks: 8,
    userEmail: 'mirela.hoxha@test.com',
    image: ['#F57F17', '#ffffff', '⚡', '8 vite · Elektricist · Gjakovë'],
    imageCount: 1,
  },

  // 12 — Services
  {
    title: 'Shërbim Pastrimi Banesash & Zyrave - Prishtinë',
    slug: 'sherbim-pastrimi-banesash-zyrave-prishtine',
    description:
      'Ofrojmë shërbim profesional pastrimi banesash, zyrave dhe hapësirave komerciale në Prishtinë dhe rrethinë. ' +
      'Ekip i trajnuar, produkte ekologjike. Shërbime: pastrim i thellë, pas ndërtimit, mirëmbajtje periodike, pastrim xhamash. ' +
      'Tarifa: 15€/orë ose kontratë mujore me çmim të ulur. Klikoni "Kontakto" për ofertë falas.',
    categorySlug: 'sherbime',
    citySlug: 'prishtine',
    attributes: { price: 15, type: 'Orë' },
    viewsCount: 189,
    contactClicks: 44,
    userEmail: 'valdrin.berisha@test.com',
    image: ['#00838F', '#ffffff', '🔧', '15 €/orë · Pastrim · Prishtinë'],
    imageCount: 2,
  },
];

// ─── Test users ───────────────────────────────────────────────────────────────

const testUsers = [
  { email: 'arben.krasniqi@test.com',  name: 'Arben Krasniqi',  phone: '+38344100001', trustScore: 80 },
  { email: 'valdrin.berisha@test.com', name: 'Valdrin Berisha', phone: '+38344100002', trustScore: 65 },
  { email: 'mirela.hoxha@test.com',    name: 'Mirela Hoxha',    phone: '+38344100003', trustScore: 55 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding listings...\n');

  // ── 1. Upsert test users ─────────────────────────────────────────────────
  console.log('👤 Upserting test users...');
  const passwordHash = await bcrypt.hash('test1234', 10);
  const userMap = new Map<string, string>(); // email → id

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        phone: u.phone,
        passwordHash,
        role: 'USER',
        trustScore: u.trustScore,
        isVerified: true,
      },
    });
    userMap.set(u.email, user.id);
    console.log(`   ✓ ${u.name} (${u.email})`);
  }

  // ── 2. Resolve categories & cities ──────────────────────────────────────
  console.log('\n📂 Loading categories and cities...');
  const allCategories = await prisma.category.findMany();
  const allCities     = await prisma.city.findMany();

  const catBySlug  = new Map(allCategories.map(c => [c.slug, c]));
  const cityBySlug = new Map(allCities.map(c => [c.slug, c]));

  // ── 3. Create listings + images ──────────────────────────────────────────
  console.log('\n📋 Creating listings + images...\n');

  for (let i = 0; i < listingDefs.length; i++) {
    const def = listingDefs[i];

    const category    = catBySlug.get(def.categorySlug);
    const subcategory = def.subcategorySlug ? catBySlug.get(def.subcategorySlug) : undefined;
    const city        = cityBySlug.get(def.citySlug);
    const userId      = userMap.get(def.userEmail)!;

    if (!category) throw new Error(`Category not found: ${def.categorySlug}`);
    if (!city)     throw new Error(`City not found: ${def.citySlug}`);

    const expiresAt = new Date(NOW);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // upsert listing by slug
    const listing = await prisma.listing.upsert({
      where: { slug: def.slug },
      update: {
        title: def.title,
        description: def.description,
        attributes: def.attributes as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        isFeatured: def.isFeatured ?? false,
        isUrgent: def.isUrgent ?? false,
        viewsCount: def.viewsCount ?? 0,
        contactClicks: def.contactClicks ?? 0,
      },
      create: {
        userId,
        categoryId: category.id,
        subcategoryId: subcategory?.id,
        cityId: city.id,
        title: def.title,
        slug: def.slug,
        description: def.description,
        attributes: def.attributes as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        isFeatured: def.isFeatured ?? false,
        isUrgent: def.isUrgent ?? false,
        viewsCount: def.viewsCount ?? 0,
        contactClicks: def.contactClicks ?? 0,
        expiresAt,
      },
    });

    // delete old images before regenerating
    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });

    const [bg, textColor, icon, subtitle] = def.image;

    for (let j = 0; j < def.imageCount; j++) {
      // slight hue variation per image within a listing
      const variantSubtitle = j === 0 ? subtitle : `${subtitle} · Foto ${j + 1}`;
      const imgs = await generateImage(listing.id, bg, textColor, icon, def.title, variantSubtitle, i * 10 + j);

      await prisma.listingImage.create({
        data: {
          listingId: listing.id,
          url:       imgs.url,
          thumbUrl:  imgs.thumbUrl,
          mediumUrl: imgs.mediumUrl,
          position:  j,
          isPrimary: j === 0,
        },
      });
    }

    console.log(`   [${i + 1}/12] ✓ ${def.title}`);
    console.log(`          ${def.imageCount} foto · ${city.name} · ${category.name}`);
  }

  console.log('\n✅ Done! 12 shpallje u krijuan me sukses.');
  console.log(`   Images stored in: ${UPLOAD_DIR}`);
  console.log(`   Served via:       ${IMAGE_SERVICE_PUBLIC_URL}/uploads/`);
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
