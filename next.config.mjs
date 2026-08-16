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
  async redirects() {
    return [
      {
        source: "/found/:code",
        destination: "https://app.securetag.in/found/:code",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
