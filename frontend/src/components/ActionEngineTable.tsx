import React from 'react';

const ActionEngineTable: React.FC = () => {
  // Placeholder data – replace with real backend data
  const actions = [
    {
      rank: 1,
      action: 'TARGET ALKPHOS',
      patientsImproved: 221,
      riskReduction: '56%',
      confidence: '84%',
    },
    {
      rank: 2,
      action: 'ADMINISTER CALCIUM',
      patientsImproved: 150,
      riskReduction: '45%',
      confidence: '78%',
    },
    {
      rank: 3,
      action: 'REDUCE SODIUM',
      patientsImproved: 98,
      riskReduction: '30%',
      confidence: '71%',
    },
  ];

  return (
    <div className="panel action-engine" data-testid="action-engine-table">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Action</th>
            <th>Patients Improved</th>
            <th>Risk Reduction</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.rank}>
              <td>{a.rank}</td>
              <td>{a.action}</td>
              <td>{a.patientsImproved}</td>
              <td>{a.riskReduction}</td>
              <td>{a.confidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActionEngineTable;
