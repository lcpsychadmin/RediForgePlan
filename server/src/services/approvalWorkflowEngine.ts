import processAreaRoleAssignmentService from './processAreaRoleAssignmentService.js';
import { type UnifiedRoleKey } from '../constants/unifiedRoleModel.js';
import db from '../db.js';
import { buildDefaultCriteria, normalizeCriteria, type MockCycleCriterionItem } from '../constants/mockCycleCriteria.js';

type WorkflowScope = 'global' | 'project';

class ApprovalWorkflowEngine {
  private workflowRoleTableReady: boolean | null = null;

  private async ensureProjectWorkflowRoleTable() {
    if (this.workflowRoleTableReady) return;

    await db.query(
      `CREATE TABLE IF NOT EXISTS project_workflow_role_assignments (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
         role_key VARCHAR(64) NOT NULL CHECK (role_key IN ('lead', 'project_manager')),
         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT project_workflow_role_assignments_unique UNIQUE (project_id, role_key)
       )`
    );

    this.workflowRoleTableReady = true;
  }

  async resolveAssignments(params: {
    processArea: string;
    workflowScope: WorkflowScope;
    projectId?: string | null;
    roleKeys: UnifiedRoleKey[];
  }) {
    const workflowScope: WorkflowScope = params.workflowScope === 'project' ? 'project' : 'global';

    const resolutions = await Promise.all(
      params.roleKeys.map((roleKey) =>
        processAreaRoleAssignmentService.resolveRoleAssignment({
          processArea: params.processArea,
          roleKey,
          workflowScope,
          projectId: params.projectId || null,
        })
      )
    );

    return {
      processArea: params.processArea,
      workflowScope,
      projectId: params.projectId || null,
      resolutions,
    };
  }

  async getProjectWorkflowRoles(projectId: string) {
    await this.ensureProjectWorkflowRoleTable();
    const result = await db.query(
      `SELECT role_key, user_id
       FROM project_workflow_role_assignments
       WHERE project_id = $1`,
      [projectId]
    );

    const leadUserId = result.rows.find((row) => row.role_key === 'lead')?.user_id || null;
    const projectManagerUserId = result.rows.find((row) => row.role_key === 'project_manager')?.user_id || null;

    return { leadUserId, projectManagerUserId };
  }

  async evaluateMockCycleProgression(mockCycleId: string) {
    const cycleResult = await db.query(
      `SELECT mc.id,
              mc.project_id,
              mc.entry_criteria_items,
              mc.exit_criteria_items,
              mc.target_success_rate,
              mc.target_coverage_rate,
              mc.total_records_scope,
              mc.invalid_records,
              mc.records_attempted,
              mc.load_errors,
              mc.records_loaded,
              mc.load_success_rate,
              mc.load_coverage_rate,
              mc.lead_approved_by,
              mc.lead_approved_at,
              mc.project_manager_approved_by,
              mc.project_manager_approved_at
       FROM mock_cycles mc
       WHERE mc.id = $1`,
      [mockCycleId]
    );

    if (cycleResult.rows.length === 0) {
      return null;
    }

    const row = cycleResult.rows[0];
    const entryCriteria = normalizeCriteria('entry', row.entry_criteria_items || buildDefaultCriteria('entry', true));
    const exitCriteria = normalizeCriteria('exit', row.exit_criteria_items || buildDefaultCriteria('exit', true));

    const metrics = {
      totalRecordsScope: Number(row.total_records_scope || 0),
      invalidRecords: Number(row.invalid_records || 0),
      recordsAttempted: Number(row.records_attempted || 0),
      loadErrors: Number(row.load_errors || 0),
      recordsLoaded: Number(row.records_loaded || 0),
      loadSuccessRate: Number(row.load_success_rate || 0),
      loadCoverageRate: Number(row.load_coverage_rate || 0),
    };

    const computedSuccessRate = metrics.recordsAttempted > 0
      ? Number(((metrics.recordsLoaded / metrics.recordsAttempted) * 100).toFixed(2))
      : 0;
    const computedCoverageRate = metrics.totalRecordsScope > 0
      ? Number(((metrics.recordsLoaded / metrics.totalRecordsScope) * 100).toFixed(2))
      : 0;

    const effectiveSuccessRate = metrics.loadSuccessRate || computedSuccessRate;
    const effectiveCoverageRate = metrics.loadCoverageRate || computedCoverageRate;

    const targetSuccessRate = Number(row.target_success_rate ?? 95);
    const targetCoverageRate = Number(row.target_coverage_rate ?? 95);

    const entryIncomplete = this.getIncompleteCriteria(entryCriteria);
    const exitIncomplete = this.getIncompleteCriteria(exitCriteria);
    const targetLoadPercentageAchieved =
      effectiveSuccessRate >= targetSuccessRate && effectiveCoverageRate >= targetCoverageRate;

    const criteriaComplete = entryIncomplete.length === 0 && exitIncomplete.length === 0 && targetLoadPercentageAchieved;

    const approvals = {
      leadApprovedBy: row.lead_approved_by || null,
      leadApprovedAt: row.lead_approved_at || null,
      projectManagerApprovedBy: row.project_manager_approved_by || null,
      projectManagerApprovedAt: row.project_manager_approved_at || null,
      leadApproved: Boolean(row.lead_approved_by && row.lead_approved_at),
      projectManagerApproved: Boolean(row.project_manager_approved_by && row.project_manager_approved_at),
    };

    const roles = await this.getProjectWorkflowRoles(row.project_id);
    const progressionAllowed = criteriaComplete && approvals.leadApproved && approvals.projectManagerApproved;

    return {
      mockCycleId,
      projectId: row.project_id,
      criteria: {
        entry: entryCriteria,
        exit: exitCriteria,
        entryIncomplete,
        exitIncomplete,
      },
      targets: {
        successRate: targetSuccessRate,
        coverageRate: targetCoverageRate,
      },
      metrics: {
        ...metrics,
        computedSuccessRate,
        computedCoverageRate,
        effectiveSuccessRate,
        effectiveCoverageRate,
      },
      checks: {
        criteriaComplete,
        targetLoadPercentageAchieved,
      },
      roles,
      approvals,
      progressionAllowed,
    };
  }

