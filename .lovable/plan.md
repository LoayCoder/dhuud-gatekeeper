
Fix the remaining 404 by adding the missing risk assessment detail page and route.

What I found
- The list page intentionally navigates to `/risk-assessments/${assessment.id}` when a row is clicked.
- A second entry point also links there from workflow tasks:
  - `src/pages/RiskAssessments.tsx`
  - `src/features/incidents/components/my-actions/WorkflowTaskCard.tsx`
- But the app only defines:
  - `/risk-assessments`
  - `/risk-assessments/create`
- There is no `/risk-assessments/:id` route, so every click lands on Not Found.
- This is not a hosting issue. It is a missing app route/page.

Implementation plan
1. Add a new detail page
- Create a dedicated page for `/risk-assessments/:id`.
- Read the route param with `useParams`.
- Load the main assessment using existing `useRiskAssessment(id)`.
- Load hazards using existing `useRiskAssessmentDetails(id)`.
- Load team/signatures using existing `useRiskAssessmentTeam(id)`.

2. Add the missing route
- Register `risk-assessments/:id` in `src/routes/incident.routes.tsx` under the HSSE-protected risk routes.
- Add the same route to the route registry as a hidden dynamic route so routing and menu metadata stay aligned.

3. Build a first useful detail screen
- Show the assessment header:
  - assessment number
  - activity name
  - status
  - risk rating
  - location
  - dates
- Show hazard list from `risk_assessment_details`.
- Show team/signature section from `risk_assessment_team`.
- Add back navigation to `/risk-assessments`.
- Reuse existing risk components where practical instead of inventing new patterns.

4. Keep the current navigation behavior
- Leave row click and workflow “View Details” links pointing to `/risk-assessments/:id`.
- That preserves expected UX once the page exists.

5. Empty/error states
- If the record is missing, show a clean “not found” state with a button back to the list.
- If loading, show a simple loading skeleton/spinner.
- Handle optional/null fields safely so the page does not silently break on older records.

Technical details
- Files to add/update:
  - New page: `src/pages/RiskAssessmentDetail.tsx`
  - Update routes: `src/routes/incident.routes.tsx`
  - Update registry: `src/config/route-registry.ts`
- Existing hooks/services already available and should be reused:
  - `useRiskAssessment`
  - `useRiskAssessmentDetails`
  - `useRiskAssessmentTeam`
- Likely route shape:
```text
/risk-assessments/:id
```

Why this is the right fix
- The current app already behaves as if a detail page should exist.
- Redirecting clicks back to the list would avoid the 404, but it would remove expected functionality.
- Since the data layer for details already exists, adding the missing page is the proper completion of the feature.

Validation after implementation
- Open `/risk-assessments`
- Click any record such as `RA-2026-443692`
- Confirm the detail page opens instead of 404
- Confirm the same works from workflow task cards
- Confirm back navigation returns to the list cleanly
