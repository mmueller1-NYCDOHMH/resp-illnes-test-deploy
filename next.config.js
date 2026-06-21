// isAgencyDeploy: true only on the NYC agency server.
// Netlify sets IS_AGENCY_DEPLOY="false" in netlify.toml, so basePath and
// analytics scripts are skipped there. Local dev (NODE_ENV !== 'production')
// is also excluded automatically.
const isAgencyDeploy =
  process.env.NODE_ENV === 'production' &&
  process.env.IS_AGENCY_DEPLOY !== 'false';

const isProd = isAgencyDeploy;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sub-path deployment — only applied in production so dev works at localhost:3000/
  basePath: isProd ? '/assets/doh/respiratory-illness-data' : '',

  // Expose basePath to client components so pathUtils can construct asset URLs
  // without relying on import.meta.env (Vite-specific).
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/assets/doh/respiratory-illness-data' : '',
  },

  // Allow the app to be embedded in an iframe on the agency host.
  // Remove if not needed.
  // headers: async () => [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }],

  // Redirect legacy hash-less paths just in case direct URLs are shared.
  // Phase 4 will replace these with proper file-based route pages.
  async redirects() {
    return [
      { source: '/data', destination: '/data/covid-19', permanent: false },
      { source: '/data/covid', destination: '/data/covid-19', permanent: false },
    ];
  },

  webpack(config, { webpack }) {
    // vega-canvas optionally requires the Node.js `canvas` package for
    // server-side chart rendering. This app renders all charts client-only,
    // so stub it to an empty module so webpack doesn't fail trying to bundle it.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };

    // Polyfill Vite's import.meta.env so existing src/ components compile
    // under webpack without changes. Phase 6 will replace these with
    // process.env.NEXT_PUBLIC_* equivalents throughout the codebase.
    config.plugins.push(
      new webpack.DefinePlugin({
        'import.meta.env.BASE_URL': JSON.stringify(
          isProd ? '/assets/doh/respiratory-illness-data/' : '/'
        ),
        'import.meta.env.MODE': JSON.stringify(
          process.env.NODE_ENV || 'development'
        ),
        'import.meta.env.DEV': JSON.stringify(
          process.env.NODE_ENV !== 'production'
        ),
        'import.meta.env.PROD': JSON.stringify(
          process.env.NODE_ENV === 'production'
        ),
        'import.meta.env.SSR': JSON.stringify(false),
      })
    );
    return config;
  },
};

export default nextConfig;
