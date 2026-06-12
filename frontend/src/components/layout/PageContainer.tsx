import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useGraphStore } from '../../store/useGraphStore';
import { Moon, Sun } from 'lucide-react';

export const PageContainer = ({ children, title }: { children: ReactNode; title: string }) => {
  const { darkMode, toggleDarkMode } = useGraphStore();

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 tech-grid">
        {/* Glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 z-10 bg-surface/30 backdrop-blur-md">
          <h2 className="text-lg font-medium text-gray-200 tracking-wide">{title}</h2>
        </header>
        
        <div className="flex-1 overflow-auto p-8 z-10">
          {children}
        </div>
      </main>
    </div>
  );
};
