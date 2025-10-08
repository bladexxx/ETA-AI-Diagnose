// FIX: Implemented full type definitions to resolve module errors.

export interface POLine {
  po_line_id: string;
  vendor: string;
  vendor_number: number;
  esd: string; // Early Ship Date
  eta: string; // Estimated Time of Arrival
  scheduled_ship_qty: number;
  shipped_qty: number;
  open_qty: number;
  unscheduled_qty: number;
  transit_time_days: number;
  tracking_number: string | null;
}

export interface POLog {
  log_id: string;
  po_line_id: string;
  change_date: string;
  changed_field: string;
  old_value: string | number | null;
  new_value: string | number | null;
}

export interface VendorStats {
  name: string;
  vendorNumber: number;
  totalLines: number;
  pastDueLinesCount: number;
  pastDuePercentage: number;
  trend: 'improving' | 'worsening' | 'stable';
  recentNegativeChanges: number;
}

export interface Alert {
  id: string;
  vendor: string;
  message: string;
  timestamp: string;
  severity: 'Critical' | 'Warning';
}

export enum Tab {
  Monitoring = 'Monitoring',
  Analysis = 'Analysis',
  RiskAndSim = 'RiskAndSim',
}

// For structured AI Risk Prediction
export interface RiskAssessmentResult {
  po_line_id: string;
  risk_level: 'High' | 'Medium' | 'Low';
  justification: string;
}

export interface EnrichedRiskAssessmentResult extends RiskAssessmentResult {
  vendor: string;
}

export type JustificationCategory = {
  category: string;
  count: number;
};

export type Language = 'en' | 'zh';

// For structured AI Root Cause Analysis
export interface AnalysisCategory {
  category: 'Vendor Issues' | 'Internal (EMT) Issues';
  points: string[]; // Each string is a markdown-formatted analysis point
}

export interface CategorizedAnalysisResult {
  summary: string; // A high-level summary paragraph
  analysis: AnalysisCategory[];
}
