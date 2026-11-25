import React from 'react';
import { getScoreColor, getScoreTextColor } from './scoreStyles';

interface ComponentScoresProps {
  healthData: {
    savings_rate_score: number;
    expense_ratio_score: number;
    budget_adherence_score: number;
    debt_to_income_score: number;
    emergency_fund_score: number;
    spending_stability_score: number;
    investment_rate_score: number;
    savings_rate: number;
    expense_ratio: number;
    budget_adherence: number;
    debt_to_income: number;
    emergency_fund_months: number;
    spending_stability: number;
    investment_rate: number;
  };
}

interface ComponentMetric {
  key: string;
  name: string;
  score: number;
  value: string;
  description: string;
  direction: 'higher' | 'lower';
}

interface ComponentGroup {
  name: string;
  metrics: ComponentMetric[];
}

const ComponentScores: React.FC<ComponentScoresProps> = ({ healthData }) => {
  const groups: ComponentGroup[] = [
    {
      name: 'Cash flow',
      metrics: [
        {
          key: 'savings_rate',
          name: 'Savings Rate',
          score: healthData.savings_rate_score,
          value: `${(healthData.savings_rate * 100).toFixed(1)}%`,
          description: 'Percentage of income saved',
          direction: 'higher'
        },
        {
          key: 'expense_ratio',
          name: 'Expense Ratio',
          score: healthData.expense_ratio_score,
          value: `${(healthData.expense_ratio * 100).toFixed(1)}%`,
          description: 'Expenses as percentage of income',
          direction: 'lower'
        },
        {
          key: 'budget_adherence',
          name: 'Budget Adherence',
          score: healthData.budget_adherence_score,
          value: `${(healthData.budget_adherence * 100).toFixed(1)}%`,
          description: 'How well you stay within budget',
          direction: 'higher'
        },
        {
          key: 'spending_stability',
          name: 'Spending Stability',
          score: healthData.spending_stability_score,
          value: `${(healthData.spending_stability * 100).toFixed(1)}%`,
          description: 'Consistency of spending patterns',
          direction: 'higher'
        }
      ]
    },
    {
      name: 'Resilience',
      metrics: [
        {
          key: 'emergency_fund',
          name: 'Emergency Fund',
          score: healthData.emergency_fund_score,
          value: `${healthData.emergency_fund_months.toFixed(1)} months`,
          description: 'Months of expenses in savings',
          direction: 'higher'
        },
        {
          key: 'debt_to_income',
          name: 'Debt-to-Income',
          score: healthData.debt_to_income_score,
          value: `${(healthData.debt_to_income * 100).toFixed(1)}%`,
          description: 'Debt payments as percentage of income',
          direction: 'lower'
        }
      ]
    },
    {
      name: 'Growth',
      metrics: [
        {
          key: 'investment_rate',
          name: 'Investment Rate',
          score: healthData.investment_rate_score,
          value: `${(healthData.investment_rate * 100).toFixed(1)}%`,
          description: 'Percentage of income invested',
          direction: 'higher'
        }
      ]
    }
  ];

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <section key={group.name} aria-label={group.name}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            {group.name}
          </h3>
          <div className="space-y-3">
            {group.metrics.map(component => (
              <div key={component.key}>
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium text-[var(--color-text-primary)]">{component.name}</div>
                  <div className={`font-semibold ${getScoreTextColor(component.score)}`}>
                    {component.score.toFixed(0)}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">/100</span>
                  </div>
                </div>
                <div
                  className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5"
                  role="img"
                  aria-label={`${component.name} score: ${component.score.toFixed(0)} out of 100`}
                >
                  <div
                    className={`h-2.5 rounded-full ${getScoreColor(component.score)}`}
                    style={{ width: `${component.score}%` }}
                  ></div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  {component.description}: {component.value} · {component.direction === 'higher' ? 'higher is better' : 'lower is better'}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ComponentScores;
