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

export function useContractorsPTWMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.contractors', 'Contractors'),
      icon: Briefcase,
      menuCode: 'contractors_module',
      isActive: location.pathname.startsWith("/contractors") || location.pathname.startsWith("/client-site-rep"),
      items: [
        {
          title: t('contractors.nav.dashboard', 'Dashboard'),
          url: "/contractors",
          icon: LayoutDashboard,
          menuCode: 'contractor_dashboard',
        },
        {
          title: t('contractors.nav.companies', 'Companies'),
          url: "/contractors/companies",
          icon: Building2,
          menuCode: 'contractor_companies',
        },
        {
          title: t('contractors.nav.projects', 'Projects'),
          url: "/contractors/projects",
          icon: Briefcase,
          menuCode: 'contractor_projects',
        },
        {
          title: t('contractors.nav.workers', 'Workers'),
          url: "/contractors/workers",
          icon: Users,
          menuCode: 'contractor_workers',
        },
        {
          title: t('contractors.nav.gatePasses', 'Gate Passes'),
          url: "/contractors/gate-passes",
          icon: FileWarning,
          menuCode: 'contractor_gate_passes',
        },
        {
          title: t('contractors.nav.inductionVideos', 'Induction Videos'),
          url: "/contractors/induction-videos",
          icon: Video,
          menuCode: 'contractor_induction_videos',
        },
        {
          title: t('contractors.nav.analytics', 'Analytics'),
          url: "/contractors/analytics",
          icon: BarChart3,
          menuCode: 'contractor_analytics',
        },
        {
          title: t('contractors.nav.settings', 'Settings'),
          url: "/contractors/settings",
          icon: Settings2,
          menuCode: 'contractor_settings',
        },
        {
          title: t('contractors.nav.siteRepDashboard', 'Site Rep Dashboard'),
          url: "/client-site-rep",
          icon: Building2,
          menuCode: 'client_site_rep_dashboard',
        },
      ],
    },
    {
      title: t('ptw.nav.title', 'Permit to Work'),
      icon: FileKey,
      menuCode: 'ptw_module',
      isActive: location.pathname.startsWith("/ptw"),
      items: [
        {
          title: t('ptw.nav.dashboard', 'PTW Dashboard'),
          url: "/ptw",
          icon: LayoutDashboard,
          menuCode: 'ptw_dashboard',
        },
        {
          title: t('ptw.nav.projects', 'Project Mobilization'),
          url: "/ptw/projects",
          icon: HardHat,
          menuCode: 'ptw_projects',
        },
        {
          title: t('ptw.nav.console', 'Permit Console'),
          url: "/ptw/console",
          icon: Map,
          menuCode: 'ptw_console',
        },
        {
          title: t('ptw.nav.createPermit', 'Create Permit'),
          url: "/ptw/create",
          icon: Plus,
          menuCode: 'ptw_create',
        },
        {
          title: t('ptw.nav.riskAssessments', 'Risk Assessments'),
          url: "/risk-assessments",
          icon: AlertTriangle,
          menuCode: 'ptw_risk_assessments',
        },
      ],
    },  ];
}
