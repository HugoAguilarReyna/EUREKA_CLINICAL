import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Cpu, ArrowRight, Activity, Users, Database, ShieldAlert, GitBranch, Key } from 'lucide-react';
import axios from 'axios';

export const ExplainabilityExplorerV2 = () => {
  const [patientId, setPatientId] = useState('Patient_5');
  const [searchId, setSearchId] = useState('Patient_5');
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`http://localhost:8001/knowledge/explain-v2/${patientId}`);
        setExplanation(res.data);
      } catch (err) {
        console.error(err);
        setError('Error loading semantic explainability chain. Make sure patient ID is correct.');
      } finally {
        setLoading(false);
      }
    };
    fetchExplanation();
  }, [patientId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientId(searchId);
  };

  return (
    <PageContainer title="Semantic Explainability Explorer V2 (EDIOS)">
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        
        {/* PATIENT SEARCH HEADER */}
        <div className="glassmorphism p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Cpu className="text-blue-400 font-bold" />
              Explainability & Causal Discovery Chain
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl">
              Explores how clinical raw metrics propagate into fuzzy semantic states, communities, hypotheses, and rule activations backed by statistical evidence.
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto shrink-0">
            <input 
              type="text" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Patient ID (e.g. Patient_5)"
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
            <button 
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              SEARCH
            </button>
          </form>
        </div>

        {loading && <div className="h-64 flex items-center justify-center text-blue-400 font-mono">Reconstructing Causal Interpretation Chain...</div>}
        {error && <div className="h-64 flex items-center justify-center text-red-400 font-mono">{error}</div>}

        {!loading && !error && explanation && (
          <div className="space-y-6">
            
            {/* OVERALL PATIENT / COHORT SUMMARY */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Patient Profile</span>
                <span className="text-md font-black text-white mt-1 block font-mono">
                  {explanation.patient_id}
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Assigned Cohort</span>
                <span className="text-md font-bold text-blue-400 mt-1 block flex items-center gap-1.5">
                  <Users size={14} />
                  {explanation.community.id} ({explanation.community.size} members)
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Cohort Risk Class</span>
                <span className="text-xs text-red-400 font-bold mt-1 block leading-relaxed uppercase">
                  {explanation.community.dominant_risk} RISK
                </span>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Dataset Provenance</span>
                <span className="text-[10px] text-gray-300 font-mono mt-1 block flex items-center gap-1">
                  <Database size={11} className="text-emerald-400" />
                  {explanation.community.provenance?.dataset_name || 'act_liver_disease.csv'}
                </span>
              </div>
            </div>

            {/* DYNAMIC CLINICAL HYPOTHESIS BLOCK */}
            <div className="glassmorphism p-6 rounded-2xl border border-white/5 space-y-2.5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} /> Clinical Hypothesis (Provisional Theory)
              </span>
              <p className="text-gray-200 text-sm font-semibold italic bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                "{explanation.hypothesis}"
              </p>
            </div>

            {/* PIPELINE STAGES STEP BY STEP */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
                Clinical Decision Trace Chain
              </h3>
              
              <div className="space-y-6">
                {explanation.activated_rules?.map((rule: any, idx: number) => (
                  <div key={idx} className="glassmorphism p-6 rounded-2xl border border-white/5 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs font-extrabold text-blue-400 font-mono">Activated Rule: {rule.rule_id}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Expression: {rule.expression}</span>
                    </div>

                    {/* Flow steps */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 py-2 text-xs font-mono">
                      
                      {/* Step 1: Semantic States */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex-1 space-y-1">
                        <span className="text-[9px] uppercase text-gray-500 block">Fuzzy State Inputs</span>
                        {explanation.states.map((st: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-[10px] text-gray-300">
                            <span>{st.variable} ({st.value})</span>
                            <span className="text-purple-400 font-bold">{st.state} ({st.score.toFixed(2)})</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-center shrink-0">
                        <ArrowRight className="hidden lg:block text-gray-600" size={16} />
                      </div>

                      {/* Step 2: Evidence Strength */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex-1 space-y-2">
                        <span className="text-[9px] uppercase text-gray-500 block">Evidence Strength</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-white/10 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-yellow-400 to-green-500 h-full rounded-full" 
                              style={{ width: `${rule.evidence.strength}%` }}
                            />
                          </div>
                          <span className="text-green-400 font-bold">{rule.evidence.strength}/100</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 text-[9px] text-gray-400 mt-1">
                          <div>OR: {rule.evidence.odds_ratio.toFixed(2)}</div>
                          <div>P-value: {rule.evidence.p_value.toFixed(4)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center shrink-0">
                        <ArrowRight className="hidden lg:block text-gray-600" size={16} />
                      </div>

                      {/* Step 3: Implied Risk & Suggested Action */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex-1 space-y-2">
                        <span className="text-[9px] uppercase text-gray-500 block">Suggested Investigation</span>
                        <h6 className="font-bold text-white text-xs">{rule.action.name}</h6>
                        <p className="text-[10px] text-gray-400 leading-snug">{rule.action.description}</p>
                      </div>

                    </div>
                  </div>
                ))}

                {explanation.activated_rules?.length === 0 && (
                  <div className="glassmorphism p-6 rounded-xl border border-white/5 text-center text-gray-400 text-xs italic">
                    This patient does not trigger any of the statistical risk rules certified by the discovery engine.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </PageContainer>
  );
};
