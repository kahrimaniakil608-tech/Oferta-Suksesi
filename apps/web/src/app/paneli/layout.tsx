import type { Metadata } from 'next';
import MemberShell from './MemberShell';
export const metadata: Metadata = { title: 'Paneli im', robots: {index: false, follow: false} };
export default function Layout({children}: {children: React.ReactNode}) { return <MemberShell>{children}</MemberShell>; }
