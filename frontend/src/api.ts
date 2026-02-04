import axios from 'axios';
import type { QuoteCard } from './ui/KanbanApp';

// Determine API URL based on environment
const getApiUrl = () => {
  // In production (Railway), use the environment variable or relative URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If we're on Railway and no explicit URL, try to detect from window location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not localhost, assume we're on Railway and use relative path
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Try to use the same domain with /api
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }
  // Default to localhost for development
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getApiUrl()
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

export async function updateQuoteStage(id: string, stage: QuoteCard['stage'], position?: number) {
  const res = await api.patch<QuoteCard>(`/quotes/${id}/stage`, { stage, position });
  return res.data;
}

export async function updateQuotePositions(updates: Array<{ id: string; position: number; stage: QuoteCard['stage'] }>) {
  const res = await api.patch<QuoteCard[]>('/quotes/positions', { updates });
  return res.data;
}

export async function updateQuote(id: string, payload: Partial<QuoteCard>) {
  const res = await api.put<QuoteCard>(`/quotes/${id}`, payload);
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

export type Customer = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWithQuotes = Customer & {
  quotes: QuoteCard[];
};

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await api.get<Customer[]>('/customers');
  return res.data;
}

export async function fetchCustomerById(id: string): Promise<CustomerWithQuotes> {
  const res = await api.get<CustomerWithQuotes>(`/customers/${id}`);
  return res.data;
}

export async function createCustomer(name: string): Promise<Customer> {
  const res = await api.post<Customer>('/customers', { name });
  return res.data;
}

