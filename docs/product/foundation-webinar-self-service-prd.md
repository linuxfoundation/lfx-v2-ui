# Foundation Webinar Self-Service PRD

## Status

Draft for team review.

## Background

Foundation and project teams currently rely on a mix of Zoom, ITx, LF SSO, SFDC, Looker, HubSpot, LF website publishing, and manual operational handoffs to run webinars. Existing internal documentation confirms that webinars are not just another meeting type:

- Zoom webinars require LF SSO registration before attendees receive invite details.
- The webinar Zoom account must be associated with the correct project in ITx.
- The project must be approved for Zoom webinar SSO onboarding.
- Registration and attendance reporting flows into SFDC and Looker.
- Public webinars may also require website publishing, speaker assets, recording, and lead handoff workflows.

LFX Self Serve should provide a guided self-service experience that hides most of this operational complexity from authorized Foundation users while preserving the controls required by LF platform, IT, events, marketing, and reporting teams.

## Source Inputs

- Slack context from Nirav and Heather referencing the legacy Zoom webinar PRD and current support documentation.
- Confluence: `Zoom: Webinar and Meeting Registration`, authored by Nirav Patel, last updated May 20, 2020.
- Confluence: `Zoom Webinars`, authored by Heather Willson, last updated May 13, 2024.
- Google Doc: `Webinar Process Overview and Resources`, shared by Kristin.

## Product Goal

Enable authorized Foundation and project managers to create, configure, publish, operate, and report on LF SSO-protected Zoom webinars from LFX Self Serve, with Zoom, ITx, SFDC, Looker, website, and operational workflows coordinated behind the scenes.

## Non-Goals

- Do not model webinars as simple committee meetings with a different label.
- Do not bypass LF SSO requirements for webinar registration.
- Do not make Self Serve the owner of all marketing copy, speaker approvals, or post-production decisions in the first release.
- Do not promise instant webinar creation if required Zoom, ITx, SSO, or license prerequisites are missing.

## Users

- Foundation manager or project manager with manage permission.
- Events or marketing operator supporting webinar setup.
- Platform/admin operator responsible for Zoom, ITx, SSO, and license readiness.
- Reporting stakeholder consuming registration and attendance data from SFDC or Looker.

## Primary User Story

As a Foundation manager, I want to create and manage an LF SSO-protected webinar from LFX Self Serve so that I can collect registrations, run the webinar, and review attendance/reporting without manually coordinating every Zoom, ITx, SFDC, and publishing handoff.

## Product Principles

- Self Serve should guide users through readiness, setup, registration, publishing, live operation, and reporting.
- The UI should show exact blockers when automation cannot continue.
- Webinar state should be visible after creation; users should not lose track of setup progress in email or Slack.
- The product should preserve existing LF operational controls around SSO, project ownership, Zoom account association, and shared webinar licenses.

## Recommended Domain Model

Treat `Webinar` as a dedicated Foundation/project resource, not as a committee meeting subtype.

Meetings are collaboration objects. Webinars are public or semi-public event objects with registration, campaign, marketing, capacity, SSO, reporting, and recording lifecycle concerns. They may share Zoom infrastructure and some scheduling fields, but they should have their own lifecycle and permissions surface.

## Proposed Experience

### 1. Entry Point

Authorized users should see a Foundation/project-level action such as `Create Webinar` or `New Webinar`.

The action should appear only where the user has sufficient manage permission. If the user has access to a Foundation but the Foundation is not eligible for webinar creation, show the action in a disabled or guided state with the reason.

### 2. Readiness Check

Before collecting the full setup form, Self Serve should check:

- Does this Foundation/project have an associated Zoom account in ITx?
- Is the project approved for Zoom webinar SSO?
- Is the selected host account valid and tied to the right project/account?
- Is standard webinar capacity sufficient?
- Is a shared 1000-attendee license required?
- Are required downstream systems available or configured?

If a check fails, the user should see the blocker and the next action. Examples:

- `Project is not approved for Zoom webinar SSO. Request onboarding before registration can open.`
- `No project Zoom account is associated in ITx. Create or connect a Zoom account first.`
- `Expected attendance may require the 1000-attendee webinar license. Request reservation.`

### 3. Webinar Details

The create flow should collect:

- Title.
- Abstract/description.
- Date, start time, timezone, and duration.
- Expected registration/attendance volume.
- Host Zoom user.
- Speakers: name, title, company, bio, headshot.
- Sponsor/company logo when applicable.
- Registration questions.
- Whether the webinar should be listed publicly.
- Whether the webinar needs a post-event recording workflow.
- Whether leads/attendance reporting is required.

### 4. Zoom Provisioning

When eligible, Self Serve should create or connect a Zoom webinar and enforce required settings:

- Registration enabled.
- Approval required.
- LF SSO registration required.
- Correct project/account association.
- Correct host account.
- Correct capacity/license.
- Webinar topic, description, schedule, and timezone.

The system should generate or store the LF SSO registration URL. The legacy PRD proposed routes like:

- `/webinars/{encryptedId}/register`
- `/meetings/{encryptedId}/register`

For this product, the webinar route is the higher-value surface.

### 5. Registration Experience

LFX should provide a branded SSO registration page for webinars.

The page should:

- Require LF SSO login.
- Resolve the encrypted webinar identifier.
- Fetch webinar details from the Zoom proxy/API layer.
- Display Foundation/project branding.
- Display title, abstract, schedule, speakers, and registration questions.
- Pre-fill known user profile fields from User Service where allowed.
- Submit registrant details to Zoom through the ITx/Zoom proxy.
- Approve the registration where required.
- Confirm that the user will receive the Zoom join details from Zoom.

