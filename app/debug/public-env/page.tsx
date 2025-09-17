"use client"

export default function PublicEnvDebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const safe = {
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!supabaseUrl,
    hasAnonKey: !!anonKey,
    supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "",
    anonKeyLength: anonKey.length,
    anonKeyPreview: anonKey ? `${anonKey.substring(0, 10)}...` : "",
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Client Env Check (NEXT_PUBLIC only)
      </h1>
      <p style={{ color: "#475569", marginBottom: 16 }}>
        This page verifies whether NEXT_PUBLIC env vars were embedded into the client bundle at build time.
      </p>
      <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
        <div>
          <strong>nodeEnv:</strong> {safe.nodeEnv}
        </div>
        <div>
          <strong>hasSupabaseUrl:</strong> {String(safe.hasSupabaseUrl)}
        </div>
        <div>
          <strong>hasAnonKey:</strong> {String(safe.hasAnonKey)}
        </div>
        <div>
          <strong>supabaseUrlPreview:</strong> {safe.supabaseUrlPreview}
        </div>
        <div>
          <strong>anonKeyLength:</strong> {safe.anonKeyLength}
        </div>
        <div>
          <strong>anonKeyPreview:</strong> {safe.anonKeyPreview}
        </div>
      </div>
      <p style={{ color: "#64748b", marginTop: 16, fontSize: 14 }}>
        If <code>hasAnonKey</code> is false or <code>anonKeyLength</code> looks wrong in production, redeploy without build cache and confirm Vercel envs.
      </p>
    </div>
  );
}
