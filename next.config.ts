import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: ['*'], // Add your dev origin here
  reactStrictMode: false,

  eslint: {
    // ❌ Matikan linting pas build di Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
