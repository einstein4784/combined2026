import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses the web folder as the root to avoid lockfile warnings
  turbopack: {
    root: __dirname,
  },
  /* config options here */
  reactCompiler: true,
  // Suppress hydration warnings caused by browser extensions
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
