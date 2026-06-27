---
story_key: '2-2-services-page-browse-create-and-edit-services'
generated: '2026-06-22'
verdict: PASS
---

# Traceability Matrix — Story 2.2: Services Page

## AC → Test Mapping

| AC | Description | Covering Tests | Layer | Status |
|---|---|---|---|---|
| AC-1 | Services card grid, empty state, stopped opacity | ServicesPage: "renders card for each service", "shows empty state", "does not show empty state" / ServiceCard: "renders stopped CSS class", "live service no stopped class" | Unit | ✅ COVERED |
| AC-2 | Responsive grid columns (3/2/1 col breakpoints) | CSS implementation — jsdom cannot test viewport breakpoints | Visual/CSS | ⚠ WAIVED — CSS-only, verified via visual review |
| AC-3 | Service card content (name, port, URL, mocks, status, toggle, edit) | ServiceCard: 11 unit tests covering all card fields and interactions | Unit | ✅ COVERED |
| AC-4 | Table view, sortable, sticky headers, keyboard nav, sessionStorage | ServicesPage: table toggle (3 tests) / DataTable: sort (6 tests), keyboard nav (5 tests) | Unit | ✅ COVERED |
| AC-5 | Add modal port pre-fill, 200ms debounce, validation on blur | AddEditServiceModal: port pre-fill, slug debounce, 5 validation-on-blur tests | Unit | ✅ COVERED |
| AC-6 | Create service → card appears, modal closes | ServicesPage: modal open (2 tests), modal close (1 test) / AddEditServiceModal: "Create Service" submit button | Unit | ✅ COVERED |
| AC-7 | Tags: add/remove in modal, tag filter AND logic, chip list | AddEditServiceModal: tag input / ServicesPage: 7 tag filter tests | Unit | ✅ COVERED |
| AC-8 | Edit modal: pre-populated fields, slug-change warning | ServicesPage: "opens edit modal with service name" / AddEditServiceModal: "edit mode title", "fields pre-populated", "slug-change warning" | Unit | ✅ COVERED |
| AC-9 | Performance: 50 services render ≤ 1 second | NFR Assessment evidence (CSS grid, staleTime:30s, no virtualization needed for 50) | NFR Evidence | ✅ WAIVED — evidence-based pass |
| AC-10 | MockFileCount on ServiceDto (0 when missing, counts .json files) | Integration: 2 tests / ServiceCard: "shows 5 mapping files", "shows No mapping files" / Story2_1: mockFileCount:0 assertion | Integration + Unit | ✅ COVERED |

## Coverage Summary

| Layer | Tests | ACs Covered |
|---|---|---|
| Unit (ServiceCard) | 11 | AC-1, AC-3, AC-10 |
| Unit (AddEditServiceModal) | 12 | AC-5, AC-6, AC-7, AC-8 |
| Unit (ServicesPage) | 19 | AC-1, AC-4, AC-6, AC-7, AC-8 |
| Unit (DataTable) | 16 | AC-4 |
| Integration (Story2_2) | 2 | AC-10 |
| Integration (Story2_1 updated) | 1 | AC-10 |

**Total: 61 tests covering 10 ACs**

## Uncovered / Waived

| AC | Reason | Mitigation |
|---|---|---|
| AC-2 (responsive breakpoints) | jsdom cannot simulate viewport widths | CSS reviewed visually; breakpoints defined in `ServicesPage.module.css` at 1023px and 639px |
| AC-9 (performance) | No automated load test | NFR Assessment provides evidence-based reasoning; virtualization not needed for 50 services |

## Quality Gate Decision

**PASS**

All story acceptance criteria are covered by automated tests or waived with documented rationale. No uncovered critical paths.
