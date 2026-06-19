import db from '../db.js';

export interface ReportingSummary {
  defects: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  validation: {
    preload: ValidationBucket;
    postload: ValidationBucket;
  };
  loadMetrics: {
    attempted: number;
    succeeded: number;
    failed: number;
    failureRate: number;
  };
}

interface ValidationBucket {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issueTypes: Array<{ issueCode: string; count: number }>;
}

class ReportingService {
  async getProjectSummary(projectId: string): Promise<ReportingSummary> {
    return this.getSummaryByScope('t.project_id = $1', [projectId], 'p.id = $1', [projectId]);
  }

  async getMockCycleSummary(mockCycleId: string): Promise<ReportingSummary> {
    return this.getSummaryByScope(
      'p.mock_cycle_id = $1',
      [mockCycleId],
      'p.mock_cycle_id = $1',
      [mockCycleId]
    );
  }

  async getProgramSummary(programId: string): Promise<ReportingSummary> {
    return this.getSummaryByScope(
      'mc.program_id = $1',
      [programId],
      'mc.program_id = $1',
      [programId]
    );
  }

  async getTrends(projectId: string) {
    const defectsCreatedResult = await db.query(
      `SELECT DATE(d.created_at) AS date,
              COUNT(*) FILTER (WHERE d.status IN ('open', 'in_progress')) AS open,
              COUNT(*) FILTER (WHERE d.status IN ('resolved', 'closed')) AS resolved
       FROM defects d
       JOIN tasks t ON t.id = d.task_id
       WHERE t.project_id = $1
       GROUP BY DATE(d.created_at)
       ORDER BY DATE(d.created_at) ASC`,
      [projectId]
    );

    const validationResult = await db.query(
      `SELECT DATE(vs.updated_at) AS date,
              COALESCE(SUM(vs.invalid_records), 0) AS invalid_records
       FROM task_validation_stats vs
       JOIN tasks t ON t.id = vs.task_id
       WHERE t.project_id = $1
       GROUP BY DATE(vs.updated_at)
       ORDER BY DATE(vs.updated_at) ASC`,
      [projectId]
    );

    const loadFailuresResult = await db.query(
      `SELECT DATE(t.updated_at) AS date,
              COUNT(*) FILTER (WHERE t.status = 'blocked') AS failed
       FROM tasks t
       WHERE t.project_id = $1
         AND t.task_type = 'load'
       GROUP BY DATE(t.updated_at)
       ORDER BY DATE(t.updated_at) ASC`,
      [projectId]
    );

    return {
      defectsOverTime: defectsCreatedResult.rows.map((row) => ({
        date: this.formatDate(row.date),
        open: Number(row.open || 0),
        resolved: Number(row.resolved || 0),
      })),
      validationOverTime: validationResult.rows.map((row) => ({
        date: this.formatDate(row.date),
        invalidRecords: Number(row.invalid_records || 0),
      })),
      loadFailuresOverTime: loadFailuresResult.rows.map((row) => ({
        date: this.formatDate(row.date),
        failed: Number(row.failed || 0),
      })),
    };
  }

