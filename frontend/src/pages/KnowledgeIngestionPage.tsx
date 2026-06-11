import { useState, useRef } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { UploadCloud, File as FileIcon, AlertCircle, CheckCircle, Settings, Play } from 'lucide-react';

export const KnowledgeIngestionPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'preview' | 'building' | 'done'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    // Simulate API call to POST /knowledge/upload
    setTimeout(() => {
      setStatus('preview');
      setJobId('job-' + Math.random().toString(36).substr(2, 9));
      setPreviewData({
        columns: ['id', 'title', 'description', 'author', 'timestamp'],
        entities: 45,
        relations: 120,
        qualityIssues: [
          { type: 'missing_values', count: 3, column: 'author' },
          { type: 'format_warning', count: 1, column: 'timestamp' }
        ]
      });
    }, 1500);
  };

  const handleBuildGraph = async () => {
    if (!jobId) return;
    setStatus('building');
    
    // Simulate API call to POST /knowledge/jobs/{id}/build
    setTimeout(() => {
      setStatus('done');
    }, 2000);
  };

  return (
    <PageContainer title="Knowledge Ingestion">
      <div className="max-w-4xl mx-auto space-y-6">
        {status === 'idle' || status === 'uploading' ? (
          <div className="glassmorphism rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-6 text-gray-200">Upload Center</h2>
            <div 
              className="border-2 border-dashed border-gray-600 rounded-xl p-12 hover:border-blue-500 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv,.xlsx,.pdf,.docx,.txt,.json"
              />
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-300 font-medium">Click or drag file to this area to upload</p>
              <p className="text-sm text-gray-500 mt-2">Support for a single CSV, XLSX, PDF, DOCX, TXT, or JSON.</p>
            </div>

            {file && (
              <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 text-left">
                  <FileIcon className="text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={status === 'uploading'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {status === 'uploading' ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glassmorphism rounded-xl p-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-200">Preview & Ingestion</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <Settings size={16} /> Parsed Data Summary
                </h3>
                {previewData && (
                  <div className="space-y-3 text-sm">
                    <p className="flex justify-between"><span className="text-gray-500">Columns</span> <span className="text-gray-200">{previewData.columns.join(', ')}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">Detected Entities</span> <span className="text-blue-400 font-bold">{previewData.entities}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">Detected Relations</span> <span className="text-emerald-400 font-bold">{previewData.relations}</span></p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <AlertCircle size={16} /> Quality Issues
                </h3>
                {previewData && previewData.qualityIssues.length > 0 ? (
                  <ul className="space-y-2">
                    {previewData.qualityIssues.map((issue: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 p-2 rounded">
                        <AlertCircle size={14} />
                        {issue.type.replace('_', ' ')} in '{issue.column}' ({issue.count} occurrences)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> No issues detected</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button 
                onClick={() => { setStatus('idle'); setFile(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBuildGraph}
                disabled={status === 'building' || status === 'done'}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {status === 'building' ? 'Building Graph...' : status === 'done' ? 'Graph Built' : <><Play size={16} /> Build Graph</>}
              </button>
            </div>
            
            {status === 'done' && (
              <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400">
                <CheckCircle />
                <p>Knowledge graph updated successfully! You can now explore the nodes in the Graph Explorer.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
