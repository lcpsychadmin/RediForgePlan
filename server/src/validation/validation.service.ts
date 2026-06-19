import db from '../db.js';
import automationService from '../automation/automation.service.js';

export interface ValidationStatsInput {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

class ValidationService {
  async createOrUpdateStats(taskId: string, stats: ValidationStatsInput) {
    const result = await db.query(
      `INSERT INTO task_validation_stats (task_id, total_records, valid_records, invalid_records)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id)
       DO UPDATE SET
         total_records = EXCLUDED.total_records,
         valid_records = EXCLUDED.valid_records,
         invalid_records = EXCLUDED.invalid_records,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, task_id, total_records, valid_records, invalid_records, created_at, updated_at`,
      [taskId, stats.totalRecords, stats.validRecords, stats.invalidRecords]
    );
    const formatted = this.format(result.rows[0]);

    try {
      await automationService.evaluateValidationStats(taskId);
    } catch (error) {
      console.error('[automation] evaluateValidationStats failed', { taskId, error });
    }

    return formatted;
  }

  async getStats(taskId: string) {
    const result = await db.query(
      `SELECT id, task_id, total_records, valid_records, invalid_records, created_at, updated_at
       FROM task_validation_stats
       WHERE task_id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) return null;
    return this.format(result.rows[0]);
  }

  private format(row: any) {
    return {
      id: row.id,
      taskId: row.task_id,
      totalRecords: row.total_records,
      validRecords: row.valid_records,
      invalidRecords: row.invalid_records,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ValidationService();
