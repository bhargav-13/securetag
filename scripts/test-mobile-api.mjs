/* End-to-end check of the mobile API against the real database.

   Creates two throwaway accounts and two throwaway tags (all clearly marked
   TEST), drives every flow the app uses, then deletes everything it made.

   Needs the website running:   npm run dev:mobile      (port 4100)
   Then:                        node scripts/test-mobile-api.mjs
   Options:  API=http://localhost:4100   KEEP=1 (skip cleanup, prints logins) */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const API = (process.env.API || "http://localhost:4100").replace(/\/+$/, "");

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const stamp = Date.now().toString(36);
const pick = (n, abc) => Array.from(randomBytes(n), (b) => abc[b % abc.length]).join("");

// Fictional contact details: example.com never receives mail and 555-01xx
// numbers are reserved, so no real person can be alerted by this test.
const PASSWORD = `Test-${pick(12, "abcdefghjkmnpqrstuvwxyz23456789")}`;
const OWNER = { email: `securetag-test-owner-${stamp}@example.com`, name: "TEST Owner" };
const OTHER = { email: `securetag-test-other-${stamp}@example.com`, name: "TEST Other" };
const TAG = "TEST" + pick(4, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");
const ITEM = "Tst" + pick(3, "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789");

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json: json ?? {} };
}

async function makeUser(u) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.name, phone: "+15555550100" },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const s = await client.auth.signInWithPassword({ email: u.email, password: PASSWORD });
  if (s.error) throw new Error(`signIn: ${s.error.message}`);
  return { id: data.user.id, token: s.data.session.access_token, client };
}

const vehicle = {
  owner_name: "TEST Owner",
  phone: "+1 555 555 0100",
  car_model: "TEST Car",
  plate_number: "test 0001",
  message: "TEST tag, please ignore",
  emergency_contact_name: "TEST Kin",
  emergency_contact_phone: "+15555550101",
};
const itemBody = {
  item_name: "TEST Suitcase",
  item_type: "SUITCASE",
  owner_name: "TEST Owner",
  phone: "+15555550100",
  alt_phone: "+15555550102",
  message: "TEST item, please ignore",
  pref_contact: ["PHONE", "EMAIL"],
  country: "India",
};

