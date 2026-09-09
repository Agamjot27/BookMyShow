"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCircle, Receipt, SignOut, X, Check, CalendarBlank, FilmSlate, Ticket } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import { OrderHistory } from "./order-history";
import styles from "./profile.module.css";

export type ProfileTab = "profile" | "orders";
export function ProfilePage({ initialTab = "profile" }: { initialTab?: ProfileTab }) {
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  if (loading) return <main className={styles.pageWrapper}>Loading account…</main>;
  if (!session) return <main className={styles.pageWrapper}><Link href="/login?from=/profile">Sign in to view your account</Link></main>;
  return (
    <main className={styles.pageWrapper} id="profile-main-section">
      <div className={styles.container}>
        <aside className={styles.sidebar} aria-label="Profile navigation">
          <div className={styles.accountHeading}><h2>My Account</h2><Link href="/" aria-label="Close account page"><X size={24} weight="thin" /></Link></div>
          {([{ id: "profile", label: "Profile", icon: UserCircle }, { id: "orders", label: "Your Orders", icon: Receipt }] as const).map(item => (
            <button key={item.id} type="button" className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
              onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? "page" : undefined}>
              <item.icon size={26} weight="thin" /><span>{item.label}</span>{activeTab === item.id && <span className={styles.activeCaret}>▸</span>}
            </button>
          ))}
          <Link href="/movies" className={styles.navItem}><FilmSlate size={26} weight="thin" /><span>Browse Movies</span></Link>
          <Link href="/events" className={styles.navItem}><Ticket size={26} weight="thin" /><span>Explore Events</span></Link>
          <button type="button" className={styles.signOutBtn} onClick={async () => { await logout(); router.push("/login"); }}>
            <SignOut size={20} /><span>Sign Out</span>
          </button>
        </aside>
        <section className={styles.mainContent}>
          {activeTab === "orders" ? <OrderHistory /> : <>
            <div className={styles.userHeader}>
              <div className={styles.avatarCircle} aria-hidden="true"><svg viewBox="0 0 200 200"><circle cx="100" cy="67" r="41" fill="currentColor" /><path d="M15 200v-12c0-40 38-62 85-62s85 22 85 62v12Z" fill="currentColor" /></svg></div>
              <h1 className={styles.userName}>{session.user.name}</h1>
            </div>
            <h2 className={styles.sectionTitle}>Account Details</h2>
            <div className={styles.formGrid}>
              <label className={styles.profileField}>Mobile Number<div className={styles.profileInput}><input value="" placeholder="Not provided" readOnly aria-describedby="profile-readonly-note" /></div></label>
              <label className={styles.profileField}>Email Address<div className={styles.profileInput}><input value={session.user.email} readOnly /><Check size={17} color="#188148" aria-label="Verified email" /></div></label>
            </div>
            <h2 className={styles.sectionTitle}>Personal Details</h2>
            <div className={styles.formGrid}>
              <label className={styles.profileField}>Name<div className={styles.profileInput}><input value={session.user.name} readOnly /></div></label>
              <label className={styles.profileField}>Birthday (Optional)<div className={styles.profileInput}><input value="" placeholder="Not provided" readOnly aria-describedby="profile-readonly-note" /><CalendarBlank size={22} /></div></label>
              <label className={styles.profileField}>Identity (Optional)<div className={styles.profileInput}><input value="" placeholder="Not provided" readOnly aria-describedby="profile-readonly-note" /></div></label>
            </div>
            <p id="profile-readonly-note" className={styles.readonlyNote}>Account details are read-only. Profile editing and additional personal details are not available yet.</p>
          </>}
        </section>
      </div>
    </main>
  );
}
