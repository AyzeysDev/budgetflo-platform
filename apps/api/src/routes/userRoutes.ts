// apps/api/src/routes/userRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as userService from '../services/userService';
import { UserSyncPayload, UserProfileUpdatePayload } from '../models/user.model';

const router: Router = express.Router();

// BFF Authentication Middleware (copied from index.ts or imported if centralized)
const BFF_API_SECRET = process.env.BFF_API_SECRET;
const bffAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!BFF_API_SECRET) {
    // If the secret isn't set, this middleware effectively does nothing for security.
    // Depending on policy, you might want to deny access if the secret is missing.
    console.warn("BFF_API_SECRET is not set. Calls to protected routes are not being verified.");
    return next();
  }
  const providedSecret = req.headers['x-internal-api-secret'];
  if (providedSecret !== BFF_API_SECRET) {
    console.warn(`Unauthorized attempt to access ${req.path} - Invalid API secret.`);
    res.status(401).json({ error: 'Unauthorized: Invalid API secret.' });
    return; // Stop further processing
  }
  next();
};

// Async Handler Utility
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

// POST /api/users/sync - Create or update user from BFF
// Apply bffAuthMiddleware specifically to this route if the secret is configured
router.post(
    '/sync',
    ...(BFF_API_SECRET ? [bffAuthMiddleware] : []), // Conditionally apply middleware
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const payload = req.body as UserSyncPayload;
        if (!payload.id || !payload.email) {
            res.status(400).json({ error: 'User ID and email are required for sync.' });
            return;
        }
        const result = await userService.syncUser(payload);
        const statusCode = result.operation === 'created' ? 201 : 200;
        res.status(statusCode).json({ message: `User ${result.operation} successfully.`, data: result.data });
    })
);

// GET /api/users/:id - Fetch user data (Typically doesn't need BFF secret if user is authenticated by other means)
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }
  const user = await userService.getUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.status(200).json(user);
}));

// PUT /api/users/:id - Update user profile (Typically doesn't need BFF secret if user is authenticated by other means)
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const profileData = req.body as UserProfileUpdatePayload;

  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }
  if (Object.keys(profileData).length === 0) {
    res.status(400).json({ error: 'No profile data provided for update.' });
    return;
  }

  const updatedUser = await userService.updateUserProfile(id, profileData);
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found or no valid fields to update.' });
    return;
  }
  res.status(200).json({ message: 'Profile updated successfully.', data: updatedUser });
}));

export default router;
