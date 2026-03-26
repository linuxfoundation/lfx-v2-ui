# Committee Module — Manual Test Cases

## TC-1: Committee Dashboard — Page Load & Layout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/groups` | Page loads with "Groups" title and descriptive text |
| 2 | Observe statistics bar | Total Committees, Public Committees, Active Voting, and Total Members cards display correct counts |
| 3 | Observe "My Groups" section | Grid shows committees the logged-in user belongs to (3 cols desktop, 2 tablet, 1 mobile) |
| 4 | Observe "All Groups" section | Table lists all project committees with search, filters, and pagination |
| 5 | Verify loading state | Spinner and "Loading your groups..." text appears before data loads |

---

## TC-2: Committee Dashboard — "Create Group" Button Permissions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as a **Maintainer** | "Create Group" button is visible in the page header |
| 2 | Log in as a **Board Member** (non-maintainer) | "Create Group" button is **not** visible |
| 3 | Log in as a **Foundation Admin** with `foundation-create-committee` flag | "Create Group" button is visible |
| 4 | Log in as a **Visitor** (non-member) | "Create Group" button is **not** visible |

---

## TC-3: Committee Dashboard — My Groups Cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe a committee card | Shows committee name, category, role badge (Chair/Vice-Chair/Member), and member count |
| 2 | Check a private committee card | Lock icon appears next to the category |
| 3 | Check a committee with voting enabled | Voting icon is visible on the card |
| 4 | Check mailing list icon | If mailing list exists, icon is clickable (opens mailto). If not, icon is disabled/greyed |
| 5 | Check chat channel icon | If chat channel exists, icon is clickable (opens external link). If not, icon is disabled/greyed |
| 6 | Hover over a card | Card shows shadow transition effect |
| 7 | Click a card | Navigates to `/groups/:id` (committee view page) |

---

## TC-4: Committee Dashboard — All Groups Table Search & Filters

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type a committee name in the search box | Table filters to show only matching committees (by name, description, or category) |
| 2 | Clear the search box | All committees are shown again |
| 3 | Select a category from the category filter dropdown | Only committees in that category are shown; dropdown shows count per category |
| 4 | Select "Enabled" in the voting status filter | Only committees with voting enabled are shown |
| 5 | Select "Disabled" in the voting status filter | Only committees with voting disabled are shown |
| 6 | Combine search + category + voting filters | Results reflect all applied filters |
| 7 | Apply filters that match nothing | "No results" empty state is displayed |
| 8 | Click column header "Name" | Rows sort by committee name (ascending/descending toggle) |
| 9 | Change pagination to 25 or 50 rows per page | Table adjusts row count accordingly |

---

