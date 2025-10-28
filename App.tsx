
import React, { useState } from 'react';
import Header from './components/Header';
import VendorMonitoring from './components/VendorMonitoring';
import AnalysisChat from './components/AnalysisChat';
import RiskAssessment from './components/RiskAssessment';
import { openPoStatusLatest, openPoStatusLog, groupedDataByVendor } from './data/mockData';
import type { POLine, POLog, CategorizedAnalysisResult } from './types';
import { Tab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Monitoring);
  const [poLines] = useState<POLine[]>(openPoStatusLatest);
  const [poLogs] = useState<POLog[]>(openPoStatusLog);

  // State to bridge Monitoring and Analysis tabs
  const [analysisVendor, setAnalysisVendor] = useState<string | null>(null);
  const [analysisQuery, setAnalysisQuery] = useState<string | null>(null);

  // State for persisting analysis content
  const [analysisContent, setAnalysisContent] = useState<{ en: CategorizedAnalysisResult | null, zh: CategorizedAnalysisResult | null }>({ en: null, zh: null });

  const handleAnalyzeWorseningVendor = (vendorName: string) => {
    setActiveTab(Tab.Analysis);
    setAnalysisVendor(vendorName);
    // Pre-define a specific query for the analysis component
    const query = `Analyze the root cause for the recent worsening performance trend for ${vendorName}. What specific POs or ETA changes in the last 7-14 days contributed to this?`;
    setAnalysisQuery(query);
    // Clear previous analysis when starting a new one from monitoring
    setAnalysisContent({ en: null, zh: null });
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Monitoring:
        return <VendorMonitoring poLines={poLines} poLogs={poLogs} onAnalyzeVendor={handleAnalyzeWorseningVendor} />;
      case Tab.Analysis:
        return (
          <AnalysisChat 
            poLines={poLines} 
            poLogs={poLogs}
            groupedData={groupedDataByVendor}
            initialVendor={analysisVendor}
            initialQuery={analysisQuery}
            analysisContent={analysisContent}
            setAnalysisContent={setAnalysisContent}
            onAnalysisStart={() => {
              setAnalysisVendor(null);
              setAnalysisQuery(null);
            }}
          />
        );
      case Tab.RiskAndSim:
        return <RiskAssessment poLines={poLines} groupedData={groupedDataByVendor} />;
      default:
        return <VendorMonitoring poLines={poLines} poLogs={poLogs} onAnalyzeVendor={handleAnalyzeWorseningVendor} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg shadow-2xl shadow-slate-950/50">
          <nav className="flex border-b border-slate-700 flex-wrap p-1.5 bg-slate-800/30 rounded-t-lg">
            <TabButton
              label="Monitoring & Alerts"
              isActive={activeTab === Tab.Monitoring}
              onClick={() => setActiveTab(Tab.Monitoring)}
            />
            <TabButton
              label="AI Diagnostics"
              isActive={activeTab === Tab.Analysis}
              onClick={() => setActiveTab(Tab.Analysis)}
            />
            <TabButton
              label="Risk & Simulation"
              isActive={activeTab === Tab.RiskAndSim}
              onClick={() => setActiveTab(Tab.RiskAndSim)}
            />
          </nav>
          <div className="p-4 sm:p-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 flex-grow text-center ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    {label}
  </button>
);


export default App;
