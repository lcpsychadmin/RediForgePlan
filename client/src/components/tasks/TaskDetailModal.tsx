// client/src/components/tasks/TaskDetailModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, Box, Typography, IconButton, TextField, MenuItem,
  Chip, CircularProgress, Alert, LinearProgress, Divider, Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
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

  // Reset edit data when task changes or modal opens
  useEffect(() => {
    if (open && resolvedTask) {
      setEditData({
        status: resolvedTask.status || 'not_started',
        revisedStartDate: toInputDate(resolvedTask.revisedStartDate),
        revisedEndDate: toInputDate(resolvedTask.revisedEndDate),
        assignedTo: resolvedTask.assignedTo || '',
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
        revisedStartDate: editData.revisedStartDate || null,
        revisedEndDate: editData.revisedEndDate || null,
        assignedTo: editData.assignedTo || null,
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

  const over = daysOverdue(editData?.revisedEndDate || resolvedTask?.revisedEndDate || resolvedTask?.endDate);
  const accent = accentColor || '#29b6f6';

  const fieldSx = {
    '& .MuiInputBase-root': { fontSize: '0.82rem' },
    '& .MuiInputLabel-root': { fontSize: '0.82rem' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accent },
    '& .MuiInputLabel-root.Mui-focused': { color: accent },
  };

  const tabs = ['Details', ...(supportsValidation ? [taskType === 'preload_validation' ? 'Preload Quality' : 'Postload Quality'] : []), 'Defects'];

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

                  {/* Original (plan) dates — read-only */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {[['Plan Start', resolvedTask?.startDate], ['Plan End', resolvedTask?.endDate]].map(([label, val]) => (
                      <Box key={label as string} sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, px: 1.5, py: 0.75, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 0.2 }}>{label as string}</Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{val ? fmtDate(val as string) : '—'}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Revised dates — editable */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField size="small" label="Revised Start" type="date" value={editData.revisedStartDate || ''}
                      onChange={e => set('revisedStartDate', e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    <Box>
                      <TextField size="small" label="Revised End" type="date" value={editData.revisedEndDate || ''}
                        onChange={e => set('revisedEndDate', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: '100%' }} />
                      {over && over > 0 && (
                        <Typography variant="caption" sx={{ color: '#ef5350', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
                          ⚠ {over} day{over !== 1 ? 's' : ''} overdue
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Notes */}
                  <TextField size="small" label="Notes / Description" multiline rows={4} value={editData.notes || ''}
                    onChange={e => set('notes', e.target.value)} sx={fieldSx} fullWidth />

                  {/* Dependencies */}
                  {deps.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 0.75 }}>
                        Dependencies ({deps.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {(deps as any[]).map((dep: any) => (
                          <Box key={dep.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.6, borderRadius: 1, backgroundColor: toRgba(accent, 0.08), border: `1px solid ${toRgba(accent, 0.18)}` }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLORS[(dep.status || 'not_started')] || accent, flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{dep.objectId || dep.dependsOnName || dep.taskName || dep.name || 'Task'}</Typography>
                            {dep.endDate && <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Due {fmtDate(dep.endDate)}</Typography>}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
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
                <DefectsSection taskId={taskIdResolved} />
              )}
            </Box>

            {/* Right: Discussion */}
            <Box sx={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <InlineDiscussion taskId={taskIdResolved} accent={accent} people={people} />
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
