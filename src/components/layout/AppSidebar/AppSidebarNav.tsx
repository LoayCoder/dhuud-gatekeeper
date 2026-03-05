import { AppSidebarContent } from '../sidebar/AppSidebarContent';
import { MenuItem } from '@/config/route-registry-types';

interface AppSidebarNavProps {
    filteredMenuItems: MenuItem[];
}

export function AppSidebarNav({ filteredMenuItems }: AppSidebarNavProps) {
    return <AppSidebarContent filteredMenuItems={filteredMenuItems} />;
}
