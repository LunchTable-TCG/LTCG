import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // Allow images from Vercel Blob storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },

  // Remove console logs in production (keep errors and warnings)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Webpack optimization for bundle size reduction
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations in production client builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Disable default cache groups
            default: false,
            vendors: false,

            // Framework chunk (React, Next.js core)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },

            // Convex backend chunk
            convex: {
              name: 'convex',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](convex|@convex-dev)[\\/]/,
              priority: 35,
              enforce: true,
            },

            // UI libraries chunk (Radix, Framer Motion, Lucide)
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
              priority: 30,
              enforce: true,
            },

            // Web3 chunk (Solana wallet adapters)
            web3: {
              name: 'web3',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@solana)[\\/]/,
              priority: 25,
              enforce: true,
            },

            // Common vendor libraries
            lib: {
              name: 'lib',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              minChunks: 1,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports for automatic tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-progress',
      'framer-motion',
    ],

    // Enable CSS optimization
    optimizeCss: true,

    // Reduce memory usage during builds
    webpackMemoryOptimizations: true,
  },

  // Disable source maps in production for smaller builds
  ...(process.env.NODE_ENV === 'production' && {
    productionBrowserSourceMaps: false,
  }),
};

export default config;
