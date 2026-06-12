import React, { useEffect, useState } from 'react';

const EvidenceInspector: React.FC = () => {
  const [evidence, setEvidence] = useState<string>('Loading...');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, criticalRes, ruleRes] = await Promise.all([
          fetch('/knowledge/executive/audit/health-score').then(res => res.text()),
          fetch('/knowledge/executive/audit/critical-population').then(res => res.text()),
          fetch('/knowledge/executive/audit/rule-consistency').then(res => res.text())
        ]);
        setEvidence(`${healthRes}\n\n${criticalRes}\n\n${ruleRes}`);
      } catch (err) {
        setEvidence('Error loading audit data.');
      }
    };
    fetchData();
  }, []);

  return (
    <div className="evidence-inspector" data-testid="evidence-inspector">
      <pre>{evidence}</pre>
    </div>
  );
};

export default EvidenceInspector;
