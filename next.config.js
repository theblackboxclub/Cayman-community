/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
}

module.exports = nextConfig
