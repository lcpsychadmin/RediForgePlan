// server/src/services/programService.ts
// Program and mock cycle database operations

import db from '../db.js';

export class ProgramService {
  // Programs
  async getAllPrograms() {
    const result = await db.query(
      'SELECT id, name, description, created_at, updated_at FROM programs ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.formatProgram(row));
  }

  async getProgramById(programId: string) {
    const result = await db.query(
      'SELECT id, name, description, created_at, updated_at FROM programs WHERE id = $1',
      [programId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProgram(result.rows[0]);
  }

  async createProgram(name: string, description?: string) {
    const result = await db.query(
      'INSERT INTO programs (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at, updated_at',
      [name, description || null]
    );
    return this.formatProgram(result.rows[0]);
  }

  async updateProgram(programId: string, data: { name?: string; description?: string }) {
    const fields: string[] = [];
    const values: any[] = [programId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }

    if (fields.length === 0) return this.getProgramById(programId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE programs SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, description, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatProgram(result.rows[0]);
  }

  async deleteProgram(programId: string) {
    const cycleCount = await db.query(
      'SELECT COUNT(*) FROM mock_cycles WHERE program_id = $1',
      [programId]
    );

    if (parseInt(cycleCount.rows[0].count) > 0) {
      throw new Error('Cannot delete program with existing mock cycles');
    }

    const result = await db.query(
      'DELETE FROM programs WHERE id = $1 RETURNING id',
      [programId]
    );

    return result.rows.length > 0;
  }

  async getProgramStats(programId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT mc.id) as mock_cycle_count,
        COUNT(DISTINCT p.id) as project_count
      FROM programs pr
      LEFT JOIN mock_cycles mc ON pr.id = mc.program_id
      LEFT JOIN projects p ON mc.id = p.mock_cycle_id
      WHERE pr.id = $1`,
      [programId]
    );

    return result.rows[0];
  }

  // Mock Cycles
  async getMockCyclesByProgram(programId: string) {
    const result = await db.query(
      'SELECT id, program_id, name, start_date, end_date, created_at, updated_at FROM mock_cycles WHERE program_id = $1 ORDER BY start_date DESC',
      [programId]
    );
    return result.rows.map(row => this.formatMockCycle(row));
  }

  async getMockCycleById(mockCycleId: string) {
    const result = await db.query(
      'SELECT id, program_id, name, start_date, end_date, created_at, updated_at FROM mock_cycles WHERE id = $1',
      [mockCycleId]
    );
    if (result.rows.length === 0) return null;
    return this.formatMockCycle(result.rows[0]);
  }

  async createMockCycle(programId: string, name: string, startDate: string, endDate: string) {
    const result = await db.query(
      'INSERT INTO mock_cycles (program_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING id, program_id, name, start_date, end_date, created_at, updated_at',
      [programId, name, startDate, endDate]
    );
    return this.formatMockCycle(result.rows[0]);
  }

  async updateMockCycle(mockCycleId: string, data: { name?: string; startDate?: string; endDate?: string }) {
    const fields: string[] = [];
    const values: any[] = [mockCycleId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (data.startDate !== undefined) {
      fields.push(`start_date = $${paramCount}`);
      values.push(data.startDate);
      paramCount++;
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${paramCount}`);
      values.push(data.endDate);
      paramCount++;
    }

    if (fields.length === 0) return this.getMockCycleById(mockCycleId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE mock_cycles SET ${fields.join(', ')} WHERE id = $1 RETURNING id, program_id, name, start_date, end_date, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatMockCycle(result.rows[0]);
  }

  async deleteMockCycle(mockCycleId: string) {
    const projectCount = await db.query(
      'SELECT COUNT(*) FROM projects WHERE mock_cycle_id = $1',
      [mockCycleId]
    );

    if (parseInt(projectCount.rows[0].count) > 0) {
      throw new Error('Cannot delete mock cycle with existing projects');
    }

    const result = await db.query(
      'DELETE FROM mock_cycles WHERE id = $1 RETURNING id',
      [mockCycleId]
    );

    return result.rows.length > 0;
  }

  async getMockCycleStats(mockCycleId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT p.id) as project_count
      FROM mock_cycles mc
      LEFT JOIN projects p ON mc.id = p.mock_cycle_id
      WHERE mc.id = $1`,
      [mockCycleId]
    );

    return result.rows[0];
  }

  // Formatters
  private formatProgram(row: any) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatMockCycle(row: any) {
    return {
      id: row.id,
      programId: row.program_id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProgramService();
