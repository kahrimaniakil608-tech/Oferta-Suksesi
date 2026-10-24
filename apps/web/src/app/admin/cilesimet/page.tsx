'use client';
import { useAction } from '@/hooks/useAction';
import ActionRegion from '@/components/ui/ActionRegion';
import LoadFeedback from '@/components/ui/Feedback';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Toast from '@/components/ui/Feedback';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/admin-api';

// ── Section / field definitions ──────────────────────────────────────────────

type FieldType = 'text' | 'email' | 'tel' | 'url' | 'number' | 'toggle' | 'textarea';

interface SettingField {
  key:         string;
  label:       string;
  type:        FieldType;
  placeholder?: string;
  hint?:        string;
  min?:         number;
  max?:         number;
}

interface SettingSection {
  id:     string;
  title:  string;
  icon:   string;
  fields: SettingField[];
}

const ALL_SECTIONS: SettingSection[] = [
  {
    id: 'general', title: 'Të Përgjithshme', icon: '⚙️',
    fields: [
      { key: 'site_name',     label: 'Emri i Faqes',       type: 'text',  placeholder: 'OfertaSuksesi' },
      { key: 'site_tagline',  label: 'Tagline',             type: 'text',  placeholder: 'Platforma #1 e shpalljeve…' },
      { key: 'contact_email', label: 'Email Kontakti',      type: 'email', placeholder: 'info@ofertasuksesi.com' },
      { key: 'support_phone', label: 'Telefon Mbështetja',  type: 'tel',   placeholder: '+383 45 50 68 50' },
      { key: 'site_logo_url', label: 'URL e Logos',         type: 'url',   placeholder: 'https://…/logo.png' },
    ],
  },
  {
    id: 'listings', title: 'Shpalljet', icon: '📋',
    fields: [
      { key: 'max_listings_per_user',    label: 'Maks. Shpallje / Përdorues',  type: 'number',  min: 1, max: 1000, hint: 'Numri maksimal i shpalljeve aktive që mund të ketë një përdorues' },
      { key: 'max_images_per_listing',   label: 'Maks. Imazhe / Shpallje',     type: 'number',  min: 1, max: 8    },
      { key: 'listing_expiry_days',      label: 'Ditë deri në Skadim',         type: 'number',  min: 1, max: 365, hint: 'Pas kaq ditësh, shpallja shkon automatikisht në EXPIRED' },
      { key: 'require_image_to_publish', label: 'Kërko Imazh për Publikim',    type: 'toggle',  hint: 'Nëse aktivizuar, shpalljet pa imazh nuk mund të publikohen' },
      { key: 'auto_approve_listings',    label: 'Aprovo Automatikisht',         type: 'toggle',  hint: 'Lejon publikimin automatik për llogaritë e lejuara, kur kontrolli i spam-it kalon' },
    ],
  },
  {
    id: 'moderation', title: 'Moderimi', icon: '🛡️',
    fields: [
      { key: 'spam_threshold_auto_reject',  label: 'Pragu i Spam-it (auto-refuzo)',    type: 'number', min: 0, max: 100, hint: 'Shpalljet me spam score mbi këtë vlerë refuzohen automatikisht (0 = çaktivizuar)' },
      { key: 'trust_score_first_listing',   label: 'Pikët e besueshmërisë: Shpallja e Parë',     type: 'number', min: 0, max: 100, hint: 'Pikë të shtuara kur përdoruesi publikon shpalljen e parë' },
      { key: 'trust_score_subsequent',      label: 'Pikët e besueshmërisë: Shpallje Tjera',       type: 'number', min: 0, max: 50,  hint: 'Pikë të shtuara për çdo shpallje pasuese të aprovuar' },
      { key: 'trust_score_reject_penalty',  label: 'Pikët e besueshmërisë: Penalitet Refuzimi',   type: 'number', min: 0, max: 50,  hint: 'Pikë të zbritura kur një shpallje refuzohet' },
    ],
  },
  {
    id: 'registration', title: 'Regjistrimi', icon: '👤',
    fields: [
      { key: 'allow_registration',          label: 'Lejo Regjistrimin e Ri',            type: 'toggle', hint: 'Nëse çaktivizohet, asnjë përdorues i ri nuk mund të regjistrohet' },
      { key: 'email_verification_required', label: 'Kërko Verifikim Email',              type: 'toggle', hint: 'Nëse aktivizuar, përdoruesit duhet të verifikojnë emailin para se të publikojnë' },
    ],
  },
  {
    id: 'maintenance', title: 'Mirëmbajtja', icon: '🔧',
    fields: [
      { key: 'maintenance_mode',    label: 'Mënyra e Mirëmbajtjes', type: 'toggle',   hint: '⚠️ Kur aktivizohet, faqja shfaq mesazhin e mëposhtëm për të gjithë vizitorët' },
      { key: 'maintenance_message', label: 'Mesazhi i Mirëmbajtjes', type: 'textarea', placeholder: 'Faqja është nën mirëmbajtje. Kthehuni së shpejti.' },
    ],
  },
  {
    id: 'social', title: 'Rrjetet Sociale', icon: '🌐',
    fields: [
      { key: 'social_facebook',  label: 'Facebook URL',  type: 'url', placeholder: 'https://www.facebook.com/OfertaSuksesi1996' },
      { key: 'social_instagram', label: 'Instagram URL', type: 'url', placeholder: 'https://www.instagram.com/ofertasuksesi1996/' },
      { key: 'social_x',         label: 'X (Twitter) URL', type: 'url', placeholder: 'https://x.com/ofertasuksesi96' },
      { key: 'social_tiktok',    label: 'TikTok URL',    type: 'url', placeholder: 'https://tiktok.com/@ofertasuksesi' },
      { key: 'social_youtube',   label: 'YouTube URL',   type: 'url', placeholder: 'https://youtube.com/@ofertasuksesi' },
    ],
  },
  {
    id: 'integrations', title: 'Integrimet', icon: '📊',
    fields: [
      { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text', placeholder: 'G-XXXXXXXXXX', hint: 'Measurement ID nga Google Analytics 4 (fillon me G-)' },
      { key: 'facebook_pixel_id',   label: 'Facebook Pixel ID',   type: 'text', placeholder: '123456789012345', hint: 'ID e Facebook Pixel për gjurmimin e konvertimeve' },
    ],
  },
];

const SECTIONS = ALL_SECTIONS.filter(section => !['general','social'].includes(section.id)).map(section => ({ ...section, fields: section.fields.filter(field => !['email_verification_required','facebook_pixel_id'].includes(field.key)) }));



export default function SettingsPage() {
  const { busy: actionBusy, actionError, run: runAction } = useAction();

  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);

  const { token } = useAuth();

  const [values,      setValues]      = useState<Record<string, string>>({});
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null); // section id being saved
  const [savedValues, setSavedValues] = useState<Record<string,string>>({});
  const [activeTab,   setActiveTab]   = useState('listings');
  const [toast,       setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { dirty, markSaved } = useUnsavedChanges(values, !loading && !loadError);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true); setLoadError('');
    adminFetch<Record<string, Record<string, string>>>('/admin/settings', token)
      .then(grouped => {
        if (!grouped || typeof grouped !== 'object' || Array.isArray(grouped) || !grouped.listings || !grouped.moderation || Object.values(grouped).some(group => !group || typeof group !== 'object' || Array.isArray(group) || Object.values(group).some(value => typeof value !== 'string'))) throw new Error('Cilësimet nuk u ngarkuan plotësisht. Provoni përsëri.');
        // Flatten to flat key→value map for easy form binding
        const flat: Record<string, string> = {};
        for (const group of Object.values(grouped)) {
          Object.assign(flat, group);
        }
        setValues(flat); setSavedValues(flat);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Të dhënat nuk u ngarkuan. Provoni përsëri.'))
      .finally(() => setLoading(false));
  }, [token, revision]);

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function saveSection(sectionId: string) {
 return runAction(async () => {

    if (!token) return;
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    const patch: Record<string, string> = {};
    for (const f of section.fields) {
      if (values[f.key] !== undefined) patch[f.key] = values[f.key];
    }

    setSaving(sectionId);
    try {
      await adminFetch('/admin/settings', token, {
        method: 'PUT',
        body: JSON.stringify({ settings: patch }),
      });
      const saved = {...savedValues, ...patch}; setSavedValues(saved); markSaved(saved);
      showToast('Rregullimet u ruajtën ✓');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gabim gjatë ruajtjes', 'error');
    } finally {
      setSaving(null);
    }

 });
}

  const activeSection = SECTIONS.find(s => s.id === activeTab)!;
  const isMaintenanceOn = values['maintenance_mode'] === 'true';

  if (loadError) return <LoadFeedback message={loadError} type="error" retry={() => setRevision(n => n + 1)} />;
  return <ActionRegion busy={actionBusy} error={actionError}>
    <div className="space-y-4">
      {toast && <Toast {...toast} />}
      {dirty && <p role="status" className="text-amber-800 text-sm">Keni cilësime të paruajtura. Ruani çdo seksion që keni ndryshuar.</p>}

      <div>
        <h1 className="text-base font-bold text-dark">Cilësimet</h1>
        <p className="text-gray-400 text-xs mt-0.5">Konfigurimi i platformës OfertaSuksesi</p>
      </div>

      {/* Maintenance mode warning banner */}
      {!loading && isMaintenanceOn && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="text-xl">🔧</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Mënyra e Mirëmbajtjes është Aktive</p>
            <p className="text-xs text-red-700">Vizitorët e faqes po shohin mesazhin e mirëmbajtjes tani.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
        {/* Sidebar tabs */}
        <div className="flex flex-wrap gap-2 md:block md:w-40 shrink-0">
          {SECTIONS.map(s => (
            <button key={s.id} aria-pressed={activeTab === s.id} onClick={() => setActiveTab(s.id)}
              className={`md:w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTab === s.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span>{s.icon}</span>
              {s.title}
              {s.id === 'maintenance' && isMaintenanceOn && (
                <span className="ml-auto w-2 h-2 bg-red-700 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Form panel */}
        <div className="flex-1">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <span className="text-xl">{activeSection.icon}</span>
                <h2 className="font-semibold text-dark text-sm">{activeSection.title}</h2>
              </div>

              <div className="p-5 space-y-4">
                {activeSection.fields.map(field => (
                  <div key={field.key}>
                    {field.type === 'toggle' ? (
                      <div className="flex items-start gap-4 py-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-dark">{field.label}</p>
                          {field.hint && <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>}
                        </div>
                        <button
                          type="button" role="switch" aria-label={field.label} aria-checked={values[field.key] === 'true'}
                          onClick={() => setValue(field.key, values[field.key] === 'true' ? 'false' : 'true')}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                            values[field.key] === 'true' ? 'bg-primary' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            values[field.key] === 'true' ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor={field.key} className="block text-xs font-semibold text-gray-700 mb-1.5">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea id={field.key}
                            value={values[field.key] ?? ''}
                            onChange={e => setValue(field.key, e.currentTarget.value)}
                            rows={3}
                            placeholder={field.placeholder}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary resize-none"
                          />
                        ) : (
                          <input id={field.key}
                            type={field.type}
                            value={values[field.key] ?? ''}
                            onChange={e => setValue(field.key, e.currentTarget.value)}
                            placeholder={field.placeholder}
                            min={field.min}
                            max={field.max}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary"
                          />
                        )}
                        {field.hint && (
                          <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">Ndryshimet aplikohen menjëherë pas ruajtjes</p>
                <button
                  onClick={() => saveSection(activeSection.id)}
                  disabled={saving === activeSection.id}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving === activeSection.id ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Duke ruajtur…
                    </>
                  ) : (
                    'Ruaj Ndryshimet'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </ActionRegion>;
}
