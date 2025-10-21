import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { POLine, POLog } from '../types';

// Helper to get an ISO date string 'YYYY-MM-DD'
const getDailyString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Helper function to get an ISO week string (e.g., '2023-W35') for a date.
const getISOWeekString = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// Helper for monthly string 'YYYY-MM'
const getMonthlyString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};


interface VendorTrendChartProps {
    vendorName: string;
    vendorPoLines: POLine[];
    poLogs: POLog[];
    daysBack: number;
}

const VendorTrendChart: React.FC<VendorTrendChartProps> = ({ vendorName, vendorPoLines, poLogs, daysBack }) => {
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');

    const { chartData, hasData } = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysBack);
        startDate.setHours(0, 0, 0, 0);

        const getGroupKey = (date: Date): string => {
            if (granularity === 'day') return getDailyString(date);
            if (granularity === 'month') return getMonthlyString(date);
            return getISOWeekString(date);
        };

        // 1. Process Negative Changes from Logs
        const vendorPoLineIds = new Set(vendorPoLines.map(l => l.po_line_id));
        const negativeChangesByGroup: Record<string, number> = {};
        poLogs.forEach(log => {
            if (!vendorPoLineIds.has(log.po_line_id)) return;
            
            const logDate = new Date(log.change_date);
            if (logDate >= startDate && logDate <= today) {
                if (log.changed_field === 'eta' && typeof log.new_value === 'string' && typeof log.old_value === 'string' && new Date(log.new_value) > new Date(log.old_value)) {
                    const groupKey = getGroupKey(logDate);
                    negativeChangesByGroup[groupKey] = (negativeChangesByGroup[groupKey] || 0) + 1;
                }
            }
        });

        // 2. Process Newly Past Due Lines
        const pastDueByGroup: Record<string, number> = {};
        vendorPoLines.forEach(line => {
            const etaDate = new Date(line.eta);
            if (etaDate < today && etaDate >= startDate) { 
                const groupKey = getGroupKey(etaDate);
                pastDueByGroup[groupKey] = (pastDueByGroup[groupKey] || 0) + 1;
            }
        });

        // 3. Generate labels for all groups in the range to ensure a continuous timeline.
        const allGroups = new Set<string>();
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            allGroups.add(getGroupKey(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const sortedGroups = Array.from(allGroups).sort();
        if (sortedGroups.length === 0 && daysBack >= 0) {
            sortedGroups.push(getGroupKey(today));
        }

        const data = sortedGroups.map(groupKey => {
            let label = groupKey;
            if (granularity === 'week') {
                label = groupKey.replace('-W', ' W');
            } else if (granularity === 'month') {
                const [year, month] = groupKey.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }

            return {
                name: label,
                'Negative ETA Changes': negativeChangesByGroup[groupKey] || 0,
                'Newly Past Due': pastDueByGroup[groupKey] || 0,
            };
        });
        
        const dataExists = data.some(d => d['Negative ETA Changes'] > 0 || d['Newly Past Due'] > 0);

        return { chartData: data, hasData: dataExists };

    }, [vendorPoLines, poLogs, daysBack, granularity]);

    if (!hasData) {
        return <div className="text-center text-slate-400 p-8">No significant trend data available for the selected period.</div>;
    }

    return (
        <div className="animate-fade-in">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-slate-200 mb-2 sm:mb-0">Performance Trend (Last {daysBack} days)</h4>
                <div className="flex items-center bg-slate-800 rounded-lg p-1 space-x-1">
                    {(['day', 'week', 'month'] as const).map(g => (
                         <button 
                            key={g} 
                            onClick={() => setGranularity(g)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${granularity === g ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                         >
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis 
                            dataKey="name" 
                            stroke="#A0AEC0" 
                            tick={{ fontSize: 12 }} 
                            angle={-30}
                            textAnchor="end"
                            height={granularity === 'day' ? 50 : 30}
                        />
                        <YAxis stroke="#A0AEC0" allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', borderRadius: '0.5rem' }}
                            labelStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ color: '#E2E8F0', paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="Negative ETA Changes" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Newly Past Due" stroke="#facc15" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default VendorTrendChart;
