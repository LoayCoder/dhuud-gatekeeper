import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Branch {
  id: string;
  name: string;
  location: string | null;
}

interface BranchAssignment {
  branch_id: string;
  access_level: string;
  is_primary: boolean;
  branch: Branch;
}

interface BranchContextType {
  // Current active branch (null = "All Branches" mode for full access users)
  activeBranch: Branch | null;
  setActiveBranch: (branch: Branch | null) => void;
  
  // User's accessible branches
  accessibleBranches: Branch[];
  branchAssignments: BranchAssignment[];
  
  // Utility flags
  isMultiBranchUser: boolean;
  hasFullBranchAccess: boolean;
  isLoading: boolean;
  isAllBranchesMode: boolean; // true when activeBranch is null and user has full access
  
  // Helper functions
  canAccessBranch: (branchId: string | null) => boolean;
  getActiveBranchId: () => string | null;
  refreshBranches: () => Promise<void>;
  
  // Get branch IDs for data filtering
  // Returns null for "All Branches" mode (no filter needed), or array of IDs for specific branch
  getBranchFilter: () => string[] | null;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  // null = "All Branches" mode for users with full access
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [accessibleBranches, setAccessibleBranches] = useState<Branch[]>([]);
  const [branchAssignments, setBranchAssignments] = useState<BranchAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if user has full branch access (super admin or has_full_branch_access flag)
  const hasFullBranchAccess = (profile as any)?.is_super_admin === true || (profile as any)?.has_full_branch_access === true;
  
  // User is multi-branch if they have access to more than one branch
  const isMultiBranchUser = hasFullBranchAccess || accessibleBranches.length > 1;

