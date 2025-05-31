// apps/api/src/routes/userRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as userService from '../services/userService';
import { UserSyncPayload, UserSettingsUpdatePayload } from '../models/user.model'; // UserProfileUpdatePayload becomes UserSettingsUpdatePayload

const router: Router = express.Router();

// BFF Authentication Middleware (copied from index.ts or imported if centralized)
const BFF_API_SECRET = process.env.BFF_API_SECRET;
const bffAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!BFF_API_SECRET) {
    console.warn("userRoutes: BFF_API_SECRET is not set. Calls to protected routes like /sync are not being verified by this middleware instance.");
    return next(); // Allow through if not configured, security relies on other layers or endpoint-specific checks
  }
  const providedSecret = req.headers['x-internal-api-secret'];
  if (providedSecret !== BFF_API_SECRET) {
    console.warn(`userRoutes: Unauthorized attempt to access ${req.path} - Invalid API secret.`);
    res.status(401).json({ error: 'Unauthorized: Invalid API secret.' });
    return; 
  }
  next();
};

// Async Handler Utility
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error); // Pass errors to the global error handler in index.ts
    }
  };

// POST /api/users/sync - Create or update user account and initialize settings if needed
// This route is critical and should be protected if it's an internal sync mechanism.
router.post(
    '/sync',
    bffAuthMiddleware, // Apply middleware to protect this specific sync endpoint
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const payload = req.body as UserSyncPayload;
        if (!payload.id || !payload.email) {
            res.status(400).json({ error: 'User ID and email are required for sync.' });
            return;
        }
        // userService.syncUser now handles both UserAccount and initializing UserSettings
        const result = await userService.syncUser(payload);
        const statusCode = result.operation === 'created' ? 201 : 200;
        // result.data is now UserProfileView
        res.status(statusCode).json({ message: `User account/settings sync ${result.operation} successfully.`, data: result.data });
    })
);

// GET /api/users/:id - Fetch combined user profile view
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }
  // userService.getUserProfileViewById fetches the combined UserAccount and UserSettings
  const userProfileView = await userService.getUserProfileViewById(id);
  if (!userProfileView) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }
  res.status(200).json(userProfileView);
}));

// PUT /api/users/:id/settings - Update user-configurable settings
// Renamed route to be more specific about what's being updated.
router.put('/:id/settings', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const settingsPayload = req.body as UserSettingsUpdatePayload; // Use the new payload type

  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return;
  }
  if (Object.keys(settingsPayload).length === 0) {
    res.status(400).json({ error: 'No settings data provided for update.' });
    return;
  }

  // userService.updateUserSettings now handles updating the 'user_settings' collection
  const updatedUserProfileView = await userService.updateUserSettings(id, settingsPayload);
  
  if (!updatedUserProfileView) {
    // This could happen if the user account exists but settings somehow failed to update/fetch
    // Or if the underlying user account was not found by updateUserSettings's final fetch
    res.status(404).json({ error: 'User not found or failed to apply settings updates.' });
    return;
  }
  res.status(200).json({ message: 'User settings updated successfully.', data: updatedUserProfileView });
}));

export default router;
