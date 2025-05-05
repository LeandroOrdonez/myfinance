import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FinancialHealthScore } from '../../types/financialHealth';

const FinancialHealthDashboard: React.FC = () => {
  const [score, setScore] = useState<FinancialHealthScore | null>(null);
  const [history, setHistory] = useState<FinancialHealthScore[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api.getHealthScore('monthly', today).then(setScore);
    api.getHealthHistory('monthly').then(setHistory);
  }, []);

  return (
    <div className="space-y-6 mt-4">
      <h2 className="text-xl font-semibold">Financial Health</h2>
      {score && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Overall Score</p>
            <p className="text-2xl font-bold">{score.overall_score.toFixed(1)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Savings Rate</p>
            <p className="text-2xl font-bold">{score.savings_rate.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Expense Ratio</p>
            <p className="text-2xl font-bold">{score.expense_ratio.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Budget Adherence</p>
            <p className="text-2xl font-bold">{score.budget_adherence.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Debt-to-Income</p>
            <p className="text-2xl font-bold">{score.dti_ratio.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Emergency Fund</p>
            <p className="text-2xl font-bold">{score.emergency_fund_ratio.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Spending Stability</p>
            <p className="text-2xl font-bold">{score.spending_stability.toFixed(1)}%</p>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-medium">History</h3>
          <table className="min-w-full bg-white rounded shadow overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Score</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-t">
                  <td className="px-4 py-2">{h.date}</td>
                  <td className="px-4 py-2">{h.overall_score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinancialHealthDashboard;
