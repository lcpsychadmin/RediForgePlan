import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import apiClient from '../api/client';
import {
  Defect,
  DefectAttachment,
  DefectComment,
  DefectHistoryEvent,
  DefectRootCauseCategory,
  DefectStatus,
} from '../api/types';
import { useAuth } from '../contexts/AuthContext';

const statusOptions: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

type TabValue = 'details' | 'history' | 'attachments';

interface DefectCommentsModalProps {
  open: boolean;
  defect: Defect | null;
  people: Array<{ id: string; email?: string | null; name?: string | null }>;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const cardSx = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  backgroundColor: 'rgba(255,255,255,0.03)',
};

const formatStatusLabel = (status: DefectStatus) => status.replace('_', ' ');

const formatHistoryTitle = (event: DefectHistoryEvent) => {
  if (event.action === 'create') return 'Defect created';
  if (event.action === 'update') return 'Defect updated';
  if (event.action === 'delete') return 'Defect deleted';
  if (event.action === 'comment_add') return 'Comment added';
  if (event.action === 'attachment_add') return 'Attachment added';
  if (event.action === 'attachment_delete') return 'Attachment removed';
  return event.action;
};

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const DefectCommentsModal: React.FC<DefectCommentsModalProps> = ({ open, defect, people, onClose, onSaved }) => {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<TabValue>('details');
  const [draft, setDraft] = React.useState({
    title: '',
    status: 'open' as DefectStatus,
    severity: 'medium' as Defect['severity'],
    assignedToUserId: '',
    rootCauseCategoryId: '',
    targetResolutionDate: '',
    defectDetails: '',
    rootCauseDetails: '',
    resolutionDetails: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const [categories, setCategories] = React.useState<DefectRootCauseCategory[]>([]);
  const [comments, setComments] = React.useState<DefectComment[]>([]);
  const [commentContent, setCommentContent] = React.useState('');
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentSaving, setCommentSaving] = React.useState(false);
  const [history, setHistory] = React.useState<DefectHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [attachments, setAttachments] = React.useState<DefectAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [mentionFilter, setMentionFilter] = React.useState('');
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionCandidates, setMentionCandidates] = React.useState<Array<{ id: string; handle: string; email: string }>>([]);
  const commentInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!defect) return;

    setDraft({
      title: defect.title || '',
      status: defect.status || 'open',
      severity: defect.severity || 'medium',
      assignedToUserId: defect.assignedToUserId || '',
      rootCauseCategoryId: defect.rootCauseCategoryId || '',
      targetResolutionDate: defect.targetResolutionDate || '',
      defectDetails: defect.defectDetails || '',
      rootCauseDetails: defect.rootCauseDetails || '',
      resolutionDetails: defect.resolutionDetails || '',
    });
  }, [defect?.id]);

  React.useEffect(() => {
    if (!open || !defect) return;

    setCommentsLoading(true);
    setHistoryLoading(true);
    setAttachmentsLoading(true);

    apiClient.get('/api/defects/root-cause-categories')
      .then((response) => setCategories(response.data.data || []))
      .catch(() => setCategories([]));

    apiClient.get('/api/comments/mention-candidates')
      .then((response) => setMentionCandidates(response.data.data || []))
      .catch(() => setMentionCandidates([]));

    apiClient.get(`/api/defects/${defect.id}/comments`)
      .then((response) => setComments(response.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));

    apiClient.get(`/api/defects/${defect.id}/history`)
      .then((response) => setHistory(response.data.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));

    apiClient.get(`/api/defects/${defect.id}/attachments`)
      .then((response) => setAttachments(response.data.data || []))
      .catch(() => setAttachments([]))
      .finally(() => setAttachmentsLoading(false));
  }, [open, defect?.id]);

  const isDirty = React.useMemo(() => {
    if (!defect) return false;

    return (
      draft.title.trim() !== (defect.title || '').trim()
      || draft.status !== defect.status
      || draft.severity !== defect.severity
      || (draft.assignedToUserId || '') !== (defect.assignedToUserId || '')
      || (draft.rootCauseCategoryId || '') !== (defect.rootCauseCategoryId || '')
      || (draft.targetResolutionDate || '') !== (defect.targetResolutionDate || '')
      || (draft.defectDetails || '') !== (defect.defectDetails || '')
      || (draft.rootCauseDetails || '') !== (defect.rootCauseDetails || '')
      || (draft.resolutionDetails || '') !== (defect.resolutionDetails || '')
    );
  }, [defect, draft]);

  const saveDefect = async () => {
    if (!defect) return;

    try {
      setIsSaving(true);
      await apiClient.patch(`/api/defects/${defect.id}`, {
        title: draft.title.trim(),
        status: draft.status,
        severity: draft.severity,
        assignedToUserId: draft.assignedToUserId || null,
        rootCauseCategoryId: draft.rootCauseCategoryId || null,
        targetResolutionDate: draft.targetResolutionDate || null,
        defectDetails: draft.defectDetails,
        rootCauseDetails: draft.rootCauseDetails,
        resolutionDetails: draft.resolutionDetails,
      });
      await onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommentInput = (value: string) => {
    setCommentContent(value);
    const lastAt = value.lastIndexOf('@');
    if ((lastAt !== -1 && lastAt === value.length - 1) || (lastAt !== -1 && value.slice(lastAt).match(/^@[a-zA-Z0-9._-]*$/))) {
      setMentionFilter(value.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (handle: string) => {
    const lastAt = commentContent.lastIndexOf('@');
    setCommentContent(commentContent.slice(0, lastAt) + `@${handle} `);
    setShowMentions(false);
    commentInputRef.current?.focus();
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

  const handleUploadAttachment = async (file: File) => {
    if (!defect) return;

    const toBase64 = () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    try {
      setUploading(true);
      const dataBase64 = await toBase64();
      const response = await apiClient.post(`/api/defects/${defect.id}/attachments`, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
      });
      setAttachments((prev) => [response.data.data, ...prev]);
      setTab('attachments');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    const response = await apiClient.get(`/api/defect-attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    await apiClient.delete(`/api/defect-attachments/${attachmentId}`);
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  const filteredMentionCandidates = mentionCandidates.filter((candidate) => {
    const filter = mentionFilter.toLowerCase();
    return (
      (candidate.handle || '').toLowerCase().startsWith(filter)
      || (candidate.email || '').toLowerCase().startsWith(filter)
    );
  });

  if (!defect) return null;

  const assignedPerson = people.find((person) => person.id === draft.assignedToUserId);
  const resolutionDate = defect.status === 'closed' ? defect.resolvedAt : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0d1529',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          minHeight: '84vh',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Defect {defect.id}</Typography>
            <TextField
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              variant="standard"
              fullWidth
              sx={{ mt: 0.5, '& .MuiInputBase-input': { fontSize: '1.6rem', fontWeight: 700 } }}
            />

            <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, minmax(0, 1fr))' }, gap: 1.25 }}>
              <TextField
                label="Status"
                size="small"
                select
                value={draft.status}
                onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as DefectStatus }))}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Assigned To"
                size="small"
                select
                value={draft.assignedToUserId}
                onChange={(event) => setDraft((prev) => ({ ...prev, assignedToUserId: event.target.value }))}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {people.map((person) => (
                  <MenuItem key={person.id} value={person.id}>{person.name || person.email || person.id}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Root Cause"
                size="small"
                select
                value={draft.rootCauseCategoryId}
                onChange={(event) => setDraft((prev) => ({ ...prev, rootCauseCategoryId: event.target.value }))}
              >
                <MenuItem value="">Unspecified</MenuItem>
                {categories.filter((category) => category.isActive).map((category) => (
                  <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Severity"
                size="small"
                select
                value={draft.severity}
                onChange={(event) => setDraft((prev) => ({ ...prev, severity: event.target.value as Defect['severity'] }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
              <TextField
                label="Resolution Date"
                size="small"
                value={resolutionDate ? new Date(resolutionDate).toLocaleDateString() : 'Not closed'}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Target Resolution Date"
                size="small"
                type="date"
                value={draft.targetResolutionDate || ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, targetResolutionDate: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" sx={{ textTransform: 'none' }} disabled={!isDirty || isSaving} onClick={() => {
              setDraft({
                title: defect.title || '',
                status: defect.status || 'open',
                severity: defect.severity || 'medium',
                assignedToUserId: defect.assignedToUserId || '',
                rootCauseCategoryId: defect.rootCauseCategoryId || '',
                targetResolutionDate: defect.targetResolutionDate || '',
                defectDetails: defect.defectDetails || '',
                rootCauseDetails: defect.rootCauseDetails || '',
                resolutionDetails: defect.resolutionDetails || '',
              });
            }}>
              Reset
            </Button>
            <Button variant="contained" sx={{ textTransform: 'none' }} disabled={!isDirty || isSaving} onClick={saveDefect}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{ mb: 1.5 }}
        >
          <Tab value="details" label="Details" />
          <Tab value="history" label="History" />
          <Tab value="attachments" label="Attachments" />
        </Tabs>

        {tab === 'details' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' }, gap: 1.5, minHeight: '62vh' }}>
            <Box sx={{ ...cardSx, p: 1.5 }}>
              <Stack spacing={1.5}>
                <TextField
                  label="Defect Details (What's the problem)"
                  multiline
                  minRows={5}
                  value={draft.defectDetails}
                  onChange={(event) => setDraft((prev) => ({ ...prev, defectDetails: event.target.value }))}
                />
                <TextField
                  label="Root Cause Details (What's causing the problem)"
                  multiline
                  minRows={5}
                  value={draft.rootCauseDetails}
                  onChange={(event) => setDraft((prev) => ({ ...prev, rootCauseDetails: event.target.value }))}
                />
                <TextField
                  label="Resolution Details (How do we solve the problem)"
                  multiline
                  minRows={6}
                  value={draft.resolutionDetails}
                  onChange={(event) => setDraft((prev) => ({ ...prev, resolutionDetails: event.target.value }))}
                />
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`Task: ${defect.taskName || defect.taskId}`} />
                  <Chip size="small" label={`Assigned: ${assignedPerson?.name || assignedPerson?.email || 'Unassigned'}`} />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ ...cardSx, p: 1.5, display: 'flex', flexDirection: 'column', maxHeight: '62vh' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Discussion</Typography>

              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {commentsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
                ) : comments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No comments yet. Start the discussion!</Typography>
                ) : (
                  <Stack spacing={1.2}>
                    {comments.map((comment) => {
                      const isMine = comment.authorEmail === user?.email;
                      return (
                        <Box key={comment.id} sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{comment.authorName.slice(0, 1).toUpperCase()}</Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                              {comment.authorName} · {new Date(comment.createdAt).toLocaleString()}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.3, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {comment.content}
                            </Typography>
                          </Box>
                          {isMine ? (
                            <IconButton size="small" onClick={() => handleDeleteComment(comment.id)} sx={{ opacity: 0.55, '&:hover': { opacity: 1 } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ position: 'relative' }}>
                {showMentions && filteredMentionCandidates.length > 0 ? (
                  <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: '100%', mb: 0.5, zIndex: 5, maxHeight: 180, overflowY: 'auto', ...cardSx, backgroundColor: '#15203b' }}>
                    {filteredMentionCandidates.map((candidate) => (
                      <Box
                        key={candidate.id}
                        onClick={() => insertMention(candidate.handle)}
                        sx={{ px: 1.2, py: 0.75, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } }}
                      >
                        <Typography variant="body2">@{candidate.handle} {candidate.email ? `(${candidate.email})` : ''}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}

                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    size="small"
                    placeholder="Add a comment... Use @ to mention"
                    value={commentContent}
                    inputRef={commentInputRef}
                    onChange={(event) => handleCommentInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && !showMentions) {
                        event.preventDefault();
                        handleAddComment();
                      }
                      if (event.key === 'Escape') setShowMentions(false);
                    }}
                  />
                  <IconButton
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || commentSaving}
                    sx={{ width: 38, height: 38, borderRadius: 1, backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.main', opacity: 0.9 } }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </Box>
          </Box>
        ) : null}

        {tab === 'history' ? (
          <Box sx={{ ...cardSx, p: 1.5, minHeight: '62vh' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Change History</Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
            ) : history.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No changes have been recorded yet.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {history.map((event) => (
                  <Box key={event.id} sx={{ ...cardSx, p: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{formatHistoryTitle(event)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.userEmail || event.userId || 'System'} · {new Date(event.createdAt).toLocaleString()}
                    </Typography>
                    {event.action === 'update' ? (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                        Fields changed for this defect.
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ) : null}

        {tab === 'attachments' ? (
          <Box sx={{ ...cardSx, p: 1.5, minHeight: '62vh' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Attachments</Typography>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Add Attachment'}
                <input
                  hidden
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUploadAttachment(file);
                    event.currentTarget.value = '';
                  }}
                />
              </Button>
            </Stack>

            {attachmentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
            ) : attachments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No attachments yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {attachments.map((attachment) => (
                  <Stack
                    key={attachment.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ ...cardSx, p: 1 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{attachment.fileName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(attachment.fileSize)} · {attachment.uploadedByUserEmail || 'Unknown'} · {new Date(attachment.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => handleDownloadAttachment(attachment.id, attachment.fileName)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteAttachment(attachment.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default DefectCommentsModal;
