import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // GeoGebra's deployggb.js is loaded from the official CDN via <Script>.
  // No server-side handling of .ggb is needed in Phase 1.
};

export default nextConfig;
