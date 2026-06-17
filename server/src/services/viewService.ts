// server/src/services/viewService.ts
// Services for materialized views

import db from '../db.js';

export class PriorityViewService {
  async getPrioritizedTasks(projectId: string) {
    const result = await db.query(
      `SELECT 
        ptv.task_id,
        ptv.project_id,
        ptv.project_object_id,
        ptv.task_group_id,
        ptv.status,
        ptv.start_date,
        ptv.end_date,
        ptv.priority_category,
        t.task_type,
        t.name,
        go.object_id
      FROM prioritized_tasks_view ptv
      LEFT JOIN tasks t ON ptv.task_id = t.id
      LEFT JOIN project_objects po ON ptv.project_object_id = po.id
      LEFT JOIN global_objects go ON po.global_object_id = go.id
      WHERE ptv.project_id = $1
      ORDER BY 
        CASE ptv.priority_category
          WHEN 'late' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'due_this_week' THEN 3
          ELSE 4
        END,
        ptv.end_date ASC`,
      [projectId]
    );

    // Group by priority category
    const grouped: { [key: string]: any[] } = {
      late: [],
      in_progress: [],
      due_this_week: [],
      blocked: [],
      on_track: [],
    };

    result.rows.forEach(row => {
      grouped[row.priority_category].push(this.formatPrioritizedTask(row));
    });

    // Ensure blocked tasks are always available as a dedicated section.
    const blockedResult = await db.query(
      `SELECT
        t.id AS task_id,
        t.project_id,
        t.project_object_id,
        t.task_group_id,
        t.status,
        t.start_date,
        t.end_date,
        'blocked'::text AS priority_category,
        t.task_type,
        t.name,
        go.object_id
      FROM tasks t
      LEFT JOIN project_objects po ON t.project_object_id = po.id
      LEFT JOIN global_objects go ON po.global_object_id = go.id
      WHERE t.project_id = $1
        AND t.status = 'blocked'
      ORDER BY t.end_date ASC NULLS LAST, t.name ASC`,
      [projectId]
    );

    grouped.blocked = blockedResult.rows.map(row => this.formatPrioritizedTask(row));

    return grouped;
  }

  private formatPrioritizedTask(row: any) {
    return {
      taskId: row.task_id,
      taskType: row.task_type,
      taskName: row.name,
      projectObjectId: row.project_object_id,
      objectId: row.object_id,
      taskGroupId: row.task_group_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      priorityCategory: row.priority_category,
    };
  }
}

export class ProjectStatusViewService {
  async getProjectStatus(projectId: string) {
    const result = await db.query(
      `SELECT 
        project_id,
        project_name,
        start_date,
        end_date,
        total_tasks,
        completed_tasks,
        in_progress_tasks,
        blocked_tasks,
        not_started_tasks,
        completion_percentage
      FROM project_status_view
      WHERE project_id = $1`,
      [projectId]
    );

    if (result.rows.length === 0) return null;
    return this.formatProjectStatus(result.rows[0]);
  }

  private formatProjectStatus(row: any) {
    return {
      projectId: row.project_id,
      projectName: row.project_name,
      startDate: row.start_date,
      endDate: row.end_date,
      totalTasks: parseInt(row.total_tasks),
      completedTasks: parseInt(row.completed_tasks),
      inProgressTasks: parseInt(row.in_progress_tasks),
      blockedTasks: parseInt(row.blocked_tasks),
      notStartedTasks: parseInt(row.not_started_tasks),
      completionPercentage: row.completion_percentage,
    };
  }
}

export default {
  priority: new PriorityViewService(),
  projectStatus: new ProjectStatusViewService(),
};
