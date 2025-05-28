// apps/web/src/next-auth.d.ts
// Using the structure provided by the user from their JDMATCHR project.

import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

// Extend the built-in session types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: { // User object is non-optional as per user's version
      /** The user's id. */
      id: string;
      // You can add other custom properties here if needed, like role
      // role?: string;
    } & DefaultSession["user"]; // Keep the default properties like name, email, image
    
    // The user's provided version does not include accessToken, idToken, or dbUser here by default.
    // These can be added if they are explicitly populated in the session callback.
    // For BudgetFlo, we had:
    // accessToken?: string;
    // idToken?: string;
    // dbUser?: Record<string, any>;
  }

  /** Extends the default User type */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Keeping this structure for potential future extensions
  interface User extends DefaultUser {
    // Add properties returned by your adapter or authorize function
    // id: string; // DefaultUser already includes id
    // role?: string;
  }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** OpenID ID Token */
    idToken?: string;
    /** User ID */
    id?: string; // Or use `sub` which is the default JWT subject (usually user id)
    // Add other custom properties you might add in the jwt callback
    // role?: string;
    // accessToken?: string; // This was in the previous version for BudgetFlo
    // picture?: string | null; // This was in the previous version for BudgetFlo
  }
}
