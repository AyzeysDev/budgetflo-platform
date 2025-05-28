// apps/web/src/lib/auth.ts
import {
  type NextAuthOptions,
  type User as NextAuthUser,
  // type Account,
  type Profile as NextAuthProfileType,
  type Session as NextAuthSessionBase
} from "next-auth";
import { type JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

interface GoogleProfile extends NextAuthProfileType {
  sub: string;
  picture?: string;
}

type AppUser = NextAuthUser;

interface BudgetFloSession extends Omit<NextAuthSessionBase, 'user'> {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const expressApiUrl = process.env.EXPRESS_API_URL;
const backendSecret = process.env.BACKEND_API_SECRET; // Loaded at module level

if (!googleClientId) {
  throw new Error("Missing GOOGLE_CLIENT_ID environment variable from /lib/auth.ts");
}
if (!googleClientSecret) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET environment variable from /lib/auth.ts");
}
if (!nextAuthSecret) {
  console.warn("Missing NEXTAUTH_SECRET from /lib/auth.ts: This is required for production and JWT signing.");
  throw new Error("Missing NEXTAUTH_SECRET environment variable from /lib/auth.ts");
}
if (!expressApiUrl) {
  console.warn("Missing EXPRESS_API_URL from /lib/auth.ts: Required to sync user data with the backend.");
}
// Check if API expects a secret (by checking if BFF_API_SECRET is set in apps/api, which we can't do directly here)
// Instead, we check if *this* app (apps/web) has its BACKEND_API_SECRET.
if (!backendSecret) {
    console.warn("[Auth Setup] BACKEND_API_SECRET is NOT set in apps/web/.env.local. Calls to Express API will not include X-Internal-Api-Secret header.");
} else {
    console.log("[Auth Setup] BACKEND_API_SECRET is SET in apps/web/.env.local.");
}


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile: GoogleProfile): AppUser {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture || profile.image,
        };
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: nextAuthSecret,
  pages: {
    signIn: "/#hero-section",
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log("[Auth SignIn CB] Initiated for user:", user?.email);
      console.log("[Auth SignIn CB] Account provider:", account?.provider);

      if (account?.provider === "google" && user?.id && user?.email && expressApiUrl) {
        console.log("[Auth SignIn CB] Conditions met for API sync.");
        const syncPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };

        const requestHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (backendSecret) {
          requestHeaders['X-Internal-Api-Secret'] = backendSecret;
          console.log("[Auth SignIn CB] Prepared to send WITH X-Internal-Api-Secret header.");
        } else {
          console.warn("[Auth SignIn CB] BACKEND_API_SECRET is not set. Sending request WITHOUT X-Internal-Api-Secret header.");
        }

        console.log(`[Auth SignIn CB] Fetching: POST ${expressApiUrl}/users/sync`);
        console.log("[Auth SignIn CB] Payload:", JSON.stringify(syncPayload));
        console.log("[Auth SignIn CB] Headers:", JSON.stringify(requestHeaders));

        try {
          const response = await fetch(`${expressApiUrl}/users/sync`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(syncPayload),
          });

          const responseStatus = response.status;
          const responseBodyText = await response.text(); // Get text first to avoid JSON parse error on non-JSON

          console.log(`[Auth SignIn CB] Express API Response Status: ${responseStatus}`);
          console.log(`[Auth SignIn CB] Express API Response Body: ${responseBodyText}`);

          if (!response.ok) {
            console.error(`[Auth SignIn CB] Failed to sync user with Express backend. Status: ${responseStatus}`);
            // Optionally, parse errorData if response is JSON
            try {
                const errorData = JSON.parse(responseBodyText);
                console.error("[Auth SignIn CB] Error data from API:", errorData);
            } catch (e) {
                // Not a JSON error response
                console.error("[Auth SignIn CB] Error data from API:", e);
            }
            // return false; // To prevent sign-in if sync is critical
          } else {
            console.log('[Auth SignIn CB] User synced with Express backend successfully:', user.id);
          }
        } catch (error) {
          console.error('[Auth SignIn CB] Network or other error calling Express backend to sync user:', error);
          // return false; // To prevent sign-in if sync is critical
        }
      } else {
        console.warn("[Auth SignIn CB] Conditions for API sync NOT met.");
        if (!expressApiUrl) console.error("[Auth SignIn CB] EXPRESS_API_URL is undefined or empty.");
        if (!user?.id) console.error("[Auth SignIn CB] user.id is missing.");
        if (!user?.email) console.error("[Auth SignIn CB] user.email is missing.");
      }
      return true; // Allow sign-in regardless of sync success for now
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
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
      const budgetFloUser: BudgetFloSession['user'] = {
        id: (token.id as string) || token.sub || "",
        name: (token.name as string) ?? null,
        email: (token.email as string) ?? null,
        image: (token.picture as string) ?? null,
      };
      const resultSession: BudgetFloSession = {
        user: budgetFloUser,
        expires: session.expires,
        accessToken: token.accessToken as string | undefined,
      };
      return resultSession;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
