/**
 * Base URL for the backend API.
 * Set VITE_BACKEND_URL at build time (e.g. https://api.yourdomain.com).
 * Leave unset for local development — requests fall through to the Vite proxy.
 */
export const API = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? ''
