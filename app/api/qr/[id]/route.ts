import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { legacyQrUrl } from "@/lib/legacy";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!/^[A-Za-z0-9]{4,16}$/.test(params.id)) return new Response("Invalid tag id.", { status: 400 });
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const legacy = !!req.nextUrl.searchParams.get("legacy");
  const target = legacy ? legacyQrUrl(base, params.id) : `${base}/tag/${params.id}`;

  const png = await QRCode.toBuffer(target, {
    margin: 1,
    width: 512,
    type: "png",
    color: { dark: "#191b2e", light: "#ffffff" },
  });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
  };
  if (req.nextUrl.searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="securetag-${params.id}.png"`;
  }

  return new Response(new Uint8Array(png), { headers });
}
