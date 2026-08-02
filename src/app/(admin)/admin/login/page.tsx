import { loginSchema } from "@/schemas/admin";
import { authenticateAdmin, createSessionToken, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/admin/login?e=1");
  }

  const session = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!session) {
    redirect("/admin/login?e=1");
  }

  const token = await createSessionToken(session);
  await setSessionCookie(token);
  redirect("/admin/dashboard");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e: error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            varcasvi_ Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <form
          action={login}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              Invalid email or password
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-500"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
