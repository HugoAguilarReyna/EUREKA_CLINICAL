import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Activity, PlayCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// ── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  mission_status: string;
  health_score: number;
  narrative: string;
  root_cause: {
    driver: string;
    impact: number;
    confidence: number;
    affected_patients: number;
  };
  priority_alerts: {
    id: string;
    title: string;
    description: string;
    priority_score: number;
    confidence: number;
    population_affected: number;
    severity: number;
  }[];
  top_drivers: { name: string; impact: number }[];
  ground_truth_audit: {
    patient_count: number;
    top_action_audit: { value: number };
  };
  timestamp: number;
}

interface RuleConsistency {
  rule: string;
  support: number;
  confidence: number;
  lift: number;
  patient_count: number;
}

interface HealthScoreAudit {
  health_score: number;
  baseline: number;
  penalties: {
    rule: string;
    affected_patients: number;
    confidence: number;
    weight: number;
    penalty: number;
  }[];
}

interface CriticalPopulation {
  critical_patients: number;
  total_patients: number;
  top_trigger_rules: string[];
}

interface SimResult {
  baseline_health_score: number;
  projected_health_score: number;
  health_score_delta: number;
  baseline_critical_patients: number;
  projected_critical_patients: number;
  critical_patients_delta: number;
  baseline_critical_risks: number;
  projected_critical_risks: number;
  critical_risks_delta: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const statusColor = (s: string) => {
  if (s === 'GREEN') return '#22C55E';
  if (s === 'YELLOW') return '#F59E0B';
  if (s === 'ORANGE') return '#F97316';
  return '#EF4444'; // RED / default
};

const fmtTs = (ts: number) => {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour12: false });
};

const delta = (v: number) => (v > 0 ? `+${v}` : String(v));

