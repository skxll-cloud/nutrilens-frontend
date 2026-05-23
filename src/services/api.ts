// src/services/api.ts
import { supabase } from './supabase';
import { ScanResult, ScanRecord, DashboardData, UserGoals } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

export async function scanImage(imageUri: string, mimeType = 'image/jpeg'): Promise<ScanResult> {
  const headers = await getAuthHeader();

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: mimeType,
    name: 'scan.jpg',
  } as any);

  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { ...headers },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? 'Scan failed');
  }

  return response.json();
}

export async function getHistory(limit = 50): Promise<{ scans: ScanRecord[]; grouped_by_day: Record<string, ScanRecord[]> }> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/history?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function getDayHistory(date: string): Promise<{ scans: ScanRecord[]; totals: any }> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/history/day/${date}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch day history');
  return res.json();
}

export async function deleteScan(scanId: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/history/${scanId}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete scan');
}

export async function getDashboard(): Promise<DashboardData> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/goals/dashboard`, { headers });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function getGoals(): Promise<UserGoals> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/goals`, { headers });
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function updateGoals(goals: UserGoals): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE}/goals`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(goals),
  });
  if (!res.ok) throw new Error('Failed to update goals');
}
