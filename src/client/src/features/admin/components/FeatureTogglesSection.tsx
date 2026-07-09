import { useState } from "react";
import { useToggles } from "../hooks/useToggles";
import styles from "./FeatureTogglesSection.module.css";

interface ConfirmDialogState {
  open: boolean;
  toggleName: string;
  toggleDisplayName: string;
}

export function FeatureTogglesSection() {
  const { toggles, isLoading, setToggle, isSettingToggle } = useToggles();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    toggleName: "",
    toggleDisplayName: "",
  });

  function handleToggleChange(
    name: string,
    displayName: string,
    currentEnabled: boolean,
    isLocked: boolean,
  ) {
    if (isLocked) {
      // AC-9: Locked toggles are disabled and cannot be changed
      return;
    }

    if (currentEnabled) {
      // AC-6: Disabling requires confirmation
      setConfirmDialog({
        open: true,
        toggleName: name,
        toggleDisplayName: displayName,
      });
    } else {
      // AC-7: Enabling requires no confirmation
      setToggle({ name, enabled: true });
    }
  }

  function handleConfirmDisable() {
    setToggle({ name: confirmDialog.toggleName, enabled: false });
    setConfirmDialog({ open: false, toggleName: "", toggleDisplayName: "" });
  }

  function handleCancelDisable() {
    setConfirmDialog({ open: false, toggleName: "", toggleDisplayName: "" });
  }

  if (isLoading) {
    return <div>Loading toggles...</div>;
  }

  return (
    <div className={styles.section} data-testid="section-feature-toggles">
      <table className={styles.table} data-testid="table-toggles">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Description</th>
            <th className={styles.stateCol}>State</th>
            <th>Last Modified</th>
          </tr>
        </thead>
        <tbody>
          {toggles.map((toggle) => {
            const isLocked = toggle.envVarOverride !== null;
            const effectiveEnabled = isLocked
              ? toggle.envVarOverride!
              : toggle.enabled;

            return (
              <tr key={toggle.name} data-testid={`toggle-row-${toggle.name}`}>
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.displayName}>
                      {toggle.displayName}
                    </span>
                    {isLocked && (
                      <span
                        className={styles.lockedBadge}
                        data-testid={`toggle-env-badge-${toggle.name}`}
                        title={`This toggle is locked by environment variable FISHTANK_TOGGLE_${toggle.name.toUpperCase()} and cannot be changed at runtime.`}
                      >
                        Overridden by env var
                      </span>
                    )}
                  </div>
                </td>
                <td>{toggle.description}</td>
                <td className={styles.stateCol}>
                  <label
                    className={`${styles.toggle} ${isLocked ? styles.toggleDisabled : ""}`}
                    title={
                      isLocked
                        ? `This toggle is locked by environment variable FISHTANK_TOGGLE_${toggle.name.toUpperCase()} and cannot be changed at runtime.`
                        : ""
                    }
                  >
                    <input
                      type="checkbox"
                      checked={effectiveEnabled}
                      onChange={() =>
                        handleToggleChange(
                          toggle.name,
                          toggle.displayName,
                          effectiveEnabled,
                          isLocked,
                        )
                      }
                      disabled={isLocked || isSettingToggle}
                      aria-disabled={isLocked}
                      data-testid={`toggle-switch-${toggle.name}`}
                    />
                    <span className={styles.toggleTrack} />
                    <span className={styles.toggleThumb} />
                  </label>
                </td>
                <td>{new Date(toggle.updatedAt).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {confirmDialog.open && (
        <div
          className={styles.backdrop}
          onClick={(e) => e.target === e.currentTarget && handleCancelDisable()}
          role="presentation"
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disable-toggle-title"
            data-testid="dialog-toggle-disable"
          >
            <div className={styles.dialogHeader}>
              <h2 id="disable-toggle-title" className={styles.dialogTitle}>
                Disable {confirmDialog.toggleDisplayName}?
              </h2>
            </div>

            <p className={styles.dialogBody}>
              This will take effect immediately for all active sessions.
            </p>

            <div className={styles.dialogActions}>
              <button
                data-testid="dialog-toggle-disable-cancel"
                onClick={handleCancelDisable}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                data-testid="dialog-toggle-disable-confirm"
                onClick={handleConfirmDisable}
                className={styles.disableBtn}
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
