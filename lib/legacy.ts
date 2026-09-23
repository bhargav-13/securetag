/* Shared helpers for the legacy (pre-2024, generic item) tag system that lives
   in `public.legacy_tags` and is served by the separate legacy app at
   `/found/<code>`. */

/** Where the legacy /found app is deployed. Override with
 *  NEXT_PUBLIC_LEGACY_ORIGIN (e.g. its *.vercel.app URL) until
 *  app.securetag.in has DNS. */
export const LEGACY_ORIGIN = (process.env.NEXT_PUBLIC_LEGACY_ORIGIN || "https://app.securetag.in").replace(/\/+$/, "");

/** URL printed into a legacy QR. Always on the main domain: securetag.in/found
 *  redirects to LEGACY_ORIGIN, so printed codes never depend on where the
 *  legacy app is hosted. */
export function legacyQrUrl(base: string, code: string) {
  return `${base.replace(/\/+$/, "")}/found/${code}`;
}

/** Old codes are 6 chars, case-sensitive. New ones skip look-alikes (0/O, 1/l/I). */
export const LEGACY_CODE_RE = /^[a-zA-Z0-9]{6}$/;
export const LEGACY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Timestamp shared by every row of the original 2026-08-16 import; any other
 *  `imported_at` value is a batch generated from the admin panel. */
export const ORIGINAL_IMPORT_DAY = "2026-08-16";

/** The old app's "intended use" list (key stored in item_type → label). */
export const ITEM_TYPES: Record<string, string> = {
  TRAVELLUGGAGE: "Travel Luggage",
  SUITCASE: "Suitcase",
  BACKPACK: "Backpack",
  HANDBAG: "Handbag",
  WALLET: "Wallet",
  LAPTOP: "Laptop",
  KEYCHAIN: "Keychain",
  CARKEYS: "Car Keys",
  MOTORCYCLEHELMET: "Motorcycle Helmet",
  SCHOOLBAG: "School Bag",
  GYMBAG: "Gym Bag",
  BRIEFCASE: "Briefcase",
  CAMERA: "Camera",
  HEADPHONES: "Headphones",
  ELECTRONICDEVICE: "Electronic Device",
  PETCOLLAR: "Pet Collar",
  BICYCLE: "Bicycle",
  TRAVELDOCUMENTHOLDER: "Travel Document Holder",
  ARTSUPPLIESCASE: "Art Supplies Case",
  BABYCARRIER: "Baby Carrier",
  BABYSTROLLER: "Baby Stroller",
  CAMPINGEQUIPMENT: "Camping Equipment",
  CRUTCHES: "Crutches",
  DRONECASE: "Drone Case",
  FASHIONACCESSORY: "Fashion Accessory",
  FIREEXTINGUISHER: "Fire Extinguisher",
  FISHINGGEAR: "Fishing Gear",
  GARDENINGTOOLS: "Gardening Tools",
  HIKINGBACKPACK: "Hiking Backpack",
  JACKETCOAT: "Jacket/Coat",
  LUNCHBOX: "Lunch Box",
  MEDICALBAG: "Medical Bag",
  MUSICALINSTRUMENTCASE: "Musical Instrument Case",
  PICNICBASKET: "Picnic Basket",
  PORTABLECHARGER: "Portable Charger",
  PORTABLESPEAKER: "Portable Speaker",
  PROJECTORCASE: "Projector Case",
  REMOTECONTROL: "Remote Control",
  ROLLERBLADES: "Rollerblades",
  SAFETYHELMET: "Safety Helmet",
  SKATEBOARD: "Skateboard",
  SKISNOWBOARDEQUIPMENT: "Ski/Snowboard Equipment",
  SPORTSEQUIPMENT: "Sports Equipment",
  SUNGLASSCASE: "Sunglass Case",
  TENNISBAG: "Tennis Bag",
  TOOLBELT: "Tool Belt",
  TOOLBOX: "Toolbox",
  UMBRELLA: "Umbrella",
  WATERBOTTLE: "Water Bottle",
  WHEELCHAIR: "Wheelchair",
  OTHER: "Other",
};

export const itemTypeLabel = (key: string | null | undefined) =>
  (key && ITEM_TYPES[key]) || key || "";
