const QUEUE_KEY = 'nfc_offline_queue';

export const getQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');

export const addToQueue = (action) => {
  const queue = getQueue();
  queue.push({ ...action, id: Date.now(), createdAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
};

export const syncQueue = async (api) => {
  const queue = getQueue();
  const failed = [];
  for (const item of queue) {
    try {
      if (item.method === 'PUT') await api.put(item.url, item.data);
      else if (item.method === 'POST') await api.post(item.url, item.data);
    } catch {
      failed.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return { synced: queue.length - failed.length, pending: failed.length };
};
