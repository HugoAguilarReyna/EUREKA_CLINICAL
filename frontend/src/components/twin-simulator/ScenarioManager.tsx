import React, { useState, useEffect } from 'react';
import { Scenario, Modification, SimulationResult } from '../../types/twin-simulator';
import { C, FONT_SANS } from './twin-simulator.styles';

interface ScenarioManagerProps {
  currentModifications: Modification[];
  currentResults: SimulationResult | null;
  onLoad: (scenario: Scenario) => void;
  onCompare: (scenarios: Scenario[]) => void;
}

export const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  currentModifications,
  currentResults,
  onLoad,
  onCompare
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('eureka_scenarios');
    if (saved) {
      try {
        setScenarios(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse scenarios');
      }
    }
  }, []);

  const saveScenarios = (newScenarios: Scenario[]) => {
    setScenarios(newScenarios);
    localStorage.setItem('eureka_scenarios', JSON.stringify(newScenarios));
  };

  const handleSave = () => {
    if (!newName.trim() || !currentResults) return;
    
    const activeMods = currentModifications.filter(m => m.change_pct !== 0);
    if (activeMods.length === 0) return;

    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      timestamp: new Date().toISOString(),
      modifications: activeMods,
      results: currentResults
    };

    saveScenarios([newScenario, ...scenarios].slice(0, 5)); // Keep max 5
    setNewName('');
  };

  const handleDelete = (id: string) => {
    saveScenarios(scenarios.filter(s => s.id !== id));
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCompare = () => {
    const selected = scenarios.filter(s => selectedIds.has(s.id));
    if (selected.length > 0) {
      onCompare(selected);
    }
  };

  return (
    <div style={{ fontFamily: FONT_SANS }}>
      <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '16px' }}>
        SCENARIO MANAGEMENT
      </div>

      {/* Save Form */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Aggressive Intervention"
          style={{
            flex: 1,
            background: C.bg,
            border: `1px solid ${C.border}`,
            color: C.text,
            padding: '8px 16px',
            borderRadius: '4px',
            outline: 'none',
            fontSize: '0.85rem'
          }}
        />
        <button
          onClick={handleSave}
          disabled={!newName.trim() || !currentResults}
          style={{
            background: !newName.trim() || !currentResults ? C.surfaceHover : C.accent,
            color: C.text,
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: !newName.trim() || !currentResults ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          SAVE
        </button>
      </div>

      {/* Saved Scenarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {scenarios.map(s => (
          <div key={s.id} style={{ 
            background: selectedIds.has(s.id) ? 'rgba(59,130,246,0.1)' : C.surface, 
            border: `1px solid ${selectedIds.has(s.id) ? C.accent : C.border}`,
            borderRadius: '6px', 
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              <input 
                type="checkbox" 
                checked={selectedIds.has(s.id)}
                onChange={() => toggleSelect(s.id)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, marginBottom: '4px' }}>{s.name}</div>
                <div style={{ fontSize: '0.7rem', color: C.dim }}>
                  {s.modifications.map(m => `${m.variable} ${m.change_pct}%`).join(', ')}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.results.critical_patients_delta < 0 ? C.success : C.critical }}>
                {s.results.critical_patients_delta > 0 ? '+' : ''}{s.results.critical_patients_delta} pts
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => onLoad(s)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>LOAD</button>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.critical, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>DEL</button>
              </div>
            </div>
          </div>
        ))}
        {scenarios.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: C.dim, textAlign: 'center', padding: '16px' }}>
            No saved scenarios
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <button
          onClick={handleCompare}
          style={{
            width: '100%',
            marginTop: '16px',
            background: 'transparent',
            border: `1px solid ${C.accent}`,
            color: C.accent,
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          COMPARE SELECTED ({selectedIds.size})
        </button>
      )}
    </div>
  );
};
