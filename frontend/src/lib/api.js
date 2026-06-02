import axios from 'axios';

const api = axios.create({ baseURL: 'https://phonezone-backend-huow.onrender.com/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pz_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pz_token');
      localStorage.removeItem('pz_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
