export interface Admin {
  id: number;
  telegram_id: string;
  name: string;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  format: string;
  base_price: number;
  design_price: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  client_name: string;
  service_id: number;
  service_name: string;
  quantity: number;
  needs_design: number;
  needs_packaging: number;
  base_price: number;
  design_price: number;
  unit_price: number;
  total: number;
  cost_price: number;
  received_amount: number;
  created_by_telegram_id: string;
  created_by_name: string;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

export interface InitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: string;
  hash: string;
}

export interface JwtPayload {
  telegram_id: string;
  name: string;
  iat?: number;
  exp?: number;
}
