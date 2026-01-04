import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * This page has been consolidated into the main My Actions page.
 * Redirects to /incidents/my-actions for a unified action management experience.
 */
export default function MyInspectionActions() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the unified My Actions page
    navigate('/incidents/my-actions', { replace: true });
  }, [navigate]);

  return null;
}
