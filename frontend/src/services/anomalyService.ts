import { API_BASE_URL } from '../config';

export interface AnomalyType {
  STATISTICAL_OUTLIER: string;
  TEMPORAL_ANOMALY: string;
  AMOUNT_ANOMALY: string;
  FREQUENCY_ANOMALY: string;
  BEHAVIORAL_ANOMALY: string;
  MERCHANT_ANOMALY: string;
}

export interface AnomalySeverity {
  LOW: string;
  MEDIUM: string;
  HIGH: string;
  CRITICAL: string;
}

export interface AnomalyStatus {
  DETECTED: string;
  REVIEWED: string;
  CONFIRMED: string;
  FALSE_POSITIVE: string;
  IGNORED: string;
}

export interface Transaction {
  id: number;
  account_number: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty_name?: string;
  counterparty_account?: string;
  transaction_type: string;
  expense_category?: string;
  income_category?: string;
  source_bank: string;
}

export interface Anomaly {
  id: number;
  transaction_id: number;
  anomaly_type: string;
  severity: string;
  status: string;
  anomaly_score: number;
  confidence: number;
  detection_method: string;
  detection_timestamp: string;
  reason: string;
  details?: string;
  expected_value?: number;
  actual_value?: number;
  deviation_magnitude?: number;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  transaction?: Transaction;
}

export interface AnomalyPage {
  items: Anomaly[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnomalyStatistics {
  total_anomalies: number;
  unreviewed_anomalies: number;
  confirmed_anomalies: number;
  false_positives: number;
  anomalies_by_type: Record<string, number>;
  anomalies_by_severity: Record<string, number>;
  detection_accuracy: number;
}

export interface AnomalyDetectionRequest {
  transaction_ids?: number[];
  start_date?: string;
  end_date?: string;
  force_redetection?: boolean;
}

export interface AnomalyDetectionResult {
  total_transactions_analyzed: number;
  anomalies_detected: number;
  anomalies_by_type: Record<string, number>;
  anomalies_by_severity: Record<string, number>;
  processing_time_seconds: number;
}

export interface AnomalyRule {
  id: number;
  name: string;
  description?: string;
  rule_type: string;
  category_filter?: string;
  merchant_filter?: string;
  amount_threshold?: number;
  frequency_threshold?: number;
  time_period_days: number;
  is_active: boolean;
  severity_override?: string;
  created_at: string;
  updated_at: string;
}

class AnomalyService {
  private baseUrl = `${API_BASE_URL}/anomalies`;

  async detectAnomalies(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResult> {
    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to detect anomalies: ${response.statusText}`);
    }

    return response.json();
  }

  async getAnomalies(
    page: number = 1,
    pageSize: number = 20,
    filters: {
      status?: string;
      severity?: string;
      anomaly_type?: string;
      sort_by?: string;
      sort_direction?: string;
    } = {}
  ): Promise<AnomalyPage> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ),
    });

    const response = await fetch(`${this.baseUrl}/?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch anomalies: ${response.statusText}`);
    }

    return response.json();
  }

  async getAnomalyStatistics(): Promise<AnomalyStatistics> {
    const response = await fetch(`${this.baseUrl}/statistics`);

    if (!response.ok) {
      throw new Error(`Failed to fetch anomaly statistics: ${response.statusText}`);
    }

    return response.json();
  }

  async getAnomalyDetail(anomalyId: number): Promise<Anomaly> {
    const response = await fetch(`${this.baseUrl}/${anomalyId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch anomaly detail: ${response.statusText}`);
    }

    return response.json();
  }

  async updateAnomalyStatus(
    anomalyId: number,
    status: string,
    reviewNotes?: string
  ): Promise<Anomaly> {
    const response = await fetch(`${this.baseUrl}/${anomalyId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        review_notes: reviewNotes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update anomaly status: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteAnomaly(anomalyId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${anomalyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete anomaly: ${response.statusText}`);
    }
  }

  async getAnomalyRules(): Promise<AnomalyRule[]> {
    const response = await fetch(`${this.baseUrl}/rules/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch anomaly rules: ${response.statusText}`);
    }

    return response.json();
  }

  async createAnomalyRule(rule: Partial<AnomalyRule>): Promise<AnomalyRule> {
    const response = await fetch(`${this.baseUrl}/rules/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
    });

    if (!response.ok) {
      throw new Error(`Failed to create anomaly rule: ${response.statusText}`);
    }

    return response.json();
  }

  async updateAnomalyRule(ruleId: number, updates: Partial<AnomalyRule>): Promise<AnomalyRule> {
    const response = await fetch(`${this.baseUrl}/rules/${ruleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update anomaly rule: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteAnomalyRule(ruleId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rules/${ruleId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete anomaly rule: ${response.statusText}`);
    }
  }
}

export const anomalyService = new AnomalyService();
