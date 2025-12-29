import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsersPaginated } from "@/hooks/use-users-paginated";

export interface SelectedUser {
  user_id: string;
  full_name: string;
  employee_id?: string;
  job_title?: string;
}

interface TeamMemberSelectorProps {
  onSelect: (user: SelectedUser) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function TeamMemberSelector({
  onSelect,
  excludeIds = [],
  placeholder,
  disabled = false,
}: TeamMemberSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { users, isLoading } = useUsersPaginated({
    filters: {
      searchTerm: searchQuery || null,
      isActive: true,
    },
    pageSize: 20,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => !excludeIds.includes(user.id));
  }, [users, excludeIds]);

  const handleSelect = (user: typeof filteredUsers[0]) => {
    onSelect({
      user_id: user.id,
      full_name: user.full_name || "",
      employee_id: user.employee_id || undefined,
      job_title: user.job_title || undefined,
    });
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || t("risk.team.searchPlaceholder", "Search by name or employee ID...")}
          className="ps-9"
          disabled={disabled}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setSearchQuery("");
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ScrollArea className="max-h-[240px]">
            {isLoading ? (
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("risk.team.noUsersFound", "No users found")}
              </div>
            ) : (
              <div className="p-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-start transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {user.full_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {user.employee_id && (
                          <span className="font-mono">#{user.employee_id}</span>
                        )}
                        {user.job_title && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="truncate">{user.job_title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

interface SelectedMemberCardProps {
  user: SelectedUser;
  role: string;
  onRemove: () => void;
  isRequired?: boolean;
}

export function SelectedMemberCard({ user, role, onRemove, isRequired }: SelectedMemberCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            {user.full_name}
            <Badge variant="secondary" className="text-xs">
              {role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {user.employee_id && (
              <span className="font-mono">#{user.employee_id}</span>
            )}
            {user.job_title && (
              <>
                <span>•</span>
                <span>{user.job_title}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-4 w-4 me-1" />
        {t("common.remove", "Remove")}
      </Button>
    </div>
  );
}
