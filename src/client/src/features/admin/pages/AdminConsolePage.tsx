import { useState } from "react";
import { FeatureTogglesSection } from "../components/FeatureTogglesSection";
import { useTogglesHub } from "../hooks/useTogglesHub";
import styles from "./AdminConsolePage.module.css";

type Tab = "feature-toggles" | "health" | "audit-log";

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
          <div role="tabpanel" id="panel-feature-toggles" aria-labelledby="tab-feature-toggles">
            <FeatureTogglesSection />
          </div>
        )}

        {activeTab === "health" && (
          <div role="tabpanel" id="panel-health" aria-labelledby="tab-health" className={styles.placeholder}>
            <p>Coming in Story 5.3</p>
          </div>
        )}

        {activeTab === "audit-log" && (
          <div role="tabpanel" id="panel-audit-log" aria-labelledby="tab-audit-log" className={styles.placeholder}>
            <p>Coming in Story 5.3</p>
          </div>
        )}
      </div>
    </div>
  );
}
