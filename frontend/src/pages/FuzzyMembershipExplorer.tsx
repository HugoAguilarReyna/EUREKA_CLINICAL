import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { Eye, Settings, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';

// Copy ranges to frontend to draw curves
const FUZZY_RANGES: Record<string, any> = {
  "TB": {
    "triangular": { "LOW": [0.0, 0.3, 0.8], "NORMAL": [0.5, 0.9, 1.3], "HIGH": [1.0, 1.8, 3.0], "VERY_HIGH": [2.5, 5.0, 15.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 0.3, 0.8], "NORMAL": [0.5, 0.8, 1.0, 1.3], "HIGH": [1.0, 1.5, 2.0, 3.0], "VERY_HIGH": [2.5, 4.0, 15.0, 15.0] },
    "gaussian": { "LOW": [0.3, 0.2], "NORMAL": [0.9, 0.15], "HIGH": [1.8, 0.4], "VERY_HIGH": [5.0, 2.0] }
  },
  "DB": {
    "triangular": { "LOW": [0.0, 0.05, 0.15], "NORMAL": [0.08, 0.18, 0.3], "HIGH": [0.22, 0.5, 1.0], "VERY_HIGH": [0.8, 2.0, 8.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 0.05, 0.15], "NORMAL": [0.08, 0.12, 0.22, 0.3], "HIGH": [0.22, 0.35, 0.65, 1.0], "VERY_HIGH": [0.8, 1.5, 8.0, 8.0] },
    "gaussian": { "LOW": [0.05, 0.04], "NORMAL": [0.18, 0.05], "HIGH": [0.5, 0.15], "VERY_HIGH": [2.0, 0.8] }
  },
  "Alkphos": {
    "triangular": { "LOW": [0.0, 25.0, 60.0], "NORMAL": [50.0, 95.0, 140.0], "HIGH": [120.0, 200.0, 300.0], "VERY_HIGH": [250.0, 500.0, 2500.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 25.0, 60.0], "NORMAL": [50.0, 80.0, 110.0, 140.0], "HIGH": [120.0, 160.0, 240.0, 300.0], "VERY_HIGH": [250.0, 400.0, 2500.0, 2500.0] },
    "gaussian": { "LOW": [25.0, 12.0], "NORMAL": [95.0, 20.0], "HIGH": [200.0, 40.0], "VERY_HIGH": [500.0, 150.0] }
  },
  "Sgpt": {
    "triangular": { "LOW": [0.0, 5.0, 20.0], "NORMAL": [15.0, 30.0, 45.0], "HIGH": [35.0, 80.0, 150.0], "VERY_HIGH": [120.0, 400.0, 2000.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 5.0, 20.0], "NORMAL": [15.0, 25.0, 35.0, 45.0], "HIGH": [35.0, 60.0, 100.0, 150.0], "VERY_HIGH": [120.0, 300.0, 2000.0, 2000.0] },
    "gaussian": { "LOW": [5.0, 4.0], "NORMAL": [30.0, 8.0], "HIGH": [80.0, 25.0], "VERY_HIGH": [400.0, 120.0] }
  },
  "Sgot": {
    "triangular": { "LOW": [0.0, 5.0, 20.0], "NORMAL": [15.0, 30.0, 45.0], "HIGH": [35.0, 80.0, 150.0], "VERY_HIGH": [120.0, 400.0, 2000.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 5.0, 20.0], "NORMAL": [15.0, 25.0, 35.0, 45.0], "HIGH": [35.0, 60.0, 100.0, 150.0], "VERY_HIGH": [120.0, 300.0, 2000.0, 2000.0] },
    "gaussian": { "LOW": [5.0, 4.0], "NORMAL": [30.0, 8.0], "HIGH": [80.0, 25.0], "VERY_HIGH": [400.0, 120.0] }
  },
  "ALB": {
    "triangular": { "LOW": [0.0, 2.0, 3.4], "NORMAL": [3.0, 4.0, 5.0], "HIGH": [4.5, 5.2, 6.0], "VERY_HIGH": [5.5, 6.5, 9.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 2.0, 3.4], "NORMAL": [3.0, 3.5, 4.5, 5.0], "HIGH": [4.5, 4.8, 5.5, 6.0], "VERY_HIGH": [5.5, 6.0, 9.0, 9.0] },
    "gaussian": { "LOW": [2.0, 0.5], "NORMAL": [4.0, 0.4], "HIGH": [5.2, 0.3], "VERY_HIGH": [6.5, 0.8] }
  },
  "TP": {
    "triangular": { "LOW": [0.0, 4.0, 5.8], "NORMAL": [5.2, 6.8, 8.0], "HIGH": [7.5, 8.5, 9.5], "VERY_HIGH": [9.0, 10.5, 14.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 4.0, 5.8], "NORMAL": [5.2, 6.0, 7.5, 8.0], "HIGH": [7.5, 8.0, 9.0, 9.5], "VERY_HIGH": [9.0, 10.0, 14.0, 14.0] },
    "gaussian": { "LOW": [4.0, 0.8], "NORMAL": [6.8, 0.6], "HIGH": [8.5, 0.4], "VERY_HIGH": [10.5, 1.0] }
  },
  "A/G Ratio": {
    "triangular": { "LOW": [0.0, 0.4, 0.9], "NORMAL": [0.8, 1.3, 1.8], "HIGH": [1.6, 2.1, 2.6], "VERY_HIGH": [2.4, 3.2, 5.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 0.4, 0.9], "NORMAL": [0.8, 1.0, 1.5, 1.8], "HIGH": [1.6, 1.8, 2.3, 2.6], "VERY_HIGH": [2.4, 2.8, 5.0, 5.0] },
    "gaussian": { "LOW": [0.4, 0.15], "NORMAL": [1.3, 0.2], "HIGH": [2.1, 0.2], "VERY_HIGH": [3.2, 0.5] }
  },
  "Age": {
    "triangular": { "LOW": [0.0, 10.0, 22.0], "NORMAL": [18.0, 35.0, 55.0], "HIGH": [50.0, 68.0, 80.0], "VERY_HIGH": [75.0, 85.0, 110.0] },
    "trapezoidal": { "LOW": [0.0, 0.0, 10.0, 22.0], "NORMAL": [18.0, 25.0, 45.0, 55.0], "HIGH": [50.0, 60.0, 72.0, 80.0], "VERY_HIGH": [75.0, 80.0, 110.0, 110.0] },
    "gaussian": { "LOW": [10.0, 5.0], "NORMAL": [35.0, 10.0], "HIGH": [68.0, 8.0], "VERY_HIGH": [85.0, 10.0] }
  }
};

// Math helpers
const tri = (x: number, a: number, b: number, c: number) => {
  if (x <= a || x >= c) return 0;
  if (a < x && x <= b) return (x - a) / (b - a);
  if (b < x && x < c) return (c - x) / (c - b);
  return 0;
};

const trap = (x: number, a: number, b: number, c: number, d: number) => {
  if (x <= a || x >= d) return 0;
  if (b <= x && x <= c) return 1;
  if (a < x && x < b) return (x - a) / (b - a);
  if (c < x && x < d) return (d - x) / (d - c);
  return 0;
};

const gauss = (x: number, m: number, s: number) => {
  if (s <= 0) return x === m ? 1 : 0;
  return Math.exp(-0.5 * Math.pow((x - m) / s, 2));
};

export const FuzzyMembershipExplorer = () => {
  const [patientId, setPatientId] = useState('Patient_5');
  const [variable, setVariable] = useState('DB');
  const [fnType, setFnType] = useState<'triangular' | 'trapezoidal' | 'gaussian'>('triangular');
  const [membershipData, setMembershipData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMemberships = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/knowledge/fuzzy/memberships?patient_id=${patientId}&variable=${variable}&function_type=${fnType}`);
        setMembershipData(res.data);
      } catch (err) {
        console.error('Error fetching memberships', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMemberships();
  }, [patientId, variable, fnType]);

  // Generate curves points
  const generateChartData = () => {
    if (!FUZZY_RANGES[variable]) return [];
    
    const varRange = FUZZY_RANGES[variable][fnType];
    
    // Find min and max boundaries to plot
    let minVal = 0;
    let maxVal = 10;
    
    if (fnType === 'triangular' || fnType === 'trapezoidal') {
      minVal = varRange["LOW"][0];
      maxVal = varRange["VERY_HIGH"][varRange["VERY_HIGH"].length - 1];
    } else { // Gaussian
      minVal = Math.max(0, varRange["LOW"][0] - 2 * varRange["LOW"][1]);
      maxVal = varRange["VERY_HIGH"][0] + 2 * varRange["VERY_HIGH"][1];
    }
    
    const steps = 60;
    const stepSize = (maxVal - minVal) / steps;
    const chartPoints = [];
    
    for (let i = 0; i <= steps; i++) {
      const x = minVal + i * stepSize;
      let low = 0, normal = 0, high = 0, very_high = 0;
      
      const pL = varRange["LOW"];
      const pN = varRange["NORMAL"];
      const pH = varRange["HIGH"];
      const pV = varRange["VERY_HIGH"];
      
      if (fnType === 'triangular') {
        low = tri(x, pL[0], pL[1], pL[2]);
        normal = tri(x, pN[0], pN[1], pN[2]);
        high = tri(x, pH[0], pH[1], pH[2]);
        very_high = tri(x, pV[0], pV[1], pV[2]);
      } else if (fnType === 'trapezoidal') {
        low = trap(x, pL[0], pL[1], pL[2], pL[3]);
        normal = trap(x, pN[0], pN[1], pN[2], pN[3]);
        high = trap(x, pH[0], pH[1], pH[2], pH[3]);
        very_high = trap(x, pV[0], pV[1], pV[2], pV[3]);
      } else {
        low = gauss(x, pL[0], pL[1]);
        normal = gauss(x, pN[0], pN[1]);
        high = gauss(x, pH[0], pH[1]);
        very_high = gauss(x, pV[0], pV[1]);
      }
      
      chartPoints.push({
        x: parseFloat(x.toFixed(3)),
        LOW: parseFloat(low.toFixed(3)),
        NORMAL: parseFloat(normal.toFixed(3)),
        HIGH: parseFloat(high.toFixed(3)),
        VERY_HIGH: parseFloat(very_high.toFixed(3))
      });
    }
    return chartPoints;
  };

  const chartData = generateChartData();
  const patientVal = membershipData?.value || 0;
  const currentMems = membershipData?.[fnType] || {};

  return (
    <PageContainer title="Fuzzy Membership Explorer">
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* TOP PANEL CONTROLS */}
        <div className="glassmorphism p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Paciente</label>
            <input 
              type="text" 
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono w-full focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Biomarcador</label>
            <select 
              value={variable} 
              onChange={(e) => setVariable(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono w-full focus:outline-none focus:border-blue-500"
            >
              {Object.keys(FUZZY_RANGES).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-gray-500 block mb-1">Función de Membresía</label>
            <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setFnType('triangular')}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold font-mono transition-all ${fnType === 'triangular' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                TRI
              </button>
              <button 
                onClick={() => setFnType('trapezoidal')}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold font-mono transition-all ${fnType === 'trapezoidal' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                TRAP
              </button>
              <button 
                onClick={() => setFnType('gaussian')}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold font-mono transition-all ${fnType === 'gaussian' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                GAUSS
              </button>
            </div>
          </div>
          <div className="text-center md:text-right">
            <span className="text-[10px] text-gray-500 block">Tipo Activo</span>
            <span className="text-xs font-bold text-gray-300 font-mono uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-full mt-1 inline-block">
              {fnType} Engine
            </span>
          </div>
        </div>

        {/* DETAILS AND MEMBERSHIP CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: CURRENT VALUE & EVALUATION */}
          <div className="glassmorphism p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="text-blue-400" />
                Auditoría de Membresías
              </h3>
              <p className="text-xs text-gray-400">
                Grado de correspondencia matemática (de 0.00 a 1.00) del valor del paciente respecto a los conjuntos difusos clínicos.
              </p>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Valor Real:</span>
                  <span className="text-white font-bold">{patientVal}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Estado Dominante:</span>
                  <span className="text-emerald-400 font-bold">
                    {Object.keys(currentMems).reduce((a, b) => (currentMems[a] > currentMems[b] ? a : b), 'LOW')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.keys(currentMems).map((cl) => {
                const score = currentMems[cl] || 0;
                return (
                  <div key={cl} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">{cl}</span>
                      <span className="text-white font-bold">{score.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${cl === 'LOW' ? 'bg-blue-400' : cl === 'NORMAL' ? 'bg-emerald-400' : cl === 'HIGH' ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CHART VISUALIZER */}
          <div className="lg:col-span-2 glassmorphism p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="text-emerald-400" />
              Curvas de Membresía Difusa
            </h3>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="x" stroke="#555" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#555" fontSize={10} fontClassName="font-mono" domain={[0, 1.05]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                    labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: '#fff' }} />
                  
                  {/* Reference line for Patient Value */}
                  <ReferenceLine x={patientVal} stroke="#ff4d4d" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Paciente (${patientVal})`, fill: '#ff4d4d', fontSize: 10, position: 'top', fontFamily: 'monospace' }} />
                  
                  <Line type="monotone" dataKey="LOW" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="NORMAL" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="HIGH" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="VERY_HIGH" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </PageContainer>
  );
};
