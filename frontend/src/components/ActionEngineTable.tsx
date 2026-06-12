import React from 'react';

const ActionEngineTable: React.FC = () => {
  const [actions, setActions] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/knowledge/executive/actions')
      .then(res => res.json())
      .then(data => setActions(data.actions || []))
      .catch(e => console.error('Failed to load actions', e));
  }, []);

  // actions are loaded from API – no static placeholder data

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
