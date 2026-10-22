import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'

// Buat instance axios dengan konfigurasi default
const apiClient = axios.create({
  baseURL: 'https://dcb-backend.fuady.web.id/api', // Ganti dengan URL API Anda
  headers: {
    'Content-Type': 'application/json',
  },
})

export default apiClient