let owner, other;
try {
  console.log(`API ${API}\nTest tag ${TAG}, test item ${ITEM}\n`);
  const ping = await call("GET", "/api/mobile/lookup?code=ZZZZZZZZ").catch(() => null);
  if (!ping || ping.status !== 200) throw new Error(`Website not reachable at ${API}. Start it with: npm run dev:mobile`);

  owner = await makeUser(OWNER);
  other = await makeUser(OTHER);
  const t1 = await admin.from("tags").insert({ id: TAG });
  if (t1.error) throw new Error(`insert tag: ${t1.error.message}`);
  const t2 = await admin.from("legacy_tags").insert({ id: ITEM, claimed: false, url_prefix: "https://securetag.in/found" });
  if (t2.error) throw new Error(`insert legacy tag: ${t2.error.message}`);

  console.log("Account");
  let r = await call("GET", "/api/mobile/me");
  check("me without a token is rejected", r.status === 401);
  r = await call("GET", "/api/mobile/me", { token: "not-a-real-token" });
  check("me with a bad token is rejected", r.status === 401);
  r = await call("GET", "/api/mobile/me", { token: owner.token });
  check("me returns the account", r.status === 200 && r.json.user?.email === OWNER.email && r.json.tags?.length === 0);
  r = await call("PATCH", "/api/mobile/me", { token: owner.token, body: { full_name: "", phone: "12" } });
  check("profile validation reports both fields", r.status === 422 && r.json.fieldErrors?.full_name && r.json.fieldErrors?.phone);
  r = await call("PATCH", "/api/mobile/me", { token: owner.token, body: { full_name: "TEST Owner Renamed", phone: "+15555550100" } });
  check("profile saves", r.status === 200 && r.json.fullName === "TEST Owner Renamed");

  console.log("\nVehicle tag: activate");
  r = await call("GET", `/api/mobile/lookup?code=${TAG}`);
  check("blank tag looks unregistered", r.json.kind === "vehicle" && r.json.state === "unregistered");
  r = await call("POST", `/api/mobile/tags/${TAG}`, { body: vehicle });
  check("activation needs login", r.status === 401);
  r = await call("POST", `/api/mobile/tags/${TAG}`, { token: owner.token, body: { ...vehicle, owner_name: "", phone: "123" } });
  check("activation validates fields", r.status === 422 && r.json.fieldErrors?.owner_name && r.json.fieldErrors?.phone);
  r = await call("POST", `/api/mobile/tags/${TAG}`, { token: owner.token, body: vehicle });
  check("owner activates the tag", r.status === 200 && r.json.tag?.plate_number === "TEST 0001", JSON.stringify(r.json));
  r = await call("POST", `/api/mobile/tags/${TAG}`, { token: other.token, body: vehicle });
  check("a second person cannot activate it", r.status === 409);
  r = await call("GET", `/api/mobile/lookup?code=${TAG}`, { token: owner.token });
  check("owner sees their own tag", r.json.state === "owner" && r.json.tag?.phone === "+15555550100");
  r = await call("GET", `/api/mobile/lookup?code=${TAG.toLowerCase()}`);
  check("stranger sees no contact (and lower-case code works)", r.json.state === "registered" && !("tag" in r.json) && r.json.lostMode === false);
  r = await call("PUT", `/api/mobile/tags/${TAG}`, { token: other.token, body: vehicle });
  check("stranger cannot edit", r.status === 403);
  r = await call("PATCH", `/api/mobile/tags/${TAG}`, { token: other.token, body: { on: true } });
  check("stranger cannot switch Lost Mode", r.status === 403);
  r = await call("PUT", `/api/mobile/tags/${TAG}`, { token: owner.token, body: { ...vehicle, car_model: "TEST Car v2" } });
  check("owner edits", r.status === 200 && r.json.tag?.car_model === "TEST Car v2");

  console.log("\nScan request: accept");
  r = await call("POST", "/api/mobile/scan", { body: { tagId: TAG, reason: "" } });
  check("a reason is required", r.status === 400);
  r = await call("POST", "/api/mobile/scan", { body: { tagId: TAG, reason: "Parking issue", message: "TEST note", lat: 23.02, lng: 72.57 } });
  check("request is pending with no contact", r.status === 200 && r.json.status === "pending" && !r.json.contact, JSON.stringify(r.json));
  const req1 = r.json.requestId;
  r = await call("GET", `/api/scan/status/${req1}`);
  check("status is pending with no contact", r.json.status === "pending" && !r.json.contact);
  r = await call("GET", "/api/mobile/me", { token: owner.token });
  const mine = r.json.scans?.find((s) => s.id === req1);
  check("owner sees the request with note and location", mine?.scanner_message === "TEST note" && mine?.scanner_lat === 23.02);
  r = await call("POST", `/api/mobile/scan/${req1}`, { body: { decision: "accepted" } });
  check("answering needs login", r.status === 401);
  r = await call("POST", `/api/mobile/scan/${req1}`, { token: other.token, body: { decision: "accepted" } });
  check("a stranger cannot answer", r.status === 409);
  r = await call("GET", `/api/scan/status/${req1}`);
  check("still pending after the stranger tried", r.json.status === "pending");
  r = await call("POST", `/api/mobile/scan/${req1}`, { token: owner.token, body: { decision: "accepted" } });
  check("owner accepts", r.status === 200);
  r = await call("GET", `/api/scan/status/${req1}`);
  check("scanner now gets the contact", r.json.status === "accepted" && r.json.contact?.phone === "+15555550100");
  r = await call("POST", `/api/mobile/scan/${req1}`, { token: owner.token, body: { decision: "declined" } });
  check("an answer cannot be changed", r.status === 409);

  console.log("\nScan request: decline, emergency, Lost Mode");
  r = await call("POST", "/api/mobile/scan", { body: { tagId: TAG, reason: "Vehicle blocked" } });
  const req2 = r.json.requestId;
  await call("POST", `/api/mobile/scan/${req2}`, { token: owner.token, body: { decision: "declined" } });
  r = await call("GET", `/api/scan/status/${req2}`);
  check("declined request gives no contact", r.json.status === "declined" && !r.json.contact);
  r = await call("POST", "/api/mobile/scan", { body: { tagId: TAG, reason: "Accident" } });
  check("emergency shares contact at once", r.json.status === "auto" && r.json.contact?.emergency_contact_phone === "+15555550101");
  r = await call("PATCH", `/api/mobile/tags/${TAG}`, { token: owner.token, body: { on: true } });
  check("owner turns Lost Mode on", r.status === 200);
  r = await call("GET", `/api/mobile/lookup?code=${TAG}`);
  check("stranger sees it is marked lost", r.json.lostMode === true);
  r = await call("POST", "/api/mobile/scan", { body: { tagId: TAG, reason: "Lost & found" } });
  check("Lost Mode shares contact at once", r.json.status === "auto" && !!r.json.contact?.phone);
  const req4 = r.json.requestId;
  r = await call("POST", `/api/mobile/scan/${req4}`, { body: { lat: 999, lng: 72.6 } });
  check("impossible coordinates are refused", r.status === 400);
  r = await call("POST", `/api/mobile/scan/${req4}`, { body: { lat: 23.03, lng: 72.58 } });
  check("scanner shares location", r.status === 200);
  r = await call("GET", "/api/mobile/me", { token: owner.token });
  check("owner sees the shared location", r.json.scans?.find((s) => s.id === req4)?.scanner_lng === 72.58);
  r = await call("POST", "/api/mobile/scan/not-a-uuid", { body: { lat: 1, lng: 1 } });
  check("bad request id is a clean 404", r.status === 404);
  await call("PATCH", `/api/mobile/tags/${TAG}`, { token: owner.token, body: { on: false } });

  console.log("\nItem tag (luggage / wallet)");
  r = await call("GET", `/api/mobile/lookup?code=${ITEM}`);
  check("blank item tag looks unregistered", r.json.kind === "legacy" && r.json.state === "unregistered");
  r = await call("POST", `/api/mobile/legacy/${ITEM}`, { token: owner.token, body: { ...itemBody, pref_contact: [] } });
  check("item validation: needs a contact method", r.status === 422 && !!r.json.fieldErrors?.pref_contact);
  r = await call("POST", `/api/mobile/legacy/${ITEM}`, { token: owner.token, body: itemBody });
  check("owner activates the item", r.status === 200, JSON.stringify(r.json));
  r = await call("GET", "/api/mobile/me", { token: owner.token });
  check("item shows in the owner's list", r.json.legacyItems?.some((i) => i.id === ITEM));
  r = await call("GET", "/api/mobile/me", { token: other.token });
  check("item does not show for anyone else", r.json.legacyItems?.length === 0);
  r = await call("GET", `/api/mobile/lookup?code=${ITEM}`);
  check("finder of a secured item gets no contact", r.json.state === "secured" && !r.json.phones && !r.json.email);
  r = await call("PUT", `/api/mobile/legacy/${ITEM}`, { token: other.token, body: itemBody });
  check("stranger cannot edit the item", r.status === 403);
  r = await call("PATCH", `/api/mobile/legacy/${ITEM}`, { token: other.token, body: { on: true } });
  check("stranger cannot mark it lost", r.status === 403);
  r = await call("PATCH", `/api/mobile/legacy/${ITEM}`, { token: owner.token, body: { on: true } });
  check("owner marks it lost", r.status === 200);
  r = await call("GET", `/api/mobile/lookup?code=${ITEM}&audit=0`);
  check("finder of a lost item gets phone and email", r.json.state === "lost" && r.json.phones?.length === 2 && r.json.email === OWNER.email);
  r = await call("PUT", `/api/mobile/legacy/${ITEM}`, { token: owner.token, body: { ...itemBody, pref_contact: ["EMAIL"] } });
  check("owner edits contact preference", r.status === 200);
  r = await call("GET", `/api/mobile/lookup?code=${ITEM}&audit=0`);
  check("email-only preference hides the phone", r.json.phones?.length === 0 && r.json.email === OWNER.email);
  r = await call("GET", `/api/mobile/lookup?code=${ITEM}`, { token: owner.token });
  check("owner scanning their own item sees the owner view", r.json.state === "owner");

  console.log("\nPush tokens");
  r = await call("POST", "/api/mobile/push", { token: owner.token, body: { token: "garbage" } });
  check("bad push token refused", r.status === 400);
  const fake = "ExponentPushToken[TESTtesttestTESTtest00]";
  r = await call("POST", "/api/mobile/push", { token: owner.token, body: { token: fake } });
  let u = await admin.auth.admin.getUserById(owner.id);
  check("push token stored on the account", r.status === 200 && u.data.user?.app_metadata?.expo_push_tokens?.includes(fake));
  r = await call("DELETE", "/api/mobile/push", { token: owner.token, body: { token: fake } });
  u = await admin.auth.admin.getUserById(owner.id);
  check("push token removed on sign-out", r.status === 200 && !u.data.user?.app_metadata?.expo_push_tokens?.includes(fake));

  console.log("\nDatabase security");
  await other.client.from("profiles").update({ role: "admin" }).eq("id", other.id);
  const prof = await admin.from("profiles").select("role").eq("id", other.id).maybeSingle();
  check(
    "a user cannot make themselves admin",
    prof.data?.role !== "admin",
    "the live database still has the profiles_update_self policy: run the SECURITY block in supabase-schema.sql"
  );
  if (prof.data?.role === "admin") await admin.from("profiles").update({ role: "user" }).eq("id", other.id);
  const leak = await other.client.from("tags").select("id,phone").eq("id", TAG);
  check("a user cannot read someone else's tag directly", (leak.data ?? []).length === 0);
  const leak2 = await other.client.from("legacy_tags").select("id").eq("id", ITEM);
  check("legacy items are not readable directly", (leak2.data ?? []).length === 0);
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error("\nCRASHED:", e.message);
} finally {
  if (process.env.KEEP) {
    console.log(`\nKEEP=1: test data left in place.\n  owner ${OWNER.email}\n  other ${OTHER.email}\n  password ${PASSWORD}\n  tag ${TAG}  item ${ITEM}`);
  } else {
    await admin.from("scan_requests").delete().eq("tag_id", TAG);
    await admin.from("tags").delete().eq("id", TAG);
    await admin.from("legacy_scans").delete().eq("code", ITEM);
    await admin.from("legacy_tags").delete().eq("id", ITEM);
    for (const who of [owner, other]) if (who) await admin.auth.admin.deleteUser(who.id);
    console.log("\nTest data removed.");
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
