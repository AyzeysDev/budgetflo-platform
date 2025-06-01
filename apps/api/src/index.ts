// apps/api/src/index.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes'; 
import budgetRoutes from './routes/budgetRoutes'; 
import { firebaseInitialized } from './config/firebase';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.WEB_APP_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api', (req: Request, res: Response) => {
  res.json({ 
    message: 'BudgetFlo Express API is running!', 
    firebase: firebaseInitialized ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/users', userRoutes); 

// Corrected Authentication Middleware
function authenticateUserForScopedResources(req: Request, res: Response, next: NextFunction): void { // Return type is void
  const authenticatedUserId = req.headers['x-authenticated-user-id'] as string; 
  const requestedUserIdInParams = req.params.userId;

  if (!authenticatedUserId) {
    console.warn(`[Auth Middleware] Access to /api/users/${requestedUserIdInParams}/* denied: Missing X-Authenticated-User-Id header (placeholder).`);
    // Send response and then return to stop further execution in this middleware
    res.status(401).json({ error: "Unauthorized: Authentication token required." });
    return; 
  }
  
  if (authenticatedUserId !== requestedUserIdInParams) {
    console.warn(`[Auth Middleware] Forbidden: User ${authenticatedUserId} attempted to access resources for user ${requestedUserIdInParams}.`);
    // Send response and then return
    res.status(403).json({ error: "Forbidden: You do not have permission to access this resource." });
    return; 
  }
  
  console.log(`[Auth Middleware] User ${authenticatedUserId} authorized for /api/users/${requestedUserIdInParams}/*`);
  next(); // Proceed to the next middleware or route handler
}

const userScopedRouter = express.Router({ mergeParams: true });
userScopedRouter.use('/categories', categoryRoutes);
userScopedRouter.use('/budgets', budgetRoutes); 

app.use('/api/users/:userId', authenticateUserForScopedResources, userScopedRouter);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => { // Added next, though not used, it's standard
  console.error("Global Error Handler caught an error:", err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack); 
  }

  let statusCode = (err as any).status || 500;
  let errorMessage = err.message || 'An unexpected error occurred on the server.';
  let errorDetails = (err as any).errors; 

  if (err.name === 'UnauthorizedError' || err.message.toLowerCase().includes('unauthorized')) {
    statusCode = 401;
    errorMessage = err.message; 
  } else if (err.message.toLowerCase().includes('not found')) {
    statusCode = 404;
  } else if (errorDetails && Array.isArray(errorDetails)) { 
    statusCode = 400;
    errorMessage = "Validation failed.";
  }
  
  if (process.env.NODE_ENV !== 'development' && statusCode === 500) {
    errorMessage = 'An internal server error occurred.';
  }

  // Ensure response is only sent if headers haven't been sent yet
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: errorMessage,
      ...(errorDetails && { details: errorDetails }),
      ...(process.env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack }),
    });
  } else {
    // If headers already sent, delegate to default Express error handler
    // This typically happens if an error occurs during streaming or after a response has started.
    console.error("Global Error Handler: Headers already sent, cannot send error JSON response.");
    // next(err); // Uncomment if you want Express's default handler to take over (might terminate connection)
  }
});

if (firebaseInitialized) {
  app.listen(port, () => {
    console.log(`[server]: API Server is running at http://localhost:${port}`);
    console.log(`[server]: Firebase connection status: Initialized`);
    if (!process.env.BFF_API_SECRET) {
        console.warn("[server]: BFF_API_SECRET is not set. The /api/users/sync endpoint is less secure.");
    }
  });
} else {
  console.error('[server]: Critical - Firebase failed to initialize. Server cannot start reliably with DB operations.');
}
