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

export function useGatePassesMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    // My Gate Passes - for all internal employees
    {
      title: t('navigation.myGatePasses', 'My Gate Passes'),
      icon: FileKey,
      menuCode: 'my_gate_passes',
      isActive: location.pathname.startsWith("/my-gate-passes"),
      items: [
        {
          title: t('myGatePasses.list.title', 'My Requests'),
          url: "/my-gate-passes",
          icon: List,
          menuCode: 'my_gate_pass_list',
        },
        {
          title: t('myGatePasses.create.title', 'New Request'),
          url: "/my-gate-passes/create",
          icon: Plus,
          menuCode: 'my_gate_pass_create',
        },
        {
          title: t('myGatePasses.history.title', 'Approval History'),
          url: "/my-gate-passes/history",
          icon: History,
          menuCode: 'my_gate_pass_history',
        },
      ],
    },
    // Department Gate Passes - for Department Representatives
    {
      title: t('navigation.deptGatePasses', 'Dept Gate Passes'),
      icon: FileKey,
      menuCode: 'dept_gate_passes',
      isActive: location.pathname.startsWith("/dept-gate-passes"),
      items: [
        {
          title: t('deptGatePasses.dashboard.title', 'Dashboard'),
          url: "/dept-gate-passes",
          icon: LayoutDashboard,
          menuCode: 'dept_gate_pass_dashboard',
        },
        {
          title: t('deptGatePasses.list.title', 'All Passes'),
          url: "/dept-gate-passes/list",
          icon: List,
          menuCode: 'dept_gate_pass_list',
        },
        {
          title: t('deptGatePasses.approvals.title', 'Pending Approvals'),
          url: "/dept-gate-passes/approvals",
          icon: Clock,
          menuCode: 'dept_gate_pass_approvals',
        },
        {
          title: t('deptGatePasses.today.title', "Today's Passes"),
          url: "/dept-gate-passes/today",
          icon: Calendar,
          menuCode: 'dept_gate_pass_today',
        },
      ],
    },  ];
}
