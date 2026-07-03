// client/src/components/tasks/TaskDetailModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogActions, Box, Typography, IconButton, TextField, MenuItem,
  Chip, CircularProgress, Alert, LinearProgress, Divider, Avatar, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import DefectsSection from '../defects/DefectsSection';
import ValidationStatsSection from '../validation/ValidationStatsSection';
import IssueTypesSection from '../validation/IssueTypesSection';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v?: string) => {
  if (!v) return '—';
  // Handle ISO strings like "2026-06-29T00:00:00.000Z"
  const clean = v.length > 10 ? v.substring(0, 10) : v;
  const [y, m, d] = clean.split('-');
  return `${m}/${d}/${y}`;
};

const toInputDate = (v?: string) => {
  if (!v) return '';
  return v.length >= 10 ? v.substring(0, 10) : v;
};

const daysOverdue = (endDate?: string) => {
  if (!endDate) return null;
  const clean = endDate.length > 10 ? endDate.substring(0, 10) : endDate;
  const end = new Date(clean + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - end.getTime()) / 86400000);
  return diff > 0 ? diff : null;
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.25)', in_progress: '#29b6f6', complete: '#66bb6a', blocked: '#ef5350',
};

const toRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const isHexColor = (value?: string | null) => typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());

// ── types ─────────────────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  taskId?: string;
  task?: any;
  peopleById?: Record<string, any>;
  people?: any[];
  accentColor?: string;
  onSaved?: (updatedTask: any) => void;
}

// ── comment thread (inline) ───────────────────────────────────────────────────

