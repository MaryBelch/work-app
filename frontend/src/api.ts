import { Service, Order, Material, UserInfo, CalculationResult, Purchase, PurchaseSummary, OrderMaterial } from './types';

const API_BASE = '/api';
const PACKAGING_PRICE = 25;

let authToken: string | null = null;
let currentUser: UserInfo | null = null;

export function setToken(token: string) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export function setUser(user: UserInfo) {
  currentUser = user;
}

export function getUser(): UserInfo | null {
  return currentUser;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Ошибка запроса' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// === Auth ===
export async function login(initData: string): Promise<{ token: string; user: UserInfo }> {
  const result = await request<{ token: string; user: UserInfo }>('POST', '/auth/login', { initData });
  authToken = result.token;
  currentUser = result.user;
  return result;
}

export async function getMe(): Promise<UserInfo> {
  return request<UserInfo>('GET', '/auth/me');
}

// === Services ===
export async function getServices(): Promise<Service[]> {
  return request<Service[]>('GET', '/services');
}

export async function createService(data: Partial<Service>): Promise<Service> {
  return request<Service>('POST', '/services', data);
}

export async function updateService(id: number, data: Partial<Service>): Promise<Service> {
  return request<Service>('PUT', `/services/${id}`, data);
}

export async function deleteService(id: number): Promise<void> {
  return request<void>('DELETE', `/services/${id}`);
}

// === Orders ===
export async function getOrders(): Promise<Order[]> {
  return request<Order[]>('GET', '/orders');
}

export async function getOrder(id: number): Promise<Order & { materials: OrderMaterial[] }> {
  return request<Order & { materials: OrderMaterial[] }>('GET', `/orders/${id}`);
}

export async function createOrder(data: Partial<Omit<Order, 'materials'>> & { materials?: Array<{ material_name: string; pieces_used: number; cost_price: number }> }): Promise<Order> {
  return request<Order>('POST', '/orders', data);
}

export async function deleteOrder(id: number): Promise<void> {
  return request<void>('DELETE', `/orders/${id}`);
}

// === Purchases ===
export async function getPurchases(type?: 'poligraphy' | 'epoxy'): Promise<Purchase[]> {
  const query = type ? `?type=${type}` : '';
  return request<Purchase[]>('GET', `/purchases${query}`);
}

export async function getPurchaseSummary(): Promise<PurchaseSummary[]> {
  return request<PurchaseSummary[]>('GET', '/purchases/summary');
}

export async function createPurchase(data: {
  type: 'poligraphy' | 'epoxy';
  name: string;
  quantity_packages: number;
  pieces_per_package: number;
  price_per_package: number;
}): Promise<Purchase> {
  return request<Purchase>('POST', '/purchases', data);
}

export async function updatePurchase(id: number, data: Partial<Purchase>): Promise<Purchase> {
  return request<Purchase>('PUT', `/purchases/${id}`, data);
}

export async function deletePurchase(id: number): Promise<void> {
  return request<void>('DELETE', `/purchases/${id}`);
}

// === Materials (old, keep for compatibility) ===
export async function getMaterials(type: 'poligraphy' | 'epoxy'): Promise<Material[]> {
  return request<Material[]>('GET', `/materials/${type}`);
}

export async function createMaterial(type: 'poligraphy' | 'epoxy', data: Partial<Material>): Promise<Material> {
  return request<Material>('POST', `/materials/${type}`, data);
}

export async function updateMaterial(type: 'poligraphy' | 'epoxy', id: number, data: Partial<Material>): Promise<Material> {
  return request<Material>('PUT', `/materials/${type}/${id}`, data);
}

export async function deleteMaterial(type: 'poligraphy' | 'epoxy', id: number): Promise<void> {
  return request<void>('DELETE', `/materials/${type}/${id}`);
}

// === Calculation ===
export function calculatePrice(
  basePrice: number,
  designPrice: number,
  quantity: number,
  needsDesign: boolean,
  needsPackaging: boolean
): CalculationResult {
  let unitPrice: number;
  let discountPercent = 0;

  if (quantity >= 500) {
    unitPrice = basePrice * 0.7;
    discountPercent = 30;
  } else if (quantity >= 250) {
    unitPrice = basePrice * 0.85;
    discountPercent = 15;
  } else if (quantity >= 100) {
    unitPrice = basePrice * 0.9;
    discountPercent = 10;
  } else {
    unitPrice = basePrice;
  }

  const designCost = needsDesign ? designPrice : 0;
  const packagingCost = needsPackaging ? PACKAGING_PRICE : 0;

  const total = unitPrice * quantity + designCost + packagingCost;

  return {
    unitPrice: Math.round(unitPrice * 100) / 100,
    designCost,
    packagingCost,
    total: Math.round(total * 100) / 100,
    discountPercent,
  };
}

export { PACKAGING_PRICE };
