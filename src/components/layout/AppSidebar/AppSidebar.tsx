import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import { AppSidebarHeader } from '../sidebar/AppSidebarHeader';
import { AppSidebarFooter } from '../sidebar/AppSidebarFooter';
import { AppSidebarNav } from './AppSidebarNav';
import { AppSidebarModals } from './AppSidebarModals';
import { useAppSidebar } from './hooks/useAppSidebar';
import type { MenuItem } from '@/config/route-registry-types';

export default function AppSidebar() {
    const { filteredMenuItems } = useAppSidebar();

    return (
        <Sidebar collapsible="icon" side="left">
            <AppSidebarHeader />
            <AppSidebarNav filteredMenuItems={filteredMenuItems as MenuItem[]} />
            <AppSidebarFooter />
            <SidebarRail />
            <AppSidebarModals />
        </Sidebar>
    );
}
