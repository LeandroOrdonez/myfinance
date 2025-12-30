import React, { useState, useEffect, useMemo } from 'react';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart,
    Bar
} from 'recharts';
import { format, parseISO } from 'date-fns';
import * as Tabs from '@radix-ui/react-tabs';
import { TimePeriod } from '../../types/transaction';

interface TimeseriesData {
    date: string;
    period_income: number;
    period_expenses: number;
    period_net_savings: number;
    savings_rate: number;
    total_income: number;
    total_expenses: number;
    total_net_savings: number;
}

interface TimeseriesChartProps {
    data: TimeseriesData[];
    period: TimePeriod;
    setPeriod: (period: TimePeriod) => void;
    PERIODS: { label: string; value: TimePeriod }[];
}

export const TimeseriesChart: React.FC<TimeseriesChartProps> = ({ data, period, setPeriod, PERIODS }) => {
    const [activeMetric, setActiveMetric] = useState('income_expenses');
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});

    // Define metrics with useMemo to prevent recreating on every render
    const metrics = useMemo(() => ({
        income_expenses: {
            title: 'Monthly Income & Expenses',
            series: [
                { key: 'period_income', name: 'Income', color: '#10B981' },
                { key: 'period_expenses', name: 'Expenses', color: '#EF4444' },
                { key: 'period_net_savings', name: 'Net Savings', color: '#6366F1' }
            ],
            type: 'bar'
        },
        cumulative: {
            title: 'Cumulative Totals',
            series: [
                { key: 'total_income', name: 'Total Income', color: '#10B981' },
                { key: 'total_expenses', name: 'Total Expenses', color: '#EF4444' },
                { key: 'total_net_savings', name: 'Total Net Savings', color: '#6366F1' }
            ],
            type: 'area'
        },
        savings_rate: {
            title: 'Savings Rate',
            series: [
                { key: 'savings_rate', name: 'Savings Rate', color: '#10B981' }
            ],
            type: 'area'
        }
    }), []);

    // Transform and sort the data
    const sortedData = [...data]
        .filter(item => item && item.date)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
            ...item,
            period_income: Number(item.period_income) || 0,
            period_expenses: Number(item.period_expenses) || 0,
            period_net_savings: Number(item.period_net_savings) || 0,
            savings_rate: Number(item.savings_rate) || 0,
            total_income: Number(item.total_income) || 0,
            total_expenses: Number(item.total_expenses) || 0,
            total_net_savings: Number(item.total_net_savings) || 0
        }));

    // Initialize visible series when active metric changes
    useEffect(() => {
        const currentMetric = metrics[activeMetric as keyof typeof metrics];
        const initialVisibility = currentMetric.series.reduce((acc, series) => ({
            ...acc,
            [series.key]: true
        }), {});
        setVisibleSeries(initialVisibility);
    }, [activeMetric, metrics]);

    const handleLegendClick = (entry: any, index: number) => {
        // Prevent the default Recharts toggle behavior
        entry.payload.preventDefault = true;
        
        setVisibleSeries(prev => ({
            ...prev,
            [entry.dataKey]: !prev[entry.dataKey]
        }));
        
        // Return false to prevent Recharts' default toggle behavior
        return false;
    };
    
    const formatValue = (value: number, metric: string) => {
        if (!value && value !== 0) return '0';
        if (metric === 'savings_rate') {
            return `${Number(value).toFixed(1)}%`;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data available
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height: '400px' }}>
            <Tabs.Root value={activeMetric} onValueChange={setActiveMetric}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Tabs.List className="flex gap-2">
                    {Object.entries(metrics).map(([key, { title }]) => (
                        <Tabs.Trigger
                            key={key}
                            value={key}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${
                                activeMetric === key
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {title}
                        </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                    <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        className={`px-3 py-1 text-sm ${period === p.value 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                          : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setPeriod(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={sortedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
                                tick={{ fontSize: 12, fill: 'currentColor' }}
                                stroke="#9ca3af"
                                className="dark:text-gray-400"
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 12, fill: 'currentColor' }}
                                stroke="#9ca3af"
                                className="dark:text-gray-400"
                                tickFormatter={(value) => {
                                    if (activeMetric === 'savings_rate') {
                                        return `${value}%`;
                                    }
                                    return new Intl.NumberFormat('en-US', {
                                        notation: 'compact',
                                        style: 'currency',
                                        currency: 'EUR'
                                    }).format(value);
                                }}
                            />
                            <Tooltip
                                labelFormatter={(date) => format(parseISO(date), 'MMMM yyyy')}
                                formatter={(value: number, name: string) => [
                                    formatValue(value, activeMetric),
                                    metrics[activeMetric as keyof typeof metrics].series.find(series => series.name === name)?.name || 'Amount'
                                ]}
                                contentStyle={{ 
                                  backgroundColor: 'var(--color-tooltip-bg)', 
                                  borderColor: 'var(--color-tooltip-border)',
                                  borderRadius: '12px',
                                  border: '1px solid var(--color-tooltip-border)'
                                }}
                                itemStyle={{ color: 'var(--color-tooltip-text)' }}
                                labelStyle={{ color: 'var(--color-tooltip-text)', fontWeight: 'bold' }}
                                wrapperClassName="tooltip-wrapper"
                            />
                            <Legend 
                                onClick={handleLegendClick}
                                wrapperStyle={{ cursor: 'pointer' }}
                                formatter={(value, entry: any) => (
                                    <span style={{ 
                                        color: visibleSeries[entry.dataKey] ? entry.color : '#999',
                                        cursor: 'pointer'
                                    }}>
                                        {value}
                                    </span>
                                )}
                            />
                            {metrics[activeMetric as keyof typeof metrics].series.map((series) => {
                                if (metrics[activeMetric as keyof typeof metrics].type === 'area') {
                                    return (
                                        <Area
                                            key={series.key}
                                            type="linear"
                                            dataKey={series.key}
                                            name={series.name}
                                            stroke={series.color}
                                            fill={series.color}
                                            fillOpacity={0.1}
                                            strokeWidth={2}
                                            dot={true}
                                            activeDot={{ r: 4 }}
                                            isAnimationActive={false}
                                            hide={!visibleSeries[series.key]}
                                            yAxisId="left"
                                        />
                                    );
                                }
                                if (metrics[activeMetric as keyof typeof metrics].type === 'bar') {
                                    return (
                                        <Bar
                                            key={series.key}
                                            dataKey={series.key}
                                            name={series.name}
                                            fill={series.color}
                                            stroke={series.color}
                                            strokeWidth={1}
                                            isAnimationActive={false}
                                            barSize={15}
                                            hide={!visibleSeries[series.key]}
                                            yAxisId="left"
                                        />
                                    );
                                }
                                return (
                                    <Line
                                        key={series.key}
                                        type="linear"
                                        dataKey={series.key}
                                        name={series.name}
                                        stroke={series.color}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        isAnimationActive={false}
                                        hide={!visibleSeries[series.key]}
                                        yAxisId="left"
                                    />
                                );
                            })}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Tabs.Root>
        </div>
    );
}; 