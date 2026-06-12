import { Routes, Route } from 'react-router-dom';
import { ExecutiveIntelligencePage } from './pages/ExecutiveIntelligencePage';
import { DashboardPage } from './pages/DashboardPage';
import { ExecutiveConsolePage } from './pages/ExecutiveConsolePage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { TraceabilityPage } from './pages/TraceabilityPage';
import { InfluencePage } from './pages/InfluencePage';
import { KnowledgeIngestionPage } from './pages/KnowledgeIngestionPage';
import { KnowledgeCopilotPage } from './pages/KnowledgeCopilotPage';
import { SimulationPage } from './pages/SimulationPage';
import { DataPreparationExplorer } from './pages/DataPreparationExplorer';
import { FuzzyMembershipExplorer } from './pages/FuzzyMembershipExplorer';
import { RuleExplorer } from './pages/RuleExplorer';
import { ExplainabilityExplorerV2 } from './pages/ExplainabilityExplorerV2';
import { AssignmentRecoveryDashboard } from './pages/AssignmentRecoveryDashboard';
import { CommunityExplorer } from './pages/CommunityExplorer';
import { PatientSimilarityExplorer } from './pages/PatientSimilarityExplorer';
import { RiskPropagationExplorer } from './pages/RiskPropagationExplorer';
import { PatternTimelineExplorer } from './pages/PatternTimelineExplorer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ExecutiveIntelligencePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/executive-console" element={<ExecutiveConsolePage />} />
      <Route path="/decision-os" element={<DecisionOSPage />} />
      <Route path="/ingestion" element={<KnowledgeIngestionPage />} />
      <Route path="/copilot" element={<KnowledgeCopilotPage />} />
      <Route path="/graph" element={<KnowledgeGraphPage />} />
      <Route path="/explain" element={<ExplainabilityPage />} />
      <Route path="/trace" element={<TraceabilityPage />} />
      <Route path="/influence" element={<InfluencePage />} />
      <Route path="/simulation" element={<SimulationPage />} />
      <Route path="/preparation" element={<DataPreparationExplorer />} />
      <Route path="/fuzzy" element={<FuzzyMembershipExplorer />} />
      <Route path="/rules" element={<RuleExplorer />} />
      <Route path="/explain-v2" element={<ExplainabilityExplorerV2 />} />
      <Route path="/recovery" element={<AssignmentRecoveryDashboard />} />
      <Route path="/communities" element={<CommunityExplorer />} />
      <Route path="/similarity" element={<PatientSimilarityExplorer />} />
      <Route path="/propagation" element={<RiskPropagationExplorer />} />
      <Route path="/timeline" element={<PatternTimelineExplorer />} />
    </Routes>
  );
}

export default App;



