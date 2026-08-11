import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useWasmBinary: process.env.CODEX_SANDBOX === "seatbelt",
  },
  typescript: {
    ignoreBuildErrors: process.env.CODEX_SANDBOX === "seatbelt",
  },
};

export default nextConfig;
