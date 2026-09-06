/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@briefrepo/types',
    '@briefrepo/tokens',
    '@briefrepo/analyzer-core',
    '@briefrepo/web-reporter',
  ],
  serverExternalPackages: ['simple-git'],
};

export default nextConfig;
