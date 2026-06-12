import React from 'react';

const RootCauseTable: React.FC = () => {
  // Placeholder data – replace with real backend data
  const rows = [
    {
      rank: 1,
      driver: 'ALKPHOS',
      impact: 'High',
      support: '395',
      confidence: '92%',
      lift: '1.8',
      evidence: 'Rule_3_ALKPHOS_HIGH',
    },
    {
      rank: 2,
      driver: 'CALCIUM',
      impact: 'Medium',
      support: '210',
      confidence: '78%',
      lift: '1.2',
      evidence: 'Rule_7_CALCIUM_MED',
    },
    {
      rank: 3,
      driver: 'SODIUM',
      impact: 'Low',
      support: '120',
      confidence: '65%',
      lift: '1.0',
      evidence: 'Rule_12_SODIUM_LOW',
    },
  ];

  return (
    <div className="panel root-cause" data-testid="root-cause-table">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Driver</th>
            <th>Impact</th>
            <th>Support</th>
            <th>Confidence</th>
            <th>Lift</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rank}>
              <td>{row.rank}</td>
              <td>{row.driver}</td>
              <td>{row.impact}</td>
              <td>{row.support}</td>
              <td>{row.confidence}</td>
              <td>{row.lift}</td>
              <td>{row.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RootCauseTable;
