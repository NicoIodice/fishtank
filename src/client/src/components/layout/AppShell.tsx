import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useServicesHub } from "@/features/services/hooks/useServicesHub";
import { useEventsHub } from "@/features/events/hooks/useEventsHub";
import { useConnectionState } from "@/lib/useConnectionState";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { mobile } = useBreakpoint();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [prevMobile, setPrevMobile] = useState(mobile);
  const isDisconnected = useConnectionState();

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

      {/* Backend-unreachable banner (UX-DR11 — Story 3.2) */}
      {isDisconnected && (
        <div
          style={{
            position: "fixed",
            top: "44px",
            left: 0,
            right: 0,
            backgroundColor: "#fef2f2",
            borderBottom: "1px solid #fca5a5",
            padding: "12px 16px",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#991b1b",
            zIndex: 999,
          }}
        >
          Connection to Fishtank server lost — retrying…
        </div>
      )}

      <div
        className={styles.body}
        style={{ paddingTop: isDisconnected ? "48px" : undefined }}
      >
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
