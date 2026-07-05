import ShieldMark from "./ShieldMark";

/** Full-screen branded loading state with an animated shield. */
export default function ShieldLoader({ label = "Securing" }: { label?: string }) {
  return (
    <div className="loader-wrap">
      <div className="shield-loader">
        <div className="badge">
          <ShieldMark />
          <span className="scan" />
        </div>
        <div className="txt">
          {label}
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>
    </div>
  );
}
