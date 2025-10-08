import React from 'react';

const MetabaseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 54 54">
        <g clipPath="url(#clip0_101_2)">
            <path d="M4.5 40.5V13.5L27 0L49.5 13.5V40.5L27 54L4.5 40.5Z" fill="#509EE3"/>
            <path d="M49.5 13.5L27 27V54L49.5 40.5V13.5Z" fill="#3879B8"/>
            <path d="M27 27L4.5 13.5V40.5L27 54V27Z" fill="#2D6293"/>
        </g>
        <defs>
            <clipPath id="clip0_101_2">
                <rect width="54" height="54" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-20 shadow-lg shadow-slate-950/50 p-4 flex justify-between items-center border-b border-slate-700">
      <div className="flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h1 className="text-xl sm:text-2xl font-bold text-white">ETA AI Diagnose</h1>
      </div>
      <div className="flex items-center space-x-4">
        <a 
            href="https://www.metabase.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
        >
            <MetabaseIcon />
            <span>BI Dashboard</span>
        </a>
      </div>
    </header>
  );
};

export default Header;