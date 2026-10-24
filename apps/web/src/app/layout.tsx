import { CatalogProvider } from '@/contexts/CatalogContext';
import MaintenanceBoundary from '@/components/MaintenanceBoundary';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import SiteFooterAd from '@/components/ads/SiteFooterAd';
import SideSkyscraper from '@/components/ads/SideSkyscraper';
import MobileStickyAd from '@/components/ads/MobileStickyAd';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = localFont({
  src: './fonts/Inter.ttf',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,

};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ofertasuksesi.com'),
  title: {
    default: 'Oferta Suksesi — Platforma e Shpalljeve në Kosovë',
    template: '%s | Oferta Suksesi',
  },
  description:
    'Platforma kryesore e shpalljeve të klasifikuara në Kosovë. Gjeni dhe postoni shpallje për patunësi, automjete, elektronikë dhe shumë më tepër.',
  keywords: ['shpallje', 'kosovë', 'shitje', 'blerje', 'patunësi', 'automjete', 'prishtinë'],
  openGraph: {
    siteName: 'Oferta Suksesi',
    locale: 'sq_AL',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" className={inter.variable}>
      <body suppressHydrationWarning className="bg-gray-50 text-dark font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:p-3 focus:rounded-lg">Kalo te përmbajtja</a>
        <GoogleAnalytics />
        <AuthProvider><CatalogProvider>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="min-h-screen pb-[calc(80px+env(safe-area-inset-bottom)+var(--mobile-ad-height,0px))] md:pb-0">
            <MaintenanceBoundary>{children}</MaintenanceBoundary>
          </main>
          <SideSkyscraper />
          <MobileStickyAd />
          <SiteFooterAd />
          <Footer />
          <BottomNav />
        </CatalogProvider></AuthProvider>
      </body>
    </html>
  );
}
