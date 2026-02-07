"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { CButton, CInput } from "@/components/climb/ui";
import { ClimbLogo } from "@/components/climb/icons";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/climb/toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.data.token, {
        _id: data.data._id,
        name: data.data.name,
        email: data.data.email,
        role: data.data.role
      });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-10 shadow-climb-2">
        <div className="flex flex-col items-center text-center">
          <ClimbLogo className="h-12 w-12" />
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back to CLIMB Intelligence Platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <CInput
              id="email"
              type="email"
              label="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="geologist@climb.com"
            />
            <CInput
              id="password"
              type="password"
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <CButton
              type="submit"
              variant="solid"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </CButton>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
