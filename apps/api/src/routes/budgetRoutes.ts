// apps/api/src/routes/budgetRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as budgetService from '../services/budgetService';
import { CreateBudgetPayload, UpdateBudgetPayload } from '../models/budget.model';
import { body, param, validationResult, query } from 'express-validator';

const router: Router = express.Router({ mergeParams: true }); 

// Validation rules (assuming these are defined as before)
const budgetIdValidationRule = [
  param('budgetId').isString().notEmpty().withMessage('Budget ID is required in path.')
];

const createBudgetValidationRules = [
  body('name').trim().notEmpty().withMessage('Budget name is required.').isLength({ min: 1, max: 150 }).withMessage('Budget name must be between 1 and 150 characters.'),
  body('categoryId').isString().notEmpty().withMessage('Category ID is required.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Budget amount must be a positive number.'),
  body('period').isIn(['monthly', 'quarterly', 'yearly', 'custom']).withMessage('Invalid budget period.'),
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required.'),
  body('endDate').isISO8601().toDate().withMessage('Valid end date is required.')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date.');
      }
      return true;
    }),
  body('isRecurring').isBoolean().withMessage('isRecurring must be a boolean.'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('Notes too long.'),
];

const updateBudgetValidationRules = [
  ...budgetIdValidationRule,
  body('name').optional().trim().notEmpty().withMessage('Budget name cannot be empty if provided.').isLength({ min: 1, max: 150 }).withMessage('Budget name must be between 1 and 150 characters.'),
  body('categoryId').optional().isString().notEmpty().withMessage('Category ID cannot be empty if provided.'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Budget amount must be a positive number.'),
  body('period').optional().isIn(['monthly', 'quarterly', 'yearly', 'custom']).withMessage('Invalid budget period.'),
  body('startDate').optional().isISO8601().toDate().withMessage('Valid start date is required if provided.'),
  body('endDate').optional().isISO8601().toDate().withMessage('Valid end date is required if provided.')
    .custom((value, { req }) => {
      const startDate = req.body.startDate ? new Date(req.body.startDate) : null; 
      if (startDate && new Date(value) < startDate) {
        throw new Error('End date must be after start date if both are provided for update.');
      }
      return true;
    }),
  body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean.'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('Notes too long.'),
];

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

router.post(
  '/', 
  createBudgetValidationRules,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return
    }

    const userId = req.params.userId; 
    if (!userId) {
        res.status(400).json({ error: "User ID missing from route."});
        return; // Explicit return
    }

    const payload: CreateBudgetPayload = req.body;
    const budget = await budgetService.createBudget(userId, payload);
    res.status(201).json({ message: 'Budget created successfully.', data: budget });
  })
);

router.get(
  '/', 
  [query('activeOnly').optional().isBoolean().toBoolean()],
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return
    }
    const userId = req.params.userId;
    if (!userId) {
        res.status(400).json({ error: "User ID missing from route."});
        return; // Explicit return
    }
    
    const activeOnly = req.query.activeOnly === 'true'; 
    const budgets = await budgetService.getBudgetsByUserId(userId, activeOnly);
    res.status(200).json({ data: budgets });
  })
);

router.get(
  '/:budgetId', 
  budgetIdValidationRule,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return
    }
    const userId = req.params.userId;
    const { budgetId } = req.params;
    if (!userId) {
        res.status(400).json({ error: "User ID missing from route."});
        return; // Explicit return
    }

    const budget = await budgetService.getBudgetById(budgetId, userId);
    if (!budget) {
      res.status(404).json({ error: 'Budget not found or not authorized.' });
      return; // Explicit return
    }
    res.status(200).json({ data: budget });
  })
);

router.put(
  '/:budgetId', 
  updateBudgetValidationRules,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return
    }
    
    const userId = req.params.userId;
    const { budgetId } = req.params;
    const payload: UpdateBudgetPayload = req.body;
    if (!userId) {
        res.status(400).json({ error: "User ID missing from route."});
        return; // Explicit return
    }

    const updatedBudget = await budgetService.updateBudget(budgetId, userId, payload);
    if (!updatedBudget) {
      res.status(404).json({ error: 'Budget not found, not authorized, or no changes made.' });
      return; // Explicit return
    }
    res.status(200).json({ message: 'Budget updated successfully.', data: updatedBudget });
  })
);

router.delete(
  '/:budgetId', 
  budgetIdValidationRule,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return
    }

    const userId = req.params.userId;
    const { budgetId } = req.params;
    if (!userId) {
        res.status(400).json({ error: "User ID missing from route."});
        return; // Explicit return
    }

    const success = await budgetService.deleteBudget(budgetId, userId);
    if (!success) {
      res.status(404).json({ error: 'Budget not found or failed to delete.' });
      return; // Explicit return
    }
    res.status(200).json({ message: 'Budget deleted successfully.' });
  })
);

export default router;
