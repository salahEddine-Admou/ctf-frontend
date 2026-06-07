/** API base URL: VITE_API_URL in production (must resolve to .../api), `/api` proxy in dev. */
export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    const base = configured.replace(/\/$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  if (import.meta.env.DEV) return '/api';
  console.warn('VITE_API_URL is not set — API calls may fail in production.');
  return '/api';
};

/** Origin for static files (/uploads, PDFs). */
export const getApiOrigin = () => {
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/, '') || base;
  }
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return '';
};

export const resolveAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = getApiOrigin();
  return origin ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : path;
};
