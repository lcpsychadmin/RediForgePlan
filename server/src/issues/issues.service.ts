import db from '../db.js';
import automationService from '../automation/automation.service.js';

export interface IssueTypeInput {
  issueCode: string;
  issueDescription?: string;
  count: number;
}

export interface IssueRecordInput {
  recordIdentifier: string;
  rawData?: any;
}

class IssuesService {
  async getIssueTypeById(issueTypeId: string) {
    const result = await db.query(
      `SELECT id, task_id, issue_code, issue_description, count, created_at, updated_at
       FROM task_issue_types
       WHERE id = $1`,
      [issueTypeId]
    );
    if (result.rows.length === 0) return null;
    return this.formatIssueType(result.rows[0]);
  }

  async createIssueType(taskId: string, issue: IssueTypeInput) {
    const result = await db.query(
      `INSERT INTO task_issue_types (task_id, issue_code, issue_description, count)
       VALUES ($1, $2, $3, $4)
       RETURNING id, task_id, issue_code, issue_description, count, created_at, updated_at`,
      [taskId, issue.issueCode, issue.issueDescription || null, issue.count]
    );

    const formatted = this.formatIssueType(result.rows[0]);

    try {
      await automationService.evaluateIssueType(taskId, formatted.id);
    } catch (error) {
      console.error('[automation] evaluateIssueType failed', { taskId, issueTypeId: formatted.id, error });
    }

    return formatted;
  }

  async getIssueTypes(taskId: string) {
    const result = await db.query(
      `SELECT id, task_id, issue_code, issue_description, count, created_at, updated_at
       FROM task_issue_types
       WHERE task_id = $1
       ORDER BY count DESC, issue_code ASC`,
      [taskId]
    );

    return result.rows.map((row) => this.formatIssueType(row));
  }

  async createIssueRecord(issueTypeId: string, record: IssueRecordInput) {
    const result = await db.query(
      `INSERT INTO task_issue_records (task_issue_type_id, record_identifier, raw_data)
       VALUES ($1, $2, $3)
       RETURNING id, task_issue_type_id, record_identifier, raw_data, created_at`,
      [issueTypeId, record.recordIdentifier, record.rawData || null]
    );

    return this.formatIssueRecord(result.rows[0]);
  }

  async getIssueRecords(issueTypeId: string) {
    const result = await db.query(
      `SELECT id, task_issue_type_id, record_identifier, raw_data, created_at
       FROM task_issue_records
       WHERE task_issue_type_id = $1
       ORDER BY created_at DESC`,
      [issueTypeId]
    );

    return result.rows.map((row) => this.formatIssueRecord(row));
  }

  private formatIssueType(row: any) {
    return {
      id: row.id,
      taskId: row.task_id,
      issueCode: row.issue_code,
      issueDescription: row.issue_description,
      count: row.count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatIssueRecord(row: any) {
    return {
      id: row.id,
      issueTypeId: row.task_issue_type_id,
      recordIdentifier: row.record_identifier,
      rawData: row.raw_data,
      createdAt: row.created_at,
    };
  }
}

export default new IssuesService();
