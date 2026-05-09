const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Copy ONNX models to public directory on startup in development
// Only copies models needed for What-If (3 models)
const WHATIF_MODELS = [
  'outcome_collab_duration.onnx',
  'outcome_collab_cost.onnx',
  'risk_scorer.onnx'
];

if (process.env.NODE_ENV === 'development') {
  try {
    const publicModelsDir = path.join(process.cwd(), 'public', 'models');
    if (!fs.existsSync(publicModelsDir)) {
      fs.mkdirSync(publicModelsDir, { recursive: true });
    }
    WHATIF_MODELS.forEach(model => {
      const src = path.join(process.cwd(), 'models', model);
      const dest = path.join(publicModelsDir, model);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
    console.log('[next.config] ONNX models copied to public/models/');
  } catch (err) {
    console.warn('[next.config] Could not copy models:', err.message);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack: handle ONNX files and externals
  /*
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "onnxruntime-node",
      ]
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };

    // onnxruntime-web uses WASM files for browser ML inference.
    // asyncWebAssembly must be enabled or the What-If Simulator breaks.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    return config
  },
  */


  // Security headers on every route.
  /*
  async headers() {
    ...
  },
  */

}

module.exports = nextConfig
