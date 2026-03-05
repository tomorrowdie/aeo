import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Proxy all /api/* and /aeo/* requests to the Express backend.
   * In production on Zeabur, set BACKEND_URL to the internal service URL.
   * In local dev, defaults to http://localhost:8080.
   */
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8080';
    return [
      { source: '/api/:path*',       destination: `${backend}/api/:path*` },
      { source: '/aeo/:path*',       destination: `${backend}/aeo/:path*` },
      { source: '/sitemap-aeo.xml',  destination: `${backend}/sitemap-aeo.xml` },
      { source: '/health',           destination: `${backend}/health` },
    ];
  },
};

export default nextConfig;
