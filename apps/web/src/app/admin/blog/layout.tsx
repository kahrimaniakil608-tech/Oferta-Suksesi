import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Blogu' };
export default function Layout({children}: {children: React.ReactNode}) { return children; }
