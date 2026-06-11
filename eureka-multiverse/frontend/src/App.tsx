import React from 'react';
import { CaseAnalysisForm } from './components/forms/CaseAnalysisForm';
import { PredictionCard } from './components/results/PredictionCard';
import { AgentTraceGraph } from './components/visualizations/AgentTraceGraph';
import { EpisodicTimeline } from './components/visualizations/EpisodicTimeline';
import { BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-6">
        <div className="bg-eureka-accent p-3 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.6)]">
          <BrainCircuit className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            EUREKA Multiverse
          </h1>
          <p className="text-slate-400 mt-1">Cognitive Multi-Agent System Console</p>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <CaseAnalysisForm />
          <PredictionCard />
        </div>
        
        <div className="lg:col-span-8 flex flex-col gap-8 h-[calc(100vh-12rem)]">
          <AgentTraceGraph />
          <div className="flex-1 min-h-0">
            <EpisodicTimeline />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
