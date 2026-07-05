import Link from "next/link";
import HeroArt from "@/components/HeroArt";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function Icon({ path, filled = false }: { path: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

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
};

export default async function Home() {
  const user = await getSessionUser();

  const primaryCta = user ? (
    <Link href="/dashboard" className="btn white lg">Go to {user.isAdmin ? "admin" : "my tags"}</Link>
  ) : (
    <Link href="/register" className="btn white lg">Get started</Link>
  );

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
              {primaryCta}
              {!user && (
                <Link href="/login" className="btn ghost lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>
                  Log in
                </Link>
              )}
            </div>
            <div className="chips">
              <span className="chip"><Icon path={I.camera} /> No app to scan</span>
              <span className="chip"><Icon path={I.shield} /> Weatherproof vinyl</span>
              <span className="chip"><Icon path={I.lock} /> You stay in control</span>
            </div>
          </div>
          <div className="hero-art"><HeroArt /></div>
        </div>
      </section>

      {/* ---------------- PROBLEM ---------------- */}
      <section className="lp-section">
        <div className="sec-head" data-reveal>
          <span className="eyebrow">The problem</span>
          <h2>Every car owner faces this</h2>
          <p>Daily frustrations with no easy solution — until now.</p>
        </div>
        <div className="cards cols-4">
          {[
            { icon: I.car, t: "Blocked by a stranger", d: "Your car is boxed in at a society or market. No number on the windscreen, no way to find the driver." },
            { icon: I.alert, t: "Accident — owner unreachable", d: "An injured driver, a concerned bystander, emergency contacts needed urgently — but no way to find them." },
            { icon: I.drop, t: "Lights on / window open", d: "A good samaritan sees your battery draining or rain getting in, but has no way to reach you." },
            { icon: I.truck, t: "Towed from a no-parking zone", d: "The tow van arrives, the driver is nowhere, and the car is gone before the owner even knows." },
          ].map((c) => (
            <div key={c.t} className="icard" data-reveal>
              <div className="ico"><Icon path={c.icon} /></div>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
              <span className="tag-unsolved">UNSOLVED TODAY</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="lp-section">
        <div className="sec-head" data-reveal>
          <span className="eyebrow">How it works</span>
          <h2>Three steps. Under 30 seconds.</h2>
          <p>Zero friction for either party.</p>
        </div>
        <div className="steps-h">
          <div className="step-h" data-reveal>
            <div className="num">1</div>
            <h3>Someone scans the QR</h3>
            <p>Anyone with a phone camera scans the SecureTag on the car. No app download needed — it takes about 3 seconds.</p>
          </div>
          <div className="step-h" data-reveal>
            <div className="num">2</div>
            <h3>You approve the share</h3>
            <p>You&apos;re alerted instantly — in the app and by email. The scanner sees nothing until you tap <b>Accept</b>. Your number is never exposed without consent.</p>
          </div>
          <div className="step-h" data-reveal>
            <div className="num">3</div>
            <h3>Both sides connect</h3>
            <p>Once you accept, contact is shared and the situation gets resolved — a 20-minute standoff becomes a 3-minute fix.</p>
          </div>
        </div>
        <div className="lost-note">
          <b>Lost mode:</b> mark your car as lost or missing and a scanner&apos;s location can be shared with you automatically — so a found car finds its way back.
        </div>
      </section>

      {/* ---------------- WHY / SPECS ---------------- */}
      <section className="lp-section">
        <div className="split">
          <div>
            <span className="eyebrow">Why SecureTag</span>
            <div className="cards" style={{ marginTop: 16 }}>
              <div className="icard" data-reveal>
                <div className="ico"><Icon path={I.lock} /></div>
                <h3>Privacy first</h3>
                <p>Your phone number is never printed on the sticker. People reach you through SecureTag, and you stay in control at all times.</p>
              </div>
              <div className="icard" data-reveal>
                <div className="ico"><Icon path={I.bolt} /></div>
                <h3>Instant &amp; app-free</h3>
                <p>Any phone camera works — nothing to install. A scan opens a web page in seconds.</p>
              </div>
              <div className="icard" data-reveal>
                <div className="ico"><Icon path={I.check} /></div>
                <h3>Built for real situations</h3>
                <p>Parking, emergencies, accidents, lights-left-on, towing and lost &amp; found — the scanner picks the reason so you get context.</p>
              </div>
            </div>
          </div>
          <div className="specs" data-reveal>
            <h3>The SecureTag sticker</h3>
            <p style={{ color: "rgba(255,255,255,.85)", marginTop: 0 }}>Small, durable, and made for your windscreen.</p>
            <div style={{ marginTop: 10 }}>
              <div className="spec-row"><span className="k">Size</span><span className="v">5 cm × 5 cm</span></div>
              <div className="spec-row"><span className="k">Material</span><span className="v">Weatherproof vinyl</span></div>
              <div className="spec-row"><span className="k">Placement</span><span className="v">Rear windshield / bumper</span></div>
              <div className="spec-row"><span className="k">Powered by</span><span className="v">QR + web dashboard</span></div>
              <div className="spec-row"><span className="k">Scanner needs</span><span className="v">Just a camera</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PRIVACY FAQ ---------------- */}
      <section className="lp-section">
        <div className="sec-head" data-reveal>
          <span className="eyebrow">Privacy first, always</span>
          <h2>Your biggest concern, answered</h2>
        </div>
        <div className="faq">
          {[
            { q: "Is my number shown when someone scans?", a: "No. The scanner sees nothing until you explicitly tap Accept. Your number is never exposed automatically." },
            { q: "Can I refuse to share contact?", a: "Yes. Tap Decline and the scanner gets no information at all. You're in control of every request." },
            { q: "Can I change or remove my registration?", a: "Yes. You control everything from the web dashboard — update details or unregister any time, from anywhere." },
            { q: "What if I lose my phone?", a: "The tag still works. Just log in from any device to see requests and respond." },
          ].map((f) => (
            <div key={f.q} className="faq-item" data-reveal>
              <div className="q"><span>Q.</span>{f.q}</div>
              <div className="a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="lp-section">
        <div className="cta-band" data-reveal>
          <h2>&ldquo;One sticker. One scan. Every car owner&apos;s problem — solved.&rdquo;</h2>
          {user ? (
            <Link href="/dashboard" className="btn white lg">Open dashboard</Link>
          ) : (
            <Link href="/register" className="btn white lg">Create your free account</Link>
          )}
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="site-footer">
        <div className="inner">
          <div className="brandline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/full-logo-minify.svg" alt="SecureTag" />
          </div>
          <div className="contact">
            InfiVidhya Pvt. Ltd. · Pixiverse<br />
            +91 63513 77405 · info@infividhya.com
          </div>
        </div>
      </footer>
    </div>
  );
}
