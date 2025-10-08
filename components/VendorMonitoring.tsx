import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { POLine, POLog, VendorStats, Alert } from '../types';

interface VendorMonitoringProps {
    poLines: POLine[];
    poLogs: POLog[];
    onAnalyzeVendor: (vendorName: string) => void;
}

const isPastDue = (eta: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(eta) < today;
};

const VendorMonitoring: React.FC<VendorMonitoringProps> = ({ poLines, poLogs, onAnalyzeVendor }) => {
    // State for the currently applied thresholds
    const [activeThresholds, setActiveThresholds] = useState({
        percentage: 20,
        count: 5,
        minPoLines: 0,
        worseningDays: 7,
        worseningCount: 0,
    });
    
    // State for the thresholds being edited in the UI
    const [draftThresholds, setDraftThresholds] = useState(activeThresholds);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: false,
        type: 'email' as 'email' | 'teams',
        recipients: '',
    });
    const [worseningMenuOpenFor, setWorseningMenuOpenFor] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleApplyThresholds = () => {
        setActiveThresholds(draftThresholds);
    };

    const vendorStats = useMemo<VendorStats[]>(() => {
        const vendorMap = new Map<string, { totalLines: number; pastDueLines: POLine[]; poLineIds: Set<string>; vendorNumber: number }>();

        // 1. Group PO lines by vendor
        poLines.forEach(line => {
            if (!vendorMap.has(line.vendor)) {
                vendorMap.set(line.vendor, { totalLines: 0, pastDueLines: [], poLineIds: new Set(), vendorNumber: line.vendor_number });
            }
            const vendorData = vendorMap.get(line.vendor)!;
            vendorData.totalLines++;
            vendorData.poLineIds.add(line.po_line_id);
            if (isPastDue(line.eta)) {
                vendorData.pastDueLines.push(line);
            }
        });

        // 2. Analyze logs for trends (recent negative changes)
        const recentNegativeChanges = new Map<string, number>();
        const trendLookbackDate = new Date();
        trendLookbackDate.setDate(trendLookbackDate.getDate() - activeThresholds.worseningDays);

        const vendorByPoLineId = new Map(poLines.map(l => [l.po_line_id, l.vendor]));

        poLogs.forEach(log => {
            const logDate = new Date(log.change_date);
            if (logDate > trendLookbackDate) {
                const vendor = vendorByPoLineId.get(log.po_line_id);
                if (vendor) {
                    if (log.changed_field === 'eta' && typeof log.new_value === 'string' && typeof log.old_value === 'string' && new Date(log.new_value) > new Date(log.old_value)) {
                        recentNegativeChanges.set(vendor, (recentNegativeChanges.get(vendor) || 0) + 1);
                    }
                }
            }
        });

        // 3. Compile final stats
        const compiledStats = Array.from(vendorMap.entries()).map(([name, data]) => {
            const pastDueLinesCount = data.pastDueLines.length;
            const pastDuePercentage = data.totalLines > 0 ? (pastDueLinesCount / data.totalLines) * 100 : 0;
            const negativeChanges = recentNegativeChanges.get(name) || 0;
            
            let trend: 'improving' | 'worsening' | 'stable' = 'stable';
            if(negativeChanges > activeThresholds.worseningCount) {
                trend = 'worsening';
            }

            return {
                name,
                vendorNumber: data.vendorNumber,
                totalLines: data.totalLines,
                pastDueLinesCount,
                pastDuePercentage,
                trend,
                recentNegativeChanges: negativeChanges,
            };
        });
        
        // 4. Filter and sort
        return compiledStats
            .filter(vendor => vendor.totalLines >= activeThresholds.minPoLines)
            .sort((a, b) => b.pastDuePercentage - a.pastDuePercentage);

    }, [poLines, poLogs, activeThresholds]);

    // Effect to generate alerts when stats or ACTIVE thresholds change
    useEffect(() => {
        const newAlerts: Alert[] = [];
        vendorStats.forEach(vendor => {
            const { name, pastDueLinesCount, pastDuePercentage, trend } = vendor;

            const countExceeded = pastDueLinesCount > activeThresholds.count;
            const percentExceeded = pastDuePercentage > activeThresholds.percentage;

            if (trend === 'worsening' && (countExceeded || percentExceeded)) {
                 newAlerts.push({
                    id: `${name}-worsening`,
                    vendor: name,
                    message: `Performance is worsening, with ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`,
                    timestamp: new Date().toISOString(),
                    severity: 'Critical',
                });
            } else if (countExceeded && percentExceeded) {
                newAlerts.push({
                    id: `${name}-breach`,
                    vendor: name,
                    message: `Exceeds thresholds with ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`,
                    timestamp: new Date().toISOString(),
                    severity: 'Critical',
                });
            } else if (countExceeded || percentExceeded) {
                 newAlerts.push({
                    id: `${name}-warning`,
                    vendor: name,
                    message: `Has ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`,
                    timestamp: new Date().toISOString(),
                    severity: 'Warning',
                });
            }
        });
        setAlerts(newAlerts);

        if (notificationSettings.enabled && notificationSettings.recipients) {
            const criticalAlerts = newAlerts.filter(a => a.severity === 'Critical');
            if (criticalAlerts.length > 0) {
                console.log(`--- SIMULATING NOTIFICATIONS ---`);
                criticalAlerts.forEach(alert => {
                    console.log(`Sending ${notificationSettings.type} notification to ${notificationSettings.recipients} for critical alert on vendor ${alert.vendor}: "${alert.message}"`);
                });
                console.log(`--------------------------------`);
            }
        }

    }, [vendorStats, activeThresholds, notificationSettings]);
    
    const highestAlertSeverity = useMemo(() => {
        if (alerts.some(a => a.severity === 'Critical')) {
            return 'Critical';
        }
        if (alerts.length > 0) {
            return 'Warning';
        }
        return null;
    }, [alerts]);


    // Effect to handle clicks outside the worsening menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setWorseningMenuOpenFor(null);
            }
        };
        if (worseningMenuOpenFor) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [worseningMenuOpenFor]);

    const getTrendIcon = (trend: 'improving' | 'worsening' | 'stable') => {
        if (trend === 'worsening') {
            return <span className="text-red-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l.293.293a1 1 0 001.414-1.414l-3-3z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg> Worsening</span>;
        }
        if (trend === 'improving') {
            return <span className="text-green-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.707-10.293a1 1 0 011.414-1.414l3 3a1 1 0 11-1.414 1.414L11 9.414V13a1 1 0 11-2 0V9.414l-.293.293a1 1 0 01-1.414-1.414l3-3z" clipRule="evenodd" /></svg> Improving</span>;
        }
        return <span className="text-slate-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg> Stable</span>;
    };

    return (
        <div className="space-y-6">
            {/* Alert Configuration */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg mb-3">Monitoring & Alerting Rules</h3>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                    <div className="flex items-end gap-x-6 gap-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Min. PO Lines</label>
                            <input type="number" value={draftThresholds.minPoLines} onChange={(e) => setDraftThresholds(t => ({...t, minPoLines: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Exclude vendors with fewer PO lines than this value" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Past Due Count &gt;</label>
                            <input type="number" value={draftThresholds.count} onChange={(e) => setDraftThresholds(t => ({...t, count: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Past Due % &gt;</label>
                            <input type="number" value={draftThresholds.percentage} onChange={(e) => setDraftThresholds(t => ({...t, percentage: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="h-8 border-l border-slate-600 mx-2 hidden md:block"></div>

                    <div className="flex items-end gap-x-6 gap-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Trend: Days Back</label>
                            <input type="number" value={draftThresholds.worseningDays} onChange={(e) => setDraftThresholds(t => ({...t, worseningDays: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" title="How many days back to look for negative changes" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Trend: Changes &gt;</label>
                            <input type="number" value={draftThresholds.worseningCount} onChange={(e) => setDraftThresholds(t => ({...t, worseningCount: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Flag as 'Worsening' if negative changes exceed this count" />
                        </div>
                    </div>
                     
                    <div className="w-full lg:w-auto">
                        <button onClick={handleApplyThresholds} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 w-full lg:w-auto flex items-center justify-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Apply Rules
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-300">How Rules Are Triggered:</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 rounded-lg border border-slate-600 bg-slate-900/20">
                            <h5 className="font-bold text-slate-300">Filtering</h5>
                            <p className="text-slate-400 mt-1">Vendors with fewer than <strong className="text-white">{activeThresholds.minPoLines}</strong> total PO lines are excluded from monitoring.</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-600 bg-slate-900/20">
                            <h5 className="font-bold text-slate-300">Worsening Trend</h5>
                             <p className="text-slate-400 mt-1">
                                Flagged if a vendor has more than <strong className="text-white">{activeThresholds.worseningCount}</strong> negative ETA changes in the last <strong className="text-white">{activeThresholds.worseningDays}</strong> days.
                            </p>
                        </div>
                        <div className="p-3 rounded-lg border border-red-600 bg-red-900/20">
                            <h5 className="font-bold text-red-400">Critical Alert</h5>
                             <ul className="list-disc list-inside text-slate-300 mt-1 space-y-1">
                                <li>
                                    Triggers when <strong className="text-white">BOTH</strong> Past Due Count &gt; {activeThresholds.count} <strong className="text-white">AND</strong> Past Due % &gt; {activeThresholds.percentage}% are met.
                                </li>
                                <li>
                                     Also triggers if trend is <strong className="text-white">Worsening</strong> and <strong className="text-white">EITHER</strong> threshold is met.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Critical Alert Notifications (Simulation)</h4>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex items-center">
                            <label htmlFor="notif-toggle" className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" id="notif-toggle" className="sr-only peer" checked={notificationSettings.enabled} onChange={() => setNotificationSettings(s => ({ ...s, enabled: !s.enabled }))} />
                                    <div className="block bg-slate-600 w-14 h-8 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition peer-checked:translate-x-6"></div>
                                </div>
                                <div className="ml-3 text-white font-medium">Enable</div>
                            </label>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center text-slate-300"><input type="radio" name="notif-type" value="email" checked={notificationSettings.type === 'email'} onChange={() => setNotificationSettings(s => ({...s, type: 'email'}))} className="form-radio bg-slate-700 text-blue-500" disabled={!notificationSettings.enabled} /> <span className="ml-2">Email</span></label>
                            <label className="flex items-center text-slate-300"><input type="radio" name="notif-type" value="teams" checked={notificationSettings.type === 'teams'} onChange={() => setNotificationSettings(s => ({...s, type: 'teams'}))} className="form-radio bg-slate-700 text-blue-500" disabled={!notificationSettings.enabled} /> <span className="ml-2">Teams</span></label>
                        </div>
                         <input type="text" placeholder={notificationSettings.type === 'email' ? "recipient@example.com" : "Teams Webhook URL"} value={notificationSettings.recipients} onChange={(e) => setNotificationSettings(s => ({...s, recipients: e.target.value}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={!notificationSettings.enabled} />
                    </div>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                    highestAlertSeverity === 'Critical' 
                        ? 'border-red-600 bg-red-900/30' 
                        : 'border-yellow-600 bg-yellow-900/30'
                }`}>
                    <h3 className={`font-semibold text-lg mb-3 ${
                        highestAlertSeverity === 'Critical' 
                            ? 'text-red-300' 
                            : 'text-yellow-300'
                    }`}>Active Alerts</h3>
                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`flex items-start p-3 rounded-md border-l-4 ${
                                alert.severity === 'Critical' 
                                    ? 'bg-red-900/50 border-red-500' 
                                    : 'bg-yellow-900/50 border-yellow-500'
                            }`}>
                               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 flex-shrink-0 ${alert.severity === 'Critical' ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                               </svg>
                                <div>
                                    <p className={`font-bold ${alert.severity === 'Critical' ? 'text-red-300' : 'text-yellow-300'}`}>{alert.vendor}</p>
                                    <p className="text-sm text-slate-300">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vendor</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vendor #</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Total PO Lines</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Past Due Lines</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Past Due %</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {vendorStats.map((vendor) => (
                            <tr key={vendor.name} className="hover:bg-slate-700/40">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{vendor.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{vendor.vendorNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{vendor.totalLines}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{vendor.pastDueLinesCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                    <div className="flex items-center">
                                        <span>{vendor.pastDuePercentage.toFixed(1)}%</span>
                                        <div className="w-24 bg-slate-600 rounded-full h-2.5 ml-3">
                                            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${vendor.pastDuePercentage > 100 ? 100 : vendor.pastDuePercentage}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center justify-between">
                                        {getTrendIcon(vendor.trend)}
                                        <div className="relative" ref={vendor.name === worseningMenuOpenFor ? menuRef : null}>
                                            {vendor.trend === 'worsening' ? (
                                                <>
                                                    <button 
                                                        onClick={() => setWorseningMenuOpenFor(v => v === vendor.name ? null : vendor.name)} 
                                                        className="p-1.5 rounded-full hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500" 
                                                        title="Actions"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                                                           <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                        </svg>
                                                    </button>
                                                    {worseningMenuOpenFor === vendor.name && (
                                                        <div className="absolute z-20 right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-md shadow-lg py-1">
                                                            <button onClick={() => { onAnalyzeVendor(vendor.name); setWorseningMenuOpenFor(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Run AI Diagnostics</button>
                                                            <a href={`https://www.metabase.com/docs/latest/users-guide/start?vendor_number=${vendor.vendorNumber}`} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">View Details in BI</a>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                 <a 
                                                    href={`https://www.metabase.com/docs/latest/users-guide/start?vendor_number=${vendor.vendorNumber}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="p-1.5 rounded-full hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500"
                                                    title="View Details in BI"
                                                 >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {vendorStats.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No vendors match the current filter criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorMonitoring;