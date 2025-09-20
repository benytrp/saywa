
import React, { useState } from 'react';
import type { ClassificationOptions, ClassificationStats } from '../types';
import { FolderIcon, PlayIcon, StopIcon, CodeBracketIcon } from './icons';

interface SidebarProps {
  inputHandle: FileSystemDirectoryHandle | null;
  outputHandle: FileSystemDirectoryHandle | null;
  isRunning: boolean;
  onPickInput: () => void;
  onPickOutput: () => void;
  onRunJob: (options: ClassificationOptions) => void;
  onStopJob: () => void;
  classificationStats: ClassificationStats;
}

export function Sidebar({
  inputHandle,
  outputHandle,
  isRunning,
  onPickInput,
  onPickOutput,
  onRunJob,
  onStopJob,
  classificationStats,
}: SidebarProps): React.ReactElement {
  const [options, setOptions] = useState<ClassificationOptions>({
    enabled: true,
    minConfidence: 0.6,
    showPreview: false,
    batchSize: 10,
  });

  const handleOptionChange = <K extends keyof ClassificationOptions,>(key: K, value: ClassificationOptions[K]) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRun = () => {
    onRunJob(options);
  };
  
  const totalCategories = Object.values(classificationStats.categories).reduce((sum, count) => sum + count, 0);

  return (
    <aside className="w-80 bg-[#0f1523] border-r border-[#1d2638] p-4 overflow-y-auto flex flex-col gap-6 text-sm flex-shrink-0">
      <header className="flex items-center gap-2 pb-2 border-b border-[#1d2638]">
        <CodeBracketIcon className="w-6 h-6 text-[#7dd3fc]" />
        <h1 className="text-lg font-bold text-white">File Classifier</h1>
      </header>

      <div>
        <h2 className="text-xs font-bold uppercase text-[#9fb0c3] mb-2 tracking-wider">Mount Folders</h2>
        <div className="flex flex-col gap-2">
          <button onClick={onPickInput} className="w-full flex items-center justify-center gap-2 bg-[#192136] border border-[#29334d] hover:bg-[#1e2742] hover:border-[#3b4766] rounded-md px-3 py-2 transition-colors truncate">
            <FolderIcon /> <span className="truncate">{inputHandle ? `Input: ${inputHandle.name}` : '📥 Pick Input Folder'}</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase text-[#9fb0c3] mb-2 tracking-wider">Classification</h2>
        <div className="bg-[#192136]/50 border border-[#29334d]/50 rounded-md p-3 space-y-4">
          <label className="flex items-center justify-between text-xs cursor-pointer">
            <span>Enable Classification</span>
            <input 
              type="checkbox" 
              checked={options.enabled} 
              onChange={e => handleOptionChange('enabled', e.target.checked)}
              className="accent-[#7dd3fc] h-4 w-4"
              disabled={isRunning}
            />
          </label>
          
          {options.enabled && (
            <>
              <div>
                <label className="block text-xs text-[#9fb0c3] mb-1">
                  Min Confidence: {(options.minConfidence * 100).toFixed(0)}%
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05"
                  value={options.minConfidence}
                  onChange={e => handleOptionChange('minConfidence', parseFloat(e.target.value))}
                  className="w-full accent-[#7dd3fc]"
                  disabled={isRunning}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                 <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={options.showPreview} 
                    onChange={e => handleOptionChange('showPreview', e.target.checked)}
                    className="accent-[#7dd3fc] h-4 w-4"
                    disabled={isRunning}
                  />
                  Preview
                </label>
                <div>
                  <label htmlFor="batchSize" className="block text-[10px] text-[#9fb0c3] mb-1">Batch Size</label>
                  <select 
                    id="batchSize"
                    value={options.batchSize} 
                    onChange={e => handleOptionChange('batchSize', parseInt(e.target.value))}
                    className="w-full bg-[#0c1322] border border-[#25314a] rounded text-xs px-2 py-1"
                    disabled={isRunning}
                  >
                    <option value={5}>5 files</option>
                    <option value={10}>10 files</option>
                    <option value={20}>20 files</option>
                    <option value={50}>50 files</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {classificationStats.total > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase text-[#9fb0c3] mb-2 tracking-wider">Statistics</h2>
           <div className="bg-[#192136]/50 border border-[#29334d]/50 rounded-md p-3 space-y-2 text-xs">
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                 <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${(classificationStats.classified / classificationStats.total) * 100}%` }}></div>
              </div>
              <div className="flex justify-between"><span>Classified:</span> <span>{classificationStats.classified} / {classificationStats.total}</span></div>
              <div className="flex justify-between"><span>High Confidence (&gt;80%):</span> <span>{classificationStats.highConfidence}</span></div>
              {totalCategories > 0 && <div className="border-t border-[#29334d]/50 pt-2 mt-2 space-y-1">
                {Object.entries(classificationStats.categories)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                  <div key={category} className="flex justify-between text-[11px]">
                    <span className="capitalize">{category}:</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>}
           </div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-[#1d2638]">
        <div className="flex gap-2">
          {isRunning ? (
            <button onClick={onStopJob} className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 border border-red-500 rounded-md px-3 py-2 transition-colors font-semibold text-white">
              <StopIcon /> Stop
            </button>
          ) : (
            <button onClick={handleRun} className="w-full flex items-center justify-center gap-2 bg-sky-600/80 hover:bg-sky-600 border border-sky-500 rounded-md px-3 py-2 transition-colors font-semibold text-white" disabled={!inputHandle}>
              <PlayIcon /> Run Job
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