## TC-5: Committee Dashboard — Empty States

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/groups` on a project with **no** committees | "No committees exist" empty state is displayed; stats bar is hidden |
| 2 | Apply filters that return no results | "No results" empty state is displayed in the table |

---

## TC-6: Create Committee — Full Workflow (Steps 1–4)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Group" on dashboard | Navigates to `/groups/create` with stepper showing "Step 1 of 4" |
| 2 | **Step 1**: Select a category card | Category is highlighted; "Next" button becomes enabled |
| 3 | Click "Next" without selecting a category | Validation prevents advancing |
| 4 | Click "Next" after selecting category | Advances to Step 2 |
| 5 | **Step 2**: Leave "Name" empty and click "Next" | Validation error — name is required |
| 6 | Enter committee name | Field accepts input |
| 7 | Optionally select a parent committee | Dropdown shows available parent committees |
| 8 | Enter a description | Textarea accepts input |
| 9 | Enter an invalid URL in Website field | Validation error — URL format invalid |
| 10 | Enter a valid URL and click "Next" | Advances to Step 3 |
| 11 | **Step 3**: Toggle "Enable Voting" on | Toggle switches to enabled state |
| 12 | Configure member visibility and join mode dropdowns | Dropdowns accept selection |
| 13 | Observe "Recommended" badge on certain features | Badge is visible on recommended toggles |
| 14 | Click "Create Committee" | Committee is created; advances to Step 4 |
| 15 | **Step 4**: Click "Skip For Now" | Redirects to the newly created committee view page |
| 16 | Verify the committee appears on the dashboard | New committee shows in "My Groups" and "All Groups" |

---

## TC-7: Create Committee — Step 4: Add Members

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On Step 4, click "Add Member" | Member form appears |
| 2 | Leave required fields empty and submit | Validation errors on First Name, Last Name, Email |
| 3 | Enter an invalid email format | Email validation error shown |
| 4 | Fill all required fields and click "Add Member" | Member is added; shows "New" status badge |
| 5 | Verify member card shows avatar with initials, name, email, and organization | All details are displayed correctly |
| 6 | If voting enabled: verify Role dropdown (Chair/Vice Chair/Member) | Dropdown is present and selectable |
| 7 | If voting enabled: set role start/end dates with end before start | Validation error — end date must be after start |
| 8 | Click edit button on a member | Member form re-opens for editing |
| 9 | Click delete button on a member | Confirmation prompt appears; confirming removes the member |
| 10 | Click "Done" | Redirects to committee view page with added members visible |

---

## TC-8: Create Committee — Cancel Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start creating a committee (reach Step 2 or 3) | Form has data entered |
| 2 | Click "Cancel" | Returns to dashboard; no committee is created |
| 3 | Click browser back button during creation | Navigates back; no partial committee is saved |

---

## TC-9: Edit Committee — Settings Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a committee you manage → Settings tab | "Group Settings" page loads with current values pre-filled |
| 2 | Change member visibility dropdown | Dropdown updates; "Save Changes" button is available |
| 3 | Change join mode (Open ↔ Restricted) | Dropdown updates |
| 4 | Toggle features on/off | Toggles switch state |
| 5 | Click "Save Changes" | Loading state shown; settings saved; success message appears |
| 6 | Refresh the page | Saved settings persist |

---

## TC-10: Edit Committee — Danger Zone (Delete)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to "Danger Zone" section on Settings tab | Red-bordered section with warning text is visible |
| 2 | Click "Delete Group" | Confirmation dialog appears with "Are you sure?" message |
| 3 | Click "Cancel" in the dialog | Dialog closes; committee is **not** deleted |
| 4 | Click "Delete" in the dialog | Committee is deleted; redirects to dashboard; committee no longer listed |

---

## TC-11: Committee View — Header & Metadata

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/groups/:id` | Page loads with breadcrumb "Groups > Committee Name" |
| 2 | Observe committee name | Displayed with lock icon if private |
| 3 | Observe description | Line-clamped to 2 lines with "More" button if text overflows |
| 4 | Click "More" on description | Dialog opens showing full description text |
| 5 | Observe tags | Category tag (colored), "Voting Enabled" tag (if applicable), Join Mode tag |
| 6 | Observe metadata | Created date and Updated date (if exists) are displayed |
| 7 | Observe channels card (if channels exist) | Mailing List, Chat Channel, Website links are shown with correct platform icons |
| 8 | Click mailing list link | Opens default email client with mailto link |
| 9 | Click chat channel link | Opens external link (Slack/Discord/Teams/etc.) in new tab |

---

## TC-12: Committee View — Tab Visibility by Role

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View committee as **Visitor** | Overview tab visible; Members tab visible only if member_visibility ≠ HIDDEN; Votes/Meetings/Surveys/Documents/Settings tabs hidden |
| 2 | View committee as **Member** | Overview, Members, Meetings, Surveys, Documents tabs visible; Settings tab hidden; Votes tab visible if voting enabled |
| 3 | View committee as **Chair/Admin** | All tabs visible including Settings |
| 4 | Verify tab badges | Members tab shows member count badge; other tabs show relevant counts |
| 5 | Click each tab | Tab content loads; active tab has blue bottom border |

---

## TC-13: Overview Tab — Role Banners

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View as **Visitor** | Blue banner: "Interested in this group? Join to participate..." with Join button |
| 2 | View as **Member** | Green banner: "You are a member of this group." |
| 3 | View as **Chair** | Blue banner with crown: "You are a [Chair/Vice Chair] of this group." |

---

## TC-14: Overview Tab — Statistics & Key Info

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe statistics cards | Members, Organizations, Meetings YTD, Active Votes, Open Surveys counts displayed |
| 2 | Observe Chairs card | Chair/Vice-Chair names shown with initials avatars; "Edit" button visible for admins |
| 3 | Observe Key Information strip | Parent project, membership mode, voting status, cadence, created date are displayed |

---

## TC-15: Overview Tab — Member/Chair Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View as member/chair — Last Meeting card | Shows title and date of most recent past meeting; "View All" navigates to Meetings:Past |
| 2 | View as member/chair — Next Meeting card | Shows next upcoming meeting card; "View All" navigates to Meetings:Upcoming |
| 3 | No past meetings | "No past meetings" empty state |
| 4 | No upcoming meetings | "No upcoming meetings" empty state |
| 5 | View "My Pending Actions" | Grid shows pending votes/surveys with type badge, title, date, and CTA button |
| 6 | Click a pending vote action | Navigates to vote details |
| 7 | Click a pending survey action | Navigates to survey details |
| 8 | No pending actions | "You're all caught up!" message |

