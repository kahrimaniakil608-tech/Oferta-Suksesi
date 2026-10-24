import { redirect } from 'next/navigation';

/** Preserve saved links to the former list while using one maintained workflow. */
export default async function LegacyListingPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const parameters = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(`/admin/shpalljet${query.size ? `?${query}` : ''}`);
}
