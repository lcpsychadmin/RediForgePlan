// server/src/services/projectObjectService.ts
// Project object (execution layer) database operations

import db from '../db.js';

interface ProjectObjectInput {
  globalObjectId?: string;
  parentProjectObjectId?: string;
  subObjectSuffix?: string;
  subObjectDescription?: string;
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
  private subObjectColumnsSupported: boolean | null = null;

  private async supportsSubObjects() {
    if (this.subObjectColumnsSupported !== null) {
      return this.subObjectColumnsSupported;
    }

    const result = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'project_objects'
         AND column_name = 'parent_project_object_id'
       LIMIT 1`
    );
    this.subObjectColumnsSupported = result.rows.length > 0;
    return this.subObjectColumnsSupported;
  }

  async getProjectObjectsByProject(projectId: string, filters?: { status?: string; draUserId?: string; developerUserId?: string; processArea?: string }) {
    const supportsSubObjects = await this.supportsSubObjects();
    let query = supportsSubObjects
      ? `
        SELECT po.id, po.project_id, po.global_object_id, po.parent_project_object_id, po.sub_object_suffix, po.sub_object_description,
          COALESCE(parent_go.object_id || '-' || po.sub_object_suffix, go.object_id) AS object_id,
          parent_go.object_id AS parent_object_id,
          COALESCE(po.sub_object_description, go.description) AS description,
          COALESCE(go.process_area, parent_go.process_area) AS process_area,
          po.complexity, po.deployment_disposition,
             po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
             po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
             po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at,
          parent_po.created_at AS parent_created_at
      FROM project_objects po
        LEFT JOIN global_objects go ON po.global_object_id = go.id
        LEFT JOIN project_objects parent_po ON po.parent_project_object_id = parent_po.id
        LEFT JOIN global_objects parent_go ON parent_po.global_object_id = parent_go.id
      WHERE po.project_id = $1
    `
      : `
      SELECT po.id, po.project_id, po.global_object_id,
             go.object_id,
             go.description,
             go.process_area,
             po.complexity, po.deployment_disposition,
             po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
             po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
             po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at
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
      query += supportsSubObjects
        ? ` AND COALESCE(go.process_area, parent_go.process_area) = $${paramCount}`
        : ` AND go.process_area = $${paramCount}`;
      params.push(filters.processArea);
      paramCount++;
    }

    query += supportsSubObjects
      ? ` ORDER BY
      CASE WHEN po.parent_project_object_id IS NULL THEN 0 ELSE 1 END,
      COALESCE(parent_po.created_at, po.created_at) DESC,
      po.created_at DESC`
      : ' ORDER BY po.created_at DESC';

    console.log(`[getProjectObjectsByProject] Query for projectId=${projectId}`, { query, params, supportsSubObjects });
    const result = await db.query(query, params);
    console.log(`[getProjectObjectsByProject] Got ${result.rows.length} rows`);
    
