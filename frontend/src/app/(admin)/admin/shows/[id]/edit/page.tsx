"use client";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { showsApi, type AdminShow } from "@/components/admin/admin-api";
import { ShowForm } from "@/components/admin/show-form";
import styles from "@/components/admin/admin.module.css";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session } = useAuth();
  const [show, setShow] = useState<AdminShow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    showsApi.get(id, session.accessToken)
      .then(setShow)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load show"));
  }, [session, id]);

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!show) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;
  return <ShowForm show={show} />;
}
