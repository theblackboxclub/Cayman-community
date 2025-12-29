/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This tells Next.js to correctly process the modern code in Firebase
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
}

module.exports = nextConfig
