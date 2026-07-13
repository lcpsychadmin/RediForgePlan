import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer, Box, Typography, TextField, Button,
  IconButton, Avatar, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Comment {
  id: string;
  taskId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

interface MentionCandidate {
  id: string;
  handle: string;
  email: string;
  role?: string;
}

interface TaskCommentsDrawerProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  accentColor: string;
  people: { id: string; name: string }[];
  loading?: boolean;
  onCommentsChange?: (commentCount: number) => void;
}

const mentionTokenPattern = /(@[a-zA-Z0-9._-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?)/g;

export const TaskCommentsDrawer: React.FC<TaskCommentsDrawerProps> = ({
  open, onClose, taskId, taskName, accentColor, people, loading: externalLoading = false, onCommentsChange,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      apiClient.get(`/api/comments/task/${taskId}`)
        .then(r => setComments(r.data.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));

      apiClient.get('/api/comments/mention-candidates')
        .then(r => setMentionCandidates(r.data.data || []))
        .catch(() => {
          setMentionCandidates((people || []).map((p) => ({
            id: p.id,
            handle: String(p.name || '').trim().replace(/\s+/g, '.').toLowerCase(),
            email: '',
          })));
        });
    }
  }, [open, taskId, people]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 || (lastAt !== -1 && val.slice(lastAt).match(/^@[a-zA-Z0-9._-]*$/))) {
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
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!content.trim() || !taskId) return;
    try {
      setError(null);
      const res = await apiClient.post(`/api/comments/task/${taskId}`, { content: content.trim() });
      const newComment = res.data.data;
      setComments(prev => {
        const updated = [...prev, newComment];
        onCommentsChange?.(updated.length);
        return updated;
      });
      setContent('');
    } catch (e: any) {
      console.error('Comment submission error:', e);
      setError(e.response?.data?.error || 'Failed to send comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    await apiClient.delete(`/api/comments/${commentId}`);
    setComments(prev => {
      const updated = prev.filter(c => c.id !== commentId);
      onCommentsChange?.(updated.length);
      return updated;
    });
  };

  const renderContent = (text: string) => {
    const parts = text.split(mentionTokenPattern);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <Box
          key={i}
          component="span"
          sx={{
            display: 'inline-block',
            px: 0.45,
            py: 0.05,
            borderRadius: 0.75,
            border: `1px solid ${accentColor}66`,
            backgroundColor: `${accentColor}2A`,
            color: accentColor,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {part}
        </Box>
      ) : part
    );
  };

  const filteredMentionCandidates = mentionCandidates.filter((u) => {
    const filter = mentionFilter.toLowerCase();
    return (
      (u.handle || '').toLowerCase().startsWith(filter) ||
      (u.email || '').toLowerCase().startsWith(filter)
    );
  });

  const authorInitials = (name: string) => name.charAt(0).toUpperCase();
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isBusy = externalLoading || loading;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          maxWidth: '100%',
          backgroundColor: '#1A1E2E',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Discussion</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taskName}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: '1rem' }} /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {isBusy ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : !taskId ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.disabled">Discussion thread unavailable.</Typography>
          </Box>
        ) : comments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.disabled">No comments yet. Start the discussion!</Typography>
          </Box>
        ) : (
          comments.map(comment => {
            const isMine = comment.authorEmail === user?.email;
            return (
              <Box key={comment.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', backgroundColor: accentColor, flexShrink: 0 }}>
                  {authorInitials(comment.authorName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: accentColor }}>{comment.authorName}</Typography>
                    <Typography variant="caption" color="text.disabled">{formatTime(comment.createdAt)}</Typography>
                  </Box>
                  <Box sx={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px 12px 12px 12px', px: 1.5, py: 1, display: 'inline-block', maxWidth: '100%' }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}>
                      {renderContent(comment.content)}
                    </Typography>
                  </Box>
                </Box>
                {isMine && (
                  <IconButton size="small" onClick={() => handleDelete(comment.id)} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                    <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                )}
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        {showMentions && filteredMentionCandidates.length > 0 && (
          <Box sx={{
            position: 'absolute', bottom: '100%', left: 16, right: 16, mb: 0.5,
            backgroundColor: '#1A1E2E', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 1, zIndex: 10, maxHeight: 160, overflowY: 'auto',
          }}>
            {filteredMentionCandidates.map(u => (
              <Box key={u.id} onClick={() => insertMention(u.handle)}
                sx={{ px: 2, py: 0.75, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', backgroundColor: accentColor }}>{u.handle.charAt(0).toUpperCase()}</Avatar>
                <Typography variant="body2">@{u.handle}</Typography>
                {u.email && <Typography variant="caption" color="text.disabled">{u.email}</Typography>}
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Write a comment... Use @ to mention someone"
            value={content}
            onChange={handleInput}
            inputRef={inputRef}
            disabled={!taskId || isBusy}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                e.preventDefault();
                handleSend();
              }
              if (e.key === 'Escape') setShowMentions(false);
            }}
            sx={{
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
              '& .MuiInputBase-root': { fontSize: '0.85rem' },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!content.trim() || !taskId || isBusy}
            sx={{ backgroundColor: accentColor, color: 'white', borderRadius: 1, width: 36, height: 36, flexShrink: 0, '&:hover': { backgroundColor: accentColor, opacity: 0.85 }, '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
          >
            <SendIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>
        {error && <Typography variant="caption" sx={{ color: '#ff6b6b', display: 'block', mb: 0.5 }}>Error: {error}</Typography>}
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          Enter to send · Shift+Enter for new line · @name or @email-handle to mention
        </Typography>
      </Box>
    </Drawer>
  );
};

export default TaskCommentsDrawer;