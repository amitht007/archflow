import React, { useEffect, useState } from 'react';
import BaseCanvas from './components/BaseCanvas';

const App: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => {
    const savedTheme = localStorage.getItem('archflow_theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('archflow_theme', newTheme);
  };

  return (
    <div className="w-screen h-screen relative bg-bg-primary text-text-primary overflow-hidden">
      <BaseCanvas theme={theme} setTheme={handleSetTheme} />
    </div>
  );
};

export default App;
