/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native binaries (resvg's rust addon) must not be bundled by webpack —
  // they're loaded at runtime via require() from node_modules as-is.
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js", "satori"],
  },
};

export default nextConfig;
