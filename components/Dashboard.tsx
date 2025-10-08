
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { POLine } from '../types';

interface DashboardProps {
  pastDueLines: POLine[];
  allLines: POLine[];
}

const StatCard: React.FC<{ title: string; value: string | number; color: string; }> = ({ title, value, color }) => (
    <div className={`bg-gray-800 p-6 rounded-lg border-l-4 ${color}`}>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ pastDueLines, allLines }) => {
    const topPastDueVendors = useMemo(() => {
        const vendorCounts: { [key: string]: number } = {};
        pastDueLines.forEach(line => {
            vendorCounts[line.vendor] = (vendorCounts[line.vendor] || 0) + 1;
        });

        return Object.entries(vendorCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [pastDueLines]);
    
    const totalPastDueValue = useMemo(() => {
        return pastDueLines.reduce((acc, line) => acc + line.open_qty, 0);
    }, [pastDueLines]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Monitoring Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Past Due PO Lines" value={pastDueLines.length} color="border-red-500" />
                <StatCard title="Total Open PO Lines" value={allLines.length} color="border-blue-500" />
                <StatCard title="Total Past Due Open Qty" value={totalPastDueValue.toLocaleString()} color="border-yellow-500" />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Top 10 Past Due Vendors (by PO Lines)</h3>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={topPastDueVendors} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" height={80} />
                            <YAxis stroke="#A0AEC0" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }}
                                labelStyle={{ color: '#E2E8F0' }}
                            />
                            <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                            <Bar dataKey="count" fill="#E53E3E" name="Past Due Lines" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