  const fetchBranches = useCallback(async () => {
    if (!user || !profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // If user has full branch access, fetch all branches for their tenant
      if (hasFullBranchAccess) {
        const { data: allBranches, error } = await supabase
          .from("branches")
          .select("id, name, location")
          .eq("tenant_id", profile.tenant_id)
          .is("deleted_at", null)
          .order("name");

        if (error) throw error;
        const uniqueBranches = (allBranches || []).filter(
          (b, i, arr) => arr.findIndex(x => x.id === b.id) === i
        );
        setAccessibleBranches(uniqueBranches);
        setBranchAssignments([]);
        
        // For full access users, default to "All Branches" (null) unless they have a stored preference
        if (!isInitialized && allBranches && allBranches.length > 0) {
          // Check for stored preference first
          const stored = localStorage.getItem(`activeBranch_${user.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              // Check for special "all branches" marker
              if (parsed === null || parsed?.id === "__all_branches__") {
                setActiveBranchState(null);
              } else {
                const isAccessible = allBranches.some(b => b.id === parsed.id);
                if (isAccessible) {
                  setActiveBranchState(parsed);
                } else {
                  // Default to "All Branches" for full access users
                  setActiveBranchState(null);
                }
              }
            } catch {
              // Default to "All Branches" for full access users
              setActiveBranchState(null);
            }
          } else {
            // No stored preference - default to "All Branches" for full access users
            setActiveBranchState(null);
          }
          setIsInitialized(true);
        }
      } else {
        // Fetch user's branch assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from("user_branch_assignments")
          .select(`
            branch_id,
            access_level,
            is_primary,
            branch:branches!branch_id(id, name, location)
          `)
          .eq("user_id", user.id)
          .is("deleted_at", null);

        if (assignmentsError) throw assignmentsError;

        // Also check profile's assigned_branch_id as fallback
        let branches: Branch[] = [];
        let formattedAssignments: BranchAssignment[] = [];

        if (assignments && assignments.length > 0) {
          formattedAssignments = assignments
            .filter(a => a.branch)
            .map(a => ({
              branch_id: a.branch_id,
              access_level: a.access_level,
              is_primary: a.is_primary,
              branch: a.branch as unknown as Branch,
            }));
          branches = formattedAssignments.map(a => a.branch);
        } else {
          const assignedBranchId = (profile as any)?.assigned_branch_id;
          if (assignedBranchId) {
            // Fallback to single branch from profile
            const { data: singleBranch } = await supabase
              .from("branches")
              .select("id, name, location")
              .eq("id", assignedBranchId)
              .single();

            if (singleBranch) {
              branches = [singleBranch];
              formattedAssignments = [{
                branch_id: singleBranch.id,
                access_level: "standard",
                is_primary: true,
                branch: singleBranch,
              }];
            }
          }
        }

        const uniqueBranches = branches.filter(
          (b, i, arr) => arr.findIndex(x => x.id === b.id) === i
        );
        setAccessibleBranches(uniqueBranches);
        setBranchAssignments(formattedAssignments);

        // Set primary branch as active for non-full-access users
        if (!isInitialized && branches.length > 0) {
          const stored = localStorage.getItem(`activeBranch_${user.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.id) {
                const isAccessible = branches.some(b => b.id === parsed.id);
                if (isAccessible) {
                  setActiveBranchState(parsed);
                } else {
                  const primaryAssignment = formattedAssignments.find(a => a.is_primary);
                  setActiveBranchState(primaryAssignment?.branch || branches[0]);
                }
              } else {
                const primaryAssignment = formattedAssignments.find(a => a.is_primary);
                setActiveBranchState(primaryAssignment?.branch || branches[0]);
              }
            } catch {
              const primaryAssignment = formattedAssignments.find(a => a.is_primary);
              setActiveBranchState(primaryAssignment?.branch || branches[0]);
            }
          } else {
            const primaryAssignment = formattedAssignments.find(a => a.is_primary);
            setActiveBranchState(primaryAssignment?.branch || branches[0]);
          }
          setIsInitialized(true);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, hasFullBranchAccess, isInitialized]);

  // Fetch branches when user/profile changes
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Persist active branch to localStorage (including "All Branches" = null)
  useEffect(() => {
    if (user && isInitialized) {
      if (activeBranch === null && hasFullBranchAccess) {
        // Store special marker for "All Branches"
        localStorage.setItem(`activeBranch_${user.id}`, JSON.stringify({ id: "__all_branches__" }));
      } else if (activeBranch) {
        localStorage.setItem(`activeBranch_${user.id}`, JSON.stringify(activeBranch));
      }
    }
  }, [activeBranch, user, isInitialized, hasFullBranchAccess]);

  const setActiveBranch = useCallback((branch: Branch | null) => {
    setActiveBranchState(branch);
  }, []);

  const canAccessBranch = useCallback((branchId: string | null): boolean => {
    // NULL branch_id means shared/global - always accessible
    if (branchId === null) return true;
    
    // Full access users can access any branch
    if (hasFullBranchAccess) return true;
    
    // Check if branch is in accessible list
    return accessibleBranches.some(b => b.id === branchId);
  }, [hasFullBranchAccess, accessibleBranches]);

  const getActiveBranchId = useCallback((): string | null => {
    return activeBranch?.id || null;
  }, [activeBranch]);

  const refreshBranches = useCallback(async () => {
    await fetchBranches();
  }, [fetchBranches]);

  // "All Branches" mode = null activeBranch + full access
  const isAllBranchesMode = activeBranch === null && hasFullBranchAccess;

  // Get branch filter for data queries
  // Returns null for "All Branches" (no filter), or array with single branch ID
  const getBranchFilter = useCallback((): string[] | null => {
    if (isAllBranchesMode) {
      return null; // No filter - show all branches data
    }
    if (activeBranch) {
      return [activeBranch.id];
    }
    // Fallback: return all accessible branch IDs
    return accessibleBranches.map(b => b.id);
  }, [isAllBranchesMode, activeBranch, accessibleBranches]);

  return (
    <BranchContext.Provider
      value={{
        activeBranch,
        setActiveBranch,
        accessibleBranches,
        branchAssignments,
        isMultiBranchUser,
        hasFullBranchAccess,
        isLoading,
        isAllBranchesMode,
        canAccessBranch,
        getActiveBranchId,
        refreshBranches,
        getBranchFilter,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}

// Hook for getting branch_id for forms (auto-populates from active branch)
export function useBranchId() {
  const { getActiveBranchId, activeBranch } = useBranch();
  return {
    branchId: getActiveBranchId(),
    branchName: activeBranch?.name || null,
  };
}
