import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMember {
  user_id: string;
  depth: number;
  full_name: string | null;
  email?: string;
  job_title?: string | null;
  user_type?: string | null;
  is_active?: boolean;
  is_manager?: boolean;
}

export interface TeamHierarchyNode {
  id: string;
  full_name: string | null;
  job_title?: string | null;
  user_type?: string | null;
  is_active?: boolean;
  children: TeamHierarchyNode[];
}

export function useManagerTeam(managerId?: string) {
  const { user, profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamHierarchy, setTeamHierarchy] = useState<TeamHierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  const targetManagerId = managerId || user?.id;

  // Fetch team hierarchy
  const fetchTeamHierarchy = useCallback(async () => {
    if (!targetManagerId) return;

    setIsLoading(true);
    try {
      // Get flat team hierarchy
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .rpc('get_team_hierarchy', { p_manager_id: targetManagerId });

      if (hierarchyError) throw hierarchyError;

      if (!hierarchyData || hierarchyData.length === 0) {
        setTeamMembers([]);
        setTeamHierarchy([]);
        setIsManager(false);
        return;
      }

      setIsManager(true);
      const userIds = hierarchyData.map((h: { user_id: string }) => h.user_id);

      // Fetch profile details for team members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, user_type, is_active')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Check which members are also managers
      const { data: managerAssignments } = await supabase
        .from('manager_team')
        .select('manager_id')
        .in('manager_id', userIds);

      const managerIds = new Set((managerAssignments || []).map(m => m.manager_id));

      // Combine hierarchy with profile data
      const members: TeamMember[] = hierarchyData.map((h: { user_id: string; depth: number }) => {
        const profile = profiles?.find(p => p.id === h.user_id);
        return {
          user_id: h.user_id,
          depth: h.depth,
          full_name: profile?.full_name || null,
          job_title: profile?.job_title,
          user_type: profile?.user_type,
          is_active: profile?.is_active,
          is_manager: managerIds.has(h.user_id),
        };
      });

      setTeamMembers(members);

      // Build tree structure for hierarchy viewer
      const tree = buildHierarchyTree(targetManagerId, members, managerIds);
      setTeamHierarchy(tree);

    } catch (error) {
      console.error('Error fetching team hierarchy:', error);
    } finally {
      setIsLoading(false);
    }
  }, [targetManagerId]);

  useEffect(() => {
    fetchTeamHierarchy();
  }, [fetchTeamHierarchy]);

  // Build tree structure from flat hierarchy with proper depth tracking
  function buildHierarchyTree(
    managerId: string,
    members: TeamMember[],
    managerIds: Set<string>
  ): TeamHierarchyNode[] {
    // Get direct reports (depth 1)
    const directReports = members.filter(m => m.depth === 1);
    const visited = new Set<string>(); // Circular reference prevention
    
    return directReports.map(member => buildNode(member, members, managerIds, visited, 1));
  }

  function buildNode(
    member: TeamMember,
    allMembers: TeamMember[],
    managerIds: Set<string>,
    visited: Set<string>,
    currentDepth: number
  ): TeamHierarchyNode {
    // Circular reference prevention
    if (visited.has(member.user_id)) {
      return {
        id: member.user_id,
        full_name: member.full_name,
        job_title: member.job_title,
        user_type: member.user_type,
        is_active: member.is_active,
        children: [],
      };
    }
    visited.add(member.user_id);

    const node: TeamHierarchyNode = {
      id: member.user_id,
      full_name: member.full_name,
      job_title: member.job_title,
      user_type: member.user_type,
      is_active: member.is_active,
      children: [],
    };

    // If this member is also a manager, get their direct reports
    if (managerIds.has(member.user_id) && currentDepth < 10) { // Max depth limit
      const childMembers = allMembers.filter(m => 
        m.depth === currentDepth + 1 && !visited.has(m.user_id)
      );
      node.children = childMembers.map(child => 
        buildNode(child, allMembers, managerIds, visited, currentDepth + 1)
      );
    }

    return node;
  }

  // Assign user to manager's team (admin only)
  const assignToTeam = useCallback(async (userId: string, assignToManagerId: string) => {
    if (!profile?.tenant_id || !user?.id) return false;

    const { error } = await supabase
      .from('manager_team')
      .insert({
        manager_id: assignToManagerId,
        user_id: userId,
        tenant_id: profile.tenant_id,
        assigned_by: user.id,
      });

    if (error) throw error;
    
    await fetchTeamHierarchy();
    return true;
  }, [profile?.tenant_id, user?.id, fetchTeamHierarchy]);

  // Remove user from team (admin only)
  const removeFromTeam = useCallback(async (userId: string, fromManagerId: string) => {
    const { error } = await supabase
      .from('manager_team')
      .delete()
      .eq('manager_id', fromManagerId)
      .eq('user_id', userId);

    if (error) throw error;
    
    await fetchTeamHierarchy();
    return true;
  }, [fetchTeamHierarchy]);

  // Check if user is in current manager's hierarchy
  const isInTeam = useCallback((userId: string): boolean => {
    return teamMembers.some(m => m.user_id === userId);
  }, [teamMembers]);

  return {
    teamMembers,
    teamHierarchy,
    isLoading,
    isManager,
    isInTeam,
    assignToTeam,
    removeFromTeam,
    refetch: fetchTeamHierarchy,
  };
}
