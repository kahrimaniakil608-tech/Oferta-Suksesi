"use client";
import { useEffect, useRef, useState } from "react";
import { statusLabel } from "@/lib/labels";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { adminFetch } from "@/lib/admin-api";
type Row = {
  id: string;
  listingId?: string;
  reason?: string;
  details?: string;
  status?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  topic?: string;
  attempts?: number;
  lastError?: string;
  resolution?: string;
  assignedTo?: string; assigneeName?: string; createdAt?: string; availableAt?: string;
};
export default function OperationsPage() {
  const { user } = useAuth();
  const actionLock = useRef(false);
  const [topic, setTopic] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("reports");
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: Row[]; total: number }>({
    data: [],
    total: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    adminFetch<typeof result>(
      `/admin/operations/${tab}?page=${page}&status=${tab === "deliveries" ? "" : status}&topic=${encodeURIComponent(topic)}`,
      undefined,
      { signal: controller.signal },
    )
      .then(data => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.data) || !Number.isFinite(data.total)) throw new Error('Radha nuk u ngarkua plotësisht. Provo përsëri.');
        setResult(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab, status, page, revision, topic]);
  async function act(row: Row, action: string) {
    if (actionLock.current) return;
    if (['RESOLVED','DISMISSED'].includes(action) && tab === 'reports' && !notes[row.id]?.trim()) { setError('Shkruani arsyen e vendimit para mbylljes.'); return; }
    if (tab === 'deliveries' && !confirm('Të riprovohet dërgesa? Kjo mund të dërgojë një njoftim pasi ofruesi të jetë funksional.')) return;
    actionLock.current = true; setNotice('');
    setBusy(row.id);
    setError("");
    try {
      const response = await adminFetch<{retried?: boolean}>(
        `/admin/operations/${tab}/${row.id}${tab === "deliveries" ? "/retry" : ""}`,
        undefined,
        {
          method: tab === "deliveries" ? "POST" : "PATCH",
          body:
            tab === "reports"
              ? JSON.stringify({ status: action, resolution: notes[row.id] })
              : undefined,
        },
      );
      if (tab === 'deliveries' && response.retried === false) throw new Error('Dërgesa është në përpunim ose është përfunduar. Rifreskoni listën.');
      setNotice(tab === 'deliveries' ? 'Dërgesa u kthye në radhë; kjo nuk konfirmon dorëzimin.' : 'Rasti u përditësua.');
      setRevision((n) => n + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Veprimi dështoi");
    } finally {
      setBusy(null); actionLock.current = false;
    }
  }
  const tabs = [
    { key: "reports", label: "Raportimet" },
    ...(user?.role === "ADMIN"
      ? [
          { key: "support", label: "Mesazhet e kontaktit" },
          { key: "deliveries", label: "Dërgesat e dështuara" },
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Radha e punës</h1>
      <div className="flex flex-wrap gap-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            disabled={busy !== null}
            onClick={() => {
              setTab(item.key); setStatus("OPEN"); setTopic(''); setNotice('');
              setPage(1);
            }}
            aria-pressed={tab === item.key}
            className="rounded border px-3 py-2 aria-pressed:bg-primary aria-pressed:text-white"
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab !== "deliveries" && (
        <label>
          Statusi{" "}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded"
          >
            {(tab === "support" ? ["OPEN", "RESOLVED"] : ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
        </label>
      )}
      {tab === 'deliveries' && <label>Lloji i dërgesës <select className="border rounded p-2" value={topic} onChange={e => {setTopic(e.target.value); setPage(1);}}><option value="">Të gjitha</option>{Object.entries(TOPICS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      {notice && <p role="status" className="text-primary">{notice}</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}{" "}
          <button
            onClick={() => setRevision((n) => n + 1)}
            className="underline"
          >
            Provo përsëri
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Duke ngarkuar…</p>
      ) : error ? null : result.data.length === 0 ? (
        <p>Nuk ka raste në këtë listë.</p>
      ) : (
        result.data.map((row) => (
          <article
            key={row.id}
            className="bg-white border rounded-xl p-4 space-y-3"
          >
            <h2 className="font-bold">
              {row.subject ?? ({SPAM: "Spam", INACCURATE: "Informacion i pasaktë", INAPPROPRIATE: "Përmbajtje e papërshtatshme", FRAUD: "Dyshim për mashtrim", DUPLICATE: "Shpallje e përsëritur", OTHER: "Arsye tjetër"} as Record<string,string>)[row.reason ?? ""] ?? row.reason ?? TOPICS[row.topic ?? ""] ?? "Dërgesë e sistemit"}
            </h2>
            <p className="whitespace-pre-wrap break-words">
              {row.details ?? row.message ?? row.lastError}
            </p>
            {row.createdAt && <p className="text-sm text-gray-600">Hapur {timeAgo(row.createdAt)}</p>}
            {tab === 'deliveries' && <div className="text-sm space-y-1"><p>Përpjekje: {row.attempts ?? 0}</p>{row.availableAt && <p>Riprovimi i planifikuar: {new Date(row.availableAt).toLocaleString('sq-AL')}</p>}<p>{/535|EAUTH|Authentication/i.test(row.lastError ?? '') ? 'Ofruesi i emailit nuk pranoi kredencialet. Korrigjoni cilësimet SMTP para riprovimit.' : 'Kontrolloni gabimin e ofruesit para riprovimit. Kjo dërgesë ende nuk është konfirmuar.'}</p></div>}
            {row.email && (
              <p>
                {row.name} ·{" "}
                <a className="underline" href={`mailto:${row.email}`}>
                  {row.email}
                </a>
              </p>
            )}
            {row.listingId && (
              <Link
                className="underline"
                href={`/admin/shpalljet/${row.listingId}`}
              >
                Hap shpalljen
              </Link>
            )}
            {row.status && <p>Statusi: {statusLabel(row.status)}</p>}
            <p>Përgjegjësi: {row.assigneeName ?? (row.assignedTo === user?.id ? "Ju" : "Pa caktuar")}</p>
            {row.resolution && <p>Vendimi: {row.resolution}</p>}
            {tab === "reports" && (
              <div className="space-y-2">
                <label className="block">
                  Arsyeja e vendimit
                  <textarea
                    className="block border rounded p-2 w-full"
                    value={notes[row.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [row.id]: e.target.value }))
                    }
                  />
                </label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    ["IN_REVIEW", "Merr në shqyrtim"],
                    ["RESOLVED", "Zgjidh"],
                    ["DISMISSED", "Mbyll pa veprim"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      disabled={busy !== null}
                      className="border rounded px-3 py-2 disabled:opacity-50"
                      onClick={() => act(row, value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "support" && row.status !== "RESOLVED" && (
              <button
                disabled={busy !== null}
                onClick={() => act(row, "RESOLVED")}
                className="underline"
              >
                Shëno si të zgjidhur
              </button>
            )}
            {tab === "deliveries" && (
              <button
                disabled={busy !== null}
                onClick={() => act(row, "retry")}
                className="underline"
              >
                Riprovo dërgesën ({row.attempts} përpjekje)
              </button>
            )}
          </article>
        ))
      )}
      <nav aria-label="Faqet" className="flex gap-4">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Mbrapa
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(result.total / 20))}
        </span>
        <button
          disabled={page * 20 >= result.total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Tjetër
        </button>
      </nav>
    </div>
  );
}

const TOPICS: Record<string,string> = {'search.listing':'Përditësim i kërkimit','listing.approved':'Njoftim miratimi','listing.rejected':'Njoftim refuzimi','listing.expired':'Njoftim skadimi','listing.expiring_soon':'Paralajmërim skadimi','user.registered':'Njoftim regjistrimi'};
