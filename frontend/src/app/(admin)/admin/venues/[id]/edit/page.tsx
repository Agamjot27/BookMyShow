"use client";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { venuesApi, type Venue } from "@/components/admin/admin-api";
import { VenueForm } from "@/components/admin/venue-form";
import styles from "@/components/admin/admin.module.css";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    venuesApi.get(id, session.accessToken)
      .then(setVenue)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load venue"));
  }, [session, id]);

  if (error) return <div className={styles.page}><div className={styles.alertError}>{error}</div></div>;
  if (!venue) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;
  return <VenueForm venue={venue} />;
}
