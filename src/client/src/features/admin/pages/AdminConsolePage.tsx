import { useState } from "react";
import { FeatureTogglesSection } from "../components/FeatureTogglesSection";
import { UserManagementSection } from "../components/UserManagementSection";
import { HealthDashboardSection } from "../components/HealthDashboardSection";
import { AuditLogSection } from "../components/AuditLogSection";
import { useTogglesHub } from "../hooks/useTogglesHub";
import styles from "./AdminConsolePage.module.css";

type Tab = "users" | "feature-toggles" | "health" | "audit-log";

export function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<Tab>("feature-toggles");

  // Wire SignalR connection to /hubs/toggles (AC-12)
  useTogglesHub();

  return (
    <div className={styles.page} data-testid="page-admin-console">
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Console</h1>
      </header>

      <nav className={styles.tabs} role="tablist">
        <button
          id="tab-feature-toggles"
          role="tab"
          aria-selected={activeTab === "feature-toggles"}
          aria-controls="panel-feature-toggles"
          data-testid="tab-feature-toggles"
          className={`${styles.tab} ${activeTab === "feature-toggles" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("feature-toggles")}
        >
          Feature Toggles
        </button>
        <button
          id="tab-users"
          role="tab"
          aria-selected={activeTab === "users"}
          aria-controls="panel-users"
          data-testid="tab-users"
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          id="tab-health"
          role="tab"
          aria-selected={activeTab === "health"}
          aria-controls="panel-health"
          data-testid="tab-health"
          className={`${styles.tab} ${activeTab === "health" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("health")}
        >
          Health
        </button>
        <button
          id="tab-audit-log"
          role="tab"
          aria-selected={activeTab === "audit-log"}
          aria-controls="panel-audit-log"
          data-testid="tab-audit-log"
          className={`${styles.tab} ${activeTab === "audit-log" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("audit-log")}
        >
          Audit Log
        </button>
      </nav>

      <div className={styles.content}>
        {activeTab === "feature-toggles" && (
          <div
            role="tabpanel"
            id="panel-feature-toggles"
            aria-labelledby="tab-feature-toggles"
          >
            <FeatureTogglesSection />
          </div>
        )}

        {activeTab === "users" && (
          <div role="tabpanel" id="panel-users" aria-labelledby="tab-users">
            <UserManagementSection />
          </div>
        )}

        {activeTab === "health" && (
          <div role="tabpanel" id="panel-health" aria-labelledby="tab-health">
            <HealthDashboardSection />
          </div>
        )}

        {activeTab === "audit-log" && (
          <div
            role="tabpanel"
            id="panel-audit-log"
            aria-labelledby="tab-audit-log"
          >
            <AuditLogSection />
          </div>
        )}
      </div>
    </div>
  );
}
