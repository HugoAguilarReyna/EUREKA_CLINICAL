import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageContainer } from '../components/layout/PageContainer';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { NodeInspector } from '../components/graph/NodeInspector';
import { useGraphStore } from '../store/useGraphStore';
import { Layout, Users, FileText } from 'lucide-react';

export const KnowledgeGraphPage = () => {
  const { selectedNode } = useGraphStore();
  const [level, setLevel] = useState<number>(1);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<string>('normal');
  const [communities, setCommunities] = useState<any[]>([]);

  // Epic 10.0A states for Progressive Investigation
  const [investigationTarget, setInvestigationTarget] = useState<string>('patient');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [level1Nodes, setLevel1Nodes] = useState<any[]>([]);
  const [depth, setDepth] = useState<number>(1);

  useEffect(() => {
    // Fetch communities list for dropdown filtering (Level 2 Cohort filter)
    const fetchCommunities = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/cohorts/communities`);
        setCommunities(res.data || []);
      } catch (err) {
        console.error("Error loading communities:", err);
      }
    };
    fetchCommunities();

    // Epic 10.0A: Load patients and Level 1 nodes on mount
    const loadEntityOptions = async () => {
      try {
        const patientsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/cases?limit=1000`);
        setPatients(patientsRes.data || []);

        const l1Res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/semantic/graph?level=1`);
        setLevel1Nodes(l1Res.data.nodes || []);
      } catch (err) {
        console.error("Error loading entity options for Progressive Investigation:", err);
      }
    };
    loadEntityOptions();
  }, []);

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    if (newLevel === 1) {
      setCommunityId(null);
    }
  };

  const getEntityOptions = () => {
    if (investigationTarget === 'patient') {
      return patients.map(p => ({
        id: p.patient_id,
        name: `${p.patient_id} (${p.risk_class || 'Unknown Risk'})`
      }));
    }

    const labelMap: Record<string, string> = {
      community: 'Community',
      pattern: 'Pattern',
      rule: 'Rule',
      risk: 'Risk',
      hypothesis: 'Hypothesis'
    };

    const targetLabel = labelMap[investigationTarget];
    if (!targetLabel) return [];

    return level1Nodes
      .filter(n => n.label === targetLabel)
      .map(n => ({
        id: n.id,
        name: n.properties?.name || n.id
      }));
  };

  return (
    <PageContainer title="Knowledge Graph Explorer 2.0 (SDOS)">
      <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] w-full">
        {/* Navigation Toolbar */}
        <div className="glassmorphism p-4 rounded-xl flex flex-wrap gap-6 items-center justify-between border border-white/5">
          {/* Abstraction Levels */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Abstraction Level:</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
              <button 
                onClick={() => handleLevelChange(1)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-all ${level === 1 ? 'bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-gray-400 hover:text-white'}`}
              >
                <Layout size={14} />
                Executive (L1)
              </button>
              <button 
                onClick={() => handleLevelChange(2)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-all ${level === 2 ? 'bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-gray-400 hover:text-white'}`}
              >
                <Users size={14} />
                Clinical (L2)
              </button>
              <button 
                onClick={() => handleLevelChange(3)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-all ${level === 3 ? 'bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText size={14} />
                Forensic (L3)
              </button>
            </div>
          </div>

          {/* Progressive Investigation Target Selectors (L3 only) */}
          {level === 3 && (
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Investigation Target:</span>
                <select 
                  value={investigationTarget} 
                  onChange={(e) => {
                    setInvestigationTarget(e.target.value);
                    setSelectedEntityId(null);
                  }}
                  className="bg-surface/50 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="patient">Patient</option>
                  <option value="community">Community</option>
                  <option value="pattern">Pattern</option>
                  <option value="rule">Rule</option>
                  <option value="risk">Risk</option>
                  <option value="hypothesis">Hypothesis</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entity:</span>
                <select 
                  value={selectedEntityId || ''} 
                  onChange={(e) => setSelectedEntityId(e.target.value || null)}
                  className="bg-surface/50 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-semibold cursor-pointer max-w-[200px]"
                >
                  <option value="">-- Seleccione Entidad --</option>
                  {getEntityOptions().map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Community Cohort Filter (L2 only) */}
          {level === 2 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter Cohort:</span>
              <select 
                value={communityId || ''} 
                onChange={(e) => setCommunityId(e.target.value || null)}
                className="bg-surface/50 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
              >
                <option value="">-- All Cohorts --</option>
                {communities.map((c) => (
                  <option key={c.community_id} value={c.community_id}>
                    {c.community_id} ({c.size} patients - {c.dominant_risk} Risk)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visual Modes */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visual Mode:</span>
            <select 
              value={visualMode} 
              onChange={(e) => setVisualMode(e.target.value)}
              className="bg-surface/50 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="normal">Default Node View</option>
              <option value="community">Louvain Communities</option>
              <option value="similarity">Similarity (SIMILAR_TO only)</option>
              <option value="centrality">Centrality (PageRank Scale)</option>
              <option value="semantic">Semantic (Hide Raw Measurements)</option>
            </select>
          </div>
        </div>

        {/* Graph Visual Area */}
        <div className="flex-1 flex gap-4 min-h-0 w-full">
          <div className="flex-1 glassmorphism rounded-xl overflow-hidden relative border border-white/5">
            <KnowledgeGraph 
              level={level} 
              communityId={communityId} 
              entityType={level === 3 ? investigationTarget : null}
              entityId={level === 3 ? selectedEntityId : null}
              depth={level === 3 ? depth : 1}
              visualMode={visualMode} 
            />
          </div>
          {selectedNode && <NodeInspector />}
        </div>
      </div>
    </PageContainer>
  );
};
