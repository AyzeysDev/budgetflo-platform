// apps/web/src/lib/auth.ts
import {
  type NextAuthOptions,
  type User as NextAuthUser,
  type Account as NextAuthAccountType,
  type Profile as NextAuthProfileType,
  type Session as NextAuthSessionBase
} from "next-auth";
import { type JWT } from "next-auth/jwt"; // For typing the token in callbacks
import GoogleProvider from "next-auth/providers/google";

// Define a more specific Google Profile interface
interface GoogleProfile extends NextAuthProfileType {
  sub: string; // Google's unique ID (non-optional)
  picture?: string; // Google often uses 'picture' for the avatar URL
}

// AppUser is the structure NextAuth expects from the profile() function.
// NextAuthUser already includes id: string.
type AppUser = NextAuthUser; 

// Custom Session type for what the application will use client-side
interface BudgetFloSession extends NextAuthSessionBase {
  user?: {
    id: string; // Ensure 'id' is always present and a string
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
}

// Environment variable checks
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

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
    async jwt({
      token,
      user,
      account,
      profile
    }: { 
      token: JWT;
      user?: NextAuthUser; 
      account?: NextAuthAccountType | null;
      profile?: NextAuthProfileType | null; 
    }) { 
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
      const budgetFloSession = session as BudgetFloSession;
      if (!budgetFloSession.user) {
        budgetFloSession.user = { id: "" }; 
      }
      budgetFloSession.user.id = (token.id as string) || token.sub || ""; 
      budgetFloSession.user.name = (token.name as string) ?? null;
      budgetFloSession.user.email = (token.email as string) ?? null;
      budgetFloSession.user.image = (token.picture as string) ?? null; 
      budgetFloSession.accessToken = token.accessToken as string | undefined;
      return budgetFloSession;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
