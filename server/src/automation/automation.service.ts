import db from '../db.js';
import defectsService, { DefectSeverity } from '../defects/defects.service.js';

type RuleType = 'validation' | 'issue_type' | 'task_status';

type AutomationRule = {
  id: string;
  ruleType: RuleType;
  severity: DefectSeverity;
  threshold: number;
  autoAssignToUserId: string | null;
  enabled: boolean;
};

const SEVERITY_WEIGHT: Record<DefectSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

class AutomationService {
  async evaluateValidationStats(taskId: string) {
    const taskResult = await db.query(
      `SELECT id, task_type, project_object_id
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );
    if (taskResult.rows.length === 0) return;

    const task = taskResult.rows[0];

    const statsResult = await db.query(
      `SELECT invalid_records
       FROM task_validation_stats
       WHERE task_id = $1`,
      [taskId]
    );
    if (statsResult.rows.length === 0) return;

    const invalidRecords = Number(statsResult.rows[0].invalid_records || 0);
    if (invalidRecords <= 0) return;

    const validationRule = await this.resolveValidationRule(task.task_type, invalidRecords);
    if (!validationRule) return;

    const issueTypesResult = await db.query(
      `SELECT id, count
       FROM task_issue_types
       WHERE task_id = $1
       ORDER BY count DESC`,
      [taskId]
    );

    const issueTypes = issueTypesResult.rows.filter((row) => Number(row.count || 0) > 0);

    if (issueTypes.length > 0) {
      for (const issueType of issueTypes) {
        await this.createDefectForIssueType(taskId, issueType.id, {
          severityOverride: validationRule.severity,
          assignedToUserId: validationRule.autoAssignToUserId,
          suppressionReason: 'validation-issue-type-duplicate',
        });
      }
      return;
    }

    await this.createAutomatedDefect({
      taskId,
      issueTypeId: null,
      title: 'Validation Errors Detected',
      description: `Validation found ${invalidRecords} invalid records.`,
      severity: validationRule.severity,
      assignedToUserId: validationRule.autoAssignToUserId,
      projectObjectId: task.project_object_id || null,
      duplicateTitleScoped: true,
      suppressionReason: 'validation-generic-duplicate',
    });
  }

  async evaluateIssueType(taskId: string, issueTypeId: string) {
    const issueType = await this.getIssueType(taskId, issueTypeId);
    if (!issueType) return;

    const rule = await this.resolveIssueTypeRule(issueType.count);
    if (!rule) return;

    await this.createDefectForIssueType(taskId, issueTypeId);
  }

  async evaluateTaskStatus(taskId: string, newStatus: string) {
    const normalizedStatus = String(newStatus || '').toLowerCase();
    if (normalizedStatus !== 'blocked' && normalizedStatus !== 'failed') return;

    const taskResult = await db.query(
      `SELECT id, project_object_id
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );
    if (taskResult.rows.length === 0) return;

    const task = taskResult.rows[0];
    const rule = await this.resolveTaskStatusRule();

    const title = normalizedStatus === 'failed' ? 'Task Failed' : 'Task Blocked';

    await this.createAutomatedDefect({
      taskId,
      issueTypeId: null,
      title,
      description: 'Task entered blocked/failed state.',
      severity: rule?.severity || 'high',
      assignedToUserId: rule?.autoAssignToUserId || null,
      projectObjectId: task.project_object_id || null,
      duplicateTitleScoped: true,
      suppressionReason: 'task-status-duplicate',
    });
  }

