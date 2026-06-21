import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { useBreakpoint } from "@/lib/useBreakpoint";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { mobile } = useBreakpoint();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close the mobile overlay when the breakpoint leaves mobile
  useEffect(() => {
    if (!mobile) setMobileSidebarOpen(false);
  }, [mobile]);

  return (
    <div className={styles.shell} data-testid="app-shell">
      <TopBar
        isMobile={mobile}
        sidebarOpen={mobileSidebarOpen}
        onHamburgerClick={() => setMobileSidebarOpen((v) => !v)}
      />
      <div className={styles.body}>
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className={styles.content} data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
