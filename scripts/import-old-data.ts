/**
 * Import script for migrating users and listings from old OfertaSuksesi platform
 *
 * Usage:
 *   npx ts-node scripts/import-old-data.ts
 *
 * Prerequisites:
 *   - old_users.csv in project root
 *   - old_articles.csv in project root
 *   - old_categories.csv in project root
 *   - old_images/ folder in project root (optional, for image matching)
 *
 * Outputs:
 *   - user_passwords.csv — email → password mapping for emailing users
 */

import { PrismaClient, ListingStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface OldUser {
  id: string;
  name: string;
  email: string;
  password: string;
  nickname: string;
  trusted: string;
  role: string;
  remember_token: string;
  created_at: string;
  updated_at: string;
}

interface OldArticle {
  id: string;
  name: string;
  user_id: string;
  category_id: string;
  phone: string;
  phone2: string;
  phone3: string;
  email: string;
  description: string;
  city: string;
  image: string;
  featured: string;
  status: string;
  moderated_at: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  deleted_at: string;
}

const prisma = new PrismaClient();

// ─── City mapping: old 2-letter codes → new city slugs ─────────────────────

const CITY_MAP: Record<string, string> = {
  pr: 'prishtine',
  pz: 'prizren',
  pe: 'peje',
  gj: 'gjakove',
  mi: 'mitrovice',
  fz: 'ferizaj',
  gl: 'gjilan',
  vu: 'vushtrri',
  ka: 'kastriot-obiliq',
  li: 'lipjan',
  dr: 'drenas-gllogovc',
  ma: 'malisheve',
  ra: 'rahovec',
  sh: 'suhareke',
  kl: 'kline',
  le: 'leposaviq',
  sk: 'skenderaj',
  de: 'decan',
  dg: 'dragash',
  vi: 'viti',
  ar: 'artane-novoberde',
  zp: 'zubin-potok',
  st: 'shtime',
  be: 'fushe-kosove', // Besianë = Fushë Kosovë
  bu: 'prishtine',    // fallback
  da: 'prishtine',    // fallback
  ks: 'kacanik',
  sq: 'shqiperi',
  th: 'prishtine',    // fallback
};

// ─── Category mapping: old category_id → new category slug + subcategory slug
// Old categories from old_categories.csv:
//  1  Patundshmëri (parent)
//  13 Banesa (child of 1)
//  14 Shtepi (child of 1)
//  15 Lokale (child of 1)
//  16 Troje (child of 1) → Toka
//  17 Garazha (child of 1)
//  55 Bashkbanues (child of 1) → Banesa
//  2  Automjete (parent)
//  31-54 car brands (children of 2) → Vetura
//  48 Kamionë (child of 2)
//  50 Traktor (child of 2) → Pajisje Bujqësore
//  51 Pjesë për vetura (child of 2) → Pjesë Këmbimi
//  3  Rreth Punës (parent)
//  29 Ofroj Punë (child of 3)
//  30 Kërkoj Punë (child of 3)
//  4  PC, TV etj. (parent)
//  5  Celular (parent)
//  56-61 phone brands (children of 5) → Celular
//  6  Shtëpia Juaj (parent)
//  7  Bashkëpunim (parent)
//  8  Shërbime (parent)
//  9  Bujqësi (parent)
//  10 Kafshë (parent)
//  11 Interesi Juaj (parent)
//  12 Të Ndryshme (parent)

interface CategoryMapping {
  categorySlug: string;
  subcategorySlug?: string;
}

const CATEGORY_MAP: Record<number, CategoryMapping> = {
  // Patundshmëri
  1:  { categorySlug: 'patundshmeri' },
  13: { categorySlug: 'patundshmeri', subcategorySlug: 'banesa' },
  14: { categorySlug: 'patundshmeri', subcategorySlug: 'banesa' }, // Shtepi → Banesa
  15: { categorySlug: 'patundshmeri', subcategorySlug: 'lokale' },
  16: { categorySlug: 'patundshmeri', subcategorySlug: 'toka' },   // Troje → Toka
  17: { categorySlug: 'patundshmeri', subcategorySlug: 'garazha' },
  55: { categorySlug: 'patundshmeri', subcategorySlug: 'banesa' }, // Bashkbanues → Banesa

  // Automjete — all car brands map to Vetura subcategory
  2:  { categorySlug: 'automjete' },
  31: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Audi
  32: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // VW Golf
  33: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // VW Pasat
  35: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // BMW
  36: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Jeep
  37: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Opel
  39: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Peugeot
  40: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Citroen
  41: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Renault
  42: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Mercedes
  43: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Alfa Romeo
  44: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Seat
  46: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Fiat
  47: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Ford
  48: { categorySlug: 'automjete', subcategorySlug: 'kamione' }, // Kamionë
  49: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Volvo
  50: { categorySlug: 'bujqesi', subcategorySlug: 'pajisje-bujqesore' }, // Traktor
  51: { categorySlug: 'automjete', subcategorySlug: 'pjese-kembimi' }, // Pjesë për vetura
  53: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Skoda
  54: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Vetura tjera
  62: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Honda
  25: { categorySlug: 'automjete', subcategorySlug: 'vetura' }, // Auto (old ad type)

  // Rreth Punës
  3:  { categorySlug: 'rreth-punes' },
  29: { categorySlug: 'rreth-punes', subcategorySlug: 'ofroj-pune' },
  30: { categorySlug: 'rreth-punes', subcategorySlug: 'kerkoj-pune' },

  // PC, TV
  4:  { categorySlug: 'pc-tv' },

  // Celular — all phone brands map to parent
  5:  { categorySlug: 'celular' },
  56: { categorySlug: 'celular' }, // Samsung
  57: { categorySlug: 'celular' }, // Iphone
  58: { categorySlug: 'celular' }, // Sony
  59: { categorySlug: 'celular' }, // Cubot
  60: { categorySlug: 'celular' }, // Nokia
  61: { categorySlug: 'celular' }, // SIM Kartela

  // Shtëpia Juaj
  6:  { categorySlug: 'shtepia-juaj' },

  // Bashkëpunim
  7:  { categorySlug: 'bashkepunim' },

  // Shërbime
  8:  { categorySlug: 'sherbime' },
  64: { categorySlug: 'sherbime' },

  // Bujqësi
  9:  { categorySlug: 'bujqesi' },

  // Kafshë
  10: { categorySlug: 'kafsha' },

  // Interesi Juaj
  11: { categorySlug: 'interesi-juaj' },

  // Të Ndryshme
  12: { categorySlug: 'te-ndryshme' },

  // Old ad-type categories (type=2) — map to closest match
  18: { categorySlug: 'celular' },   // Mobi Shop
  19: { categorySlug: 'celular' },   // Mobi Shop
  20: { categorySlug: 'te-ndryshme' }, // Mobi Shop (under Të Ndryshme)
  21: { categorySlug: 'te-ndryshme' }, // Ushqimore
  22: { categorySlug: 'te-ndryshme' }, // Ushqimore
  23: { categorySlug: 'te-ndryshme' }, // Test
  24: { categorySlug: 'te-ndryshme' }, // Ushqimore
  52: { categorySlug: 'patundshmeri' }, // Patundshmëri (ad type)
  63: { categorySlug: 'sherbime' },    // Shëndetsim
};

// ─── Helper: generate slug from title ─────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ëë]/g, 'e')
    .replace(/[çç]/g, 'c')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// ─── Helper: parse old image JSON array ───────────────────────────────────

function parseImageArray(imageStr: string): string[] {
  if (!imageStr || imageStr === 'NULL' || imageStr === '') return [];
  try {
    const parsed = JSON.parse(imageStr);
    if (Array.isArray(parsed)) return parsed.filter((s: string) => s && s.length > 0);
  } catch {
    // Sometimes the JSON is malformed — try to extract filenames
    const matches = imageStr.match(/[\w.-]+\.(jpg|jpeg|png|gif|webp)/gi);
    if (matches) return matches;
  }
  return [];
}

// ─── Main import ──────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Starting import...\n');

  // ─── Load CSVs ────────────────────────────────────────────────────────

  const usersRaw = fs.readFileSync(path.join(process.cwd(), 'old_users.csv'), 'utf-8');
  const articlesRaw = fs.readFileSync(path.join(process.cwd(), 'old_articles.csv'), 'utf-8');

  const oldUsers: OldUser[] = parse(usersRaw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
  const oldArticles: OldArticle[] = parse(articlesRaw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

  console.log(`📋 Loaded ${oldUsers.length} users, ${oldArticles.length} articles\n`);

  // ─── Load new categories & cities from DB ─────────────────────────────

  const dbCategories = await prisma.category.findMany();
  const dbCities = await prisma.city.findMany();

  const categoryBySlug = new Map(dbCategories.map(c => [c.slug, c]));
  const cityBySlug = new Map(dbCities.map(c => [c.slug, c]));

  // Default city for unmapped codes
  const defaultCity = dbCities.find(c => c.slug === 'prishtine')!;
  // Default category for unmapped IDs
  const defaultCategory = dbCategories.find(c => c.slug === 'te-ndryshme')!;

  // ─── Check for old_images folder ──────────────────────────────────────

  const imagesDir = path.join(process.cwd(), 'old_images');
  const hasImagesDir = fs.existsSync(imagesDir);
  let imageFiles: Set<string> | null = null;

  if (hasImagesDir) {
    const files = fs.readdirSync(imagesDir);
    imageFiles = new Set(files.map(f => f.toLowerCase()));
    console.log(`📸 Found ${imageFiles.size} image files in old_images/\n`);
  } else {
    console.log('⚠️  No old_images/ folder found — skipping image import\n');
  }

  // ─── Import Users ─────────────────────────────────────────────────────

  console.log('👤 Importing users...');

  const passwordLines: string[] = ['email,password,name'];
  const oldIdToNewId = new Map<string, string>(); // old user id → new user id

  for (let i = 0; i < oldUsers.length; i++) {
    const oldUser = oldUsers[i];
    const num = String(i + 1).padStart(3, '0');
    const password = `OfertaSuksesi${num}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const email = (oldUser.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      console.log(`  ⏭️  Skipping user ${oldUser.id} — invalid email: "${oldUser.email}"`);
      continue;
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      oldIdToNewId.set(oldUser.id, existing.id);
      console.log(`  ⏭️  User ${email} already exists, mapping old ID ${oldUser.id} → ${existing.id}`);
      continue;
    }

    const name = (oldUser.name || 'Përdorues').trim();
    const role = oldUser.role === '2' ? 'ADMIN' as const : 'USER' as const;

    try {
      // Generate unique slug for user
      const baseSlug = slugify(name) || 'user';
      let userSlug = baseSlug;
      let slugAttempt = 0;
      while (await prisma.user.findUnique({ where: { slug: userSlug } })) {
        slugAttempt++;
        userSlug = `${baseSlug}-${slugAttempt}`;
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          slug: userSlug,
          passwordHash,
          role,
          isVerified: oldUser.trusted === '1',
          postingStatus: 'AUTO_PUBLISH',
          notificationPrefs: {},
          createdAt: oldUser.created_at && oldUser.created_at !== 'NULL'
            ? new Date(oldUser.created_at)
            : new Date(),
        },
      });

      oldIdToNewId.set(oldUser.id, newUser.id);
      passwordLines.push(`${email},${password},${name}`);

      if ((i + 1) % 500 === 0) console.log(`  ✅ ${i + 1}/${oldUsers.length} users imported`);
    } catch (err: any) {
      console.log(`  ❌ Failed user ${oldUser.id} (${email}): ${err.message}`);
    }
  }

  // Write password file
  fs.writeFileSync(path.join(process.cwd(), 'user_passwords.csv'), passwordLines.join('\n'), 'utf-8');
  console.log(`\n📝 Password list saved to user_passwords.csv (${passwordLines.length - 1} users)\n`);

  // ─── Import Listings (last 5000) ──────────────────────────────────────

  console.log('📦 Importing listings (last 3000)...');

  // Sort by ID descending (most recent), take 3000, filter out deleted
  const sortedArticles = oldArticles
    .filter((a: any) => !a.deleted_at || a.deleted_at === 'NULL' || a.deleted_at === '')
    .sort((a: any, b: any) => Number(b.id) - Number(a.id))
    .slice(0, 3000);

  console.log(`  📋 ${sortedArticles.length} non-deleted articles selected\n`);

  // Base destination for imported images (same structure as image service: uploads/listings/{year}/{month}/{listingId}/)
  const uploadsBase = path.join(process.cwd(), 'apps', 'image-service', 'uploads', 'listings');

  let imported = 0;
  let skipped = 0;
  let imagesCopied = 0;

  for (const article of sortedArticles) {
    try {
      // Map category
      const oldCatId = Number(article.category_id);
      const catMapping = CATEGORY_MAP[oldCatId] || { categorySlug: 'te-ndryshme' };
      const category = categoryBySlug.get(catMapping.categorySlug) || defaultCategory;
      const subcategory = catMapping.subcategorySlug
        ? categoryBySlug.get(catMapping.subcategorySlug)
        : null;

      // Map city
      const cityCode = (article.city || 'pr').toLowerCase().trim();
      const citySlug = CITY_MAP[cityCode] || 'prishtine';
      const city = cityBySlug.get(citySlug) || defaultCity;

      // Map user
      const userId = oldIdToNewId.get(article.user_id) || null;

      // Build title and slug
      const title = (article.name || 'Pa titull').trim();
      const baseSlug = slugify(title) || `listing-${article.id}`;
      const slug = `${baseSlug}-${article.id}`;

      // Description
      const description = (article.description || title).trim();

      // Phone — store in attributes
      const phone = (article.phone || '').replace(/[^\d+]/g, '');
      const phone2 = (article.phone2 || '').replace(/[^\d+]/g, '');

      // Created date
      const createdAt = article.created_at && article.created_at !== 'NULL'
        ? new Date(article.created_at)
        : new Date();

      // Expires 1 year from now (imported listings get fresh expiry)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Status: old status 1 = active
      const status = article.status === '1' ? ListingStatus.PUBLISHED : ListingStatus.DRAFT;

      // Check for duplicate slug
      const existingListing = await prisma.listing.findUnique({ where: { slug } });
      if (existingListing) {
        skipped++;
        continue;
      }

      const listing = await prisma.listing.create({
        data: {
          userId,
          categoryId: category.id,
          subcategoryId: subcategory?.id || null,
          cityId: city.id,
          title,
          slug,
          description,
          attributes: {
            phone: phone || undefined,
            phone2: phone2 || undefined,
            contactEmail: article.email || undefined,
          },
          status,
          expiresAt,
          createdAt,
          isGuestListing: !userId,
          guestName: !userId ? article.name : null,
          guestPhone: !userId ? phone : null,
          guestEmail: !userId ? article.email : null,
        },
      });

      // ─── Import images for this listing ─────────────────────────────

      if (hasImagesDir && imageFiles) {
        const imageNames = parseImageArray(article.image);

        for (let pos = 0; pos < imageNames.length; pos++) {
          const imgName = imageNames[pos];
          const imgNameLower = imgName.toLowerCase();

          if (imageFiles.has(imgNameLower)) {
            // Find the actual filename (case-insensitive match)
            const actualFiles = fs.readdirSync(imagesDir);
            const actualFile = actualFiles.find(f => f.toLowerCase() === imgNameLower);

            if (actualFile) {
              // Use same folder structure as image service: listings/{year}/{month}/{listingId}/
              const listingDate = createdAt instanceof Date ? createdAt : new Date();
              const year = listingDate.getFullYear().toString();
              const month = String(listingDate.getMonth() + 1).padStart(2, '0');
              const destDir = path.join(uploadsBase, year, month, listing.id);
              fs.mkdirSync(destDir, { recursive: true });
              const destPath = path.join(destDir, actualFile);
              fs.copyFileSync(path.join(imagesDir, actualFile), destPath);

              // Create listing image record
              const imageUrl = `listings/${year}/${month}/${listing.id}/${actualFile}`;
              await prisma.listingImage.create({
                data: {
                  listingId: listing.id,
                  url: imageUrl,
                  thumbUrl: imageUrl,
                  mediumUrl: imageUrl,
                  position: pos,
                  isPrimary: pos === 0,
                },
              });

              imagesCopied++;
            }
          }
        }
      }

      imported++;
      if (imported % 500 === 0) console.log(`  ✅ ${imported} listings imported, ${imagesCopied} images copied`);
    } catch (err: any) {
      console.log(`  ❌ Failed article ${article.id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Users:    ${passwordLines.length - 1} imported`);
  console.log(`   Listings: ${imported} imported, ${skipped} skipped`);
  console.log(`   Images:   ${imagesCopied} copied`);
  console.log(`\n📧 Email password list: user_passwords.csv`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
