// client/src/pages/PrioritiesPage.tsx

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Alert, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { usePriorities } from '../hooks/usePriorities';
import { useGlobalObjects } from '../api/hooks';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useFilter } from '../contexts/FilterContext';

const parseDateOnly = (v?: string) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const fmtDate = (v?: string) => {
  if (!v) return '—';
  // Handle full ISO strings like "2026-06-29T00:00:00.000Z"
  const clean = v.length > 10 ? v.substring(0, 10) : v;
  const [y, m, d] = clean.split('-');
  return `${m}/${d}/${y}`;
};

const daysOverdue = (endDate?: string) => {
  if (!endDate) return null;
  const end = parseDateOnly(endDate);
  if (!end) return null;
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t.getTime() - end.getTime()) / 86400000);
  return diff > 0 ? diff : null;
};

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', complete: 'Complete', blocked: 'Blocked',
};

const STATUS_COLOR: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.3)', in_progress: '#29b6f6', complete: '#66bb6a', blocked: '#ef5350',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef5350', high: '#ffa726', medium: '#29b6f6', low: '#78909c',
};

const Section: React.FC<{ title: string; count: number; accent: string; children: React.ReactNode }> = ({ title, count, accent, children }) => (
  <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
    <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <Box sx={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }} />
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
      <Box sx={{ px: 0.8, py: 0.1, borderRadius: 1, backgroundColor: `${accent}28`, color: accent, fontWeight: 700, fontSize: '0.75rem' }}>{count}</Box>
    </Box>
    {children}
  </Box>
);

