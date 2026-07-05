import JSZip from "jszip";
import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const ids = form
    .getAll("ids")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 500);

  if (ids.length === 0) {
    return new Response("No tags selected", { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const zip = new JSZip();

  for (const id of ids) {
    const png = await QRCode.toBuffer(`${base}/tag/${id}`, {
      margin: 1,
      width: 512,
      type: "png",
      color: { dark: "#191b2e", light: "#ffffff" },
    });
    zip.file(`securetag-${id}.png`, png);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="securetag-qr-codes.zip"`,
    },
  });
}