  async getIssueBreakdown(projectId: string) {
    const result = await db.query(
      `SELECT it.task_id,
              it.issue_code,
              it.issue_description,
              it.count,
              COUNT(d.id) AS defects_linked,
              CASE
                WHEN MAX(CASE d.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) = 4 THEN 'critical'
                WHEN MAX(CASE d.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) = 3 THEN 'high'
                WHEN MAX(CASE d.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) = 2 THEN 'medium'
                WHEN MAX(CASE d.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) = 1 THEN 'low'
                ELSE 'medium'
              END AS severity
       FROM task_issue_types it
       JOIN tasks t ON t.id = it.task_id
       LEFT JOIN defects d ON d.task_id = it.task_id AND d.issue_type_id = it.id
       WHERE t.project_id = $1
       ORDER BY it.count DESC, it.issue_code ASC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      taskId: row.task_id,
      issueCode: row.issue_code,
      issueDescription: row.issue_description,
      count: Number(row.count || 0),
      severity: row.severity,
      defectsLinked: Number(row.defects_linked || 0),
    }));
  }

  private async getSummaryByScope(
    summaryScopeClause: string,
    summaryParams: any[],
    defectScopeClause: string,
    defectParams: any[]
  ): Promise<ReportingSummary> {
    const defects = await this.getDefectSummary(defectScopeClause, defectParams);
    const preload = await this.getValidationBucket(summaryScopeClause, summaryParams, 'preload_validation');
    const postload = await this.getValidationBucket(summaryScopeClause, summaryParams, 'postload_validation');
    const loadMetrics = await this.getLoadMetrics(summaryScopeClause, summaryParams);

    return {
      defects,
      validation: {
        preload,
        postload,
      },
      loadMetrics,
    };
  }

  private async getDefectSummary(scopeClause: string, params: any[]) {
    const result = await db.query(
      `SELECT
         COUNT(d.id) AS total,
         COUNT(*) FILTER (WHERE d.status = 'open') AS open,
         COUNT(*) FILTER (WHERE d.status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE d.status = 'resolved') AS resolved,
         COUNT(*) FILTER (WHERE d.status = 'closed') AS closed,
         COUNT(*) FILTER (WHERE d.severity = 'low') AS low,
         COUNT(*) FILTER (WHERE d.severity = 'medium') AS medium,
         COUNT(*) FILTER (WHERE d.severity = 'high') AS high,
         COUNT(*) FILTER (WHERE d.severity = 'critical') AS critical
       FROM defects d
       JOIN tasks t ON t.id = d.task_id
       JOIN projects p ON p.id = t.project_id
       JOIN mock_cycles mc ON mc.id = p.mock_cycle_id
       WHERE ${scopeClause}`,
      params
    );

    const row = result.rows[0] || {};
    return {
      total: Number(row.total || 0),
      open: Number(row.open || 0),
      inProgress: Number(row.in_progress || 0),
      resolved: Number(row.resolved || 0),
      closed: Number(row.closed || 0),
      bySeverity: {
        low: Number(row.low || 0),
        medium: Number(row.medium || 0),
        high: Number(row.high || 0),
        critical: Number(row.critical || 0),
      },
    };
  }

  private async getValidationBucket(scopeClause: string, params: any[], taskType: 'preload_validation' | 'postload_validation'): Promise<ValidationBucket> {
    const aggregateResult = await db.query(
      `SELECT
         COALESCE(SUM(vs.total_records), 0) AS total_records,
         COALESCE(SUM(vs.valid_records), 0) AS valid_records,
         COALESCE(SUM(vs.invalid_records), 0) AS invalid_records
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN mock_cycles mc ON mc.id = p.mock_cycle_id
       LEFT JOIN task_validation_stats vs ON vs.task_id = t.id
       WHERE ${scopeClause}
         AND t.task_type = $${params.length + 1}`,
      [...params, taskType]
    );

    const issuesResult = await db.query(
      `SELECT it.issue_code,
              COALESCE(SUM(it.count), 0) AS count
       FROM task_issue_types it
       JOIN tasks t ON t.id = it.task_id
       JOIN projects p ON p.id = t.project_id
       JOIN mock_cycles mc ON mc.id = p.mock_cycle_id
       WHERE ${scopeClause}
         AND t.task_type = $${params.length + 1}
       GROUP BY it.issue_code
       ORDER BY SUM(it.count) DESC, it.issue_code ASC`,
      [...params, taskType]
    );

    const aggregate = aggregateResult.rows[0] || {};

    return {
      totalRecords: Number(aggregate.total_records || 0),
      validRecords: Number(aggregate.valid_records || 0),
      invalidRecords: Number(aggregate.invalid_records || 0),
      issueTypes: issuesResult.rows.map((row) => ({
        issueCode: row.issue_code,
        count: Number(row.count || 0),
      })),
    };
  }

  private async getLoadMetrics(scopeClause: string, params: any[]) {
    const result = await db.query(
      `SELECT
         COUNT(*) AS attempted,
         COUNT(*) FILTER (WHERE t.status = 'complete') AS succeeded,
         COUNT(*) FILTER (WHERE t.status = 'blocked') AS failed
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN mock_cycles mc ON mc.id = p.mock_cycle_id
       WHERE ${scopeClause}
         AND t.task_type = $${params.length + 1}`,
      [...params, 'load']
    );

    const row = result.rows[0] || {};
    const attempted = Number(row.attempted || 0);
    const succeeded = Number(row.succeeded || 0);
    const failed = Number(row.failed || 0);

    return {
      attempted,
      succeeded,
      failed,
      failureRate: attempted > 0 ? Number(((failed / attempted) * 100).toFixed(2)) : 0,
    };
  }

  private formatDate(dateValue: any) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return String(dateValue);
    return date.toISOString().slice(0, 10);
  }
}

export default new ReportingService();
