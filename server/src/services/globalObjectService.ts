// server/src/services/globalObjectService.ts
// Global object database operations

import db from '../db.js';

export class GlobalObjectService {
  async getAllGlobalObjects(filters?: { processArea?: string; search?: string }) {
    let query = 'SELECT id, object_id, description, process_area, created_at, updated_at FROM global_objects WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

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

  async getGlobalObjectById(globalObjectId: string) {
    const result = await db.query(
      'SELECT id, object_id, description, process_area, created_at, updated_at FROM global_objects WHERE id = $1',
      [globalObjectId]
    );
    if (result.rows.length === 0) return null;
    return this.formatGlobalObject(result.rows[0]);
  }

  async createGlobalObject(objectId: string, description: string | undefined, processArea: string | undefined) {
    const result = await db.query(
      'INSERT INTO global_objects (object_id, description, process_area) VALUES ($1, $2, $3) RETURNING id, object_id, description, process_area, created_at, updated_at',
      [objectId, description || null, processArea || null]
    );
    return this.formatGlobalObject(result.rows[0]);
  }

  async updateGlobalObject(globalObjectId: string, data: { objectId?: string; description?: string; processArea?: string }) {
    const fields: string[] = [];
    const values: any[] = [globalObjectId];
    let paramCount = 2;

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

    if (fields.length === 0) return this.getGlobalObjectById(globalObjectId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE global_objects SET ${fields.join(', ')} WHERE id = $1 RETURNING id, object_id, description, process_area, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatGlobalObject(result.rows[0]);
  }

  async deleteGlobalObject(globalObjectId: string) {
    const refCount = await db.query(
      'SELECT COUNT(*) FROM project_objects WHERE global_object_id = $1',
      [globalObjectId]
    );

    if (parseInt(refCount.rows[0].count) > 0) {
      throw new Error('Cannot delete global object that is referenced by project objects');
    }

    const result = await db.query(
      'DELETE FROM global_objects WHERE id = $1 RETURNING id',
      [globalObjectId]
    );

    return result.rows.length > 0;
  }

  private formatGlobalObject(row: any) {
    return {
      id: row.id,
      objectId: row.object_id,
      description: row.description,
      processArea: row.process_area,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new GlobalObjectService();
