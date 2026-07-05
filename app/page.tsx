import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { CheckIcon, XIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? `Go to ${user.isAdmin ? "admin" : "my tags"}` : "Get started free";

  const cases = [
    { n: "Case 01", title: "Wrong parking", sit: "8 AM, a neighbour's car blocks your society or market exit. No number on the windscreen, and the watchman has no idea whose it is.", out: "A 20-minute standoff becomes a 3-minute fix — no door-knocking, no confrontation." },
    { n: "Case 02", title: "Accident, driver injured", sit: "A driver collides and is conscious but hurt. Bystanders gather, but there's no ID and the phone is locked. No one knows who to call.", out: "Emergency contacts are reached in seconds, not after the ambulance ride." },
    { n: "Case 03", title: "Lights on / window open", sit: "A car sits with headlights draining the battery, or a window left open as rain soaks the seats. A passerby notices but can't reach the owner.", out: "A dead battery or soaked interior, prevented by one 3-second scan." },
    { n: "Case 04", title: "Towing zone", sit: "A tow van arrives at a no-parking zone. The owner stepped away for 'just a few minutes' with no idea their car is being hooked up.", out: "Owners get a last chance to move the car — before the tow, not after." },
  ];

  return (
    <div className="lp">
      {/* ---------------- HERO ---------------- */}
      <section className="hero-c">
        <span className="orb a" />
        <span className="orb b" />
        <div className="inner">
          <div>
            <span className="eyebrow">Smart tag for car owners</span>
            <h1>Your car, one scan away from you.</h1>
            <p className="lead">
              SecureTag is a durable QR sticker for your vehicle. Anyone who needs
              to reach you — a blocked spot, an emergency, or a good samaritan who
              found your car — just scans and connects. No app. No hassle. Full
              control.
            </p>
            <div className="cta-row">
              <Link href={primaryHref} className="btn white lg">{primaryLabel}</Link>
              {!user && (
                <Link href="/login" className="btn ghost lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>Log in</Link>
              )}
            </div>
          </div>
          <div className="hero-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/right_side_img.jpg" alt="SecureTag smart tag" />
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="band band-white">
        <div className="lp-section">
          <div className="statband">
            <div className="stat" data-reveal><div className="num">3 sec</div><div className="lbl">to scan &amp; alert you</div></div>
            <div className="stat" data-reveal><div className="num">0 apps</div><div className="lbl">for the person scanning</div></div>
            <div className="stat" data-reveal><div className="num">100%</div><div className="lbl">private until you accept</div></div>
            <div className="stat" data-reveal><div className="num">24/7</div><div className="lbl">emergency SOS alerts</div></div>
          </div>
        </div>
      </section>

      {/* ---------------- EMERGENCY SOS (emphasised) ---------------- */}
      <section className="band sos-solid">
        <div className="lp-section">
          <span className="sos-badge">Emergency SOS</span>
          <h2>In an accident, every second counts.</h2>
          <p className="sos-lead">
            If a scan is flagged as an <b>accident or emergency</b>, SecureTag
            doesn&apos;t wait for you to respond — it instantly alerts your
            emergency contacts with the exact location, so help reaches you
            faster when you can&apos;t reach for your phone.
          </p>
          <div className="sos-points">
            <div className="sos-point" data-reveal>
              <span className="n">1</span>
              <div><h4>Instant SOS</h4><p>The moment someone taps Accident or Emergency, alerts fire immediately — no Accept needed.</p></div>
            </div>
            <div className="sos-point" data-reveal>
              <span className="n">2</span>
              <div><h4>Location shared</h4><p>Your emergency &amp; alternate contacts get the live scan location on a map.</p></div>
            </div>
            <div className="sos-point" data-reveal>
              <span className="n">3</span>
              <div><h4>Reaches your people</h4><p>Family and backup numbers are notified by email and WhatsApp at once.</p></div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href={primaryHref} className="btn white lg">Set up emergency contacts</Link>
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
              <p>Any phone camera scans the sticker on your windscreen — no app to download, about 3 seconds.</p>
            </div>
            <div className="step-h" data-reveal>
              <div className="num">2</div>
              <h3>You approve the share</h3>
              <p>You&apos;re alerted instantly by email and WhatsApp. The scanner sees nothing until you tap Accept.</p>
            </div>
            <div className="step-h" data-reveal>
              <div className="num">3</div>
              <h3>Both sides connect</h3>
              <p>Once you accept, contact is shared and the situation gets resolved in minutes.</p>
            </div>
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
                  <div className="cs-num">{c.n}</div>
                  <div className="cs-title">{c.title}</div>
                </div>
                <div className="case-body">
                  <h4>The situation</h4>
                  <p>{c.sit}</p>
                  <div className="case-out"><CheckIcon size={16} /><span>{c.out}</span></div>
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
              <h3>Without SecureTag</h3>
              <ul>
                <li><XIcon size={17} />Go door to door across the whole building</li>
                <li><XIcon size={17} />Ask the watchman (who&apos;s often clueless)</li>
                <li><XIcon size={17} />Raise a committee complaint — takes days</li>
                <li><XIcon size={17} />You&apos;re late, frustrated, and helpless</li>
              </ul>
            </div>
            <div className="vs-col good" data-reveal>
              <h3>With SecureTag</h3>
              <ul>
                <li><CheckIcon size={17} />Scan the QR sticker on the blocking car</li>
                <li><CheckIcon size={17} />The owner gets an instant notification</li>
                <li><CheckIcon size={17} />The owner comes and moves the car</li>
                <li><CheckIcon size={17} />Whole process: under 3 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PRODUCT / SPECS ---------------- */}
      <section className="band">
        <div className="lp-section">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">The sticker</span>
              <h2 style={{ marginTop: 12 }}>Small, durable, made for your windscreen</h2>
              <p className="muted" style={{ fontSize: 16 }}>
                A weatherproof QR sticker that survives sun, rain, and car
                washes. Stick it on and it just works — powered by your private
                SecureTag dashboard.
              </p>
              <Link href={primaryHref} className="btn" style={{ marginTop: 8 }}>Get your tag</Link>
            </div>
            <div className="specs" data-reveal>
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
              { t: "You have the reach", d: "Customers bring their cars to you regularly — each visit is a chance to add real value." },
              { t: "Co-branded tags", d: "Every SecureTag can carry your garage name and contact details." },
              { t: "New revenue stream", d: "Offer it as a premium add-on — meaningful recurring revenue at scale." },
              { t: "First-mover edge", d: "Be the first in your area known as the garage that thinks ahead for safety." },
            ].map((c) => (
              <div key={c.t} className="icard" data-reveal>
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
              { q: "What about a real emergency?", a: "For Accident or Emergency scans, we alert your pre-set emergency contacts immediately with the location — even before you respond." },
              { q: "Does the scanner need an app?", a: "No. Any smartphone camera scans it and opens a web page instantly — nothing to download." },
              { q: "Can I change or remove my registration?", a: "Yes. You control everything from the web dashboard — update details or unregister any time." },
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
            <h2>One sticker. One scan. Every car owner&apos;s problem — solved.</h2>
            <Link href={primaryHref} className="btn white lg">{user ? "Open your dashboard" : "Create your free account"}</Link>
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
