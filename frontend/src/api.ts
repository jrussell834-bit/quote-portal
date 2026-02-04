import axios from 'axios';
import type { QuoteCard } from './ui/KanbanApp';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the full error for debugging
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export async function fetchQuotes(): Promise<QuoteCard[]> {
  const res = await api.get<QuoteCard[]>('/quotes');
  return res.data;
}

export async function updateQuoteStage(id: string, stage: QuoteCard['stage']) {
  const res = await api.patch<QuoteCard>(`/quotes/${id}/stage`, { stage });
  return res.data;
}

export async function createQuote(payload: Partial<QuoteCard>) {
  const res = await api.post<QuoteCard>('/quotes', payload);
  return res.data;
}

export async function uploadQuoteAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<QuoteCard>(`/quotes/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function register(username: string, password: string) {
  try {
    const res = await api.post('/auth/register', { username, password });
    return res.data as { token: string; user: { id: string; email: string } };
  } catch (error: any) {
    console.error('Register API error:', error);
    throw error;
  }
}

export async function login(username: string, password: string) {
  try {
    const res = await api.post('/auth/login', { username, password });
    return res.data as { token: string; user: { id: string; email: string } };
  } catch (error: any) {
    console.error('Login API error:', error);
    throw error;
  }
}

