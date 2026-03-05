import { useMemo } from 'react';
import { useMenuAccess } from "@/hooks/use-menu-access";

import {
    useCoreMenu,
    useHsseMenu,
    useGatePassesMenu,
    useAssetMenu,
    useContractorsPTWMenu,
    useAdminMenu,
    useSupportSettingsMenu
} from '../../sidebar/menu';

interface SidebarMenuItem {
    menuCode?: string;
    items?: SidebarMenuItem[];
    subItems?: SidebarMenuItem[];
    [key: string]: unknown;
}

export function useAppSidebar() {
    const { canAccess, isLoading: menuLoading } = useMenuAccess();

    const coreMenu = useCoreMenu();
    const hsseMenu = useHsseMenu();
    const gatePassesMenu = useGatePassesMenu();
    const assetMenu = useAssetMenu();
    const contractorsPTWMenu = useContractorsPTWMenu();
    const adminMenu = useAdminMenu();
    const supportSettingsMenu = useSupportSettingsMenu();

    const menuItems = useMemo(() => [
        ...coreMenu,
        ...hsseMenu,
        ...gatePassesMenu,
        ...assetMenu,
        ...contractorsPTWMenu,
        ...adminMenu,
        ...supportSettingsMenu,
    ], [coreMenu, hsseMenu, gatePassesMenu, assetMenu, contractorsPTWMenu, adminMenu, supportSettingsMenu]);

    const filterItemsRecursively = (items: SidebarMenuItem[]): SidebarMenuItem[] => {
        return items
            .map(item => {
                if (item.items) {
                    const filteredChildren = filterItemsRecursively(item.items);
                    if (filteredChildren.length > 0) {
                        return { ...item, items: filteredChildren };
                    }
                    if (!item.menuCode || canAccess(item.menuCode)) {
                        return { ...item, items: filteredChildren };
                    }
                    return null;
                }

                if ('subItems' in item && item.subItems) {
                    const filteredSubItems = filterItemsRecursively(item.subItems);
                    if (filteredSubItems.length > 0) {
                        return { ...item, subItems: filteredSubItems };
                    }
                    if (!item.menuCode || canAccess(item.menuCode)) {
                        return { ...item, subItems: filteredSubItems };
                    }
                    return null;
                }

                if (!item.menuCode || canAccess(item.menuCode)) {
                    return item;
                }
                return null;
            })
            .filter(Boolean);
    };

    const filteredMenuItems = useMemo(() => {
        if (menuLoading) return menuItems;
        return filterItemsRecursively(menuItems);
    }, [menuItems, canAccess, menuLoading]);

    return { filteredMenuItems };
}
