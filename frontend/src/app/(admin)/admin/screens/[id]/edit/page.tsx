"use client";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { screensApi, type Screen } from "@/components/admin/admin-api";
import { ScreenForm } from "@/components/admin/screen-form";
import styles from "@/components/admin/admin.module.css";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session } = useAuth();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!session) return;
    screensApi.get(id, session.accessToken)
      .then(setScreen)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load screen"));
  }, [session, id]);

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!screen) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;
  return <ScreenForm screen={screen} />;
}
