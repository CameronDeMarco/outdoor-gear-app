"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    // 1) Create the account.
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create account.");
      setPending(false);
      return;
    }

    // 2) Log them straight in.
    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          Name <span className="muted">(optional)</span>
          <input type="text" name="name" autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password <span className="muted">(min 8 characters)</span>
          <input type="password" name="password" required minLength={8} autoComplete="new-password" />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn amber" disabled={pending}>
          {pending ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
