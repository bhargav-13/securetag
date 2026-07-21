import fs from "fs";
import path from "path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";

const ASSETS_DIR = path.join(process.cwd(), "app", "assets");
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

let fontCache: { name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800; style: "normal" }[] | null = null;
function loadFonts() {
  if (fontCache) return fontCache;
  fontCache = [400, 500, 600, 700, 800].map((w) => ({
    name: "Inter",
    data: fs.readFileSync(path.join(FONT_DIR, `Inter-${w}.woff`)),
    weight: w as 400 | 500 | 600 | 700 | 800,
    style: "normal" as const,
  }));
  return fontCache;
}

let bgDataUriCache: string | null = null;
function loadBackgroundDataUri() {
  if (bgDataUriCache) return bgDataUriCache;
  const buf = fs.readFileSync(path.join(ASSETS_DIR, "design.png"));
  bgDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  return bgDataUriCache;
}

export type TagCardInput = {
  /** The short public tag code, e.g. "6SCQTNNK". */
  id: string;
  /** Full absolute URL the QR should point to. */
  targetUrl: string;
};

// ---- Native pixel geometry of app/assets/design.png (measured directly) ----
const CARD_W = 1577;
const CARD_H = 997;
const BRACKET_BLUE = "#1E3FD6";
const ID_NAVY = "#132868";

// Blank canvas on the right panel where the QR goes.
const QR_CENTER = { x: 1150, y: 345 };
const QR_BOX = 440; // white rounded box
const QR_IMG = 380; // QR bitmap inside the box

// "Unique ID" label already in the template; value goes just below it.
const ID_CENTER = { x: 1150, y: 771 };

async function buildTree(input: TagCardInput) {
  const qrDataUrl = await QRCode.toDataURL(input.targetUrl, {
    margin: 0,
    width: 640,
    color: { dark: "#191b2e", light: "#ffffff" },
  });
  const idLabel = `ST-${input.id}`;
  const bg = loadBackgroundDataUri();

  const bracketArm = 30;
  const bracketThick = 5;
  const boxHalf = QR_BOX / 2;

  return (
    <div style={{ position: "relative", width: CARD_W, height: CARD_H, display: "flex", fontFamily: "Inter" }}>
      {/* the exact Canva-designed background, completely untouched */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bg} width={CARD_W} height={CARD_H} style={{ position: "absolute", top: 0, left: 0 }} />

      {/* QR: rounded white box + viewfinder corner brackets + code, centered on the blank canvas */}
      <div
        style={{
          position: "absolute",
          left: QR_CENTER.x - boxHalf,
          top: QR_CENTER.y - boxHalf,
          width: QR_BOX,
          height: QR_BOX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          borderRadius: 22,
          border: "1px solid #E7E9F4",
          boxShadow: "0 10px 30px rgba(13,53,179,0.12)",
        }}
      >
        <div style={{ position: "absolute", top: -8, left: -8, width: bracketArm, height: bracketArm, borderTop: `${bracketThick}px solid ${BRACKET_BLUE}`, borderLeft: `${bracketThick}px solid ${BRACKET_BLUE}`, borderTopLeftRadius: 8, display: "flex" }} />
        <div style={{ position: "absolute", top: -8, right: -8, width: bracketArm, height: bracketArm, borderTop: `${bracketThick}px solid ${BRACKET_BLUE}`, borderRight: `${bracketThick}px solid ${BRACKET_BLUE}`, borderTopRightRadius: 8, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -8, left: -8, width: bracketArm, height: bracketArm, borderBottom: `${bracketThick}px solid ${BRACKET_BLUE}`, borderLeft: `${bracketThick}px solid ${BRACKET_BLUE}`, borderBottomLeftRadius: 8, display: "flex" }} />
        <div style={{ position: "absolute", bottom: -8, right: -8, width: bracketArm, height: bracketArm, borderBottom: `${bracketThick}px solid ${BRACKET_BLUE}`, borderRight: `${bracketThick}px solid ${BRACKET_BLUE}`, borderBottomRightRadius: 8, display: "flex" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} width={QR_IMG} height={QR_IMG} />
      </div>

      {/* unique ID value, under the template's "Unique ID" label */}
      <div
        style={{
          position: "absolute",
          left: ID_CENTER.x - 300,
          top: ID_CENTER.y - 22,
          width: 600,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 34, fontWeight: 800, color: ID_NAVY, letterSpacing: 0.5 }}>{idLabel}</span>
      </div>
    </div>
  );
}

/** Renders a printable SecureTag card by compositing the live QR + Unique ID
 * onto the exact Canva-designed background at app/assets/design.png. */
export async function renderTagCardPng(input: TagCardInput): Promise<Buffer> {
  const tree = await buildTree(input);
  const svg = await satori(tree, {
    width: CARD_W,
    height: CARD_H,
    fonts: loadFonts(),
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: CARD_W * 2 } });
  const png = resvg.render();
  return png.asPng();
}
