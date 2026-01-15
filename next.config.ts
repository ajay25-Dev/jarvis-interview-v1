import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // Force usage of browser version of DuckDB-Wasm to avoid node-specific dependencies in client bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      '@duckdb/duckdb-wasm': require.resolve('@duckdb/duckdb-wasm/dist/duckdb-browser.mjs'),
    };

    return config;
  },
};

export default config;
