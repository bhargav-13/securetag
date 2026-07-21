import JSZip from "jszip";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { renderTagCardPng } from "@/lib/tagCard";

const QR_LIMIT = 500;
// Card rendering is CPU-heavy (satori + resvg per tag), so it's capped lower
// to keep the request well within serverless execution limits.
const CARD_LIMIT = 80;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const style = String(form.get("style") || "qr") === "card" ? "card" : "qr";
  const limit = style === "card" ? CARD_LIMIT : QR_LIMIT;

  const ids = form
    .getAll("ids")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, limit);

  if (ids.length === 0) {
    return new Response("No tags selected", { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const zip = new JSZip();

  for (const id of ids) {
    if (style === "card") {
      const png = await renderTagCardPng({ id, targetUrl: `${base}/tag/${id}` });
      zip.file(`securetag-card-${id}.png`, png);
    } else {
      const png = await QRCode.toBuffer(`${base}/tag/${id}`, {
        margin: 1,
        width: 512,
        type: "png",
        color: { dark: "#191b2e", light: "#ffffff" },
      });
      zip.file(`securetag-${id}.png`, png);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = style === "card" ? "securetag-cards.zip" : "securetag-qr-codes.zip";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