  async recordMockCycleApproval(params: {
    mockCycleId: string;
    role: 'lead' | 'project_manager';
    userId: string;
    approved: boolean;
  }) {
    const evaluation = await this.evaluateMockCycleProgression(params.mockCycleId);
    if (!evaluation) return null;

    if (params.role === 'lead') {
      const assignedLead = evaluation.roles.leadUserId;
      if (!assignedLead) {
        throw new Error('Lead role is not assigned for this project.');
      }
      if (assignedLead !== params.userId) {
        throw new Error('Only the assigned Lead can provide Lead approval.');
      }
      if (params.approved && !evaluation.checks.criteriaComplete) {
        throw new Error('All enforced entry and exit criteria must be completed before Lead approval.');
      }

      if (params.approved) {
        await db.query(
          `UPDATE mock_cycles
           SET lead_approved_by = $2,
               lead_approved_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.mockCycleId, params.userId]
        );
      } else {
        await db.query(
          `UPDATE mock_cycles
           SET lead_approved_by = NULL,
               lead_approved_at = NULL,
               project_manager_approved_by = NULL,
               project_manager_approved_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.mockCycleId]
        );
      }
    }

    if (params.role === 'project_manager') {
      const assignedPm = evaluation.roles.projectManagerUserId;
      if (!assignedPm) {
        throw new Error('Project Manager role is not assigned for this project.');
      }
      if (assignedPm !== params.userId) {
        throw new Error('Only the assigned Project Manager can provide Project Manager approval.');
      }

      const leadApproved = evaluation.approvals.leadApproved;
      if (!leadApproved && params.approved) {
        throw new Error('Lead approval is required before Project Manager sign-off.');
      }
      if (params.approved && !evaluation.checks.criteriaComplete) {
        throw new Error('All enforced entry and exit criteria must be completed before Project Manager sign-off.');
      }

      if (params.approved) {
        await db.query(
          `UPDATE mock_cycles
           SET project_manager_approved_by = $2,
               project_manager_approved_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.mockCycleId, params.userId]
        );
      } else {
        await db.query(
          `UPDATE mock_cycles
           SET project_manager_approved_by = NULL,
               project_manager_approved_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [params.mockCycleId]
        );
      }
    }

    return this.evaluateMockCycleProgression(params.mockCycleId);
  }

  private getIncompleteCriteria(criteria: MockCycleCriterionItem[]) {
    return criteria
      .filter((item) => item.enforced && !item.completed)
      .map((item) => ({ key: item.key, label: item.label }));
  }
}

export default new ApprovalWorkflowEngine();
