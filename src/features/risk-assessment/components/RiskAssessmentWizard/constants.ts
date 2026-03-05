import {
  FileText,
  Users,
  AlertTriangle,
  Shield,
  PenTool,
} from "lucide-react";

export const STEPS = [
  { id: 1, key: "activity", icon: FileText },
  { id: 2, key: "team", icon: Users },
  { id: 3, key: "hazards", icon: AlertTriangle },
  { id: 4, key: "controls", icon: Shield },
  { id: 5, key: "signatures", icon: PenTool },
];

export const TEAM_ROLES = {
  team_leader: { label: "Team Leader", label_ar: "قائد الفريق" },
  member: { label: "Team Member", label_ar: "عضو الفريق" },
};

