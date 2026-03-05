import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import { AppSidebarHeader } from '../sidebar/AppSidebarHeader';
import { AppSidebarFooter } from '../sidebar/AppSidebarFooter';
import { AppSidebarNav } from './AppSidebarNav';
import { AppSidebarModals } from './AppSidebarModals';
import { useAppSidebar } from './hooks/useAppSidebar';

export default function AppSidebar() {
    const { filteredMenuItems } = useAppSidebar();

    return (
        <Sidebar collapsible="icon" side="left">
            <AppSidebarHeader />
            <AppSidebarNav filteredMenuItems={filteredMenuItems as any} />
            <AppSidebarFooter />
            <SidebarRail />
            <AppSidebarModals />
        </Sidebar>
    );
}
