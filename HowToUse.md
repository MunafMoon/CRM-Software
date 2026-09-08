# Folio CRM — How to Start and Use Every Module

This manual covers the application currently in `D:\CRM`. Use **PowerShell** or the **VS Code terminal** for the commands below. Open the website in your browser to use the CRM.

All money is displayed in **Indian rupees (₹)**. Follow-up and meeting times use **India Standard Time (IST / Asia/Kolkata)**.

## Contents

1. [Start the application](#1-start-the-application)
2. [Log in and log out](#2-log-in-and-log-out)
3. [First-time installation](#3-first-time-installation)
4. [Navigation, search, and notifications](#4-navigation-search-and-notifications)
5. [Dashboard](#5-dashboard)
6. [Today — daily sales workspace](#6-today--daily-sales-workspace)
7. [Prospects](#7-prospects)
8. [Pipeline and Kanban](#8-pipeline-and-kanban)
9. [Prospect details and quick actions](#9-prospect-details-and-quick-actions)
10. [Follow-ups](#10-follow-ups)
11. [Notes and activities](#11-notes-and-activities)
12. [Meetings](#12-meetings)
13. [Deals and proposals](#13-deals-and-proposals)
14. [Clients](#14-clients)
15. [Outreach tracking](#15-outreach-tracking)
16. [CSV import](#16-csv-import)
17. [Analytics](#17-analytics)
18. [Settings and team members](#18-settings-and-team-members)
19. [A complete sales example](#19-a-complete-sales-example)
20. [Stopping, backups, and maintenance](#20-stopping-backups-and-maintenance)
21. [Troubleshooting and current limitations](#21-troubleshooting-and-current-limitations)

## 1. Start the application

### 1.1 Choose one startup method

| Method                              | What runs                                                   | Website                          |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| A — development                     | PostgreSQL in Docker; frontend and backend in your terminal | http://localhost:5173            |
| B — Docker                          | PostgreSQL, backend, and frontend in Docker                 | http://localhost:5173 by default |
| C — Docker on the verification port | Same Docker application with a different web port           | http://localhost:5175            |

Choose **A** for development or **B** for running the built application. Do not start two frontends on the same port. The earlier verification instance used **5175**; that URL works only while that instance is running.

If this computer has not been set up, complete [first-time installation](#3-first-time-installation) first.

### 1.2 Method A: start frontend and backend together

**Step 1.** Open Docker Desktop and wait until its engine is running.

**Step 2.** Open PowerShell. In VS Code, choose **Terminal → New Terminal**.

**Step 3.** Go to the project folder:

```powershell
cd D:\CRM
```

**Step 4.** If switching from the full Docker application, stop its frontend and backend. This keeps the database and its records:

```powershell
docker compose stop api web
```

**Step 5.** Start PostgreSQL:

```powershell
docker compose up -d db
```

**Step 6.** Start both development servers:

```powershell
npm.cmd run dev
```

Wait for the Vite frontend URL and the API message saying it is listening on port **4000**. Prisma is checked automatically and generated if required.

**Step 7.** Open **http://localhost:5173** and sign in.

Keep the terminal open. Press **Ctrl+C** in that terminal to stop the development servers.

### 1.3 Start frontend and backend in separate terminals

Start Docker Desktop and the database first:

```powershell
cd D:\CRM
docker compose up -d db
```

In **Terminal 1 — backend**, enter:

```powershell
cd D:\CRM\apps\api
npm.cmd run dev
```

In **Terminal 2 — frontend**, enter:

```powershell
cd D:\CRM\apps\web
npm.cmd run dev
```

| Address                          | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| http://localhost:5173            | CRM website                                                    |
| http://localhost:4000/api/health | Backend/database health check; should return `{"status":"ok"}` |
| http://localhost:4000/api        | API prefix; not a separate administration website              |

### 1.4 Method B: start everything with Docker

1. Start Docker Desktop.
2. Stop any development frontend on port 5173 with **Ctrl+C**.
3. Open a new PowerShell terminal and enter:

```powershell
cd D:\CRM
docker compose up --build -d --wait
```

4. Wait until the services are healthy.
5. Open **http://localhost:5173**.

The `-d` option runs the containers in the background, so you can close the terminal. Docker Desktop must remain running. `--build` includes your latest code changes.

For later starts without code changes:

```powershell
cd D:\CRM
docker compose up -d --wait
```

In Docker mode, use **http://localhost:5173/api/health** for the health check. The API is reached through the frontend URL; Docker does not expose it on port 4000.

### 1.5 Method C: Docker on port 5175

Use this when you want Docker's web port to be different from the development frontend:

```powershell
cd D:\CRM
$env:WEB_PORT = '5175'
$env:WEB_ORIGIN = 'http://localhost:5175'
docker compose up --build -d --wait
```

Open **http://localhost:5175**. Its health endpoint is **http://localhost:5175/api/health**.

These overrides apply to that PowerShell session. To return Docker to port 5173, stop any frontend already using 5173, then run:

```powershell
Remove-Item Env:WEB_PORT -ErrorAction SilentlyContinue
Remove-Item Env:WEB_ORIGIN -ErrorAction SilentlyContinue
docker compose up -d --wait
```

## 2. Log in and log out

### Administrator login

1. Open `D:\CRM\.env` locally in your editor.
2. Find `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. On the login page, enter those values into **Email address** and **Password**.
4. Click **Sign in to your workspace**.
5. The Dashboard opens.

The initial administrator email was `admin@folio.local`; use the actual value in your `.env` if it has changed. This manual deliberately does not copy the private password into a documentation file.

The seed creates the account in the database. Changing the password text in `.env` afterward does **not** change an existing account's password. Running the seed again also preserves an existing password.

### Team-member login

Use the email and initial password entered by the administrator when creating your account in **Settings → Add member**. There is no invitation-email flow.

### Log out

1. Click the profile avatar in the top-right corner.
2. Click **Sign out**.
3. You return to the login page.

Session refresh happens automatically during normal use. If the session has expired, sign in again. There is currently no self-service password-reset or change-password screen.

## 3. First-time installation

This is needed once on a new computer or a new database, not every morning.

### 3.1 Prerequisites

- Node.js 22 LTS and npm installed.
- Docker Desktop installed with its Linux engine running.
- Project files in `D:\CRM`.
- Ports 4000, 5173, and 55432 available for the default development setup.

Check the tools:

```powershell
node --version
npm.cmd --version
docker --version
```

### 3.2 Create and configure the environment file

```powershell
cd D:\CRM
if (!(Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Open `.env` and configure:

| Setting                        | What to enter                                                 |
| ------------------------------ | ------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_DB` | Local database user and database name; the examples use `crm` |
| `POSTGRES_PASSWORD`            | Your chosen database password                                 |
| `DATABASE_URL`                 | Matching database credentials and local port `55432`          |
| `JWT_SECRET`                   | A random value of at least 32 characters                      |
| `SEED_ADMIN_EMAIL`             | Your initial administrator email                              |
| `SEED_ADMIN_PASSWORD`          | Your initial administrator password, at least 12 characters   |
| `WEB_ORIGIN`                   | `http://localhost:5173` for default local use                 |
| `NODE_ENV`                     | `development` for local use                                   |

Generate a random JWT secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the result into `JWT_SECRET`. Keep `.env` private. If a database password contains special characters, URL-encode them in `DATABASE_URL`.

### 3.3 Install, migrate, and create the administrator

Run from `D:\CRM`, one command at a time. Resolve any error before continuing:

```powershell
npm.cmd ci
npm.cmd run db:generate
docker compose up -d db
npm.cmd run db:migrate
```

Choose **one** seed option:

**Learning/demo workspace — administrator plus 20 fictional Vadodara businesses:**

```powershell
npm.cmd run db:seed
```

**Empty working workspace — administrator only:**

```powershell
npm.cmd run db:seed -w apps/api -- --admin-only
```

The seed can be rerun without duplicating its existing businesses. `--admin-only` does not remove demo data already inserted. Demo contacts are for learning and should not be contacted.

Finally, use a startup method from [section 1](#1-start-the-application).

## 4. Navigation, search, and notifications

### Sidebar pages

| Page       | Route        | Use                                      |
| ---------- | ------------ | ---------------------------------------- |
| Dashboard  | `/`          | Business overview and recent activity    |
| Today      | `/today`     | Daily actions, overdue work, and targets |
| Prospects  | `/prospects` | Business/contact records and filters     |
| Pipeline   | `/pipeline`  | Stage-based board or table               |
| Follow-ups | `/followups` | Next-contact reminders                   |
| Meetings   | `/meetings`  | Appointments and meeting outcomes        |
| Deals      | `/deals`     | Services, proposals, and sales value     |
| Clients    | `/clients`   | Businesses with won deals                |
| Outreach   | `/outreach`  | Recorded calls/messages and responses    |
| Analytics  | `/analytics` | Conversion and acquisition reporting     |
| Settings   | `/settings`  | Profile, targets, and team creation      |

On smaller screens, use the navigation-toggle button in the top bar to open the sidebar.

### Top-bar search

1. Type a business name, contact name, email, phone, or city into **Search your workspace…**.
2. Press **Enter**.
3. The Prospects page opens with matching records.

Despite its workspace label, this search currently searches prospects, not the contents of every note, meeting, or deal. Use the relevant page's search for its own records.

### Notification bell and profile

- The bell opens **Today**. Its indicator reflects today's pending and overdue follow-ups; it is not a separate notification inbox.
- The number beside **Today** is the combined count of today's pending and overdue follow-ups.
- The profile menu provides **Profile & settings** and **Sign out**.

## 5. Dashboard

Open **Dashboard** for an overview of the shared agency workspace.

| Metric                   | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| Total prospects          | Number of prospect records                                                |
| Added in the last 7 days | Recently created prospects                                                |
| Pipeline value           | Total value of deals that are neither Won nor Lost                        |
| Won clients              | Distinct prospects with at least one won deal                             |
| Booked revenue           | Sum of won deal values                                                    |
| Contacted                | Distinct prospects inferred from recorded outreach or their current stage |
| Due today                | Pending follow-ups dated today                                            |
| Meetings scheduled       | Scheduled meetings dated today or later                                   |
| Proposals sent           | Deals currently in the Proposal stage                                     |
| Lost opportunities       | Prospects currently marked Lost                                           |

### Use the Dashboard

1. Check **Today’s follow-ups** and the overdue notice.
2. Complete or reschedule a follow-up using its row controls.
3. Click a business name to open its prospect details.
4. Review the **Sales funnel** and recent activities.
5. Use **Add prospect** to create a new business record.
6. Use **Open today’s workspace** to work through your next actions.

The Dashboard shows a short preview of follow-ups and recent prospects. Open the full module to see more records.

**Revenue is booked sales value, not cash received.** No invoices, payment collection, expenses, or profit calculation are implemented.

## 6. Today — daily sales workspace

Use **Today** as your morning working screen.

### Suggested daily sequence

1. Open **Today**.
2. Handle **Overdue** follow-ups first.
3. Work through **Today’s follow-ups**.
4. Contact businesses under **New prospects to contact**.
5. Check **Interested prospects** and arrange their next step.
6. Prepare for **Meetings today**.
7. Follow up on **Pending proposals**.
8. Review **Upcoming follow-ups** before finishing the day.

Business names open their detail pages. Record completed communication in Outreach and add a note when you need more context.

### Daily target cards

| Target card          | How progress is counted                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| Prospects contacted  | Unique prospects with outreach recorded as sent today                     |
| Follow-ups completed | Follow-ups with a completion timestamp today                              |
| Meetings scheduled   | Meeting records created today, even if the appointment is on a later date |

Default targets are **20 prospects**, **10 follow-ups**, and **2 meetings**. Change them in **Settings**.

The target values belong to the signed-in user, but the current progress counts cover the shared workspace. They are not yet filtered to that user's assigned prospects.

## 7. Prospects

### 7.1 Add a prospect

1. Open **Prospects**.
2. Click **Add prospect**.
3. Enter **Business name**, **City**, and **Country**.
4. Select the **Business category** and **Source**; check any prefilled defaults.
5. Add the contact information and estimated value you know.
6. Select **Priority**, **Stage**, and **Assigned to**.
7. Add initial notes if useful.
8. Click **Create prospect**.

The application saves the record and adds a creation entry to its activity history.

### 7.2 Field reference

| Field group     | Fields and use                                        |
| --------------- | ----------------------------------------------------- |
| Business        | Business name and business category                   |
| Contact         | Contact person, email, phone, WhatsApp number         |
| Online presence | Website, Instagram URL, LinkedIn URL                  |
| Location        | City, state, country                                  |
| Acquisition     | Source: where you found the business                  |
| Sales           | Estimated value in ₹, priority, stage                 |
| Ownership       | Assigned team member; **Me** uses the signed-in user  |
| Context         | Initial notes; add further notes from the detail page |

Use complete `https://...` URLs for websites and social links. Include the country code in telephone and WhatsApp numbers, such as `+91` for India.

**Categories:** Dental Clinic, Gym, Real Estate, Restaurant, Salon, Hospital, Doctor, Coaching Institute, Manufacturer, E-commerce, Retail, Professional Services, Other.

**Sources:** Google Maps, LinkedIn, Instagram, Referral, Website, Cold Email, Cold Call, WhatsApp, Other.

**Priorities:** Low, Medium, High, Hot. Priority indicates urgency; it does not change the sales stage.

### 7.3 Search and filter

1. Type into **Search prospects…** to narrow matching businesses.
2. Click **Filters**.
3. Set any combination of Stage, Priority, Category, Source, City, Assigned user, Created from, Created until, and Follow-up date.
4. Click a result to open it.
5. Click **Clear filters** when finished.

Example: choose **Dental Clinic**, enter **Vadodara**, choose **New**, and select **High** priority.

The Follow-up date filter finds prospects with a follow-up on that date, including completed follow-ups. It is not limited to pending reminders.

The table loads 20 records per page. See the current pagination workaround in [section 21](#21-troubleshooting-and-current-limitations).

### 7.4 Edit or delete

**Edit:** open the business → **Edit prospect** → change fields → **Save changes**.

**Delete:** as an administrator, open the business → click the trash icon → review the confirmation → **Delete prospect**.

Deletion permanently removes its linked notes, activities, follow-ups, meetings, outreach, and deals. A prospect already converted to a client cannot be deleted. SALES and MARKETING users do not have the delete control.

### 7.5 Duplicate protection

The CRM checks normalized email, phone, website, and the combination of business name + city + country. A match on one of these unique identifiers can block a duplicate. Search for the existing record and update it instead of adding it again.

## 8. Pipeline and Kanban

Open **Pipeline** to see the board. Use **Table** or **Board** to change the view. The Prospects page also has these view controls.

### Stages

| Stage             | Suggested use                                   |
| ----------------- | ----------------------------------------------- |
| New               | Newly added business                            |
| Researched        | Business researched and contact details checked |
| Contacted         | First contact made                              |
| Follow Up         | Another contact is needed                       |
| Replied           | A reply was received                            |
| Interested        | There is a potential requirement                |
| Meeting Scheduled | An appointment has been arranged                |
| Proposal Sent     | An offer was sent outside the CRM               |
| Negotiation       | Discussing scope, price, or terms               |
| Won               | The business accepted the engagement            |
| Lost              | The opportunity will not proceed                |

### Move a prospect

1. Find the business card, using search or filters if needed.
2. Drag it into the desired column and release it.
3. Alternatively, choose a stage from the dropdown on the card. This also works without dragging.
4. Wait for the save to finish before opening the record.
5. Open the prospect's **Activity** tab to see the stage-change entry.

Each column shows the number and estimated value of the prospects loaded in that column. The board loads up to **500 matching prospects**; use filters for larger datasets.

Stages are maintained manually. Recording a call or scheduling a meeting does not automatically move the prospect to the corresponding stage. Deal stages and prospect stages are separate; winning a deal is the main automatic conversion described below.

**Moving a prospect to Won has a financial effect:** if no won deal exists, the CRM creates a Custom won deal at the prospect's estimated value and creates/updates its client. For a specific service and agreed price, create and win the actual deal instead. A converted prospect cannot be moved back out of Won.

## 9. Prospect details and quick actions

Click a business name to open `/prospects/<its-id>`.

### Information shown

The page displays the business/category/location, contact details, source, assignee, stage, priority, estimated value, initial notes, and website/social links.

### Quick contact buttons

| Button                 | What it does                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Phone                  | Opens your device's calling application using the saved number                                         |
| Email                  | Opens your configured email application                                                                |
| WhatsApp               | Opens WhatsApp with the saved WhatsApp number, or phone number as a fallback, and a suggested greeting |
| Website / social links | Opens the saved website or profile in another tab                                                      |

Buttons appear when the relevant details exist. Opening one does **not** send or record a message automatically. Send the communication in the external application, then use **Log outreach** to record it.

### Record actions

- **Follow-up:** schedule the next contact for this prospect.
- **Meeting:** arrange an appointment for this prospect.
- **Deal:** record a service opportunity and its value.
- **Log outreach:** record a message or call already made.
- **Mark won:** convert using the estimated-value behavior described in section 8.
- **Mark lost:** mark the prospect lost; it does not automatically close all its separate deal records.

### Detail tabs

| Tab           | Contents                                             |
| ------------- | ---------------------------------------------------- |
| Activity      | Automatically recorded changes, newest first         |
| Notes         | Multiple notes and the Add note form                 |
| Follow-ups    | Pending reminders and completed/missed entries       |
| Meetings      | Appointment details, status, and join links          |
| Deals         | Services, values, stages, and expected closing dates |
| Communication | Recorded outreach messages and replies               |

To edit an existing meeting, deal, or outreach entry, use its main sidebar module and the row's edit control.

## 10. Follow-ups

### Schedule a follow-up

1. Open **Follow-ups → Add follow-up**, or use **Follow-up** on a prospect detail page.
2. Select the prospect if it is not already selected.
3. Choose **Date**, **Time (IST)**, and **Channel**.
4. Leave Status as **Pending** for a future task.
5. Add notes explaining the next action.
6. Click **Save record**.

**Channels:** Call, WhatsApp, Email, LinkedIn, Meeting, Other.

### Find work to do

| Filter    | What it shows                         |
| --------- | ------------------------------------- |
| All       | All loaded follow-up statuses         |
| Today     | Pending follow-ups dated today        |
| Overdue   | Pending follow-ups dated before today |
| Upcoming  | Pending follow-ups after today        |
| Completed | Completed follow-ups                  |

Overdue is based on the calendar date, not whether today's scheduled time has already passed. A pending reminder does not automatically become Missed.

### Complete, reschedule, or mark missed

**Complete:** after performing the action, click the checkmark beside the follow-up. Its status becomes Completed and it leaves the pending lists.

**Reschedule:** click **Reschedule** where shown, or the calendar/edit icon in the Follow-ups table → change Date and Time → **Save record**.

**Missed:** open that edit form → set Status to **Missed** → **Save record**. Missed entries remain visible under All.

To reopen a completed or missed reminder, edit it, select **Pending**, choose a suitable date/time, and save.

Completing a follow-up does not automatically send a message or create an Outreach record. Log the communication separately if you want it counted in outreach reporting.

## 11. Notes and activities

### Add a note

1. Open a prospect.
2. Select **Notes**.
3. Enter the conversation summary, requirement, budget, decision-maker details, or next step.
4. Click **Add note**.
5. The note appears with its author and date.

Example: “Owner wants a five-page website. Budget discussed: ₹40,000. Send scope after Friday's call.”

You can add multiple notes. The current interface does not provide edit/delete controls for individual note entries. The separate **Initial notes** field can be changed through **Edit prospect**.

### Read the activity timeline

Open **Activity** on a prospect or **Recent activity** on the Dashboard. The CRM records actions such as prospect creation/updates, stage changes, notes, follow-up changes, meetings, deal changes, client updates, and recorded outreach.

Activity entries provide a history of saved changes. Clicking a contact shortcut is not evidence that a message was sent, so it does not create a false “sent” activity. Activities are read-only in the interface.

## 12. Meetings

### Create a meeting

1. Open **Meetings → Add meeting**, or **Meeting** on a prospect.
2. Select the prospect.
3. Enter **Meeting title**, **Date**, and **Time (IST)**.
4. Choose the meeting type.
5. Paste an existing meeting URL or enter the location when applicable.
6. Add notes and keep Status as **Scheduled**.
7. Click **Save record**.

**Types:** Phone, Google Meet, Zoom, Office, Client Location.

The CRM stores a Google Meet or Zoom URL; it does not create the meeting link or send invitations. Create the meeting in that provider first, then paste the link here.

### Join and record the outcome

1. Open **Meetings** and search for the business or title.
2. Click **Join** when a meeting link is available.
3. After the meeting, click the pencil/edit control.
4. Set Status to **Completed**, **Cancelled**, or **No Show**, as appropriate.
5. Update notes and click **Save record**.
6. Add a follow-up or deal for the agreed next action.

To reschedule, edit the date/time. There is no external calendar synchronization or invitation delivery.

## 13. Deals and proposals

A prospect is the business relationship. A deal is one potential service engagement, with its own price and stage. One prospect can have multiple deals.

### Create a deal

1. Open **Deals → Add deal**, or **Deal** on the prospect detail page.
2. Select the prospect.
3. Enter a **Deal title**, such as “Website redesign”.
4. Select **Service**.
5. Enter the proposed **Deal value (₹)**.
6. Enter an **Expected close date** if known.
7. Choose the initial Stage, usually **Qualified**.
8. Click **Save record**.

**Services:** Website Development, Web Application, E-commerce Development, CRM Development, SEO, Google Ads, Meta Ads, Social Media, Lead Generation, Maintenance, Automation, Custom.

**Deal stages:** Qualified → Meeting → Proposal → Negotiation → Won or Lost.

### Track a proposal

1. Prepare your proposal document outside the CRM.
2. Send it using your normal email or messaging application.
3. Open **Deals**, find the deal, and click the edit icon.
4. Set Stage to **Proposal** and confirm its value/expected close date.
5. Click **Save record**.
6. Add a follow-up and log the sent communication in Outreach.

The deal now appears among pending proposals. There is no separate proposal document editor, file upload, e-signature, or send-proposal integration.

### Close a deal

**Won:** edit the deal → verify the agreed service/value → set Stage to **Won** → **Save record**.

The CRM sets the actual close date, marks the prospect Won, and creates or updates the corresponding client. The value contributes to booked revenue.

**Lost:** edit an open deal → select **Lost** → **Save record**. It is removed from pipeline value. Update the prospect stage separately if the entire business opportunity is lost.

A won deal cannot be reopened as Qualified, Proposal, or Lost. Its title/service/value can still be edited; changing a won value changes booked revenue and the derived client project value. Check the amount carefully before saving.

Repeatedly saving Won does not create duplicate clients or add the same value twice. Multiple different won deals for the same prospect are added together.

## 14. Clients

Clients are created automatically from won deals; there is no standalone **Add client** button.

### View and update a client

1. Open **Clients**.
2. Search for the business.
3. Review its services, total project value, monthly retainer, start date, and status.
4. Click the edit icon.
5. Select **Active**, **Inactive**, or **Completed**.
6. Enter the **Monthly retainer (₹)** if applicable.
7. Click **Save changes**.

| Field            | Behavior                                                                         |
| ---------------- | -------------------------------------------------------------------------------- |
| Services         | Unique services from the prospect's won deals                                    |
| Project value    | Sum of those won deals                                                           |
| Monthly retainer | A separately entered amount; it is not automatically added to revenue each month |
| Start date       | Set when the client record is created                                            |
| Status           | Manually maintained client relationship status                                   |

Click the business name to return to the prospect and its history. Update contact details on that prospect; saving the won prospect updates its corresponding client details.

Changing a client to Inactive or Completed does not undo historical revenue. Project task management, invoices, recurring billing, and payment collection are outside the current Clients module.

## 15. Outreach tracking

Outreach is a record of communication already performed, not a sending tool.

### Record an attempt

1. Make the call or send the message in your usual application.
2. Open **Outreach → Log outreach**, or **Log outreach** on the prospect.
3. Select the prospect and Channel.
4. Enter the text or summary in **Message sent**.
5. If a reply is already available, enter **Response received**.
6. Check **Positive reply** when the response expresses interest. Response text is required for a positive reply.
7. Check **Generated a meeting** when that attempt led to a meeting.
8. Click **Save record**.

**Channels:** Email, WhatsApp, LinkedIn, Phone, Instagram.

The send timestamp is recorded when you log the attempt. The current form does not offer a historical send-date picker.

### Add a later reply

1. Find the original entry in **Outreach**.
2. Click its edit icon.
3. Enter or update the response and outcome checkboxes.
4. Save the record.

The entry remains in the prospect's **Communication** history. The Generated a meeting checkbox contributes to outreach statistics but does not create an appointment; schedule the meeting separately.

Search on this page currently matches business/title/notes fields, rather than searching the full message or response text. Use the business name to locate its attempts.

## 16. CSV import

Use import when you already have a spreadsheet of prospects.

### Prepare and import the file

1. Open **Prospects** or **Pipeline**.
2. Click **Import CSV**.
3. Click **Download CSV template**.
4. Open it in your spreadsheet application and replace the example row with your data.
5. Save as a UTF-8 CSV, keeping the column names unchanged.
6. Upload the file in the import dialog.
7. Click **Validate CSV**.
8. Review the Valid, Invalid, and Duplicates counts and row-level explanations.
9. Correct the source file and upload it again if necessary.
10. Click **Import N valid rows** when ready.
11. Wait for the success message, close the dialog, and search for an imported business.

Validation does not insert records. Only the final Import button commits them. Invalid and duplicate rows are skipped rather than updating existing businesses.

### Supported template columns

| Column        | Guidance                                                            |
| ------------- | ------------------------------------------------------------------- |
| Business Name | Required                                                            |
| Category      | Required; use one of the categories listed in section 7             |
| Contact Name  | Optional contact person's name                                      |
| Phone         | Optional; keep as text in spreadsheets to preserve the country code |
| Email         | Optional; must be a valid email if supplied                         |
| Website       | Optional full HTTP/HTTPS URL                                        |
| Instagram     | Optional full profile URL                                           |
| LinkedIn      | Optional full profile URL                                           |
| City          | Required                                                            |
| Source        | Required; use one of the sources listed in section 7                |
| Notes         | Optional initial context                                            |

Example with fictional data:

```csv
Business Name,Category,Contact Name,Phone,Email,Website,Instagram,LinkedIn,City,Source,Notes
Example Dental,Dental Clinic,Dr Example,,hello@example.com,https://example.com,,,Vadodara,Referral,Interested in a website
```

The maximum upload is **1,000 rows and 2 MB**. Category/source spelling must match the supported choices. The normal template defaults new records to New, Medium priority, India, ₹0 estimated value, and assignment to the importing user. Edit those fields after import as needed.

Duplicate checks cover the uploaded file and existing CRM records, using the identifiers described in section 7. Import is not a bulk-update feature. If an import is interrupted, retrying will detect rows that were already saved.

## 17. Analytics

Open **Analytics** to review acquisition performance across the shared workspace.

### Available views

- Contact, response, meeting, proposal, close, and overall conversion rates.
- Acquisition funnel: Prospects → Contacted → Replies → Meetings → Proposals → Clients.
- Monthly booked revenue for the displayed six-month period.
- Prospects by acquisition source, business category, and current stage.
- Outreach counts by channel, replies, positive replies, and meetings generated.
- Best-performing acquisition source and business category.

### Understand the rate cards

All ratios below are multiplied by 100 to display a percentage. An empty denominator produces 0%.

| Rate       | Calculation                                                            |
| ---------- | ---------------------------------------------------------------------- |
| Contact    | Contacted prospects ÷ all prospects                                    |
| Response   | Prospects with replies ÷ contacted prospects                           |
| Meeting    | Prospects with meeting records ÷ contacted prospects                   |
| Proposal   | Prospects with proposal-stage-or-later deals ÷ prospects with meetings |
| Close      | Prospects with won deals ÷ proposal prospects                          |
| Conversion | Prospects with won deals ÷ all prospects                               |

Contact/reply counts combine outreach records with certain current prospect stages. Proposal counts in the funnel include Proposal, Negotiation, and Won deals; the Dashboard's **Proposals sent** number counts deals currently at Proposal.

These are unique-prospect milestone counts rather than a strict sequence of completed events. Meeting counts in the funnel include prospects with meeting records regardless of outcome. Skipping stages can produce a funnel that does not decrease at every step, or a rate above 100%.

Best source/category is ranked by won revenue, then won clients, then prospect volume. Monthly revenue follows the won deal's actual close date. Analytics has no custom date-range selector at present.

Use the results to compare where you find valuable prospects and which categories convert. Keep stages and outreach records up to date so the report reflects your work.

## 18. Settings and team members

### Update your profile and targets

1. Open **Settings**.
2. Edit **First name** and **Last name**.
3. Set the daily prospects-contacted, follow-ups-completed, and meetings-scheduled targets.
4. Click **Save settings**.
5. Open **Today** to see the updated target values.

The email field is read-only. Password and email changes are not available in this screen.

### Add a team member — administrator only

1. Open **Settings → Add member**.
2. Enter first name, last name, email, and an initial password of at least 12 characters.
3. Choose a role.
4. Click **Create member**.
5. Give the member their login details through your normal private channel.
6. Assign prospects to them through **Edit prospect → Assigned to**.

### Role permissions

| Capability                              | ADMIN | SALES | MARKETING |
| --------------------------------------- | ----- | ----- | --------- |
| View the shared workspace and reports   | Yes   | Yes   | Yes       |
| Create/edit prospects and sales records | Yes   | Yes   | Yes       |
| Import prospects and add notes/outreach | Yes   | Yes   | Yes       |
| Update own profile/targets              | Yes   | Yes   | Yes       |
| Create team accounts                    | Yes   | No    | No        |
| Delete eligible prospects               | Yes   | No    | No        |

Assigned ownership helps organize work; it does not hide records from other users. SALES and MARKETING currently have the same application permissions. Team-account deletion, role editing, and invitation delivery are not implemented in the UI.

## 19. A complete sales example

Example: acquiring a website-development client.

1. **Add the business:** Prospects → Add prospect → enter business/contact details, Source = Referral, Priority = High, Stage = New → Create prospect.
2. **Research it:** review its website/social profiles → add a note → change its stage to Researched.
3. **Contact it:** send an email in your email application → Log outreach with Channel = Email and a summary → change its stage to Contacted.
4. **Plan the next step:** schedule an Email follow-up for the agreed date/time.
5. **Record the reply:** edit the outreach entry with the response and Positive reply → change the prospect to Interested.
6. **Arrange discovery:** add a meeting → enter or paste the appointment details → change the prospect to Meeting Scheduled if appropriate.
7. **Record the meeting outcome:** mark the meeting Completed → add requirements/budget notes.
8. **Create the opportunity:** add a Website Development deal for ₹45,000 with an expected close date.
9. **Send the proposal externally:** edit the deal to Proposal → update the prospect to Proposal Sent → log the communication and schedule a follow-up.
10. **Negotiate if needed:** update the deal value and stage to Negotiation; update the prospect stage separately.
11. **Win the actual deal:** confirm the agreed amount → edit the deal to Won → save. A client is created automatically and booked revenue increases by the won amount.
12. **Maintain the client:** open Clients → set its status/retainer as required. Add notes and future follow-ups on the linked prospect.

At the end of each day, use **Today** to complete or reschedule remaining tasks. At the end of the week, use **Analytics** to review sources, categories, and conversions.

## 20. Stopping, backups, and maintenance

### Stop development servers

Press **Ctrl+C** in the development terminal, or in both terminals if you started frontend and backend separately.

To stop the local database while keeping its data:

```powershell
cd D:\CRM
docker compose stop db
```

### Stop the full Docker application

```powershell
cd D:\CRM
docker compose stop
```

`docker compose down` also removes the containers/network while retaining the named database volume. Do **not** use `docker compose down -v` unless you intend to delete the stored database volume.

### Back up the Docker database

With the database running, enter:

```powershell
cd D:\CRM
npm.cmd run db:backup
```

The command prints the path of a timestamped `.dump` file in `D:\CRM\.backups`. Keep backups private and store important backups separately from the computer running the CRM.

### Verify that a backup can be restored

Replace the example filename with the actual file printed by the backup command:

```powershell
cd D:\CRM
npm.cmd run db:restore-check -- ".backups\YOUR_BACKUP_FILE.dump"
```

The check restores into an isolated temporary database and removes that database afterward. It does not replace the live CRM database. Restoring production data requires a separate recovery procedure described with your chosen hosting/database provider.

### Developer maintenance commands

Run these from `D:\CRM` when maintaining the application, not as daily sales actions:

| Command                                 | Purpose                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `npm.cmd run db:generate`               | Regenerate the Prisma database client; stop the backend first on Windows |
| `npm.cmd run db:migrate`                | Apply committed database migrations                                      |
| `npm.cmd run build`                     | Compile backend and frontend                                             |
| `npm.cmd run lint`                      | Check source-code lint rules                                             |
| `npm.cmd test`                          | Run database-backed API tests on a development database                  |
| `npm.cmd run test:browser`              | Run browser workflows with the web application running                   |
| `npm.cmd audit`                         | Check installed dependency advisories                                    |
| `docker compose ps`                     | Show container state and ports                                           |
| `docker compose logs --tail 50 api web` | Inspect recent application logs                                          |

Use tests only against a development/test workspace. Read [VERIFICATION.md](VERIFICATION.md) for the latest recorded checks and [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub/Vercel deployment preparation.

## 21. Troubleshooting and current limitations

| Problem                                                 | What to do                                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker daemon/pipe connection error                     | Open Docker Desktop, wait for its Linux engine, then retry `docker compose up -d db`                                                                                                                                    |
| `@prisma/client did not initialize yet`                 | Stop the backend with Ctrl+C. From `D:\CRM`, run `npm.cmd run db:generate`, then `npm.cmd run dev`                                                                                                                      |
| `EPERM` replacing Prisma's Windows engine               | A backend/test process may still be using the engine. Stop the CRM processes before regenerating; do not repeatedly reinstall dependencies while the backend runs                                                       |
| Port 4000 or 5173 is already in use                     | Stop the earlier CRM process or full Docker frontend before starting the same mode again. Use the documented 5175 Docker option if needed                                                                               |
| Login fails                                             | Check the actual seeded account email/password. Editing `.env` does not reset an existing password; ask the administrator if you use a team account                                                                     |
| “Origin is not allowed”                                 | Use the exact configured web origin. For Docker on 5175, set both WEB_PORT and WEB_ORIGIN as shown in section 1                                                                                                         |
| Cannot connect to the database                          | Check Docker state and ensure DATABASE_URL matches the database credentials and local port 55432                                                                                                                        |
| Database password changed but connection still fails    | Changing `.env` does not change the password inside an existing PostgreSQL volume. Restore the matching setting or have the database administrator change the database password; do not delete the volume as a shortcut |
| CSV row rejected                                        | Check required fields, category/source spelling, email/URL formats, and the reported row error                                                                                                                          |
| Duplicate prospect rejected                             | Search for an existing matching email, phone, website, or business/location combination and update that record                                                                                                          |
| A prospect will not leave Won                           | Converted prospects are locked to Won. Manage Active/Inactive/Completed in Clients instead                                                                                                                              |
| Cannot delete a prospect                                | Only ADMIN can delete. Client-linked prospects cannot be deleted                                                                                                                                                        |
| Follow-up still appears overdue                         | Complete it, reschedule its date, or explicitly mark it Missed; overdue does not change status automatically                                                                                                            |
| Contact target did not increase                         | Record outreach after making contact. Clicking Call/Email/WhatsApp or changing the prospect stage alone does not count toward the daily outreach target                                                                 |
| Pipeline value did not increase after adding a prospect | Pipeline value comes from open **deals**, not the prospect's estimated value. Create a deal                                                                                                                             |
| Client retainer does not increase monthly revenue       | Retainers are stored separately; monthly billing/revenue recognition is not automated                                                                                                                                   |
| Prospect table's Next/Previous returns to page 1        | Current UI limitation: pagination changes are reset by the filter handler. Narrow the list with search/filters, or directly open `/prospects?page=2` on your current CRM origin to view page 2                          |

Other current limits to keep in mind:

- One shared agency workspace; no separate customer organizations or per-assignee record isolation.
- Board: up to 500 matching prospects. Follow-ups, meetings, deals, clients, and outreach lists: up to 1,000 records each. Search on those supporting pages filters the loaded records.
- The daily workspace shows a limited preview of new prospects and upcoming follow-ups. Use their full pages to find additional records.
- Notes and activities have no individual edit/delete controls; only initial prospect notes can be edited.
- No automated email/WhatsApp sending, calendar synchronization, proposal files, invoices, payment tracking, or background reminder delivery.
- No password reset, user-role editing, or user deletion in the current interface.
- The Vercel/GitHub setup is prepared, but a live deployment still needs the selected accounts, hosted PostgreSQL, production environment values, and the final HTTPS URL.
