const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/contractors/GatePassDetailDialog.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/contractors/GatePassDetailDialog');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const tabsDir = path.join(targetDir, 'tabs');
if (!fs.existsSync(tabsDir)) fs.mkdirSync(tabsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr;
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassApproverProfile } from "@/hooks/contractor-management/use-gate-pass-details";

export interface GatePassDetailDialogProps {
  pass: MaterialGatePass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSuccess?: () => void;
}

export interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  actor?: GatePassApproverProfile | null;
  notes?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. tabs/DetailsTab.tsx
const detailsImports = `import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";
import {
  Building2,
  Clock,
  LogIn,
  Package,
  Truck,
  User,
} from "lucide-react";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import {
  useGatePassDetails,
  GatePassItem,
  GatePassApproverProfile,
} from "@/hooks/contractor-management/use-gate-pass-details";

`;
const detailsJSX = extractBetween(content, '// Details Tab Component', '// Items & Photos Tab Component');
fs.writeFileSync(path.join(tabsDir, 'DetailsTab.tsx'), detailsImports + "// Details Tab Component" + detailsJSX);

// 3. tabs/ItemsPhotosTab.tsx
const itemsPhotosImports = `import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ImageIcon } from "lucide-react";
import { GatePassPhoto as GatePassPhotoComponent } from "@/components/ui/gate-pass-photo";
import {
  useGatePassItems,
  useGatePassPhotos,
} from "@/hooks/contractor-management/use-gate-pass-details";

`;
const itemsPhotosJSX = extractBetween(content, '// Items & Photos Tab Component', '// Timeline Tab Component');
fs.writeFileSync(path.join(tabsDir, 'ItemsPhotosTab.tsx'), itemsPhotosImports + "// Items & Photos Tab Component" + itemsPhotosJSX);

// 4. tabs/TimelineItem.tsx
const timelineItemImports = `import React from "react";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineEvent } from "../types";

`;
const timelineItemBody = extractBetween(content, 'function TimelineItem({', '}\n');
fs.writeFileSync(path.join(tabsDir, 'TimelineItem.tsx'), timelineItemImports + "export function TimelineItem({\n" + timelineItemBody + "}\n");

// 5. tabs/TimelineTab.tsx
const timelineTabImports = `import React from "react";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  useGatePassDetails,
  GatePassApproverProfile,
} from "@/hooks/contractor-management/use-gate-pass-details";
import { TimelineEvent } from "../types";
import { TimelineItem } from "./TimelineItem";

`;
const timelineTabBody = extractBetween(content, '// Timeline Tab Component\nfunction TimelineTab({', 'interface TimelineEvent {');
fs.writeFileSync(path.join(tabsDir, 'TimelineTab.tsx'), timelineTabImports + "export function TimelineTab({\n" + timelineTabBody);

// 6. GatePassDetailDialog.tsx (shell)
const shellImports = `import React from "react";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGatePassDetails,
  useGatePassItems,
  useGatePassPhotos,
} from "@/hooks/contractor-management/use-gate-pass-details";
import { GatePassPDFExportButton } from "../GatePassPDFExportButton";
import { GatePassApprovalActions } from "../GatePassApprovalActions";
import { GatePassDetailDialogProps } from "./types";
import { DetailsTab } from "./tabs/DetailsTab";
import { ItemsPhotosTab } from "./tabs/ItemsPhotosTab";
import { TimelineTab } from "./tabs/TimelineTab";

`;
const shellBody = extractBetween(content, 'export function GatePassDetailDialog({', '// Details Tab Component');
fs.writeFileSync(path.join(targetDir, 'GatePassDetailDialog.tsx'), shellImports + "export default function GatePassDetailDialog({\n" + shellBody);

// 7. index.ts
fs.writeFileSync(path.join(targetDir, 'index.ts'), "export { default as GatePassDetailDialog } from './GatePassDetailDialog';\nexport * from './types';\n");

console.log('GatePassDetailDialog split successfully');
