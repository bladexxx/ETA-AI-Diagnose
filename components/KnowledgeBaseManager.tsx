import React, { useRef, useState } from 'react';
import * as knowledgeService from '../services/knowledgeService';
import type { KnowledgeFile } from '../services/knowledgeService';
import Spinner from './common/Spinner';

interface KnowledgeBaseManagerProps {
    files: { name: string, uploadedAt: string }[];
    onFilesUpdate: () => void;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ files, onFilesUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles || uploadedFiles.length === 0) return;
        
        setIsUploading(true);

        const fileReadPromises = Array.from(uploadedFiles).map(file => {
            return new Promise<KnowledgeFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        name: file.name,
                        content: e.target?.result as string,
                        uploadedAt: new Date().toISOString(),
                    });
                };
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        });

        try {
            const newFiles = await Promise.all(fileReadPromises);
            newFiles.forEach(file => knowledgeService.addFile(file));
            onFilesUpdate();
        } catch (error) {
            console.error("Error reading files:", error);
            // Optionally show an error message to the user
        } finally {
            setIsUploading(false);
            // Reset file input to allow re-uploading the same file
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteFile = (fileName: string) => {
        knowledgeService.deleteFile(fileName);
        onFilesUpdate();
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to delete all knowledge base files? This action cannot be undone.")) {
            knowledgeService.clearAll();
            onFilesUpdate();
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    }

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Knowledge Base (for AI context)</label>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        accept=".md, .txt"
                        className="hidden"
                        disabled={isUploading}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                        disabled={isUploading}
                    >
                       {isUploading ? <Spinner/> :  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> }
                        Upload .md Files
                    </button>
                    {files.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="text-red-400 hover:text-red-300 text-sm font-semibold disabled:opacity-50"
                            disabled={isUploading}
                        >
                            Clear All
                        </button>
                    )}
                </div>
                {files.length > 0 && (
                     <div className="border-t border-slate-600 pt-3 max-h-24 overflow-y-auto pr-2">
                        <ul className="space-y-2">
                            {files.map(file => (
                                <li key={file.name} className="flex justify-between items-center text-sm bg-slate-800 p-2 rounded-md">
                                    <div className="flex flex-col">
                                        <span className="text-slate-200 truncate" title={file.name}>{file.name}</span>
                                        <span className="text-slate-400 text-xs">{timeAgo(file.uploadedAt)}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteFile(file.name)} 
                                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                                        title="Delete file"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeBaseManager;
