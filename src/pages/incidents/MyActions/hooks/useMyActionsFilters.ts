export function useMyActionsFilters({
  allActions,
  searchQuery,
  priorityFilter,
  activeFilter
}: {
  allActions: { status?: string | null; due_date?: string | null; title?: string | null; description?: string | null; reference_id?: string | null; priority?: string | null; }[];
  searchQuery: string;
  priorityFilter: string;
  activeFilter: string | null;
}) {

  const pendingActions = allActions?.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction') || [];
  const inProgressActions = allActions?.filter(a => a.status === 'in_progress') || [];
  // Actions awaiting verification (completed but not yet verified)
  const awaitingVerificationActions = allActions?.filter(a => a.status === 'completed' || a.status === 'pending_verification') || [];
  // Fully closed actions (verified & finalized)
  const closedActions = allActions?.filter(a => a.status === 'closed' || a.status === 'verified') || [];

  // Witness statements should be filtered at the domain-level hook, not here.

  // Calculate overdue actions (past due date, not closed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const overdueActions = allActions?.filter(a =>
    a.due_date &&
    a.due_date < todayStr &&
    a.status !== 'completed' &&
    a.status !== 'verified' &&
    a.status !== 'closed'
  ) || [];

  // Calculate soon overdue actions (due within 7 days, not yet overdue)
  const soonOverdueThreshold = 7;
  const soonOverdueActions = allActions?.filter(a => {
    if (!a.due_date || a.status === 'completed' || a.status === 'verified' || a.status === 'closed') return false;
    const dueDate = new Date(a.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= soonOverdueThreshold;
  }) || [];

  // Helper function to calculate days info for an action
  const getDaysInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {

      days: Math.abs(diffDays),
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueSoon: diffDays > 0 && diffDays <= soonOverdueThreshold
    };
  };

  // Search and filter actions
  const filterAndSearchActions = (actions: typeof allActions) => {
    return actions.filter(action => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = action.title?.toLowerCase().includes(query);
        const matchesDescription = action.description?.toLowerCase().includes(query);
        const matchesReference = action.reference_id?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesReference) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && action.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  };

  // Get active (non-closed) actions - sorted by urgency
  const getActiveActions = () => {
    const filtered = filterAndSearchActions(allActions);
    const activeOnly = filtered.filter(a => a.status !== 'closed' && a.status !== 'verified');

    // Sort by urgency: overdue first, then due soon, then by due date
    return activeOnly.sort((a, b) => {
      const aDaysInfo = getDaysInfo(a.due_date);
      const bDaysInfo = getDaysInfo(b.due_date);

      // Overdue actions first
      if (aDaysInfo?.isOverdue && !bDaysInfo?.isOverdue) return -1;
      if (!aDaysInfo?.isOverdue && bDaysInfo?.isOverdue) return 1;

      // Then due soon
      if (aDaysInfo?.isDueSoon && !bDaysInfo?.isDueSoon) return -1;
      if (!aDaysInfo?.isDueSoon && bDaysInfo?.isDueSoon) return 1;

      // Then by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;

      return 0;
    });
  };

  // Get closed actions
  const getClosedActions = () => {
    const filtered = filterAndSearchActions(allActions);
    return filtered.filter(a => a.status === 'closed' || a.status === 'verified');
  };

  // Filter actions based on active filter (for summary card clicks)
  const getFilteredActions = () => {
    const searchFiltered = filterAndSearchActions(allActions);
    if (!activeFilter) return searchFiltered;

    switch (activeFilter) {
      case 'overdue':
        return searchFiltered.filter(a =>
          a.due_date &&
          a.due_date < todayStr &&
          a.status !== 'completed' &&
          a.status !== 'verified' &&
          a.status !== 'closed'
        );
      case 'soon_overdue':
        return searchFiltered.filter(a => {
          if (!a.due_date || a.status === 'completed' || a.status === 'verified' || a.status === 'closed') return false;
          const dueDate = new Date(a.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysRemaining > 0 && daysRemaining <= soonOverdueThreshold;
        });
      case 'pending':
        return searchFiltered.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction');
      case 'in_progress':
        return searchFiltered.filter(a => a.status === 'in_progress');
      case 'awaiting_verification':
        return searchFiltered.filter(a => a.status === 'completed' || a.status === 'pending_verification');
      case 'closed':
        return searchFiltered.filter(a => a.status === 'closed' || a.status === 'verified');
      default:
        return searchFiltered;
    }
  };

  const displayedActiveActions = activeFilter ? getFilteredActions().filter(a => a.status !== 'closed' && a.status !== 'verified') : getActiveActions();
  const displayedClosedActions = activeFilter === 'closed' ? getFilteredActions() : getClosedActions();
  return {
    pendingActions,
    inProgressActions,
    awaitingVerificationActions,
    closedActions,
    overdueActions,
    soonOverdueActions,
    displayedActiveActions,
    displayedClosedActions
  };
}
