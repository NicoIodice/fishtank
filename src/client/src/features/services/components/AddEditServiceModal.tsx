import { useState, useEffect } from "react";
import {
  useNextPort,
  useCreateService,
  useUpdateService,
} from "../hooks/useServices";
import type { Service } from "../types/service";
import { ApiError } from "@/lib/api";
import styles from "./AddEditServiceModal.module.css";

interface AddEditServiceModalProps {
  mode: "add" | "edit";
  service?: Service;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  name: string;
  description: string;
  externalUrl: string;
  port: string;
  tags: string[];
}

interface FormErrors {
  name?: string;
  externalUrl?: string;
  port?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function AddEditServiceModal({
  mode,
  service,
  onClose,
  onSuccess,
}: AddEditServiceModalProps) {
  const isEdit = mode === "edit";

  const [values, setValues] = useState<FormValues>(() => ({
    name: service?.name ?? "",
    description: service?.description ?? "",
    externalUrl: service?.externalUrl ?? "",
    port: service?.port?.toString() ?? "",
    tags: service?.tags ? [...service.tags] : [],
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [debouncedName, setDebouncedName] = useState(values.name);

  // Debounce name field for path preview (200ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(values.name), 200);
    return () => clearTimeout(timer);
  }, [values.name]);

  const slug = generateSlug(debouncedName);
  const originalSlug = service ? generateSlug(service.name) : null;
  const slugChanged =
    isEdit &&
    originalSlug !== null &&
    slug !== originalSlug &&
    slug.length >= 2;
  const mocksRootPreview =
    slug.length >= 2 ? `/app/mocks/${slug}` : "/app/mocks/...";

  // Next port pre-fill (Add mode only)
  const { data: nextPort } = useNextPort();
  useEffect(() => {
    if (!isEdit && nextPort && !values.port) {
      setValues((v) => ({ ...v, port: String(nextPort) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPort, isEdit]);

  const createService = useCreateService();
  const updateService = useUpdateService();
  const isPending = createService.isPending || updateService.isPending;

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.name.trim()) {
      errs.name = "Service name is required.";
    } else if (values.name.trim().length > 64) {
      errs.name = "Service name must be 64 characters or fewer.";
    } else if (
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(values.name)
    ) {
      errs.name = "Service name must not contain emoji.";
    }
    if (!values.externalUrl.trim()) {
      errs.externalUrl = "External URL is required.";
    } else if (!/^https?:\/\/.+/.test(values.externalUrl.trim())) {
      errs.externalUrl = "External URL must start with http:// or https://";
    }
    const portNum = Number(values.port);
    if (!values.port.toString().trim() || isNaN(portNum)) {
      errs.port = "Port is required.";
    } else if (portNum < 30100 || portNum > 30199) {
      errs.port = "Port must be in the range 30100–30199.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      externalUrl: values.externalUrl.trim(),
      port: Number(values.port),
      tags: values.tags,
    };

    try {
      if (isEdit && service) {
        await updateService.mutateAsync({ id: service.id, payload });
      } else {
        await createService.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.code === "SERVICE_NAME_REQUIRED" ||
          err.code === "SERVICE_NAME_TOO_LONG" ||
          err.code === "SERVICE_NAME_INVALID" ||
          err.code === "SERVICE_SLUG_CONFLICT"
        ) {
          setErrors((e) => ({ ...e, name: err.message }));
        } else if (
          err.code === "SERVICE_PORT_CONFLICT" ||
          err.code === "SERVICE_PORT_OUT_OF_RANGE" ||
          err.code === "SERVICE_PORT_RANGE_EXHAUSTED"
        ) {
          setErrors((e) => ({ ...e, port: err.message }));
        } else if (err.code === "SERVICE_URL_INVALID") {
          setErrors((e) => ({ ...e, externalUrl: err.message }));
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function addTag(raw: string) {
    const parts = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const newTags = parts.filter((t) => !values.tags.includes(t));
    if (newTags.length > 0) {
      setValues((v) => ({ ...v, tags: [...v.tags, ...newTags] }));
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }));
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
        data-testid="service-modal"
      >
        <div className={styles.header}>
          <h2 id="service-modal-title" className={styles.title}>
            {isEdit ? `Edit "${service?.name}"` : "Add Service"}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close service modal"
            type="button"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Service Name */}
          <div className={styles.fieldGroup}>
            <label
              htmlFor="svc-name"
              className={`${styles.label} ${styles.required}`}
            >
              Service Name
            </label>
            <input
              id="svc-name"
              className={`${styles.input} ${errors.name ? styles.hasError : ""}`}
              type="text"
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
              onBlur={() => setErrors(validate())}
              placeholder="My API"
              aria-describedby={errors.name ? "svc-name-error" : undefined}
              data-testid="input-service-name"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            {errors.name && (
              <span
                id="svc-name-error"
                className={styles.errorMsg}
                role="alert"
              >
                {errors.name}
              </span>
            )}
          </div>

          {/* Slug-change warning (edit mode) */}
          {slugChanged && (
            <div
              className={styles.slugWarning}
              role="alert"
              data-testid="slug-change-warning"
            >
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              <span>
                Renaming this service will change its Slug from{" "}
                <strong>{originalSlug}</strong> to <strong>{slug}</strong>. The
                Mocks Root directory will need to be renamed to match.
              </span>
            </div>
          )}

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label htmlFor="svc-desc" className={styles.label}>
              Description{" "}
              <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id="svc-desc"
              className={styles.input}
              type="text"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              placeholder="Short description"
              data-testid="input-service-description"
            />
          </div>

          {/* External URL */}
          <div className={styles.fieldGroup}>
            <label
              htmlFor="svc-url"
              className={`${styles.label} ${styles.required}`}
            >
              External URL
            </label>
            <input
              id="svc-url"
              className={`${styles.input} ${errors.externalUrl ? styles.hasError : ""}`}
              type="url"
              value={values.externalUrl}
              onChange={(e) =>
                setValues((v) => ({ ...v, externalUrl: e.target.value }))
              }
              onBlur={() => setErrors(validate())}
              placeholder="https://api.example.com"
              aria-describedby={
                errors.externalUrl ? "svc-url-error" : undefined
              }
              data-testid="input-service-url"
            />
            {errors.externalUrl && (
              <span id="svc-url-error" className={styles.errorMsg} role="alert">
                {errors.externalUrl}
              </span>
            )}
          </div>

          {/* Port */}
          <div className={styles.fieldGroup}>
            <label
              htmlFor="svc-port"
              className={`${styles.label} ${styles.required}`}
            >
              Port
            </label>
            <input
              id="svc-port"
              className={`${styles.input} ${errors.port ? styles.hasError : ""}`}
              type="number"
              value={values.port}
              onChange={(e) =>
                setValues((v) => ({ ...v, port: e.target.value }))
              }
              onBlur={() => setErrors(validate())}
              min={30100}
              max={30199}
              placeholder="30100–30199"
              aria-describedby={errors.port ? "svc-port-error" : undefined}
              data-testid="input-service-port"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            />
            {errors.port && (
              <span
                id="svc-port-error"
                className={styles.errorMsg}
                role="alert"
              >
                {errors.port}
              </span>
            )}
          </div>

          {/* Mocks Root preview (read-only, informational) */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Mocks Root{" "}
              <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>
                (computed, read-only)
              </span>
            </label>
            <div
              className={styles.readonlyPath}
              aria-readonly="true"
              data-testid="readonly-mocks-root"
            >
              {mocksRootPreview}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.fieldGroup}>
            <label htmlFor="svc-tags" className={styles.label}>
              Tags{" "}
              <span style={{ color: "var(--content-muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            {values.tags.length > 0 && (
              <div className={styles.tagChips}>
                {values.tags.map((tag) => (
                  <span key={tag} className={styles.tagChip}>
                    {tag}
                    <button
                      type="button"
                      className={styles.tagRemove}
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <i className="bi bi-x" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              id="svc-tags"
              className={styles.tagInput}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInput.trim()) {
                  addTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder="Enter tag, press Enter or comma to add"
              data-testid="input-service-tags"
            />
          </div>

          {/* Submit error (non-field) */}
          {submitError && (
            <div
              className={styles.errorMsg}
              role="alert"
              data-testid="submit-error"
            >
              {submitError}
            </div>
          )}

          {/* Footer inside form so submit button works */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              data-testid="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isPending}
              data-testid="btn-submit-service"
            >
              {isPending
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
