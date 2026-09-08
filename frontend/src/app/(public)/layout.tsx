import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import styles from "@/components/site-chrome.module.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.pageShell}>
      <SiteHeader />
      <div id="main-content" tabIndex={-1} className={styles.pageContent}>{children}</div>
      <SiteFooter />
    </div>
  );
}
