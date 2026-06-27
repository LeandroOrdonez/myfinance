import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { budgetService } from '../../services/budgetService';
import { Budget, BudgetProgress } from '../../types/budget';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';
import { DashboardCard } from './DashboardCard';
import { Loading } from '../common/Loading';
import { BudgetCard } from './BudgetCard';
import { BudgetFormDialog } from './BudgetFormDialog';

const CHART_TOP_N = 8;

interface BudgetBarEntry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  Limit?: number;
  Spent?: number;
  chartHeight?: number;
}

/** Renders a single bar showing the budget limit as a dashed-border container
 *  and the spent amount as a solid filled bar inside it. */
const BudgetBarShape = ({ x = 0, y = 0, width = 0, height = 0, Limit = 0, Spent = 0 }: BudgetBarEntry) => {
  if (!Limit || width <= 0 || height <= 0) return null;
  const spentHeight = Math.round((Spent / Limit) * height);
  const spentY = y + height - spentHeight;
  const inset = 3;

  return (
    <g>
      {/* Limit: dashed border, light background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#EF4444"
        fillOpacity={0.12}
        stroke="#EF4444"
        strokeWidth={1.}
        strokeDasharray="5 3"
        rx={4}
        ry={4}
      />
      {/* Spent: solid bar inset within the limit bar */}
      {spentHeight > 0 && (
        <rect
          x={x + inset}
          y={spentY}
          width={Math.max(0, width - inset * 2)}
          height={spentHeight}
          fill="#6366F1"
          fillOpacity={0.85}
          stroke="#6366F1"
          strokeWidth={1.5}
          rx={3}
          ry={3}
        />
      )}
    </g>
  );
};

export const Budgets: React.FC = () => {
  const { privacyMode } = usePrivacyMode();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [budgetsData, progressData] = await Promise.all([
        budgetService.getBudgets(),
        budgetService.getProgress(),
      ]);
      setBudgets(budgetsData);
      setProgress(progressData);
      setError(null);
    } catch (err) {
      setError('Failed to load budgets');
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setEditingBudget(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleDelete = async (budget: Budget) => {
    if (!window.confirm(`Delete the budget for ${budget.category}?`)) return;
    try {
      await budgetService.deleteBudget(budget.id);
      refresh();
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  const progressByCategory = new Map(progress.map((p) => [p.category, p]));

  const formatCurrency = (value: number) =>
    formatPrivateAmount(
      value,
      privacyMode,
      (n) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n)
    );

  const chartData = [...progress]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, CHART_TOP_N)
    .map((p) => ({
      name: String(p.category),
      Limit: p.limit_amount,
      Spent: p.spent,
    }));

  if (loading) {
    return <Loading variant="progress" size="large" />;
  }

  if (error) {
    return (
      <div className="mt-4">
        <DashboardCard>
          <p className="text-center text-[var(--color-danger)] py-6">{error}</p>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Budgets</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Set monthly spending limits per category and track your progress.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent-dark transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Add budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="w-10 h-10 text-[var(--color-text-muted)] mb-3" />
            <p className="text-[var(--color-text-primary)] font-medium">No budgets yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Create a budget to start tracking your category spending.
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              progress={progressByCategory.get(budget.category)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <DashboardCard title="Budget vs. Actual">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="#9ca3af"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  className="dark:text-gray-400"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  stroke="#9ca3af"
                  className="dark:text-gray-400"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'var(--color-tooltip-bg)',
                    borderColor: 'var(--color-tooltip-border)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-tooltip-border)',
                  }}
                  itemStyle={{ color: 'var(--color-tooltip-text)' }}
                  labelStyle={{ color: 'var(--color-tooltip-text)', fontWeight: 'bold' }}
                />
                <Legend
                  payload={[
                    { value: 'Limit', type: 'rect', color: '#EF4444', id: 'limit' },
                    { value: 'Spent', type: 'rect', color: '#6366F1', id: 'spent' },
                  ]}
                  formatter={(value) => (
                    <span style={{ fontSize: 12 }}>{value}</span>
                  )}
                />
                <Bar dataKey="Limit" barSize={48} shape={<BudgetBarShape />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editingBudget}
        existingCategories={budgets.map((b) => String(b.category))}
        onSaved={refresh}
      />
    </div>
  );
};

export default Budgets;
