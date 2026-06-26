import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useServicesHub } from "@/features/services/hooks/useServicesHub";
import { useEventsHub } from "@/features/events/hooks/useEventsHub";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { mobile } = useBreakpoint();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [prevMobile, setPrevMobile] = useState(mobile);

  // Wire ServicesHub real-time connection (Story 2.3)
  useServicesHub();
  // Wire EventsHub real-time connection (Story 2.4)
  useEventsHub();

  // Close the mobile overlay when the breakpoint leaves mobile (render-time update)
  if (prevMobile !== mobile) {
    setPrevMobile(mobile);
    if (!mobile) setMobileSidebarOpen(false);
  }

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
