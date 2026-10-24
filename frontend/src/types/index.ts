export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'pharmacist' | 'cashier';
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  category_id?: string;
  barcode?: string;
  sku?: string;
  manufacturer?: string;
  strength?: string;
  dosage_form?: string;
  pack_size?: string;
  unit?: string;
  prescription_required?: number;
  is_active?: number;
  min_stock_level?: number;
  supplier_id?: string;
  category_name?: string;
  supplier_name?: string;
}

export interface MedicineBatch {
  id: string;
  medicine_id: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  purchase_price: number;
  selling_price: number;
  current_quantity: number;
  received_date?: string;
  is_active?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  outstanding_balance?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  outstanding_balance?: number;
  total_purchases?: number;
}

export interface SaleItem {
  medicine_batch_id: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  cashier_id?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  amount_received: number;
  change_due: number;
  status: string;
  created_at: string;
  customer_name?: string;
  cashier_name?: string;
  items?: SaleItemWithBatch[];
}

export interface SaleItemWithBatch extends SaleItem {
  id: string;
  invoice_id: string;
  medicine_name: string;
  batch_number?: string;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  description?: string;
  recorded_by?: string;
  created_at: string;
}

export interface DashboardStats {
  today_sales: number;
  today_bills: number;
  total_purchases: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_operating_profit: number;
  cash_received: number;
  card_received: number;
  bank_received: number;
  outstanding_customers: number;
  outstanding_suppliers: number;
  inventory_value: number;
  low_stock_count: number;
  near_expiry_value: number;
  expired_value: number;
}

export interface Settings {
  id: number;
  pharmacy_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  currency_symbol: string;
  timezone: string;
}

export interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  reason?: string;
  created_at: string;
  medicine_name?: string;
  batch_number?: string;
}