const InlineDiscussion: React.FC<{ taskId: string; accent: string; people: any[] }> = ({ taskId, accent, people }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionCandidates, setMentionCandidates] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    apiClient.get(`/api/comments/task/${taskId}`)
      .then(r => setComments(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    apiClient.get('/api/comments/mention-candidates')
      .then(r => setMentionCandidates(r.data.data || []))
      .catch(() => setMentionCandidates((people || []).map(p => ({ id: p.id, handle: (p.name || '').replace(/\s+/g, '.').toLowerCase(), email: '' }))));
  }, [taskId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && val.slice(lastAt).match(/^@[a-zA-Z0-9._-]*$/)) {
      setMentionFilter(val.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (handle: string) => {
    const lastAt = content.lastIndexOf('@');
    setContent(content.slice(0, lastAt) + `@${handle} `);
    setShowMentions(false);
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      const res = await apiClient.post(`/api/comments/task/${taskId}`, { content: content.trim() });
      setComments(prev => [...prev, res.data.data]);
      setContent('');
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/api/comments/${id}`);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const renderText = (text: string) => text.split(/(@[a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)*)/g).map((part, i) =>
    part.startsWith('@') ? <Box key={i} component="span" sx={{ color: accent, fontWeight: 600 }}>{part}</Box> : part
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 3, height: 14, borderRadius: 1, backgroundColor: accent, mr: 0.5 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Discussion</Typography>
        {comments.length > 0 && <Box sx={{ px: 0.6, py: 0.05, borderRadius: 1, backgroundColor: toRgba(accent, 0.2), color: accent, fontWeight: 700, fontSize: '0.68rem' }}>{comments.length}</Box>}
      </Box>

      {/* Comment list */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size={16} /></Box>}
        {!loading && comments.length === 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', py: 2, display: 'block' }}>No comments yet. Start the discussion!</Typography>
        )}
        {comments.map(c => (
          <Box key={c.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', backgroundColor: toRgba(accent, 0.3), color: accent, flexShrink: 0 }}>
              {(c.authorName || c.authorEmail || '?')[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline', mb: 0.15 }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: accent }}>{c.authorName || c.authorEmail}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.63rem' }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.45, wordBreak: 'break-word' }}>{renderText(c.content)}</Typography>
            </Box>
            {user?.email === c.authorEmail && (
              <IconButton size="small" onClick={() => handleDelete(c.id)} sx={{ p: 0.2, opacity: 0.5, '&:hover': { opacity: 1, color: '#ef5350' } }}>
                <DeleteIcon sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            )}
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Mention dropdown */}
      {showMentions && (
        <Box sx={{ mx: 1, mb: 0.5, border: `1px solid ${toRgba(accent, 0.4)}`, borderRadius: 1, backgroundColor: 'rgba(10,20,45,0.98)', maxHeight: 120, overflowY: 'auto' }}>
          {mentionCandidates.filter(c => !mentionFilter || c.handle?.toLowerCase().includes(mentionFilter.toLowerCase())).slice(0, 6).map(c => (
            <Box key={c.id} onClick={() => insertMention(c.handle)} sx={{ px: 1, py: 0.5, cursor: 'pointer', fontSize: '0.78rem', '&:hover': { backgroundColor: toRgba(accent, 0.12) } }}>
              @{c.handle}
            </Box>
          ))}
        </Box>
      )}

      {/* Input */}
      <Box sx={{ p: 1, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 0.75, alignItems: 'flex-end' }}>
        <TextField
          multiline maxRows={3} fullWidth size="small" placeholder="Add a comment…"
          value={content} onChange={handleInput}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !showMentions) { e.preventDefault(); handleSend(); } }}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.78rem', borderRadius: 1.5 },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accent } }}
        />
        <IconButton size="small" onClick={handleSend} disabled={!content.trim()}
          sx={{ backgroundColor: toRgba(accent, 0.18), color: accent, borderRadius: 1.5, p: 0.75, '&:hover': { backgroundColor: toRgba(accent, 0.3) }, '&:disabled': { opacity: 0.4 } }}>
          <SendIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

// ── main modal ────────────────────────────────────────────────────────────────

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  open, onClose, taskId, task, peopleById = {}, people = [], accentColor = '#29b6f6', onSaved,
}) => {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [globalProcessAreaAccents, setGlobalProcessAreaAccents] = useState<Record<string, string>>({});
  const [depPickerOpen, setDepPickerOpen] = useState(false);
  const [depSearchTerm, setDepSearchTerm] = useState('');
  const [depTreeExpanded, setDepTreeExpanded] = useState<Record<string, boolean>>({});
  const [dependencySaving, setDependencySaving] = useState(false);

  const { data: fetched, isLoading } = useQuery({
    queryKey: ['task-details-modal', taskId],
    queryFn: async () => (await apiClient.get(`/api/tasks/${taskId}`)).data.data,
    enabled: open && !!taskId,
  });

  const resolvedTask = fetched || task || null;
  const taskIdResolved = resolvedTask?.id || resolvedTask?.taskId || taskId || '';
  const taskType = (resolvedTask?.taskType || '').toLowerCase();
  const supportsValidation = taskType === 'preload_validation' || taskType === 'postload_validation';

  const { data: deps = [] } = useQuery({
    queryKey: ['task-deps-modal', taskIdResolved],
    queryFn: async () => (await apiClient.get(`/api/tasks/${taskIdResolved}/dependencies`)).data.data || [],
    enabled: open && !!taskIdResolved,
  });

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['task-project-tasks-modal', resolvedTask?.projectId],
    queryFn: async () => {
      if (!resolvedTask?.projectId) return [];
      return (await apiClient.get(`/api/tasks/project/${resolvedTask.projectId}`)).data.data || [];
    },
    enabled: open && !!resolvedTask?.projectId,
  });

  const { data: projectDetails = null } = useQuery({
    queryKey: ['task-project-details-modal', resolvedTask?.projectId],
    queryFn: async () => {
      if (!resolvedTask?.projectId) return null;
      return (await apiClient.get(`/api/projects/${resolvedTask.projectId}`)).data.data || null;
    },
    enabled: open && !!resolvedTask?.projectId,
  });

  const cycleIdResolved = resolvedTask?.mockCycleId || projectDetails?.mockCycleId || null;

  const { data: cycleDetails = null } = useQuery({
    queryKey: ['task-cycle-details-modal', cycleIdResolved],
    queryFn: async () => {
      if (!cycleIdResolved) return null;
      return (await apiClient.get(`/api/mock-cycles/${cycleIdResolved}`)).data.data || null;
    },
    enabled: open && !!cycleIdResolved,
  });

  const { data: cycleTasks = [] } = useQuery({
    queryKey: ['task-cycle-tasks-modal', cycleIdResolved],
    queryFn: async () => {
      if (!cycleIdResolved) return [];
      return (await apiClient.get(`/api/tasks/cycle/${cycleIdResolved}`)).data.data || [];
    },
    enabled: open && !!cycleIdResolved,
  });

  const { data: projectObjects = [] } = useQuery({
    queryKey: ['task-project-objects-modal', resolvedTask?.projectId],
    queryFn: async () => {
      if (!resolvedTask?.projectId) return [];
      return (await apiClient.get(`/api/project-objects/project/${resolvedTask.projectId}`)).data.data || [];
    },
    enabled: open && !!resolvedTask?.projectId,
  });

  const { data: cycleObjects = [] } = useQuery({
    queryKey: ['task-cycle-objects-modal', cycleIdResolved],
    queryFn: async () => {
      if (!cycleIdResolved) return [];
      return (await apiClient.get(`/api/project-objects/cycle/${cycleIdResolved}`)).data.data || [];
    },
    enabled: open && !!cycleIdResolved,
  });

  const { data: projectTaskGroups = [] } = useQuery({
    queryKey: ['task-project-task-groups-modal', resolvedTask?.projectId],
    queryFn: async () => {
      if (!resolvedTask?.projectId) return [];
      return (await apiClient.get(`/api/tasks/groups/project/${resolvedTask.projectId}`)).data.data || [];
    },
    enabled: open && !!resolvedTask?.projectId,
  });

  const { data: cycleTaskGroups = [] } = useQuery({
    queryKey: ['task-cycle-task-groups-modal', cycleIdResolved],
    queryFn: async () => {
      if (!cycleIdResolved) return [];
      return (await apiClient.get(`/api/tasks/groups/cycle/${cycleIdResolved}`)).data.data || [];
    },
    enabled: open && !!cycleIdResolved,
  });

  useEffect(() => {
    if (!open) return;
    apiClient.get('/api/hierarchy-preferences/state')
      .then((response) => {
        const state = response.data?.data || {};
        setGlobalProcessAreaAccents(state.globalProcessAreaAccents || {});
      })
      .catch(() => setGlobalProcessAreaAccents({}));
  }, [open]);

  // Reset edit data when task changes or modal opens
  useEffect(() => {
    if (open && resolvedTask) {
      setEditData({
        status: resolvedTask.status || 'not_started',
        revisedStartDate: toInputDate(resolvedTask.revisedStartDate),
        revisedEndDate: toInputDate(resolvedTask.revisedEndDate),
        actualStartDate: toInputDate(resolvedTask.actualStartDate),
        actualEndDate: toInputDate(resolvedTask.actualEndDate),
        assignedTo: resolvedTask.assignedTo || '',
        startDate: toInputDate(resolvedTask.startDate),
        endDate: toInputDate(resolvedTask.endDate),
        duration: resolvedTask.duration ?? '',
        notes: resolvedTask.notes || '',
        progressPercentage: resolvedTask.progressPercentage ?? 0,
      });
      setSaveError(null);
      setTab(0);
    }
  }, [open, taskIdResolved, resolvedTask?.status]);

  const set = (field: string, value: any) => setEditData((prev: any) => prev ? { ...prev, [field]: value } : null);

  const handleSave = async () => {
    if (!editData || !taskIdResolved) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        status: editData.status,
        startDate: editData.startDate || null,
        endDate: editData.endDate || null,
        revisedStartDate: editData.revisedStartDate || null,
        revisedEndDate: editData.revisedEndDate || null,
        actualStartDate: editData.actualStartDate || null,
        actualEndDate: editData.actualEndDate || null,
        assignedTo: editData.assignedTo || null,
        duration: editData.duration === '' ? null : Number(editData.duration),
        durationUnit: 'days',
        notes: editData.notes || null,
        progressPercentage: Number(editData.progressPercentage) || 0,
      };
      const res = await apiClient.patch(`/api/tasks/${taskIdResolved}`, payload);
      onSaved?.(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['task-details-modal', taskId] });
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Effective end date for overdue calc: actual → revised → plan
  const effectiveEnd = editData?.actualEndDate || editData?.revisedEndDate || resolvedTask?.endDate;
  const over = daysOverdue(effectiveEnd);
  const processAreaName = String(resolvedTask?.processArea || resolvedTask?.process_area || '').trim().toLowerCase();
  const processAreaAccent = Object.entries(globalProcessAreaAccents).find(([key]) => key.trim().toLowerCase() === processAreaName)?.[1];
  const accent = isHexColor(processAreaAccent)
    ? processAreaAccent!.trim()
    : (isHexColor(accentColor) ? accentColor : '#29b6f6');

  const fieldSx = {
    '& .MuiInputBase-root': { fontSize: '0.82rem' },
    '& .MuiInputLabel-root': { fontSize: '0.82rem' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '& .MuiInputLabel-root.Mui-focused': { color: accent },
  };

  const tabs = ['Details', ...(supportsValidation ? [taskType === 'preload_validation' ? 'Preload Quality' : 'Postload Quality'] : []), 'Defects'];
  const scheduleLocked = editData?.status === 'in_progress' || editData?.status === 'blocked' || editData?.status === 'complete';
  const hasDependencies = (deps as any[]).length > 0;
  const hasDuration = Number(editData?.duration || 0) > 0;
  const planDatesEditable = !scheduleLocked && !hasDependencies && !hasDuration;
  const taskUniverse = (cycleTasks as any[]).length > 0 ? (cycleTasks as any[]) : (projectTasks as any[]);
  const dependencyOptions = (() => {
    const byId = new Map<string, any>();
    taskUniverse
      .filter((t: any) => t.id !== taskIdResolved)
      .forEach((t: any) => {
        byId.set(t.id, t);
      });

    // Keep already-linked dependencies visible in the picker even if missing from project task payload.
    (deps as any[]).forEach((d: any) => {
      const depId = d.dependsOnTaskId;
      if (!depId || depId === taskIdResolved) return;
      if (!byId.has(depId)) {
        byId.set(depId, {
          id: depId,
          name: d.dependsOnName || d.taskName || d.name || 'Task',
          status: d.status || 'not_started',
          objectId: d.objectId || '',
          processArea: d.processArea || '',
          projectId: resolvedTask?.projectId || '',
          projectName: resolvedTask?.projectName || 'Project',
          projectObjectId: d.projectObjectId || null,
          taskGroupId: d.taskGroupId || null,
        });
      }
    });

    return Array.from(byId.values());
  })();

  const addDependency = async (dependsOnTaskId: string) => {
    if (!taskIdResolved || !dependsOnTaskId || scheduleLocked) return;
    try {
      setDependencySaving(true);
      await apiClient.post(`/api/tasks/${taskIdResolved}/dependencies`, { dependsOnTaskId });
      await queryClient.invalidateQueries({ queryKey: ['task-deps-modal', taskIdResolved] });
    } finally {
      setDependencySaving(false);
    }
  };

  const removeDependency = async (dependsOnTaskId: string) => {
    if (!taskIdResolved || scheduleLocked) return;
    try {
      setDependencySaving(true);
      await apiClient.delete(`/api/tasks/${taskIdResolved}/dependencies/${dependsOnTaskId}`);
      await queryClient.invalidateQueries({ queryKey: ['task-deps-modal', taskIdResolved] });
    } finally {
      setDependencySaving(false);
    }
  };

  const toggleDependency = async (dependsOnTaskId: string) => {
    if ((deps as any[]).some((d: any) => d.dependsOnTaskId === dependsOnTaskId)) {
      await removeDependency(dependsOnTaskId);
    } else {
      await addDependency(dependsOnTaskId);
    }
  };

  const personLabel = (id?: string) => {
    if (!id) return 'Unassigned';
    const p = peopleById[id];
    return p?.name || p?.email || id;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg"
      PaperProps={{ sx: { borderRadius: 2.5, border: `1px solid ${toRgba(accent, 0.3)}`, overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ backgroundColor: toRgba(accent, 0.1), borderBottom: `1px solid ${toRgba(accent, 0.2)}`, px: 3, py: 1.75, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexShrink: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
            <Box sx={{ width: 4, height: 20, borderRadius: 1, backgroundColor: accent, flexShrink: 0 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {resolvedTask?.taskName || resolvedTask?.name || 'Task Details'}
            </Typography>
            {resolvedTask?.taskType && (
              <Chip label={(resolvedTask.taskType).replace(/_/g, ' ')} size="small"
                sx={{ fontSize: '0.65rem', height: 18, backgroundColor: toRgba(accent, 0.18), color: accent, fontWeight: 700, textTransform: 'uppercase' }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pl: 0.75 }}>
            {[resolvedTask?.programName, resolvedTask?.mockCycleName, resolvedTask?.projectName, resolvedTask?.objectId].filter(Boolean).map((item, i, arr) => (
              <React.Fragment key={i}><span>{item}</span>{i < arr.length - 1 && <span style={{ opacity: 0.4 }}>·</span>}</React.Fragment>
            ))}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Box
            component="button" onClick={handleSave} disabled={saving || !editData}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, borderRadius: 1.5, border: 'none', cursor: 'pointer', backgroundColor: toRgba(accent, 0.25), color: accent, fontWeight: 700, fontSize: '0.8rem', '&:hover': { backgroundColor: toRgba(accent, 0.4) }, '&:disabled': { opacity: 0.5, cursor: 'not-allowed' } }}>
            <SaveIcon sx={{ fontSize: '1rem' }} />{saving ? 'Saving…' : 'Save Changes'}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ ml: 0.5 }}><CloseIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
        </Box>
      </Box>

      {saveError && <Alert severity="error" sx={{ mx: 2, mt: 1, flexShrink: 0 }}>{saveError}</Alert>}

      {/* Body */}
      <DialogContent sx={{ p: 0, display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {(isLoading && !resolvedTask) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><CircularProgress /></Box>
        ) : !editData ? null : (
          <>
            {/* Left: Editable form */}
            <Box sx={{ flex: '1 1 60%', overflowY: 'auto', p: 2.5, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Tabs */}
              <Box sx={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', mb: 2 }}>
                {tabs.map((label, i) => (
                  <Box key={label} onClick={() => setTab(i)} sx={{
                    px: 1.5, py: 0.7, cursor: 'pointer', fontSize: '0.8rem', fontWeight: tab === i ? 700 : 400,
                    color: tab === i ? accent : 'text.secondary',
                    borderBottom: tab === i ? `2px solid ${accent}` : '2px solid transparent',
                    mb: '-1px', transition: 'all 0.15s',
                    '&:hover': { color: accent },
                  }}>{label}</Box>
                ))}
              </Box>

              {/* Tab 0: Details */}
              {tab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Status + Progress row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField select size="small" label="Status" value={editData.status}
                      onChange={e => { set('status', e.target.value); if (e.target.value === 'complete') set('progressPercentage', 100); else if (e.target.value !== 'in_progress') set('progressPercentage', 0); }}
                      sx={fieldSx}>
                      <MenuItem value="not_started">Not Started</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="blocked">Blocked</MenuItem>
                      <MenuItem value="complete">Complete</MenuItem>
                    </TextField>
                    <Box>
                      <TextField size="small" label="Progress %" type="number" value={editData.progressPercentage}
                        disabled={editData.status !== 'in_progress'}
                        onChange={e => set('progressPercentage', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        slotProps={{ htmlInput: { min: 0, max: 100 } }}
                        sx={{ ...fieldSx, width: '100%' }} />
                      <LinearProgress variant="determinate" value={Number(editData.progressPercentage) || 0}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { backgroundColor: STATUS_COLORS[editData.status] || accent } }} />
                    </Box>
                  </Box>

                  {/* Assigned To */}
                  <TextField select size="small" label="Assigned To" value={editData.assignedTo || ''} onChange={e => set('assignedTo', e.target.value)} sx={fieldSx} fullWidth>
                    <MenuItem value=""><em>Unassigned</em></MenuItem>
                    {people.map((p: any) => <MenuItem key={p.id} value={p.name || p.email}>{p.name || p.email}</MenuItem>)}
                  </TextField>

                  {/* Duration */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                    <TextField
                      size="small"
                      label="Duration"
                      type="number"
                      value={editData.duration}
                      onChange={e => set('duration', e.target.value)}
                      disabled={scheduleLocked}
                      slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                      sx={fieldSx}
                    />
                  </Box>

                  {/* ── Date sections ── */}

                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '0.63rem', display: 'block', mb: 0.75 }}>
                      Plan Dates
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <TextField
                        size="small"
                        label="Plan Start"
                        type="date"
                        value={editData.startDate || ''}
                        onChange={e => set('startDate', e.target.value)}
                        disabled={!planDatesEditable}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          ...fieldSx,
                          ...(planDatesEditable ? {} : {
                            '& .MuiInputBase-root': {
                              backgroundColor: 'rgba(255,255,255,0.04)',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderStyle: 'dashed',
                              borderColor: 'rgba(255,255,255,0.28)',
                            },
                          }),
                        }}
                      />
                      <TextField
                        size="small"
                        label="Plan End"
                        type="date"
                        value={editData.endDate || ''}
                        onChange={e => set('endDate', e.target.value)}
                        disabled={!planDatesEditable}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          ...fieldSx,
                          ...(planDatesEditable ? {} : {
                            '& .MuiInputBase-root': {
                              backgroundColor: 'rgba(255,255,255,0.04)',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderStyle: 'dashed',
                              borderColor: 'rgba(255,255,255,0.28)',
                            },
                          }),
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Revised dates */}
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '0.63rem', display: 'block', mb: 0.75 }}>
                      Revised Dates
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <TextField size="small" label="Revised Start" type="date" value={editData.revisedStartDate || ''}
                        onChange={e => set('revisedStartDate', e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={fieldSx} />
                      <TextField size="small" label="Revised End" type="date" value={editData.revisedEndDate || ''}
                        onChange={e => set('revisedEndDate', e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={fieldSx} />
                    </Box>
                  </Box>

                  {over && over > 0 && (
                    <Typography variant="caption" sx={{ color: '#ef5350', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.3, mt: -0.5 }}>
                      ⚠ {over} day{over !== 1 ? 's' : ''} overdue
                    </Typography>
                  )}

                  {/* Recalculate downstream */}
                  {(editData.revisedStartDate || editData.revisedEndDate) && (
                    <Box sx={{ pt: 0.5 }}>
                      <Box
                        component="button"
                        onClick={async () => {
                          if (!taskIdResolved) return;
                          // Update the task's plan start/end from its revised dates so the cascade
                          // uses the revised schedule as the new baseline.
                          const newStart = editData.revisedStartDate || resolvedTask?.startDate;
                          const newEnd = editData.revisedEndDate || resolvedTask?.endDate;
                          try {
                            await apiClient.patch(`/api/tasks/${taskIdResolved}`, {
                              startDate: newStart,
                              endDate: newEnd,
                              revisedStartDate: editData.revisedStartDate || null,
                              revisedEndDate: editData.revisedEndDate || null,
                              actualStartDate: editData.actualStartDate || null,
                              actualEndDate: editData.actualEndDate || null,
                              assignedTo: editData.assignedTo || null,
                              notes: editData.notes || null,
                              progressPercentage: Number(editData.progressPercentage) || 0,
                              status: editData.status,
                            });
                            onSaved?.({ id: taskIdResolved, startDate: newStart, endDate: newEnd });
                            queryClient.invalidateQueries({ queryKey: ['task-details-modal', taskId] });
                          } catch { /* ignore */ }
                        }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.65, borderRadius: 1.5, border: `1px solid ${toRgba(accent, 0.4)}`, cursor: 'pointer', backgroundColor: toRgba(accent, 0.08), color: accent, fontWeight: 600, fontSize: '0.78rem', '&:hover': { backgroundColor: toRgba(accent, 0.18) } }}>
                        ↻ Apply Revised Dates &amp; Recalculate Downstream
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.68rem' }}>
                        Updates this task's plan dates to the revised dates and re-cascades dependent tasks.
                      </Typography>
                    </Box>
                  )}

                  {/* Notes */}
                  <TextField size="small" label="Notes / Description" multiline rows={4} value={editData.notes || ''}
                    onChange={e => set('notes', e.target.value)} sx={fieldSx} fullWidth />

                  {/* Dependencies */}
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.75 }}>
                      Dependencies ({deps.length})
                    </Typography>
                    {!scheduleLocked ? (
                      <Box sx={{ mb: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setDepPickerOpen(true)}
                          sx={{ textTransform: 'none', borderColor: toRgba(accent, 0.35), color: accent }}
                        >
                          Manage Dependencies
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8 }}>
                        Dependencies are locked once work is in progress.
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {(deps as any[]).map((dep: any) => (
                        <Box key={dep.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.6, borderRadius: 1, backgroundColor: toRgba(accent, 0.08), border: `1px solid ${toRgba(accent, 0.18)}` }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLORS[(dep.status || 'not_started')] || accent, flexShrink: 0 }} />
                          <Typography sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
                            {[dep.objectId, dep.dependsOnName || dep.taskName || dep.name].filter(Boolean).join(' - ') || 'Task'}
                          </Typography>
                          {dep.endDate && <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Due {fmtDate(dep.endDate)}</Typography>}
                          {!scheduleLocked ? (
                            <IconButton size="small" onClick={() => removeDependency(dep.dependsOnTaskId)} sx={{ ml: 0.5, opacity: 0.65, '&:hover': { opacity: 1, color: '#ef5350' } }}>
                              <DeleteIcon sx={{ fontSize: '0.92rem' }} />
                            </IconButton>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Validation tab */}
              {supportsValidation && tab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="info" sx={{ fontSize: '0.8rem' }}>Capture load validation metrics here.</Alert>
                  <ValidationStatsSection taskId={taskIdResolved} />
                  <IssueTypesSection taskId={taskIdResolved} />
                </Box>
              )}

              {/* Defects tab */}
              {((supportsValidation && tab === 2) || (!supportsValidation && tab === 1)) && (
                <DefectsSection taskId={taskIdResolved} accentColor={accent} />
              )}
            </Box>

            {/* Right: Discussion */}
            <Box sx={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <InlineDiscussion taskId={taskIdResolved} accent={accent} people={people} />
            </Box>
          </>
        )}
      </DialogContent>

      <Dialog open={depPickerOpen} onClose={() => setDepPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Task Dependencies</DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
            Select tasks that must complete before this task can start.
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search tasks..."
            value={depSearchTerm}
            onChange={(e) => setDepSearchTerm(e.target.value)}
            sx={{ mb: 1.2 }}
          />
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {(() => {
              const formatObjectLabel = (obj?: any, fallbackObjectId?: string) => {
                const objectId = String(obj?.objectId || fallbackObjectId || '').trim();
                const description = String(obj?.description || obj?.subObjectDescription || '').trim();
                if (objectId && description) return `${objectId} - ${description}`;
                if (objectId) return objectId;
                if (description) return description;
                return 'Object';
              };

              const allTaskGroups = (cycleTaskGroups as any[]).length > 0 ? (cycleTaskGroups as any[]) : (projectTaskGroups as any[]);
              const groupById = new Map<string, any>(allTaskGroups.map((g: any) => [g.id, g]));
              const allObjects = (() => {
                const out = new Map<string, any>();
                [...(projectObjects as any[]), ...(cycleObjects as any[])].forEach((obj: any) => {
                  if (!obj?.id) return;
                  out.set(obj.id, obj);
                });
                return Array.from(out.values());
              })();
              const cycleDisplay = String(cycleDetails?.description || cycleDetails?.name || resolvedTask?.mockCycleDescription || resolvedTask?.mockCycleName || 'Current Cycle').trim();
              const currentProjectDisplay = String(projectDetails?.description || projectDetails?.name || resolvedTask?.projectDescription || resolvedTask?.projectName || 'Project').trim();

              const filtered = dependencyOptions.filter((t: any) => {
                if (!depSearchTerm.trim()) return true;
                const q = depSearchTerm.trim().toLowerCase();
                const obj = t.projectObjectId ? allObjects.find((po: any) => po.id === t.projectObjectId) : null;
                const objectLabel = formatObjectLabel(obj, t.objectId).toLowerCase();
                const groupLabel = String(groupById.get(t.taskGroupId || '')?.name || t.groupLabel || '').toLowerCase();
                return (
                  String(t.name || '').toLowerCase().includes(q)
                  || String(t.objectId || '').toLowerCase().includes(q)
                  || String(t.processArea || '').toLowerCase().includes(q)
                  || objectLabel.includes(q)
                  || groupLabel.includes(q)
                );
              });

              const searching = depSearchTerm.trim().length > 0;
              const depIds = new Set((deps as any[]).map((d: any) => d.dependsOnTaskId));
                const objectById = new Map<string, any>(allObjects.map((po: any) => [po.id, po]));
              const forcedExpanded = new Set<string>();

              type TreeNode = {
                key: string;
                label: string;
                type: 'object' | 'taskGroup' | 'other';
                tasks: any[];
                children: string[];
                parentNodeKey: string | null;
              };

              const projectMap: Record<string, {
                name: string;
                color: string;
                areas: Record<string, { nodes: Record<string, TreeNode> }>;
              }> = {};

              const ensureProject = (projectId: string, projectName: string, color: string) => {
                if (!projectMap[projectId]) {
                  projectMap[projectId] = { name: projectName || 'Project', color: color || accent, areas: {} };
                }
                return projectMap[projectId];
                };

              const ensureArea = (projectEntry: { areas: Record<string, { nodes: Record<string, TreeNode> }> }, areaName: string) => {
                if (!projectEntry.areas[areaName]) {
                  projectEntry.areas[areaName] = { nodes: {} };
                }
                return projectEntry.areas[areaName];
              };

              const ensureObjectNode = (
                nodes: Record<string, TreeNode>,
                objectId: string,
                fallbackObjectId?: string,
              ): string => {
                const obj = objectById.get(objectId);
                const fallbackKey = String(fallbackObjectId || '').trim().toLowerCase().replace(/\s+/g, '_');
                const nodeKey = obj ? `obj-${objectId}` : (fallbackKey ? `obj-fallback-${fallbackKey}` : `obj-${objectId}`);
                const label = formatObjectLabel(obj, fallbackObjectId);
                const parentId = obj?.parentProjectObjectId || null;
                const parentNodeKey = parentId ? ensureObjectNode(nodes, parentId) : null;

                if (!nodes[nodeKey]) {
                  nodes[nodeKey] = {
                    key: nodeKey,
                    label,
                    type: 'object',
                    tasks: [],
                    children: [],
                    parentNodeKey,
                  };
                }

                if (parentNodeKey && nodes[parentNodeKey] && !nodes[parentNodeKey].children.includes(nodeKey)) {
                  nodes[parentNodeKey].children.push(nodeKey);
                }

                return nodeKey;
              };

              filtered.forEach((t: any) => {
                const projectId = t.projectId || resolvedTask?.projectId || 'project';
                const projectName = (projectId === resolvedTask?.projectId)
                  ? (currentProjectDisplay || t.projectName || 'Project')
                  : (t.projectName || 'Project');
                const projectColor = t.projectAccentColor || accent;
                const projectEntry = ensureProject(projectId, projectName, projectColor);

                const object = t.projectObjectId ? objectById.get(t.projectObjectId) : null;
                const areaName = (object?.processArea || t.processArea || 'Unassigned').trim() || 'Unassigned';
                const areaEntry = ensureArea(projectEntry, areaName);
                const { nodes } = areaEntry;

                let nodeKey = '';
                if (t.projectObjectId) {
                  nodeKey = ensureObjectNode(nodes, t.projectObjectId, t.objectId);
                  nodes[nodeKey].tasks.push(t);
                } else if (t.taskGroupId) {
                  nodeKey = `grp-${t.taskGroupId}`;
                  if (!nodes[nodeKey]) {
                    const groupName = String(groupById.get(t.taskGroupId)?.name || t.groupLabel || '').trim();
                    nodes[nodeKey] = {
                      key: nodeKey,
                      label: groupName || 'Task Group',
                      type: 'taskGroup',
                      tasks: [],
                      children: [],
                      parentNodeKey: null,
                    };
                  }
                  nodes[nodeKey].tasks.push(t);
                } else {
                  nodeKey = 'ungrouped';
                  if (!nodes[nodeKey]) {
                    nodes[nodeKey] = {
                      key: nodeKey,
                      label: 'Other Tasks',
                      type: 'other',
                      tasks: [],
                      children: [],
                      parentNodeKey: null,
                    };
                  }
                  nodes[nodeKey].tasks.push(t);
                }

                if (searching || depIds.has(t.id)) {
                  const projKey = `proj:${projectId}`;
                  const areaKey = `${projKey}:area:${areaName}`;
                  forcedExpanded.add(projKey);
                  forcedExpanded.add(areaKey);

                  let currentNodeKey: string | null = nodeKey;
                  while (currentNodeKey) {
                    forcedExpanded.add(`${areaKey}:${currentNodeKey}`);
                    currentNodeKey = nodes[currentNodeKey]?.parentNodeKey || null;
                  }
                }
              });

              return (
                <Box>
                  <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <SyncIcon sx={{ fontSize: '0.8rem', color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {cycleDisplay}
                    </Typography>
                  </Box>

                  {Object.entries(projectMap).map(([projectId, projectEntry]) => {
                    const projKey = `proj:${projectId}`;
                    const projManual = depTreeExpanded[projKey];
                    const projOpen = searching
                      ? (forcedExpanded.has(projKey) || projManual === true)
                      : (projManual ?? forcedExpanded.has(projKey));
                    return (
                      <Box key={projKey} sx={{ mb: 0.3 }}>
                        <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [projKey]: !projOpen }))}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.45, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <ChevronRightIcon sx={{ fontSize: '0.85rem', color: 'text.secondary', transform: projOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: projectEntry.color || accent, flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: projectEntry.color || accent, fontSize: '0.95rem' }}>{projectEntry.name}</Typography>
                        </Box>

                        {projOpen && Object.entries(projectEntry.areas).map(([areaName, areaEntry]) => {
                          const areaKey = `${projKey}:area:${areaName}`;
                          const areaManual = depTreeExpanded[areaKey];
                          const areaOpen = searching
                            ? (forcedExpanded.has(areaKey) || areaManual === true)
                            : (areaManual ?? forcedExpanded.has(areaKey));
                          return (
                            <Box key={areaKey} sx={{ ml: 2.5, mb: 0.2 }}>
                              <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [areaKey]: !areaOpen }))}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.35, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <ChevronRightIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', transform: areaOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>{areaName}</Typography>
                              </Box>

                              {areaOpen && (() => {
                                const renderNode = (nodeKey: string, depth: number): React.ReactNode => {
                                  const nodeData = areaEntry.nodes[nodeKey];
                                  if (!nodeData) return null;

                                  const nodeExpKey = `${areaKey}:${nodeKey}`;
                                  const nodeManual = depTreeExpanded[nodeExpKey];
                                  const nodeOpen = searching
                                    ? (forcedExpanded.has(nodeExpKey) || nodeManual === true)
                                    : (nodeManual ?? forcedExpanded.has(nodeExpKey));

                                  return (
                                    <Box key={nodeKey} sx={{ ml: depth * 2.2, mb: 0.2 }}>
                                      <Box
                                        onClick={() => setDepTreeExpanded(prev => ({ ...prev, [nodeExpKey]: !nodeOpen }))}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.35, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}
                                      >
                                        <ChevronRightIcon sx={{ fontSize: '0.72rem', color: 'text.disabled', transform: nodeOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.72rem' }}>{nodeData.label}</Typography>
                                      </Box>

                                      {nodeOpen && nodeData.tasks.map((t: any) => {
                                        const isDep = depIds.has(t.id);
                                        return (
                                          <Box
                                            key={t.id}
                                            onClick={() => toggleDependency(t.id)}
                                            sx={{
                                              ml: 2.2,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 1.1,
                                              py: 0.45,
                                              px: 0.75,
                                              borderRadius: 1,
                                              cursor: 'pointer',
                                              backgroundColor: isDep ? toRgba(accent, 0.2) : 'transparent',
                                              '&:hover': { backgroundColor: isDep ? toRgba(accent, 0.24) : 'rgba(255,255,255,0.05)' },
                                            }}
                                          >
                                            <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '1.5px solid', borderColor: isDep ? accent : 'rgba(255,255,255,0.3)', backgroundColor: isDep ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                              {isDep && <Box sx={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '1px' }} />}
                                            </Box>
                                            <Typography variant="body2" sx={{ fontSize: '0.82rem', flex: 1 }}>{t.name || 'Unnamed task'}</Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', textTransform: 'lowercase' }}>{String(t.status || 'not_started').replace(/_/g, ' ')}</Typography>
                                          </Box>
                                        );
                                      })}

                                      {nodeOpen && nodeData.children
                                        .slice()
                                        .sort((a, b) => (areaEntry.nodes[a]?.label || '').localeCompare(areaEntry.nodes[b]?.label || ''))
                                        .map((childKey) => renderNode(childKey, depth + 1))}
                                    </Box>
                                  );
                                };

                                return Object.values(areaEntry.nodes)
                                  .filter((node) => !node.parentNodeKey)
                                  .sort((a, b) => a.label.localeCompare(b.label))
                                  .map((node) => renderNode(node.key, 1));
                              })()}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}

                  {Object.keys(projectMap).length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                      No available tasks found.
                    </Typography>
                  ) : null}
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepPickerOpen(false)} sx={{ textTransform: 'none' }} disabled={dependencySaving}>Done</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default TaskDetailModal;
