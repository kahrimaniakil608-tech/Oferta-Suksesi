import { createRequire } from 'node:module';
const { loadEnvConfig } = createRequire(require.resolve('next'))('@next/env');
import path from 'node:path';
loadEnvConfig(path.resolve(process.cwd(), '../..'));
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@oferta/ui", "@oferta/shared"],
  images: {
    contentDispositionType: "inline",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3002",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4001",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "beta.ofertasuksesi.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ofertasuksesi.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.ofertasuksesi.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.ofertasuksesi.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
