import express, { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createGoal,
  getGoalsByUserId,
  getGoalById,
  updateGoal,
  deleteGoal,
} from '../services/goalService';

const router: Router = express.Router({ mergeParams: true });

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

// GET /api/users/:userId/goals - Get all goals for the authenticated user
router.get(
  '/',
  [
    query('status').optional().isIn(['in_progress', 'completed', 'overdue']),
    query('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const filters = {
      status: req.query.status as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
    };

    const goals = await getGoalsByUserId(userId, filters);
    res.json(goals);
  })
);

// GET /api/users/:userId/goals/:goalId - Get a specific goal
router.get(
  '/:goalId',
  [param('goalId').notEmpty()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const goal = await getGoalById(req.params.goalId, userId);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json(goal);
  })
);

// POST /api/users/:userId/goals - Create a new goal
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('targetAmount').isFloat({ min: 0.01 }),
    body('targetDate').isISO8601(),
    body('description').optional().trim(),
    body('categoryId').optional(),
    body('linkedAccountId').optional(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const goal = await createGoal(userId, req.body);
    res.status(201).json(goal);
  })
);

// PUT /api/users/:userId/goals/:goalId - Update a goal
router.put(
  '/:goalId',
  [
    param('goalId').notEmpty(),
    body('name').optional().trim(),
    body('targetAmount').optional().isFloat({ min: 0.01 }),
    body('targetDate').optional().isISO8601(),
    body('description').optional().trim(),
    body('categoryId').optional(),
    body('linkedAccountId').optional(),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const goal = await updateGoal(req.params.goalId, userId, req.body);
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json(goal);
  })
);

// DELETE /api/users/:userId/goals/:goalId - Delete a goal
router.delete(
  '/:goalId',
  [param('goalId').notEmpty()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const success = await deleteGoal(req.params.goalId, userId);
    if (!success) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.status(204).send();
  })
);

export default router; 