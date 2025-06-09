// apps/api/src/routes/accountRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as accountService from '../services/accountService';
import { CreateAccountPayload, UpdateAccountPayload, ASSET_TYPES, LIABILITY_TYPES } from '../models/account.model';
import { body, param, validationResult } from 'express-validator';

const router: Router = express.Router({ mergeParams: true }); 

const allAccountTypes: ReadonlyArray<string> = [...ASSET_TYPES, ...LIABILITY_TYPES];

// Validation Rules
const createAccountValidationRules = [
  body('name').trim().notEmpty().withMessage('Account name is required.').isLength({ max: 100 }),
  body('type').isIn(allAccountTypes).withMessage('Invalid account type.'),
  body('balance').isNumeric().withMessage('Initial balance must be a number.'),
  body('institution').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 100 }),
  body('accountNumber').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }),
  body('currency').optional({ checkFalsy: true }).isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code.'),
];

const updateAccountValidationRules = [
  param('accountId').isString().notEmpty(),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('type').optional().isIn(allAccountTypes),
  body('balance').optional().isNumeric(),
  body('institution').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 100 }),
  body('accountNumber').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }),
];

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/users/:userId/accounts
router.get('/', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const accounts = await accountService.getAccountsByUserId(userId);
  res.status(200).json({ data: accounts });
}));

// POST /api/users/:userId/accounts
router.post('/', createAccountValidationRules, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId } = req.params;
  const payload: CreateAccountPayload = req.body;
  const newAccount = await accountService.createAccount(userId, payload);
  res.status(201).json({ message: 'Account created successfully.', data: newAccount });
}));

// PUT /api/users/:userId/accounts/:accountId
router.put('/:accountId', updateAccountValidationRules, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId, accountId } = req.params;
  const payload: UpdateAccountPayload = req.body;
  const updatedAccount = await accountService.updateAccount(accountId, userId, payload);
  if (!updatedAccount) {
    return res.status(404).json({ error: "Account not found or not authorized." });
  }
  res.status(200).json({ message: 'Account updated successfully.', data: updatedAccount });
}));

// DELETE /api/users/:userId/accounts/:accountId
router.delete('/:accountId', [param('accountId').isString().notEmpty()], asyncHandler(async (req, res) => {
   const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { userId, accountId } = req.params;
  await accountService.softDeleteAccount(accountId, userId);
  res.status(204).send();
}));

export default router;
