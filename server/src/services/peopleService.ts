import db from '../db.js';

export class PeopleService {
  async getAll() {
    const result = await db.query(
      'SELECT id, name, role, email, created_at FROM people ORDER BY name ASC'
    );
    return result.rows.map(this.format);
  }

  async create(data: { name: string; role?: string; email?: string }) {
    const result = await db.query(
      'INSERT INTO people (name, role, email) VALUES ($1, $2, $3) RETURNING id, name, role, email, created_at',
      [data.name, data.role || null, data.email || null]
    );
    return this.format(result.rows[0]);
  }

  async update(id: string, data: { name?: string; role?: string; email?: string }) {
    const fields: string[] = [];
    const values: any[] = [id];
    let p = 2;
    if (data.name !== undefined) { fields.push(`name = $${p++}`); values.push(data.name); }
    if (data.role !== undefined) { fields.push(`role = $${p++}`); values.push(data.role); }
    if (data.email !== undefined) { fields.push(`email = $${p++}`); values.push(data.email); }
    if (fields.length === 0) return null;
    fields.push('updated_at = CURRENT_TIMESTAMP');
    const result = await db.query(
      `UPDATE people SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, role, email, created_at`,
      values
    );
    return result.rows.length > 0 ? this.format(result.rows[0]) : null;
  }

  async delete(id: string) {
    await db.query('DELETE FROM people WHERE id = $1', [id]);
  }

  private format(row: any) {
    return { id: row.id, name: row.name, role: row.role, email: row.email, createdAt: row.created_at };
  }
}

export default new PeopleService();
