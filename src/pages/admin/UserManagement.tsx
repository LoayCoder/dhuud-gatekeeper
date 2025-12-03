import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfile {
  id: string;
  full_name: string | null;
  assigned_branch_id: string | null;
  assigned_division_id: string | null;
  assigned_department_id: string | null;
  assigned_section_id: string | null;
  branches?: { name: string } | null;
  divisions?: { name: string } | null;
  departments?: { name: string } | null;
  sections?: { name: string } | null;
}

interface UserWithRole extends UserProfile {
  role?: string;
}

interface HierarchyItem {
  id: string;
  name: string;
  division_id?: string;
  department_id?: string;
}

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const isRTL = i18n.dir() === 'rtl';
  
  // Hierarchy Data Options
  const [branches, setBranches] = useState<HierarchyItem[]>([]);
  const [divisions, setDivisions] = useState<HierarchyItem[]>([]);
  const [departments, setDepartments] = useState<HierarchyItem[]>([]);
  const [sections, setSections] = useState<HierarchyItem[]>([]);

  // Editing State
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profiles with ALL hierarchy joins
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          assigned_branch_id,
          assigned_division_id,
          assigned_department_id,
          assigned_section_id,
          branches:assigned_branch_id(name),
          divisions:assigned_division_id(name),
          departments:assigned_department_id(name),
          sections:assigned_section_id(name)
        `);

      if (profilesError) throw profilesError;

      // 2. Fetch user roles separately
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // 3. Merge roles with profiles
      const usersWithRoles = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'user'
        } as UserWithRole;
      });

      setUsers(usersWithRoles);

      // 4. Fetch Hierarchy Options for Dropdowns
      const [b, d, dep, sec] = await Promise.all([
        supabase.from('branches').select('id, name'),
        supabase.from('divisions').select('id, name'),
        supabase.from('departments').select('id, name, division_id'),
        supabase.from('sections').select('id, name, department_id'),
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
      if (dep.data) setDepartments(dep.data);
      if (sec.data) setSections(sec.data);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('userManagement.errorFetching'), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Departments based on selected Division
  const getDepartmentsForDivision = (divId: string | null) => {
    if (!divId) return [];
    return departments.filter(d => d.division_id === divId);
  };

  // Filter Sections based on selected Department
  const getSectionsForDepartment = (deptId: string | null) => {
    if (!deptId) return [];
    return sections.filter(s => s.department_id === deptId);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          assigned_branch_id: editingUser.assigned_branch_id,
          assigned_division_id: editingUser.assigned_division_id,
          assigned_department_id: editingUser.assigned_department_id,
          assigned_section_id: editingUser.assigned_section_id,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({ title: t('userManagement.success'), description: t('userManagement.assignmentsUpdated') });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div className={`flex flex-col gap-1 ${isRTL ? 'ms-auto text-end' : ''}`}>
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagement.title')}</h1>
          <p className="text-muted-foreground">{t('userManagement.description')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-start">{t('userManagement.allUsers')}</CardTitle>
          <CardDescription className="text-start">{t('userManagement.manageAssignments')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('userManagement.employee')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.role')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.locationBranch')}</TableHead>
                  <TableHead className="text-start">{t('userManagement.functionalUnit')}</TableHead>
                  <TableHead className="text-end">{t('userManagement.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {t('userManagement.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-start">
                        {user.full_name || t('userManagement.unnamedProfile')}
                      </TableCell>
                      <TableCell className="text-start">
                        <Badge variant="secondary">{user.role || t('userManagement.user')}</Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        {user.branches?.name || (
                          <span className="text-muted-foreground italic">{t('userManagement.unassigned')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex flex-col text-sm">
                          {user.divisions?.name && (
                            <span className="font-semibold">{user.divisions.name}</span>
                          )}
                          {user.departments?.name && (
                            <span className={`text-muted-foreground text-xs ${isRTL ? 'pe-2' : 'ps-2'}`}>
                              ↳ {user.departments.name}
                            </span>
                          )}
                          {user.sections?.name && (
                            <span className={`text-muted-foreground text-xs ${isRTL ? 'pe-4' : 'ps-4'}`}>
                              ↳ {user.sections.name}
                            </span>
                          )}
                          {!user.divisions?.name && (
                            <span className="text-muted-foreground italic">{t('userManagement.noUnit')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingUser(user);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-start">{t('userManagement.editAssignments')}</DialogTitle>
            <DialogDescription className="text-start">
              {t('userManagement.assignTo')} {editingUser?.full_name || t('userManagement.unnamedProfile')}.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="grid gap-4 py-4">
              {/* 1. Branch (Geographic) */}
              <div className="grid gap-2">
                <Label className="text-start">{t('userManagement.branchLocation')}</Label>
                <Select
                  value={editingUser.assigned_branch_id || "none"}
                  onValueChange={(val) => setEditingUser({ 
                    ...editingUser, 
                    assigned_branch_id: val === "none" ? null : val 
                  })}
                >
                  <SelectTrigger className="text-start">
                    <SelectValue placeholder={t('userManagement.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('userManagement.none')}</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Division (Top Level) */}
              <div className="grid gap-2">
                <Label className="text-start">{t('userManagement.division')}</Label>
                <Select
                  value={editingUser.assigned_division_id || "none"}
                  onValueChange={(val) => setEditingUser({ 
                    ...editingUser, 
                    assigned_division_id: val === "none" ? null : val,
                    assigned_department_id: null,
                    assigned_section_id: null 
                  })}
                >
                  <SelectTrigger className="text-start">
                    <SelectValue placeholder={t('userManagement.selectDivision')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('userManagement.none')}</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Department (Child of Division) */}
              <div className="grid gap-2">
                <Label className="text-start">{t('userManagement.department')}</Label>
                <Select
                  value={editingUser.assigned_department_id || "none"}
                  disabled={!editingUser.assigned_division_id}
                  onValueChange={(val) => setEditingUser({ 
                    ...editingUser, 
                    assigned_department_id: val === "none" ? null : val,
                    assigned_section_id: null
                  })}
                >
                  <SelectTrigger className="text-start">
                    <SelectValue placeholder={t('userManagement.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('userManagement.none')}</SelectItem>
                    {getDepartmentsForDivision(editingUser.assigned_division_id).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Section (Child of Department) */}
              <div className="grid gap-2">
                <Label className="text-start">{t('userManagement.section')}</Label>
                <Select
                  value={editingUser.assigned_section_id || "none"}
                  disabled={!editingUser.assigned_department_id}
                  onValueChange={(val) => setEditingUser({ 
                    ...editingUser, 
                    assigned_section_id: val === "none" ? null : val 
                  })}
                >
                  <SelectTrigger className="text-start">
                    <SelectValue placeholder={t('userManagement.selectSection')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('userManagement.none')}</SelectItem>
                    {getSectionsForDepartment(editingUser.assigned_department_id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />}
              {t('userManagement.saveAssignments')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
