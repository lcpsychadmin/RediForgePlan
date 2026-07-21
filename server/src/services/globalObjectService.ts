// server/src/services/globalObjectService.ts
// Global object database operations

import db from '../db.js';

export class GlobalObjectService {
  private aiColumnsReady: boolean | null = null;

  private async ensureAiColumns() {
    if (this.aiColumnsReady) {
      return;
    }

    await db.query(
      `ALTER TABLE global_objects
         ADD COLUMN IF NOT EXISTS default_gateway_id UUID`
    );

    await db.query(
      `ALTER TABLE global_objects
         ADD COLUMN IF NOT EXISTS default_router_id UUID`
    );

    this.aiColumnsReady = true;
  }

  async getAllGlobalObjects(tenantId: string, filters?: { processArea?: string; search?: string }) {
    await this.ensureAiColumns();
    let query = 'SELECT id, object_id, description, process_area, default_gateway_id, default_router_id, created_at, updated_at FROM global_objects WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 2;

    if (filters?.processArea) {
      query += ` AND process_area = $${paramCount}`;
      params.push(filters.processArea);
      paramCount++;
    }

    if (filters?.search) {
      query += ` AND (object_id ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY object_id ASC';

    const result = await db.query(query, params);
    return result.rows.map(row => this.formatGlobalObject(row));
  }

  async getGlobalObjectById(globalObjectId: string, tenantId: string) {
    await this.ensureAiColumns();
    const result = await db.query(
      'SELECT id, object_id, description, process_area, default_gateway_id, default_router_id, created_at, updated_at FROM global_objects WHERE id = $1 AND tenant_id = $2',
      [globalObjectId, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.formatGlobalObject(result.rows[0]);
  }

  async createGlobalObject(
    tenantId: string,
    objectId: string,
    description: string | undefined,
    processArea: string | undefined,
    defaultGatewayId?: string | null,
    defaultRouterId?: string | null
  ) {
    await this.ensureAiColumns();
    const result = await db.query(
      'INSERT INTO global_objects (tenant_id, object_id, description, process_area, default_gateway_id, default_router_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, object_id, description, process_area, default_gateway_id, default_router_id, created_at, updated_at',
      [tenantId, objectId, description || null, processArea || null, defaultGatewayId || null, defaultRouterId || null]
    );
    return this.formatGlobalObject(result.rows[0]);
  }

  async updateGlobalObject(
    globalObjectId: string,
    tenantId: string,
    data: { objectId?: string; description?: string; processArea?: string; defaultGatewayId?: string | null; defaultRouterId?: string | null }
  ) {
    await this.ensureAiColumns();
    const fields: string[] = [];
    const values: any[] = [globalObjectId, tenantId];
    let paramCount = 3;

    if (data.objectId !== undefined) {
      fields.push(`object_id = $${paramCount}`);
      values.push(data.objectId);
      paramCount++;
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }
    if (data.processArea !== undefined) {
      fields.push(`process_area = $${paramCount}`);
      values.push(data.processArea);
      paramCount++;
    }
    if (data.defaultGatewayId !== undefined) {
      fields.push(`default_gateway_id = $${paramCount}`);
      values.push(data.defaultGatewayId);
      paramCount++;
    }
    if (data.defaultRouterId !== undefined) {
      fields.push(`default_router_id = $${paramCount}`);
      values.push(data.defaultRouterId);
      paramCount++;
    }

    if (fields.length === 0) return this.getGlobalObjectById(globalObjectId, tenantId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE global_objects SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING id, object_id, description, process_area, default_gateway_id, default_router_id, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatGlobalObject(result.rows[0]);
  }

  async deleteGlobalObject(globalObjectId: string, tenantId: string) {
    const refCount = await db.query(
      'SELECT COUNT(*) FROM project_objects WHERE global_object_id = $1 AND tenant_id = $2',
      [globalObjectId, tenantId]
    );

    if (parseInt(refCount.rows[0].count) > 0) {
      throw new Error('Cannot delete global object that is referenced by project objects');
    }

    const result = await db.query(
      'DELETE FROM global_objects WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [globalObjectId, tenantId]
    );

    return result.rows.length > 0;
  }

  private formatGlobalObject(row: any) {
    return {
      id: row.id,
      name: row.object_id,
      objectId: row.object_id,
      description: row.description,
      processArea: row.process_area,
      defaultGatewayId: row.default_gateway_id || null,
      defaultRouterId: row.default_router_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new GlobalObjectService();
