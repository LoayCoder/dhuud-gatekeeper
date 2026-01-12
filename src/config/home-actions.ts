import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ListChecks,
  Siren,
  LayoutDashboard,
  Calendar,
  MapPin,
  DoorOpen,
  Route,
  CheckSquare,
  ClipboardCheck,
} from 'lucide-react';

// Role categories that determine which cards to show
export type RoleCardCategory = 'base' | 'security' | 'hsse';

export type CardColorScheme = 'danger' | 'warning' | 'info' | 'success' | 'default' | 'primary';

export interface HomeActionCard {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  path: string;
  colorScheme: CardColorScheme;
  categories: RoleCardCategory[];
  requiredModule?: string;
}

export const ALL_HOME_CARDS: HomeActionCard[] = [
  // Base cards - Available to all users
  {
    id: 'reportings',
    labelKey: 'home.cards.reportings',
    descriptionKey: 'home.cards.reportingsDesc',
    icon: AlertTriangle,
    path: '/incidents/report',
    colorScheme: 'danger',
    categories: ['base'],
    requiredModule: 'incidents',
  },
  {
    id: 'my-actions',
    labelKey: 'home.cards.myActions',
    descriptionKey: 'home.cards.myActionsDesc',
    icon: ListChecks,
    path: '/incidents/my-actions',
    colorScheme: 'warning',
    categories: ['base'],
    requiredModule: 'incidents',
  },
  {
    id: 'emergency',
    labelKey: 'home.cards.emergencyResponse',
    descriptionKey: 'home.cards.emergencyResponseDesc',
    icon: Siren,
    path: '/security/emergency-alerts',
    colorScheme: 'danger',
    categories: ['base'],
  },
  {
    id: 'dashboards',
    labelKey: 'home.cards.dashboards',
    descriptionKey: 'home.cards.dashboardsDesc',
    icon: LayoutDashboard,
    path: '/dashboard',
    colorScheme: 'info',
    categories: ['base'],
  },
  
  // Security cards
  {
    id: 'shift-plan',
    labelKey: 'home.cards.shiftPlan',
    descriptionKey: 'home.cards.shiftPlanDesc',
    icon: Calendar,
    path: '/security/shifts',
    colorScheme: 'primary',
    categories: ['security'],
    requiredModule: 'security',
  },
  {
    id: 'my-locations',
    labelKey: 'home.cards.myLocations',
    descriptionKey: 'home.cards.myLocationsDesc',
    icon: MapPin,
    path: '/security/my-zones',
    colorScheme: 'success',
    categories: ['security'],
    requiredModule: 'security',
  },
  {
    id: 'gate-operation',
    labelKey: 'home.cards.gateOperation',
    descriptionKey: 'home.cards.gateOperationDesc',
    icon: DoorOpen,
    path: '/security/gate',
    colorScheme: 'default',
    categories: ['security', 'hsse'],
    requiredModule: 'security',
  },
  {
    id: 'patrol',
    labelKey: 'home.cards.patrol',
    descriptionKey: 'home.cards.patrolDesc',
    icon: Route,
    path: '/security/patrol',
    colorScheme: 'info',
    categories: ['security'],
    requiredModule: 'security',
  },
  
  // HSSE cards
  {
    id: 'my-approvals',
    labelKey: 'home.cards.myApprovals',
    descriptionKey: 'home.cards.myApprovalsDesc',
    icon: CheckSquare,
    path: '/incidents/investigate',
    colorScheme: 'warning',
    categories: ['hsse'],
    requiredModule: 'incidents',
  },
  {
    id: 'inspections',
    labelKey: 'home.cards.inspections',
    descriptionKey: 'home.cards.inspectionsDesc',
    icon: ClipboardCheck,
    path: '/inspections/dashboard',
    colorScheme: 'success',
    categories: ['hsse'],
    requiredModule: 'audits',
  },
];
