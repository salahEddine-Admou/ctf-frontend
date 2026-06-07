import api from './axios';

export const uploadFile = async (file, folder = 'nfc-crm/interventions') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  const { data } = await api.post('/upload/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const uploadFiles = async (files, folder = 'nfc-crm/interventions') => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('folder', folder);
  const { data } = await api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};
