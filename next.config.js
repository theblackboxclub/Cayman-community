/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This line fixes the build error by translating the new code
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
}

module.exports = nextConfig
