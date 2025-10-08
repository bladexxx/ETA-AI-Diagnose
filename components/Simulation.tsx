import React, { useState, useRef, useEffect } from 'react';
import { getWhatIfSimulation } from '../services/geminiService';
import type { POLine, Language } from '../types';
import Spinner from './common/Spinner';

declare const marked: any; // Declare marked as a global variable from the CDN script

interface SimulationProps {
  poLines: POLine[];
  language: Language;
}

const Simulation: React.FC<SimulationProps> = ({ poLines, language }) => {
  const [threshold, setThreshold] = useState('7');
  const [condition, setCondition] = useState('ETA push-out in days');
  const [simulationResult, setSimulationResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resultEndRef = useRef<HTMLDivElement>(null);


  const handleRunSimulation = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setSimulationResult('');
    const prompt = `If we change the alerting threshold for past due orders to '${threshold} days for ${condition}', what would be the impact? For example, how many orders would be newly flagged, and which vendors are most affected?`;
    
    try {
        const result = await getWhatIfSimulation(prompt, poLines, language);
        setSimulationResult(result);
    } catch(error) {
        setSimulationResult('An error occurred during the simulation. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulationResult]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-4">AI What-If Simulation</h2>
      <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-4">
        <h3 className="font-semibold text-lg">Set Simulation Parameters</h3>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-gray-300">If</span>
          <select 
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>ETA push-out in days</option>
            <option>Scheduled Ship Qty reduction</option>
            <option>Open Qty increase</option>
          </select>
          <span className="text-gray-300">is greater than</span>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md p-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-green-800 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : 'Run Simulation'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-2">Simulation Result</h3>
        <div className="bg-gray-900/50 p-4 rounded-lg overflow-y-auto border border-gray-700 min-h-[30vh]">
            {isLoading && <div className="flex justify-center items-center my-4"><Spinner /> <span className="ml-2">AI is running the simulation...</span></div>}
            {simulationResult && (
                <div 
                  className="prose prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(simulationResult) : simulationResult.replace(/\n/g, '<br />') }}
                ></div>
            )}
             <div ref={resultEndRef} />
        </div>
      </div>
    </div>
  );
};

export default Simulation;