---

## TC-16: Overview Tab — Visitor View

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View as visitor | Key Information strip shown as read-only |
| 2 | Observe channels card as visitor | Channels blurred with visitor blur mask |
| 3 | Observe Visitor CTA section | Icon, title, description, and "Join" button with gradient background |

---

## TC-17: Overview Tab — Join Committee

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As visitor, click "Join" on a committee with **Open** join mode | User joins immediately; success toast appears; page refreshes to show member view |
| 2 | As visitor, click "Join" on a committee with **Restricted** join mode | Info message: "Contact admin to request membership" |
| 3 | After joining, verify "My Groups" on dashboard | Newly joined committee appears in My Groups |

---

## TC-18: Overview Tab — Edit Chairs Dialog

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin, click "Edit Chairs" on the chairs card | Modal opens with Chair and Vice Chair dropdowns |
| 2 | Search for a member in the Chair dropdown | Dropdown filters by name |
| 3 | Select a Chair and Vice Chair | Selections are made |
| 4 | Click "Save" | Modal closes; loading state shown; chairs update on page |
| 5 | Click "Cancel" | Modal closes without changes |

---

## TC-19: Overview Tab — Edit Description

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin, click "Edit" on the description | Edit dialog opens with current description in textarea |
| 2 | Modify the description (max 2000 chars) | Textarea accepts input |
| 3 | Save changes | Dialog closes; description updates on page |

---

## TC-20: Members Tab — Table & Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Members tab | Table shows Name, Email, Organization columns (+ Role, Voting Status if voting enabled) |
| 2 | Type in the search box | Table filters members by name |
| 3 | Select a role from the Role filter | Only members with that role are shown |
| 4 | Select a voting status from the filter | Only members with that voting status are shown |
| 5 | Select an organization from the filter | Only members from that organization are shown |
| 6 | Combine multiple filters | Results reflect all filters |
| 7 | Clear all filters | Full member list is restored |
| 8 | Change pagination (10/25/50) | Row count adjusts |

---

## TC-21: Members Tab — Add Member

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin, click "Add Member" | Member form opens |
| 2 | Fill First Name, Last Name, Email (required) | Fields accept input |
| 3 | Optionally fill Job Title, LinkedIn, Organization | Fields accept input |
| 4 | If voting enabled: select Role and Voting Status | Dropdowns are functional |
| 5 | Submit the form | Member is added to the table; success message |
| 6 | Verify new member in table | Row shows name, email, organization, role, voting status |

---

## TC-22: Members Tab — Edit & Remove Member

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click three-dot menu on a member row | Menu shows "Edit Member" and "Remove Member" options |
| 2 | Click "Edit Member" | Edit form opens with current values pre-filled |
| 3 | Modify fields and save | Member data updates in the table |
| 4 | Click "Remove Member" | Confirmation dialog appears |
| 5 | Confirm removal | Member is removed from the table; success message |
| 6 | Cancel removal | Dialog closes; member remains |

---

## TC-23: Members Tab — Empty & Hidden States

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View members tab on a committee with no members (as admin) | "No members found" with "Add the first member" link |
| 2 | View members tab when member_visibility = HIDDEN (as non-admin) | "Member list is not publicly visible" message |
| 3 | View members tab with loading data | Skeleton placeholders are shown |

---

## TC-24: Votes Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Votes tab (voting enabled committee) | Votes table loads with status indicators |
| 2 | View a vote row | Shows vote title, status, dates |
| 3 | Click "View Results" on a vote | Vote results drawer slides in from the right |
| 4 | Close the drawer | Drawer slides out; table is visible again |
| 5 | View Votes tab on committee with no votes | "No votes yet" empty state |
| 6 | Verify loading state | Skeleton placeholders during data fetch |

---

## TC-25: Meetings Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Meetings tab | Info banner displayed; "Upcoming" filter active by default |
| 2 | Observe meeting cards | Cards show title, date/time, location/join link, attendee count |
| 3 | Click "Past" filter button | Switches to past meetings; button styling changes to active |
| 4 | Click "Upcoming" filter button | Switches back to upcoming meetings |
| 5 | Type in the search box | Filters meetings by title |
| 6 | Click a meeting card | Navigates to meeting details page |
| 7 | No upcoming meetings | "No upcoming meetings" empty state |
| 8 | No past meetings | "No past meetings" empty state |
| 9 | Verify loading state | Skeleton cards displayed during fetch |

---

## TC-26: Surveys Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Surveys tab | Info banner displayed; survey table loads |
| 2 | Click "View Results" on a survey | Survey results drawer slides in |
| 3 | Close the drawer | Drawer slides out |
| 4 | No surveys | "No surveys yet" empty state |

