import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@telemd/shared"],
  // API-only app — no static pages needed
};

export default nextConfig;
