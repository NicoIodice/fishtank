# Fishtank Architecture Diagrams

Mermaid diagrams for the Fishtank application. These render in VS Code Markdown Preview and GitHub.

---

## Deployment Overview

```mermaid
graph TB
    subgraph Docker["🐋 Docker Container (port 5000)"]
        subgraph DotNet[".NET 10 ASP.NET Core"]
            SPA["wwwroot/\n(React SPA static files)"]
            API["Minimal APIs"]
            SignalR["SignalR Hubs"]
            EF["EF Core + SQLite"]
        end
        subgraph WM["WireMock.Net Engine"]
            WM1["Mock Server :30100"]
            WM2["Mock Server :30101"]
            WM3["Mock Server :30N\n(max 100)"]
        end
        DB[("SQLite\n/app/data/fishtank.db")]
    end

    Browser["🌐 Browser\n(React 19 + Vite SPA)"]
    HostFS["🗂️ Host Filesystem\nmocks/ volume"]

    Browser -- "HTTP/S :5000\n(REST API)" --> API
    Browser -- "WebSocket :5000\n(SignalR)" --> SignalR
    Browser -- "static assets" --> SPA
    API --> EF --> DB
    API --> WM
    WM --> HostFS
```

---

## Backend Layer Breakdown

```mermaid
graph TB
    subgraph Endpoints["API Endpoints (Minimal APIs — all require JWT cookie auth)"]
        AE["AuthEndpoints\n/api/auth/*\nsetup · login · logout · me\nchange-password · /api/setup/status"]
        SE["ServicesEndpoints\n/api/services/*\nGET list · POST create · PUT update\nPOST /{id}/start · POST /{id}/stop\nGET next-port"]
        STE["SettingsEndpoints\nGET /api/settings"]
        EVE["SystemEventsEndpoints\nGET /api/system-events"]
    end

    subgraph Hubs["SignalR Hubs (JWT cookie auth required)"]
        SH["ServicesHub\n/hubs/services\n↑ ServiceStatusChanged\n{id, status}"]
        EH["EventsHub\n/hubs/events\n(Story 2.4 — skeleton)"]
    end

    subgraph Services["Business Services"]
        AS["AuthService\nJWT issuance · BCrypt hashing\ncookie management"]
        SM["ServiceManager\nWireMock start/stop lifecycle\n+ SignalR broadcast"]
        SCS["ServerConfigService\nBootEpoch (JWT restart-invalidation)"]
        SES["SystemEventService\naudit log writes"]
    end

    subgraph Engine["WireMock.Net Engine"]
        SR["ServicesRegistry\nConcurrentDictionary\nGuid → WireMockServer"]
        WMF["WireMockServerFactory\ncreates WireMock.Net instances\non dynamic ports 30100–30199"]
        EU["EngineStartup\nauto-restores Live services\non container boot"]
    end

    subgraph Data["Data Layer (EF Core + SQLite)"]
        U["User\nid · username · passwordHash"]
        SVC["Service\nid · name · slug · port\nstatus · isActive · tags\ncreatedAt · deletedAt"]
        EVT["SystemEvent\nid · severity · message\nserviceId · isRead · createdAt"]
        SC["ServerConfig\nid=1 · bootEpoch"]
    end

    SE --> SM
    AE --> AS
    AE --> SCS
    EVE --> Data
    SM --> SH
    SM --> SR
    SM --> WMF
    SM --> SES
    SM --> Data
    AS --> Data
    EU --> SR
    EU --> WMF
```

---

## Frontend Layer Breakdown

```mermaid
graph TB
    subgraph Bootstrap["main.tsx — Provider Tree"]
        QCP["QueryClientProvider\nqueryClient + HUB_INVALIDATION_MAP"]
        TP["ToastProvider\n(error/success/info toasts)"]
        RP["RouterProvider"]
    end

    subgraph Routes["Route Tree (react-router-dom v7)"]
        PUB["Public Routes\n/login · /setup · /setup/change-password\n(FirstRunGate guard)"]
        PROT["Protected Routes\n/* via AppShell\n(ProtectedRoute + FirstRunGate)"]
    end

    subgraph AppShell_["AppShell (persistent layout)"]
        HSH["useServicesHub()\nWebSocket → /hubs/services\nServiceStatusChanged → invalidateQueries"]
        NAV["TopBar + Sidebar\n(responsive, 4 themes)"]
    end

    subgraph Pages["Feature Pages"]
        SP["ServicesPage\n/services\nbrowse · create · edit · toggle"]
        AP["ActivityPage\n/activity"]
        MP["MappingsPage\n/mappings"]
        EP["EventsPage\n/events"]
        STP["SettingsPage\n/settings/*"]
        ADM["AdminPage\n/admin"]
    end

    subgraph ServicesFeature["Services Feature Detail"]
        SC2["ServiceCard\ntoggle (optimistic) · status pill\ndata-testid · edit action"]
        US["useToggleService\nonMutate: optimistic flip isActive\nonError: revert + toast\nonSettled: invalidateQueries"]
    end

    subgraph SharedLib["Shared Lib"]
        API2["apiFetch()\nfetch wrapper + error handling"]
        QC["queryClient.ts\nQueryClient + HUB_INVALIDATION_MAP\nServiceStatusChanged→['services']"]
        SIG["signalr.ts\ncreateHubConnection(url)"]
        TC["ToastContext.tsx\nuseShowToast()"]
    end

    Bootstrap --> Routes
    PROT --> AppShell_
    AppShell_ --> Pages
    SP --> ServicesFeature
    SC2 --> US
    US --> API2
    US --> TC
    HSH --> SIG
    HSH --> QC
```

---

## Authentication & First-Run Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as ASP.NET Core
    participant DB as SQLite

    Note over B,DB: First-run (no users exist)
    B->>A: GET /api/setup/status
    A->>DB: Users.Any()?
    DB-->>A: false
    A-->>B: {needsSetup: true}
    B->>A: POST /api/auth/setup\n{username, password ≥12 chars}
    A->>DB: Save User (BCrypt hash)\n+ generate BootEpoch → ServerConfig
    A-->>B: Set-Cookie: fishtank_auth\n(httpOnly JWT, SameSite:Strict)

    Note over B,DB: All subsequent requests
    B->>A: Any /api/* or /hubs/* (cookie auto-sent)
    Note right of A: JWT read from fishtank_auth cookie\nValidates: signature · expiry · bootEpoch claim
    A->>DB: ServerConfig.BootEpoch matches JWT claim?
    DB-->>A: yes/no
    A-->>B: 200 OK  or  401 Unauthorized\n(container restart invalidates all tokens)
```

---

## Service Toggle — Optimistic Update Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant QC as QueryClient (cache)
    participant API as ASP.NET Core API
    participant Hub as ServicesHub (SignalR)

    UI->>QC: user clicks toggle
    Note over QC: onMutate:\ncancelQueries\nsetQueryData → isActive flipped (optimistic)
    QC-->>UI: toggle renders immediately

    UI->>API: POST /api/services/{id}/start|stop
    alt Server success
        API->>API: SaveChangesAsync (DB)
        API->>Hub: SendAsync("ServiceStatusChanged", {id, status})
        Hub-->>QC: invalidateQueries(["services"])
        QC->>API: GET /api/services (refetch)
        API-->>QC: confirmed server state
        QC-->>UI: status pill updated
    else Server failure (5xx)
        API-->>UI: error response
        Note over QC: onError:\nsetQueryData ← previous snapshot
        QC-->>UI: toggle reverts
        UI->>UI: showToast("Failed to update...", "error")
    end
```
