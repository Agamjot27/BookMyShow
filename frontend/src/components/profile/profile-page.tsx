"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  UserCircle,
  Receipt,
  Desktop,
  FilmStrip,
  Heart,
  CreditCard,
  Gift,
  SignOut,
  PencilSimple,
  Check,
  CalendarBlank,
  User,
} from "@phosphor-icons/react";
import { initialUserProfile, type UserProfile } from "./profile-data";
import { OrderHistory } from "./order-history";
import styles from "./profile.module.css";

export type ProfileTab =
  | "profile"
  | "orders"
  | "devices"
  | "stream"
  | "wishlist"
  | "quikpay"
  | "rewards";

interface NavItemConfig {
  id: ProfileTab;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItemConfig[] = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "orders", label: "Your Orders", icon: Receipt },
  { id: "devices", label: "Saved Devices", icon: Desktop },
  { id: "stream", label: "Stream Library", icon: FilmStrip },
  { id: "wishlist", label: "Your Wishlist", icon: Heart },
  { id: "quikpay", label: "QuikPay", icon: CreditCard },
  { id: "rewards", label: "Rewards", icon: Gift },
];

export function ProfilePage({
  initialTab = "profile",
}: {
  initialTab?: ProfileTab;
}) {
  const router = useRouter();
  const { session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => ({
    ...initialUserProfile,
    name: session?.user?.name ?? initialUserProfile.name,
    email: session?.user?.email ?? initialUserProfile.email,
  }));
  const [editingMobile, setEditingMobile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setUserProfile((prev) => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email,
      }));
    }
  }, [session]);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setEditingMobile(false);
    setEditingEmail(false);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <main className={styles.pageWrapper} id="profile-main-section">
      <div className={styles.container}>
        {/* ================================================================ */}
        {/* LEFT SIDEBAR NAVIGATION                                          */}
        {/* ================================================================ */}
        <aside className={styles.sidebar} aria-label="Profile navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${
                  isActive ? styles.navItemActive : ""
                }`}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} className={styles.navItemIcon} />
                <span className={styles.navItemLabel}>{item.label}</span>
                {isActive && <span className={styles.activeCaret}>▸</span>}
              </button>
            );
          })}

          {/* Sign Out Button */}
          <button
            type="button"
            className={styles.signOutBtn}
            onClick={handleSignOut}
          >
            <SignOut size={20} />
            <span>Sign Out</span>
          </button>
        </aside>

        {/* ================================================================ */}
        {/* RIGHT MAIN CONTENT AREA                                          */}
        {/* ================================================================ */}
        <section className={styles.mainContent}>
          {activeTab === "orders" ? (
            /* YOUR ORDERS VIEW (Screenshot 2) */
            <OrderHistory />
          ) : activeTab === "profile" ? (
            /* PROFILE VIEW (Screenshot 1) */
            <form onSubmit={handleSave}>
              {/* User Avatar & Name */}
              <div className={styles.userHeader}>
                <div className={styles.avatarCircle}>
                  <div className={styles.avatarSilhouette}>
                    <User size={54} weight="fill" />
                  </div>
                </div>
                <h1 className={styles.userName}>{userProfile.name}</h1>
              </div>

              {/* Account Details Section */}
              <h2 className={styles.sectionTitle}>Account Details</h2>
              <div className={styles.formGrid}>
                {/* Mobile Number */}
                <div className={styles.formField}>
                  <div className={styles.fieldHeader}>
                    <span>Mobile Number</span>
                    <button
                      type="button"
                      className={styles.editActionBtn}
                      onClick={() => setEditingMobile(!editingMobile)}
                    >
                      <PencilSimple size={14} />
                      <span>{editingMobile ? "Done" : "Edit"}</span>
                    </button>
                  </div>

                  <div className={styles.verifiedInputBox}>
                    <input
                      type="text"
                      className={styles.verifiedInput}
                      value={userProfile.mobile}
                      disabled={!editingMobile}
                      onChange={(e) =>
                        setUserProfile({
                          ...userProfile,
                          mobile: e.target.value,
                        })
                      }
                      aria-label="Mobile Number"
                    />
                    <Check size={16} weight="bold" className={styles.checkIcon} />
                  </div>
                </div>

                {/* Email Address */}
                <div className={styles.formField}>
                  <div className={styles.fieldHeader}>
                    <span>Email Address</span>
                    <button
                      type="button"
                      className={styles.editActionBtn}
                      onClick={() => setEditingEmail(!editingEmail)}
                    >
                      <PencilSimple size={14} />
                      <span>{editingEmail ? "Done" : "Edit"}</span>
                    </button>
                  </div>

                  <div className={styles.verifiedInputBox}>
                    <input
                      type="email"
                      className={styles.verifiedInput}
                      value={userProfile.email}
                      disabled={!editingEmail}
                      onChange={(e) =>
                        setUserProfile({
                          ...userProfile,
                          email: e.target.value,
                        })
                      }
                      aria-label="Email Address"
                    />
                    <Check size={16} weight="bold" className={styles.checkIcon} />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <h2 className={styles.sectionTitle}>Personal Details</h2>
              <div className={styles.formGrid}>
                {/* First Name */}
                <div className={styles.formField}>
                  <label htmlFor="first-name" className={styles.fieldHeader}>
                    <span>
                      First Name <span className={styles.requiredAsterisk}>*</span>
                    </span>
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    className={styles.inputField}
                    placeholder="Enter first name here"
                    value={userProfile.firstName || ""}
                    onChange={(e) =>
                      setUserProfile({
                        ...userProfile,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Last Name */}
                <div className={styles.formField}>
                  <label htmlFor="last-name" className={styles.fieldHeader}>
                    <span>
                      Last Name <span className={styles.requiredAsterisk}>*</span>
                    </span>
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    className={styles.inputField}
                    placeholder="Enter last name here"
                    value={userProfile.lastName || ""}
                    onChange={(e) =>
                      setUserProfile({
                        ...userProfile,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Birthday */}
                <div className={styles.formField}>
                  <label htmlFor="birthday" className={styles.fieldHeader}>
                    <span>Birthday (Optional)</span>
                  </label>
                  <div className={styles.verifiedInputBox}>
                    <input
                      id="birthday"
                      type="text"
                      placeholder="dd-mm-yyyy"
                      className={styles.verifiedInput}
                      value={userProfile.birthday || ""}
                      onChange={(e) =>
                        setUserProfile({
                          ...userProfile,
                          birthday: e.target.value,
                        })
                      }
                    />
                    <CalendarBlank size={18} color="#555" />
                  </div>
                </div>

                {/* Identity */}
                <div className={styles.formField}>
                  <span className={styles.fieldHeader}>Identity (Optional)</span>
                  <div className={styles.identityGroup} role="group" aria-label="Identity">
                    {(["Woman", "Man"] as const).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        className={`${styles.identityBtn} ${
                          userProfile.identity === gender
                            ? styles.identityBtnActive
                            : ""
                        }`}
                        onClick={() =>
                          setUserProfile({
                            ...userProfile,
                            identity:
                              userProfile.identity === gender ? "" : gender,
                          })
                        }
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div>
                <button type="submit" className={styles.saveChangesBtn}>
                  {savedNotice ? "Details Saved ✓" : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            /* Other Tabs Placeholder */
            <div>
              <h2 className={styles.sectionTitle}>
                {navItems.find((n) => n.id === activeTab)?.label}
              </h2>
              <p style={{ color: "#666", fontSize: 14 }}>
                This section is currently being synced with your account services.
              </p>
              <button
                type="button"
                className={styles.saveChangesBtn}
                onClick={() => setActiveTab("profile")}
                style={{ marginTop: 20 }}
              >
                Back to Profile
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