// ── Component ──────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  // ── State ────────────────────────────────────────────────────────────────
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ruleConsistency, setRuleConsistency] = useState<RuleConsistency[]>([]);
  const [healthAudit, setHealthAudit] = useState<HealthScoreAudit | null>(null);
  const [criticalPop, setCriticalPop] = useState<CriticalPopulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Digital Twin
  const [simVariable, setSimVariable] = useState('Alkphos');
  const [simChange, setSimChange] = useState(-20);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simError, setSimError] = useState(false);

  // Audit Inspector
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Fetch all data ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, rcRes, hsRes, cpRes] = await Promise.all([
          fetch(`${API}/knowledge/executive/overview`),
          fetch(`${API}/knowledge/executive/audit/rule-consistency`),
          fetch(`${API}/knowledge/executive/audit/health-score`),
          fetch(`${API}/knowledge/executive/audit/critical-population`),
        ]);
        if (!ovRes.ok) throw new Error('overview failed');
        setOverview(await ovRes.json());
        if (rcRes.ok) setRuleConsistency(await rcRes.json());
        if (hsRes.ok) setHealthAudit(await hsRes.json());
        if (cpRes.ok) setCriticalPop(await cpRes.json());
      } catch {
        setError('Error connecting to Executive Console Backend');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Simulation ───────────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    if (!overview) return;
    setSimulating(true);
    setSimError(false);
    try {
      const res = await fetch(`${API}/knowledge/executive/twin-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifications: [{ variable: simVariable, change_pct: simChange }],
        }),
      });
      if (res.ok) {
        setSimResult(await res.json());
      } else {
        setSimError(true);
      }
    } catch {
      setSimError(true);
    } finally {
      setSimulating(false);
    }
  }, [overview, simVariable, simChange]);

  // ── Loading / Error gates ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', color: '#60A5FA', background: '#05070A' }}>
      INITIALIZING EXECUTIVE CONSOLE...
    </div>
  );
  if (error || !overview) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', color: '#EF4444', background: '#05070A' }}>
      {error || 'No data'}
    </div>
  );

  // ── Derived values (real fields only) ───────────────────────────────────
  const sc = statusColor(overview.mission_status);
  const patients = overview.ground_truth_audit?.patient_count ?? '—';
  const primaryDriver = overview.root_cause?.driver ?? '—';
  const confidence = overview.root_cause?.confidence != null
    ? `${Math.round(overview.root_cause.confidence * 100)}%` : '—';
  const bestAction = overview.priority_alerts?.[0]?.title ?? '—';
  const expectedImprovement = overview.ground_truth_audit?.top_action_audit?.value != null
    ? `${overview.ground_truth_audit.top_action_audit.value.toFixed(1)}` : '—';
  const lastUpdate = fmtTs(overview.timestamp);

  // Root Cause table: top_drivers joined with rule-consistency by driver name
  const rcMap: Record<string, RuleConsistency> = {};
  ruleConsistency.forEach(r => {
    // rule names like RULE_3_Alkphos_HIGH → extract driver name segment
    const parts = r.rule.split('_');
    // e.g. ["RULE","3","Alkphos","HIGH"] → driver is parts[2]
    const driverKey = parts.slice(2, parts.length - 1).join('_');
    rcMap[driverKey] = r;
  });

  // Top 3 actions from priority_alerts
  const top3 = overview.priority_alerts?.slice(0, 3) ?? [];

  return (
    <PageContainer title="Executive Decision Console">
      {/* ── MISSION BAND ─────────────────────────────────────────────────── */}
      <div style={{
        height: 72,
        background: '#0B1118',
        borderBottom: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 24,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.78rem',
        overflowX: 'auto',
        flexShrink: 0,
        marginBottom: 8,
      }}>
        {[
          ['STATUS', <span style={{ color: sc, fontWeight: 700 }}>{overview.mission_status}</span>],
          ['HEALTH SCORE', <span style={{ color: sc, fontWeight: 700 }}>{overview.health_score}</span>],
          ['PATIENTS', <span style={{ color: '#E5E7EB' }}>{patients}</span>],
          ['PRIMARY DRIVER', <span style={{ color: '#F59E0B' }}>{primaryDriver}</span>],
          ['CONFIDENCE', <span style={{ color: '#22C55E' }}>{confidence}</span>],
          ['BEST ACTION', <span style={{ color: '#60A5FA' }}>{bestAction}</span>],
          ['EXPECTED IMPROVEMENT', <span style={{ color: '#A78BFA' }}>{expectedImprovement}</span>],
          ['LAST UPDATE', <span style={{ color: '#94A3B8' }}>{lastUpdate}</span>],
        ].map(([label, val], i) => (
          <div key={i} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#475569', marginRight: 6 }}>{label}:</span>
            {val}
          </div>
        ))}
      </div>

      {/* ── MAIN GRID 20 / 50 / 30 ───────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '20% 50% 30%',
        gap: 8,
        height: 'calc(100vh - 72px - 64px - 16px)', // band + PageContainer header + gaps
        padding: '0 8px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.8rem',
      }}>
        {/* ── LEFT: ROOT CAUSE ANALYSIS ──────────────────────────────────── */}
        <div style={{ background: '#0B1118', border: '1px solid #1E293B', overflow: 'auto', padding: 8 }}>
          <div style={{ color: '#475569', fontSize: '0.7rem', marginBottom: 8, letterSpacing: 2 }}>ROOT CAUSE ANALYSIS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#05070A' }}>
                {['Rank', 'Driver', 'Impact', 'Patients', 'Conf', 'Lift'].map(h => (
                  <th key={h} style={{ border: '1px solid #1E293B', padding: '3px 5px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(overview.top_drivers ?? []).map((d, i) => {
                const rc = rcMap[d.name] ?? null;
                return (
                  <tr key={d.name} style={{ borderBottom: '1px solid #1E293B' }}>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#94A3B8' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#F59E0B', fontWeight: 700 }}>{d.name}</td>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#EF4444' }}>{d.impact}%</td>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#E5E7EB' }}>{rc?.patient_count ?? '—'}</td>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#22C55E' }}>{rc ? `${Math.round(rc.confidence * 100)}%` : '—'}</td>
                    <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#94A3B8' }}>{rc?.lift ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── CENTER: DIGITAL TWIN ───────────────────────────────────────── */}
        <div style={{ background: '#0B1118', border: '1px solid #1E293B', overflow: 'auto', padding: 12 }}>
          <div style={{ color: '#475569', fontSize: '0.7rem', marginBottom: 12, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={12} /> DIGITAL TWIN SIMULATOR
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <select
              value={simVariable}
              onChange={e => setSimVariable(e.target.value)}
              style={{ background: '#05070A', border: '1px solid #1E293B', color: '#E5E7EB', padding: '4px 6px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.78rem' }}
            >
              {(overview.top_drivers ?? []).map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <div style={{ flex: 1 }}>
              <input
                type="range" min={-50} max={50} step={5} value={simChange}
                onChange={e => setSimChange(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#60A5FA' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569' }}>
                <span>-50%</span>
                <span style={{ color: '#60A5FA' }}>{simChange > 0 ? '+' : ''}{simChange}%</span>
                <span>+50%</span>
              </div>
            </div>
            <button
              onClick={runSimulation}
              disabled={simulating}
              style={{ background: '#1D4ED8', border: 'none', color: '#fff', padding: '6px 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.78rem', cursor: simulating ? 'not-allowed' : 'pointer', opacity: simulating ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <PlayCircle size={14} /> {simulating ? 'SIMULATING...' : 'SIMULATE'}
            </button>
          </div>

          {/* Simulation result */}
          {simError && (
            <pre style={{ color: '#94A3B8', fontSize: '0.8rem' }}>SIMULATION DATA NOT AVAILABLE</pre>
          )}
          {!simResult && !simError && (
            <pre style={{ color: '#475569', fontSize: '0.78rem' }}>
{`CURRENT STATE
  Critical Patients : ${overview.ground_truth_audit?.patient_count ?? '—'}
  Health Score      : ${overview.health_score}
  Primary Driver    : ${primaryDriver}

Press SIMULATE to project outcomes.`}
            </pre>
          )}
          {simResult && !simError && (
            <pre style={{ color: '#E5E7EB', fontSize: '0.8rem', lineHeight: 1.7 }}>
{`CURRENT STATE
  Critical Patients : ${simResult.baseline_critical_patients}
  Critical Risks    : ${simResult.baseline_critical_risks}
  Health Score      : ${simResult.baseline_health_score}

IF WE ACT  (${simVariable} ${simChange > 0 ? '+' : ''}${simChange}%)
  Critical Patients : ${simResult.projected_critical_patients}
  Critical Risks    : ${simResult.projected_critical_risks}
  Health Score      : ${simResult.projected_health_score}

EXPECTED IMPROVEMENT
  Patients Delta    : ${delta(simResult.critical_patients_delta)}
  Risks Delta       : ${delta(simResult.critical_risks_delta)}
  Health Delta      : ${delta(simResult.health_score_delta)}`}
            </pre>
          )}
        </div>

        {/* ── RIGHT: ACTION ENGINE ───────────────────────────────────────── */}
        <div style={{ background: '#0B1118', border: '1px solid #1E293B', overflow: 'auto', padding: 8 }}>
          <div style={{ color: '#475569', fontSize: '0.7rem', marginBottom: 8, letterSpacing: 2 }}>ACTION ENGINE — TOP 3</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#05070A' }}>
                {['Rank', 'Action', 'Patients', 'Score', 'Conf'].map(h => (
                  <th key={h} style={{ border: '1px solid #1E293B', padding: '3px 5px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top3.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#94A3B8' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#60A5FA', fontWeight: 700 }}>{a.title}</td>
                  <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#E5E7EB' }}>{a.population_affected}</td>
                  <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#A78BFA' }}>{a.priority_score.toFixed(1)}</td>
                  <td style={{ border: '1px solid #1E293B', padding: '3px 5px', color: '#22C55E' }}>{Math.round(a.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action descriptions */}
          <div style={{ marginTop: 12 }}>
            {top3.map((a, i) => (
              <div key={a.id} style={{ marginBottom: 8, padding: '6px 8px', background: '#05070A', border: '1px solid #1E293B' }}>
                <div style={{ color: '#60A5FA', fontSize: '0.72rem', fontWeight: 700, marginBottom: 2 }}>#{i + 1} {a.title}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.7rem' }}>{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AUDIT INSPECTOR (collapsible, inline) ────────────────────────── */}
      <div style={{ margin: '8px 8px 0', fontFamily: 'IBM Plex Mono, monospace' }}>
        <button
          onClick={() => setAuditOpen(o => !o)}
          style={{ background: '#0B1118', border: '1px solid #1E293B', color: '#475569', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          {auditOpen ? '▲' : '▼'} AUDIT INSPECTOR
        </button>
        {auditOpen && (
          <div style={{ background: '#0B1118', border: '1px solid #1E293B', borderTop: 'none', padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '0.72rem' }}>
            {/* Health Score Audit */}
            <div>
              <div style={{ color: '#475569', letterSpacing: 2, marginBottom: 6 }}>HEALTH SCORE AUDIT</div>
              {healthAudit ? (
                <pre style={{ color: '#E5E7EB', margin: 0, lineHeight: 1.6 }}>
{`Score   : ${healthAudit.health_score}
Baseline: ${healthAudit.baseline}

PENALTIES
${healthAudit.penalties.map(p =>
  `${p.rule}\n  Patients: ${p.affected_patients}\n  Penalty : ${p.penalty}`
).join('\n')}`}
                </pre>
              ) : <span style={{ color: '#475569' }}>No data</span>}
            </div>

            {/* Critical Population Audit */}
            <div>
              <div style={{ color: '#475569', letterSpacing: 2, marginBottom: 6 }}>CRITICAL POPULATION</div>
              {criticalPop ? (
                <pre style={{ color: '#E5E7EB', margin: 0, lineHeight: 1.6 }}>
{`Critical : ${criticalPop.critical_patients}
Total    : ${criticalPop.total_patients}
Rate     : ${((criticalPop.critical_patients / criticalPop.total_patients) * 100).toFixed(1)}%

TOP TRIGGERS
${criticalPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{ color: '#475569' }}>No data</span>}
            </div>

            {/* Rule Consistency Audit */}
            <div>
              <div style={{ color: '#475569', letterSpacing: 2, marginBottom: 6 }}>RULE CONSISTENCY</div>
              {ruleConsistency.length > 0 ? (
                <pre style={{ color: '#E5E7EB', margin: 0, lineHeight: 1.6, fontSize: '0.68rem' }}>
{ruleConsistency.map(r =>
  `${r.rule}\n  Support: ${r.support}  Conf: ${Math.round(r.confidence * 100)}%  Lift: ${r.lift}  Pts: ${r.patient_count}`
).join('\n')}
                </pre>
              ) : <span style={{ color: '#475569' }}>No data</span>}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
