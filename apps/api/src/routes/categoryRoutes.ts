// apps/api/src/routes/categoryRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';
import { CreateCategoryPayload, UpdateCategoryPayload } from '../models/budget.model';
import { body, param, validationResult } from 'express-validator';

const router: Router = express.Router({ mergeParams: true }); 

// Validation rules (assuming these are defined as before)
const createCategoryValidationRules = [
  body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters.'),
  body('type').isIn(['income', 'expense']).withMessage('Category type must be either "income" or "expense".'),
  body('icon').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }).withMessage('Icon name too long.'),
  body('color').optional({ nullable: true, checkFalsy: true }).isHexColor().withMessage('Invalid color hex code.'),
];

const updateCategoryValidationRules = [
  param('categoryId').isString().notEmpty().withMessage('Category ID is required in path.'), // Added path clarification
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty if provided.').isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters.'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Category type must be either "income" or "expense".'),
  body('icon').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 50 }).withMessage('Icon name too long.'),
  body('color').optional({ nullable: true, checkFalsy: true }).isHexColor().withMessage('Invalid color hex code.'),
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
      return; // Explicit return
    }

    const userId = req.params.userId; 
    if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return; // Explicit return
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
        return; // Explicit return
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
      return; // Explicit return
    }

    const userId = req.params.userId;
    const { categoryId } = req.params;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return; // Explicit return
    }

    const category = await categoryService.getCategoryById(categoryId, userId);
    if (!category) {
      res.status(404).json({ error: 'Category not found or not authorized.' });
      return; // Explicit return
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
      return; // Explicit return
    }
    
    const userId = req.params.userId;
    const { categoryId } = req.params;
    const payload: UpdateCategoryPayload = req.body;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return; // Explicit return
    }

    const updatedCategory = await categoryService.updateCategory(categoryId, userId, payload);
    if (!updatedCategory) {
      res.status(404).json({ error: 'Category not found, not authorized, or no changes made.' });
      return; // Explicit return
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
      return; // Explicit return
    }

    const userId = req.params.userId;
    const { categoryId } = req.params;
     if (!userId) {
        res.status(400).json({ error: "User ID is missing from the route parameters." });
        return; // Explicit return
    }

    const success = await categoryService.deleteCategory(categoryId, userId);
    if (!success) {
      res.status(404).json({ error: 'Category not found or failed to delete.' });
      return; // Explicit return
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
        return; // Explicit return
    }
    await categoryService.seedDefaultCategoriesForUser(userId);
    res.status(200).json({ message: `Default categories seeding process initiated for user ${userId}.` });
  })
);

export default router;
