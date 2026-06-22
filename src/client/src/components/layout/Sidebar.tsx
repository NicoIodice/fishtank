import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useBreakpoint } from "@/lib/useBreakpoint";
import styles from "./Sidebar.module.css";

const STORAGE_KEY = "fishtank-sidebar-collapsed";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  testId: string;
}

const navItems: NavItem[] = [
  {
    to: "/services",
    label: "Services",
    icon: "bi-server",
    testId: "sidebar-nav-services",
  },
  {
    to: "/activity",
    label: "Network Activity",
    icon: "bi-activity",
    testId: "sidebar-nav-activity",
  },
  {
    to: "/mappings",
    label: "Mappings",
    icon: "bi-file-earmark-code",
    testId: "sidebar-nav-mappings",
  },
  {
    to: "/events",
    label: "System Events",
    icon: "bi-journal-text",
    testId: "sidebar-nav-events",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "bi-gear",
    testId: "sidebar-nav-settings",
  },
];

interface SidebarProps {
  /** Mobile: whether the overlay sidebar is open */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { mobile, mid } = useBreakpoint();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (mid) return true; // default collapsed on mid-size tablet
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist collapse state on desktop/mid
  useEffect(() => {
    if (!mobile) {
      try {
        localStorage.setItem(STORAGE_KEY, String(collapsed));
      } catch {
        // storage unavailable or full — ignore
      }
    }
  }, [collapsed, mobile]);

  const [prevMid, setPrevMid] = useState(mid);
  // Reset collapse state when viewport transitions to mid-size (render-time update)
  if (prevMid !== mid) {
    setPrevMid(mid);
    if (mid) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setCollapsed(stored !== null ? stored === "true" : true);
      } catch {
        setCollapsed(true);
      }
    }
  }

  if (mobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={onMobileClose}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
        )}
        <nav
          id="main-sidebar"
          className={`${styles.sidebar} ${styles.mobile} ${mobileOpen ? styles.mobileOpen : ""}`}
          aria-label="Main navigation"
          data-testid="sidebar"
        >
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ""}`
                  }
                  data-testid={item.testId}
                  onClick={onMobileClose}
                >
                  {({ isActive }) => (
                    <>
                      <i className={`bi ${item.icon}`} aria-hidden="true" />
                      <span className={styles.label}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </>
    );
  }

  return (
    <nav
      id="main-sidebar"
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      aria-label="Main navigation"
      data-testid="sidebar"
    >
      <ul className={styles.navList}>
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
              data-testid={item.testId}
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  {!collapsed && (
                    <span className={styles.label}>{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className={styles.collapseWrapper}>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          data-testid="sidebar-collapse-toggle"
        >
          <i
            className={`bi bi-chevron-double-left collapse-chevron ${styles.chevron} ${collapsed ? styles.chevronRotated : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </nav>
  );
}
