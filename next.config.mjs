/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep an open development preview intact while verifying a production build.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};
export default nextConfig;
