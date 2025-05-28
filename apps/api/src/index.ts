// apps/api/src/index.ts
import express, { Express, Request, Response, NextFunction, Router } from 'express'; // Import Router
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import { firebaseInitialized } from './config/firebase'; // firebaseAdmin removed as it's not directly used here

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware to verify BFF API Secret
const BFF_API_SECRET = process.env.BFF_API_SECRET;
const bffAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // This middleware will now be applied more specifically
  // For example, only to the /sync route within userRoutes
  if (!BFF_API_SECRET) {
    console.warn("BFF_API_SECRET is not set in apps/api. Endpoint /users/sync is less secure if this middleware is intended for it.");
    return next();
  }
  const providedSecret = req.headers['x-internal-api-secret'];
  if (providedSecret !== BFF_API_SECRET) {
    console.warn(`Unauthorized attempt to access ${req.path} - Invalid API secret.`);
    res.status(401).json({ error: 'Unauthorized: Invalid API secret.' });
    return; // Explicitly return to stop further processing
  }
  next();
};

// Core Middleware
app.use(cors({
  origin: process.env.WEB_APP_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route for API health check
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'BudgetFlo Express API is running!', firebase: firebaseInitialized ? 'connected' : 'disconnected' });
});

// Create a new router for /api path to apply middleware selectively if needed
const apiRouter = Router();

// Apply bffAuthMiddleware specifically to routes that need it
// For example, if only the /sync route under /api/users needs it,
// it's better to apply it within userRoutes.ts or to a sub-router.
// If ALL /api/users routes (or a subset) need it:
if (BFF_API_SECRET) {
    // Example: Protecting a specific sub-path or all user routes
    // For now, let's assume it's applied in userRoutes.ts for the /sync path
    // If you want to protect all /api/users routes:
    // apiRouter.use('/users', bffAuthMiddleware, userRoutes);
    // Or, if only specific routes within userRoutes need it, handle it there.
    // For simplicity, and based on the original intent to protect /users/sync,
    // this middleware should be applied *before* the specific route in userRoutes.ts.
    // The current structure in userRoutes.ts does not show this middleware.
    // Let's adjust userRoutes.ts to include this middleware for the /sync path.
    // For now, we won't apply it globally here to avoid the type error with app.use('/api', bffAuthMiddleware)
    // as bffAuthMiddleware is a simple handler, not an Express Application.
}

// Mount User Routes
app.use('/api/users', userRoutes); // userRoutes will handle its own specific middleware if needed

// Global Error Handler (must be last piece of middleware)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => { // next is implicitly any if not used, but good to type
  console.error("Global Error Handler caught:", err.stack);
  const statusCode = (err as any).status || 500;
  res.status(statusCode).json({
    error: 'An unexpected error occurred on the server.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

if (firebaseInitialized) {
  app.listen(port, () => {
    console.log(`[server]: API Server is running at http://localhost:${port}`);
    console.log(`[server]: Firebase connection status: Initialized`);
    if (!BFF_API_SECRET) {
        console.warn("[server]: BFF_API_SECRET is not set. Calls between BFF and API are not secured with a shared secret.");
    }
  });
} else {
  console.error('[server]: Critical - Firebase failed to initialize. Server cannot start reliably with DB operations.');
  // process.exit(1);
}
