import React, { useState, useEffect, useCallback } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { statisticService } from '../../services/statisticService';
import { TransactionType, TimePeriod } from '../../types/transaction';
import { buildSankeyData, CategoryAverageItem, SankeyData } from './sankey/buildSankeyData';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';
import { DashboardCard } from './DashboardCard';
import { ChartState } from './ChartState';

// Color schemes
const INCOME_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
const EXPENSE_COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#db2777', '#be185d', '#9d174d', '#831843'];
const CENTRAL_INCOME_COLOR = '#059669';
const EXPENSE_PRIMARY_COLOR = '#ec4899';
const SAVINGS_COLOR = '#3b82f6';

interface CashFlowsProps {
  period: TimePeriod;
}

export const CashFlows: React.FC<CashFlowsProps> = ({ period }) => {
  const { privacyMode } = usePrivacyMode();
  const formatCurrency = (amount: number) =>
    formatPrivateAmount(
      amount,
      privacyMode,
      (n) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n)
    );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [metadata, setMetadata] = useState<{ start_date: string; end_date: string; months_count: number } | null>(null);
  const [nodeInfo, setNodeInfo] = useState<{ incomeCatCount: number; hasSavings: boolean }>({ incomeCatCount: 0, hasSavings: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incomeData, expenseData] = await Promise.all([
        statisticService.getCategoryAverages(TransactionType.INCOME, undefined, undefined, period),
        statisticService.getCategoryAverages(TransactionType.EXPENSE, undefined, undefined, period),
      ]);

      const data = buildSankeyData(incomeData.categories, expenseData.categories, 6);
      setSankeyData(data);
      setMetadata({
        start_date: incomeData.start_date,
        end_date: incomeData.end_date,
        months_count: incomeData.months_count,
      });

      const totalIncome = incomeData.categories.reduce((sum: number, cat: CategoryAverageItem) => sum + cat.average_amount, 0);
      const totalExpenses = expenseData.categories.reduce((sum: number, cat: CategoryAverageItem) => sum + cat.average_amount, 0);
      const hasSavings = totalIncome > totalExpenses;
      const incomeCatCount = Math.min(6, incomeData.categories.length);
      setNodeInfo({ incomeCatCount, hasSavings });

      setError(null);
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError('Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getNodeColor = useCallback((index: number): string => {
    if (!sankeyData) return '#6b7280';
    
    const { incomeCatCount, hasSavings } = nodeInfo;
    const totalNodes = sankeyData.nodes.length;
    const totalIncomeIdx = incomeCatCount;
    const expenseStartIdx = incomeCatCount + 1;
    
    if (hasSavings && index === totalNodes - 1) {
      return SAVINGS_COLOR;
    }
    
    if (index < totalIncomeIdx) {
      return INCOME_COLORS[index % INCOME_COLORS.length];
    } else if (index === totalIncomeIdx) {
      return CENTRAL_INCOME_COLOR;
    } else if (index >= expenseStartIdx) {
      const expenseIdx = index - expenseStartIdx;
      return EXPENSE_COLORS[expenseIdx % EXPENSE_COLORS.length];
    }
    
    return '#6b7280';
  }, [sankeyData, nodeInfo]);

  const CustomNode = ({ x, y, width, height, index, payload }: any) => {
    const color = getNodeColor(index);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity={0.9}
          rx={2}
          ry={2}
        />
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="middle"
          style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
        >
          {payload.name}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      // Check if this is a link (has source and target in payload)
      if (data.payload?.source && data.payload?.target) {
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg"
               style={{ 
                 backgroundColor: 'var(--color-tooltip-bg)', 
                 borderColor: 'var(--color-tooltip-border)',
                 color: 'var(--color-tooltip-text)'
               }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-tooltip-text)' }}>
              {data.payload.source.name} → {data.payload.target.name}
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-tooltip-text)' }}>
              {formatCurrency(data.payload.value)}/month
            </p>
          </div>
        );
      } else if (data.name) {
        // Node tooltip - calculate value from links
        const nodeValue = data.value || 0;
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg"
               style={{ 
                 backgroundColor: 'var(--color-tooltip-bg)', 
                 borderColor: 'var(--color-tooltip-border)',
                 color: 'var(--color-tooltip-text)'
               }}>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-tooltip-text)' }}>
              {data.name}
            </p>
            {nodeValue > 0 && (
              <p className="text-sm font-medium" style={{ color: 'var(--color-tooltip-text)' }}>
                {formatCurrency(nodeValue)}/month
              </p>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <DashboardCard title="Monthly Cash Flow">
      <ChartState
        loading={loading}
        error={error}
        isEmpty={!sankeyData || !metadata}
        emptyMessage="No cash flow data for this period"
        onRetry={fetchData}
      >
      {sankeyData && metadata && (
        <div>
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
            Monthly average flows from {metadata.start_date} to {metadata.end_date} ({metadata.months_count} months)
          </div>
          
          <div className="h-[400px]" role="img" aria-label="Sankey diagram of monthly average income flowing into expenses and savings">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                nodeWidth={12}
                nodePadding={24}
                linkCurvature={0.5}
                iterations={32}
                margin={{ top: 20, right: 140, bottom: 20, left: 20 }}
                node={<CustomNode />}
                link={(props: any) => {
                  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
                  const isSavingsLink = payload?.target?.name === 'Savings';
                  const isIncomeLink = payload?.source?.name !== 'Total Income';
                  
                  // Color based on link type
                  let fillColor = EXPENSE_PRIMARY_COLOR;
                  if (isSavingsLink) {
                    fillColor = SAVINGS_COLOR;
                  } else if (isIncomeLink) {
                    fillColor = CENTRAL_INCOME_COLOR;
                  }
                  
                  // sourceY/targetY are centers, so offset by half linkWidth
                  const halfWidth = linkWidth / 2;
                  const sy0 = sourceY - halfWidth;
                  const sy1 = sourceY + halfWidth;
                  const ty0 = targetY - halfWidth;
                  const ty1 = targetY + halfWidth;
                  
                  return (
                    <path
                      d={`
                        M${sourceX},${sy0}
                        C${sourceControlX},${sy0} ${targetControlX},${ty0} ${targetX},${ty0}
                        L${targetX},${ty1}
                        C${targetControlX},${ty1} ${sourceControlX},${sy1} ${sourceX},${sy1}
                        Z
                      `}
                      fill={fillColor}
                      fillOpacity={0.3}
                      stroke="none"
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
              >
                <Tooltip content={<CustomTooltip />} />
              </Sankey>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex justify-center space-x-6 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CENTRAL_INCOME_COLOR }}></div>
              <span className="text-gray-600 dark:text-gray-400">Income</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: EXPENSE_PRIMARY_COLOR }}></div>
              <span className="text-gray-600 dark:text-gray-400">Expenses</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: SAVINGS_COLOR }}></div>
              <span className="text-gray-600 dark:text-gray-400">Savings</span>
            </div>
          </div>
        </div>
      )}
      </ChartState>
    </DashboardCard>
  );
};
