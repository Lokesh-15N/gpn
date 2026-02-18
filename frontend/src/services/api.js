import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  patientRegister: (data) => api.post('/auth/patient/register', data),
  doctorLogin: (data) => api.post('/auth/doctor/login', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken })
};

// Token APIs
export const tokenAPI = {
  requestToken: (data) => api.post('/tokens/request', data),
  checkIn: (tokenId, location) => api.patch(`/tokens/${tokenId}/check-in`, location),
  getToken: (tokenId) => api.get(`/tokens/${tokenId}`),
  cancelToken: (tokenId, reason) => api.delete(`/tokens/${tokenId}`, { data: { reason } })
};

// Doctor APIs
export const doctorAPI = {
  getQueue: (doctorId, params) => api.get(`/doctors/${doctorId}/queue`, { params }),
  startConsultation: (data) => api.post('/doctors/consultations/start', data),
  completeConsultation: (consultationId, data) =>
    api.post(`/doctors/consultations/${consultationId}/complete`, data),
  markNoShow: (tokenId, data) => api.patch(`/doctors/tokens/${tokenId}/no-show`, data),
  updateStatus: (doctorId, data) => api.patch(`/doctors/${doctorId}/status`, data)
};

// Admin APIs
export const adminAPI = {
  getDashboardOverview: (params) => api.get('/admin/dashboard/overview', { params }),
  getHeatmap: (params) => api.get('/admin/heatmap', { params })
};

// Department APIs
export const departmentAPI = {
  getAllDepartments: () => api.get('/departments'),
  getDoctorsByDepartment: (deptId) => api.get(`/departments/${deptId}/doctors`)
};

// Hospital/Clinic APIs
export const hospitalAPI = {
  getAll: (params) => api.get('/hospitals', { params }),
  getById: (hospitalId) => api.get(`/hospitals/${hospitalId}`),
  registerClinic: (data) => api.post('/hospitals/clinic/register', data)
};

export default api;
