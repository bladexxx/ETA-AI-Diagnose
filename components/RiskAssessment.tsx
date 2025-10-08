import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getRiskPrediction, categorizeJustifications, getWhatIfSimulation } from '../services/geminiService';
import type { POLine, EnrichedRiskAssessmentResult, JustificationCategory, Language } from '../types';
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


const RiskAssessment: React.FC<{ poLines: POLine[]; }> = ({ poLines }) => {
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
      const filteredPoLines = poLines.filter(line => selectedVendors.includes(line.vendor));
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
  }, [isAssessing, selectedVendors, poLines, language, poLineToVendorMap]);
  
  const handleRunSimulation = async () => {
    if (isSimulating || !simulationPrompt.trim()) return;
    setIsSimulating(true);
    setSimulationResult('');
    
    try {
        const filteredPoLines = selectedVendors.length > 0 
            ? poLines.filter(line => selectedVendors.includes(line.vendor))
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
    // FIX: Using destructuring `([, valA], [, valB])` is safer and more explicit than index access,
    // correctly inferring `valA` and `valB` as numbers to fix the arithmetic operation type error.
    Object.entries(vendorSummary).sort(([, valA], [, valB]) => valB - valA),
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
              className="bg-purple-600 hover:bg-purple-500 w-full text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 flex items-center justify-center whitespace-nowrap"
            >
              {isAssessing ? <Spinner /> : `Run Assessment`}
            </button>
          </div>
        </div>

        {isAssessing ? (
          <div className="flex justify-center items-center my-12"><Spinner /> <span className="ml-3 text-lg">AI is assessing risks for selected vendors...</span></div>
        ) : riskResults.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Please select vendors and run an assessment to see the risk profile.</div>
        ) : (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryCard title="High-Risk Lines by Vendor">
                {sortedVendorSummary.length > 0 ? (
                   sortedVendorSummary
                    .map(([vendor, count]) => (
                      <div key={vendor} className="flex justify-between">
                        <span>{vendor}</span>
                        <span className="font-bold text-red-400">{count} lines</span>
                      </div>
                    ))
                ) : <p className="text-slate-400">No high-risk lines found.</p>}
              </SummaryCard>
               <SummaryCard title="AI-Powered Justification Summary (High Risk)">
                {sortedJustificationSummary.length > 0 ? (
                   sortedJustificationSummary
                    .map(({ category, count }) => (
                      <div key={category} className="flex justify-between">
                        <span>{category}</span>
                        <span className="font-bold text-red-400">{count} lines</span>
                      </div>
                    ))
                ) : <p className="text-slate-400">No high-risk lines to categorize.</p>}
              </SummaryCard>
            </div>
            
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50">
                  <tr>
                    {[{label: 'PO Line', key: 'po_line_id'}, {label: 'Vendor', key: 'vendor'}, {label: 'Risk Level', key: 'risk_level'}].map(({label, key}) => (
                      <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        <button onClick={() => handleSort(key as SortKey)} className="flex items-center space-x-1 focus:outline-none">
                          <span>{label}</span>
                          <span className="text-slate-400">{renderSortArrow(key as SortKey)}</span>
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedResults.map((item) => (
                    <tr key={item.po_line_id} className="hover:bg-slate-700/40">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-300">{item.po_line_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{item.vendor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(item.risk_level)}`}>
                              {item.risk_level}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{item.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* --- What-If Simulation Section --- */}
      <section className="pt-8 border-t border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">AI What-If Simulation</h2>
         <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-4">
            <h3 className="font-semibold text-lg">Define Scenario</h3>
            <p className="text-sm text-slate-400">The simulation will run against the vendors selected for the risk assessment above. If none are selected, it will run against all vendors.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleRunSimulation(); }} className="flex flex-col sm:flex-row items-start gap-3">
                <textarea
                    value={simulationPrompt}
                    onChange={(e) => setSimulationPrompt(e.target.value)}
                    placeholder="e.g., What if Stellar Supplies transit time increases by 5 days? Which POs become high risk?"
                    className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white min-h-[60px] sm:min-h-0"
                    disabled={isSimulating}
                    rows={2}
                />
                <button 
                  type="submit"
                  disabled={isSimulating || !simulationPrompt.trim()}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 flex items-center justify-center w-full sm:w-auto"
                >
                  {isSimulating ? <Spinner /> : 'Run Simulation'}
                </button>
            </form>
        </div>

        <div className="mt-6">
            <h3 className="font-semibold text-lg mb-2">Simulation Result</h3>
            <div className="bg-slate-900/50 p-4 rounded-lg overflow-y-auto border border-slate-700 min-h-[25vh]">
                {isSimulating && <div className="flex justify-center items-center my-4"><Spinner /> <span className="ml-2">AI is running the simulation...</span></div>}
                {simulationResult ? (
                    <div 
                      className="prose prose-invert max-w-none" 
                      dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(simulationResult) : simulationResult.replace(/\n/g, '<br />') }}
                    ></div>
                ) : (
                    !isSimulating && <p className="text-slate-400 text-center p-8">Enter a scenario above to see how it impacts your risk profile.</p>
                )}
                 <div ref={resultEndRef} />
            </div>
        </div>
      </section>
    </div>
  );
};

export default RiskAssessment;