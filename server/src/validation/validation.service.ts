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

    try {
      await this.refreshMockCycleMetricsForTask(taskId);
    } catch (error) {
      console.error('[workflow] refreshMockCycleMetricsForTask failed', { taskId, error });
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

  private async refreshMockCycleMetricsForTask(taskId: string) {
    const cycleResult = await db.query(
      `SELECT
         COALESCE(t.mock_cycle_id, p.mock_cycle_id) AS mock_cycle_id
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1`,
      [taskId]
    );

    const mockCycleId = cycleResult.rows[0]?.mock_cycle_id;
    if (!mockCycleId) return;

    const aggregateResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN t.task_type = 'preload_validation' THEN vs.total_records ELSE 0 END), 0) AS preload_total_records,
         COALESCE(SUM(CASE WHEN t.task_type = 'preload_validation' THEN vs.invalid_records ELSE 0 END), 0) AS preload_invalid_records,
         COALESCE(SUM(CASE WHEN t.task_type = 'postload_validation' THEN vs.total_records ELSE 0 END), 0) AS postload_total_records,
         COALESCE(SUM(CASE WHEN t.task_type = 'postload_validation' THEN vs.valid_records ELSE 0 END), 0) AS postload_valid_records,
         COALESCE(SUM(CASE WHEN t.task_type = 'postload_validation' THEN vs.invalid_records ELSE 0 END), 0) AS postload_invalid_records
       FROM tasks t
       LEFT JOIN task_validation_stats vs ON vs.task_id = t.id
       WHERE t.task_type IN ('preload_validation', 'postload_validation')
         AND (
           t.mock_cycle_id = $1
           OR (
             t.mock_cycle_id IS NULL
             AND t.project_id = (SELECT project_id FROM mock_cycles WHERE id = $1)
           )
         )`,
      [mockCycleId]
    );

    const aggregate = aggregateResult.rows[0] || {};

    // Map task-level validation metrics into cycle-level workflow metrics.
    const totalRecordsScope = Number(aggregate.preload_total_records || 0);
    const invalidRecords = Number(aggregate.preload_invalid_records || 0);
    const recordsAttempted = Number(aggregate.postload_total_records || 0);
    const recordsLoaded = Number(aggregate.postload_valid_records || 0);
    const loadErrors = Number(aggregate.postload_invalid_records || 0);

    const loadSuccessRate = recordsAttempted > 0
      ? Number(((recordsLoaded / recordsAttempted) * 100).toFixed(2))
      : 0;
    const loadCoverageRate = totalRecordsScope > 0
      ? Number(((recordsLoaded / totalRecordsScope) * 100).toFixed(2))
      : 0;

    await db.query(
      `UPDATE mock_cycles
       SET total_records_scope = $2,
           invalid_records = $3,
           records_attempted = $4,
           load_errors = $5,
           records_loaded = $6,
           load_success_rate = $7,
           load_coverage_rate = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        mockCycleId,
        totalRecordsScope,
        invalidRecords,
        recordsAttempted,
        loadErrors,
        recordsLoaded,
        loadSuccessRate,
        loadCoverageRate,
      ]
    );
  }
}

export default new ValidationService();
