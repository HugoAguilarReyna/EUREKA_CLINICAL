import React, { useState } from 'react';
import { analyzeCase } from '../../api/client';
import { useStore } from '../../store/useStore';
import { useMutation } from '@tanstack/react-query';
import { Activity } from 'lucide-react';

export const CaseAnalysisForm: React.FC = () => {
  const setCurrentCaseId = useStore((state) => state.setCurrentCaseId);
  const [formData, setFormData] = useState({
    TB: 1.5, DB: 0.4, Alkphos: 150, Sgot: 35, TP: 6.8, ALB: 3.0
  });

  const mutation = useMutation({
    mutationFn: analyzeCase,
    onSuccess: (data) => {
      setCurrentCaseId(data.case_id);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4 text-eureka-glow">
        <Activity className="w-5 h-5" />
        <h2 className="text-xl font-bold">New Clinical Case</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {Object.entries(formData).map(([key, val]) => (
          <div key={key}>
            <label className="block text-sm text-slate-400 mb-1">{key}</label>
            <input 
              type="number" step="0.1" name={key} value={val} onChange={handleChange}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-eureka-accent"
            />
          </div>
        ))}
        <button 
          type="submit" disabled={mutation.isPending}
          className="col-span-2 mt-4 bg-eureka-accent hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        >
          {mutation.isPending ? 'Analyzing via Cognitive Core...' : 'Run Analysis'}
        </button>
      </form>
    </div>
  );
};
