import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMemory } from '../../api/client';
import { useStore } from '../../store/useStore';
import { Clock, CheckCircle } from 'lucide-react';

export const EpisodicTimeline: React.FC = () => {
  const currentCaseId = useStore((state) => state.currentCaseId);
  
  const { data: memoryData, isLoading } = useQuery({
    queryKey: ['memory', currentCaseId],
    queryFn: () => getMemory(currentCaseId!),
    enabled: !!currentCaseId,
  });

  if (!currentCaseId) return null;
  if (isLoading) return <div className="glass-panel p-6 animate-pulse h-64" />;
  if (!memoryData) return null;

  return (
    <div className="glass-panel p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-eureka-accent" />
        Episodic Memory
      </h2>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-600 before:to-transparent">
        {memoryData.timeline.map((event, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-600 bg-slate-800 text-eureka-accent shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 rounded border border-slate-700/50 shadow">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-slate-300">{event.stage}</div>
                <time className="font-mono text-xs text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</time>
              </div>
              <div className="text-sm text-eureka-glow">{event.event}</div>
              <pre className="text-xs text-slate-400 mt-2 bg-slate-900 p-2 rounded overflow-x-auto border border-slate-800">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
