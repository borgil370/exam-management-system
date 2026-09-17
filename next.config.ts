import type { NextConfig } from "next";

// 前端通过 /api/* 同源访问后端，由 rewrites 代理到 Express，Cookie 直接生效、无需 CORS
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
