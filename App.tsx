
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import type { ClassificationOptions, EnhancedFileMeta, LogEntry, ClassificationStats, Job } from './types';
import { ClassificationManager } from './services/classificationService';

export default function App(): React.ReactElement {
  const [inputHandle, setInputHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [outputHandle, setOutputHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [classificationStats, setClassificationStats] = useState<ClassificationStats>({
    total: 0,
    classified: 0,
    highConfidence: 0,
    categories: {},
  });

  const classificationManagerRef = useRef<ClassificationManager | null>(null);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = { message, type, timestamp: new Date() };
    setLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
  }, []);

  useEffect(() => {
    if (!classificationManagerRef.current) {
      classificationManagerRef.current = new ClassificationManager({
        onLog: addLog,
        onStatsUpdate: setClassificationStats,
      });
    }
  }, [addLog]);

  const onPickInput = async () => {
    try {
      // FIX: Property 'showDirectoryPicker' does not exist on type 'Window & typeof globalThis'.
      const handle = await (window as any).showDirectoryPicker();
      setInputHandle(handle);
      addLog(`Input folder selected: "${handle.name}"`, 'success');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        addLog(`Error picking input folder: ${err.message}`, 'error');
      }
    }
  };

  const onPickOutput = async () => {
    try {
      // FIX: Property 'showDirectoryPicker' does not exist on type 'Window & typeof globalThis'.
      const handle = await (window as any).showDirectoryPicker();
      setOutputHandle(handle);
      addLog(`Output folder selected: "${handle.name}"`, 'success');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        addLog(`Error picking output folder: ${err.message}`, 'error');
      }
    }
  };

  const onRunJob = useCallback(async (options: ClassificationOptions) => {
    if (!inputHandle) {
      addLog('Please select an input folder first.', 'error');
      return;
    }
    if (isRunning) {
      addLog('A job is already running.', 'warn');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setClassificationStats({ total: 0, classified: 0, highConfidence: 0, categories: {} });
    addLog('Starting classification job...', 'info');

    try {
        await classificationManagerRef.current?.processDirectory(inputHandle, options, () => !isRunningRef.current);
        addLog('Classification job finished.', 'success');
    } catch (err) {
        if (err instanceof Error) {
            addLog(`Job failed: ${err.message}`, 'error');
        }
    } finally {
        setIsRunning(false);
    }
  }, [inputHandle, addLog, isRunning]);


  const onStopJob = useCallback(() => {
    if (isRunning) {
      setIsRunning(false); // This will update isRunningRef and signal the running job to stop
      addLog('Stopping job...', 'warn');
    }
  }, [isRunning, addLog]);


  return (
    <div className="flex h-screen font-sans">
      <Sidebar
        inputHandle={inputHandle}
        outputHandle={outputHandle}
        isRunning={isRunning}
        onPickInput={onPickInput}
        onPickOutput={onPickOutput}
        onRunJob={onRunJob}
        onStopJob={onStopJob}
        classificationStats={classificationStats}
      />
      <MainContent logs={logs} />
    </div>
  );
}
