import React, { useState, useEffect } from 'react';
import { financialHealthService } from '../../services/financialHealthService';
import { FinancialHealthScore, FinancialHealthHistory, Recommendation } from '../../types/transaction';
import HealthScoreGauge from './health/HealthScoreGauge';
import ComponentScores from './health/ComponentScores';
import HealthTrends from './health/HealthTrends';
import Recommendations from './health/Recommendations';
import PeriodSelector from '../common/PeriodSelector';

interface FinancialHealthProps {
  className?: string;
}

const FinancialHealth: React.FC<FinancialHealthProps> = ({ className }) => {
  const [healthData, setHealthData] = useState<FinancialHealthScore | null>(null);
  const [historyData, setHistoryData] = useState<FinancialHealthHistory | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('6m');

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const data = await financialHealthService.getFinancialHealthScore();
      setHealthData(data);
    } catch (err) {
      console.error('Error fetching health score:', err);
      setError('Failed to load financial health data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    try {
      const months = period === '3m' ? 3 : 
                    period === '6m' ? 6 : 
                    period === 'ytd' ? new Date().getMonth() : 
                    period === '1y' ? 12 : 
                    period === '2y' ? 24 : 36;
                    
      const data = await financialHealthService.getFinancialHealthHistory(months);
      setHistoryData(data);
    } catch (err) {
      console.error('Error fetching health history:', err);
      setError('Failed to load financial health history');
    }
  };

  const fetchRecommendations = async () => {
    try {
      const data = await financialHealthService.getRecommendations();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    }
  };

  const handleRecommendationUpdate = async (id: number, isCompleted: boolean) => {
    try {
      await financialHealthService.updateRecommendation(id, isCompleted);
      
      // Refresh recommendations
      fetchRecommendations();
    } catch (err) {
      console.error('Error updating recommendation:', err);
      setError('Failed to update recommendation');
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  useEffect(() => {
    fetchHealthData();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    fetchHistoryData();
  }, [period]);

  if (loading && !healthData) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="flex justify-end mb-4">
          <PeriodSelector 
            selectedPeriod={period} 
            onChange={handlePeriodChange} 
          />
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Loading financial health data...</p>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="flex justify-end mb-4">
          <PeriodSelector 
            selectedPeriod={period} 
            onChange={handlePeriodChange} 
          />
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-lg transition-all duration-300 border border-gray-100 ${className}`}>
      <div className="flex justify-end items-center mb-4">
        <PeriodSelector 
          selectedPeriod={period} 
          onChange={handlePeriodChange} 
        />
      </div>

      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Score gauge and component breakdown */}
          <div className="lg:col-span-1">
            <HealthScoreGauge score={healthData.overall_score} />
            <ComponentScores healthData={healthData} />
          </div>

          {/* Right columns - Trends and recommendations */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <HealthTrends historyData={historyData} />
            </div>
            <div>
              <Recommendations 
                recommendations={recommendations} 
                onUpdate={handleRecommendationUpdate} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialHealth;
