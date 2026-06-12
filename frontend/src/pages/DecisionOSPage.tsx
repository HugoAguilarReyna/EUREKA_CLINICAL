import React, { useState, useEffect } from 'react';
import CommandBand from '../components/CommandBand';
import DecisionSimulator from '../components/DecisionSimulator';
import RootCauseTable from '../components/RootCauseTable';
import ActionEngineTable from '../components/ActionEngineTable';
import EvidenceInspector from '../components/EvidenceInspector';
import '../styles/theme.css';

const DecisionOSPage: React.FC = () => {
  const [auditMode, setAuditMode] = useState(false);

  // Keyboard shortcut: toggle audit mode with "A" when page has focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a') {
        setAuditMode((prev) => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="decision-os-page">
      <CommandBand auditMode={auditMode} setAuditMode={setAuditMode} />
      <div className="decision-os-grid">
        <div className="panel root-cause">
          <RootCauseTable />
        </div>
        <div className="panel decision-simulator">
          <DecisionSimulator />
        </div>
        <div className="panel action-engine">
          <ActionEngineTable />
        </div>
      </div>
      {auditMode && <EvidenceInspector />}
    </div>
  );
};

export default DecisionOSPage;
