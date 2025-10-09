import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
