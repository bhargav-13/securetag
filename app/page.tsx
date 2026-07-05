import Link from "next/link";
import HeroArt from "@/components/HeroArt";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const I = {
  check: "M20 6 9 17l-5-5",
  shield: "M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z",
  bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  drop: "M12 21s-7-4.4-9.5-8.5C.9 9.8 2 6 5.2 6 7 6 8.3 7 9 8c.7-1 2-2 3.8-2C16 6 17.1 9.8 15.5 12.5 13 16.6 12 21 12 21Z",
  car: "M5 11h14M6 11l1-5h10l1 5m-12 0v6m12-6v6M7 20h1m8 0h1",
  alert: "M12 2 3 20h18L12 2Zm0 6v5m0 3v.5",
  truck: "M1 3h13v10H1zM14 8h4l3 3v2h-7M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  pin: "M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  building: "M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 8h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1",
  cash: "M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 9v.01M18 15v.01",
  trophy: "M8 21h8m-4-4v4M6 4h12v4a6 6 0 0 1-12 0V4ZM6 6H4a2 2 0 0 0 2 4m12-4h2a2 2 0 0 1-2 4",
  eyeoff: "M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6M3 3l18 18",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z",
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default async function Home() {
  const user = await getSessionUser();

  const cases = [
    { n: "Case 01", icon: I.car, title: "Wrong parking", sit: "8 AM, a neighbour's car blocks your society or market exit. No number on the windscreen, and the watchman has no idea whose it is. You're stuck — and so is everyone behind you.", out: "A 20-minute standoff becomes a 3-minute fix — no door-knocking, no confrontation." },
    { n: "Case 02", icon: I.alert, title: "Accident, driver injured", sit: "A driver collides with a divider — conscious but hurt and unable to speak. Bystanders gather, but there's no ID and the phone is locked. No one knows who to call.", out: "Emergency contacts are reached in seconds, not after the ambulance ride." },
    { n: "Case 03", icon: I.drop, title: "Lights on / window open", sit: "A car sits in a lot with headlights draining the battery — or a window left open as rain soaks the seats. A passerby notices but has no way to reach the owner.", out: "A dead battery or soaked interior, prevented by one 3-second scan." },
    { n: "Case 04", icon: I.truck, title: "Towing zone", sit: "A tow van arrives at a no-parking zone. The owner stepped away for 'just a few minutes' and has no idea their car is already being hooked up.", out: "Owners get a last chance to move the car — before the tow, not after." },
  ];

  return (
    <div className="lp">
      {/* ---------------- HERO ---------------- */}
      <section className="hero2">
        <div className="hero2-inner">
          <div>
            <span className="eyebrow">Smart tag for car owners</span>
            <h1>Your car, one scan away from you.</h1>
            <p className="lead">
              SecureTag is a durable QR sticker for your vehicle. Anyone who
              needs to reach you — a blocked parking spot, an emergency, or a
              good samaritan who found your car — just scans and connects.
              No app. No hassle. Full control.
            </p>
            <div className="cta-row">
              {user ? (
                <Link href="/dashboard" className="btn white lg">Go to {user.isAdmin ? "admin" : "my tags"}</Link>
              ) : (
                <>
                  <Link href="/register" className="btn white lg">Get started free</Link>
                  <Link href="/login" className="btn ghost lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>Log in</Link>
                </>
              )}
            </div>
            <div className="chips">
              <span className="chip"><Icon path={I.camera} /> No app to scan</span>
              <span className="chip"><Icon path={I.shield} /> Weatherproof vinyl</span>
              <span className="chip"><Icon path={I.lock} /> You stay in control</span>
            </div>
            <div className="hero-rating"><span className="stars">★★★★★</span> Built for Indian roads · Made in Ahmedabad</div>
          </div>
          <div className="hero-art"><HeroArt /></div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="band band-white">
        <div className="lp-section">
          <div className="statband">
            <div className="stat" data-reveal><div className="num">3 sec</div><div className="lbl">to scan &amp; alert you</div></div>
            <div className="stat" data-reveal><div className="num">0 apps</div><div className="lbl">for the person scanning</div></div>
            <div className="stat" data-reveal><div className="num">100%</div><div className="lbl">private until you accept</div></div>
            <div className="stat" data-reveal><div className="num">1 tag</div><div className="lbl">for every situation</div></div>
          </div>
        </div>
      </section>

      {/* ---------------- PROBLEM ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">The problem</span>
            <h2>Every car owner has been here</h2>
            <p>Everyday situations with no easy fix — until now.</p>
          </div>
          <div className="cards cols-4">
            {[
              { icon: I.car, t: "Blocked by a stranger", d: "Boxed in at a society or market with no number to call." },
              { icon: I.alert, t: "Accident, unreachable", d: "An injured driver and no way to reach their family." },
              { icon: I.drop, t: "Lights on / window open", d: "A draining battery or rain getting in, and no way to warn you." },
              { icon: I.truck, t: "Towed away", d: "A tow truck arrives and the car is gone before you know it." },
            ].map((c) => (
              <div key={c.t} className="icard" data-reveal>
                <div className="ico"><Icon path={c.icon} /></div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
                <span className="tag-unsolved">UNSOLVED TODAY</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="band band-white">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">How it works</span>
            <h2>Three steps. Under 30 seconds.</h2>
            <p>Zero friction for either party.</p>
          </div>
          <div className="steps-h">
            <div className="step-h" data-reveal>
              <div className="num">1</div>
              <h3>Someone scans the QR</h3>
              <p>Any phone camera scans the SecureTag on the car — no app to download. It takes about 3 seconds.</p>
            </div>
            <div className="step-h" data-reveal>
              <div className="num">2</div>
              <h3>You approve the share</h3>
              <p>You&apos;re alerted instantly — in the app and by email. The scanner sees nothing until you tap Accept. Your number is never exposed without consent.</p>
            </div>
            <div className="step-h" data-reveal>
              <div className="num">3</div>
              <h3>Both sides connect</h3>
              <p>Once you accept, contact is shared and the situation gets resolved — a 20-minute standoff becomes a 3-minute fix.</p>
            </div>
          </div>
          <div className="lost-note" data-reveal>
            <b>Lost mode:</b> mark your car as lost or missing and a scanner&apos;s location can be shared with you automatically — so a found car finds its way back.
          </div>
        </div>
      </section>

      {/* ---------------- CASE STUDIES ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Real-life scenarios</span>
            <h2>Situations SecureTag solves</h2>
            <p>Happening on Indian streets every single day.</p>
          </div>
          <div className="cases">
            {cases.map((c, i) => (
              <div key={c.n} className={"case" + (i % 2 ? " flip" : "")} data-reveal>
                <div className="case-panel">
                  <Icon path={c.icon} />
                  <div className="cs-num">{c.n}</div>
                  <div className="cs-title">{c.title}</div>
                </div>
                <div className="case-body">
                  <h4>The situation</h4>
                  <p>{c.sit}</p>
                  <div className="case-out"><Icon path={I.check} /><span>{c.out}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- COMPARISON ---------------- */}
      <section className="band band-white">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Before &amp; after</span>
            <h2>A society parking dispute</h2>
            <p>The same problem, with and without SecureTag.</p>
          </div>
          <div className="vs">
            <div className="vs-col bad" data-reveal>
              <h3>😤 Without SecureTag</h3>
              <ul>
                <li>Go door to door across the whole building</li>
                <li>Ask the watchman (who&apos;s often clueless)</li>
                <li>Raise a committee complaint — takes days</li>
                <li>You&apos;re late, frustrated, and helpless</li>
              </ul>
            </div>
            <div className="vs-col good" data-reveal>
              <h3>😌 With SecureTag</h3>
              <ul>
                <li>Scan the QR sticker on the blocking car</li>
                <li>The owner gets an instant notification</li>
                <li>The owner comes and moves the car</li>
                <li>Whole process: under 3 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- WHY / FEATURES ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Why SecureTag</span>
            <h2>Reachable, but never exposed</h2>
          </div>
          <div className="cards cols-4">
            {[
              { icon: I.eyeoff, t: "Privacy first", d: "Your number is never printed on the tag — and never shared until you tap Accept." },
              { icon: I.bolt, t: "Instant & app-free", d: "Any phone camera works. A scan opens a web page in seconds — nothing to install." },
              { icon: I.bell, t: "Live alerts", d: "Get notified the moment someone scans — in the app and by email." },
              { icon: I.pin, t: "Lost mode + location", d: "Mark a car lost and scanners can share their location to help you find it." },
            ].map((c) => (
              <div key={c.t} className="icard" data-reveal>
                <div className="ico"><Icon path={c.icon} /></div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- PRODUCT / SPECS ---------------- */}
      <section className="band band-brand">
        <div className="lp-section">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">The sticker</span>
              <h2>Small, durable, and made for your windscreen</h2>
              <p style={{ color: "rgba(255,255,255,.9)", fontSize: 16 }}>
                A weatherproof QR sticker that survives sun, rain, and car
                washes. Stick it on and it just works — powered by your private
                SecureTag dashboard.
              </p>
              {user ? (
                <Link href="/dashboard" className="btn white" style={{ marginTop: 8 }}>Open dashboard</Link>
              ) : (
                <Link href="/register" className="btn white" style={{ marginTop: 8 }}>Get your tag</Link>
              )}
            </div>
            <div className="specs" data-reveal style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)" }}>
              <div className="spec-row"><span className="k">Size</span><span className="v">5 cm × 5 cm</span></div>
              <div className="spec-row"><span className="k">Material</span><span className="v">Weatherproof vinyl</span></div>
              <div className="spec-row"><span className="k">Placement</span><span className="v">Rear windshield / bumper</span></div>
              <div className="spec-row"><span className="k">Powered by</span><span className="v">QR + web dashboard</span></div>
              <div className="spec-row"><span className="k">Scanner needs</span><span className="v">Just a camera</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOR BUSINESS ---------------- */}
      <section className="band band-white">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">For garages &amp; dealerships</span>
            <h2>A new reason to delight your customers</h2>
            <p>Every car you service becomes a moving advertisement for your business.</p>
          </div>
          <div className="cards cols-4">
            {[
              { icon: I.car, t: "You have the reach", d: "Customers bring their cars to you regularly — each visit is a chance to add real value." },
              { icon: I.sparkle, t: "Co-branded tags", d: "Every SecureTag can carry your garage name and contact." },
              { icon: I.cash, t: "New revenue stream", d: "Offer it as a premium add-on — meaningful recurring revenue at scale." },
              { icon: I.trophy, t: "First-mover edge", d: "Be the first in your area known as 'the garage that thinks ahead for safety'." },
            ].map((c) => (
              <div key={c.t} className="icard" data-reveal>
                <div className="ico"><Icon path={c.icon} /></div>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Privacy first, always</span>
            <h2>Your biggest concern, answered</h2>
          </div>
          <div className="faq">
            {[
              { q: "Is my number shown when someone scans?", a: "No. The scanner sees nothing until you explicitly tap Accept. Your number is never exposed automatically." },
              { q: "Can I refuse to share contact?", a: "Yes. Tap Decline and the scanner gets no information at all. You're in control of every request." },
              { q: "Does the scanner need an app?", a: "No. Any smartphone camera scans it and opens a web page instantly — nothing to download." },
              { q: "Can I change or remove my registration?", a: "Yes. You control everything from the web dashboard — update details or unregister any time." },
              { q: "What if I lose my phone?", a: "The tag still works. Just log in from any device to see requests and respond." },
            ].map((f) => (
              <div key={f.q} className="faq-item" data-reveal>
                <div className="q"><span>Q.</span>{f.q}</div>
                <div className="a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="cta-band" data-reveal>
            <h2>&ldquo;One sticker. One scan. Every car owner&apos;s problem — solved.&rdquo;</h2>
            {user ? (
              <Link href="/dashboard" className="btn white lg">Open your dashboard</Link>
            ) : (
              <Link href="/register" className="btn white lg">Create your free account</Link>
            )}
            <p style={{ color: "rgba(255,255,255,.85)", marginTop: 14, fontSize: 14 }}>Have a tag already? Just scan its QR to begin.</p>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="band band-white">
        <div className="lp-section">
          <div className="footer2">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/full-logo-minify.svg" alt="SecureTag" style={{ height: 30 }} />
              <p className="tagline">One scan. Instant connection. Full control. A smart vehicle tag by InfiVidhya.</p>
            </div>
            <div className="fcol">
              <h4>Product</h4>
              <Link href="/register">Get started</Link>
              <Link href="/login">Log in</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="fcol">
              <h4>Contact</h4>
              <a href="tel:+916351377405">+91 63513 77405</a>
              <a href="mailto:info@infividhya.com">info@infividhya.com</a>
              <span className="muted small">Ahmedabad, Gujarat</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SecureTag · InfiVidhya Pvt. Ltd.</span>
            <span>Pixiverse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
