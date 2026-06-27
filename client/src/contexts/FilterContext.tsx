// client/src/contexts/FilterContext.tsx
// Global persistent filter context for program/project selection.
// Persists selections in localStorage so users don't lose context on navigation.

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

const STORAGE_KEY = 'rf_global_filter';

interface FilterState {
  programId: string | null;
  projectId: string | null;
}

interface FilterContextType {
  selectedProgramId: string | null;
  selectedProjectId: string | null;
  setSelectedProgramId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  programs: any[];
  projects: any[]; // Projects for the selected program
  programsLoading: boolean;
  projectsLoading: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function loadFromStorage(): FilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { programId: null, projectId: null };
    const parsed = JSON.parse(raw);
    return {
      programId: typeof parsed.programId === 'string' ? parsed.programId : null,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : null,
    };
  } catch {
    return { programId: null, projectId: null };
  }
}

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const saved = loadFromStorage();
  const [selectedProgramId, setSelectedProgramIdState] = useState<string | null>(saved.programId);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(saved.projectId);

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ programId: selectedProgramId, projectId: selectedProjectId }));
  }, [selectedProgramId, selectedProjectId]);

  const setSelectedProgramId = (id: string | null) => {
    setSelectedProgramIdState(id);
    // Clear project when program changes
    setSelectedProjectIdState(null);
  };

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id);
  };

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['programs-for-filter'],
    queryFn: async () => {
      const response = await apiClient.get('/api/programs');
      return response.data.data || [];
    },
    staleTime: 60000,
  });

  // Auto-select first program if none selected
  useEffect(() => {
    if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramIdState(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  // Validate saved programId still exists
  useEffect(() => {
    if (selectedProgramId && programs.length > 0) {
      const exists = programs.some((p: any) => p.id === selectedProgramId);
      if (!exists) setSelectedProgramIdState(programs[0]?.id ?? null);
    }
  }, [programs, selectedProgramId]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-filter', selectedProgramId],
    queryFn: async () => {
      const cycles: any[] = [];
      const cyclesResponse = await apiClient.get(`/api/programs/${selectedProgramId}/mock-cycles`);
      const mockCycles = cyclesResponse.data.data || [];
      await Promise.all(
        mockCycles.map(async (cycle: any) => {
          const resp = await apiClient.get(`/api/projects/by-cycle/${cycle.id}`);
          (resp.data.data || []).forEach((project: any) => {
            if (!cycles.find((p) => p.id === project.id)) {
              cycles.push({ ...project, mockCycleName: cycle.name });
            }
          });
        })
      );
      return cycles;
    },
    enabled: !!selectedProgramId,
    staleTime: 30000,
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectIdState(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Validate saved projectId still exists in selected program's projects
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const exists = projects.some((p: any) => p.id === selectedProjectId);
      if (!exists) setSelectedProjectIdState(projects[0]?.id ?? null);
    }
  }, [projects, selectedProjectId]);

  const value = useMemo<FilterContextType>(() => ({
    selectedProgramId,
    selectedProjectId,
    setSelectedProgramId,
    setSelectedProjectId,
    programs,
    projects,
    programsLoading,
    projectsLoading,
  }), [selectedProgramId, selectedProjectId, programs, projects, programsLoading, projectsLoading]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilter must be used within a FilterProvider');
  return context;
};
