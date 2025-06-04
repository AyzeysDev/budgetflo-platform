import express, { Request, Response, Router, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';
import { CreateCategoryPayload, UpdateCategoryPayload } from '../models/budget.model';
import { body, param, validationResult } from 'express-validator';

const router: Router = express.Router({ mergeParams: true }); 

// Validation rules
const createCategoryValidationRules = [
  body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters.'),
  body('type').isIn(['income', 'expense']).withMessage('Category type must be either "income" or "expense".'),
  body('icon').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }).withMessage('Icon name too long.'),
  body('color').optional({ nullable: true, checkFalsy: true }).isHexColor().withMessage('Invalid color hex code.'),
  body('includeInBudget').isBoolean().withMessage('includeInBudget must be a boolean value.'), // Add this validation
];

const updateCategoryValidationRules = [
  param('categoryId').isString().notEmpty().withMessage('Category ID is required in path.'),
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty if provided.').isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters.'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Category type must be either "income" or "expense".'),
  body('icon').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }).withMessage('Icon name too long.'),
  body('color').optional({ nullable: true, checkFalsy: true }).isHexColor().withMessage('Invalid color hex code.'),
  body('includeInBudget').optional().isBoolean().withMessage('includeInBudget must be a boolean value.'), // Add this validation
];

const categoryIdValidationRule = [
    param('categoryId').isString().notEmpty().withMessage('Category ID is required in path.')
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
  createCategoryValidationRules,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.params.userId; 
    if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }

    const payload: CreateCategoryPayload = req.body;
    const category = await categoryService.createCategory(userId, payload);
    res.status(201).json({ message: 'Category created successfully.', data: category });
  })
);

router.get(
  '/', 
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.userId;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }
    const categories = await categoryService.getCategoriesByUserId(userId);
    res.status(200).json({ data: categories });
  })
);

router.get(
  '/:categoryId', 
  categoryIdValidationRule,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.params.userId;
    const { categoryId } = req.params;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }

    const category = await categoryService.getCategoryById(categoryId, userId);
    if (!category) {
      res.status(404).json({ error: 'Category not found or not authorized.' });
      return;
    }
    res.status(200).json({ data: category });
  })
);

router.put(
  '/:categoryId', 
  updateCategoryValidationRules,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    
    const userId = req.params.userId;
    const { categoryId } = req.params;
    const payload: UpdateCategoryPayload = req.body;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }

    const updatedCategory = await categoryService.updateCategory(categoryId, userId, payload);
    if (!updatedCategory) {
      res.status(404).json({ error: 'Category not found, not authorized, or no changes made.' });
      return;
    }
    res.status(200).json({ message: 'Category updated successfully.', data: updatedCategory });
  })
);

router.delete(
  '/:categoryId', 
  categoryIdValidationRule,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.params.userId;
    const { categoryId } = req.params;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }

    const success = await categoryService.deleteCategory(categoryId, userId);
    if (!success) {
      res.status(404).json({ error: 'Category not found or failed to delete.' });
      return;
    }
    res.status(200).json({ message: 'Category deleted successfully.' });
  })
);

router.post(
  '/seed-defaults',
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.userId;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return;
    }
    await categoryService.seedDefaultCategoriesForUser(userId);
    res.status(200).json({ message: `Default categories seeding process initiated for user ${userId}.` });
  })
);

export default router;