import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getRiskPrediction, categorizeJustifications, getWhatIfSimulation } from '../services/geminiService';
import type { POLine, EnrichedRiskAssessmentResult, JustificationCategory, Language, POLog } from '../types';
import Spinner from './common/Spinner';

declare const marked: any;
type SortKey = 'vendor' | 'po_line_id' | 'risk_level';

const LanguageSelector: React.FC<{
    language: Language;
    onLanguageChange: (lang: Language) => void;
}> = ({ language, onLanguageChange }) => (
    <div className="flex items-center bg-slate-700 rounded-lg p-1">
        <button onClick={() => onLanguageChange('en')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
            EN
        </button>
        <button onClick={() => onLanguageChange('zh')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'zh' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
            ZH
        </button>
    </div>
);

const SummaryCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
        <h4 className="font-semibold text-slate-300 mb-2">{title}</h4>
        <div className="text-sm space-y-1">{children}</div>
    </div>
);

const VendorMultiSelect: React.FC<{
    allVendors: string[];
    selectedVendors: string[];
    onSelectionChange: (selected: string[]) => void;
}> = ({ allVendors, selectedVendors, onSelectionChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleToggleVendor = (vendor: string) => {
        const newSelection = selectedVendors.includes(vendor)
            ? selectedVendors.filter(v => v !== vendor)
            : [...selectedVendors, vendor];
        onSelectionChange(newSelection);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredVendors = useMemo(() => {
        return allVendors.filter(vendor =>
            vendor.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allVendors, searchTerm]);


    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 flex justify-between items-center text-left"
            >
                <span className="text-slate-300">
                    {selectedVendors.length === 0 ? "Select Vendors to Assess..." : `${selectedVendors.length} vendor(s) selected`}
                </span>
                <svg className={`w-5 h-5 transition-transform text-slate-400 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg flex flex-col">
                    <div className="p-2 border-b border-slate-700">
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto">
                        {filteredVendors.length > 0 ? (
                            filteredVendors.map(vendor => (
                            <li key={vendor} className="p-2.5 hover:bg-slate-700 cursor-pointer flex items-center" onClick={() => handleToggleVendor(vendor)}>
                                <input
                                    type="checkbox"
                                    checked={selectedVendors.includes(vendor)}
                                    readOnly
                                    className="h-4 w-4 bg-slate-600 border-slate-500 rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="ml-3 text-white">{vendor}</span>
                            </li>
                            ))
                        ) : (
                             <li className="p-2.5 text-slate-400 text-sm text-center">No vendors found.</li>
                        )}
                    </ul>
                </div>
            )}
             {selectedVendors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedVendors.map(vendor => (
                        <div key={vendor} className="bg-slate-600 text-xs text-white px-2 py-1 rounded-full flex items-center">
                            {vendor}
                            <button onClick={() => handleToggleVendor(vendor)} className="ml-2 text-slate-300 hover:text-white">
                                &#x2715;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const RiskAssessment: React.FC<{ poLines: POLine[]; groupedData: Map<string, { lines: POLine[], logs: POLog[] }> }> = ({ poLines, groupedData }) => {
  // State for Risk Assessment
  const [riskResults, setRiskResults] = useState<EnrichedRiskAssessmentResult[]>([]);
  const [vendorSummary, setVendorSummary] = useState<Record<string, number>>({});
  const [justificationSummary, setJustificationSummary] = useState<JustificationCategory[]>([]);
  const [isAssessing, setIsAssessing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('risk_level');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [language, setLanguage] = useState<Language>('en');

  // State for What-If Simulation
  const [simulationPrompt, setSimulationPrompt] = useState('');
  const [simulationResult, setSimulationResult] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const resultEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const allVendors = useMemo(() => [...new Set(poLines.map(line => line.vendor))].sort(), [poLines]);

  const poLineToVendorMap = useMemo(() => {
    return new Map(poLines.map(line => [line.po_line_id, line.vendor]));
  }, [poLines]);

  const handleRunAssessment = useCallback(async () => {
    if (isAssessing || selectedVendors.length === 0) return;

    setIsAssessing(true);
    setRiskResults([]);
    setVendorSummary({});
    setJustificationSummary([]);
    
    try {
      const filteredPoLines = selectedVendors.flatMap(vendor => groupedData.get(vendor)?.lines || []);
      const results = await getRiskPrediction(filteredPoLines, language);
      
      if (results.length > 0) {
        const enrichedResults: EnrichedRiskAssessmentResult[] = results
            .map(r => ({ ...r, vendor: poLineToVendorMap.get(r.po_line_id) || 'Unknown' }));
        
        setRiskResults(enrichedResults);

        const highRiskItems = enrichedResults.filter(r => r.risk_level === 'High');

        const vSummary: Record<string, number> = {};
        highRiskItems.forEach(item => {
          vSummary[item.vendor] = (vSummary[item.vendor] || 0) + 1;
        });
        setVendorSummary(vSummary);

        if(highRiskItems.length > 0) {
            const justifications = highRiskItems.map(item => item.justification);
            const jSummary = await categorizeJustifications(justifications, language);
            setJustificationSummary(jSummary);
        }
      }
    } catch (error) {
      console.error("Error in risk assessment:", error);
    } finally {
      setIsAssessing(false);
    }
  }, [isAssessing, selectedVendors, language, poLineToVendorMap, groupedData]);
  
  const handleRunSimulation = async () => {
    if (isSimulating || !simulationPrompt.trim()) return;
    setIsSimulating(true);
    setSimulationResult('');
    
    try {
        const filteredPoLines = selectedVendors.length > 0 
            ? selectedVendors.flatMap(vendor => groupedData.get(vendor)?.lines || [])
            : poLines; // Fallback to all if no vendors selected for simulation context
        const result = await getWhatIfSimulation(simulationPrompt, filteredPoLines, language);
        setSimulationResult(result);
    } catch(error) {
        setSimulationResult('An error occurred during the simulation. Please try again.');
    } finally {
        setIsSimulating(false);
    }
  };
  
  useEffect(() => {
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulationResult]);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    // Re-run assessment if results exist.
    if (riskResults.length > 0) {
        handleRunAssessment();
    }

    // Re-run simulation if result exists
    if (simulationResult) {
        handleRunSimulation();
    }
    // We intentionally only run this when language changes to act as a "translate" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  const sortedResults = useMemo(() => {
    return [...riskResults].sort((a, b) => {
      let valA: string | number = a[sortKey];
      let valB: string | number = b[sortKey];

      if (sortKey === 'risk_level') {
        const order = { High: 3, Medium: 2, Low: 1 };
        valA = order[a.risk_level] || 0;
        valB = order[b.risk_level] || 0;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [riskResults, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const getRiskColor = (level: 'High' | 'Medium' | 'Low') => {
      switch(level) {
          case 'High': return 'text-red-400 bg-red-900/40';
          case 'Medium': return 'text-yellow-400 bg-yellow-900/40';
          case 'Low': return 'text-slate-400 bg-slate-700/40';
          default: return '';
      }
  }

  const renderSortArrow = (key: SortKey) => {
    if (key !== sortKey) return null;
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  const sortedVendorSummary = useMemo(() =>
    // FIX: Destructuring in the sort callback was causing type inference issues. Switched to direct index access to ensure values are treated as numbers.
    Object.entries(vendorSummary).sort((a, b) => b[1] - a[1]),
    [vendorSummary]
  );

  const sortedJustificationSummary = useMemo(() =>
    [...justificationSummary].sort((a, b) => b.count - a.count),
    [justificationSummary]
  );


  return (
    <div className="space-y-8">
      {/* --- Risk Assessment Section --- */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-white">AI Risk Assessment &amp; Simulation</h2>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-300">
                    Report Language
                </label>
                <LanguageSelector language={language} onLanguageChange={setLanguage} />
            </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex-grow w-full md:max-w-md">
             <label className="block text-sm font-medium text-slate-300 mb-2">1. Select Vendors to Assess</label>
             <VendorMultiSelect
                allVendors={allVendors}
                selectedVendors={selectedVendors}
                onSelectionChange={setSelectedVendors}
             />
          </div>
          <div className="w-full md:w-auto flex-shrink-0">
             <label className="block text-sm font-medium text-slate-300 mb-2 invisible hidden md:block">2. Run</label>
            <button 
              onClick={handleRunAssessment}
              disabled={isAssessing || selectedVendors.length === 0}
              className="bg-purple-600 hover:bg-purple-500 w-full text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssessing ? <Spinner /> : 'Run Assessment'}
            </button>
          </div>
        </div>

        {isAssessing && <div className="flex justify-center items-center my-8"><Spinner /> <span className="ml-2">AI is assessing risks...</span></div>}

        {riskResults.length > 0 && !isAssessing && (
            <div className="mt-6 space-y-6 animate-fade-in">
                {/* Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SummaryCard title="High-Risk POs by Vendor">
                        {sortedVendorSummary.length > 0 ? (
                            <ul className="list-disc pl-4 text-slate-200">
                                {sortedVendorSummary.map(([vendor, count]) => (
                                    <li key={vendor}><strong>{vendor}:</strong> {count} POs</li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400">No vendors with high-risk POs.</p>}
                    </SummaryCard>
                    <SummaryCard title="Top Justification Categories (High-Risk)">
                        {sortedJustificationSummary.length > 0 ? (
                            <ul className="list-disc pl-4 text-slate-200">
                                {sortedJustificationSummary.map(({ category, count }) => (
                                    <li key={category}><strong>{category}:</strong> {count} times</li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400">No justifications to categorize.</p>}
                    </SummaryCard>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => handleSort('risk_level')} className="flex items-center space-x-1 focus:outline-none hover:text-white">
                                        <span>Risk Level</span><span className="text-slate-400 text-base">{renderSortArrow('risk_level')}</span>
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    <button onClick={() => handleSort('vendor')} className="flex items-center space-x-1 focus:outline-none hover:text-white">
                                        <span>Vendor</span><span className="text-slate-400 text-base">{renderSortArrow('vendor')}</span>
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                     <button onClick={() => handleSort('po_line_id')} className="flex items-center space-x-1 focus:outline-none hover:text-white">
                                        <span>PO Line</span><span className="text-slate-400 text-base">{renderSortArrow('po_line_id')}</span>
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Justification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedResults.map((item, index) => (
                                <tr key={`${item.po_line_id}-${index}`} className="hover:bg-slate-700/40">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRiskColor(item.risk_level)}`}>{item.risk_level}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.vendor}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-300">{item.po_line_id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-400 max-w-md">{item.justification}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </section>

      {/* --- What-If Simulation Section --- */}
      <section>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-3">AI What-If Simulation</h3>
            <p className="text-sm text-slate-400 mb-4">
                Propose a scenario to understand potential impacts. The AI will use the vendors selected above as context (or all vendors if none are selected).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={simulationPrompt}
                    onChange={(e) => setSimulationPrompt(e.target.value)}
                    placeholder="e.g., What if Quantum Parts has a 2-week production shutdown?"
                    className="flex-grow bg-slate-700 border border-slate-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    disabled={isSimulating}
                />
                <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating || !simulationPrompt.trim()}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isSimulating ? <Spinner /> : 'Run Simulation'}
                </button>
            </div>

            {(isSimulating || simulationResult) && (
                <div className="mt-4">
                    <h4 className="font-semibold text-slate-300 mb-2">Simulation Result:</h4>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600 min-h-[150px] max-h-[400px] overflow-y-auto">
                        {isSimulating && <div className="flex justify-center items-center my-4"><Spinner /> <span className="ml-2">AI is running the simulation...</span></div>}
                        {simulationResult && (
                            <div
                                className="prose prose-invert max-w-none prose-p:text-slate-300"
                                dangerouslySetInnerHTML={{ __html: marked.parse(simulationResult) }}
                            ></div>
                        )}
                        <div ref={resultEndRef} />
                    </div>
                </div>
            )}
        </div>
      </section>
    </div>
  );
};

export default RiskAssessment;