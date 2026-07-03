import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import apiClient from '../api/client';
import { Defect, DefectComment, DefectStatus } from '../api/types';

const statusOptions: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const surfaceSx = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  backgroundColor: 'rgba(255,255,255,0.04)',
  overflow: 'hidden',
};

const parseDefectDescriptionSections = (description: string | null | undefined) => {
  const text = (description || '').trim();
  if (!text) {
    return { details: '', reproSteps: '', systemInfo: '', acceptanceCriteria: '', discussion: '' };
  }

  const getSection = (name: string) => {
    const sectionRegex = new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s*|$)`, 'i');
    const match = text.match(sectionRegex);
    return match ? match[1].trim() : '';
  };

  const stripped = text
    .replace(/\n?##\s*Repro Steps\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*System Info\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*Acceptance Criteria\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*Discussion\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .trim();

  return {
    details: stripped,
    reproSteps: getSection('Repro Steps'),
    systemInfo: getSection('System Info'),
    acceptanceCriteria: getSection('Acceptance Criteria'),
    discussion: getSection('Discussion'),
  };
};

const composeDefectDescription = (sections: {
  details: string;
  reproSteps: string;
  systemInfo: string;
  acceptanceCriteria: string;
  discussion: string;
}) => {
  const blocks: string[] = [];
  if (sections.details.trim()) blocks.push(sections.details.trim());
  if (sections.reproSteps.trim()) blocks.push(`## Repro Steps\n${sections.reproSteps.trim()}`);
  if (sections.systemInfo.trim()) blocks.push(`## System Info\n${sections.systemInfo.trim()}`);
  if (sections.acceptanceCriteria.trim()) blocks.push(`## Acceptance Criteria\n${sections.acceptanceCriteria.trim()}`);
  if (sections.discussion.trim()) blocks.push(`## Discussion\n${sections.discussion.trim()}`);
  return blocks.join('\n\n').trim();
};

