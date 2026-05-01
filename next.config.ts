import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow DiceBear avatar images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Netlify handles its own adapter — no special config needed for modern Netlify
  // The @netlify/plugin-nextjs handles SSR automatically
};

export default nextConfig;
