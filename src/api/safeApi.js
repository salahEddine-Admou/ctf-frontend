import api from './axios.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retry on 504 (gateway timeout). Reduces uncaught promise errors. */
export const apiGet = async (url, config = {}, retries = 2) => {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await api.get(url, { timeout: 25000, ...config });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status !== 504 || i === retries) throw err;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastErr;
};

export const apiPost = async (url, body, config = {}, retries = 1) => {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await api.post(url, body, { timeout: 25000, ...config });
    } catch (err) {
      lastErr = err;
      if (err.response?.status !== 504 || i === retries) throw err;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastErr;
};
