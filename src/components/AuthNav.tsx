import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "./SignOutButton";

/**
 * Header auth area. Server component — reads the session on the server and shows
 * either the logged-in menu (Favorites + name + sign out) or login/signup links.
 */
export async function AuthNav() {
  const session = await auth();

  if (session?.user) {
    return (
      <nav className="auth-nav">
        <Link href="/favorites" className="auth-link">
          ♥ Favorites
        </Link>
        <span className="auth-user">{session.user.name || session.user.email}</span>
        <SignOutButton />
      </nav>
    );
  }

  return (
    <nav className="auth-nav">
      <Link href="/login" className="auth-link">
        Log in
      </Link>
      <Link href="/signup" className="auth-link primary">
        Sign up
      </Link>
    </nav>
  );
}
