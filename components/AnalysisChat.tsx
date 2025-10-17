import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getRootCauseAnalysis, translateText } from '../services/geminiService';
import * as knowledgeService from '../services/knowledgeService';
import type { POLine, POLog, Language, CategorizedAnalysisResult } from '../types';
import Spinner from './common/Spinner';
import KnowledgeBaseManager from './KnowledgeBaseManager';

declare const marked: any;
declare const html2canvas: any;
declare const jspdf: any;

const LanguageSelector: React.FC<{
    language: Language;
    onLanguageChange: (lang: Language) => void;
    disabled: boolean;
}> = ({ language, onLanguageChange, disabled }) => (
    <div className={`flex items-center bg-slate-700 rounded-lg p-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <button onClick={() => onLanguageChange('en')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`} disabled={disabled}>
            EN
        </button>
        <button onClick={() => onLanguageChange('zh')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'zh' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`} disabled={disabled}>
            ZH
        </button>
    </div>
);

interface AnalysisChatProps {
  poLines: POLine[];
  poLogs: POLog[];
  initialVendor: string | null;
  initialQuery: string | null;
  onAnalysisStart: () => void;
}

const ReportControls: React.FC<{
    onToggleFullscreen: () => void;
    isFullscreen: boolean;
    onExport: () => void;
    isExporting: boolean;
    hasContent: boolean;
}> = ({ onToggleFullscreen, isFullscreen, onExport, isExporting, hasContent }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-lg flex items-center p-1 space-x-1">
        <button onClick={onToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} className="p-1.5 hover:bg-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed" disabled={!hasContent}>
            {isFullscreen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" transform="rotate(180 12 12)" /></svg>
            )}
        </button>
        <div className="border-l border-slate-600 h-5 mx-1"></div>
        <button onClick={onExport} title="Export to PDF" className="p-1.5 hover:bg-slate-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed" disabled={isExporting || !hasContent}>
            {isExporting ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
        </button>
    </div>
);

const CategoryIcon: React.FC<{ category: 'Vendor Issues' | 'Internal (EMT) Issues' }> = ({ category }) => {
    if (category === 'Vendor Issues') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1zM3 11h10" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
};

const AnalysisChat: React.FC<AnalysisChatProps> = ({ poLines, poLogs, initialVendor, initialQuery, onAnalysisStart }) => {
  const [query, setQuery] = useState('');
  const [analysisContent, setAnalysisContent] = useState<{ en: CategorizedAnalysisResult | null, zh: CategorizedAnalysisResult | null }>({ en: null, zh: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('All Vendors');
  const [language, setLanguage] = useState<Language>('en');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<{name: string, uploadedAt: string}[]>([]);
  const analysisEndRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const vendors = useMemo(() => ['All Vendors', ...Array.from(new Set(poLines.map(line => line.vendor)))], [poLines]);
  const currentAnalysis = language === 'zh' && analysisContent.zh ? analysisContent.zh : analysisContent.en;

  // Refresh file list from service
  const refreshKnowledgeFiles = useCallback(() => {
    setKnowledgeFiles(knowledgeService.listFiles());
  }, []);

  useEffect(() => {
    refreshKnowledgeFiles();
  }, [refreshKnowledgeFiles]);


  const PRESET_QUERIES = useMemo(() => [
    `Who are the top 5 past due vendors by absolute number of past due lines?`,
    selectedVendor === 'All Vendors' 
      ? `Which vendors have past due issues older than 3 months?` 
      : `What is the history of past due issues for ${selectedVendor}?`,
    `Analyze past due vendors considering both absolute count and percentage of total orders.`,
    selectedVendor === 'All Vendors'
      ? `What are common reasons for ETA changes based on the logs?`
      : `What are the primary reasons for ETA changes for ${selectedVendor}?`
  ], [selectedVendor]);

  const handleQuery = useCallback(async (currentQuery: string, vendorToAnalyze?: string) => {
    const vendor = vendorToAnalyze || selectedVendor;
    if (!currentQuery.trim() || isLoading) return;

    setIsLoading(true);
    setAnalysisContent({ en: null, zh: null });
    
    const filteredLines = vendor === 'All Vendors'
      ? poLines
      : poLines.filter(line => line.vendor === vendor);

    const poLineIdsForVendor = new Set(filteredLines.map(l => l.po_line_id));
    
    const filteredLogs = vendor === 'All Vendors'
      ? poLogs
      : poLogs.filter(log => poLineIdsForVendor.has(log.po_line_id));
      
    try {
      const knowledgeBaseContent = knowledgeService.getKnowledgeBaseContent();
      const result = await getRootCauseAnalysis(currentQuery, filteredLines, filteredLogs, vendor, 'en', knowledgeBaseContent);
      setAnalysisContent({ en: result, zh: null });
    } catch (error) {
       setAnalysisContent({ en: { summary: 'An error occurred while generating the analysis. Please check the console and try again.', analysis: [] }, zh: null });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, poLines, poLogs, selectedVendor]);
  
  const handleExportToPdf = async () => {
    if (!resultsContainerRef.current || isExporting) return;
    setIsExporting(true);

    try {
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(resultsContainerRef.current, {
            scale: 2, 
            backgroundColor: '#1e293b'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const widthInPdf = pdfWidth - 20; 
        const heightInPdf = widthInPdf / ratio;
        
        let heightLeft = heightInPdf;
        let position = 10;

        pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = position - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
            heightLeft -= pdfHeight;
        }
        
        const vendorName = selectedVendor.replace(/\s+/g, '_');
        const fileName = `vendor-diagnostics-report_${vendorName}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error("Failed to export PDF:", error);
    } finally {
        setIsExporting(false);
    }
  };

  useEffect(() => {
    if (initialVendor && initialQuery) {
        setSelectedVendor(initialVendor);
        setQuery(initialQuery);
        handleQuery(initialQuery, initialVendor);
        onAnalysisStart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVendor, initialQuery]);

  useEffect(() => {
    analysisEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentAnalysis]);
  
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    const handleTranslate = async () => {
        if (language === 'en' || !analysisContent.en || analysisContent.zh) {
            return;
        }

        setIsTranslating(true);
        try {
            const translatedResult = await translateText(analysisContent.en, 'zh');
            setAnalysisContent(prev => ({ ...prev, zh: translatedResult }));
        } catch (error) {
            console.error("Translation failed", error);
        } finally {
            setIsTranslating(false);
        }
    };

    handleTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, analysisContent.en]);
  
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullscreen]);


  return (
    <div className={`flex flex-col transition-all duration-300 ${isFullscreen ? 'fixed inset-0 bg-slate-900 z-50 h-screen p-4' : 'h-full'}`}>
        {!isFullscreen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="vendor-select" className="block text-sm font-medium text-slate-300 mb-1">Select a Vendor to Diagnose</label>
                <select 
                    id="vendor-select"
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <KnowledgeBaseManager 
                files={knowledgeFiles}
                onFilesUpdate={refreshKnowledgeFiles}
              />
          </div>
        )}

        <div className="flex-grow bg-slate-800 rounded-lg border border-slate-700 mb-4 flex flex-col overflow-hidden min-h-[50vh]">
             <div className="p-2 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-300">Report Language</label>
                    <LanguageSelector language={language} onLanguageChange={setLanguage} disabled={!analysisContent.en} />
                </div>
                <ReportControls 
                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                    isFullscreen={isFullscreen}
                    onExport={handleExportToPdf}
                    isExporting={isExporting}
                    hasContent={!!analysisContent.en}
                 />
            </div>
            <div className="overflow-y-auto p-4 flex-grow relative">
                {isTranslating && (
                    <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center z-10">
                       <Spinner /> <span className="ml-2">Translating...</span>
                    </div>
                )}
                {currentAnalysis ? (
                    <div ref={resultsContainerRef} className="space-y-6">
                        <div className="prose prose-invert max-w-none prose-p:text-slate-300">
                             <div dangerouslySetInnerHTML={{ __html: marked.parse(currentAnalysis.summary) }}></div>
                        </div>

                        {currentAnalysis.analysis.map((categoryItem, index) => (
                            <div key={index} className="p-4 bg-slate-900/40 border border-slate-700 rounded-lg">
                                <h3 className="font-semibold text-lg text-slate-100 mb-3 flex items-center">
                                    <CategoryIcon category={categoryItem.category} />
                                    {categoryItem.category}
                                </h3>
                                <div className="prose prose-invert max-w-none space-y-2">
                                    {categoryItem.points.map((point, pIndex) => (
                                        <div key={pIndex} className="p-3 bg-slate-800/50 rounded-md" dangerouslySetInnerHTML={{ __html: marked.parse(point) }}></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                   !isLoading && (
                     <div className="text-slate-400 text-center flex flex-col justify-center h-full">
                        <p>Select a vendor and ask a question, or choose a preset query to begin your diagnostic analysis.</p>
                     </div>
                   )
                )}
                 {isLoading && <div className="flex justify-center items-center my-4"><Spinner /> <span className="ml-2">AI is analyzing...</span></div>}
                <div ref={analysisEndRef} />
            </div>
        </div>

        {!isFullscreen && (
          <div className="mt-auto">
               <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_QUERIES.map((q, i) => (
                      <button 
                          key={i} 
                          onClick={() => { setQuery(q); handleQuery(q); }}
                          disabled={isLoading}
                          className="bg-slate-700 text-xs text-blue-300 px-3 py-1.5 rounded-full hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {q}
                      </button>
                  ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleQuery(query); }} className="flex gap-3">
                  <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={selectedVendor === 'All Vendors' ? "e.g., Which vendor has the most frequent delays?" : `e.g., Diagnose performance issues for ${selectedVendor}`}
                      className="flex-grow bg-slate-700 border border-slate-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      disabled={isLoading}
                  />
                  <button
                      type="submit"
                      disabled={isLoading || !query.trim()}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 flex items-center justify-center"
                  >
                      {isLoading ? <Spinner /> : 'Ask AI'}
                  </button>
              </form>
          </div>
        )}
    </div>
  );
};

export default AnalysisChat;