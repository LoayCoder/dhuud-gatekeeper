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

export function useAssetMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.assetManagement'),
      icon: Package,
      menuCode: 'asset_management',
      isActive: location.pathname.startsWith("/assets"),
      items: [
        {
          title: t('navigation.assetDashboard'),
          url: "/assets/dashboard",
          icon: BarChart3,
          menuCode: 'asset_dashboard',
        },
        {
          title: t('navigation.assetList'),
          url: "/assets",
          icon: List,
          menuCode: 'asset_list',
        },
        {
          title: t('navigation.registerAsset'),
          url: "/assets/register",
          icon: Plus,
          menuCode: 'register_asset',
        },
        {
          title: t('navigation.scanAsset'),
          url: "/assets/scan",
          icon: QrCode,
          menuCode: 'scan_asset',
        },
        {
          title: t('navigation.purchaseRequests', 'Purchase Requests'),
          url: "/assets/purchase-requests",
          icon: CreditCard,
          menuCode: 'purchase_requests',
        },
        {
          title: t('navigation.approvalConfig', 'Approval Workflows'),
          url: "/assets/approval-workflows",
          icon: Workflow,
          menuCode: 'approval_workflows',
        },
        {
          title: t('navigation.assetCategorySettings', 'Category Settings'),
          url: "/admin/asset-categories",
          icon: FolderTree,
          menuCode: 'admin_asset_categories',
        },
        {
          title: t('assets.auditLog.title', 'Asset Audit Log'),
          url: "/assets/audit-log",
          icon: History,
          menuCode: 'asset_audit_log',
        },
      ],
    },
  ];
}
