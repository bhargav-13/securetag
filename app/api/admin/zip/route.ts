import JSZip from "jszip";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { renderLegacyLabelPng, renderTagCardPng } from "@/lib/tagCard";
import { legacyQrUrl } from "@/lib/legacy";

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
  // kind=legacy → codes from legacy_tags: QR points at /found/<code>, and
  // "card" is the plain QR + code label (the vehicle card design doesn't apply).
  const legacy = String(form.get("kind") || "") === "legacy";
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

  const csv = ["code,url"];

  for (const id of ids) {
    const targetUrl = legacy ? legacyQrUrl(base, id) : `${base}/tag/${id}`;
    csv.push(`${id},${targetUrl}`);
    if (style === "card") {
      const png = legacy
        ? await renderLegacyLabelPng({ id, targetUrl })
        : await renderTagCardPng({ id, targetUrl });
      zip.file(`securetag-${legacy ? "label" : "card"}-${id}.png`, png);
    } else {
      const png = await QRCode.toBuffer(targetUrl, {
        margin: 1,
        width: 512,
        type: "png",
        color: { dark: "#191b2e", light: "#ffffff" },
      });
      zip.file(`securetag-${id}.png`, png);
    }
  }

  // Legacy codes are case-sensitive: ship the exact list alongside the images.
  if (legacy) zip.file("codes.csv", csv.join("\n") + "\n");

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = legacy
    ? style === "card" ? "securetag-legacy-labels.zip" : "securetag-legacy-qr-codes.zip"
    : style === "card" ? "securetag-cards.zip" : "securetag-qr-codes.zip";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
