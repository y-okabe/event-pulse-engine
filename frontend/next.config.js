const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
    return [
      // REST API
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
      // Socket.IO (WebSocket upgrade も含む)
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
  webpack(config) {
    config.resolve.alias['@eventpulse/shared'] = path.resolve(__dirname, '../shared/types/index.ts');
    return config;
  },
};

module.exports = nextConfig;
