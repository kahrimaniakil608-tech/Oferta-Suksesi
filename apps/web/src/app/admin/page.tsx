'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';
import { statusLabel } from '@/lib/labels';
import { timeAgo } from '@/lib/utils';

interface DashboardStats {
  totalListings: number;
  pendingListings: number;
  publishedListings: number;
  rejectedListings: number;
  totalUsers: number;
  todayListings: number;
  totalCompanies: number;
}

interface AdDashboard {
  totalActiveCampaigns: number;
  impressionsToday: number;
  clicksToday: number;
  overallCtrToday: number;
}

interface RecentListing {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  category?: { name: string };
  city?: { name: string };
  user?: { name: string };
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED:      'bg-green-100 text-green-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED:       'bg-red-100 text-red-700',
  ARCHIVED:       'bg-gray-100 text-gray-600',
  EXPIRED:        'bg-orange-100 text-orange-800',
  DRAFT:          'bg-blue-100 text-blue-700',
};
type ResourceState<T> = { data: T | null; loading: boolean; failed: boolean };

function useDashboardResource<T>(path: string, token: string | null, valid: (value: T) => boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ data: null, loading: true, failed: false });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setState({ data: null, loading: true, failed: false });
    adminFetch<T>(path, token, { signal: controller.signal })
      .then(data => {
        if (!valid(data)) throw new Error('Invalid dashboard response');
        if (!cancelled) setState({ data, loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, failed: true });
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [path, token, valid, attempt]);

  return { ...state, retry: () => setAttempt(value => value + 1) };
}

const validStats = (value: DashboardStats) => value != null && [
  value.totalUsers, value.totalCompanies, value.publishedListings, value.pendingListings, value.todayListings,
].every(number => Number.isInteger(number) && number >= 0);
const validAdStats = (value: AdDashboard) => value != null && [
  value.totalActiveCampaigns, value.impressionsToday, value.clicksToday, value.overallCtrToday,
].every(number => Number.isFinite(number) && number >= 0);
const validListings = (value: { data: RecentListing[] }) => Array.isArray(value?.data) && value.data.every(row =>
  row != null && ['id', 'title', 'status', 'createdAt'].every(key => typeof row[key as keyof RecentListing] === 'string'));
const validUsers = (value: { data: RecentUser[] }) => Array.isArray(value?.data) && value.data.every(row =>
  row != null && ['id', 'name', 'email', 'createdAt'].every(key => typeof row[key as keyof RecentUser] === 'string'));

