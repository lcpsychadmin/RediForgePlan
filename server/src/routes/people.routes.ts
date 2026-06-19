import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import peopleService from '../services/peopleService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const people = await peopleService.getAll();
    res.json(formatListResponse(people, people.length));
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { name, role, email } = req.body;
    if (!name) throw new ApiError(400, 'Name is required', 'MISSING_FIELD');
    res.status(201).json(formatSingleResponse(await peopleService.create({ name, role, email })));
  } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const person = await peopleService.update(req.params.id, req.body);
    if (!person) throw new ApiError(404, 'Person not found', 'NOT_FOUND');
    res.json(formatSingleResponse(person));
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try { await peopleService.delete(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

// Roles
router.get('/roles', requireAuth, async (req, res, next) => {
  try {
    const roles = await peopleService.getRoles();
    res.json(formatListResponse(roles, roles.length));
  } catch (e) { next(e); }
});

router.post('/roles', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) throw new ApiError(400, 'Name is required', 'MISSING_FIELD');
    res.status(201).json(formatSingleResponse(await peopleService.createRole(name, sortOrder)));
  } catch (e) { next(e); }
});

router.patch('/roles/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const roles = await peopleService.updateRole(req.params.id, req.body);
    res.json(formatListResponse(roles || [], (roles || []).length));
  } catch (e) { next(e); }
});

router.delete('/roles/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try { await peopleService.deleteRole(req.params.id); res.json({ success: true }); } catch (e) { next(e); }
});

export default router;

