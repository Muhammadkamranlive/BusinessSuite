import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 50
  },
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }]
      },
      {
        source: "/api/theme",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }]
      }
    ];
  }
};

export default nextConfig;
