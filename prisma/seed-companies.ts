import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const fakeCompanies = [
  {
    name: 'Kosova Real Estate',
    slug: 'kosova-real-estate',
    description: 'Agjencia lider e patundshmërive në Kosovë. Ofrojmë banesa, lokale, dhe toka në të gjitha qytetet.',
    phone: '+383 44 123 456',
    email: 'info@kosovarealestate.com',
    website: 'https://kosovarealestate.com',
    address: 'Rr. Agim Ramadani 42, Prishtinë',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: true,
    socials: { facebook: 'https://facebook.com/kosovarealestate', instagram: 'https://instagram.com/kosovare' },
  },
  {
    name: 'AutoPrishtina',
    slug: 'auto-prishtina',
    description: 'Autosalloni më i madh në Prishtinë. Vetura të reja dhe të përdorura me garanci.',
    phone: '+383 44 222 333',
    email: 'info@autoprishtina.com',
    website: 'https://autoprishtina.com',
    address: 'Magjistralja Prishtinë-Ferizaj km 3',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: true,
    socials: { facebook: 'https://facebook.com/autoprishtina', instagram: 'https://instagram.com/autoprishtina', youtube: 'https://youtube.com/@autoprishtina' },
  },
  {
    name: 'DigiKos Tech',
    slug: 'digikos-tech',
    description: 'Kompani e teknologjisë që ofron shërbime të IT-së, zhvillim softuerësh, dhe konsulencë dixhitale.',
    phone: '+383 49 555 666',
    email: 'hello@digikos.tech',
    website: 'https://digikos.tech',
    address: 'Innovation Centre, Rr. Rexhep Luci, Prishtinë',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: true,
    socials: { linkedin: 'https://linkedin.com/company/digikos', instagram: 'https://instagram.com/digikos' },
  },
  {
    name: 'Mobileri Elegance',
    slug: 'mobileri-elegance',
    description: 'Mobilje moderne dhe klasike për shtëpinë tuaj. Prodhim vendor dhe import nga Italia.',
    phone: '+383 44 777 888',
    email: 'info@elegance-ks.com',
    address: 'Zona Industriale, Ferizaj',
    citySlug: 'ferizaj',
    isVerified: true,
    isPremium: true,
    socials: { facebook: 'https://facebook.com/mobilerielegance', tiktok: 'https://tiktok.com/@eleganceks' },
  },
  {
    name: 'Prizren Properties',
    slug: 'prizren-properties',
    description: 'Patundshmëri në Prizren dhe rrethinë. Banesa, shtëpi, dhe lokale me çmime të arsyeshme.',
    phone: '+383 44 111 999',
    email: 'info@prizrenproperties.com',
    website: 'https://prizrenproperties.com',
    address: 'Sheshi Shadërvan, Prizren',
    citySlug: 'prizren',
    isVerified: true,
    isPremium: false,
    socials: { facebook: 'https://facebook.com/prizrenproperties' },
  },
  {
    name: 'KosovaJob',
    slug: 'kosova-job',
    description: 'Platforma kryesore e punësimit në Kosovë. Lidhim punëdhënës me punëkërkues çdo ditë.',
    phone: '+383 49 333 444',
    email: 'contact@kosovajob.com',
    website: 'https://kosovajob.com',
    address: 'Rr. Nëna Terezë 35, Prishtinë',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: false,
    socials: { facebook: 'https://facebook.com/kosovajob', linkedin: 'https://linkedin.com/company/kosovajob' },
  },
  {
    name: 'Peja Motors',
    slug: 'peja-motors',
    description: 'Shitblerje veturash në Pejë. Mbi 15 vite eksperiencë në treg.',
    phone: '+383 44 444 555',
    email: 'sales@pejamotors.com',
    address: 'Magjistralja Pejë-Prishtinë',
    citySlug: 'peje',
    isVerified: false,
    isPremium: false,
    socials: { facebook: 'https://facebook.com/pejamotors' },
  },
  {
    name: 'TechStore KS',
    slug: 'techstore-ks',
    description: 'Pajisje elektronike, laptopë, telefona, dhe aksesorë me garanci zyrtare.',
    phone: '+383 49 888 999',
    email: 'shop@techstoreks.com',
    website: 'https://techstoreks.com',
    address: 'Albi Mall, Prishtinë',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: false,
    socials: { instagram: 'https://instagram.com/techstoreks', tiktok: 'https://tiktok.com/@techstoreks' },
  },
  {
    name: 'Gjilan Build',
    slug: 'gjilan-build',
    description: 'Material ndërtimi dhe shërbime ndërtimore në rajonin e Gjilanit.',
    phone: '+383 44 666 777',
    email: 'info@gjilanbuild.com',
    address: 'Zona Industriale, Gjilan',
    citySlug: 'gjilan',
    isVerified: false,
    isPremium: false,
    socials: {},
  },
  {
    name: 'Fashion Corner KS',
    slug: 'fashion-corner-ks',
    description: 'Veshje dhe aksesorë për femra dhe meshkuj. Brendet botërore me çmime të volitshme.',
    phone: '+383 49 222 111',
    email: 'style@fashioncornerks.com',
    website: 'https://fashioncornerks.com',
    address: 'Grand Store Mall, Prishtinë',
    citySlug: 'prishtine',
    isVerified: true,
    isPremium: false,
    socials: { instagram: 'https://instagram.com/fashioncornerks', facebook: 'https://facebook.com/fashioncornerks' },
  },
];

async function main() {
  console.log('🏢 Seeding fake companies...\n');

  const passwordHash = await bcrypt.hash('company123', 12);

  for (const comp of fakeCompanies) {
    const { citySlug, socials, ...rest } = comp;

    // Find city
    const city = await prisma.city.findUnique({ where: { slug: citySlug } });

    // Create a unique owner user for each company
    const ownerEmail = `owner-${comp.slug}@demo.com`;
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        email: ownerEmail,
        name: `${comp.name} Owner`,
        passwordHash,
        role: Role.COMPANY,
        isVerified: true,
      },
    });

    // Check if company already exists
    const existing = await prisma.company.findUnique({ where: { slug: comp.slug } });
    if (existing) {
      console.log(`   ⏭ ${comp.name} (already exists)`);
      continue;
    }

    // Check if owner already has a company
    const ownerCompany = await prisma.company.findUnique({ where: { ownerId: owner.id } });
    if (ownerCompany) {
      console.log(`   ⏭ ${comp.name} (owner already has company)`);
      continue;
    }

    const company = await prisma.company.create({
      data: {
        ...rest,
        ownerId: owner.id,
        cityId: city?.id ?? null,
        socials: Object.keys(socials).length > 0 ? socials : undefined,
      },
    });

    // Link owner to company
    await prisma.user.update({
      where: { id: owner.id },
      data: { companyId: company.id },
    });

    console.log(`   ✓ ${comp.name} (${comp.isPremium ? '⭐ premium' : 'standard'}${comp.isVerified ? ', ✓ verified' : ''})`);
  }

  console.log('\n✅ Companies seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
