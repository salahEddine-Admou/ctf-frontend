import api from '../api/axios';
import { resolveAssetUrl } from './apiBase.js';

export const downloadExport = async (endpoint, filename) => {
  const { data } = await api.get(`/export/${endpoint}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const openPdf = (path) => {
  let url = resolveAssetUrl(path);
  // Force Cloudinary raw PDFs to download directly to prevent Chrome preview errors
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('fl_attachment')) {
    url = url.replace('/upload/', '/upload/fl_attachment/');
  }
  
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = url.split('/').pop() || 'document.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
