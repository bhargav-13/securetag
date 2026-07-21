import JSZip from "jszip";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { renderTagCardPng } from "@/lib/tagCard";

// Per-request caps. The client (AdminTagManager) chunks large selections into
// batches under these limits and merges the results into one final ZIP, so
// these exist purely as a defensive ceiling per HTTP request — a request
// over the limit is rejected (never silently truncated) so a caller always
// knows if something's wrong instead of quietly losing tags.
const QR_LIMIT = 250;
const CARD_LIMIT = 30; // card rendering is CPU-heavy (satori + resvg per tag)

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
    .filter(Boolean);

  if (ids.length === 0) {
    return new Response("No tags selected", { status: 400 });
  }
  if (ids.length > limit) {
    return new Response(
      `Too many tags for one request (${ids.length} > ${limit}). The dashboard should batch this automatically — try again from there.`,
      { status: 400 }
    );
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
