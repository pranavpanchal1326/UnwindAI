// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {

  // ─── SERVER EXTERNAL PACKAGES ──────────────────────────
  // These packages must NOT be bundled by webpack
  // They use native Node.js bindings (.node files)
  serverExternalPackages: [
    'onnxruntime-node',
    '@huggingface/transformers',
    'sharp'
  ],

  // ─── WEBPACK CONFIG ────────────────────────────────────
  webpack: (config, { isServer }) => {
    // Browser: stub out server-only packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        path:   false,
        crypto: false,
        stream: false,
        net:    false,
        tls:    false,
        'onnxruntime-node': false
        // onnxruntime-node only runs server-side
        // Browser uses onnxruntime-web instead
      }
    }

    // Handle .node binary files
    config.module.rules.push({
      test:   /\.node$/,
      loader: 'node-loader'
    })

    // Silence onnxruntime-web WASM warnings
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers:           true
    }

    return config
  },

  // ─── IMAGE DOMAINS ─────────────────────────────────────
  images: {
    domains: [
      'ipfs.w3s.link',
      'w3s.link',
      'cloudflare-ipfs.com'
    ]
  },

  // ─── HEADERS ───────────────────────────────────────────
  // Required for WASM + SharedArrayBuffer (onnxruntime-web)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key:   'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key:   'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      },
      // Allow IPFS gateway images
      {
        source: '/_next/image',
        headers: [
          {
            key:   'Cross-Origin-Resource-Policy',
            value: 'cross-origin'
          }
        ]
      }
    ]
  },

  // ─── ENV VARS EXPOSED TO BROWSER ───────────────────────
  env: {
    DEMO_MODE: process.env.DEMO_MODE || 'false'
  }
}

module.exports = nextConfig
