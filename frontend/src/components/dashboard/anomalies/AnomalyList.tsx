import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, Check, X, Clock, TrendingUp, Shield, Filter } from 'lucide-react';
import { anomalyService, Anomaly, AnomalyPage } from '../../../services/anomalyService';
import { Pagination } from '../../common/Pagination';

interface AnomalyListProps {}

export const AnomalyList: React.FC<AnomalyListProps> = () => {
  const [anomalies, setAnomalies] = useState<AnomalyPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    anomaly_type: '',
    sort_by: 'detection_timestamp',
    sort_direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadAnomalies();
  }, [currentPage, filters]);

  const loadAnomalies = async () => {
    try {
      setIsLoading(true);
      const data = await anomalyService.getAnomalies(currentPage, 20, filters);
      setAnomalies(data);
      setError(null);
    } catch (err) {
      setError('Failed to load anomalies');
      console.error('Error loading anomalies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (anomalyId: number, status: string) => {
    try {
      await anomalyService.updateAnomalyStatus(anomalyId, status, reviewNotes);
      setReviewNotes('');
      setSelectedAnomaly(null);
      await loadAnomalies();
    } catch (err) {
      setError('Failed to update anomaly status');
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteAnomaly = async (anomalyId: number) => {
    try {
      await anomalyService.deleteAnomaly(anomalyId);
      await loadAnomalies();
    } catch (err) {
      setError('Failed to delete anomaly');
      console.error('Error deleting anomaly:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'detected': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'confirmed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'false_positive': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'reviewed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(Math.abs(amount));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Anomaly Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and manage detected transaction anomalies
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="Detected">Detected</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Confirmed">Confirmed</option>
            <option value="False Positive">False Positive</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filters.anomaly_type}
            onChange={(e) => setFilters({...filters, anomaly_type: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="Statistical Outlier">Statistical Outlier</option>
            <option value="Temporal Anomaly">Temporal Anomaly</option>
            <option value="Amount Anomaly">Amount Anomaly</option>
            <option value="Frequency Anomaly">Frequency Anomaly</option>
            <option value="Behavioral Anomaly">Behavioral Anomaly</option>
            <option value="Merchant Anomaly">Merchant Anomaly</option>
          </select>
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

      {/* Anomalies List */}
      {anomalies && (
        <>
          <div className="space-y-4">
            {anomalies.items.map((anomaly) => (
              <div
                key={anomaly.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(anomaly.anomaly_type)}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {anomaly.anomaly_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(anomaly.status)}`}>
                        {anomaly.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {anomaly.reason}
                    </p>

                    {anomaly.transaction && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Date:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {new Date(anomaly.transaction.transaction_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {formatCurrency(anomaly.transaction.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Description:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                              {anomaly.transaction.description}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Score: {anomaly.anomaly_score.toFixed(1)}</span>
                      <span>Confidence: {(anomaly.confidence * 100).toFixed(1)}%</span>
                      <span>Detected: {new Date(anomaly.detection_timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedAnomaly(anomaly)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {anomaly.status === 'Detected' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(anomaly.id, 'Confirmed')}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Confirm Anomaly"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnomaly(anomaly.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Mark as False Positive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {anomalies.total_pages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={anomalies.total_pages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Anomaly Detail Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Anomaly Details
                </h2>
                <button
                  onClick={() => setSelectedAnomaly(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Type</label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedAnomaly.anomaly_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Severity</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedAnomaly.severity)}`}>
                      {selectedAnomaly.severity}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Reason</label>
                  <p className="text-gray-900 dark:text-white">{selectedAnomaly.reason}</p>
                </div>

                {selectedAnomaly.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Technical Details</label>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto">
                      {JSON.stringify(JSON.parse(selectedAnomaly.details), null, 2)}
                    </pre>
                  </div>
                )}

                {selectedAnomaly.status === 'DETECTED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Add review notes..."
                    />
                    <div className="flex space-x-3 mt-3">
                      <button
                        onClick={() => handleStatusUpdate(selectedAnomaly.id, 'CONFIRMED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm Anomaly
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedAnomaly.id, 'FALSE_POSITIVE')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Mark as False Positive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
