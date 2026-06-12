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

// ── Design tokens ──────────────────────────────────────────────────────────
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

const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

const statusColor = (s: string) => {
  if (s === 'GREEN') return C.pos;
  if (s === 'YELLOW') return C.warn;
  if (s === 'ORANGE') return '#F97316';
  return C.crit;
};

const fmtTs = (ts: number) =>
  ts ? new Date(ts * 1000).toISOString().substring(11, 16) + ' UTC' : '—';

const sign = (v: number) => (v > 0 ? `+${v}` : `${v}`);

// ── Shared sub-components ──────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color: C.dim, fontSize: '0.63rem', letterSpacing: 3, marginBottom: 4, ...MONO }}>
    {children}
  </div>
);

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ border: `1px solid ${C.border}`, padding: '3px 6px', textAlign: 'left', color: C.dim, fontWeight: 600, background: C.bg, ...MONO, fontSize: '0.68rem' }}>
    {children}
  </th>
);

const TD = ({ children, color = C.text }: { children: React.ReactNode; color?: string }) => (
  <td style={{ border: `1px solid ${C.border}`, padding: '3px 6px', color, ...MONO, fontSize: '0.7rem' }}>
    {children}
  </td>
);

const panel: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  overflow: 'auto',
  padding: 10,
};

// ── Main component ─────────────────────────────────────────────────────────
export const DashboardPage = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [healthAudit, setHealthAudit] = useState<HealthAudit | null>(null);
  const [critPop, setCritPop] = useState<CritPop | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [simVar, setSimVar] = useState('Alkphos');
  const [simPct, setSimPct] = useState(-20);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simFailed, setSimFailed] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
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

  // ── Loading / Error gates ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.blue, ...MONO }}>
      INITIALIZING DECISION CENTER...
    </div>
  );
  if (fetchError || !overview) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.crit, ...MONO }}>
      {fetchError ?? 'NO DATA'}
    </div>
  );

  // ── Derived values (real fields only) ────────────────────────────────────
  const sc = statusColor(overview.mission_status);
  const patients = overview.ground_truth_audit?.patient_count ?? '—';
  const driver = overview.root_cause?.driver ?? '—';
  const driverImpact = overview.root_cause?.impact ?? '—';
  const driverConf = overview.root_cause?.confidence != null
    ? `${Math.round(overview.root_cause.confidence * 100)}%` : '—';
  const driverPts = overview.root_cause?.affected_patients ?? '—';
  const sourceRule = overview.root_cause?.ground_truth_audit?.source_rule ?? '—';
  const lift = overview.root_cause?.ground_truth_audit?.lift ?? '—';

  const bestAlert = overview.priority_alerts?.[0];
  const bestAction = bestAlert?.title ?? '—';
  const bestActionDesc = bestAlert?.description ?? '';
  const bestActionConf = bestAlert?.confidence != null
    ? `${Math.round(bestAlert.confidence * 100)}%` : '—';
  const bestActionPts = bestAlert?.population_affected ?? '—';

  const expectedImprovement = overview.ground_truth_audit?.top_action_audit?.value != null
    ? `${overview.ground_truth_audit.top_action_audit.value.toFixed(0)} PTS` : '—';
  const lastUpdate = fmtTs(overview.timestamp);
  const top3 = overview.priority_alerts?.slice(0, 3) ?? [];

  // rule-consistency map by driver name
  const ruleMap: Record<string, RuleRow> = {};
  rules.forEach(r => {
    const parts = r.rule.split('_');
    const key = parts.slice(2, parts.length - 1).join('_');
    ruleMap[key] = r;
  });

  // Executive Outcome values
  const outCurrent = simResult ? simResult.baseline_critical_patients : patients;
  const outProjected = simResult ? simResult.projected_critical_patients : '—';
  const outDelta = simResult ? simResult.critical_patients_delta : null;
  const outHealthDelta = simResult ? simResult.health_score_delta : null;

  return (
    <PageContainer title="EUREKA DECISION CENTER">

      {/* ══════════════════════════════════════════════════════════════
          ROW 1 — MISSION BAND (72px)
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        height: 72,
        background: C.panel,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 32,
        overflowX: 'auto',
        flexShrink: 0,
        marginBottom: 6,
        ...MONO,
        fontSize: '0.76rem',
      }}>
        {([
          ['STATUS',      <span style={{ color: sc, fontWeight: 700 }}>{overview.mission_status}</span>],
          ['HEALTH SCORE',<span style={{ color: sc, fontWeight: 700 }}>{overview.health_score}</span>],
          ['PATIENTS',    <span style={{ color: C.text }}>{patients}</span>],
          ['DRIVER',      <span style={{ color: C.warn }}>{driver.toUpperCase()}</span>],
          ['CONFIDENCE',  <span style={{ color: C.pos }}>{driverConf}</span>],
          ['ACTION',      <span style={{ color: C.blue }}>{bestAction.toUpperCase()}</span>],
          ['IMPROVEMENT', <span style={{ color: C.purple }}>{expectedImprovement}</span>],
          ['UPDATED',     <span style={{ color: C.muted }}>{lastUpdate}</span>],
        ] as [string, React.ReactNode][]).map(([lbl, val], i) => (
          <div key={i} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: C.dim, marginRight: 6 }}>{lbl}:</span>{val}
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
        padding: '0 6px',
        height: 'calc(100vh - 72px - 160px - 56px - 32px)',
        minHeight: 280,
      }}>

        {/* ── LEFT: WHY IS THIS HAPPENING? ──────────────────────────── */}
        <div style={panel}>
          <Label>WHY IS THIS HAPPENING?</Label>

          {/* Primary Root Cause — prominent block */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ color: C.dim, fontSize: '0.6rem', letterSpacing: 3, marginBottom: 6, ...MONO }}>PRIMARY ROOT CAUSE</div>
            <div style={{ color: C.warn, fontSize: '1.3rem', fontWeight: 700, ...MONO, marginBottom: 8 }}>
              {driver.toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', ...MONO, fontSize: '0.72rem' }}>
              <div><span style={{ color: C.dim }}>Impact   </span><span style={{ color: C.crit, fontWeight: 700 }}>{driverImpact}%</span></div>
              <div><span style={{ color: C.dim }}>Patients </span><span style={{ color: C.text }}>{driverPts}</span></div>
              <div><span style={{ color: C.dim }}>Conf     </span><span style={{ color: C.pos }}>{driverConf}</span></div>
              <div><span style={{ color: C.dim }}>Lift     </span><span style={{ color: C.muted }}>{lift}</span></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: C.dim }}>Rule     </span><span style={{ color: C.muted, fontSize: '0.65rem' }}>{sourceRule}</span>
              </div>
            </div>
          </div>

          {/* Root Cause table — secondary */}
          <Label>ALL DRIVERS — ROOT CAUSE ANALYSIS</Label>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><TH>#</TH><TH>Driver</TH><TH>Impact</TH><TH>Pts</TH><TH>Conf</TH><TH>Lift</TH></tr>
            </thead>
            <tbody>
              {overview.top_drivers.map((d, i) => {
                const rc = ruleMap[d.name];
                return (
                  <tr key={d.name} style={{ background: i % 2 === 0 ? C.bg : 'transparent' }}>
                    <TD color={C.dim}>{i + 1}</TD>
                    <TD color={C.warn}>{d.name}</TD>
                    <TD color={C.crit}>{d.impact}%</TD>
                    <TD>{rc?.patient_count ?? '—'}</TD>
                    <TD color={C.pos}>{rc ? `${Math.round(rc.confidence * 100)}%` : '—'}</TD>
                    <TD color={C.muted}>{rc?.lift ?? '—'}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── CENTER: WHAT HAPPENS IF WE ACT? ───────────────────────── */}
        <div style={panel}>
          <Label>WHAT HAPPENS IF WE ACT?  —  DIGITAL TWIN SIMULATOR</Label>

          {/* Scenario controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <select
              value={simVar}
              onChange={e => setSimVar(e.target.value)}
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '4px 6px', ...MONO, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              {overview.top_drivers.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <div style={{ flex: 1, minWidth: 100 }}>
              <input
                type="range" min={-50} max={50} step={5} value={simPct}
                onChange={e => setSimPct(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: C.blue }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem', color: C.dim, ...MONO }}>
                <span>-50%</span>
                <span style={{ color: C.blue }}>{simPct > 0 ? '+' : ''}{simPct}%</span>
                <span>+50%</span>
              </div>
            </div>
            <button
              onClick={runSim}
              disabled={simRunning}
              style={{
                background: simRunning ? '#1E293B' : C.blue,
                border: 'none', color: simRunning ? C.muted : C.bg,
                padding: '5px 16px', ...MONO, fontSize: '0.75rem', fontWeight: 700,
                cursor: simRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {simRunning ? 'RUNNING...' : 'SIMULATE'}
            </button>
          </div>

          {/* Simulation flow */}
          {simFailed && (
            <div style={{ color: C.crit, ...MONO, fontSize: '0.8rem', padding: 12, border: `1px solid ${C.border}`, background: C.bg }}>
              SIMULATION DATA NOT AVAILABLE
            </div>
          )}

          {!simFailed && !simResult && (
            <div style={{ color: C.dim, ...MONO, fontSize: '0.75rem', padding: 12, border: `1px solid ${C.border}`, background: C.bg }}>
              Select a driver and percentage, then press SIMULATE to project outcomes.
            </div>
          )}

          {simResult && !simFailed && (() => {
            const patDelta = simResult.critical_patients_delta;
            const hsDelta = simResult.health_score_delta;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Current State */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '10px 14px' }}>
                  <div style={{ color: C.dim, fontSize: '0.6rem', letterSpacing: 3, marginBottom: 6, ...MONO }}>CURRENT STATE</div>
                  <div style={{ display: 'flex', gap: 32 }}>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Critical Patients</div>
                      <div style={{ color: C.crit, fontSize: '1.6rem', fontWeight: 700, ...MONO }}>{simResult.baseline_critical_patients}</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Health Score</div>
                      <div style={{ color: C.crit, fontSize: '1.6rem', fontWeight: 700, ...MONO }}>{simResult.baseline_health_score}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center', color: C.dim, fontSize: '0.9rem', ...MONO }}>↓  {simVar} {simPct > 0 ? '+' : ''}{simPct}%  ↓</div>

                {/* Projected State */}
                <div style={{ background: C.bg, border: `1px solid ${C.pos}`, padding: '10px 14px' }}>
                  <div style={{ color: C.pos, fontSize: '0.6rem', letterSpacing: 3, marginBottom: 6, ...MONO }}>PROJECTED STATE</div>
                  <div style={{ display: 'flex', gap: 32 }}>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Critical Patients</div>
                      <div style={{ color: C.pos, fontSize: '1.6rem', fontWeight: 700, ...MONO }}>{simResult.projected_critical_patients}</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Health Score</div>
                      <div style={{ color: C.pos, fontSize: '1.6rem', fontWeight: 700, ...MONO }}>{simResult.projected_health_score}</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center', color: C.dim, fontSize: '0.9rem', ...MONO }}>↓</div>

                {/* Improvement */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '10px 14px' }}>
                  <div style={{ color: C.dim, fontSize: '0.6rem', letterSpacing: 3, marginBottom: 6, ...MONO }}>IMPROVEMENT</div>
                  <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Patients Saved</div>
                      <div style={{ color: patDelta < 0 ? C.pos : C.crit, fontSize: '1.4rem', fontWeight: 700, ...MONO }}>
                        {patDelta < 0 ? Math.abs(patDelta) : sign(patDelta)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Health Score Gain</div>
                      <div style={{ color: hsDelta > 0 ? C.pos : C.crit, fontSize: '1.4rem', fontWeight: 700, ...MONO }}>
                        {sign(hsDelta)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: '0.65rem', ...MONO }}>Confidence</div>
                      <div style={{ color: C.pos, fontSize: '1.4rem', fontWeight: 700, ...MONO }}>{driverConf}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── RIGHT: WHAT SHOULD WE DO? ─────────────────────────────── */}
        <div style={panel}>
          <Label>WHAT SHOULD WE DO?</Label>

          {/* Recommended Action — prominent */}
          <div style={{ background: C.bg, border: `1px solid ${C.blue}`, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ color: C.dim, fontSize: '0.6rem', letterSpacing: 3, marginBottom: 6, ...MONO }}>RECOMMENDED ACTION</div>
            <div style={{ color: C.blue, fontSize: '1.1rem', fontWeight: 700, ...MONO, marginBottom: 8 }}>
              {bestAction.toUpperCase()}
            </div>
            <div style={{ color: C.muted, fontSize: '0.68rem', ...MONO, marginBottom: 8 }}>{bestActionDesc}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', ...MONO, fontSize: '0.72rem' }}>
              <div>
                <div style={{ color: C.dim, fontSize: '0.6rem' }}>EXPECTED IMPACT</div>
                <div style={{ color: C.pos, fontWeight: 700 }}>{bestActionPts} patients</div>
              </div>
              <div>
                <div style={{ color: C.dim, fontSize: '0.6rem' }}>CONFIDENCE</div>
                <div style={{ color: C.pos, fontWeight: 700 }}>{bestActionConf}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: C.dim, fontSize: '0.6rem' }}>AFFECTED POPULATION</div>
                <div style={{ color: C.text }}>{bestAlert?.population_affected ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Top 3 — secondary table */}
          <Label>TOP 3 ACTIONS</Label>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr><TH>#</TH><TH>Action</TH><TH>Pts</TH><TH>Conf</TH></tr>
            </thead>
            <tbody>
              {top3.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? C.bg : 'transparent' }}>
                  <TD color={C.dim}>{i + 1}</TD>
                  <TD color={i === 0 ? C.blue : C.text}>{a.title}</TD>
                  <TD>{a.population_affected}</TD>
                  <TD color={C.pos}>{Math.round(a.confidence * 100)}%</TD>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action descriptions */}
          {top3.map((a, i) => (
            <div key={a.id} style={{ padding: '5px 8px', background: C.bg, border: `1px solid ${C.border}`, marginBottom: 5 }}>
              <div style={{ color: i === 0 ? C.blue : C.muted, fontSize: '0.68rem', fontWeight: 700, marginBottom: 2, ...MONO }}>
                #{i + 1} {a.title}
              </div>
              <div style={{ color: C.dim, fontSize: '0.63rem', ...MONO }}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 3 — EXECUTIVE OUTCOME (DOMINANT, full width)
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        margin: '6px 6px 0',
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.blue}`,
        padding: '18px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minHeight: 140,
        ...MONO,
      }}>
        {/* Label */}
        <div style={{ marginRight: 40, flexShrink: 0 }}>
          <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 4, marginBottom: 6 }}>EXECUTIVE OUTCOME</div>
          <div style={{ color: C.blue, fontSize: '0.75rem', letterSpacing: 2 }}>BEST ACTION</div>
          <div style={{ color: C.blue, fontSize: '1.5rem', fontWeight: 700, maxWidth: 220 }}>{bestAction.toUpperCase()}</div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 100, background: C.border, marginRight: 40, flexShrink: 0 }} />

        {/* CURRENT */}
        <div style={{ marginRight: 32, flexShrink: 0 }}>
          <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 3, marginBottom: 4 }}>CURRENT</div>
          <div style={{ color: C.crit, fontSize: '2.6rem', fontWeight: 700, lineHeight: 1 }}>{outCurrent}</div>
          <div style={{ color: C.muted, fontSize: '0.65rem', marginTop: 3 }}>critical patients</div>
        </div>

        {/* Arrow */}
        <div style={{ color: C.dim, fontSize: '1.4rem', marginRight: 32, flexShrink: 0 }}>→</div>

        {/* PROJECTED */}
        <div style={{ marginRight: 32, flexShrink: 0 }}>
          <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 3, marginBottom: 4 }}>PROJECTED</div>
          <div style={{ color: outProjected !== '—' ? C.pos : C.muted, fontSize: '2.6rem', fontWeight: 700, lineHeight: 1 }}>
            {outProjected}
          </div>
          <div style={{ color: C.muted, fontSize: '0.65rem', marginTop: 3 }}>after action</div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 100, background: C.border, marginRight: 40, flexShrink: 0 }} />

        {/* DELTA */}
        <div style={{ marginRight: 40, flexShrink: 0 }}>
          <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 3, marginBottom: 4 }}>DELTA</div>
          <div style={{
            color: outDelta !== null ? (outDelta < 0 ? C.pos : C.crit) : C.muted,
            fontSize: '2.6rem', fontWeight: 700, lineHeight: 1,
          }}>
            {outDelta !== null ? sign(outDelta) : '—'}
          </div>
          <div style={{ color: C.muted, fontSize: '0.65rem', marginTop: 3 }}>patients</div>
        </div>

        {/* HEALTH DELTA */}
        {outHealthDelta !== null && (
          <div style={{ marginRight: 40, flexShrink: 0 }}>
            <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 3, marginBottom: 4 }}>HEALTH GAIN</div>
            <div style={{
              color: outHealthDelta > 0 ? C.pos : C.crit,
              fontSize: '2.6rem', fontWeight: 700, lineHeight: 1,
            }}>
              {sign(outHealthDelta)}
            </div>
            <div style={{ color: C.muted, fontSize: '0.65rem', marginTop: 3 }}>score points</div>
          </div>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 100, background: C.border, marginRight: 40, flexShrink: 0 }} />

        {/* CONFIDENCE */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: C.dim, fontSize: '0.62rem', letterSpacing: 3, marginBottom: 4 }}>CONFIDENCE</div>
          <div style={{ color: C.pos, fontSize: '2.6rem', fontWeight: 700, lineHeight: 1 }}>{bestActionConf}</div>
          <div style={{ color: C.muted, fontSize: '0.65rem', marginTop: 3 }}>decision confidence</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ROW 4 — AUDIT EVIDENCE (collapsible)
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ margin: '6px 6px 8px', ...MONO }}>
        <button
          onClick={() => setAuditOpen(o => !o)}
          style={{
            width: '100%', textAlign: 'left',
            background: C.panel, border: `1px solid ${C.border}`,
            color: C.dim, padding: '5px 14px',
            fontSize: '0.7rem', cursor: 'pointer',
          }}
        >
          {auditOpen ? '▲' : '▼'} AUDIT EVIDENCE
        </button>

        {auditOpen && (
          <div style={{
            background: C.panel, border: `1px solid ${C.border}`, borderTop: 'none',
            padding: 14, display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr', gap: 14, fontSize: '0.68rem',
          }}>
            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>HEALTH SCORE AUDIT</div>
              {healthAudit ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.8, fontSize: '0.66rem', whiteSpace: 'pre-wrap', ...MONO }}>
{`Score   : ${healthAudit.health_score}
Baseline: ${healthAudit.baseline}

PENALTIES
${healthAudit.penalties.map(p =>
  `${p.rule}\n  Patients : ${p.affected_patients}\n  Weight   : ${p.weight}\n  Penalty  : ${p.penalty}`
).join('\n')}`}
                </pre>
              ) : <span style={{ color: C.dim }}>No data</span>}
            </div>

            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>CRITICAL POPULATION AUDIT</div>
              {critPop ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.8, fontSize: '0.66rem', whiteSpace: 'pre-wrap', ...MONO }}>
{`Critical : ${critPop.critical_patients}
Total    : ${critPop.total_patients}
Rate     : ${((critPop.critical_patients / critPop.total_patients) * 100).toFixed(1)}%

TOP TRIGGERS
${critPop.top_trigger_rules.join('\n')}`}
                </pre>
              ) : <span style={{ color: C.dim }}>No data</span>}
            </div>

            <div>
              <div style={{ color: C.dim, letterSpacing: 2, marginBottom: 6 }}>RULE CONSISTENCY AUDIT</div>
              {rules.length > 0 ? (
                <pre style={{ color: C.text, margin: 0, lineHeight: 1.8, fontSize: '0.64rem', whiteSpace: 'pre-wrap', ...MONO }}>
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
