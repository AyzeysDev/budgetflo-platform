// apps/web/src/lib/auth.ts
import {
  type NextAuthOptions,
  type User as NextAuthUser,
  // type Account, // Not explicitly used in callbacks shown
  type Profile as NextAuthProfileType,
  type Session as NextAuthSessionBase
} from "next-auth";
import { type JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
// UserSyncPayload is defined in the API models, but for the frontend call,
// we can define it here or import if a shared types package existed.
// For now, let's assume the structure is known for the syncPayload.
import type { UserSyncPayload } from '@/../../api/src/models/user.model'; // Adjust path if needed or redefine

interface GoogleProfile extends NextAuthProfileType {
  sub: string;
  picture?: string;
}

type AppUser = NextAuthUser;

interface BudgetFloSession extends Omit<NextAuthSessionBase, 'user'> {
  user: {
    id: string;
    name?: string | null; // This will be nameToDisplay from UserProfileView
    email?: string | null;
    image?: string | null; // This will be imageToDisplay from UserProfileView
  };
  accessToken?: string; // Google access token, if needed by client
  // idToken?: string; // Google ID token, if needed by client
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const expressApiUrl = process.env.EXPRESS_API_URL;
const backendSecret = process.env.BACKEND_API_SECRET;

// Robust checks for environment variables
if (!googleClientId) throw new Error("CRITICAL: Missing GOOGLE_CLIENT_ID environment variable.");
if (!googleClientSecret) throw new Error("CRITICAL: Missing GOOGLE_CLIENT_SECRET environment variable.");
if (!nextAuthSecret) throw new Error("CRITICAL: Missing NEXTAUTH_SECRET environment variable.");
if (!expressApiUrl) console.warn("WARNING: Missing EXPRESS_API_URL. User sync with backend will fail.");
if (!backendSecret) console.warn("WARNING: Missing BACKEND_API_SECRET. Calls to Express API for user sync will not include X-Internal-Api-Secret header.");


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      // The profile function maps the provider's profile to the User object expected by NextAuth.
      // This User object is then passed to the `signIn` and `jwt` callbacks.
      profile(profile: GoogleProfile): AppUser {
        return {
          id: profile.sub, // Use Google's 'sub' as the unique ID
          name: profile.name,
          email: profile.email,
          image: profile.picture || profile.image, // Google uses 'picture', NextAuth DefaultUser uses 'image'
        };
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: nextAuthSecret,
  pages: {
    signIn: "/#hero-section", // Redirect to landing page for sign-in
  },
  callbacks: {
    async signIn({ user, account /*, profile, email, credentials */ }) {
      // 'user' here is the AppUser returned by the GoogleProvider's profile function.
      console.log("[NextAuth SignIn CB] Initiated for user:", user?.email, "ID:", user?.id);
      console.log("[NextAuth SignIn CB] Account provider:", account?.provider);

      if (account?.provider === "google" && user?.id && user?.email && expressApiUrl) {
        console.log("[NextAuth SignIn CB] Conditions met for API sync with Express backend.");
        
        // This payload matches the UserSyncPayload expected by the API
        const syncPayload: UserSyncPayload = {
          id: user.id,
          email: user.email,
          name: user.name,   // This is the name directly from Google (oauthName in API)
          image: user.image, // This is the image directly from Google (oauthImage in API)
        };

        const requestHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        if (backendSecret) {
          requestHeaders['X-Internal-Api-Secret'] = backendSecret;
        } else {
          console.warn("[NextAuth SignIn CB] BACKEND_API_SECRET not set. Sync request to Express API will lack X-Internal-Api-Secret header.");
        }

        console.log(`[NextAuth SignIn CB] Fetching: POST ${expressApiUrl}/users/sync`);
        // console.log("[NextAuth SignIn CB] Sync Payload to API:", JSON.stringify(syncPayload)); // Potentially sensitive, log with caution

        try {
          const response = await fetch(`${expressApiUrl}/users/sync`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(syncPayload),
          });

          const responseStatus = response.status;
          // const responseBodyText = await response.text(); // Read body once
          // console.log(`[NextAuth SignIn CB] Express API Response Status: ${responseStatus}, Body: ${responseBodyText.substring(0, 200)}...`);


          if (!response.ok) {
            const errorBodyText = await response.text();
            console.error(`[NextAuth SignIn CB] Failed to sync user with Express backend. Status: ${responseStatus}, Body: ${errorBodyText}`);
            // Depending on policy, you might return false here to prevent sign-in if sync is critical.
            // return false; 
          } else {
            console.log('[NextAuth SignIn CB] User synced with Express backend successfully:', user.id);
          }
        } catch (error) {
          console.error('[NextAuth SignIn CB] Network or other error calling Express backend to sync user:', error);
          // return false; // Prevent sign-in if sync is critical
        }
      } else {
        console.warn("[NextAuth SignIn CB] Conditions for API sync NOT met or not a Google provider.");
        if (!expressApiUrl) console.error("[NextAuth SignIn CB] EXPRESS_API_URL is undefined.");
      }
      return true; // Allow sign-in. Backend sync failure is handled as a warning for now.
    },

    async jwt({ token, user, account, profile }) {
      // 'user', 'account', 'profile' are only passed on initial sign-in.
      // Subsequent calls only have 'token'.
      if (user) { // Initial sign-in
        token.sub = user.id; // Standard JWT subject, should be user's unique ID
        token.id = user.id;  // Explicitly add id for easier access in session callback
        
        // Store the name and image from OAuth directly into the token.
        // The session callback will later decide what to display (user-defined vs OAuth).
        token.nameFromOAuth = user.name; 
        token.email = user.email;
        token.imageFromOAuth = user.image;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      if (account?.provider === 'google' && profile) {
        const googleProfile = profile as GoogleProfile;
        token.email = googleProfile.email ?? token.email;
        token.name = googleProfile.name ?? token.name;
        token.picture = googleProfile.picture ?? token.picture;
        if (googleProfile.sub) {
            token.sub = googleProfile.sub;
            if (!token.id) {
                token.id = googleProfile.sub;
            }
        }
      }
      return token;
    },

    async session({ session, token }: { session: NextAuthSessionBase; token: JWT }): Promise<BudgetFloSession> {
      // The token object here is what the `jwt` callback returned.
      // We need to construct the `session.user` object that the client will see.
      // This should ideally reflect the `UserProfileView` structure after backend processing,
      // but the session callback doesn't re-fetch from the backend by default.
      // It builds the session from the token.
      
      // For now, the session will reflect what's in the token.
      // The actual `nameToDisplay` and `imageToDisplay` (which prefer user settings)
      // will be fetched by client components from the `/api/user-profile/:userId` BFF endpoint.
      const clientUser: BudgetFloSession['user'] = {
        id: (token.id as string) || token.sub || "", // Ensure ID is present
        name: (token.nameFromOAuth as string) ?? null, // Initially, use OAuth name
        email: (token.email as string) ?? null,
        image: (token.imageFromOAuth as string) ?? null, // Initially, use OAuth image
      };

      const resultSession: BudgetFloSession = {
        ...session, // Spread existing session properties like 'expires'
        user: clientUser,
        accessToken: token.accessToken as string | undefined,
        // idToken: token.idToken as string | undefined, // Pass if stored in JWT
      };
      return resultSession;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
