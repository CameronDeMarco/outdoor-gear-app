// Auth.js mounts all its endpoints (sign-in, callback, session, csrf, etc.)
// under /api/auth/* via this single catch-all route.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
