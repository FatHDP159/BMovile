import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Agregar token automáticamente en cada request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Si el token expiró, intentar renovar automáticamente
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const res = await axios.post('http://localhost:3000/api/auth/refresh', { refreshToken });
                const newToken = res.data.accessToken;

                localStorage.setItem('accessToken', newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (err) {
                localStorage.clear();
                window.location.href = '/login';
            }
        }

        if (error.response?.status === 403) {
            localStorage.clear();
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;