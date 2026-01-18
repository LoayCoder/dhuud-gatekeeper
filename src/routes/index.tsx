/**
 * Route aggregator
 * Combines all domain-specific routes into a single export
 */
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

// Route modules
export { publicRoutes, legalRoutes, authRoutes, publicTokenRoutes } from "./public.routes";
export { incidentRoutes, riskRoutes } from "./incident.routes";
export { assetRoutes, partsRoutes } from "./asset.routes";
export { securityRoutes } from "./security.routes";
export { contractorRoutes, contractorManagementRoutes, contractorPortalRoutes, clientSiteRepRoutes } from "./contractor.routes";
export { inspectionRoutes } from "./inspection.routes";
export { ptwRoutes } from "./ptw.routes";
export { visitorRoutes } from "./visitor.routes";
export { adminRoutes } from "./admin.routes";

// Import for combined route generation
import { publicRoutes } from "./public.routes";
import { incidentRoutes, riskRoutes } from "./incident.routes";
import { assetRoutes, partsRoutes } from "./asset.routes";
import { securityRoutes } from "./security.routes";
import { contractorRoutes } from "./contractor.routes";
import { inspectionRoutes } from "./inspection.routes";
import { ptwRoutes } from "./ptw.routes";
import { visitorRoutes } from "./visitor.routes";
import { adminRoutes } from "./admin.routes";

/**
 * All protected routes that require MainLayout wrapper
 * These are used inside the protected route layout in App.tsx
 */
export const protectedLayoutRoutes: RouteObject[] = [
  ...incidentRoutes,
  ...riskRoutes,
  ...assetRoutes,
  ...partsRoutes,
  ...securityRoutes,
  ...contractorRoutes,
  ...inspectionRoutes,
  ...ptwRoutes,
  ...visitorRoutes,
  ...adminRoutes,
];

/**
 * Get all routes for code-splitting analysis
 */
export const getAllRoutes = () => ({
  public: publicRoutes,
  incident: incidentRoutes,
  risk: riskRoutes,
  asset: assetRoutes,
  parts: partsRoutes,
  security: securityRoutes,
  contractor: contractorRoutes,
  inspection: inspectionRoutes,
  ptw: ptwRoutes,
  visitor: visitorRoutes,
  admin: adminRoutes,
});
