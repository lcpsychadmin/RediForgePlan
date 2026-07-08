import processAreaRoleAssignmentService from './processAreaRoleAssignmentService.js';
import { type UnifiedRoleKey } from '../constants/unifiedRoleModel.js';

type WorkflowScope = 'global' | 'project';

class ApprovalWorkflowEngine {
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
}

export default new ApprovalWorkflowEngine();
