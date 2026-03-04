import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["child_process"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
