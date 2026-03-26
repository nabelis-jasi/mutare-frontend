const STORAGE_KEY = 'pending_submissions';

export const saveOffline = async (submission) => {
  const pending = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  pending.push({ ...submission, timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
};

export const getPendingSubmissions = () => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
};

export const clearPendingSubmissions = () => {
  localStorage.removeItem(STORAGE_KEY);
};
