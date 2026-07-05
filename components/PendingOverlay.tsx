"use client";

import { useFormStatus } from "react-dom";
import ShieldMark from "./ShieldMark";

/**
 * Full-screen shield loader shown while the enclosing <form>'s server action
 * is running (and through the redirect that follows). Must be rendered INSIDE
 * the <form> so it can read useFormStatus().
 */
export default function PendingOverlay({ label = "Just a moment" }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="overlay" role="status" aria-live="polite">
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
