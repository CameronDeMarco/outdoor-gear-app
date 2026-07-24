import type { DefaultSession } from "next-auth";

// Module augmentation: tell TypeScript that our session/token carry a user id.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
