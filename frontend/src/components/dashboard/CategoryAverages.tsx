import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { statisticService } from '../../services/statisticService';
import { TransactionType } from '../../types/transaction';
import { Loading } from '../common/Loading';
import { subMonths, startOfYear, format as formatDate } from 'date-fns';

// Define the periods similar to FinancialTrends
const PERIODS = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: 'YTD', value: 'ytd' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: 'All', value: 'all' },
];

// Define the category average item interface
interface CategoryAverageItem {
  category_name: string;
  transaction_type: string;
  expense_type: string | null;
  average_amount: number;
  total_amount: number;
  transaction_count: number;
  average_transaction_amount: number;
  percentage: number;
}

interface CategoryAveragesResponse {
  start_date: string;
  end_date: string;
  months_count: number;
  categories: CategoryAverageItem[];
}

export const CategoryAverages: React.FC = () => {
  const [period, setPeriod] = useState('1y');
  const [transactionType, setTransactionType] = useState<TransactionType | undefined>(TransactionType.EXPENSE);
  const [categoryData, setCategoryData] = useState<CategoryAveragesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // Compute start_date and end_date based on selected period
  const now = new Date();
  let start_date: string | undefined = undefined;
  let end_date: string | undefined = undefined;

  if (period === '3m') {
    start_date = formatDate(subMonths(now, 3), 'yyyy-MM-dd');
  } else if (period === '6m') {
    start_date = formatDate(subMonths(now, 6), 'yyyy-MM-dd');
  } else if (period === 'ytd') {
    start_date = formatDate(startOfYear(now), 'yyyy-MM-dd');
  } else if (period === '1y') {
    start_date = formatDate(subMonths(now, 12), 'yyyy-MM-dd');
  } else if (period === '2y') {
    start_date = formatDate(subMonths(now, 24), 'yyyy-MM-dd');
  }
  // For 'all', we leave start_date undefined to get all data

  end_date = formatDate(now, 'yyyy-MM-dd');

  // Fetch category averages data
  useEffect(() => {
    const fetchCategoryAverages = async () => {
      setLoading(true);
      try {
        const data = await statisticService.getCategoryAverages(
          transactionType,
          start_date,
          end_date
        );
        setCategoryData(data);
        
        // Transform data for the chart
        // Take top 10 categories by average amount
        const topCategories = [...data.categories]
          .sort((a, b) => b.average_amount - a.average_amount)
          .slice(0, 10);
          
        // Format data for the chart
        const formattedData = topCategories.map(cat => ({
          name: cat.category_name,
          average: cat.average_amount,
          total: cat.total_amount,
          type: cat.expense_type || 'Income',
          percentage: cat.percentage
        }));
        
        setChartData(formattedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching category averages:', err);
        setError('Failed to load category averages data');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAverages();
  }, [period, transactionType, start_date, end_date]);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded p-2 shadow-md dark:bg-gray-800">
          <p className="font-medium">{label}</p>
          <p className="text-blue-500">
            Monthly Average: {formatCurrency(data.average)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Total: {formatCurrency(data.total)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            {data.percentage.toFixed(1)}% of {data.type === 'Income' ? 'Income' : 'Expenses'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Get bar color based on expense type
  const getBarColor = (type: string) => {
    if (type === 'Income') return '#10b981'; // emerald-500
    if (type === 'Essential') return '#6366f1'; // indigo-500
    return '#ec4899'; // pink-500 for Discretionary
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Category Averages</h3>
        
        <div className="flex space-x-2">
          {/* Transaction Type Selector */}
          <div className="flex space-x-1">
            <button
              className={`px-2 py-1 text-xs rounded ${
                transactionType === TransactionType.EXPENSE
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
              onClick={() => setTransactionType(TransactionType.EXPENSE)}
            >
              Expenses
            </button>
            <button
              className={`px-2 py-1 text-xs rounded ${
                transactionType === TransactionType.INCOME
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
              onClick={() => setTransactionType(TransactionType.INCOME)}
            >
              Income
            </button>
          </div>
          
          {/* Period Selector */}
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
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loading />
        </div>
      )}

      {error && !loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && categoryData && (
        <div>
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
            Showing monthly averages from {categoryData.start_date} to {categoryData.end_date} ({categoryData.months_count-1} months)
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  stroke="#9ca3af"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  className="dark:text-gray-400"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)} 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  stroke="#9ca3af"
                  className="dark:text-gray-400"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="average" 
                  name="Monthly Average" 
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary Section */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2 dark:text-gray-200">Top Categories</h4>
              <div className="space-y-2">
                {chartData.slice(0, 5).map((cat, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: getBarColor(cat.type) }}
                      ></div>
                      <span className="text-sm dark:text-gray-300">{cat.name}</span>
                    </div>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {formatCurrency(cat.average)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2 dark:text-gray-200">Summary</h4>
              {categoryData && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm dark:text-gray-300">Total Categories</span>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {categoryData.categories.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm dark:text-gray-300">Time Period</span>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {categoryData.months_count-1} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm dark:text-gray-300">Total {transactionType === TransactionType.EXPENSE ? 'Spent' : 'Earned'}</span>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {formatCurrency(categoryData.categories.reduce((sum, cat) => sum + cat.total_amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm dark:text-gray-300">Monthly Average</span>
                    <span className="text-sm font-medium dark:text-gray-300">
                      {formatCurrency(categoryData.categories.reduce((sum, cat) => sum + cat.average_amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
