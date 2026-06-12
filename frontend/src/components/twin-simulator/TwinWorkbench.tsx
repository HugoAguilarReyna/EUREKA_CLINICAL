import React, { useState, useEffect, useCallback } from 'react';
import { Overview, Modification, Scenario } from '../../types/twin-simulator';
import { useTwinSimulator } from '../../hooks/useTwinSimulator';
import { VariableSlider } from './VariableSlider';
import { ImpactPreview } from './ImpactPreview';
import { ScenarioManager } from './ScenarioManager';
import { SensitivityAnalysis } from './SensitivityAnalysis';
import { C, FONT_SANS } from './twin-simulator.styles';

interface TwinWorkbenchProps {
  baselineData: Overview;
  onScenarioSaved?: (scenario: Scenario) => void;
  onClose: () => void;
}

export const TwinWorkbench: React.FC<TwinWorkbenchProps> = ({ baselineData, onClose, onScenarioSaved }) => {
  const { results, loading, error, simulate, setResults } = useTwinSimulator();
  
  const [modifications, setModifications] = useState<Map<string, number>>(new Map());

  const topDrivers = baselineData.top_drivers.slice(0, 5);

  // Initialize with the active driver from overview if it exists
  useEffect(() => {
    if (baselineData.root_cause?.driver) {
      const initialMap = new Map<string, number>();
      initialMap.set(baselineData.root_cause.driver, -20); // Default from original spec
      setModifications(initialMap);
      triggerSimulation(initialMap);
    }
  }, [baselineData]);

  const triggerSimulation = useCallback((modMap: Map<string, number>) => {
    const mods: Modification[] = Array.from(modMap.entries()).map(([variable, change_pct]) => ({
      variable,
      change_pct
    }));
    simulate(mods).catch(() => {});
  }, [simulate]);

  const handleSliderChange = (variable: string, newValue: number) => {
    setModifications(prev => {
      const next = new Map(prev);
      next.set(variable, newValue);
      return next;
    });
  };

  const handleSliderBlur = () => {
    triggerSimulation(modifications);
  };

  const handleResetAll = () => {
    const emptyMap = new Map<string, number>();
    setModifications(emptyMap);
    setResults(null);
  };

  const handleCalculate = () => {
    triggerSimulation(modifications);
  };

  const handleLoadScenario = (scenario: Scenario) => {
    const modMap = new Map<string, number>();
    scenario.modifications.forEach(m => modMap.set(m.variable, m.change_pct));
    setModifications(modMap);
    setResults(scenario.results);
  };

  const handleCompare = (scenarios: Scenario[]) => {
    // Currently logs or just serves as a visual hook. In a real app we could show a modal.
    console.log("Comparing", scenarios);
    alert(`Comparing ${scenarios.length} scenarios. Check console for data.`);
  };

  const currentModificationsArray = Array.from(modifications.entries()).map(([v, c]) => ({ variable: v, change_pct: c }));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: FONT_SANS
    }}>
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        boxShadow: C.shadowLg,
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: C.text, letterSpacing: '0.05em' }}>DIGITAL TWIN WORKBENCH</div>
            <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '4px' }}>Interactive Scenario Planning</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flex: 1 }}>
          
          {/* Left Column (Inputs) */}
          <div style={{ padding: '32px', borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
            <div style={{ color: C.muted, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.15em', marginBottom: '24px' }}>SCENARIO BUILDER</div>
            <div style={{ fontSize: '0.85rem', color: C.text, marginBottom: '24px' }}>Adjust intervention intensity for each risk driver:</div>
            
            {topDrivers.map(d => (
              <VariableSlider 
                key={d.name}
                variable={d.name}
                value={modifications.get(d.name) || 0}
                onChange={(v) => handleSliderChange(d.name, v)}
                onBlur={handleSliderBlur}
              />
            ))}

            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              <button onClick={handleResetAll} style={{ flex: 1, padding: '12px', background: C.surfaceHover, border: `1px solid ${C.border}`, color: C.text, borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>RESET ALL</button>
              <button onClick={handleCalculate} style={{ flex: 2, padding: '12px', background: C.accent, border: 'none', color: C.text, borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', boxShadow: C.glowAccent }}>CALCULATE</button>
            </div>
          </div>

          {/* Right Column (Outputs & Scenarios) */}
          <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', background: C.surface }}>
            <ImpactPreview results={results} loading={loading} error={error} />
            <SensitivityAnalysis currentResults={results} />
            <ScenarioManager 
              currentModifications={currentModificationsArray} 
              currentResults={results} 
              onLoad={handleLoadScenario}
              onCompare={handleCompare}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
