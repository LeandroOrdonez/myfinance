import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, Clock, Filter, RefreshCw } from 'lucide-react';
import { anomalyService, AnomalyStatistics, AnomalyDetectionResult } from '../../../services/anomalyService';

interface AnomalyDashboardProps {}

export const AnomalyDashboard: React.FC<AnomalyDashboardProps> = () => {
  const [statistics, setStatistics] = useState<AnomalyStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<AnomalyDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const stats = await anomalyService.getAnomalyStatistics();
      setStatistics(stats);
      setError(null);
    } catch (err) {
      setError('Failed to load anomaly statistics');
      console.error('Error loading statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runDetection = async () => {
    try {
      setIsDetecting(true);
      const result = await anomalyService.detectAnomalies({
        force_redetection: false
      });
      setDetectionResult(result);
      await loadStatistics(); // Refresh statistics
    } catch (err) {
      setError('Failed to run anomaly detection');
      console.error('Error running detection:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'statistical_outlier': return <TrendingUp className="w-4 h-4" />;
      case 'temporal_anomaly': return <Clock className="w-4 h-4" />;
      case 'amount_anomaly': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Anomaly Detection
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and review unusual transaction patterns
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadStatistics}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={runDetection}
            disabled={isDetecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Shield className={`w-4 h-4 ${isDetecting ? 'animate-pulse' : ''}`} />
            <span>{isDetecting ? 'Detecting...' : 'Run Detection'}</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Detection Result */}
      {detectionResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Detection Complete
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-600 dark:text-green-400 font-medium">Analyzed:</span>
              <span className="ml-2 text-green-800 dark:text-green-200">
                {detectionResult.total_transactions_analyzed} transactions
              </span>
            </div>
            <div>
              <span className="text-green-600 dark:text-green-400 font-medium">Found:</span>
              <span className="ml-2 text-green-800 dark:text-green-200">
                {detectionResult.anomalies_detected} anomalies
              </span>
            </div>
            <div>
              <span className="text-green-600 dark:text-green-400 font-medium">Time:</span>
              <span className="ml-2 text-green-800 dark:text-green-200">
                {detectionResult.processing_time_seconds.toFixed(2)}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Anomalies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.total_anomalies}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Needs Review
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.unreviewed_anomalies}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Confirmed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.confirmed_anomalies}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Accuracy
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {statistics.detection_accuracy.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Type */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Anomalies by Type
              </h3>
              <div className="space-y-3">
                {Object.entries(statistics.anomalies_by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(type)}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Severity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Anomalies by Severity
              </h3>
              <div className="space-y-3">
                {Object.entries(statistics.anomalies_by_severity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity).split(' ')[1]}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {severity.toLowerCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
