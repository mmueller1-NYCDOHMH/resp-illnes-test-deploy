// postcss.config.js
// Next.js requires PostCSS plugins to be specified by package name (string),
// not as imported function references. The object form is compatible with
// both Next.js and Vite's PostCSS pipeline.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
