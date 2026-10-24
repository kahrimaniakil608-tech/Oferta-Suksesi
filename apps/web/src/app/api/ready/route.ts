import { serverApiFetch } from "@/lib/server-fetch";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await serverApiFetch(
      `${process.env.API_URL ?? "http://localhost:3001/api/v1"}/ready`,
      { cache: "no-store", signal: AbortSignal.timeout(2500) },
    );
    return Response.json(
      { status: response.ok ? "ready" : "unavailable" },
      { status: response.ok ? 200 : 503 },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