interface DefectCommentsModalProps {
  open: boolean;
  defect: Defect | null;
  people: Array<{ id: string; email?: string | null }>;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const DefectCommentsModal: React.FC<DefectCommentsModalProps> = ({ open, defect, people, onClose, onSaved }) => {
  const [draft, setDraft] = React.useState({
    title: '',
    severity: 'medium' as Defect['severity'],
    status: 'open' as DefectStatus,
    assignedToUserId: '',
    details: '',
    reproSteps: '',
    systemInfo: '',
    acceptanceCriteria: '',
    discussion: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [comments, setComments] = React.useState<DefectComment[]>([]);
  const [commentContent, setCommentContent] = React.useState('');
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentSaving, setCommentSaving] = React.useState(false);

  React.useEffect(() => {
    if (!defect) return;
    const parsed = parseDefectDescriptionSections(defect.description);
    setDraft({
      title: defect.title || '',
      severity: defect.severity || 'medium',
      status: defect.status || 'open',
      assignedToUserId: defect.assignedToUserId || '',
      details: parsed.details,
      reproSteps: parsed.reproSteps,
      systemInfo: parsed.systemInfo,
      acceptanceCriteria: parsed.acceptanceCriteria,
      discussion: parsed.discussion,
    });
  }, [defect?.id]);

  React.useEffect(() => {
    if (!open || !defect) return;

    setCommentsLoading(true);
    apiClient.get(`/api/defects/${defect.id}/comments`)
      .then((response) => setComments(response.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [open, defect?.id]);

  const computedDescription = React.useMemo(() => composeDefectDescription(draft), [draft]);

  const isDirty = React.useMemo(() => {
    if (!defect) return false;
    return (
      draft.title.trim() !== (defect.title || '').trim()
      || draft.severity !== defect.severity
      || draft.status !== defect.status
      || (draft.assignedToUserId || '') !== (defect.assignedToUserId || '')
      || computedDescription !== ((defect.description || '').trim())
    );
  }, [defect, draft, computedDescription]);

  const saveDefect = async () => {
    if (!defect) return;
    try {
      setIsSaving(true);
      await apiClient.patch(`/api/defects/${defect.id}`, {
        title: draft.title.trim(),
        severity: draft.severity,
        status: draft.status,
        assignedToUserId: draft.assignedToUserId || null,
        description: computedDescription,
      });
      await onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!defect || !commentContent.trim()) return;

    try {
      setCommentSaving(true);
      const response = await apiClient.post(`/api/defects/${defect.id}/comments`, {
        content: commentContent.trim(),
      });
      setComments((prev) => [...prev, response.data.data]);
      setCommentContent('');
    } finally {
      setCommentSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await apiClient.delete(`/api/defect-comments/${commentId}`);
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  };

  if (!defect) return null;

  const assignedPerson = people.find((person) => person.id === draft.assignedToUserId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          minHeight: '78vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Defect Details</Typography>
          <Typography variant="caption" color="text.secondary">BUG {defect.id.slice(0, 8)}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Box sx={surfaceSx}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" fontWeight={700}>Edit Defect</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: { xs: '100%', md: 420 } }}>
                    <Typography variant="caption" color="text.secondary">BUG {defect.id.slice(0, 8)}</Typography>
                    <TextField
                      value={draft.title}
                      onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                      variant="standard"
                      fullWidth
                      sx={{ '& .MuiInputBase-input': { fontSize: '1.35rem', fontWeight: 700 } }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" sx={{ textTransform: 'none' }} disabled={!isDirty || isSaving} onClick={() => {
                      const parsed = parseDefectDescriptionSections(defect.description);
                      setDraft({
                        title: defect.title || '',
                        severity: defect.severity || 'medium',
                        status: defect.status || 'open',
                        assignedToUserId: defect.assignedToUserId || '',
                        details: parsed.details,
                        reproSteps: parsed.reproSteps,
                        systemInfo: parsed.systemInfo,
                        acceptanceCriteria: parsed.acceptanceCriteria,
                        discussion: parsed.discussion,
                      });
                    }}>
                      Reset
                    </Button>
                    <Button variant="contained" sx={{ textTransform: 'none' }} disabled={!isDirty || isSaving} onClick={saveDefect}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 2 }}>
                  <Stack spacing={1.5}>
                    <TextField label="Details" multiline minRows={3} value={draft.details} onChange={(e) => setDraft((prev) => ({ ...prev, details: e.target.value }))} />
                    <TextField label="Repro Steps" multiline minRows={3} value={draft.reproSteps} onChange={(e) => setDraft((prev) => ({ ...prev, reproSteps: e.target.value }))} />
                    <TextField label="System Info" multiline minRows={2} value={draft.systemInfo} onChange={(e) => setDraft((prev) => ({ ...prev, systemInfo: e.target.value }))} />
                    <TextField label="Acceptance Criteria" multiline minRows={2} value={draft.acceptanceCriteria} onChange={(e) => setDraft((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))} />
                    <TextField label="Discussion" multiline minRows={3} value={draft.discussion} onChange={(e) => setDraft((prev) => ({ ...prev, discussion: e.target.value }))} />
                  </Stack>

                  <Stack spacing={1.5}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Details</Typography>
                        <Stack spacing={1.25}>
                          <TextField label="State" size="small" select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as DefectStatus }))}>
                            {statusOptions.map((status) => (
                              <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                            ))}
                          </TextField>
                          <TextField label="Severity" size="small" select value={draft.severity} onChange={(e) => setDraft((prev) => ({ ...prev, severity: e.target.value as Defect['severity'] }))}>
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="critical">Critical</MenuItem>
                          </TextField>
                          <TextField label="Assigned To" size="small" select value={draft.assignedToUserId} onChange={(e) => setDraft((prev) => ({ ...prev, assignedToUserId: e.target.value }))}>
                            <MenuItem value="">Unassigned</MenuItem>
                            {people.map((person) => (
                              <MenuItem key={person.id} value={person.id}>{person.email || person.id}</MenuItem>
                            ))}
                          </TextField>
                          <Typography variant="caption" color="text.secondary">Task: {defect.taskId}</Typography>
                          <Typography variant="caption" color="text.secondary">Object: {defect.globalObjectId || 'None'}</Typography>
                          <Typography variant="caption" color="text.secondary">Assigned: {assignedPerson?.email || 'Unassigned'}</Typography>
                          <Typography variant="caption" color="text.secondary">Created: {new Date(defect.createdAt).toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">Updated: {new Date(defect.updatedAt).toLocaleString()}</Typography>
                          {defect.resolvedAt ? (
                            <Typography variant="caption" color="text.secondary">Resolved: {new Date(defect.resolvedAt).toLocaleString()}</Typography>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Discussion Thread</Typography>
                        <Stack spacing={1.5}>
                          {commentsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
                          ) : comments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
                          ) : (
                            comments.map((comment) => (
                              <Box key={comment.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{comment.authorName.slice(0, 1).toUpperCase()}</Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography variant="caption" fontWeight={700}>{comment.authorName}</Typography>
                                    <Typography variant="caption" color="text.secondary">{new Date(comment.createdAt).toLocaleString()}</Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{comment.content}</Typography>
                                </Box>
                                <IconButton size="small" onClick={() => handleDeleteComment(comment.id)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ))
                          )}

                          <Divider />

                          <Stack direction="row" spacing={1} alignItems="flex-end">
                            <TextField
                              fullWidth
                              multiline
                              minRows={3}
                              size="small"
                              label="Add a comment"
                              value={commentContent}
                              onChange={(e) => setCommentContent(e.target.value)}
                            />
                            <IconButton
                              onClick={handleAddComment}
                              disabled={!commentContent.trim() || commentSaving}
                              sx={{ width: 38, height: 38, borderRadius: 1, backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.main', opacity: 0.9 } }}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default DefectCommentsModal;