    // Also check if ANY project_objects exist for this project
    const countResult = await db.query('SELECT COUNT(*) as cnt FROM project_objects WHERE project_id = $1', [projectId]);
    const totalCount = countResult.rows[0]?.cnt || 0;
    console.log(`[getProjectObjectsByProject] Total project_objects in DB for this project: ${totalCount}`);
    const formatted = result.rows.map(row => {
      const obj = this.formatProjectObject(row);
      console.log(`ProjectObject ${obj.objectId}: description="${obj.description}"`);
      return obj;
    });
    return formatted;
  }

  async getProjectObjectById(projectObjectId: string) {
    const supportsSubObjects = await this.supportsSubObjects();
    const result = await db.query(
      supportsSubObjects
          ? `SELECT po.id, po.project_id, po.global_object_id, po.parent_project_object_id, po.sub_object_suffix, po.sub_object_description,
            COALESCE(parent_go.object_id || '-' || po.sub_object_suffix, go.object_id) AS object_id,
              parent_go.object_id AS parent_object_id,
              COALESCE(po.sub_object_description, go.description) AS description,
              COALESCE(go.process_area, parent_go.process_area) AS process_area,
              po.complexity, po.deployment_disposition,
              po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
              po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
              po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at,
              parent_po.created_at AS parent_created_at
       FROM project_objects po
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       LEFT JOIN project_objects parent_po ON po.parent_project_object_id = parent_po.id
       LEFT JOIN global_objects parent_go ON parent_po.global_object_id = parent_go.id
      WHERE po.id = $1`
       : `SELECT po.id, po.project_id, po.global_object_id,
        go.object_id,
        go.description,
        go.process_area,
        po.complexity, po.deployment_disposition,
        po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
        po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
        po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at
      FROM project_objects po
      JOIN global_objects go ON po.global_object_id = go.id
      WHERE po.id = $1`,
      [projectObjectId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProjectObject(result.rows[0]);
  }

  async createProjectObject(projectId: string, data: ProjectObjectInput) {
    const supportsSubObjects = await this.supportsSubObjects();
    let globalObjectId = data.globalObjectId;
    let parentProjectObjectId = data.parentProjectObjectId || null;
    let subObjectSuffix = (data.subObjectSuffix || '').trim().replace(/^[-\s]+/, '') || null;
    let subObjectDescription = (data.subObjectDescription || '').trim() || null;

    if (!globalObjectId && !parentProjectObjectId) {
      throw new Error('Global object ID is required');
    }

    if (!supportsSubObjects && parentProjectObjectId) {
      throw new Error('Sub-object support is not available until database migration 014 is applied');
    }

    if (parentProjectObjectId) {
      if (!subObjectSuffix) {
        throw new Error('Sub-object ID suffix is required when creating a sub-object');
      }
      if (!subObjectDescription) {
        throw new Error('Sub-object description is required when creating a sub-object');
      }

      const parentResult = await db.query(
        `SELECT id, project_id, global_object_id, parent_project_object_id
         FROM project_objects
         WHERE id = $1`,
        [parentProjectObjectId]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent project object not found');
      }

      const parentRow = parentResult.rows[0];
      if (parentRow.project_id !== projectId) {
        throw new Error('Sub-objects must use a parent object from the same project');
      }
      if (parentRow.parent_project_object_id) {
        throw new Error('Sub-objects can only be attached to a top-level parent object');
      }

      globalObjectId = parentRow.global_object_id;

      const duplicateResult = await db.query(
        `SELECT 1
         FROM project_objects
         WHERE project_id = $1
           AND parent_project_object_id = $2
           AND LOWER(COALESCE(sub_object_suffix, '')) = LOWER($3)
         LIMIT 1`,
        [projectId, parentProjectObjectId, subObjectSuffix]
      );

      if (duplicateResult.rows.length > 0) {
        throw new Error('Sub-object suffix must be unique for this parent object');
      }
    } else {
      parentProjectObjectId = null;
      subObjectSuffix = null;
      subObjectDescription = null;
    }

    const result = supportsSubObjects
      ? await db.query(
      `INSERT INTO project_objects (
        project_id, global_object_id, parent_project_object_id, sub_object_suffix, sub_object_description,
        complexity, deployment_disposition, build_type, object_type,
        cutover_phase, ddm_approach, risk_security_type, migration_type, factor_type, load_method,
        start_date, end_date, status, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id, project_id, global_object_id, complexity, deployment_disposition, build_type,
                 object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
                 factor_type, load_method, start_date, end_date, status, dra_user_id,
                 developer_user_id, notes, created_at, updated_at`,
      [
        projectId,
        globalObjectId,
        parentProjectObjectId,
        subObjectSuffix,
        subObjectDescription,
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
    )
      : await db.query(
      `INSERT INTO project_objects (
        project_id, global_object_id,
        complexity, deployment_disposition, build_type, object_type,
        cutover_phase, ddm_approach, risk_security_type, migration_type, factor_type, load_method,
        start_date, end_date, status, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id`,
      [
        projectId,
        globalObjectId,
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
    const supportsSubObjects = await this.supportsSubObjects();
    const fields: string[] = [];
    const values: any[] = [projectObjectId];
    let paramCount = 2;

    if (supportsSubObjects && data.subObjectSuffix !== undefined && data.subObjectSuffix !== null) {
      data.subObjectSuffix = (data.subObjectSuffix as string).trim().replace(/^[-\s]+/, '');
    }

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
      ...(supportsSubObjects
        ? {
            subObjectSuffix: 'sub_object_suffix',
            subObjectDescription: 'sub_object_description',
          }
        : {}),
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
    // Delete all tasks for this object first (cascade), then delete the object
    await db.query('DELETE FROM tasks WHERE project_object_id = $1', [projectObjectId]);

    const result = await db.query(
      'DELETE FROM project_objects WHERE id = $1 RETURNING id',
      [projectObjectId]
    );

    return result.rows.length > 0;
  }

  // ── Cycle-scoped helpers ─────────────────────────────────────────────────────

  /** Look up the project_id for a mock cycle (needed to satisfy the NOT NULL FK). */
  private async getProjectIdForCycle(mockCycleId: string): Promise<string> {
    const result = await db.query(
      'SELECT project_id FROM mock_cycles WHERE id = $1',
      [mockCycleId]
    );
    if (result.rows.length === 0) throw new Error(`Mock cycle ${mockCycleId} not found`);
    return result.rows[0].project_id as string;
  }

  async getProjectObjectsByCycle(mockCycleId: string, filters?: { status?: string; draUserId?: string; developerUserId?: string; processArea?: string }) {
    const supportsSubObjects = await this.supportsSubObjects();
    let query = supportsSubObjects
      ? `
        SELECT po.id, po.project_id, po.global_object_id, po.parent_project_object_id, po.sub_object_suffix, po.sub_object_description,
          COALESCE(parent_go.object_id || '-' || po.sub_object_suffix, go.object_id) AS object_id,
          parent_go.object_id AS parent_object_id,
          COALESCE(po.sub_object_description, go.description) AS description,
          COALESCE(go.process_area, parent_go.process_area) AS process_area,
          po.complexity, po.deployment_disposition,
          po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
          po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
          po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at,
          parent_po.created_at AS parent_created_at
        FROM project_objects po
        LEFT JOIN global_objects go ON po.global_object_id = go.id
        LEFT JOIN project_objects parent_po ON po.parent_project_object_id = parent_po.id
        LEFT JOIN global_objects parent_go ON parent_po.global_object_id = parent_go.id
        WHERE po.mock_cycle_id = $1
      `
      : `
        SELECT po.id, po.project_id, po.global_object_id,
               go.object_id, go.description, go.process_area,
               po.complexity, po.deployment_disposition,
               po.build_type, po.object_type, po.cutover_phase, po.ddm_approach, po.risk_security_type,
               po.migration_type, po.factor_type, po.load_method, po.start_date, po.end_date, po.status,
               po.dra_user_id, po.developer_user_id, po.notes, po.created_at, po.updated_at
        FROM project_objects po
        JOIN global_objects go ON po.global_object_id = go.id
        WHERE po.mock_cycle_id = $1
      `;

    const params: any[] = [mockCycleId];
    let paramCount = 2;

    if (filters?.status) { query += ` AND po.status = $${paramCount}`; params.push(filters.status); paramCount++; }
    if (filters?.draUserId) { query += ` AND po.dra_user_id = $${paramCount}`; params.push(filters.draUserId); paramCount++; }
    if (filters?.developerUserId) { query += ` AND po.developer_user_id = $${paramCount}`; params.push(filters.developerUserId); paramCount++; }
    if (filters?.processArea) {
      query += supportsSubObjects
        ? ` AND COALESCE(go.process_area, parent_go.process_area) = $${paramCount}`
        : ` AND go.process_area = $${paramCount}`;
      params.push(filters.processArea);
      paramCount++;
    }

    query += supportsSubObjects
      ? ` ORDER BY CASE WHEN po.parent_project_object_id IS NULL THEN 0 ELSE 1 END, COALESCE(parent_po.created_at, po.created_at) DESC, po.created_at DESC`
      : ' ORDER BY po.created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(row => this.formatProjectObject(row));
  }

  async createProjectObjectForCycle(mockCycleId: string, data: ProjectObjectInput) {
    const projectId = await this.getProjectIdForCycle(mockCycleId);
    // Delegate to existing createProjectObject, then patch in mock_cycle_id
    const obj = await this.createProjectObject(projectId, data);
    // Back-fill mock_cycle_id on the newly inserted row
    await db.query(
      'UPDATE project_objects SET mock_cycle_id = $1 WHERE id = $2',
      [mockCycleId, obj.id]
    );
    return { ...obj };
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
      parentProjectObjectId: row.parent_project_object_id || null,
      parentObjectId: row.parent_object_id || null,
      subObjectSuffix: row.sub_object_suffix || null,
      subObjectDescription: row.sub_object_description || null,
      isSubObject: !!row.parent_project_object_id,
      objectId: row.object_id,
      description: row.description,
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
