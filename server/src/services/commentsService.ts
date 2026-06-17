import db from '../db.js';

export class CommentsService {
  async getComments(taskId: string) {
    const result = await db.query(
      'SELECT id, task_id, author_name, author_email, content, created_at FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC',
      [taskId]
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      taskId: r.task_id,
      authorName: r.author_name,
      authorEmail: r.author_email,
      content: r.content,
      createdAt: r.created_at,
    }));
  }

  async getCommentCount(taskId: string): Promise<number> {
    const result = await db.query('SELECT COUNT(*) FROM task_comments WHERE task_id = $1', [taskId]);
    return parseInt(result.rows[0].count);
  }

  async addComment(taskId: string, authorName: string, authorEmail: string, content: string) {
    const result = await db.query(
      'INSERT INTO task_comments (task_id, author_name, author_email, content) VALUES ($1, $2, $3, $4) RETURNING id, task_id, author_name, author_email, content, created_at',
      [taskId, authorName, authorEmail, content]
    );
    return {
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      authorName: result.rows[0].author_name,
      authorEmail: result.rows[0].author_email,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
    };
  }

  async deleteComment(commentId: string) {
    await db.query('DELETE FROM task_comments WHERE id = $1', [commentId]);
  }

  // Notifications
  async createNotification(recipientUserId: string, taskId: string, message: string) {
    await db.query(
      'INSERT INTO notifications (recipient_user_id, task_id, message) VALUES ($1, $2, $3)',
      [recipientUserId, taskId, message]
    );
  }

  async getNotifications(userId: string) {
    const result = await db.query(
      `SELECT n.id, n.task_id, n.message, n.is_read, n.created_at,
              t.name AS task_name, t.project_id
       FROM notifications n
       LEFT JOIN tasks t ON n.task_id = t.id
       WHERE n.recipient_user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      taskId: r.task_id,
      taskName: r.task_name,
      message: r.message,
      isRead: r.is_read,
      createdAt: r.created_at,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async markRead(notificationId: string) {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [notificationId]);
  }

  async markAllRead(userId: string) {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE recipient_user_id = $1', [userId]);
  }

  // Find user by person name via email match
  async findUserByPersonName(name: string): Promise<string | null> {
    const personResult = await db.query(
      'SELECT email FROM people WHERE LOWER(name) = LOWER($1)', [name]
    );
    if (personResult.rows.length === 0 || !personResult.rows[0].email) return null;
    const userResult = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [personResult.rows[0].email]
    );
    return userResult.rows.length > 0 ? userResult.rows[0].id : null;
  }
}

export default new CommentsService();
