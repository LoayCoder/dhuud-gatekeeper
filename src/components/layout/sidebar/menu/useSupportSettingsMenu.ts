import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FileWarning, ClipboardCheck, Users, Settings, Settings2, Building2,
  Trophy, Network, Layers, FolderTree, HelpCircle, LifeBuoy, CreditCard, Receipt, Puzzle, FileStack,
  BarChart3, ShieldAlert, ShieldCheck, FileCog, Package, List, Plus, QrCode, ClipboardList, Menu,
  Workflow, Clock, Radio, Calendar, MapPin, Briefcase, UserCheck, Route, Video, FileKey, HardHat,
  Map, Download, Share, CheckCircle2, MessageSquare, FileText, Bell, AlertTriangle, Globe, Languages,
  GraduationCap, BookOpen, History, Sparkles, Award
} from "lucide-react";

export function useSupportSettingsMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.training', 'Training'),
      icon: GraduationCap,
      menuCode: 'training',
      isActive: location.pathname.startsWith("/admin/training"),
      items: [
        {
          title: t('navigation.trainingCenter', 'Training Center'),
          url: "/admin/training-center",
          icon: BookOpen,
          menuCode: 'training_center',
        },
      ],
    },
    {
      title: t('navigation.support'),
      url: "/support",
      icon: LifeBuoy,
      menuCode: 'support',
    },
    {
      title: t('navigation.settings'),
      icon: Settings,
      menuCode: 'settings',
      isActive: location.pathname.startsWith("/settings"),
      items: [
        {
          title: t('navigation.subscription'),
          url: "/settings/subscription",
          icon: CreditCard,
          menuCode: 'settings_subscription',
        },
        {
          title: t('navigation.usageBilling'),
          url: "/settings/usage-billing",
          icon: Receipt,
          menuCode: 'settings_billing',
        },
      ],
    },  ];
}
