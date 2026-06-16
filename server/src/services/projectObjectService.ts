// server/src/services/projectObjectService.ts
// Project object (execution layer) database operations

import db from '../db.js';

interface ProjectObjectInput {
  globalObjectId: string;
  complexity?: string;
  deploymentDisposition?: string;
  buildType?: string;
  objectType?: string;
  cutoverPhase?: string;
  ddmApproach?: string;
  riskSecurityType?: string;
  migrationType?: string;
  factorType?: string;
  loadMethod?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export class ProjectObjectService {
  async getProjectObjectsByProject(projectId: string, filters?: { status?: string; draUserId?: string; developerUserId?: string; processArea?: string }) {
    let query = `
      SELECT po.id, po.project_id, po.global_object_id, po.complexity, po.deployment_disposition,
             po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
             po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
             po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at,
             go.object_id, go.process_area
      FROM project_objects po
      JOIN global_objects go ON po.global_object_id = go.id
      WHERE po.project_id = $1
    `;
    const params: any[] = [projectId];
    let paramCount = 2;

    if (filters?.status) {
      query += ` AND po.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    if (filters?.draUserId) {
      query += ` AND po.dra_user_id = $${paramCount}`;
      params.push(filters.draUserId);
      paramCount++;
    }
    if (filters?.developerUserId) {
      query += ` AND po.developer_user_id = $${paramCount}`;
      params.push(filters.developerUserId);
      paramCount++;
    }
    if (filters?.processArea) {
      query += ` AND go.process_area = $${paramCount}`;
      params.push(filters.processArea);
      paramCount++;
    }

    query += ' ORDER BY po.created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(row => this.formatProjectObject(row));
  }

  async getProjectObjectById(projectObjectId: string) {
    const result = await db.query(
      `SELECT po.id, po.project_id, po.global_object_id, po.complexity, po.deployment_disposition,
              po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
              po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
              po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at,
              go.object_id, go.process_area
       FROM project_objects po
       JOIN global_objects go ON po.global_object_id = go.id
       WHERE po.id = $1`,
      [projectObjectId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProjectObject(result.rows[0]);
  }

  async createProjectObject(projectId: string, data: ProjectObjectInput) {
    const result = await db.query(
      `INSERT INTO project_objects (
        project_id, global_object_id, complexity, deployment_disposition, build_type, object_type,
        cutover_phase, ddm_approach, risk_security_type, migration_type, factor_type, load_method,
        start_date, end_date, status, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, project_id, global_object_id, complexity, deployment_disposition, build_type,
                 object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
                 factor_type, load_method, start_date, end_date, status, dra_user_id,
                 developer_user_id, notes, created_at, updated_at`,
      [
        projectId,
        data.globalObjectId,
        data.complexity || null,
        data.deploymentDisposition || null,
        data.buildType || null,
        data.objectType || null,
        data.cutoverPhase || null,
        data.ddmApproach || null,
        data.riskSecurityType || null,
        data.migrationType || null,
        data.factorType || null,
        data.loadMethod || null,
        data.startDate || null,
        data.endDate || null,
        data.status || null,
        data.draUserId || null,
        data.developerUserId || null,
        data.notes || null,
      ]
    );

    // Fetch with global object info
    return this.getProjectObjectById(result.rows[0].id);
  }

  async updateProjectObject(projectObjectId: string, data: Partial<ProjectObjectInput>) {
    const fields: string[] = [];
    const values: any[] = [projectObjectId];
    let paramCount = 2;

    const fieldMap: { [key: string]: string } = {
      complexity: 'complexity',
      deploymentDisposition: 'deployment_disposition',
      buildType: 'build_type',
      objectType: 'object_type',
      cutoverPhase: 'cutover_phase',
      ddmApproach: 'ddm_approach',
      riskSecurityType: 'risk_security_type',
      migrationType: 'migration_type',
      factorType: 'factor_type',
      loadMethod: 'load_method',
      startDate: 'start_date',
      endDate: 'end_date',
      status: 'status',
      draUserId: 'dra_user_id',
      developerUserId: 'developer_user_id',
      notes: 'notes',
    };

    for (const [key, dbColumn] of Object.entries(fieldMap)) {
      if (key in data && data[key as keyof ProjectObjectInput] !== undefined) {
        fields.push(`${dbColumn} = $${paramCount}`);
        values.push(data[key as keyof ProjectObjectInput]);
        paramCount++;
      }
    }

    if (fields.length === 0) return this.getProjectObjectById(projectObjectId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE project_objects SET ${fields.join(', ')} WHERE id = $1 RETURNING id`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.getProjectObjectById(projectObjectId);
  }

  async deleteProjectObject(projectObjectId: string) {
    const taskCount = await db.query(
      'SELECT COUNT(*) FROM tasks WHERE project_object_id = $1',
      [projectObjectId]
    );

    if (parseInt(taskCount.rows[0].count) > 0) {
      throw new Error('Cannot delete project object with existing tasks');
    }

    const result = await db.query(
      'DELETE FROM project_objects WHERE id = $1 RETURNING id',
      [projectObjectId]
    );

    return result.rows.length > 0;
  }

  async getProjectObjectStats(projectObjectId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT od1.id) as dependency_count,
        COUNT(DISTINCT od2.id) as dependent_count
      FROM project_objects po
      LEFT JOIN tasks t ON po.id = t.project_object_id
      LEFT JOIN object_dependencies od1 ON po.id = od1.project_object_id
      LEFT JOIN object_dependencies od2 ON po.id = od2.depends_on_project_object_id
      WHERE po.id = $1`,
      [projectObjectId]
    );

    return result.rows[0];
  }

  private formatProjectObject(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      globalObjectId: row.global_object_id,
      objectId: row.object_id,
      processArea: row.process_area,
      complexity: row.complexity,
      deploymentDisposition: row.deployment_disposition,
      buildType: row.build_type,
      objectType: row.object_type,
      cutoverPhase: row.cutover_phase,
      ddmApproach: row.ddm_approach,
      riskSecurityType: row.risk_security_type,
      migrationType: row.migration_type,
      factorType: row.factor_type,
      loadMethod: row.load_method,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      draUserId: row.dra_user_id,
      developerUserId: row.developer_user_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProjectObjectService();
