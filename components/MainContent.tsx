
import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface MainContentProps {
  logs: LogEntry[];
}

const MERMAID_DIAGRAM = `
flowchart TB
  subgraph UI["UI Layer"]
    A1["Pick Folders"]
    A2["Set Options (minConfidence)"]
    A3["Run Job"]
  end

  subgraph Orchestrator
    B["Process Directory"]
    C["File Queue (Batching)"]
  end

  subgraph "Classification Worker (Simulated)"
    D["Classify File"]
    E["1. Magic Bytes"]
    F["2. MIME / Extension"]
    G["3. Text Analysis (<10MB)"]
    H["4. Heuristics"]
    I["Aggregator (Highest Confidence)"]
  end
  
  subgraph Output
    J["Log Result (Dry Run)"]
    K["Update UI Stats"]
  end

  A1 --> B
  A2 --> B
  A3 --> B
  B --> C
  C --"batch"--> D
  D --> E --> F --> G --> H --> I
  I --> J --> K
`;


export function MainContent({ logs }: MainContentProps): React.ReactElement {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mermaid = (window as any).mermaid;
    if (mermaid && mermaidRef.current) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      mermaid.run({
        nodes: [mermaidRef.current]
      });
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-[#0c1322] overflow-hidden">
      <div className="p-4 border-b border-[#1d2638]">
        <h2 className="text-lg font-semibold text-white">Classification Pipeline</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-[#0f1523] border border-[#1d2638] rounded-lg p-4 mb-4">
          <div ref={mermaidRef} className="mermaid w-full flex justify-center">
            {MERMAID_DIAGRAM}
          </div>
           <p className="text-xs text-center text-[#9fb0c3] mt-2">This diagram reflects the classification pipeline from UI interaction to final output.</p>
        </div>
      </div>
      <div className="h-1/3 flex flex-col border-t border-[#1d2638]">
         <div className="p-2 px-4 bg-[#0f1523]">
            <h3 className="text-sm font-semibold text-white">Logs</h3>
         </div>
         <div className="flex-1 bg-black/20 p-4 overflow-y-auto font-mono text-xs">
           {logs.map((log, index) => (
             <div key={index} className="flex gap-2 items-start">
               <span className="text-gray-600">{log.timestamp.toLocaleTimeString()}</span>
               <span className={`${getLogColor(log.type)} flex-1`}>{log.message}</span>
             </div>
           ))}
           <div ref={logsEndRef} />
         </div>
      </div>
    </main>
  );
}
