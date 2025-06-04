// apps/api/src/routes/budgetRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as budgetService from '../services/budgetService';
import { CreateBudgetPayload, UpdateBudgetPayload } from '../models/budget.model';
import { body, param, validationResult, query } from 'express-validator';

const router: Router = express.Router({ mergeParams: true }); // Ensure mergeParams is true

// Validation rules
const budgetIdValidationRule = [
  param('budgetId').isString().notEmpty().withMessage('Budget ID is required in path.')
];

const commonBudgetValidationRules = [
  body('name').trim().notEmpty().withMessage('Budget name is required.').isLength({ min: 1, max: 150 }).withMessage('Budget name must be between 1 and 150 characters.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Budget amount must be a positive number.'),
  body('period').isIn(['monthly', 'yearly', 'custom']).withMessage('Invalid budget period.'),
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required.'),
  body('endDate').isISO8601().toDate().withMessage('Valid end date is required.')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after start date.');
      }
      return true;
    }),
  body('isRecurring').isBoolean().withMessage('isRecurring must be a boolean.'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('Notes maximum 500 characters.'),
  body('isOverall').optional().isBoolean().withMessage('isOverall must be a boolean.'),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Category ID must be a string if provided.')
    .custom((value, { req }) => {
      if (req.body.isOverall === true && value) {
        throw new Error('categoryId should not be provided for an overall budget.');
      }
      if ((req.body.isOverall === false || req.body.isOverall === undefined) && !value) {
        throw new Error('categoryId is required for category-specific budgets.');
      }
      return true;
    }),
];

const createBudgetValidationRules = [...commonBudgetValidationRules];

const updateBudgetValidationRules = [
  ...budgetIdValidationRule,
  body('name').optional().trim().notEmpty().withMessage('Budget name cannot be empty if provided.').isLength({ min: 1, max: 150 }).withMessage('Budget name must be between 1 and 150 characters.'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Budget amount must be a positive number.'),
  body('period').optional().isIn(['monthly', 'yearly', 'custom']).withMessage('Invalid budget period.'),
  body('startDate').optional().isISO8601().toDate().withMessage('Valid start date is required if provided.'),
  body('endDate').optional().isISO8601().toDate().withMessage('Valid end date is required if provided.')
    .custom((value, { req }) => {
      const startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      // Only validate if both are present or if endDate is present and implies a startDate from existing record (harder to validate here without fetching)
      if (startDate && new Date(value) < startDate) {
        throw new Error('End date must be on or after start date.');
      }
      return true;
    }),
  body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean.'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('Notes maximum 500 characters.'),
  body('isOverall').optional().isBoolean().withMessage('isOverall must be a boolean.'),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Category ID must be a string if provided.')
    .custom((value, { req }) => {
      // This custom validation might be tricky for updates if isOverall is not part of the payload
      // but categoryId is. Assuming if isOverall is updated, categoryId logic is handled.
      if (req.body.isOverall === true && value) {
        throw new Error('categoryId should not be provided or should be null for an overall budget update.');
      }
      // If isOverall is explicitly false or not provided, and categoryId is being set to empty, that's an issue.
      // if ((req.body.isOverall === false || req.body.isOverall === undefined) && value === '') {
      //   throw new Error('categoryId is required for category-specific budgets.');
      // }
      return true;
    }),
];

const overallBudgetPayloadValidation = [
    body('amount').isFloat({ gt: 0 }).withMessage('Overall budget amount must be a positive number.'),
    body('period').isIn(['monthly', 'yearly']).withMessage("Period must be 'monthly' or 'yearly' for overall budget."),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required.'),
    body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required for monthly period.'),
    body('notes').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 500 }).withMessage('Notes maximum 500 characters.'),
];


const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error); // Forward to global error handler
    }
  };

