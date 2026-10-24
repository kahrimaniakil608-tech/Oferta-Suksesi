'use client';
import Feedback from '@/components/ui/Feedback';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { refreshSession } from '@/lib/session';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type ExportType = 'listings' | 'users' | 'revenue' | 'weekly-report';

const EXPORT_SECTIONS: {
  id: ExportType;
  title: string;
  description: string;
  icon: string;
  filters: { key: string; label: string; type: 'text' | 'select' | 'date'; options?: { value: string; label: string }[] }[];
}[] = [
  {
    id: 'listings',
    title: 'Shpalljet',
    description: 'Eksporto listën e shpalljeve me filtra sipas statusit dhe datës.',
    icon: '📋',
    filters: [
      {
        key: 'status', label: 'Statusi', type: 'select',
        options: [
          { value: '', label: 'Të gjitha' },
          { value: 'PUBLISHED', label: 'Publikuar' },
          { value: 'PENDING_REVIEW', label: 'Në pritje' },
          { value: 'REJECTED', label: 'Refuzuar' },
          { value: 'EXPIRED', label: 'Skaduar' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'ARCHIVED', label: 'Arkivuar' },
        ],
      },
      { key: 'dateFrom', label: 'Nga data', type: 'date' },
      { key: 'dateTo', label: 'Deri në datë', type: 'date' },
    ],
  },
  {
    id: 'users',
    title: 'Përdoruesit',
    description: 'Eksporto listën e përdoruesve me filtra sipas rolit dhe datës së regjistrimit.',
    icon: '👥',
    filters: [
      {
        key: 'role', label: 'Roli', type: 'select',
        options: [
          { value: '', label: 'Të gjithë' },
          { value: 'ADMIN', label: 'Admin' },
          { value: 'MODERATOR', label: 'Moderator' },
          { value: 'COMPANY', label: 'Kompani' },
          { value: 'USER', label: 'Përdorues' },
        ],
      },
      { key: 'dateFrom', label: 'Nga data', type: 'date' },
      { key: 'dateTo', label: 'Deri në datë', type: 'date' },
    ],
  },
  {
    id: 'revenue',
    title: 'Të Ardhurat',
    description: 'Eksporto raportin e pagesave dhe të ardhurave.',
    icon: '💰',
    filters: [
      { key: 'dateFrom', label: 'Nga data', type: 'date' },
      { key: 'dateTo', label: 'Deri në datë', type: 'date' },
    ],
  },
  {
    id: 'weekly-report',
    title: 'Raporti Javor',
    description: 'Gjenero raportin përmbledhës javor me statistika të platformës.',
    icon: '📊',
    filters: [],
  },
];

export default function ExportsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<Record<string, Record<string, string>>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');

  function setFilter(section: string, key: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  async function download(type: ExportType, format: 'csv' | 'pdf') {
    if (!token || downloading) return;
    const scope = filters[type] ?? {};
    if (scope.dateFrom && scope.dateTo && scope.dateFrom > scope.dateTo) { setError('Data e fillimit duhet të jetë para datës së fundit.'); return; }
    const key = `${type}-${format}`;
    setDownloading(key);
    setError('');

    try {
      const params = new URLSearchParams();
      const sectionFilters = filters[type] ?? {};
      for (const [k, v] of Object.entries(sectionFilters)) {
        if (v) params.set(k, v);
      }

      const endpoint = type === 'weekly-report'
        ? `/admin/exports/weekly-report.pdf`
        : `/admin/exports/${type}.${format}`;

      const qs = params.toString();
      const url = `${API}${endpoint}${qs ? `?${qs}` : ''}`;

      const request = () => fetch(url, { credentials: 'include' });
      let res = await request();
      if (res.status === 401 && await refreshSession()) res = await request();

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Gabim ${res.status}` })) as { message?: string };
        throw new Error(err.message || `Gabim ${res.status}`);
      }

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);

      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] ?? `${type}-${new Date().toISOString().split('T')[0]}.${format}`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gabim gjatë shkarkimit');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-dark">Eksportet</h1>
        <p className="text-gray-400 text-xs mt-0.5">Shkarko raportet e platformës në CSV ose PDF</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 space-y-1">
        <p>Datat përfshijnë të gjithë ditën sipas UTC. CSV përfshin të gjithë rreshtat për periudhën. PDF lejon deri në 10.000 rreshta; për më shumë përdorni CSV.</p>
        <p>Totali i të ardhurave përfshin vetëm pagesat e përfunduara, veçmas për çdo valutë.</p>
        <p>Në CSV, teksti që mund të lexohet si formulë shënohet me [text].</p>
      </div>
      {error && <Feedback message={error} type="error" />}

      <div className="grid gap-4">
        {EXPORT_SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-5">
              <span className="text-2xl">{section.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-dark text-sm">{section.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                <p className="mt-2 text-sm text-gray-600" aria-live="polite">Përfshihet: {section.filters.map(f => `${f.label}: ${f.options?.find(o => o.value === filters[section.id]?.[f.key])?.label ?? (filters[section.id]?.[f.key] || 'pa kufizim')}`).join(' · ') || 'përmbledhja javore'}</p>

                {section.filters.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {section.filters.map(f => (
                      <div key={f.key} className="min-w-[140px]">
                        <label htmlFor={`${section.id}-${f.key}`} className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                        {f.type === 'select' ? (
                          <select
                            id={`${section.id}-${f.key}`}
                            value={filters[section.id]?.[f.key] ?? ''}
                            onChange={e => setFilter(section.id, f.key, e.currentTarget.value)}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-dark focus:outline-none focus:border-primary"
                          >
                            {f.options?.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`${section.id}-${f.key}`}
                            type={f.type}
                            value={filters[section.id]?.[f.key] ?? ''}
                            onChange={e => setFilter(section.id, f.key, e.currentTarget.value)}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-dark focus:outline-none focus:border-primary"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
              {section.id === 'weekly-report' ? (
                <button
                  onClick={() => download('weekly-report', 'pdf')}
                  disabled={downloading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {downloading === 'weekly-report-pdf' ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <DownloadSvg />
                  )}
                  Shkarko PDF
                </button>
              ) : (
                <>
                  <button
                    onClick={() => download(section.id, 'csv')}
                    disabled={downloading !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-dark text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {downloading === `${section.id}-csv` ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CsvSvg />
                    )}
                    Shkarko CSV
                  </button>
                  <button
                    onClick={() => download(section.id, 'pdf')}
                    disabled={downloading !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {downloading === `${section.id}-pdf` ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <DownloadSvg />
                    )}
                    Shkarko PDF
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DownloadSvg() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CsvSvg() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
