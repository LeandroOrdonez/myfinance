import React, { useState, useEffect, useCallback } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { statisticService } from '../../services/statisticService';
import { TransactionType, TimePeriod } from '../../types/transaction';
import { Loading } from '../common/Loading';
import { buildSankeyData, CategoryAverageItem, SankeyData } from './sankey/buildSankeyData';

const PERIODS = [
  { label: '3M', value: TimePeriod.THREE_MONTHS },
  { label: '6M', value: TimePeriod.SIX_MONTHS },
  { label: 'YTD', value: TimePeriod.YEAR_TO_DATE },
  { label: '1Y', value: TimePeriod.ONE_YEAR },
  { label: '2Y', value: TimePeriod.TWO_YEARS },
  { label: 'All', value: TimePeriod.ALL_TIME },
];

interface CategoryAveragesResponse {
  start_date: string;
  end_date: string;
  months_count: number;
  categories: CategoryAverageItem[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Color schemes
const INCOME_COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
const EXPENSE_COLORS = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#db2777', '#be185d', '#9d174d', '#831843'];
const CENTRAL_INCOME_COLOR = '#059669';
const CENTRAL_EXPENSE_COLOR = '#db2777';
const SAVINGS_COLOR = '#3b82f6';

export const MoneyFlows: React.FC = () => {
  const [period, setPeriod] = useState<TimePeriod>(TimePeriod.ONE_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [metadata, setMetadata] = useState<{ start_date: string; end_date: string; months_count: number } | null>(null);
  const [nodeInfo, setNodeInfo] = useState<{ incomeCatCount: number; hasSavings: boolean }>({ incomeCatCount: 0, hasSavings: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch both income and expense category averages
        const [incomeData, expenseData] = await Promise.all([
          statisticService.getCategoryAverages(TransactionType.INCOME, undefined, undefined, period),
          statisticService.getCategoryAverages(TransactionType.EXPENSE, undefined, undefined, period),
        ]);

        // Build Sankey data structure
        const data = buildSankeyData(incomeData.categories, expenseData.categories, 6);
        setSankeyData(data);
        setMetadata({
          start_date: incomeData.start_date,
          end_date: incomeData.end_date,
          months_count: incomeData.months_count,
        });
        
        // Calculate node info for coloring
        const totalIncome = incomeData.categories.reduce((sum: number, cat: CategoryAverageItem) => sum + cat.average_amount, 0);
        const totalExpenses = expenseData.categories.reduce((sum: number, cat: CategoryAverageItem) => sum + cat.average_amount, 0);
        const hasSavings = totalIncome > totalExpenses;
        const incomeCatCount = Math.min(6, incomeData.categories.length);
        setNodeInfo({ incomeCatCount, hasSavings });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching money flow data:', err);
        setError('Failed to load money flow data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const getNodeColor = useCallback((index: number): string => {
    if (!sankeyData) return '#6b7280';
    
    const { incomeCatCount, hasSavings } = nodeInfo;
    const totalNodes = sankeyData.nodes.length;
    
    // Node structure: [income cats] [Total Income] [Total Expenses] [expense cats] [Savings?]
    const totalIncomeIdx = incomeCatCount;
    const totalExpensesIdx = incomeCatCount + 1;
    const expenseStartIdx = incomeCatCount + 2;
    
    if (hasSavings && index === totalNodes - 1) {
      return SAVINGS_COLOR;
    }
    
    if (index < totalIncomeIdx) {
      return INCOME_COLORS[index % INCOME_COLORS.length];
    } else if (index === totalIncomeIdx) {
      return CENTRAL_INCOME_COLOR;
    } else if (index === totalExpensesIdx) {
      return CENTRAL_EXPENSE_COLOR;
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
          className="text-xs fill-current text-gray-700 dark:text-gray-300"
          style={{ fontSize: '11px' }}
        >
          {payload.name}
        </text>
      </g>
    );
  };

  const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: any) => {
    const gradientId = `gradient-${index}`;
    
    return (
      <g>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <path
          d={`
            M${sourceX},${sourceY}
            C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
            L${targetX},${targetY + linkWidth}
            C${targetControlX},${targetY + linkWidth} ${sourceControlX},${sourceY + linkWidth} ${sourceX},${sourceY + linkWidth}
            Z
          `}
          fill={`url(#${gradientId})`}
          strokeWidth={0}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.source && data.target) {
        // Link tooltip
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.source.name} → {data.target.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(data.value)}/month
            </p>
          </div>
        );
      } else {
        // Node tooltip
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {data.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(data.value)}/month
            </p>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Money Flows</h3>
        
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`px-3 py-1 text-xs ${period === p.value 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loading variant="skeleton" size="small" />
        </div>
      )}

      {error && !loading && (
        <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          {error}
        </div>
      )}

      {!loading && !error && sankeyData && metadata && (
        <div>
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
            Monthly average flows from {metadata.start_date} to {metadata.end_date} ({metadata.months_count} months)
          </div>
          
          <div className="h-[400px]">
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
                  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;
                  
                  // Determine gradient colors based on source/target
                  let startColor = '#10b981';
                  let endColor = '#ec4899';
                  
                  if (payload.target?.name === 'Savings') {
                    endColor = SAVINGS_COLOR;
                  }
                  
                  const gradientId = `link-gradient-${index}`;
                  
                  return (
                    <g>
                      <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={startColor} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={endColor} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <path
                        d={`
                          M${sourceX},${sourceY}
                          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                          L${targetX},${targetY + linkWidth}
                          C${targetControlX},${targetY + linkWidth} ${sourceControlX},${sourceY + linkWidth} ${sourceX},${sourceY + linkWidth}
                          Z
                        `}
                        fill={`url(#${gradientId})`}
                        strokeWidth={0}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
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
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CENTRAL_EXPENSE_COLOR }}></div>
              <span className="text-gray-600 dark:text-gray-400">Expenses</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: SAVINGS_COLOR }}></div>
              <span className="text-gray-600 dark:text-gray-400">Savings</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
