import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Sign in</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setLoading(true);
          try {
            await login(email, password);
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to sign in";
            setErr(message);
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-3"
      >
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full border p-2 rounded">{loading ? "Signing in..." : "Sign in"}</button>
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>
    </div>
  );
}
