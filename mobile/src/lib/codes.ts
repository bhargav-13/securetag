/* Turning whatever a QR code (or a person typing) gives us into a tag code. */

export type ParsedCode = { code: string; kind?: 'vehicle' | 'legacy' };

const CODE_RE = /^[A-Za-z0-9]{4,16}$/;

/**
 * SecureTag QR codes hold a link:
 *   https://securetag.in/tag/<8-char id>      vehicle tag
 *   https://securetag.in/found/<6-char code>  luggage / wallet / other item
 * A bare code is accepted too. Anything else is not one of ours.
 */
export function parseScanned(raw: string): ParsedCode | null {
  const text = (raw || '').trim();
  if (!text) return null;

  const m = text.match(/^(?:https?:\/\/)?[^/\s]+\/(tag|found|legacy\/activate)\/([A-Za-z0-9]{4,16})(?:[/?#]|$)/i);
  if (m) {
    // Only trust links on a SecureTag host (or a local dev server).
    const host = text.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().split(':')[0];
    const ours = host === 'securetag.in' || host.endsWith('.securetag.in') || host === 'localhost' || /^[\d.]+$/.test(host) || host.endsWith('.vercel.app');
    if (!ours) return null;
    return { code: m[2], kind: m[1].toLowerCase() === 'tag' ? 'vehicle' : 'legacy' };
  }

  if (CODE_RE.test(text)) return { code: text };
  return null;
}

/** The six reasons a scanner can pick (same as the website). */
export const REASONS: { key: string; label: string; path: string; urgent?: boolean }[] = [
  { key: 'Parking issue', label: 'Parking issue', path: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M9 17V7h4a3 3 0 0 1 0 6H9' },
  { key: 'Vehicle blocked', label: 'Blocked in', path: 'M12 3 6 20h12L12 3z M9 12h6 M7.5 16h9' },
  { key: 'Emergency', label: 'Emergency', path: 'M8 2.7h8L21.3 8v8L16 21.3H8L2.7 16V8L8 2.7z M12 8v4 M12 16h.01', urgent: true },
  { key: 'Accident', label: 'Accident', path: 'M4 14l1.6-5A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.5L20 14 M4 14h16v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H7.5v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3z M7.5 15h.01 M16.5 15h.01 M2 6l2 1.4 M2 9.5l2.2 .1', urgent: true },
  { key: 'Lights / window', label: 'Lights / window', path: 'M15 5a7 7 0 0 1 0 14 M15 5H7a5 5 0 0 0 0 14h8 M18.5 8.5l3-1 M18.5 12h3 M18.5 15.5l3 1' },
  { key: 'Lost & found', label: 'Lost & found', path: 'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z M9.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0' },
];

/** The old app's "intended use" list (key stored in item_type → label). */
export const ITEM_TYPES: Record<string, string> = {
  TRAVELLUGGAGE: 'Travel Luggage',
  SUITCASE: 'Suitcase',
  BACKPACK: 'Backpack',
  HANDBAG: 'Handbag',
  WALLET: 'Wallet',
  LAPTOP: 'Laptop',
  KEYCHAIN: 'Keychain',
  CARKEYS: 'Car Keys',
  MOTORCYCLEHELMET: 'Motorcycle Helmet',
  SCHOOLBAG: 'School Bag',
  GYMBAG: 'Gym Bag',
  BRIEFCASE: 'Briefcase',
  CAMERA: 'Camera',
  HEADPHONES: 'Headphones',
  ELECTRONICDEVICE: 'Electronic Device',
  PETCOLLAR: 'Pet Collar',
  BICYCLE: 'Bicycle',
  TRAVELDOCUMENTHOLDER: 'Travel Document Holder',
  ARTSUPPLIESCASE: 'Art Supplies Case',
  BABYCARRIER: 'Baby Carrier',
  BABYSTROLLER: 'Baby Stroller',
  CAMPINGEQUIPMENT: 'Camping Equipment',
  CRUTCHES: 'Crutches',
  DRONECASE: 'Drone Case',
  FASHIONACCESSORY: 'Fashion Accessory',
  FIREEXTINGUISHER: 'Fire Extinguisher',
  FISHINGGEAR: 'Fishing Gear',
  GARDENINGTOOLS: 'Gardening Tools',
  HIKINGBACKPACK: 'Hiking Backpack',
  JACKETCOAT: 'Jacket/Coat',
  LUNCHBOX: 'Lunch Box',
  MEDICALBAG: 'Medical Bag',
  MUSICALINSTRUMENTCASE: 'Musical Instrument Case',
  PICNICBASKET: 'Picnic Basket',
  PORTABLECHARGER: 'Portable Charger',
  PORTABLESPEAKER: 'Portable Speaker',
  PROJECTORCASE: 'Projector Case',
  REMOTECONTROL: 'Remote Control',
  ROLLERBLADES: 'Rollerblades',
  SAFETYHELMET: 'Safety Helmet',
  SKATEBOARD: 'Skateboard',
  SKISNOWBOARDEQUIPMENT: 'Ski/Snowboard Equipment',
  SPORTSEQUIPMENT: 'Sports Equipment',
  SUNGLASSCASE: 'Sunglass Case',
  TENNISBAG: 'Tennis Bag',
  TOOLBELT: 'Tool Belt',
  TOOLBOX: 'Toolbox',
  UMBRELLA: 'Umbrella',
  WATERBOTTLE: 'Water Bottle',
  WHEELCHAIR: 'Wheelchair',
  OTHER: 'Other',
};

const COMMON = ['TRAVELLUGGAGE', 'SUITCASE', 'BACKPACK', 'HANDBAG', 'WALLET', 'LAPTOP', 'KEYCHAIN', 'CARKEYS', 'MOTORCYCLEHELMET', 'SCHOOLBAG', 'PETCOLLAR'];

/** Common picks first, then the rest alphabetically, "Other" last. */
export const ITEM_TYPE_OPTIONS: [string, string][] = [
  ...COMMON.map((k) => [k, ITEM_TYPES[k]] as [string, string]),
  ...Object.entries(ITEM_TYPES)
    .filter(([k]) => !COMMON.includes(k) && k !== 'OTHER')
    .sort((a, b) => a[1].localeCompare(b[1])),
  ['OTHER', ITEM_TYPES.OTHER],
];

export const itemTypeLabel = (key: string | null | undefined) => (key && ITEM_TYPES[key]) || key || '';

/** "3 min ago", "Yesterday, 4:12 pm", "12 Nov, 9:05 am". */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 6) return `${hrs} hr ago`;
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const dayDiff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}
