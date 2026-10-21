const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000',
  },
  webpack(config) {
    config.resolve.alias['@eventpulse/shared'] = path.resolve(__dirname, '../shared/types/index.ts');
    return config;
  },
};

module.exports = nextConfig;
