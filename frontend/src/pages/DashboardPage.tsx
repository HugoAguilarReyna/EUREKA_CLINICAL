import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../components/layout/PageContainer';

const API = import.meta.env.VITE_API_URL || '';

// ── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  mission_status: string;
  health_score: number;
  timestamp: number;
  root_cause: {
    driver: string;
    impact: number;
    confidence: number;
    affected_patients: number;
    ground_truth_audit: {
      source_rule: string;
      support: number;
      confidence: number;
      lift: number;
    };
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
    top_action_audit: { value: number; source_rule: string; support: number; confidence: number };
  };
}

interface RuleRow {
  rule: string;
  support: number;
  confidence: number;
  lift: number;
  patient_count: number;
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

interface HealthAudit {
  health_score: number;
  baseline: number;
  penalties: { rule: string; affected_patients: number; confidence: number; weight: number; penalty: number }[];
}

interface CritPop {
  critical_patients: number;
  total_patients: number;
  top_trigger_rules: string[];
}

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#05070A',
  panel: '#0B1118',
  border: '#1E293B',
  text: '#E5E7EB',
  muted: '#94A3B8',
  dim: '#475569',
  pos: '#22C55E',
  warn: '#F59E0B',
  crit: '#EF4444',
  blue: '#60A5FA',
  purple: '#A78BFA',
};

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

const statusColor = (s: string) => {
  if (s === 'GREEN') return C.pos;
  if (s === 'YELLOW') return C.warn;
  if (s === 'ORANGE') return '#F97316';
  return C.crit;
};

const fmtTs = (ts: number) =>
  ts ? new Date(ts * 1000).toISOString().substring(11, 16) + ' UTC' : '—';

const delta = (v: number) => (v > 0 ? `+${v}` : `${v}`);

// ── Shared styles ──────────────────────────────────────────────────────────
const panel: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  overflow: 'auto',
  padding: 10,
};

const sectionLabel = (text: string) => (
  <div style={{ color: C.dim, fontSize: '0.68rem', letterSpacing: 3, marginBottom: 8, ...mono }}>
    {text}
  </div>
);

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ border: `1px solid ${C.border}`, padding: '3px 6px', textAlign: 'left', color: C.dim, fontWeight: 600, background: C.bg, ...mono, fontSize: '0.72rem' }}>
    {children}
  </th>
);

const TD = ({ children, color = C.text }: { children: React.ReactNode; color?: string }) => (
  <td style={{ border: `1px solid ${C.border}`, padding: '3px 6px', color, ...mono, fontSize: '0.73rem' }}>
    {children}
  </td>
);

