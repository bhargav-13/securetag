import type { NextRequest } from "next/server";
import { renderLegacyLabelPng, renderTagCardPng } from "@/lib/tagCard";
import { legacyQrUrl } from "@/lib/legacy";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rendering a print-resolution card is expensive; only admins print them.
  if (!(await requireAdmin())) return new Response("Not authorized.", { status: 403 });
  if (!/^[A-Za-z0-9]{4,16}$/.test(params.id)) return new Response("Invalid tag id.", { status: 400 });
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  // ?legacy=1 → plain QR + code label for a legacy /found code.
  const legacy = !!req.nextUrl.searchParams.get("legacy");
  const png = legacy
    ? await renderLegacyLabelPng({ id: params.id, targetUrl: legacyQrUrl(base, params.id) })
    : await renderTagCardPng({ id: params.id, targetUrl: `${base}/tag/${params.id}` });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, max-age=3600",
  };
  if (req.nextUrl.searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="securetag-card-${params.id}.png"`;
  }

  return new Response(new Uint8Array(png), { headers });
}
