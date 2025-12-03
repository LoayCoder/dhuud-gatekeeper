import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";

interface Branch { id: string; name: string; location: string | null; }
interface Division { id: string; name: string; }
interface Department { id: string; name: string; division_id: string; divisions?: { name: string } | null; }
interface Section { id: string; name: string; department_id: string; departments?: { name: string } | null; }

export default function OrgStructure() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const isRTL = i18n.dir() === 'rtl';
  
  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Form State
  const [newItemName, setNewItemName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Fetch all hierarchy data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, d, dep, sec] = await Promise.all([
        supabase.from('branches').select('id, name, location').order('name'),
        supabase.from('divisions').select('id, name').order('name'),
        supabase.from('departments').select('id, name, division_id, divisions(name)').order('name'),
        supabase.from('sections').select('id, name, department_id, departments(name)').order('name'),
      ]);

      if (b.data) setBranches(b.data);
      if (d.data) setDivisions(d.data);
      if (dep.data) setDepartments(dep.data as Department[]);
      if (sec.data) setSections(sec.data as Section[]);
    } catch (error) {
      console.error("Error fetching org structure:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generic Create Function
  const handleCreate = async (table: 'branches' | 'divisions' | 'departments' | 'sections') => {
    if (!newItemName.trim()) return;
    if (!profile?.tenant_id) {
      toast({ title: t('common.error'), description: t('orgStructure.noTenant'), variant: "destructive" });
      return;
    }
    setCreating(true);

    try {
      const payload: Record<string, unknown> = {
        name: newItemName.trim(),
        tenant_id: profile.tenant_id
      };

      // Add parent FKs
      if (table === 'departments') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.divisionRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.division_id = parentId;
      }
      if (table === 'sections') {
        if (!parentId) {
          toast({ title: t('common.error'), description: t('orgStructure.departmentRequired'), variant: "destructive" });
          setCreating(false);
          return;
        }
        payload.department_id = parentId;
      }

      const { error } = await supabase.from(table).insert([payload] as never);
      if (error) throw error;

      toast({ title: t('orgStructure.success'), description: t('orgStructure.itemCreated') });
      setNewItemName("");
      setParentId("");
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Generic Delete Function
  const handleDelete = async (table: string, id: string) => {
    if (!confirm(t('orgStructure.confirmDelete'))) return;
    try {
      const { error } = await supabase.from(table as 'branches' | 'divisions' | 'departments' | 'sections').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('orgStructure.deleted'), description: t('orgStructure.itemRemoved') });
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('common.error');
      toast({ title: t('common.error'), description: message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
        <h1 className="text-3xl font-bold tracking-tight">{t('orgStructure.title')}</h1>
        <p className="text-muted-foreground">{t('orgStructure.description')}</p>
      </div>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList className={`grid w-full grid-cols-4 lg:w-[600px] ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TabsTrigger value="branches">{t('orgStructure.branches')}</TabsTrigger>
          <TabsTrigger value="divisions">{t('orgStructure.divisions')}</TabsTrigger>
          <TabsTrigger value="departments">{t('orgStructure.departments')}</TabsTrigger>
          <TabsTrigger value="sections">{t('orgStructure.sections')}</TabsTrigger>
        </TabsList>

        {/* BRANCHES TAB */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageBranches')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Input 
                  placeholder={t('orgStructure.newBranchPlaceholder')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="text-start"
                />
                <Button onClick={() => handleCreate('branches')} disabled={creating}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.name')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      branches.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-start">{item.name}</TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete('branches', item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        {/* DIVISIONS TAB */}
        <TabsContent value="divisions">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageDivisions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Input 
                  placeholder={t('orgStructure.newDivisionPlaceholder')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="text-start"
                />
                <Button onClick={() => handleCreate('divisions')} disabled={creating}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.name')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divisions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      divisions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-start">{item.name}</TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete('divisions', item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageDepartments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-1/3">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDivision')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start">
                      <SelectValue placeholder={t('orgStructure.selectDivision')} />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="mb-2 block text-start">{t('orgStructure.departmentName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newDepartmentPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="text-start"
                  />
                </div>
                <Button onClick={() => handleCreate('departments')} disabled={creating || !parentId}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.department')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDivision')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-start">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground text-start">{item.divisions?.name}</TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete('departments', item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        {/* SECTIONS TAB */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle className="text-start">{t('orgStructure.manageSections')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-4 items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-1/3">
                  <Label className="mb-2 block text-start">{t('orgStructure.parentDepartment')}</Label>
                  <Select onValueChange={setParentId} value={parentId}>
                    <SelectTrigger className="text-start">
                      <SelectValue placeholder={t('orgStructure.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="mb-2 block text-start">{t('orgStructure.sectionName')}</Label>
                  <Input 
                    placeholder={t('orgStructure.newSectionPlaceholder')}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="text-start"
                  />
                </div>
                <Button onClick={() => handleCreate('sections')} disabled={creating || !parentId}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('orgStructure.add')}
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('orgStructure.section')}</TableHead>
                      <TableHead className="text-start">{t('orgStructure.parentDepartment')}</TableHead>
                      <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t('orgStructure.noItems')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-start">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground text-start">{item.departments?.name}</TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete('sections', item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
