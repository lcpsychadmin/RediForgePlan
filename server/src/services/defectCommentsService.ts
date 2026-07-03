import db from '../db.js';

export class DefectCommentsService {
  async getComments(defectId: string) {
    const result = await db.query(
      'SELECT id, defect_id, author_name, author_email, content, created_at FROM defect_comments WHERE defect_id = $1 ORDER BY created_at ASC',
      [defectId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      defectId: row.defect_id,
      authorName: row.author_name,
      authorEmail: row.author_email,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async addComment(defectId: string, authorName: string, authorEmail: string, content: string) {
    const result = await db.query(
      'INSERT INTO defect_comments (defect_id, author_name, author_email, content) VALUES ($1, $2, $3, $4) RETURNING id, defect_id, author_name, author_email, content, created_at',
      [defectId, authorName, authorEmail, content]
    );

    return {
      id: result.rows[0].id,
      defectId: result.rows[0].defect_id,
      authorName: result.rows[0].author_name,
      authorEmail: result.rows[0].author_email,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
    };
  }

  async deleteComment(commentId: string) {
    await db.query('DELETE FROM defect_comments WHERE id = $1', [commentId]);
  }
}

export default new DefectCommentsService();