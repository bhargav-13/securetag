export type Tag = {
  id: string;
  claimed: boolean;
  owner_user_id: string | null;
  owner_name: string | null;
  phone: string | null;
  car_model: string | null;
  plate_number: string | null;
  message: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  alt_phone: string | null;
  alt_email: string | null;
  address: string | null;
  lost_mode: boolean;
  created_at: string;
  claimed_at: string | null;
};

export type LegacyItem = {
  id: string;
  item_name: string | null;
  item_type: string | null;
  owner_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  message: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pref_contact: string | null;
  lost_mode: boolean;
  claimed: boolean;
  email: string | null;
};

export type ScanRequest = {
  id: string;
  tag_id: string;
  reason: string | null;
  scanner_message: string | null;
  scanner_lat: number | null;
  scanner_lng: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'auto' | string;
  created_at: string;
  responded_at: string | null;
};

export type Account = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isAdmin: boolean;
};

/** Kinds of notification (see lib/notifications.ts and the website's lib/push.ts). */
export type NotifyKind = 'request' | 'emergency' | 'lost' | 'location' | 'reply' | 'reminder';

/** The kinds a person can switch off. Emergencies always get through. */
export type NotifyPrefs = Record<'request' | 'lost' | 'location' | 'reply' | 'reminder', boolean>;

/** A finder scanned one of the owner's items (luggage, wallet…). */
export type ItemScan = {
  id: string;
  code: string;
  lat: number | null;
  lng: number | null;
  scanned_on: string;
};

export type Me = {
  prefs?: NotifyPrefs;
  itemScans?: ItemScan[];
  user: Account;
  tags: Tag[];
  legacyItems: LegacyItem[];
  scans: ScanRequest[];
};

export type Contact = {
  owner_name: string | null;
  phone: string | null;
  car_model: string | null;
  plate_number: string | null;
  message: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  alt_phone?: string | null;
  alt_email?: string | null;
  address?: string | null;
};

export type ScanStatus =
  | { status: 'pending' | 'declined' | 'notfound' }
  | { status: 'accepted' | 'auto'; contact: Contact | null };

export type LookupResult =
  | { kind: 'notfound' }
  | { kind: 'vehicle'; id: string; state: 'unregistered' }
  | { kind: 'vehicle'; id: string; state: 'owner'; tag: Tag }
  | { kind: 'vehicle'; id: string; state: 'registered'; lostMode: boolean }
  | { kind: 'legacy'; code: string; state: 'unregistered' }
  | { kind: 'legacy'; code: string; state: 'owner'; item: LegacyItem }
  | { kind: 'legacy'; code: string; state: 'secured'; item_name: string | null }
  | {
      kind: 'legacy';
      code: string;
      state: 'lost';
      item_name: string | null;
      message: string | null;
      phones: string[];
      email: string | null;
    };
