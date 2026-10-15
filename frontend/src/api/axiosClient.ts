import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor — unwrap data or throw structured error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    const structuredError = {
      message,
      errors: error.response?.data?.errors || [],
      status: error.response?.status,
    };

    return Promise.reject(structuredError);
  }
);

export default apiClient;
