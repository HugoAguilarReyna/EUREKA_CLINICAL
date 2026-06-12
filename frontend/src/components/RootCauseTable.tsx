import React from 'react';

const RootCauseTable: React.FC = () => {
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/knowledge/executive/overview')
      .then(res => res.json())
      .then(data => {
        const rc = data.root_cause ? [data.root_cause] : [];
        setRows(rc);
      })
      .catch(e => console.error('Failed to load root cause data', e));
  }, []);
  // Placeholder data – replace with real backend data
  // rows are loaded from API

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
