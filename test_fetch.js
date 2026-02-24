const url = "https://xdlowvfzhvjzbtgvurzj.supabase.co/rest/v1/incidents?reference_id=eq.OBS-2026-0001&select=id,status,event_type,related_contractor_company_id,branch_id,approval_manager_id";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac";

fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    .then(res => res.json())
    .then(data => {
        console.log("Current state from Supabase:");
        console.log(JSON.stringify(data[0], null, 2));
    })
    .catch(err => console.error(err));
