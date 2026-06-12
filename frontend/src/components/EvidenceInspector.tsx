import React from 'react';

const EvidenceInspector: React.FC = () => {
  // Placeholder evidence text – in production replace with real audit data from backend
  const evidence = `AUDIT STREAM\n\nHEALTH SCORE AUDIT\nscore: 5\nbaseline: 100\npenalty: 95\n\nsource_rule: RULE_3_Alkphos_HIGH\nsupport: 392\nconfidence: 0.84`;

  return (
    <div className="evidence-inspector" data-testid="evidence-inspector">
      <pre>{evidence}</pre>
    </div>
  );
};

export default EvidenceInspector;
