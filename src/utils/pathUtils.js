// src/utils/pathUtils.js

/**
 * Returns the deployment base path with a trailing slash.
 *
 * Priority:
 *  1. Next.js — process.env.NEXT_PUBLIC_BASE_PATH (set in next.config.js env block)
 *               Empty string in dev → returns "/"
 *               Sub-path in prod   → returns "/assets/doh/respiratory-illness-data/"
 *  2. Vite    — import.meta.env.BASE_URL (replaced at Vite build time)
 *
 * @returns {string}
 */
const getBase = () => {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    const p = process.env.NEXT_PUBLIC_BASE_PATH;
    return p ? `${p}/` : '/';
  }
  // Vite fallback
  return import.meta.env.BASE_URL || '/';
};
  
  /**
   * Checks if we're in development mode
   * @returns {boolean}
   */
  const isDev = () => {
    const base = getBase();
    return base === "./" || base === ".";
  };
  
  /**
   * Resolves an asset path for both dev and production environments
   * @param {string} path - The relative path to the asset (e.g., "assets/logo.svg")
   * @returns {string} - The resolved path
   */
  export const resolveAsset = (path) => {
    if (!path) return "";
    
    // Remove leading slashes
    const normalizedPath = path.replace(/^\/+/, "");
    
    // In dev mode, use relative paths as-is
    if (isDev()) {
      return normalizedPath;
    }
    
    // In production, prepend the base path
    const base = getBase();
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${cleanBase}/${normalizedPath}`;
  };
  
  /**
   * Resolves a content file path (markdown, JSON, etc.)
   * Handles fetch() calls that need proper URLs
   * @param {string} path - The relative path to the content file
   * @returns {string} - The resolved path
   */
  export const resolveContentPath = (path) => {
    if (!path) return "";
    
    // Remove leading slashes
    const normalizedPath = path.replace(/^\/+/, "");
    
    // In dev mode, use relative path directly
    if (isDev()) {
      return normalizedPath;
    }
    
    // In production, construct proper path
    const base = getBase();
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const fullPath = `${cleanBase}/${normalizedPath}`;
    
    // Remove any duplicate path segments that might occur
    return fullPath.replace(/(\/assets\/doh\/respiratory-illness-data){2,}/, "$1");
  };
  
  /**
   * Resolves a route path for navigation
   * @param {string} path - The route path (e.g., "/dashboard")
   * @returns {string} - The resolved route path
   */
  export const resolveRoute = (path) => {
    if (!path) return "/";
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    
    // In dev mode, routes don't need base prepended
    if (isDev()) {
      return normalizedPath;
    }
    
    // In production, prepend base to routes
    const base = getBase();
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${cleanBase}${normalizedPath}`;
  };
  
  /**
   * Gets the public path for files in the public directory
   * @param {string} path - Path relative to public directory
   * @returns {string} - The resolved public path
   */
  export const resolvePublicPath = (path) => {
    // Public files are served from root in both dev and prod with Vite
    // Just ensure no leading slash duplication
    const normalizedPath = path.replace(/^\/+/, "");
    
    if (isDev()) {
      return `/${normalizedPath}`;
    }
    
    const base = getBase();
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${cleanBase}/${normalizedPath}`;
  };
  
  // Export utility functions for checking environment
  export { isDev, getBase };