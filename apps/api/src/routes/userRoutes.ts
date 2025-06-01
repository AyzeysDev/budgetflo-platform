// apps/api/src/routes/userRoutes.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import * as userService from '../services/userService';
import { UserSyncPayload, UserSettingsUpdatePayload } from '../models/user.model';

const router: Router = express.Router();

const BFF_API_SECRET = process.env.BFF_API_SECRET;
const bffAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!BFF_API_SECRET) {
    console.warn("userRoutes: BFF_API_SECRET is not set. Calls to /sync are not being verified by this middleware instance.");
    return next();
  }
  const providedSecret = req.headers['x-internal-api-secret'];
  if (providedSecret !== BFF_API_SECRET) {
    console.warn(`userRoutes: Unauthorized attempt to access ${req.path} - Invalid API secret.`);
    res.status(401).json({ error: 'Unauthorized: Invalid API secret.' });
    return; // Explicit return after sending response
  }
  next();
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

router.post(
    '/sync',
    bffAuthMiddleware, 
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Added next
        const payload = req.body as UserSyncPayload;
        if (!payload.id || !payload.email) {
            res.status(400).json({ error: 'User ID and email are required for sync.' });
            return; // Explicit return
        }
        // If an error occurs in syncUser, asyncHandler will catch it and pass to next(error)
        const result = await userService.syncUser(payload);
        const statusCode = result.operation === 'created' ? 201 : 200;
        res.status(statusCode).json({ message: `User account/settings sync ${result.operation} successfully.`, data: result.data });
        // No explicit return needed here as it's the end of successful execution for this handler
    })
);

router.get('/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Added next
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return; // Explicit return
  }
  const userProfileView = await userService.getUserProfileViewById(id);
  if (!userProfileView) {
    res.status(404).json({ error: 'User profile not found.' });
    return; // Explicit return
  }
  res.status(200).json(userProfileView);
}));

router.put('/:id/settings', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Added next
  const { id } = req.params;
  const settingsPayload = req.body as UserSettingsUpdatePayload;

  if (!id) {
    res.status(400).json({ error: 'User ID is required.' });
    return; // Explicit return
  }
  if (Object.keys(settingsPayload).length === 0) {
    res.status(400).json({ error: 'No settings data provided for update.' });
    return; // Explicit return
  }

  const updatedUserProfileView = await userService.updateUserSettings(id, settingsPayload);
  
  if (!updatedUserProfileView) {
    res.status(404).json({ error: 'User not found or failed to apply settings updates.' });
    return; // Explicit return
  }
  res.status(200).json({ message: 'User settings updated successfully.', data: updatedUserProfileView });
}));

export default router;