function DashboardError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
    <p>{message}</p>
    <button type="button" onClick={retry} className="mt-2 font-semibold underline">Provo përsëri</button>
  </div>;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const statsResult = useDashboardResource('/admin/stats', token, validStats);
  const adResult = useDashboardResource('/admin/ads/dashboard', token, validAdStats);
  const listingResult = useDashboardResource('/admin/listings?limit=10&sort=newest', token, validListings);
  const userResult = useDashboardResource('/admin/users?limit=10&sort=newest', token, validUsers);
  const stats = statsResult.data;
  const adStats = adResult.data;
  const listings = listingResult.data?.data ?? [];
  const users = userResult.data?.data ?? [];

  const STAT_CARDS = [
    {
      label: 'Përdorues',
      value: stats?.totalUsers,
      resource: statsResult,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      href: '/admin/perdoruesit',
      icon: <UsersIcon />,
    },
    {
      label: 'Shpallje Aktive',
      value: stats?.publishedListings,
      resource: statsResult,
      color: 'text-green-700',
      bg: 'bg-green-50',
      href: '/admin/shpalljet?status=PUBLISHED',
      icon: <ListIcon />,
    },
    {
      label: 'Në Pritje',
      value: stats?.pendingListings,
      resource: statsResult,
      color: 'text-amber-800',
      bg: 'bg-amber-50',
      href: '/admin/moderimi',
      icon: <ClockIcon />,
    },
    {
      label: 'Kompani',
      value: stats?.totalCompanies,
      resource: statsResult,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      href: '/admin/kompanite',
      icon: <BuildingIcon />,
    },
    {
      label: 'Reklama Aktive',
      value: adStats?.totalActiveCampaigns,
      resource: adResult,
      color: 'text-orange-800',
      bg: 'bg-orange-50',
      href: '/admin/reklamat?status=active',
      icon: <MegaphoneIcon />,
    },
    {
      label: 'Të Reja Sot',
      value: stats?.todayListings,
      resource: statsResult,
      color: 'text-primary',
      bg: 'bg-primary/5',
      href: '/admin/shpalljet?datePreset=today',
      icon: <TrendIcon />,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark">Përmbledhja</h1>
        <p className="text-gray-500 text-sm mt-2">Shqyrto shpalljet dhe ndiq aktivitetin e platformës.</p>
      </div>

      {statsResult.failed && <DashboardError message="Statistikat nuk u ngarkuan. Numrat janë të padisponueshëm." retry={statsResult.retry} />}
      {adResult.failed && <DashboardError message="Statistikat e reklamave nuk u ngarkuan." retry={adResult.retry} />}

      {/* Moderation queue callout */}
      {stats && stats.pendingListings > 0 && (
        <Link
          href="/admin/moderimi"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {stats.pendingListings} shpallje në pritje moderimi
            </p>
            <p className="text-xs text-amber-800">Kliko për të parë radhën e moderimit</p>
          </div>
          <span className="bg-amber-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {stats.pendingListings}
          </span>
        </Link>
      )}

      {/* Stat cards */}
      <div role="group" aria-label="Statistikat kryesore" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ label, value, resource, color, bg, href, icon }) => (
          <Link key={label} href={href} className="block hover:scale-[1.02] transition-transform">
            <div className={`${bg} rounded-xl p-4 border border-gray-200 shadow-sm h-full`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
                <span className={`w-4 h-4 ${color} opacity-70`}>{icon}</span>
              </div>
              <p className={`text-3xl font-bold ${color} leading-none`}>
                {resource.loading
                  ? <span className="inline-block w-8 h-5 bg-white/60 rounded animate-pulse" />
                  : (value ?? <span aria-label="Të dhënat të padisponueshme">—</span>)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ad stats mini row */}
      {adStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Shfaqje Sot', value: adStats.impressionsToday.toLocaleString() },
            { label: 'Klikime Sot',    value: adStats.clicksToday.toLocaleString() },
            { label: 'CTR Sot',        value: `${adStats.overallCtrToday}%` },
            { label: 'Kampanja Aktive',value: adStats.totalActiveCampaigns },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold text-dark mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4">
        {/* Recent listings */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-semibold text-dark text-sm">Shpalljet e Fundit</h2>
            <Link href="/admin/shpalljet" className="text-xs text-primary hover:underline">Shiko të gjitha →</Link>
          </div>
          {listingResult.loading ? (
            <div className="p-3 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : listingResult.failed ? (
            <DashboardError message="Shpalljet nuk u ngarkuan." retry={listingResult.retry} />
          ) : listings.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">Nuk ka shpallje.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {listings.map((l) => (
                <Link key={l.id} href={`/admin/shpalljet/${l.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark line-clamp-2">{l.title}</p>
                    <p className="text-xs text-gray-400">{l.user?.name} · {timeAgo(l.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {statusLabel(l.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-semibold text-dark text-sm">Përdorues të Rinj</h2>
            <Link href="/admin/perdoruesit" className="text-xs text-primary hover:underline">Shiko të gjitha →</Link>
          </div>
          {userResult.loading ? (
            <div className="p-3 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : userResult.failed ? (
            <DashboardError message="Përdoruesit nuk u ngarkuan." retry={userResult.retry} />
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">Nuk ka përdorues.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map((u) => (
                <Link key={u.id} href={`/admin/perdoruesit/${u.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark line-clamp-2">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{timeAgo(u.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" /></svg>;
}
function ListIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}
function ClockIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>;
}
function BuildingIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}
function MegaphoneIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>;
}
function TrendIcon() {
  return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
