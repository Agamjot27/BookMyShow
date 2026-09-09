"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCircle, Receipt, SignOut, User } from "@phosphor-icons/react";
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
          {([{ id: "profile", label: "Profile", icon: UserCircle }, { id: "orders", label: "Your Orders", icon: Receipt }] as const).map(item => (
            <button key={item.id} type="button" className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
              onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? "page" : undefined}>
              <item.icon size={20} /><span>{item.label}</span>
            </button>
          ))}
          <button type="button" className={styles.signOutBtn} onClick={async () => { await logout(); router.push("/login"); }}>
            <SignOut size={20} /><span>Sign Out</span>
          </button>
        </aside>
        <section className={styles.mainContent}>
          {activeTab === "orders" ? <OrderHistory /> : <>
            <div className={styles.userHeader}>
              <div className={styles.avatarCircle}><User size={54} weight="fill" /></div>
              <h1 className={styles.userName}>{session.user.name}</h1>
            </div>
            <h2 className={styles.sectionTitle}>Account Details</h2>
            <dl className={styles.formGrid}><div><dt>Name</dt><dd>{session.user.name}</dd></div><div><dt>Email</dt><dd>{session.user.email}</dd></div></dl>
          </>}
        </section>
      </div>
    </main>
  );
}