---

## TC-27: Documents Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Documents tab | "Documents" title with description text |
| 2 | Observe table columns | Name, Source (Link/Meeting tag), Added By, Date, File Size, Actions |
| 3 | Search for a document by name | Table filters results |
| 4 | Click a document name | Opens/downloads the attachment |
| 5 | Click download button | File downloads |
| 6 | Observe source indicators | Blue link icon for links; red file icon for meeting attachments |
| 7 | No documents | "No documents yet" empty state |
| 8 | Search returns nothing | "No matching documents" message |

---

## TC-28: Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/groups/invalid-id` | 404 "Group Not Found" error state with red icon and "Back" button |
| 2 | Click "Back" on 404 page | Returns to dashboard |
| 3 | Simulate a network error during page load | "Something Went Wrong" error with amber icon, "Retry" and "Back" buttons |
| 4 | Click "Retry" on error page | Page attempts to reload data |
| 5 | Simulate error during form submission (create/edit) | Error toast message displayed; form remains editable |

---

## TC-29: Responsive Design

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View dashboard on **desktop** (≥1024px) | My Groups grid: 3 columns; table full-width with all columns |
| 2 | View dashboard on **tablet** (768–1023px) | My Groups grid: 2 columns; table may hide some columns |
| 3 | View dashboard on **mobile** (<768px) | My Groups grid: 1 column; filters stack vertically |
| 4 | View committee form on mobile | Form fields stack vertically; buttons full-width |
| 5 | View members table on mobile | Table scrolls horizontally or adapts layout |
| 6 | View overview tab stats on mobile | Cards stack in single column |

---

## TC-30: Edit Committee via Stepper (Edit Mode)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/groups/:id/edit` | Stepper loads in non-linear mode (all steps accessible) |
| 2 | Click on Step 1 directly | Can jump to Step 1 without completing other steps |
| 3 | Click on Step 3 directly | Can jump to Step 3 (non-linear navigation) |
| 4 | Modify category on Step 1 | Change is reflected |
| 5 | Click "Update Committee" on Step 3 | Committee is updated; success message |
| 6 | Navigate to Step 4 (Members) | Existing members are shown with current data |

---

## TC-31: Edit Channels Dialog

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As admin on committee view, click "Edit" on channels card | Edit channels dialog opens |
| 2 | Modify mailing list, chat channel, or website URLs | Fields accept input |
| 3 | Save changes | Dialog closes; channels update on the page |
| 4 | Verify platform auto-detection | Chat channel shows correct icon (Slack/Discord/Teams/etc.) based on URL |
| 5 | Verify website auto-detection | Website shows correct icon (GitHub/GitLab/Bitbucket) based on URL |

---

## TC-32: Loading States Across All Pages

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Dashboard initial load | Full page spinner visible |
| 2 | Members tab loading | Skeleton rows in table |
| 3 | Overview tab stats loading | Skeleton stat cards |
| 4 | Meetings tab loading | Skeleton meeting cards |
| 5 | Documents tab loading | Skeleton table rows |
| 6 | Form submission (create/edit/add member) | Button shows loading spinner; form disabled during submit |
| 7 | Join/Leave action | Button shows loading state during action |
| 8 | Save Chairs action | Save button shows loading state |

---

## TC-33: Leave Committee

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As a member, view the Overview tab | "Leave" option is available |
| 2 | Click "Leave" | Confirmation or success message; page refreshes to visitor view |
| 3 | Verify dashboard | Committee no longer appears in "My Groups" |
| 4 | Visit the committee again | Shown as visitor with "Join" banner |

---

## TC-34: Form Validation — Member Dates

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add/edit a member with voting enabled | Role dates and voting dates fields are visible |
| 2 | Set role end date **before** role start date | Validation error displayed |
| 3 | Set voting end date **before** voting start date | Validation error displayed |
| 4 | Set valid date ranges | No validation errors; form can be submitted |

---

## TC-35: Accessibility Checks

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through the dashboard using keyboard | All interactive elements are reachable and focusable |
| 2 | Tab through the create committee stepper | Steps, inputs, and buttons are navigable by keyboard |
| 3 | Verify `data-testid` attributes on interactive elements | Attributes present for reliable test targeting |
| 4 | Check icon buttons have tooltips | Tooltips describe the action (e.g., "Edit", "Delete") |
| 5 | Use a screen reader on the committee view | Page structure, headings, and landmarks are announced correctly |
| 6 | Verify empty states have descriptive messages | Screen reader announces helpful text, not just blank space |
