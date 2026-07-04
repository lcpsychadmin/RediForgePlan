import React, { createContext, useContext, useState } from 'react';

export interface PageStat {
  label: string;
  value: string | number;
}

interface PageStatsContextType {
  stats: PageStat[];
  setStats: (stats: PageStat[]) => void;
}

const PageStatsContext = createContext<PageStatsContextType | undefined>(undefined);

export const PageStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<PageStat[]>([]);

  return (
    <PageStatsContext.Provider value={{ stats, setStats }}>
      {children}
    </PageStatsContext.Provider>
  );
};

export const usePageStats = () => {
  const context = useContext(PageStatsContext);
  if (!context) {
    throw new Error('usePageStats must be used within PageStatsProvider');
  }
  return context;
};
