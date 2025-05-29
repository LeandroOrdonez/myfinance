import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';
import { TimePeriod } from '../types/transaction';

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

export const useStatisticsTimeseries = (start_date?: string, end_date?: string, time_period?: TimePeriod) => {
    const [timeseriesData, setTimeseriesData] = useState<TimeseriesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTimeseriesData = async () => {
        setLoading(true);
        try {
            const data = await statisticService.getStatisticsTimeseries(start_date, end_date, time_period);
            const transformedData = data.map((item: any) => ({
                date: item.date,
                period_income: Number(item.period_income) || 0,
                period_expenses: Number(item.period_expenses) || 0,
                period_net_savings: Number(item.period_net_savings) || 0,
                savings_rate: Number(item.savings_rate) || 0,
                total_income: Number(item.total_income) || 0,
                total_expenses: Number(item.total_expenses) || 0,
                total_net_savings: Number(item.total_net_savings) || 0
            }));
            setTimeseriesData(transformedData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch timeseries data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeseriesData();
        // eslint-disable-next-line
    }, [start_date, end_date, time_period]);

    return {
        timeseriesData,
        loading,
        error,
        refreshData: fetchTimeseriesData
    };
}; 