import React, { useEffect, useState } from 'react';
import BaseCanvas from './components/BaseCanvas';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('archflow_theme');
    return (savedTheme as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('archflow_theme', newTheme);
      return newTheme;
    });
  };

  return (
    <div className="w-screen h-screen relative bg-bg-primary text-text-primary overflow-hidden">
      <BaseCanvas theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
};

export default App;
