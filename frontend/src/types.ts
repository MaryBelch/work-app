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
  materials?: OrderMaterial[];
}

export interface OrderMaterial {
  id: number;
  order_id: number;
  material_name: string;
  pieces_used: number;
  cost_price: number;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

export interface Purchase {
  id: number;
  type: 'poligraphy' | 'epoxy';
  name: string;
  quantity_packages: number;
  pieces_per_package: number;
  price_per_package: number;
  price_total: number;
  pieces_total: number;
  created_at: string;
}

export interface PurchaseSummary {
  name: string;
  type: string;
  purchase_count: number;
  total_pieces: number;
  total_spent: number;
  used_pieces: number;
  used_cost: number;
  remaining_pieces: number;
}

export interface UserInfo {
  telegram_id: string;
  name: string;
}

export interface Equipment {
  id: number;
  name: string;
  purchase_price: number;
  quantity: number;
  notes: string;
  created_at: string;
}

export interface RecoupmentSummary {
  total_equipment_cost: number;
  total_profit: number;
  remaining_to_recoup: number;
  recouped_percent: number;
  is_recouped: boolean;
}

export interface CalculationResult {
  unitPrice: number;
  designCost: number;
  packagingCost: number;
  total: number;
  discountPercent: number;
}