// --- Overall Budget Routes ---
router.post(
  '/overall',
  overallBudgetPayloadValidation,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }
    const { amount, period, year, month, notes } = req.body;
    const budget = await budgetService.setOverallBudget(userId, { amount, period, year, month, notes });
    res.status(budget ? 200 : 201).json({ message: 'Overall budget set/updated successfully.', data: budget });
  })
);

router.get(
  '/overall',
  [
    query('period').isIn(['monthly', 'yearly']).withMessage("Query param 'period' must be 'monthly' or 'yearly'."),
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid query param `year` is required.'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Valid query param `month` (1-12) is required for monthly period.')
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
     if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }
    const { period, year, month } = req.query as { period: 'monthly' | 'yearly', year: string, month?: string };
    const budget = await budgetService.getOverallBudgetForPeriod(userId, period, parseInt(year), month ? parseInt(month) : undefined);
    if (!budget) {
      res.status(404).json({ message: 'Overall budget not found for the specified period.' });
      return;
    }
    res.status(200).json({ data: budget });
  })
);


// --- Category-Specific Budget Routes ---
router.post(
  '/',
  createBudgetValidationRules,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }
    const payload: CreateBudgetPayload = req.body;
    if (payload.isOverall === true && payload.categoryId) {
        res.status(400).json({ error: "Cannot specify categoryId for an overall budget."});
        return;
    }
    if ((payload.isOverall === undefined || payload.isOverall === false) && !payload.categoryId) {
        res.status(400).json({ error: "categoryId is required for category-specific budgets."});
        return;
    }

    const budget = await budgetService.createBudget(userId, payload);
    res.status(201).json({ message: 'Budget created successfully.', data: budget });
  })
);

router.get(
  '/',
  [
    query('isOverall').optional().isBoolean().toBoolean(),
    query('activeOnly').optional().isBoolean().toBoolean(),
    query('period').optional().isIn(['monthly', 'yearly', 'custom']),
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }

    const { isOverall, activeOnly, period, year, month } = req.query;

    const options: { isOverall?: boolean; activeOnly?: boolean; period?: 'monthly' | 'yearly' | 'custom', year?: number, month?: number } = {};
    if (isOverall !== undefined) options.isOverall = isOverall === 'true';
    if (activeOnly !== undefined) options.activeOnly = activeOnly === 'true';
    if (period) options.period = period as 'monthly' | 'yearly' | 'custom';
    if (year) options.year = parseInt(year as string);
    if (month) options.month = parseInt(month as string);

    const budgets = await budgetService.getBudgetsByUserId(userId, options);
    res.status(200).json({ data: budgets });
  })
);

router.get(
  '/:budgetId',
  budgetIdValidationRule,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
    const { budgetId } = req.params;
     if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }

    const budget = await budgetService.getBudgetById(budgetId, userId);
    if (!budget) {
      res.status(404).json({ error: 'Budget not found or not authorized.' });
      return;
    }
    res.status(200).json({ data: budget });
  })
);

router.put(
  '/:budgetId',
  updateBudgetValidationRules,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.params.userId;
    const { budgetId } = req.params;
    const payload: UpdateBudgetPayload = req.body;
     if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }

    const updatedBudget = await budgetService.updateBudget(budgetId, userId, payload);
    if (!updatedBudget) {
      res.status(404).json({ error: 'Budget not found, not authorized, or no changes made.' });
      return;
    }
    res.status(200).json({ message: 'Budget updated successfully.', data: updatedBudget });
  })
);

router.delete(
  '/:budgetId',
  budgetIdValidationRule,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const userId = req.params.userId;
    const { budgetId } = req.params;
     if (!userId) {
      res.status(400).json({ error: "User ID missing from route parameters." });
      return;
    }
    const success = await budgetService.deleteBudget(budgetId, userId);
    if (!success) {
      res.status(404).json({ error: 'Budget not found or failed to delete.' });
      return;
    }
    res.status(200).json({ message: 'Budget deleted successfully.' });
  })
);

export default router;
