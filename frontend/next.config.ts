/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  // Disable compression for streaming SSE
  compress: false,

  // Hide the Next.js dev "N" badge
  devIndicators: false,
};

export default nextConfig;