// src/types/index.ts

export interface NutritionItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface NutritionTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type ScanType = 'product' | 'meal';
export type DataSource = 'openfoodfacts' | 'usda' | 'ai_estimation';

export interface ScanResult {
  scan_id: string;
  type: ScanType;
  items: NutritionItem[];
  total: NutritionTotal;
  data_source: DataSource;
  confidence_global: number;
  product_name?: string;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  image_url?: string;
  scan_type: ScanType;
  result: ScanResult;
  created_at: string;
  meal_date: string;
}

export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  scan_count: number;
}

export interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DashboardData {
  date: string;
  consumed: DailyTotals;
  goals: UserGoals;
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  remaining: UserGoals;
}
