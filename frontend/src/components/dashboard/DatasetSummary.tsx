import React from 'react';

interface DatasetSummaryProps {
  summary: {
    file_name?: string;
    rows?: number;
    columns?: number;
    missing_values?: number;
    quality_score?: number;
    target_candidate?: string;
  };
}

export const DatasetSummary: React.FC<DatasetSummaryProps> = ({ summary }) => {
  if (!summary || Object.keys(summary).length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-gray-200">Dataset Overview</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-gray-900 rounded border border-gray-700">
          <p className="text-sm text-gray-400">Rows</p>
          <p className="text-2xl font-bold text-white">{summary.rows}</p>
        </div>
        
        <div className="p-4 bg-gray-900 rounded border border-gray-700">
          <p className="text-sm text-gray-400">Columns</p>
          <p className="text-2xl font-bold text-white">{summary.columns}</p>
        </div>
        
        <div className="p-4 bg-gray-900 rounded border border-gray-700">
          <p className="text-sm text-gray-400">Quality Score</p>
          <p className="text-2xl font-bold text-green-400">{summary.quality_score}/100</p>
        </div>
        
        <div className="p-4 bg-gray-900 rounded border border-gray-700">
          <p className="text-sm text-gray-400">Target Variable</p>
          <p className="text-lg font-bold text-blue-400 truncate" title={summary.target_candidate}>{summary.target_candidate || 'N/A'}</p>
        </div>
        
        <div className="p-4 bg-gray-900 rounded border border-gray-700">
          <p className="text-sm text-gray-400">Missing Values</p>
          <p className="text-2xl font-bold text-yellow-400">{summary.missing_values}</p>
        </div>
      </div>
    </div>
  );
};
