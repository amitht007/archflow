import React, { useEffect, useState } from 'react';
import BaseCanvas from './components/BaseCanvas';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="w-screen h-screen relative bg-bg-primary text-text-primary overflow-hidden">
      <button 
        onClick={toggleTheme}
        className="absolute top-4 left-4 z-[1000] px-3 py-2 rounded-lg font-semibold text-sm 
                   bg-bg-badge border border-border-subtle backdrop-blur-md 
                   hover:bg-bg-node-solid transition-all duration-200"
      >
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
      <BaseCanvas theme={theme} />
    </div>
  );
};

export default App;
