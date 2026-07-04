// client/src/contexts/FilterContext.tsx
// Global persistent filter context for program/project selection.
// Persists selections in localStorage so users don't lose context on navigation.

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

const STORAGE_KEY = 'rf_global_filter';
const STORAGE_VERSION = 2;

interface FilterState {
  version?: number;
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
    if (parsed.version !== STORAGE_VERSION) {
      return { programId: null, projectId: null };
    }
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, programId: selectedProgramId, projectId: selectedProjectId })
    );
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

  // Validate saved programId still exists
  useEffect(() => {
    if (selectedProgramId && programs.length > 0) {
      const exists = programs.some((p: any) => p.id === selectedProgramId);
      if (!exists) setSelectedProgramIdState(null);
    }
  }, [programs, selectedProgramId]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-filter', selectedProgramId],
    queryFn: async () => {
      if (selectedProgramId) {
        const projectsResponse = await apiClient.get(`/api/projects/by-program/${selectedProgramId}`);
        const rawProjects = projectsResponse.data.data || [];
        const dedupedByName = new Map<string, any>();
        rawProjects.forEach((project: any) => {
          const key = String(project?.name || '').trim().toLowerCase();
          if (!key) return;
          if (!dedupedByName.has(key)) {
            dedupedByName.set(key, project);
          }
        });
        return Array.from(dedupedByName.values());
      }

      const allProgramsResponse = await apiClient.get('/api/programs');
      const allPrograms = allProgramsResponse.data.data || [];
      const projectGroups = await Promise.all(
        allPrograms.map(async (program: any) => {
          const projectsResponse = await apiClient.get(`/api/projects/by-program/${program.id}`);
          return (projectsResponse.data.data || []).map((project: any) => ({
            ...project,
            programName: program.name,
          }));
        })
      );

      const deduped = new Map<string, any>();
      projectGroups.flat().forEach((project: any) => {
        const programId = String(project?.programId || project?.program_id || '').trim();
        const projectName = String(project?.name || '').trim().toLowerCase();
        if (!programId || !projectName) return;
        const key = `${programId}:${projectName}`;
        if (!deduped.has(key)) deduped.set(key, project);
      });
      return Array.from(deduped.values());
    },
    enabled: programs.length > 0,
    staleTime: 30000,
  });

  // Validate saved projectId still exists in selected program's projects
  useEffect(() => {
    if (!selectedProjectId) return;
    const exists = projects.some((p: any) => p.id === selectedProjectId);
    if (!exists) setSelectedProjectIdState(null);
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
