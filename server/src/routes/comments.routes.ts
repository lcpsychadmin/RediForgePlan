import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import commentsService from '../services/commentsService.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// Mention candidates (user accounts)
router.get('/mention-candidates', requireAuth, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const candidates = await commentsService.getMentionCandidates(q);
    res.json(formatListResponse(candidates, candidates.length));
  } catch (e) { next(e); }
});

// Get comments for a task
router.get('/task/:taskId', requireAuth, async (req, res, next) => {
  try {
    const comments = await commentsService.getComments(req.params.taskId);
    res.json(formatListResponse(comments, comments.length));
  } catch (e) { next(e); }
});

// Post a comment (auto-creates @mention notifications)
router.post('/task/:taskId', requireAuth, async (req: any, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    const userId = req.userId;
    const userEmail = req.userEmail;
    const authorName = userEmail.split('@')[0];
    const comment = await commentsService.addComment(
      req.params.taskId,
      authorName,
      userEmail,
      content
    );

    // Parse @mentions and create notifications.
    // Supports handles/emails like @wes, @wes.collins, @wes@company.com and names with spaces.
    const mentionTokens = Array.from(content.matchAll(/@([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)*)/g))
      .map(m => (m[1] || '').trim())
      .filter(Boolean);

    const notified = new Set<string>();
    for (const token of mentionTokens) {
      const recipientId = await commentsService.findUserIdByMention(token);
      if (recipientId && !notified.has(recipientId)) {
        notified.add(recipientId);
        await commentsService.createNotification(
          recipientId,
          req.params.taskId,
          `${authorName} mentioned you in a comment: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`
        );
      }
    }

    res.status(201).json(formatSingleResponse(comment));
  } catch (e) { next(e); }
});

// Delete a comment
router.delete('/:commentId', requireAuth, async (req, res, next) => {
  try {
    await commentsService.deleteComment(req.params.commentId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Notifications
router.get('/notifications/me', requireAuth, async (req: any, res, next) => {
  try {
    const notifications = await commentsService.getNotifications(req.userId);
    const unreadCount = await commentsService.getUnreadCount(req.userId);
    res.json({ notifications, unreadCount });
  } catch (e) { next(e); }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    await commentsService.markRead(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.patch('/notifications/read-all', requireAuth, async (req: any, res, next) => {
  try {
    await commentsService.markAllRead(req.userId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
