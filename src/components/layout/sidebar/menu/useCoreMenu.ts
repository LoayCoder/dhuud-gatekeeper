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

export function useCoreMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [

    {
      title: t('navigation.dashboard'),
      url: "/",
      icon: LayoutDashboard,
      menuCode: 'dashboard',
    },
    {
      title: t('navigation.leaderboard', 'Leaderboard'),
      url: "/leaderboard",
      icon: Trophy,
      menuCode: 'leaderboard',
    },  ];
}
