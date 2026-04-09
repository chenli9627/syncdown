import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ["192.168.66.35", "127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;
