"use client";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { eventsApi, type AdminEvent } from "@/components/admin/admin-api";
import { EventForm } from "@/components/admin/event-form";
import styles from "@/components/admin/admin.module.css";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session } = useAuth();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    eventsApi.get(id, session.accessToken)
      .then(setEvent)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load event"));
  }, [session, id]);

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!event) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;
  return <EventForm event={event} />;
}
