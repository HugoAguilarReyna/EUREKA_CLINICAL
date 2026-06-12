import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Network, Share2, GitBranch, Activity, 
  Database, MessageSquare, Sliders, Award, Users
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    title: 'Executive',
    items: [
      { path: '/', label: 'Executive Intelligence', icon: Award },
      { path: '/recovery', label: 'Assignment Recovery', icon: Award }
    ]
  },
  {
    title: 'Cohort Intelligence',
    items: [
      { path: '/communities', label: 'Cohort Explorer', icon: Users },
      { path: '/similarity', label: 'Similarity Inspector', icon: Activity },
      { path: '/propagation', label: 'Risk Propagation', icon: Sliders },
      { path: '/timeline', label: 'Pattern Timeline', icon: GitBranch }
    ]
  },
  {
    title: 'Analytics',
    items: [

      { path: '/influence', label: 'Influence Explorer', icon: Activity },
      { path: '/explain', label: 'Explainability Explorer', icon: Share2 },
      { path: '/trace', label: 'Traceability Explorer', icon: GitBranch }
    ]
  },
  {
    title: 'Semantic Layer (EDIOS)',
    items: [
      { path: '/preparation', label: 'Data Prep Explorer', icon: Database },
      { path: '/fuzzy', label: 'Fuzzy Explorer', icon: Activity },
      { path: '/rules', label: 'Rule Explorer', icon: LayoutDashboard },
      { path: '/explain-v2', label: 'Explainability V2', icon: Share2 }
    ]
  },
  {
    title: 'Investigation',
    items: [
      { path: '/graph', label: 'Graph Explorer', icon: Network },
      { path: '/copilot', label: 'Knowledge Copilot', icon: MessageSquare },
      { path: '/simulation', label: 'What-If Simulator', icon: Sliders },
      { path: '/ingestion', label: 'Knowledge Ingestion', icon: Database }
    ]
  }
];


export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-surface/50 border-r border-white/5 backdrop-blur-sm flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          EUREKA Multiverse
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
          Clinical Decision Intelligence
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-6 mt-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                      isActive 
                        ? 'bg-blue-500/20 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.2)] font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    )}
                  >
                    <Icon size={16} />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-4 m-4 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-500">
        Sprint 4.3. Connected to Decision Support Service.
      </div>
    </aside>
  );
};
