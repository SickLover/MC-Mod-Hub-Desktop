/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.externals = [
      ...(config.externals || []),
      { 'sql.js': 'sql.js' },
      'jszip',
    ];
    return config;
  },
};

module.exports = nextConfig;