### 6. Lifecycle Dashboard

Each webinar should have a status page in Self Serve.

Suggested statuses:

- Draft.
- Needs onboarding.
- Needs Zoom account.
- Needs license reservation.
- Ready to publish.
- Registration open.
- Live soon.
- Completed.
- Recording pending.
- Reporting ready.
- Cancelled.

The dashboard should show:

- Registration URL.
- Webinar date/time.
- Host account.
- SSO readiness.
- Zoom provisioning status.
- Registration count.
- Attendance count.
- SFDC campaign status.
- Looker/reporting link when available.
- Website/publication status when applicable.
- Outstanding operational tasks.

### 7. Publishing and Marketing Support

The product should support public webinar publication as an explicit option, not an automatic assumption.

When selected, Self Serve should collect the assets and metadata currently required by the manual process:

- Approved title and abstract.
- Speaker names, titles, bios, and headshots.
- Company/sponsor logo.
- Registration URL.
- Publication date requirements.
- Recording/post-event publishing expectations.

Initial implementation may generate a structured payload or operational task for the website/HubSpot workflow. Later phases can automate publishing directly if ownership and APIs are confirmed.

### 8. SFDC and Reporting

The legacy PRD describes SFDC Campaign and Campaign Member behavior. The updated support documentation notes that attendance and registration reporting is now done via Looker.

The product should:

- Create or sync the webinar record into the appropriate service/SFDC model.
- Create or link the SFDC campaign where required.
- Track campaign member statuses:
  - Registered.
  - Attended.
  - Email opt-in/opt-out where applicable.
- Ingest Zoom registration and attendance events through webhooks.
- Show reporting readiness and link to Looker when available.

### 9. Capacity and 1000-License Flow

LF has a shared 1000-attendee webinar license that must be reserved and moved to the appropriate Zoom account when needed.

Self Serve should collect:

- Webinar date.
- Zoom host user email.
- Expected attendance/registration volume.
- Request reason or related ticket reference.

The product should show reservation status and block registration opening if the license is required but not confirmed.

Longer term, this can integrate with the shared operational calendar or license management workflow.

## Permissions

Initial permission rule:

- Users with Foundation/project manage permission can initiate and manage webinars for that Foundation/project.

Additional controls may be needed for:

- Publishing to public LF properties.
- Requesting 1000-attendee license.
- Changing host account.
- Cancelling a webinar after registration opens.
- Accessing registrant or attendee data.

## System Integrations

Likely integration points:

- LFX Self Serve UI.
- Collaboration or event/webinar service.
- ITx APIs for Zoom account/project lookup and Zoom proxy access.
- Zoom webhooks.
- LF SSO/Auth0.
- User Service.
- Project/Foundation service.
- SFDC campaign and attendance sync.
- Looker reporting.
- HubSpot/LF website publishing workflow.
- Calendar or operational workflow for 1000-license reservations.

## Open Questions

- Which service should own the webinar domain: Collaboration Service, a new Webinar/Event service, or an existing event platform integration?
- Are the ITx Zoom proxy APIs from the legacy PRD still active and owned?
- What is the current source of truth for Zoom webinar onboarded projects?
- Is the 2020 SFDC campaign rule still active, replaced, or partially deprecated by Looker?
- Should public webinar listing be automated in phase one or tracked as an operational task?
- Who approves marketing copy and speaker assets before publication?
- How should cancellation/reschedule behave after registrations exist?
- What data can be shown to Foundation managers without violating privacy or lead-handling rules?

## Phased Delivery

### Phase 1: Foundation Webinar Creation and Readiness

- Foundation/project-level webinar creation entry point.
- Permission-gated access.
- Readiness checks for Zoom account, SSO onboarding, host account, and capacity.
- Webinar metadata form.
- Local webinar status page.
- Manual or semi-automated operational task generation for blocked setup steps.

### Phase 2: Zoom Provisioning and SSO Registration Link

- Create or connect Zoom webinar.
- Enforce registration, approval, and SSO settings.
- Generate/store encrypted registration link.
- Display registration readiness and link health in Self Serve.

### Phase 3: LFX Registration Page and Webhooks

- SSO-protected `/webinars/{encryptedId}/register` route.
- Registration form populated from Zoom and User Service.
- Register and approve users through ITx/Zoom proxy.
- Ingest registration and participant events from Zoom webhooks.

### Phase 4: SFDC and Reporting

- Create/link webinar campaign.
- Sync registered and attended statuses.
- Show campaign/reporting status.
- Link to Looker reporting.

### Phase 5: Publishing, Recording, and License Automation

- Website/HubSpot publishing workflow.
- Speaker/asset readiness tracking.
- Recording and post-event publishing lifecycle.
- Shared 1000-license reservation workflow.

## Acceptance Criteria

- A manager with the correct Foundation/project permission can start webinar setup.
- A user without sufficient permission cannot start or manage webinar setup.
- Self Serve checks and displays project Zoom/SSO readiness before allowing registration to open.
- The system captures all core webinar metadata needed for Zoom setup and marketing handoff.
- Eligible webinars can be connected to or provisioned in Zoom with required registration and SSO settings.
- The webinar status page shows current lifecycle state and next actions.
- Registration URL is visible only when the webinar is ready for registration.
- 1000-attendee license needs are captured and tracked separately from normal webinar setup.
- SFDC/Looker/reporting expectations are explicit in the workflow, even if later phases automate them.

## Product Recommendation

Build this as a serious Self Serve workflow, not a small meeting-type extension. The first release should guide users through eligibility and setup, then progressively automate Zoom provisioning, SSO registration, SFDC/Looker reporting, public publishing, and shared license handling.

