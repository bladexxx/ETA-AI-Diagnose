import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { POLine, POLog, VendorStats, Alert, VendorRule } from '../types';
import VendorTrendChart from './VendorTrendChart';

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

// Defines the properties of different rule types to drive the UI dynamically.
const RULE_DEFINITIONS: { [key: string]: { label: string; unitLabel: string; unitName: string } } = {
    'po_ack': { label: 'PO ACK Timeliness', unitLabel: 'Hours >', unitName: 'hrs' },
    'performance_score': { label: 'Performance Score', unitLabel: 'Score <', unitName: 'points' },
    // Future rules like 'past_due_count' or 'past_due_percent' can be added here.
};
const defaultRuleType = Object.keys(RULE_DEFINITIONS)[0];

// --- Filter Dialog Types & Constants ---
type FilterableField = keyof VendorStats;
type FilterOperator = 'contains' | 'not_contains' | 'is' | 'is_not' | '>=' | '<=';

interface FilterCondition {
    id: number;
    field: FilterableField | 'none';
    operator: FilterOperator | 'none';
    value: any;
}

const FIELD_OPTIONS: { value: FilterableField; label: string; type: 'string' | 'number' | 'trend' }[] = [
    { value: 'name', label: 'Vendor Name', type: 'string' },
    { value: 'vendorNumber', label: 'Vendor #', type: 'string' },
    { value: 'performanceScore', label: 'Perf. Score', type: 'number' },
    { value: 'totalLines', label: 'Total PO Lines', type: 'number' },
    { value: 'pastDueLinesCount', label: 'Past Due Lines', type: 'number' },
    { value: 'pastDuePercentage', label: 'Past Due %', type: 'number' },
    { value: 'trend', label: 'Trend', type: 'trend' },
];

const OPERATORS: { [key: string]: { value: FilterOperator; label: string }[] } = {
    string: [
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'is', label: 'is' },
        { value: 'is_not', label: 'is not' },
    ],
    number: [
        { value: '>=', label: '>=' },
        { value: '<=', label: '<=' },
    ],
    trend: [
        { value: 'is', label: 'is' },
        { value: 'is_not', label: 'is not' },
    ],
};

const FilterDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterCondition[]) => void;
    initialFilters: FilterCondition[];
}> = ({ isOpen, onClose, onApply, initialFilters }) => {
    const [tempFilters, setTempFilters] = useState<FilterCondition[]>(initialFilters);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTempFilters(initialFilters);
    }, [initialFilters, isOpen]);
    
     useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAddFilter = () => {
        setTempFilters([...tempFilters, { id: Date.now(), field: 'none', operator: 'none', value: '' }]);
    };

    const handleUpdateFilter = (id: number, part: 'field' | 'operator' | 'value', newValue: any) => {
        setTempFilters(tempFilters.map(f => {
            if (f.id === id) {
                const updatedFilter = { ...f, [part]: newValue };
                // Reset operator and value if field changes
                if (part === 'field') {
                    updatedFilter.operator = 'none';
                    updatedFilter.value = '';
                }
                return updatedFilter;
            }
            return f;
        }));
    };

    const handleRemoveFilter = (id: number) => {
        setTempFilters(tempFilters.filter(f => f.id !== id));
    };
    
    const handleClearAll = () => {
        setTempFilters([{ id: Date.now(), field: 'none', operator: 'none', value: '' }]);
    };

    const handleApply = () => {
        // Filter out incomplete rules before applying
        const validFilters = tempFilters.filter(f => f.field !== 'none' && f.operator !== 'none' && f.value !== '');
        onApply(validFilters);
        onClose();
    };

    const renderValueInput = (filter: FilterCondition) => {
        const fieldType = FIELD_OPTIONS.find(opt => opt.value === filter.field)?.type;
        if (!fieldType) return <input type="text" disabled className="bg-slate-800 border border-slate-600 rounded-md p-2 w-full cursor-not-allowed" />;

        switch (fieldType) {
            case 'number':
                return <input type="number" value={filter.value} onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />;
            case 'trend':
                return (
                    <select value={filter.value} onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Trend</option>
                        <option value="worsening">Worsening</option>
                        <option value="stable">Stable</option>
                        <option value="improving">Improving</option>
                    </select>
                );
            case 'string':
            default:
                return <input type="text" value={filter.value} onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div ref={dialogRef} className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Filter Vendors</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">&times;</button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                    {tempFilters.map((filter) => {
                        const fieldType = FIELD_OPTIONS.find(opt => opt.value === filter.field)?.type;
                        return (
                            <div key={filter.id} className="grid grid-cols-12 gap-2 items-center">
                                <select value={filter.field} onChange={e => handleUpdateFilter(filter.id, 'field', e.target.value)} className="col-span-4 bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="none">Select Field...</option>
                                    {FIELD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <select value={filter.operator} onChange={e => handleUpdateFilter(filter.id, 'operator', e.target.value)} className="col-span-3 bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!fieldType}>
                                    <option value="none">Operator...</option>
                                    {fieldType && OPERATORS[fieldType].map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                                <div className="col-span-4">{renderValueInput(filter)}</div>
                                <div className="col-span-1">
                                    <button onClick={() => handleRemoveFilter(filter.id)} className="text-red-400 hover:text-red-300 p-2 rounded-full w-full flex justify-center" title="Remove filter">&ndash;</button>
                                </div>
                            </div>
                        );
                    })}
                     <button onClick={handleAddFilter} className="text-sm text-blue-400 hover:text-blue-300">+ Add Filter</button>
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-b-xl">
                    <button onClick={handleClearAll} className="text-sm text-red-400 hover:text-red-300 font-semibold px-4 py-2 rounded-md hover:bg-slate-700">Clear All Filters</button>
                    <div className="flex gap-2">
                         <button onClick={onClose} className="px-4 py-2 rounded-md text-sm bg-slate-600 hover:bg-slate-500">Cancel</button>
                        <button onClick={handleApply} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition">Apply Filters</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const VendorMonitoring: React.FC<VendorMonitoringProps> = ({ poLines, poLogs, onAnalyzeVendor }) => {
    // State for thresholds actively used in calculations
    const [appliedThresholds, setAppliedThresholds] = useState({
        percentage: 20,
        count: 5,
        minPoLines: 20,
        worseningDays: 30,
        worseningPercentage: 20,
    });
    
    // State for the thresholds being edited in the UI
    const [uiThresholds, setUiThresholds] = useState(appliedThresholds);
    
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [worseningMenuOpenFor, setWorseningMenuOpenFor] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Vendor-specific rules state
    const allVendors = useMemo(() => [...new Set(poLines.map(line => line.vendor))].sort(), [poLines]);
    const [vendorRules, setVendorRules] = useState<VendorRule[]>([]);
    const [newRule, setNewRule] = useState({
        vendorName: allVendors[0] || '',
        ruleType: defaultRuleType,
        threshold: 24
    });
    
    // State for filtering and sorting
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof VendorStats; direction: 'asc' | 'desc' }>({ key: 'performanceScore', direction: 'asc' });

    // State for notification channels
    const [isEmailEnabled, setIsEmailEnabled] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [isTeamsEnabled, setIsTeamsEnabled] = useState(false);
    const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');

    const handleApplyRules = () => {
        setAppliedThresholds(uiThresholds);
    };

    const handleAddVendorRule = () => {
        if (!newRule.vendorName || newRule.threshold <= 0) return;
        const rule: VendorRule = {
            id: `${newRule.vendorName}-${newRule.ruleType}-${Date.now()}`,
            ...newRule,
        };
        setVendorRules(prev => [...prev, rule]);
    };
    
    const handleDeleteVendorRule = (ruleId: string) => {
        setVendorRules(prev => prev.filter(r => r.id !== ruleId));
    };

    const handleSort = (key: keyof VendorStats) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleRemoveActiveFilter = (id: number) => {
        setActiveFilters(prev => prev.filter(f => f.id !== id));
    };

    // Pre-calculate a map of PO lines per vendor for performance
    const vendorPoLinesMap = useMemo(() => {
        const map = new Map<string, POLine[]>();
        poLines.forEach(line => {
            if (!map.has(line.vendor)) {
                map.set(line.vendor, []);
            }
            map.get(line.vendor)!.push(line);
        });
        return map;
    }, [poLines]);

    const vendorStats = useMemo<VendorStats[]>(() => {
        const vendorMap = new Map<string, { totalLines: number; pastDueLines: POLine[]; poLineIds: Set<string>; vendorNumber: number, lines: POLine[] }>();

        // 1. Group PO lines by vendor
        poLines.forEach(line => {
            if (!vendorMap.has(line.vendor)) {
                vendorMap.set(line.vendor, { totalLines: 0, pastDueLines: [], poLineIds: new Set(), vendorNumber: line.vendor_number, lines: [] });
            }
            const vendorData = vendorMap.get(line.vendor)!;
            vendorData.totalLines++;
            vendorData.poLineIds.add(line.po_line_id);
            vendorData.lines.push(line);
            if (isPastDue(line.eta)) {
                vendorData.pastDueLines.push(line);
            }
        });

        // 2. Analyze logs for trends
        const poLinesWithNegativeChanges = new Map<string, Set<string>>();
        const trendLookbackDate = new Date();
        trendLookbackDate.setDate(trendLookbackDate.getDate() - appliedThresholds.worseningDays);
        const vendorByPoLineId = new Map(poLines.map(l => [l.po_line_id, l.vendor]));

        poLogs.forEach(log => {
            const logDate = new Date(log.change_date);
            if (logDate > trendLookbackDate) {
                const vendor = vendorByPoLineId.get(log.po_line_id);
                // FIX: Refactored conditional checks to ensure `log.new_value` and `log.old_value` are correctly narrowed to `string` before use, resolving type errors.
                if (vendor && log.changed_field === 'eta') {
                    if (typeof log.new_value === 'string' && typeof log.old_value === 'string') {
                        if (new Date(log.new_value) > new Date(log.old_value)) {
                            if (!poLinesWithNegativeChanges.has(vendor)) poLinesWithNegativeChanges.set(vendor, new Set());
                            poLinesWithNegativeChanges.get(vendor)!.add(log.po_line_id);
                        }
                    }
                }
            }
        });

        // 3. Compile final stats
        return Array.from(vendorMap.entries()).map(([name, data]) => {
            const pastDueLinesCount = data.pastDueLines.length;
            const pastDuePercentage = data.totalLines > 0 ? (pastDueLinesCount / data.totalLines) * 100 : 0;
            const negativeChangePoLinesCount = poLinesWithNegativeChanges.get(name)?.size || 0;
            const calculatedWorseningPercentage = data.totalLines > 0 ? (negativeChangePoLinesCount / data.totalLines) * 100 : 0;
            let trend: 'improving' | 'worsening' | 'stable' = 'stable';
            if (calculatedWorseningPercentage > appliedThresholds.worseningPercentage) trend = 'worsening';

            // Calculate Performance Score
            const pastDueScore = 50 * (1 - Math.min(1, pastDuePercentage / 100));
            const trendScore = 30 * (1 - Math.min(1, calculatedWorseningPercentage / 100));
            const ackedLines = data.lines.filter(l => l.ack_status === 'Acknowledged' && l.ack_date);
            const timelyAckedLines = ackedLines.filter(l => (new Date(l.ack_date!).getTime() - new Date(l.creation_date).getTime()) / 36e5 <= 24);
            const onTimeAckPercentage = ackedLines.length > 0 ? timelyAckedLines.length / ackedLines.length : 1;
            const ackScore = 20 * onTimeAckPercentage;
            const performanceScore = Math.max(0, pastDueScore + trendScore + ackScore);

            return {
                name, vendorNumber: data.vendorNumber, totalLines: data.totalLines,
                pastDueLinesCount, pastDuePercentage, trend,
                recentNegativeChanges: negativeChangePoLinesCount, performanceScore
            };
        }).filter(vendor => vendor.totalLines >= appliedThresholds.minPoLines);
    }, [poLines, poLogs, appliedThresholds]);
    
    
    const filteredAndSortedVendors = useMemo(() => {
        let vendors = [...vendorStats];

        // New Filtering Logic
        activeFilters.forEach(filter => {
            vendors = vendors.filter(vendor => {
                if (!filter.field || filter.field === 'none') return true;
                const vendorValue = vendor[filter.field];
                const filterValue = filter.value;

                switch (filter.operator) {
                    case 'contains':
                        return String(vendorValue).toLowerCase().includes(String(filterValue).toLowerCase());
                    case 'not_contains':
                        return !String(vendorValue).toLowerCase().includes(String(filterValue).toLowerCase());
                    case 'is':
                         return String(vendorValue).toLowerCase() === String(filterValue).toLowerCase();
                    case 'is_not':
                        return String(vendorValue).toLowerCase() !== String(filterValue).toLowerCase();
                    case '>=':
                        return Number(vendorValue) >= Number(filterValue);
                    case '<=':
                        return Number(vendorValue) <= Number(filterValue);
                    default:
                        return true;
                }
            });
        });


        // Sorting logic (remains the same)
        vendors.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });
        
        return vendors;
    }, [vendorStats, activeFilters, sortConfig]);


    // Effect to generate alerts when stats or thresholds change
    useEffect(() => {
        const newAlerts: Alert[] = [];
        
        // --- Process Global Rules ---
        vendorStats.forEach(vendor => {
            const { name, pastDueLinesCount, pastDuePercentage, trend } = vendor;
            const countExceeded = pastDueLinesCount > appliedThresholds.count;
            const percentExceeded = pastDuePercentage > appliedThresholds.percentage;

            if (trend === 'worsening' && (countExceeded || percentExceeded)) {
                 newAlerts.push({ id: `${name}-worsening`, vendor: name, message: `Performance is worsening, with ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`, timestamp: new Date().toISOString(), severity: 'Critical' });
            } else if (countExceeded && percentExceeded) {
                newAlerts.push({ id: `${name}-breach`, vendor: name, message: `Exceeds thresholds with ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`, timestamp: new Date().toISOString(), severity: 'Critical' });
            } else if (countExceeded || percentExceeded) {
                 newAlerts.push({ id: `${name}-warning`, vendor: name, message: `Has ${pastDueLinesCount} past due lines (${pastDuePercentage.toFixed(1)}%).`, timestamp: new Date().toISOString(), severity: 'Warning' });
            }
        });
        
        // --- Process Vendor-Specific Rules ---
        vendorRules.forEach(rule => {
            if (rule.ruleType === 'po_ack') {
                (vendorPoLinesMap.get(rule.vendorName) || []).forEach(line => {
                    if (line.ack_status === 'Pending' && (new Date().getTime() - new Date(line.creation_date).getTime()) / 36e5 > rule.threshold) {
                        newAlerts.push({ id: `${line.po_line_id}-ack-breach`, vendor: rule.vendorName, message: `PO line **${line.po_line_id}** is unacknowledged for over **${rule.threshold}** hours.`, timestamp: new Date().toISOString(), severity: 'Warning' });
                    }
                });
            } else if (rule.ruleType === 'performance_score') {
                 const vendor = vendorStats.find(v => v.name === rule.vendorName);
                 if (vendor && vendor.performanceScore < rule.threshold) {
                      newAlerts.push({ id: `${vendor.name}-perf-score-breach`, vendor: vendor.name, message: `Performance score of **${vendor.performanceScore.toFixed(0)}** is below the threshold of **${rule.threshold}**.`, timestamp: new Date().toISOString(), severity: 'Warning' });
                 }
            }
        });

        setAlerts(newAlerts.sort((a, b) => (a.severity === 'Critical' ? -1 : 1) - (b.severity === 'Critical' ? -1 : 1)));

    }, [vendorStats, appliedThresholds, vendorRules, vendorPoLinesMap]);
    
    const highestAlertSeverity = useMemo(() => {
        if (alerts.some(a => a.severity === 'Critical')) return 'Critical';
        if (alerts.length > 0) return 'Warning';
        return null;
    }, [alerts]);


    // Effect to handle clicks outside the worsening menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setWorseningMenuOpenFor(null);
            }
        };
        if (worseningMenuOpenFor) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [worseningMenuOpenFor]);

    const getTrendIcon = (trend: 'improving' | 'worsening' | 'stable') => {
        if (trend === 'worsening') return <span className="text-red-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l.293.293a1 1 0 001.414-1.414l-3-3z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg> Worsening</span>;
        if (trend === 'improving') return <span className="text-green-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.707-10.293a1 1 0 011.414-1.414l3 3a1 1 0 11-1.414 1.414L11 9.414V13a1 1 0 11-2 0V9.414l-.293.293a1 1 0 01-1.414-1.414l3-3z" clipRule="evenodd" /></svg> Improving</span>;
        return <span className="text-slate-400 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg> Stable</span>;
    };
    
    const getScoreColor = (score: number) => {
        if (score < 50) return 'text-red-400';
        if (score < 75) return 'text-yellow-400';
        return 'text-green-400';
    };

    const renderSortArrow = (key: keyof VendorStats) => {
        if (key !== sortConfig.key) return null;
        return sortConfig.direction === 'desc' ? '↓' : '↑';
    };


    return (
        <div className="space-y-6">
             <FilterDialog 
                isOpen={isFilterDialogOpen}
                onClose={() => setIsFilterDialogOpen(false)}
                onApply={setActiveFilters}
                initialFilters={activeFilters.length > 0 ? activeFilters : [{ id: Date.now(), field: 'none', operator: 'none', value: '' }]}
            />
            {/* Alert Configuration */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg mb-3">Global Monitoring Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Min. PO Lines</label>
                        <input type="number" value={uiThresholds.minPoLines} onChange={(e) => setUiThresholds(t => ({...t, minPoLines: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" title="Exclude vendors with fewer PO lines than this value" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Past Due Count &gt;</label>
                        <input type="number" value={uiThresholds.count} onChange={(e) => setUiThresholds(t => ({...t, count: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Past Due % &gt;</label>
                        <input type="number" value={uiThresholds.percentage} onChange={(e) => setUiThresholds(t => ({...t, percentage: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="hidden lg:block lg:col-span-1 text-center"><div className="h-10 border-l border-slate-600 mx-auto"></div></div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Trend: Days Back</label>
                        <input type="number" value={uiThresholds.worseningDays} onChange={(e) => setUiThresholds(t => ({...t, worseningDays: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" title="How many days back to look for negative changes" />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Trend: Changes % &gt;</label>
                        <input type="number" value={uiThresholds.worseningPercentage} onChange={(e) => setUiThresholds(t => ({...t, worseningPercentage: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" title="Flag as 'Worsening' if the % of PO lines with recent negative changes exceeds this value" />
                    </div>
                    <div className="lg:col-span-1">
                         <button onClick={handleApplyRules} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition">Apply</button>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-lg mb-3">Vendor-Specific Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 items-end bg-slate-900/30 p-4 rounded-md">
                        <div className="md:col-span-4"><label className="block text-sm text-slate-400 mb-1">Vendor</label><select value={newRule.vendorName} onChange={(e) => setNewRule(r => ({...r, vendorName: e.target.value}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">{allVendors.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                         <div className="md:col-span-4"><label className="block text-sm text-slate-400 mb-1">Rule Type</label><select value={newRule.ruleType} onChange={(e) => setNewRule(r => ({...r, ruleType: e.target.value}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">{Object.entries(RULE_DEFINITIONS).map(([key, { label }]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                        <div className="md:col-span-2"><label className="block text-sm text-slate-400 mb-1">{RULE_DEFINITIONS[newRule.ruleType]?.unitLabel || 'Threshold >'}</label><input type="number" value={newRule.threshold} onChange={(e) => setNewRule(r => ({...r, threshold: parseInt(e.target.value, 10) || 0}))} className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div className="md:col-span-2"><button onClick={handleAddVendorRule} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition">Add Rule</button></div>
                    </div>
                    {vendorRules.length > 0 && (<div className="mt-4 space-y-2">{vendorRules.map(rule => (<div key={rule.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-md text-sm"><div className="flex items-center gap-4"><span className="font-semibold text-slate-200">{rule.vendorName}</span><span className="text-slate-400">{RULE_DEFINITIONS[rule.ruleType]?.label} {rule.ruleType === 'performance_score' ? '<' : '>'} {rule.threshold} {RULE_DEFINITIONS[rule.ruleType]?.unitName}</span></div><button onClick={() => handleDeleteVendorRule(rule.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>))}</div>)}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                    <h3 className="font-semibold text-lg mb-3">Notification Channels</h3>
                    <div className="space-y-4">
                        {/* Email Channel */}
                        <div>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={isEmailEnabled}
                                    onChange={(e) => setIsEmailEnabled(e.target.checked)}
                                    className="h-5 w-5 bg-slate-600 border-slate-500 rounded text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-slate-200">Enable Email Notifications</span>
                            </label>
                            {isEmailEnabled && (
                                <div className="mt-2 pl-8 animate-fade-in">
                                    <input 
                                        type="email"
                                        placeholder="e.g., team@example.com, manager@example.com"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Comma-separated email addresses.</p>
                                </div>
                            )}
                        </div>
                        {/* Teams Channel */}
                        <div>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={isTeamsEnabled}
                                    onChange={(e) => setIsTeamsEnabled(e.target.checked)}
                                    className="h-5 w-5 bg-slate-600 border-slate-500 rounded text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-slate-200">Enable Microsoft Teams Notifications</span>
                            </label>
                            {isTeamsEnabled && (
                                <div className="mt-2 pl-8 animate-fade-in">
                                    <input 
                                        type="url"
                                        placeholder="Enter MS Teams Webhook URL"
                                        value={teamsWebhookUrl}
                                        onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                                        className="bg-slate-700 border border-slate-600 rounded-md p-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className={`p-4 rounded-lg border ${highestAlertSeverity === 'Critical' ? 'border-red-600 bg-red-900/30' : 'border-yellow-600 bg-yellow-900/30'}`}>
                    <h3 className={`font-semibold text-lg mb-3 ${highestAlertSeverity === 'Critical' ? 'text-red-300' : 'text-yellow-300'}`}>Active Alerts ({alerts.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {alerts.map(alert => (<div key={alert.id} className={`flex items-start p-3 rounded-md border-l-4 ${alert.severity === 'Critical' ? 'bg-red-900/50 border-red-500' : 'bg-yellow-900/50 border-yellow-500'}`}><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 flex-shrink-0 ${alert.severity === 'Critical' ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg><div><p className={`font-bold ${alert.severity === 'Critical' ? 'text-red-300' : 'text-yellow-300'}`}>{alert.vendor}</p><p className="text-sm text-slate-300" dangerouslySetInnerHTML={{ __html: alert.message.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}></p></div></div>))}
                    </div>
                </div>
            )}
            
            <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => setIsFilterDialogOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                        Filter
                    </button>
                    <div className="flex flex-wrap gap-2 items-center">
                        {activeFilters.map(filter => {
                             const fieldLabel = FIELD_OPTIONS.find(f => f.value === filter.field)?.label || '';
                             const operatorLabel = OPERATORS[FIELD_OPTIONS.find(f => f.value === filter.field)?.type || 'string']?.find(o => o.value === filter.operator)?.label || '';
                            return (
                                <div key={filter.id} className="bg-slate-600 text-xs text-slate-200 px-2.5 py-1 rounded-full flex items-center gap-2">
                                    <span><strong>{fieldLabel}</strong> {operatorLabel} <em>{filter.value}</em></span>
                                    <button onClick={() => handleRemoveActiveFilter(filter.id)} className="text-slate-400 hover:text-white">&times;</button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-700/50">
                        <tr>
                            {(['name', 'vendorNumber', 'performanceScore', 'totalLines', 'pastDueLinesCount', 'pastDuePercentage', 'trend'] as const).map((key) => {
                                const labels: Record<keyof VendorStats, string> = { name: 'Vendor', vendorNumber: 'Vendor #', performanceScore: 'Perf. Score', totalLines: 'Total PO Lines', pastDueLinesCount: 'Past Due Lines', pastDuePercentage: 'Past Due %', trend: 'Trend', recentNegativeChanges: '' };
                                return (
                                    <th key={key} scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                        <button onClick={() => handleSort(key)} className="flex items-center space-x-1 focus:outline-none hover:text-white">
                                            <span>{labels[key]}</span>
                                            <span className="text-slate-400 text-base">{renderSortArrow(key)}</span>
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAndSortedVendors.map((vendor) => {
                            const isExpanded = expandedVendor === vendor.name;
                            return (
                                <React.Fragment key={vendor.name}>
                                    <tr className="hover:bg-slate-700/40 cursor-pointer" onClick={() => setExpandedVendor(v => v === vendor.name ? null : vendor.name)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 transition-transform duration-200 text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>{vendor.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{vendor.vendorNumber}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getScoreColor(vendor.performanceScore)}`}>{vendor.performanceScore.toFixed(0)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{vendor.totalLines}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{vendor.pastDueLinesCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300"><div className="flex items-center"><span>{vendor.pastDuePercentage.toFixed(1)}%</span><div className="w-24 bg-slate-600 rounded-full h-2.5 ml-3"><div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${vendor.pastDuePercentage > 100 ? 100 : vendor.pastDuePercentage}%` }}></div></div></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><div className="flex items-center justify-between">{getTrendIcon(vendor.trend)}<div className="relative" ref={vendor.name === worseningMenuOpenFor ? menuRef : null}>{vendor.trend === 'worsening' ? (<><button onClick={(e) => { e.stopPropagation(); setWorseningMenuOpenFor(v => v === vendor.name ? null : vendor.name); }} className="p-1.5 rounded-full hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500" title="Actions"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg></button>{worseningMenuOpenFor === vendor.name && (<div className="absolute z-20 right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-md shadow-lg py-1"><button onClick={() => { onAnalyzeVendor(vendor.name); setWorseningMenuOpenFor(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">Run AI Diagnostics</button><a href={`https://www.metabase.com/docs/latest/users-guide/start?vendor_number=${vendor.vendorNumber}`} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">View Details in BI</a></div>)}</>) : (<a href={`https://www.metabase.com/docs/latest/users-guide/start?vendor_number=${vendor.vendorNumber}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500" title="View Details in BI"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>)}</div></div></td>
                                    </tr>
                                    {isExpanded && (<tr className="bg-slate-900/40"><td colSpan={7} className="p-0"><div className="p-4"><VendorTrendChart vendorName={vendor.name} vendorPoLines={vendorPoLinesMap.get(vendor.name) || []} poLogs={poLogs} daysBack={appliedThresholds.worseningDays}/></div></td></tr>)}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                 {filteredAndSortedVendors.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        No vendors match the current filter and rule criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorMonitoring;