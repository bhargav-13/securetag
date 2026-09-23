/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native binaries (resvg's rust addon) must not be bundled by webpack —
  // they're loaded at runtime via require() from node_modules as-is.
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js", "satori"],
  },
  // ---- Legacy bridge ----
  // 125 old (pre-2024) tags were physically printed as securetag.in/found/<code>.
  // Those URLs can't be reprinted, so forward them to the legacy app that now
  // lives on app.securetag.in. This deployment only serves securetag.in, so the
  // rule never runs on the legacy app itself. The vehicle system (/tag/*) is
  // untouched. To disable, delete this redirects() block.
  // NEXT_PUBLIC_LEGACY_ORIGIN points it elsewhere (e.g. the legacy app's
  // *.vercel.app URL) until app.securetag.in has DNS.
  async redirects() {
    const legacyOrigin = (process.env.NEXT_PUBLIC_LEGACY_ORIGIN || "https://app.securetag.in").replace(/\/+$/, "");
    return [
      {
        source: "/found/:code",
        destination: `${legacyOrigin}/found/:code`,
        // Temporary (307): browsers cache 308s, which would pin scanners to an
        // old destination if the legacy origin changes.
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
