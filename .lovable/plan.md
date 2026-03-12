

# Improve Action List Sheet & Table UX

## Problems (from screenshot)
- Title column heavily truncated — unreadable
- Status badges repeat identically per row — visual noise
- Severity column all "—" — wasted space  
- No row separators or visual anchoring — hard to scan
- Search bar + table header compete for space in narrow sheet
- No sticky header when scrolling long lists

## Changes

### 1. `ActionListSheet.tsx` — Wider sheet, sticky search
- Increase max width: `sm:max-w-xl` (from `sm:max-w-lg`) for more breathing room
- Move search input INTO the sheet header area so it stays pinned while scrolling content

### 2. `ActionListTable.tsx` — Better table layout & scrolling
- Make search bar sticky at top (outside scrollable area)
- Add sticky table header (`sticky top-0 bg-background z-10`)
- Improve row styling: alternating subtle backgrounds, stronger hover
- Increase title column max-width and allow 2-line clamp
- Add chevron indicator on clickable rows (right arrow) for affordance
- Better mobile cards: show title prominently as card header instead of label-value pair

### 3. `IncidentApprovalsList.tsx` — Smarter column layout
- Make title the primary column (wider, no truncation cap)
- Combine status into a more compact colored dot + text instead of full badge
- Move severity to only show when non-null (hide "—" column)
- Add reference_id as subtle secondary text under title instead of separate column

### Files
1. `src/components/action-center/ActionListSheet.tsx` — wider, restructured layout
2. `src/components/action-center/ActionListTable.tsx` — sticky header, better rows, chevron affordance
3. `src/components/action-center/modules/IncidentApprovalsList.tsx` — optimized column layout
4. `src/components/action-center/modules/IncidentInvestigationsList.tsx` — same column improvements

