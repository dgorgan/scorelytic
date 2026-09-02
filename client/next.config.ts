import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

// Backend that serves the static demo sites (server/demos, via Express).
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://scorelytic-api.onrender.com').replace(
  /\/$/,
  '',
);

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['i.ytimg.com', 'www.youtube.com', 'yt3.ggpht.com'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      // remove shared alias here
    };
    return config;
  },
  productionBrowserSourceMaps: true,
  experimental: {},

  async rewrites() {
    return [
      {
        source: '/demos/:path*',
        destination: `${API_URL}/demos/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'scorelytic',
  project: process.env.SENTRY_PROJECT_CLIENT || 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  disableLogger: true,
  silent: !process.env.CI,
  automaticVercelMonitors: true,
});
