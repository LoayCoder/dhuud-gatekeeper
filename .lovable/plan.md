

# AI Login Prompt Document

I'll create a comprehensive prompt/guide document that teaches an AI agent how to successfully log into the Dhuud platform, covering the full authentication flow including MFA bypass via the "Skip for now" grace period.

## What I'll Create

A new document `docs/AI_LOGIN_PROMPT.md` containing:

1. **Pre-requisites** — Required credentials (email, password), target URL
2. **Step-by-step login flow**:
   - Navigate to `/login`
   - Enter email and password in the form fields
   - Click the login button
   - Handle the MFA setup redirect (`/mfa-setup`)
   - Click the **"Skip for now"** button to activate the 24-hour grace period
   - Confirm successful redirect to the home page (`/`)
3. **MFA scenarios** — How to handle:
   - First-time login (no MFA enrolled) → redirected to `/mfa-setup` → skip
   - MFA already enrolled → MFA verification dialog appears → enter TOTP code
   - Grace period active → no MFA prompt, direct access
4. **Troubleshooting** — Common issues (stale sessions, redirect loops, offline mode)
5. **Database-level bypass for automation** — SQL to set long-term grace period for test accounts
6. **Sample automation script** — Pseudocode/prompt showing the exact sequence of browser actions

## Files to Create

- `docs/AI_LOGIN_PROMPT.md` — The complete AI login guide and prompt template

## Approach

The document will be written as a reusable prompt that can be given to any AI agent (browser automation, testing agent, or LLM with browser tools) to successfully authenticate into the platform without getting stuck on MFA enforcement.

