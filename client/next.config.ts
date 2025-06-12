import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'www.scorelytic.com',
      },
      {
        protocol: 'https',
        hostname: 'www.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
    ],
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

  // 👇 Add this block
  async rewrites() {
    return [
      {
        source: '/demos/:path*',
        destination: 'https://api.scorelytic.com/demos/:path*',
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
