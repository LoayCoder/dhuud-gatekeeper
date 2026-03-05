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

export function useHsseMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.hsseManagement'),
      icon: Shield,
      menuCode: 'hsse_management',
      isActive: location.pathname.startsWith("/incidents") || 
                location.pathname.startsWith("/audits") || 
                location.pathname.startsWith("/visitors") ||
                location.pathname.startsWith("/security"),
      items: [
        {
          title: t('navigation.hsseEvents'),
          icon: FileWarning,
          menuCode: 'hsse_events',
          isActive: location.pathname.startsWith("/incidents"),
          subItems: [
            {
              title: t('navigation.eventDashboard'),
              url: "/incidents/dashboard",
              icon: BarChart3,
              menuCode: 'event_dashboard',
            },
            {
              title: t('navigation.eventList'),
              url: "/incidents",
              icon: FileWarning,
              menuCode: 'event_list',
            },
            {
              title: t('navigation.reportEvent'),
              url: "/incidents/report",
              icon: FileWarning,
              menuCode: 'report_event',
            },
            {
              title: t('navigation.investigationWorkspace'),
              url: "/incidents/investigate",
              icon: ClipboardCheck,
              menuCode: 'investigation_workspace',
            },
            {
              title: t('navigation.myActions'),
              url: "/incidents/my-actions",
              icon: ClipboardCheck,
              menuCode: 'my_actions',
            },
          ],
        },
        {
          title: t('navigation.auditsInspections'),
          icon: ClipboardCheck,
          menuCode: 'audits_inspections',
          isActive: location.pathname.startsWith("/inspections") || location.pathname.startsWith("/audits"),
          subItems: [
            {
              title: t('navigation.inspectionDashboard'),
              url: "/inspections/dashboard",
              icon: BarChart3,
              menuCode: 'inspection_dashboard',
            },
            {
              title: t('navigation.inspectionSessions'),
              url: "/inspections/sessions",
              icon: ClipboardList,
              menuCode: 'inspection_sessions',
            },
            {
              title: t('navigation.inspectionSchedules'),
              url: "/inspections/schedules",
              icon: ClipboardList,
              menuCode: 'inspection_schedules',
            },
            {
              title: t('navigation.myInspectionActions'),
              url: "/inspections/my-actions",
              icon: ClipboardCheck,
              menuCode: 'my_inspection_actions',
            },
            {
              title: t('navigation.inspectionTemplates', 'Inspection Templates'),
              url: "/admin/inspection-templates",
              icon: ClipboardList,
              menuCode: 'admin_templates',
            },
            {
              title: t('navigation.inspectionCategories', 'Inspection Categories'),
              url: "/admin/inspection-category-settings",
              icon: FolderTree,
              menuCode: 'admin_inspection_categories',
            },
          ],
        },
        {
          title: t('navigation.security'),
          icon: Shield,
          menuCode: 'security',
          isActive: location.pathname.startsWith("/visitors") || location.pathname.startsWith("/security"),
          subItems: [
            {
              title: t('security.menu.securityDashboard', 'Security Dashboard'),
              url: "/security",
              icon: LayoutDashboard,
              menuCode: 'security_dashboard',
            },
            {
              title: t('security.menu.accessDashboard', 'Access Dashboard'),
              url: "/security/access-control",
              icon: LayoutDashboard,
              menuCode: 'access_dashboard',
            },
            {
              title: t('security.menu.gateOperations', 'Gate Operations'),
              url: "/security/gate-dashboard",
              icon: Shield,
              menuCode: 'gate_dashboard',
            },
            {
              title: t('security.visitors.preRegister', 'Pre-Register Visitor'),
              url: "/visitors/register",
              icon: Plus,
              menuCode: 'visitor_register',
            },
            {
              title: t('security.visitors.list', 'Visitor Directory'),
              url: "/visitors/list",
              icon: List,
              menuCode: 'visitor_list',
            },
            {
              title: t('security.blacklist.title', 'Blacklist Management'),
              url: "/security/blacklist",
              icon: ShieldAlert,
              menuCode: 'security_blacklist',
            },
            {
              title: t('navigation.securityPatrols'),
              icon: Route,
              menuCode: 'security_patrols',
              isActive: location.pathname.startsWith("/security/patrols"),
              subItems: [
              {
                  title: t('security.patrols.dashboard.title', 'Patrol Dashboard'),
                  url: "/security/patrols",
                  icon: Network,
                  menuCode: 'patrol_dashboard',
                },
                {
                  title: t('security.patrols.routes.title', 'Patrol Routes'),
                  url: "/security/patrols/routes",
                  icon: Route,
                  menuCode: 'patrol_routes',
                },
                {
                  title: t('security.patrols.history.title', 'Patrol History'),
                  url: "/security/patrols/history",
                  icon: Clock,
                  menuCode: 'patrol_history',
                },
              ],
            },
            {
              title: t('security.menu.workforceCommand', 'Workforce Command'),
              icon: Radio,
              menuCode: 'workforce_command',
              isActive: location.pathname.startsWith("/security/command") || 
                        location.pathname.startsWith("/security/zones") ||
                        location.pathname.startsWith("/security/shifts") ||
                        location.pathname.startsWith("/security/roster") ||
                        location.pathname.startsWith("/security/team") ||
                        location.pathname.startsWith("/security/my-location"),
              subItems: [
                {
                  title: t('security.menu.securityTeam', 'Security Team'),
                  url: "/security/team",
                  icon: Users,
                  menuCode: 'security_team',
                },
                {
                  title: t('security.menu.commandCenter', 'Command Center'),
                  url: "/security/command-center",
                  icon: Radio,
                  menuCode: 'command_center',
                },
                {
                  title: t('security.menu.securityZones', 'Security Zones'),
                  url: "/security/zones",
                  icon: MapPin,
                  menuCode: 'security_zones',
                },
                {
                  title: t('security.menu.shifts', 'Shifts'),
                  url: "/security/shifts",
                  icon: Clock,
                  menuCode: 'security_shifts',
                },
                {
                  title: t('security.menu.roster', 'Shift Roster'),
                  url: "/security/roster",
                  icon: Calendar,
                  menuCode: 'shift_roster',
                },
                {
                  title: t('security.menu.myLocation', 'My Location'),
                  url: "/security/my-location",
                  icon: MapPin,
                  menuCode: 'my_location',
                },
              ],
            },
            {
              title: t('security.menu.operations', 'Operations'),
              icon: Radio,
              menuCode: 'security_operations',
              isActive: location.pathname.startsWith("/security/attendance") || 
                        location.pathname.startsWith("/security/cctv") ||
                        location.pathname.startsWith("/security/emergency-alerts") ||
                        location.pathname.startsWith("/security/handover") ||
                        location.pathname.startsWith("/security/performance") ||
                        location.pathname.startsWith("/security/guard-app"),
              subItems: [
                {
                  title: t('security.menu.guardAttendance', 'Guard Attendance'),
                  url: "/security/attendance",
                  icon: Clock,
                  menuCode: 'guard_attendance',
                },
                {
                  title: t('security.menu.cctvManagement', 'CCTV Management'),
                  url: "/security/cctv",
                  icon: Video,
                  menuCode: 'cctv_management',
                },
                {
                  title: t('security.menu.emergencyAlerts', 'Emergency Alerts'),
                  url: "/security/emergency-alerts",
                  icon: Bell,
                  menuCode: 'emergency_alerts',
                },
                {
                  title: t('security.menu.shiftHandover', 'Shift Handover'),
                  url: "/security/handover",
                  icon: FileText,
                  menuCode: 'shift_handover',
                },
                {
                  title: t('security.menu.guardPerformance', 'Guard Performance'),
                  url: "/security/performance",
                  icon: BarChart3,
                  menuCode: 'guard_performance',
                },
                {
                  title: t('security.menu.guardMobileApp', 'Guard Mobile'),
                  url: "/security/guard-app",
                  icon: MapPin,
                  menuCode: 'guard_mobile_app',
                },
              ],
            },
            {
              title: t('security.menu.contractorList', 'Legacy Contractors'),
              url: "/security/contractors",
              icon: List,
              menuCode: 'contractor_list',
            },
          ],
        },
      ],
    },
  ];
}
