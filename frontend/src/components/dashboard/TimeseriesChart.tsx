import React, { useState, useEffect } from 'react';
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
}

export const TimeseriesChart: React.FC<TimeseriesChartProps> = ({ data }) => {
    const [activeMetric, setActiveMetric] = useState('income_expenses');
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});

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
    }, [activeMetric]);

    const handleLegendClick = (entry: any) => {
        setVisibleSeries(prev => ({
            ...prev,
            [entry.dataKey]: !prev[entry.dataKey]
        }));
    };

    const metrics = {
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
    };

    const formatValue = (value: number, metric: string) => {
        if (!value && value !== 0) return '0';
        if (metric === 'savings_rate') {
            return `${Number(value).toFixed(1)}%`;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            notation: 'compact'
        }).format(value);
    };

    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center text-gray-500">
                No data available
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height: '400px' }}>
            <Tabs.Root value={activeMetric} onValueChange={setActiveMetric}>
                <Tabs.List className="flex space-x-4 mb-4">
                    {Object.entries(metrics).map(([key, { title }]) => (
                        <Tabs.Trigger
                            key={key}
                            value={key}
                            className={`px-4 py-2 rounded-md ${
                                activeMetric === key
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {title}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>

                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={sortedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
                            />
                            <YAxis
                                tickFormatter={(value) => 
                                    formatValue(value, activeMetric)
                                }
                            />
                            <Tooltip
                                labelFormatter={(date) => format(parseISO(date), 'MMMM yyyy')}
                                formatter={(value: number, name: string) => [
                                    formatValue(value, activeMetric),
                                    metrics[activeMetric as keyof typeof metrics].series.find(series => series.name === name)?.name || 'Amount'
                                ]}
                            />
                            <Legend 
                                onClick={handleLegendClick}
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