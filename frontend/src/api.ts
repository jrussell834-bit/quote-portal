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
    return res.data as { message: string; user: { id: string; email: string; approved: boolean } };
  } catch (error: any) {
    console.error('Register API error:', error);
    throw error;
  }
}

export async function login(username: string, password: string) {
  try {
    const res = await api.post('/auth/login', { username, password });
    return res.data as { token: string; user: { id: string; email: string; approved: boolean } };
  } catch (error: any) {
    console.error('Login API error:', error);
    throw error;
  }
}

export type User = {
  id: string;
  email: string;
  approved: boolean;
  createdAt: string;
};

// Admin API functions
export async function fetchAllUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/admin/users');
  return res.data;
}

export async function fetchPendingUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/admin/users/pending');
  return res.data;
}

export async function approveUser(userId: string): Promise<{ message: string; user: User }> {
  const res = await api.post<{ message: string; user: User }>(`/admin/users/${userId}/approve`);
  return res.data;
}

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  industry?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWithQuotes = Customer & {
  quotes: QuoteCard[];
};

export type Contact = {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  customerId: string;
  contactId?: string | null;
  quoteId?: string | null;
  type: string;
  subject?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  activityDate: string;
  contactName?: string | null;
  quoteTitle?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  customerId?: string | null;
  contactId?: string | null;
  quoteId?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  contactName?: string | null;
  quoteTitle?: string | null;
  customerName?: string | null;
  createdAt: string;
  updatedAt: string;
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

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
  const res = await api.put<Customer>(`/customers/${id}`, payload);
  return res.data;
}

// Contact API functions
export async function fetchContactsByCustomerId(customerId: string): Promise<Contact[]> {
  const res = await api.get<Contact[]>(`/customers/${customerId}/contacts`);
  return res.data;
}

export async function createContact(customerId: string, payload: Partial<Contact>): Promise<Contact> {
  const res = await api.post<Contact>(`/customers/${customerId}/contacts`, payload);
  return res.data;
}

export async function updateContact(id: string, payload: Partial<Contact>): Promise<Contact> {
  const res = await api.put<Contact>(`/contacts/${id}`, payload);
  return res.data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

// Activity API functions
export async function fetchActivitiesByCustomerId(customerId: string): Promise<Activity[]> {
  const res = await api.get<Activity[]>(`/customers/${customerId}/activities`);
  return res.data;
}

export async function createActivity(customerId: string, payload: Partial<Activity>): Promise<Activity> {
  const res = await api.post<Activity>(`/customers/${customerId}/activities`, payload);
  return res.data;
}

export async function uploadActivityAttachment(customerId: string, activityId: string, file: File): Promise<Activity> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<Activity>(`/customers/${customerId}/activities/${activityId}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

// Task API functions
export async function fetchAllTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks');
  return res.data;
}

export async function fetchMyTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks/my');
  return res.data;
}

export async function fetchTasksByCustomerId(customerId: string): Promise<Task[]> {
  const res = await api.get<Task[]>(`/customers/${customerId}/tasks`);
  return res.data;
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const res = await api.post<Task>('/tasks', payload);
  return res.data;
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
  const res = await api.put<Task>(`/tasks/${id}`, payload);
  return res.data;
}