// ── Component ──────────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [healthAudit, setHealthAudit] = useState<HealthAudit | null>(null);
  const [critPop, setCritPop] = useState<CritPop | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Simulator
  const [simVar, setSimVar] = useState('Alkphos');
  const [simPct, setSimPct] = useState(-20);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simFailed, setSimFailed] = useState(false);

  // Audit
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [ov, rc, hs, cp] = await Promise.all([
          fetch(`${API}/knowledge/executive/overview`),
          fetch(`${API}/knowledge/executive/audit/rule-consistency`),
          fetch(`${API}/knowledge/executive/audit/health-score`),
          fetch(`${API}/knowledge/executive/audit/critical-population`),
        ]);
        if (!ov.ok) throw new Error('overview failed');
        setOverview(await ov.json());
        if (rc.ok) setRules(await rc.json());
        if (hs.ok) setHealthAudit(await hs.json());
        if (cp.ok) setCritPop(await cp.json());
      } catch {
        setFetchError('Error connecting to Executive Console Backend');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runSim = useCallback(async () => {
    setSimRunning(true);
    setSimFailed(false);
    setSimResult(null);
    try {
      const res = await fetch(`${API}/knowledge/executive/twin-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications: [{ variable: simVar, change_pct: simPct }] }),
      });
      if (res.ok) setSimResult(await res.json());
      else setSimFailed(true);
    } catch {
      setSimFailed(true);
    } finally {
      setSimRunning(false);
    }
  }, [simVar, simPct]);

  // ── Gates ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.blue, ...mono }}>
      INITIALIZING DECISION CENTER...
    </div>
  );
  if (fetchError || !overview) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.crit, ...mono }}>
      {fetchError ?? 'NO DATA'}
    </div>
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const sc = statusColor(overview.mission_status);
  const patients = overview.ground_truth_audit?.patient_count ?? '—';
  const driver = overview.root_cause?.driver ?? '—';
  const conf = overview.root_cause?.confidence != null
    ? `${Math.round(overview.root_cause.confidence * 100)}%` : '—';
  const bestAction = overview.priority_alerts?.[0]?.title ?? '—';
  const bestActionDesc = overview.priority_alerts?.[0]?.description ?? '';
  const bestActionConf = overview.priority_alerts?.[0]?.confidence != null
    ? `${Math.round(overview.priority_alerts[0].confidence * 100)}%` : '—';
  const bestActionPts = overview.priority_alerts?.[0]?.population_affected ?? '—';
  const topActionVal = overview.ground_truth_audit?.top_action_audit?.value;
  const expectedImprovement = topActionVal != null ? `${topActionVal.toFixed(0)} PTS` : '—';
  const lastUpdate = fmtTs(overview.timestamp);
  const top3 = overview.priority_alerts?.slice(0, 3) ?? [];

  // Rule consistency map keyed by driver name segment
  const ruleMap: Record<string, RuleRow> = {};
  rules.forEach(r => {
    const parts = r.rule.split('_');
    const key = parts.slice(2, parts.length - 1).join('_');
    ruleMap[key] = r;
  });

  return (
    <PageContainer title="EUREKA DECISION CENTER">

      {/* ══════════════════════════════════════════════════════════════
          ROW 1 — MISSION BAND
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        height: 56,
        background: C.panel,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 28,
        overflowX: 'auto',
        flexShrink: 0,
        marginBottom: 6,
        ...mono,
        fontSize: '0.76rem',
      }}>
        {([
          ['STATUS', <span style={{ color: sc, fontWeight: 700 }}>{overview.mission_status}</span>],
          ['HEALTH SCORE', <span style={{ color: sc, fontWeight: 700 }}>{overview.health_score}</span>],
          ['PATIENTS', <span style={{ color: C.text }}>{patients}</span>],
          ['DRIVER', <span style={{ color: C.warn }}>{driver.toUpperCase()}</span>],
          ['CONFIDENCE', <span style={{ color: C.pos }}>{conf}</span>],
          ['ACTION', <span style={{ color: C.blue }}>{bestAction.toUpperCase()}</span>],
          ['IMPROVEMENT', <span style={{ color: C.purple }}>{expectedImprovement}</span>],
          ['UPDATED', <span style={{ color: C.muted }}>{lastUpdate}</span>],
        ] as [string, React.ReactNode][]).map(([label, val], i) => (
          <div key={i} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: C.dim, marginRight: 5 }}>{label}:</span>{val}
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 2 — DECISION GRID  25 | 45 | 30
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '25% 45% 30%',
        gap: 6,
        height: 'calc(100vh - 56px - 80px - 64px - 24px)',
        padding: '0 6px',
        minHeight: 320,
      }}>

        {/* ── LEFT: WHY IS THIS HAPPENING? ──────────────────────────── */}
        <div style={panel}>
          {sectionLabel('WHY IS THIS HAPPENING?  —  ROOT CAUSE ANALYSIS')}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>#</TH><TH>Driver</TH><TH>Impact</TH>
                <TH>Support</TH><TH>Conf</TH><TH>Lift</TH>
              </tr>
            </thead>
            <tbody>
              {overview.top_drivers.map((d, i) => {
                const rc = ruleMap[d.name];
                return (
                  <tr key={d.name} style={{ background: i % 2 === 0 ? C.bg : 'transparent' }}>
                    <TD color={C.muted}>{i + 1}</TD>
                    <TD color={C.warn}>{d.name}</TD>
                    <TD color={C.crit}>{d.impact}%</TD>
                    <TD color={C.text}>{rc?.support ?? '—'}</TD>
                    <TD color={C.pos}>{rc ? `${Math.round(rc.confidence * 100)}%` : '—'}</TD>
                    <TD color={C.muted}>{rc?.lift ?? '—'}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Root cause detail */}
          <div style={{ marginTop: 12, padding: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.dim, fontSize: '0.68rem', letterSpacing: 2, marginBottom: 6, ...mono }}>PRIMARY ROOT CAUSE</div>
            <div style={{ color: C.warn, fontSize: '1rem', fontWeight: 700, ...mono }}>{overview.root_cause.driver}</div>
            <div style={{ color: C.muted, fontSize: '0.72rem', marginTop: 4, ...mono }}>
              Impact: {overview.root_cause.impact}% &nbsp;|&nbsp;
              Patients: {overview.root_cause.affected_patients} &nbsp;|&nbsp;
              Conf: {Math.round(overview.root_cause.confidence * 100)}%
            </div>
            {overview.root_cause.ground_truth_audit && (
              <div style={{ color: C.dim, fontSize: '0.68rem', marginTop: 4, ...mono }}>
                Rule: {overview.root_cause.ground_truth_audit.source_rule} &nbsp;|&nbsp;
                Lift: {overview.root_cause.ground_truth_audit.lift}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: WHAT HAPPENS IF WE ACT? ───────────────────────── */}
        <div style={panel}>
          {sectionLabel('WHAT HAPPENS IF WE ACT?  —  DIGITAL TWIN SIMULATOR')}

          {/* Scenario controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ color: C.dim, fontSize: '0.7rem', ...mono }}>SCENARIO</div>
            <select
              value={simVar}
              onChange={e => setSimVar(e.target.value)}
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '3px 6px', ...mono, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              {overview.top_drivers.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <div style={{ flex: 1, minWidth: 120 }}>
              <input
                type="range" min={-50} max={50} step={5} value={simPct}
                onChange={e => setSimPct(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: C.blue }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: C.dim, ...mono }}>
                <span>-50%</span>
                <span style={{ color: C.blue }}>{simPct > 0 ? '+' : ''}{simPct}%</span>
                <span>+50%</span>
              </div>
            </div>
            <button
              onClick={runSim}
              disabled={simRunning}
              style={{
                background: simRunning ? C.dim : C.blue,
                border: 'none', color: C.bg,
                padding: '5px 14px', ...mono,
                fontSize: '0.75rem', fontWeight: 700,
                cursor: simRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {simRunning ? 'RUNNING...' : 'SIMULATE'}
            </button>
          </div>

          {/* State display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>

            {/* CURRENT STATE */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10 }}>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 2, marginBottom: 8, ...mono }}>CURRENT STATE</div>
              <div style={{ color: C.muted, fontSize: '0.7rem', ...mono, marginBottom: 4 }}>Critical Patients</div>
              <div style={{ color: C.crit, fontSize: '1.4rem', fontWeight: 700, ...mono }}>
                {simResult ? simResult.baseline_critical_patients : patients}
              </div>
              <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Health Score</div>
              <div style={{ color: C.crit, fontSize: '1.1rem', fontWeight: 700, ...mono }}>
                {simResult ? simResult.baseline_health_score : overview.health_score}
              </div>
              <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Primary Driver</div>
              <div style={{ color: C.warn, fontSize: '0.8rem', fontWeight: 700, ...mono }}>{driver}</div>
            </div>

            {/* SCENARIO RESULT */}
            <div style={{ background: C.bg, border: `1px solid ${simFailed ? C.crit : simResult ? C.pos : C.border}`, padding: 10 }}>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 2, marginBottom: 8, ...mono }}>
                IF WE ACT{simResult ? ` (${simVar} ${simPct > 0 ? '+' : ''}${simPct}%)` : ''}
              </div>
              {simFailed && (
                <div style={{ color: C.crit, fontSize: '0.75rem', ...mono }}>SIMULATION DATA NOT AVAILABLE</div>
              )}
              {!simFailed && !simResult && (
                <div style={{ color: C.dim, fontSize: '0.75rem', ...mono }}>
                  Select driver and percentage, then press SIMULATE.
                </div>
              )}
              {simResult && !simFailed && (
                <>
                  <div style={{ color: C.muted, fontSize: '0.7rem', ...mono }}>Critical Patients</div>
                  <div style={{ color: C.pos, fontSize: '1.4rem', fontWeight: 700, ...mono }}>
                    {simResult.projected_critical_patients}
                  </div>
                  <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Health Score</div>
                  <div style={{ color: C.pos, fontSize: '1.1rem', fontWeight: 700, ...mono }}>
                    {simResult.projected_health_score}
                  </div>
                  <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Critical Risks</div>
                  <div style={{ color: C.pos, fontSize: '0.9rem', fontWeight: 700, ...mono }}>
                    {simResult.projected_critical_risks}
                  </div>
                </>
              )}
            </div>

            {/* EXPECTED IMPROVEMENT */}
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 10 }}>
              <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 2, marginBottom: 8, ...mono }}>EXPECTED IMPROVEMENT</div>
              {simResult && !simFailed ? (
                <>
                  <div style={{ color: C.muted, fontSize: '0.7rem', ...mono }}>Patients Delta</div>
                  <div style={{ color: simResult.critical_patients_delta < 0 ? C.pos : C.crit, fontSize: '1.4rem', fontWeight: 700, ...mono }}>
                    {delta(simResult.critical_patients_delta)}
                  </div>
                  <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Health Delta</div>
                  <div style={{ color: simResult.health_score_delta > 0 ? C.pos : C.crit, fontSize: '1.1rem', fontWeight: 700, ...mono }}>
                    {delta(simResult.health_score_delta)}
                  </div>
                  <div style={{ color: C.muted, fontSize: '0.7rem', marginTop: 8, ...mono }}>Risks Delta</div>
                  <div style={{ color: simResult.critical_risks_delta < 0 ? C.pos : C.crit, fontSize: '0.9rem', fontWeight: 700, ...mono }}>
                    {delta(simResult.critical_risks_delta)}
                  </div>
                </>
              ) : (
                <div style={{ color: C.dim, fontSize: '0.75rem', ...mono }}>Run simulation to see projected deltas.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: WHAT SHOULD WE DO? ─────────────────────────────── */}
        <div style={panel}>
          {sectionLabel('WHAT SHOULD WE DO?  —  ACTION ENGINE')}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
            <thead>
              <tr>
                <TH>#</TH><TH>Action</TH><TH>Patients</TH><TH>Conf</TH>
              </tr>
            </thead>
            <tbody>
              {top3.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? C.bg : 'transparent' }}>
                  <TD color={C.muted}>{i + 1}</TD>
                  <TD color={C.blue}>{a.title}</TD>
                  <TD color={C.text}>{a.population_affected}</TD>
                  <TD color={C.pos}>{Math.round(a.confidence * 100)}%</TD>
                </tr>
              ))}
            </tbody>
          </table>

          {top3.map((a, i) => (
            <div key={a.id} style={{ padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`, marginBottom: 6 }}>
              <div style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 700, marginBottom: 2, ...mono }}>
                #{i + 1} {a.title}
              </div>
              <div style={{ color: C.muted, fontSize: '0.68rem', marginBottom: 4, ...mono }}>{a.description}</div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.68rem', ...mono }}>
                <span style={{ color: C.dim }}>Score: <span style={{ color: C.purple }}>{a.priority_score.toFixed(1)}</span></span>
                <span style={{ color: C.dim }}>Conf: <span style={{ color: C.pos }}>{Math.round(a.confidence * 100)}%</span></span>
                <span style={{ color: C.dim }}>Pts: <span style={{ color: C.text }}>{a.population_affected}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 3 — EXECUTIVE OUTCOME
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        margin: '6px 6px 0',
        background: C.panel,
        border: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        ...mono,
      }}>
        <div>
          <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 3, marginBottom: 4 }}>BEST ACTION</div>
          <div style={{ color: C.blue, fontSize: '1.05rem', fontWeight: 700 }}>{bestAction.toUpperCase()}</div>
          <div style={{ color: C.muted, fontSize: '0.68rem', marginTop: 3 }}>{bestActionDesc}</div>
        </div>
        <div>
          <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 3, marginBottom: 4 }}>EXPECTED RESULT</div>
          <div style={{ color: C.pos, fontSize: '1.4rem', fontWeight: 700 }}>
            {simResult
              ? `${simResult.baseline_critical_patients} → ${simResult.projected_critical_patients}`
              : `${patients} → —`}
          </div>
        </div>
        <div>
          <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 3, marginBottom: 4 }}>PATIENTS IMPROVED</div>
          <div style={{ color: C.pos, fontSize: '1.4rem', fontWeight: 700 }}>
            {simResult
              ? Math.abs(simResult.critical_patients_delta)
              : bestActionPts}
          </div>
        </div>
        <div>
          <div style={{ color: C.dim, fontSize: '0.65rem', letterSpacing: 3, marginBottom: 4 }}>CONFIDENCE</div>
          <div style={{ color: C.pos, fontSize: '1.4rem', fontWeight: 700 }}>{bestActionConf}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 4 — AUDIT EVIDENCE (collapsible)
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ margin: '6px 6px 0', ...mono }}>
        <button
          onClick={() => setAuditOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left',
            background: C.panel, border: `1px solid ${C.border}`,
            color: C.dim, padding: '5px 12px',
            fontSize: '0.72rem', cursor: 'pointer',
          }}
        >
          {auditOpen ? '▲' : '▼'} AUDIT EVIDENCE
        </button>

        {auditOpen && (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, borderTop: 'none',
            padding: 12, display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '0.7rem',
          }}>
            {/* Health Score Audit */}
            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>HEALTH SCORE AUDIT</div>
              {healthAudit ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.7, fontSize: '0.68rem', whiteSpace: 'pre-wrap' }}>
{`Score   : ${healthAudit.health_score}
Baseline: ${healthAudit.baseline}

PENALTIES
${healthAudit.penalties.map(p =>
  `${p.rule}\n  Patients : ${p.affected_patients}\n  Weight   : ${p.weight}\n  Penalty  : ${p.penalty}`
).join('\n')}`}
                </pre>
              ) : <span style={{ color: C.dim }}>No data</span>}
            </div>

            {/* Critical Population */}
            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>CRITICAL POPULATION AUDIT</div>
              {critPop ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.7, fontSize: '0.68rem', whiteSpace: 'pre-wrap' }}>
{`Critical : ${critPop.critical_patients}
Total    : ${critPop.total_patients}
Rate     : ${((critPop.critical_patients / critPop.total_patients) * 100).toFixed(1)}%

TOP TRIGGERS
${critPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{ color: C.dim }}>No data</span>}
            </div>

            {/* Rule Consistency */}
            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>RULE CONSISTENCY AUDIT</div>
              {rules.length > 0 ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.7, fontSize: '0.66rem', whiteSpace: 'pre-wrap' }}>
{rules.map(r =>
  `${r.rule}\n  Support: ${r.support}  Conf: ${Math.round(r.confidence * 100)}%  Lift: ${r.lift}  Pts: ${r.patient_count}`
).join('\n')}
                </pre>
              ) : <span style={{ color: C.dim }}>No data</span>}
            </div>
          </div>
        )}
      </div>

    </PageContainer>
  );
};
