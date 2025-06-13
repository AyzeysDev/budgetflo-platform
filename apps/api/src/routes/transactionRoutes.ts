// apps/api/src/routes/transactionRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as transactionService from '../services/transactionService';
import { body, param, validationResult, query } from 'express-validator';
import { CreateTransactionPayload, UpdateTransactionPayload } from '../models/transaction.model';

const router: Router = express.Router({ mergeParams: true });

// Middleware to handle async route handlers and forward errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Validation Rules
const createTransactionValidationRules = [
  body('date').isISO8601().toDate().withMessage('A valid transaction date is required.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense".'),
  body('accountId').isString().notEmpty().withMessage('Account ID is required.'),
  body('categoryId').optional({ nullable: true }).isString().notEmpty().withMessage('Category ID must be a valid string if provided.')
    .custom((value, { req }) => {
      if (req.body.type === 'expense' && !value) {
        throw new Error('Category ID is required for expense transactions.');
      }
      return true;
    }),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

const updateTransactionValidationRules = [
  param('transactionId').isString().notEmpty().withMessage('Transaction ID is required.'),
  body('date').optional().isISO8601().toDate(),
  body('amount').optional().isFloat({ gt: 0 }),
  body('type').optional().isIn(['income', 'expense']),
  body('accountId').optional().isString().notEmpty(),
  body('categoryId').optional({ nullable: true }).isString().notEmpty(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

// --- ROUTES ---

// GET /api/users/:userId/transactions - List transactions
router.get(
  '/',
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year format.'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month format.'),
    query('categoryId').optional().isString(),
    query('accountId').optional().isString(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId } = req.params;
    const filters = req.query;
    const transactions = await transactionService.getTransactionsByUserId(userId, filters as any);
    res.status(200).json({ data: transactions });
  })
);

// POST /api/users/:userId/transactions - Create a new transaction
router.post(
  '/',
  createTransactionValidationRules,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId } = req.params;
    const payload: CreateTransactionPayload = req.body;
    const newTransaction = await transactionService.createTransaction(userId, payload);
    res.status(201).json({ message: 'Transaction created successfully.', data: newTransaction });
  })
);

// PUT /api/users/:userId/transactions/:transactionId - Update a transaction
router.put(
  '/:transactionId',
  updateTransactionValidationRules,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId, transactionId } = req.params;
    const payload: UpdateTransactionPayload = req.body;
    const updatedTransaction = await transactionService.updateTransaction(userId, transactionId, payload);
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found or not authorized.' });
    }
    res.status(200).json({ message: 'Transaction updated successfully.', data: updatedTransaction });
  })
);

// DELETE /api/users/:userId/transactions/:transactionId - Delete a transaction
router.delete(
  '/:transactionId',
  [param('transactionId').isString().notEmpty()],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId, transactionId } = req.params;
    const success = await transactionService.deleteTransaction(userId, transactionId);
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found or not authorized.' });
    }
    res.status(204).send();
  })
);

export default router;
