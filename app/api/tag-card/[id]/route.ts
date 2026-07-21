import type { NextRequest } from "next/server";
import { renderTagCardPng } from "@/lib/tagCard";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const png = await renderTagCardPng({
    id: params.id,
    targetUrl: `${base}/tag/${params.id}`,
  });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
  };
  if (req.nextUrl.searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="securetag-card-${params.id}.png"`;
  }

  return new Response(new Uint8Array(png), { headers });
}
