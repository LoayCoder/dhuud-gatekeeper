import { useLocation } from "react-router-dom";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { NavLink } from "@/components/layout/NavLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { prefetchRoute, prefetchRoutes } from "@/hooks/use-prefetch";
import { useTranslation } from 'react-i18next';
import { MenuItem } from '@/config/route-registry-types';

interface AppSidebarContentProps {
  filteredMenuItems: MenuItem[];
}

export function AppSidebarContent({ filteredMenuItems }: AppSidebarContentProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>{t('navigation.platform')}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredMenuItems.map((item) =>
              item.items ? (
                // Collapsible Section - prefetch all children on hover
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      asChild
                      onMouseEnter={() => {
                        // Prefetch all child routes when hovering the section
                        const collectUrls = (items: typeof item.items): string[] => {
                          return items.flatMap(sub => {
                            if ('url' in sub) return [sub.url];
                            if ('subItems' in sub && sub.subItems) {
                              return collectUrls(sub.subItems as typeof item.items);
                            }
                            return [];
                          });
                        };
                        prefetchRoutes(collectUrls(item.items));
                      }}
                    >
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) =>
                          'subItems' in subItem && subItem.subItems ? (
                            // Nested collapsible for sub-items (e.g., Incidents, Security)
                            <Collapsible
                              key={subItem.title}
                              asChild
                              defaultOpen={'isActive' in subItem ? subItem.isActive : false}
                              className="group/nested"
                            >
                              <SidebarMenuSubItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton className="cursor-pointer">
                                    {subItem.icon && (
                                      <subItem.icon className="me-2 h-4 w-4 opacity-70" />
                                    )}
                                    <span>{subItem.title}</span>
                                    <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/nested:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nested:rotate-90" />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub className="ms-2 border-s ps-1">
                                    {subItem.subItems.map((nestedItem) =>
                                      'subItems' in nestedItem && nestedItem.subItems ? (
                                        // Level 4: Nested collapsible (e.g., Visitor Gatekeeper, Security Patrols)
                                        <Collapsible
                                          key={nestedItem.title}
                                          asChild
                                          defaultOpen={'isActive' in nestedItem ? nestedItem.isActive : false}
                                          className="group/deep"
                                        >
                                          <SidebarMenuSubItem>
                                            <CollapsibleTrigger asChild>
                                              <SidebarMenuSubButton className="cursor-pointer">
                                                {nestedItem.icon && (
                                                  <nestedItem.icon className="me-2 h-4 w-4 opacity-70" />
                                                )}
                                                <span>{nestedItem.title}</span>
                                                <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/deep:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/deep:rotate-90" />
                                              </SidebarMenuSubButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <SidebarMenuSub className="ms-1 border-s ps-1">
                                                {(nestedItem.subItems as any[])?.map((deepItem: { title: string; url: string; icon?: React.ComponentType<{ className?: string }> }) => (
                                                  <SidebarMenuSubItem key={deepItem.title}>
                                                    <SidebarMenuSubButton
                                                      asChild
                                                      isActive={location.pathname === deepItem.url}
                                                    >
                                                      <NavLink
                                                        to={deepItem.url}
                                                        onClick={handleNavClick}
                                                        onMouseEnter={() => prefetchRoute(deepItem.url)}
                                                      >
                                                        {deepItem.icon && (
                                                          <deepItem.icon className="me-1 h-3 w-3 opacity-70" />
                                                        )}
                                                        <span>{deepItem.title}</span>
                                                      </NavLink>
                                                    </SidebarMenuSubButton>
                                                  </SidebarMenuSubItem>
                                                ))}
                                              </SidebarMenuSub>
                                            </CollapsibleContent>
                                          </SidebarMenuSubItem>
                                        </Collapsible>
                                      ) : 'url' in nestedItem ? (
                                        // Level 3: Regular link item
                                        <SidebarMenuSubItem key={nestedItem.title}>
                                          <SidebarMenuSubButton
                                            asChild
                                            isActive={location.pathname === nestedItem.url}
                                          >
                                            <NavLink
                                              to={nestedItem.url}
                                              onClick={handleNavClick}
                                              onMouseEnter={() => prefetchRoute(nestedItem.url)}
                                            >
                                              {nestedItem.icon && (
                                                <nestedItem.icon className="me-2 h-4 w-4 opacity-70" />
                                              )}
                                              <span>{nestedItem.title}</span>
                                            </NavLink>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ) : null
                                    )}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuSubItem>
                            </Collapsible>
                          ) : 'url' in subItem ? (
                            // Regular sub-item with URL
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === subItem.url}
                              >
                                <NavLink
                                  to={subItem.url}
                                  onClick={handleNavClick}
                                  onMouseEnter={() => prefetchRoute(subItem.url)}
                                >
                                  {subItem.icon && (
                                    <subItem.icon className="me-2 h-4 w-4 opacity-70" />
                                  )}
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ) : null
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                // Single Link - prefetch on hover
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      onClick={handleNavClick}
                      onMouseEnter={() => item.url && prefetchRoute(item.url)}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
