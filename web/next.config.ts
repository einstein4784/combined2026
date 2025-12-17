import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses the web folder as the root to avoid lockfile warnings
  turbopack: {
    root: __dirname,
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
