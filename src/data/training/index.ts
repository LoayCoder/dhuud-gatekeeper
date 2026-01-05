export * from './types';
export { normalUserGuide } from './normal-user-guide';
export { deptRepGuide } from './dept-rep-guide';
export { managerGuide } from './manager-guide';
export { hsseOfficerGuide } from './hsse-officer-guide';
export { hsseExpertGuide } from './hsse-expert-guide';
export { hsseInvestigatorGuide } from './hsse-investigator-guide';
export { hsseManagerGuide } from './hsse-manager-guide';
export { contractControllerGuide } from './contract-controller-guide';
export { adminGuide } from './admin-guide';

import { RoleTrainingGuide } from './types';
import { normalUserGuide } from './normal-user-guide';
import { deptRepGuide } from './dept-rep-guide';
import { managerGuide } from './manager-guide';
import { hsseOfficerGuide } from './hsse-officer-guide';
import { hsseExpertGuide } from './hsse-expert-guide';
import { hsseInvestigatorGuide } from './hsse-investigator-guide';
import { hsseManagerGuide } from './hsse-manager-guide';
import { contractControllerGuide } from './contract-controller-guide';
import { adminGuide } from './admin-guide';

export const allTrainingGuides: RoleTrainingGuide[] = [
  normalUserGuide,
  deptRepGuide,
  managerGuide,
  hsseOfficerGuide,
  hsseExpertGuide,
  hsseInvestigatorGuide,
  hsseManagerGuide,
  contractControllerGuide,
  adminGuide,
];

export function getTrainingGuideByRole(roleCode: string): RoleTrainingGuide | undefined {
  return allTrainingGuides.find(guide => guide.roleCode === roleCode);
}

export function getTrainingGuidesByCategory(category: string): RoleTrainingGuide[] {
  return allTrainingGuides.filter(guide => guide.category === category);
}
