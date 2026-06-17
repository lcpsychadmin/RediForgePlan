import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import commentsService from '../services/commentsService.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

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

    const user = req.user;
    const authorName = user.email.split('@')[0];
    const comment = await commentsService.addComment(
      req.params.taskId,
      authorName,
      user.email,
      content
    );

    // Parse @mentions and create notifications
    const mentions = content.match(/@([\w\s]+?)(?=[^a-zA-Z\s]|$)/g) || [];
    for (const mention of mentions) {
      const name = mention.slice(1).trim();
      const recipientId = await commentsService.findUserByPersonName(name);
      if (recipientId && recipientId !== user.id) {
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
    const notifications = await commentsService.getNotifications(req.user.id);
    const unreadCount = await commentsService.getUnreadCount(req.user.id);
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
    await commentsService.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