const PrioritiesPage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProjectId } = useFilter();
  const projectId = routeProjectId || selectedProjectId || '';
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [processAreaFilter, setProcessAreaFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [defectSearch, setDefectSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [defectStatusFilter, setDefectStatusFilter] = useState('open');
  const [groupBy, setGroupBy] = useState<'none' | 'processArea' | 'object'>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: prioritized, isLoading } = usePriorities(projectId);

  const { data: globalObjects = [] } = useGlobalObjects();

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: async () => (await apiClient.get('/api/people')).data.data || [],
  });

  const { data: rawTasksRaw = [] } = useQuery({
    queryKey: ['priorities-fallback-tasks', projectId],
    queryFn: async () => (await apiClient.get(`/api/tasks/project/${projectId}`)).data.data || [],
    enabled: !!projectId,
  });
  // Deduplicate tasks by name+objectId (not DB id) — guards against duplicate seeding
  const rawTasks = useMemo(() => {
    const seen = new Set<string>();
    return (rawTasksRaw as any[]).filter(t => {
      const key = `${(t.name || t.taskName || '').toLowerCase()}:${t.projectObjectId || t.project_object_id || ''}:${t.taskType || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawTasksRaw]);

  const rawTaskMap = useMemo(() => new Map((rawTasks || []).map((t: any) => [t.id, t])), [rawTasks]);

  const taskIds = useMemo(() => (rawTasks || []).map((t: any) => t.taskId || t.id).filter(Boolean), [rawTasks]);

  const { data: defects = [] } = useQuery({
    queryKey: ['priorities-defects', projectId, taskIds],
    queryFn: async () => {
      const res = await Promise.all(taskIds.map((id: string) => apiClient.get(`/api/tasks/${id}/defects`).catch(() => ({ data: { data: [] } }))));
      return res.flatMap((r: any) => r?.data?.data || []);
    },
    enabled: !!projectId && taskIds.length > 0,
  });

  const peopleById = useMemo(() => Object.fromEntries((people || []).map((p: any) => [p.id, p])), [people]);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 6);

  const fallback = useMemo(() => ({
    late: rawTasks.filter((t: any) => { if (t.status === 'complete') return false; const e = parseDateOnly(t.endDate); return !!e && e < todayStart; }),
    due_this_week: rawTasks.filter((t: any) => { if (t.status === 'complete') return false; const e = parseDateOnly(t.endDate); return !!e && e >= todayStart && e <= weekEnd; }),
    blocked: rawTasks.filter((t: any) => t.status === 'blocked'),
  }), [rawTasks]);

  const objectsByIdMap = useMemo(() => new Map((globalObjects || []).map((o: any) => [o.objectId, o])), [globalObjects]);

  const merge = (arr: any[]) => arr.map((t: any) => {
    const id = t.taskId || t.id;
    const raw = rawTaskMap.get(id) || {};
    const objectId = t.objectId || t.projectObjectId || raw.objectId || raw.projectObjectId;
    const object = objectId ? objectsByIdMap.get(objectId) : null;
    // Priority: API processArea > object.processArea > raw.processArea
    const processArea = t.processArea || object?.processArea || raw.processArea;
    return { ...raw, ...t, taskId: id, taskName: t.taskName || raw.name, processArea };
  });

  const allPriorityTasks: any[] = useMemo(() => {
    const source = prioritized || fallback;
    const seen = new Set<string>();
    const result: any[] = [];
    const add = (arr: any[], cat: string) => merge(arr || []).forEach(t => {
      // Deduplicate by task name + object — prevents duplicate-seeded tasks from showing twice
      const key = `${(t.taskName || t.name || '').toLowerCase()}:${t.projectObjectId || ''}:${t.taskType || ''}`;
      if (!seen.has(key)) { seen.add(key); result.push({ ...t, _category: cat }); }
    });
    add((source as any).late || [], 'overdue');
    add((source as any).due_this_week || [], 'due_this_week');
    add((source as any).blocked || [], 'blocked');
    return result;
  }, [prioritized, rawTaskMap, rawTasks, fallback, objectsByIdMap]);

  const processAreas = useMemo(() => {
    const areas = [...new Set(allPriorityTasks.map(t => (t.processArea || '').trim()).filter(Boolean))].sort();
    return areas;
  }, [allPriorityTasks]);

  const filteredTasks = useMemo(() => allPriorityTasks.filter(t => {
    if (categoryFilter !== 'all' && t._category !== categoryFilter) return false;
    if (processAreaFilter !== 'all' && (t.processArea || '').trim().toLowerCase() !== processAreaFilter) return false;
    if (assignedFilter !== 'all' && t.draUserId !== assignedFilter && t.developerUserId !== assignedFilter) return false;
    if (taskSearch) { const s = taskSearch.toLowerCase(); if (!(t.taskName || t.name || '').toLowerCase().includes(s) && !(t.objectId || '').toLowerCase().includes(s)) return false; }
    return true;
  }), [allPriorityTasks, categoryFilter, processAreaFilter, assignedFilter, taskSearch]);

  const toggleGroupExpanded = (groupKey: string) => {
    const updated = new Set(expandedGroups);
    if (updated.has(groupKey)) {
      updated.delete(groupKey);
    } else {
      updated.add(groupKey);
    }
    setExpandedGroups(updated);
  };

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;
    
    const groups: Record<string, any[]> = {};
    filteredTasks.forEach(task => {
      let key = '';
      if (groupBy === 'processArea') {
        key = task.processArea?.trim() || 'Unassigned';
      } else if (groupBy === 'object') {
        key = task.objectId || 'Unassigned Object';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [filteredTasks, groupBy, objectsByIdMap]);

  const filteredDefects = useMemo(() => defects.filter((def: any) => {
    if (defectStatusFilter !== 'all' && (def.status || 'open') !== defectStatusFilter) return false;
    if (severityFilter !== 'all' && (def.severity || 'low') !== severityFilter) return false;
    if (defectSearch) { const s = defectSearch.toLowerCase(); if (!(def.title || '').toLowerCase().includes(s) && !(def.issueCode || '').toLowerCase().includes(s)) return false; }
    return true;
  }), [defects, defectStatusFilter, severityFilter, defectSearch, objectsByIdMap]);

  const th = { py: 0.8, px: 1.5, fontSize: '0.68rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(0,0,0,0.18)', textTransform: 'uppercase' as const, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)' };
  const td = { py: 0.75, px: 1.5, fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)' };
  const fsx = { minWidth: 130, '& .MuiInputBase-root': { fontSize: '0.78rem', height: 32 }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } };

  if (!projectId) {
    return (
      <Box sx={{ p: 3 }}><Alert severity="info">Select a project using the global filter to view priorities.</Alert></Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Priorities</Typography>

        {isLoading && !rawTasks.length && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        )}

        {/* Section 1: Priority Tasks */}
        <Section title="Tasks Requiring Attention" count={filteredTasks.length} accent="#ffa726">
          <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <TextField size="small" placeholder="Search tasks…" value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
              sx={{ width: 220, ...fsx }}
              slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }} />
            <TextField select size="small" label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} sx={fsx}>
              <MenuItem value="all">All Categories</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="due_this_week">Due This Week</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
            </TextField>
            {processAreas.length > 0 && (
              <TextField select size="small" label="Process Area" value={processAreaFilter} onChange={e => setProcessAreaFilter(e.target.value)} sx={fsx}>
                <MenuItem value="all">All Areas</MenuItem>
                {processAreas.map((a: string) => <MenuItem key={a} value={a.toLowerCase()}>{a}</MenuItem>)}
              </TextField>
            )}
            <TextField select size="small" label="Assigned To" value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} sx={fsx}>
              <MenuItem value="all">All Assignees</MenuItem>
              {(people as any[]).map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name || p.email}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Group By" value={groupBy} onChange={e => setGroupBy(e.target.value as any)} sx={fsx}>
              <MenuItem value="none">No Grouping</MenuItem>
              <MenuItem value="processArea">Process Area</MenuItem>
              <MenuItem value="object">Object</MenuItem>
            </TextField>
          </Box>
          {filteredTasks.length === 0 ? (
            <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">{allPriorityTasks.length === 0 ? 'No overdue, due-this-week, or blocked tasks.' : 'No tasks match the current filters.'}</Typography></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={th}>Object</TableCell>
                    <TableCell sx={th}>Task</TableCell>
                    <TableCell sx={th}>Category</TableCell>
                    <TableCell sx={th}>Status</TableCell>
                    <TableCell sx={th}>Process Area</TableCell>
                    <TableCell sx={th}>Assigned To</TableCell>
                    <TableCell sx={th}>Due Date</TableCell>
                    <TableCell sx={th}>Days Over</TableCell>
                    <TableCell sx={{ ...th, width: 48, p: 0 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupBy === 'none' ? (
                    // Ungrouped rendering
                    filteredTasks.map((task: any, i: number) => {
                      const over = daysOverdue(task.endDate);
                      const assignee = peopleById[task.draUserId || task.developerUserId] || null;
                      const catColor = task._category === 'overdue' ? '#ef5350' : task._category === 'blocked' ? '#ab47bc' : '#ffa726';
                      const catLabel = task._category === 'overdue' ? 'Overdue' : task._category === 'due_this_week' ? 'Due This Week' : 'Blocked';
                      const objectId = task.objectId || task.projectObjectId;
                      const objectData = objectId ? objectsByIdMap.get(objectId) : null;
                      if (objectId && !objectData) {
                        console.log(`ObjectId ${objectId} not found in map. Map has ${objectsByIdMap.size} entries.`);
                      }
                      return (
                        <TableRow key={`${task.taskId || task.id}-${i}`} hover onClick={() => setSelectedTask(task)}
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' } }}>
                          <TableCell sx={td}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{objectId || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{objectData?.description || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={td}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{task.taskName || task.name || 'Untitled'}</Typography>
                          </TableCell>
                          <TableCell sx={td}>
                            <Chip size="small" label={catLabel} sx={{ fontSize: '0.68rem', height: 20, backgroundColor: `${catColor}20`, color: catColor }} />
                          </TableCell>
                          <TableCell sx={td}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLOR[task.status] || 'rgba(255,255,255,0.3)' }} />
                              <Typography sx={{ fontSize: '0.78rem' }}>{STATUS_LABEL[task.status] || task.status}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{task.processArea || '—'}</Typography></TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem' }}>{assignee ? (assignee.name || assignee.email) : (task.assignedTo || '—')}</Typography></TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: over ? '#ef5350' : 'text.secondary', fontWeight: over ? 600 : 400 }}>{fmtDate(task.endDate)}</Typography></TableCell>
                          <TableCell sx={td}>{over ? <Typography sx={{ fontSize: '0.78rem', color: '#ef5350', fontWeight: 700 }}>{over}d</Typography> : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>}</TableCell>
                          <TableCell sx={{ ...td, px: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                              <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    // Grouped rendering
                    Object.entries(groupedTasks || {}).map(([groupKey, tasks]: [string, any[]]) => {
                      const isExpanded = expandedGroups.has(groupKey);
                      return (
                        <React.Fragment key={groupKey}>
                          <TableRow
                            hover
                            onClick={() => toggleGroupExpanded(groupKey)}
                            sx={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.05)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
                          >
                            <TableCell colSpan={9} sx={{ ...td, py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isExpanded ? <ExpandLessIcon sx={{ fontSize: '1.1rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '1.1rem' }} />}
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{groupKey}</Typography>
                                <Box sx={{ px: 0.6, py: 0.2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}>{tasks.length}</Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                          {isExpanded && tasks.map((task: any, i: number) => {
                            const over = daysOverdue(task.endDate);
                            const assignee = peopleById[task.draUserId || task.developerUserId] || null;
                            const catColor = task._category === 'overdue' ? '#ef5350' : task._category === 'blocked' ? '#ab47bc' : '#ffa726';
                            const catLabel = task._category === 'overdue' ? 'Overdue' : task._category === 'due_this_week' ? 'Due This Week' : 'Blocked';
                            const objectId = task.objectId || task.projectObjectId;
                            const objectData = objectId ? objectsByIdMap.get(objectId) : null;
                            return (
                              <TableRow key={`${task.taskId || task.id}-${i}`} hover onClick={() => setSelectedTask(task)}
                                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' }, backgroundColor: 'rgba(255,255,255,0.01)' }}>
                                <TableCell sx={td}>
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{objectId || '—'}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{objectData?.description || '—'}</Typography>
                                </TableCell>
                                <TableCell sx={{ ...td, pl: 4 }}>
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{task.taskName || task.name || 'Untitled'}</Typography>
                                </TableCell>
                                <TableCell sx={td}>
                                  <Chip size="small" label={catLabel} sx={{ fontSize: '0.68rem', height: 20, backgroundColor: `${catColor}20`, color: catColor }} />
                                </TableCell>
                                <TableCell sx={td}>
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLOR[task.status] || 'rgba(255,255,255,0.3)' }} />
                                    <Typography sx={{ fontSize: '0.78rem' }}>{STATUS_LABEL[task.status] || task.status}</Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{task.processArea || '—'}</Typography></TableCell>
                                <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem' }}>{assignee ? (assignee.name || assignee.email) : (task.assignedTo || '—')}</Typography></TableCell>
                                <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: over ? '#ef5350' : 'text.secondary', fontWeight: over ? 600 : 400 }}>{fmtDate(task.endDate)}</Typography></TableCell>
                                <TableCell sx={td}>{over ? <Typography sx={{ fontSize: '0.78rem', color: '#ef5350', fontWeight: 700 }}>{over}d</Typography> : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>}</TableCell>
                                <TableCell sx={{ ...td, px: 0.5 }}>
                                  <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                    <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Section>

        {/* Section 2: Open Defects */}
        <Section title="Open Defects" count={filteredDefects.length} accent="#ef5350">
          <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <TextField size="small" placeholder="Search defects…" value={defectSearch} onChange={e => setDefectSearch(e.target.value)}
              sx={{ width: 220, ...fsx }}
              slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }} />
            <TextField select size="small" label="Severity" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} sx={fsx}>
              <MenuItem value="all">All Severities</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
            <TextField select size="small" label="Status" value={defectStatusFilter} onChange={e => setDefectStatusFilter(e.target.value)} sx={fsx}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Box>
          {filteredDefects.length === 0 ? (
            <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">{defects.length === 0 ? 'No defects found for this project.' : 'No defects match the current filters.'}</Typography></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={th}>Title</TableCell>
                    <TableCell sx={th}>Severity</TableCell>
                    <TableCell sx={th}>Status</TableCell>
                    <TableCell sx={th}>Issue Code</TableCell>
                    <TableCell sx={th}>Type</TableCell>
                    <TableCell sx={th}>Reported</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDefects.map((defect: any) => {
                    const sevColor = SEVERITY_COLOR[defect.severity || 'low'] || '#78909c';
                    return (
                      <TableRow key={defect.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' } }}>
                        <TableCell sx={td}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{defect.title || 'Untitled Defect'}</Typography>
                          {defect.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{defect.description}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={td}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sevColor }} />
                            <Typography sx={{ fontSize: '0.78rem', color: sevColor, fontWeight: 600, textTransform: 'capitalize' }}>{defect.severity || 'low'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={td}>
                          <Chip size="small" label={(defect.status || 'open').replace(/_/g, ' ')}
                            sx={{ fontSize: '0.68rem', height: 20, textTransform: 'capitalize',
                              backgroundColor: (defect.status === 'resolved' || defect.status === 'closed') ? 'rgba(102,187,106,0.18)' : 'rgba(255,255,255,0.08)',
                              color: (defect.status === 'resolved' || defect.status === 'closed') ? '#66bb6a' : 'inherit',
                            }} />
                        </TableCell>
                        <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'text.secondary' }}>{defect.issueCode || '—'}</Typography></TableCell>
                        <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', textTransform: 'capitalize' }}>{(defect.defectType || defect.type || '—').replace(/_/g, ' ')}</Typography></TableCell>
                        <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.createdAt ? fmtDate(defect.createdAt.slice(0, 10)) : '—'}</Typography></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Section>
      </Box>

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskId={selectedTask?.taskId || selectedTask?.id}
        task={selectedTask}
        peopleById={peopleById}
        people={people}
        accentColor="#ffa726"
      />
    </>
  );
};

export default PrioritiesPage;
