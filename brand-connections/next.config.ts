import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ausganica.com.au',
        pathname: '/cdn/**',
      },
      {
        protocol: 'https',
        hostname: 'teelixir.com.au',
        pathname: '/cdn/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
