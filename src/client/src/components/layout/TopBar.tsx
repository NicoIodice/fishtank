import { useEffect, useState } from "react";
import { AboutModal } from "@/components/modals/AboutModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadCount } from "@/features/events/hooks/useSystemEvents";
import { NotificationBadge } from "@/features/events/components/NotificationBadge";
import { NotificationPanel } from "@/features/events/components/NotificationPanel";
import styles from "./TopBar.module.css";

interface TopBarProps {
  sidebarOpen?: boolean;
  onHamburgerClick?: () => void;
  isMobile?: boolean;
}

export function TopBar({
  sidebarOpen = false,
  onHamburgerClick,
  isMobile = false,
}: TopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();

  // Close the notification panel on any navigation (sidebar/logo/back/forward) — AC-9
  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  // Close the notification panel on Esc — AC-9
  useEffect(() => {
    if (!panelOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setAvatarOpen(false);
    setSigningOut(true);
    try {
      await apiFetch<null>("/api/auth/logout", {
        method: "POST",
        redirectOn401: false,
      });
    } catch {
      // Even on network failure, clear local state and redirect
    }
    qc.clear();
    navigate("/login", { replace: true });
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <>
      <header className={styles.topbar} data-testid="top-bar">
        <div className={styles.left}>
          {isMobile && (
            <button
              className={styles.iconBtn}
              onClick={onHamburgerClick}
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-controls="main-sidebar"
              aria-expanded={sidebarOpen}
              data-testid="hamburger-button"
            >
              <i className="bi bi-list" aria-hidden="true" />
            </button>
          )}
          <div className={styles.logo} data-testid="topbar-logo">
            <i
              className="bi bi-droplet-half"
              aria-hidden="true"
              style={{ color: "var(--brand)" }}
            />
            <span className={styles.wordmark}>Fishtank</span>
          </div>
        </div>

        <div className={styles.right}>
          <button
            className={styles.iconBtn}
            aria-label="About Fishtank"
            onClick={() => setAboutOpen(true)}
            data-testid="topbar-about-button"
          >
            <i className="bi bi-info-circle" aria-hidden="true" />
          </button>

          <div className={styles.bellWrapper}>
            <button
              className={styles.iconBtn}
              aria-label="Notifications — warnings and errors"
              aria-haspopup="true"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
              data-testid="topbar-btn-bell"
            >
              <i className="bi bi-bell" aria-hidden="true" />
              <NotificationBadge count={unread} />
            </button>

            {panelOpen && (
              <>
                <div
                  className={styles.dropdownBackdrop}
                  onClick={() => setPanelOpen(false)}
                />
                <NotificationPanel onClose={() => setPanelOpen(false)} />
              </>
            )}
          </div>

          <div className={styles.avatarWrapper}>
            <button
              className={styles.avatarBtn}
              onClick={() => setAvatarOpen((v) => !v)}
              aria-label={user ? `${user.username}, ${user.role}` : "User menu"}
              aria-expanded={avatarOpen}
              aria-haspopup="menu"
              data-testid="topbar-avatar-button"
            >
              <span className={styles.avatar}>{initials}</span>
            </button>

            {avatarOpen && (
              <>
                <div
                  className={styles.dropdownBackdrop}
                  onClick={() => setAvatarOpen(false)}
                />
                <ul className={styles.dropdown} role="menu">
                  {user && (
                    <li className={styles.dropdownHeader} role="presentation">
                      <span className={styles.dropdownUsername}>
                        {user.username}
                      </span>
                      <span className={styles.dropdownRole}>{user.role}</span>
                    </li>
                  )}
                  <li role="presentation">
                    <button
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        void handleSignOut();
                      }}
                      data-testid="topbar-signout-button"
                    >
                      <i className="bi bi-box-arrow-right" aria-hidden="true" />
                      Sign out
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      </header>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}
