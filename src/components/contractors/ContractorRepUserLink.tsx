import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Search, User, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { useLinkContractorUser } from "@/hooks/contractor-management/use-link-contractor-user";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface ContractorRepUserLinkProps {
  representativeId: string;
  representativeName: string;
  representativeEmail?: string | null;
  currentUserId?: string | null;
  companyId: string;
  onLinked?: () => void;
}

interface SearchedUser {
  id: string;
  email: string;
  full_name: string | null;
}

export function ContractorRepUserLink({
  representativeId,
  representativeName,
  representativeEmail,
  currentUserId,
  companyId,
  onLinked,
}: ContractorRepUserLinkProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState(representativeEmail || "");

  const linkUser = useLinkContractorUser();

  // Search for users by email
  const { data: searchResults, isLoading: isSearching, refetch: searchUsers } = useQuery({
    queryKey: ["search-users-for-linking", searchEmail],
    queryFn: async () => {
      if (!searchEmail || searchEmail.length < 3) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .ilike("email", `%${searchEmail}%`)
        .limit(10);

      if (error) throw error;
      return (data || []) as SearchedUser[];
    },
    enabled: false, // Only search when triggered
  });

  const handleSearch = () => {
    if (searchEmail.length >= 3) {
      searchUsers();
    } else {
      toast.error(t("contractors.searchMinLength", "Enter at least 3 characters to search"));
    }
  };

  const handleLinkUser = (userId: string, userName: string) => {
    linkUser.mutate(
      {
        representativeId,
        userId,
        companyId,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success(
            t("contractors.userLinkedSuccess", "{{name}} has been linked successfully", { name: userName })
          );
          onLinked?.();
        },
      }
    );
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentUserId ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("contractors.userLinked", "Linked")}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-2"
          >
            <Link2 className="h-4 w-4" />
            {t("contractors.linkUser", "Link User Account")}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {t("contractors.linkUserAccount", "Link User Account")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "contractors.linkUserDescription",
                "Search for an existing user to link to {{name}}. This will grant them access to the contractor portal.",
                { name: representativeName }
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder={t("contractors.searchByEmail", "Search by email...")}
                  className="ps-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {t("common.search", "Search")}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults && searchResults.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    {t("contractors.searchResults", "Search Results")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.full_name || t("contractors.noName", "No name")}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkUser(user.id, user.full_name || user.email)}
                          disabled={linkUser.isPending}
                        >
                          {t("contractors.link", "Link")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {searchResults && searchResults.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("contractors.noUsersFound", "No users found with that email")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
