const fs = require('fs');
const path = require('path');

const srcFile = 'src/components/layout/AppSidebar.tsx';
const targetDir = 'src/components/layout/sidebar';

let content = fs.readFileSync(srcFile, 'utf8');

function extractTag(content, startTag, endTag) {
    const start = content.indexOf(startTag);
    const end = content.indexOf(endTag) + endTag.length;
    if (start === -1 || end === -1 || end < start) return null;
    return { start, end, code: content.substring(start, end) };
}

const headerInfo = extractTag(content, "<SidebarHeader>", "</SidebarHeader>");
const contentInfo = extractTag(content, "<SidebarContent>", "</SidebarContent>");
const footerInfo = extractTag(content, "<SidebarFooter>", "</SidebarFooter>");

// Create AppSidebarHeader.tsx
const headerCode = `import { useTranslation } from 'react-i18next';
import { SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Shield } from "lucide-react";
import { NotificationPopover } from "@/components/notifications";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebarHeader() {
  const { t } = useTranslation();
  const { tenantName, activeSidebarIconUrl, isLoading: themeLoading } = useTheme();

  return (
    ${headerInfo.code.replace(/\\n/g, '\\n    ')}
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'AppSidebarHeader.tsx'), headerCode);

// Create AppSidebarContent.tsx
const contentCode = `import { useLocation } from "react-router-dom";
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

interface AppSidebarContentProps {
  filteredMenuItems: any[];
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
    ${contentInfo.code.replace(/\\n/g, '\\n    ')}
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'AppSidebarContent.tsx'), contentCode);

// Create AppSidebarFooter.tsx
const footerCode = `import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LogOut,
  ChevronRight,
  UserCircle,
  User,
  Download,
  Share,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRoute } from "@/hooks/use-prefetch";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { DHUUD_APP_ICON } from "@/constants/branding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logUserActivity, getSessionDurationSeconds, clearSessionTracking } from "@/lib/activity-logger";
import { ThemeToggle } from "@/components/settings";

export function AppSidebarFooter() {
  const { t, i18n } = useTranslation();
  const { tenantName, activeSidebarIconUrl } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isRtl, setIsRtl] = useState(document.documentElement.dir === 'rtl');
  const { canPromptNatively, isIOS, isInstalled, promptInstall } = usePWAInstall();

  const appIcon = activeSidebarIconUrl || DHUUD_APP_ICON;
  const userEmail = user?.email || "";
  const userName = profile?.full_name || "";
  const userAvatar = profile?.avatar_url || "";

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsRtl(document.documentElement.dir === 'rtl');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, [i18n.language]);

  const handleLogout = async () => {
    const duration = getSessionDurationSeconds();
    await logUserActivity({
      eventType: "logout",
      sessionDurationSeconds: duration ?? undefined,
    });
    clearSessionTracking();
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    ${footerInfo.code.replace(/\\n/g, '\\n    ')}
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'AppSidebarFooter.tsx'), footerCode);

// Now update `AppSidebar.tsx` to use these fragments
let newMainContent = content;
newMainContent = newMainContent.replace(headerInfo.code, "<AppSidebarHeader />");
newMainContent = newMainContent.replace(contentInfo.code, "<AppSidebarContent filteredMenuItems={filteredMenuItems} />");
newMainContent = newMainContent.replace(footerInfo.code, "<AppSidebarFooter />");

// Add imports
const newImports = `import { AppSidebarHeader } from './sidebar/AppSidebarHeader';
import { AppSidebarContent } from './sidebar/AppSidebarContent';
import { AppSidebarFooter } from './sidebar/AppSidebarFooter';\n`;

newMainContent = newMainContent.replace("import { useTranslation }", newImports + "import { useTranslation }");

// Also remove unused hooks from AppSidebar.tsx (to reduce line count)
newMainContent = newMainContent.replace(/import \{.*\} from "\.\/sidebar\/menu\";/, '');
newMainContent = newMainContent.replace(/import \{ DHUUD_APP_ICON \} from "@\/constants\/branding";/, '');

fs.writeFileSync(srcFile, newMainContent);

console.log('AppSidebar split successfully');
