/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is the magic line that fixes the error you see
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
}

module.exports = nextConfig
