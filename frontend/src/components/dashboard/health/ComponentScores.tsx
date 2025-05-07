import React from 'react';

interface ComponentScoresProps {
  healthData: {
    savings_rate_score: number;
    expense_ratio_score: number;
    budget_adherence_score: number;
    debt_to_income_score: number;
    emergency_fund_score: number;
    spending_stability_score: number;
    savings_rate: number;
    expense_ratio: number;
    budget_adherence: number;
    debt_to_income: number;
    emergency_fund_months: number;
    spending_stability: number;
  };
}

const ComponentScores: React.FC<ComponentScoresProps> = ({ healthData }) => {
  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-green-400';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Component data with labels and descriptions
  const components = [
    {
      key: 'savings_rate',
      name: 'Savings Rate',
      score: healthData.savings_rate_score,
      value: `${(healthData.savings_rate * 100).toFixed(1)}%`,
      description: 'Percentage of income saved'
    },
    {
      key: 'expense_ratio',
      name: 'Expense Ratio',
      score: healthData.expense_ratio_score,
      value: `${(healthData.expense_ratio * 100).toFixed(1)}%`,
      description: 'Expenses as percentage of income'
    },
    {
      key: 'budget_adherence',
      name: 'Budget Adherence',
      score: healthData.budget_adherence_score,
      value: `${(healthData.budget_adherence * 100).toFixed(1)}%`,
      description: 'How well you stay within budget'
    },
    {
      key: 'debt_to_income',
      name: 'Debt-to-Income',
      score: healthData.debt_to_income_score,
      value: `${(healthData.debt_to_income * 100).toFixed(1)}%`,
      description: 'Debt payments as percentage of income'
    },
    {
      key: 'emergency_fund',
      name: 'Emergency Fund',
      score: healthData.emergency_fund_score,
      value: `${healthData.emergency_fund_months.toFixed(1)} months`,
      description: 'Months of expenses in savings'
    },
    {
      key: 'spending_stability',
      name: 'Spending Stability',
      score: healthData.spending_stability_score,
      value: `${(healthData.spending_stability * 100).toFixed(1)}%`,
      description: 'Consistency of spending patterns'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-medium mb-3 dark:text-white">Score Breakdown</h3>
      <div className="space-y-3">
        {components.map((component) => (
          <div key={component.key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <div className="font-medium dark:text-white">{component.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{component.value}</div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${getScoreColor(component.score)}`} 
                style={{ width: `${component.score}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{component.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentScores;