  async createDefectForIssueType(
    taskId: string,
    issueTypeId: string,
    options?: {
      severityOverride?: DefectSeverity;
      assignedToUserId?: string | null;
      suppressionReason?: string;
    }
  ) {
    const issueType = await this.getIssueType(taskId, issueTypeId);
    if (!issueType) return null;

    const issueTypeRule = await this.resolveIssueTypeRule(issueType.count);
    if (!issueTypeRule) return null;

    const taskResult = await db.query(
      `SELECT project_object_id
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );
    const projectObjectId = taskResult.rows[0]?.project_object_id || null;

    return this.createAutomatedDefect({
      taskId,
      issueTypeId,
      title: issueType.issue_code,
      description: issueType.issue_description || `Detected issue type ${issueType.issue_code}`,
      severity: options?.severityOverride || issueTypeRule.severity,
      assignedToUserId: options?.assignedToUserId ?? issueTypeRule.autoAssignToUserId,
      projectObjectId,
      suppressionReason: options?.suppressionReason || 'issue-type-duplicate',
    });
  }

  private async createAutomatedDefect(params: {
    taskId: string;
    issueTypeId: string | null;
    title: string;
    description: string;
    severity: DefectSeverity;
    assignedToUserId?: string | null;
    projectObjectId?: string | null;
    duplicateTitleScoped?: boolean;
    suppressionReason: string;
  }) {
    const existing = await this.findExistingOpenDefect(
      params.taskId,
      params.issueTypeId,
      params.duplicateTitleScoped ? params.title : undefined
    );

    if (existing) {
      await this.logAutomationSuppressed(existing.id, {
        reason: params.suppressionReason,
        taskId: params.taskId,
        issueTypeId: params.issueTypeId,
        title: params.title,
      });
      return existing;
    }

    const creatorUserId = await this.getAutomationActorUserId(params.assignedToUserId || null);

    const defect = await defectsService.createDefect(params.taskId, {
      projectObjectId: params.projectObjectId || null,
      issueTypeId: params.issueTypeId,
      title: params.title,
      description: params.description,
      severity: params.severity,
      assignedToUserId: params.assignedToUserId || null,
      createdByUserId: creatorUserId,
    });

    if (defect) {
      await this.logAutomationCreated(defect.id, creatorUserId, defect);
    }

    return defect;
  }

  private async findExistingOpenDefect(taskId: string, issueTypeId: string | null, title?: string) {
    const values: any[] = [taskId, issueTypeId];
    let query =
      `SELECT id, task_id, issue_type_id, title, status
       FROM defects
       WHERE task_id = $1
         AND (($2::uuid IS NULL AND issue_type_id IS NULL) OR issue_type_id = $2::uuid)
         AND status != 'closed'`;

    if (title) {
      query += ' AND title = $3';
      values.push(title);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  private async getIssueType(taskId: string, issueTypeId: string) {
    const result = await db.query(
      `SELECT id, task_id, issue_code, issue_description, count
       FROM task_issue_types
       WHERE id = $1 AND task_id = $2`,
      [issueTypeId, taskId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  private async getEnabledRules(ruleType: RuleType) {
    const result = await db.query(
      `SELECT id, rule_type, severity, threshold, auto_assign_to_user_id, enabled
       FROM automation_rules
       WHERE rule_type = $1 AND enabled = TRUE`,
      [ruleType]
    );

    return result.rows.map((row): AutomationRule => ({
      id: row.id,
      ruleType: row.rule_type,
      severity: row.severity,
      threshold: Number(row.threshold || 0),
      autoAssignToUserId: row.auto_assign_to_user_id,
      enabled: !!row.enabled,
    }));
  }

  private async resolveValidationRule(taskType: string, invalidRecords: number) {
    const rules = (await this.getEnabledRules('validation')).filter((rule) => invalidRecords >= rule.threshold);
    if (rules.length === 0) return null;

    const isPostload = String(taskType || '').toLowerCase() === 'postload_validation';

    const sorted = [...rules].sort((a, b) => {
      const severityDelta = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
      if (severityDelta !== 0) {
        return isPostload ? -severityDelta : severityDelta;
      }

      if (a.threshold !== b.threshold) {
        return a.threshold - b.threshold;
      }

      return a.id.localeCompare(b.id);
    });

    return sorted[0];
  }

  private async resolveIssueTypeRule(issueCount: number) {
    const rules = (await this.getEnabledRules('issue_type')).filter((rule) => issueCount >= rule.threshold);
    if (rules.length === 0) return null;

    return [...rules].sort((a, b) => {
      const severityDelta = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (severityDelta !== 0) return severityDelta;
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.id.localeCompare(b.id);
    })[0];
  }

  private async resolveTaskStatusRule() {
    const rules = (await this.getEnabledRules('task_status')).filter((rule) => 1 >= rule.threshold);
    if (rules.length === 0) return null;

    return [...rules].sort((a, b) => {
      const severityDelta = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (severityDelta !== 0) return severityDelta;
      if (a.threshold !== b.threshold) return a.threshold - b.threshold;
      return a.id.localeCompare(b.id);
    })[0];
  }

  private async getAutomationActorUserId(preferredUserId: string | null) {
    if (preferredUserId) {
      const preferred = await db.query('SELECT id FROM users WHERE id = $1', [preferredUserId]);
      if (preferred.rows.length > 0) return preferred.rows[0].id;
    }

    const admin = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'admin'
       ORDER BY created_at ASC
       LIMIT 1`
    );
    if (admin.rows.length > 0) return admin.rows[0].id;

    const firstUser = await db.query(
      `SELECT id
       FROM users
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (firstUser.rows.length > 0) return firstUser.rows[0].id;

    throw new Error('No users available for automated defect creator');
  }

  private async logAutomationCreated(defectId: string, userId: string | null, defectRecord: any) {
    await db.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, before_data, after_data)
       VALUES ($1, 'defect', $2, 'automation.defect_created', $3, $4)`,
      [userId, defectId, null, defectRecord]
    );
  }

  private async logAutomationSuppressed(entityId: string, payload: any) {
    await db.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, before_data, after_data)
       VALUES ($1, 'defect', $2, 'automation.defect_suppressed', $3, $4)`,
      [null, entityId, null, payload]
    );
  }
}

export default new AutomationService();
