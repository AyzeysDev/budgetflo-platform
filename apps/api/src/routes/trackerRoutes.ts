// apps/api/src/routes/trackerRoutes.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createLoanTracker,
  getLoanTrackersByUserId,
  updateLoanTracker,
  recordEMIPayment,
  deleteLoanTracker,
  createSavingsTracker,
  getSavingsTrackersByUserId,
  updateSavingsTracker,
  deleteSavingsTracker,
} from '../services/trackerService';

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

// --- Loan Tracker Routes ---

// GET /api/users/:userId/trackers/loans - Get all loan trackers
router.get(
  '/loans',
  [query('isActive').optional().isBoolean()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
    const trackers = await getLoanTrackersByUserId(userId, isActive);
    res.json(trackers);
  })
);

// POST /api/users/:userId/trackers/loans - Create a loan tracker
router.post(
  '/loans',
  [
    body('name').notEmpty().trim(),
    body('totalAmount').isFloat({ min: 0.01 }),
    body('emiAmount').isFloat({ min: 0.01 }),
    body('interestRate').isFloat({ min: 0, max: 100 }),
    body('tenureMonths').isInt({ min: 1 }),
    body('startDate').isISO8601(),
    body('linkedAccountId').optional(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const tracker = await createLoanTracker(userId, req.body);
    res.status(201).json(tracker);
  })
);

// PUT /api/users/:userId/trackers/loans/:trackerId - Update a loan tracker
router.put(
  '/loans/:trackerId',
  [
    param('trackerId').notEmpty(),
    body('name').optional().trim(),
    body('linkedAccountId').optional(),
    body('emiAmount').optional().isFloat({ min: 0.01 }),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const tracker = await updateLoanTracker(req.params.trackerId, userId, req.body);
    if (!tracker) {
      res.status(404).json({ error: 'Loan tracker not found' });
      return;
    }

    res.json(tracker);
  })
);

// POST /api/users/:userId/trackers/loans/:trackerId/payments - Record EMI payment
router.post(
  '/loans/:trackerId/payments',
  [
    param('trackerId').notEmpty(),
    body('amount').isFloat({ min: 0.01 }),
    body('paymentDate').isISO8601(),
    body('transactionId').optional(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const tracker = await recordEMIPayment(req.params.trackerId, userId, req.body);
    res.json(tracker);
  })
);

// DELETE /api/users/:userId/trackers/loans/:trackerId - Delete a loan tracker
router.delete(
  '/loans/:trackerId',
  [param('trackerId').notEmpty()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const success = await deleteLoanTracker(req.params.trackerId, userId);
    if (!success) {
      res.status(404).json({ error: 'Loan tracker not found' });
      return;
    }

    res.status(204).send();
  })
);

// --- Savings Tracker Routes ---

// GET /api/users/:userId/trackers/savings - Get all savings trackers
router.get(
  '/savings',
  [query('isActive').optional().isBoolean()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const isActive = req.query.isActive ? req.query.isActive === 'true' : undefined;
    const trackers = await getSavingsTrackersByUserId(userId, isActive);
    res.json(trackers);
  })
);

// POST /api/users/:userId/trackers/savings - Create a savings tracker
router.post(
  '/savings',
  [
    body('name').notEmpty().trim(),
    body('linkedAccountId').notEmpty(),
    body('linkedGoalId').optional(),
    body('monthlyTarget').optional().isFloat({ min: 0 }),
    body('overallTarget').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const tracker = await createSavingsTracker(userId, req.body);
    res.status(201).json(tracker);
  })
);

// PUT /api/users/:userId/trackers/savings/:trackerId - Update a savings tracker
router.put(
  '/savings/:trackerId',
  [
    param('trackerId').notEmpty(),
    body('name').optional().trim(),
    body('linkedGoalId').optional(),
    body('monthlyTarget').optional().isFloat({ min: 0 }),
    body('overallTarget').optional().isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const tracker = await updateSavingsTracker(req.params.trackerId, userId, req.body);
    if (!tracker) {
      res.status(404).json({ error: 'Savings tracker not found' });
      return;
    }

    res.json(tracker);
  })
);

// DELETE /api/users/:userId/trackers/savings/:trackerId - Delete a savings tracker
router.delete(
  '/savings/:trackerId',
  [param('trackerId').notEmpty()],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'User ID missing from route parameters.' });
      return;
    }

    const success = await deleteSavingsTracker(req.params.trackerId, userId);
    if (!success) {
      res.status(404).json({ error: 'Savings tracker not found' });
      return;
    }

    res.status(204).send();
  })
);

export default router; 