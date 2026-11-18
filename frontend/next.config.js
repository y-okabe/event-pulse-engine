const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['@eventpulse/shared'] = path.resolve(__dirname, '../shared/types/index.ts');
    return config;
  },
};

module.exports = nextConfig;
