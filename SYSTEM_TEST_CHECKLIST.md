# System Test Checklist

## Authentication & Navigation

### Login Page (`pages-login.html`)
- [ ] Page loads correctly
- [ ] Logo displays (IC-LOGO-NEW.png)
- [ ] Company name: "Combined Insurance Services Ltd"
- [ ] Location: "Castries, St. Lucia"
- [ ] Login form submits correctly
- [ ] Redirects to dashboard on success
- [ ] Error messages display correctly
- [ ] Already logged in users redirected to dashboard

### Navigation Menu (`partials/sidenav.html`)
- [ ] Dashboard link → `index.html`
- [ ] Customers link → `customers.html`
- [ ] Policies link → `policies.html`
- [ ] Payments link → `payments.html`
- [ ] Daily Cash Statement link → `daily-cash-statement.html`
- [ ] Renewal Notices link → `renewal-notices.html`
- [ ] User Management link → `users.html`
- [ ] Reports link → `reports.html` (Supervisor+ only)
- [ ] Admin Settings link → `admin-settings.html` (Admin only)
- [ ] Support link → `support.html`
- [ ] Logo click → `index.html`

### Topbar (`partials/topbar.html`)
- [ ] Logo displays correctly
- [ ] User dropdown menu works
- [ ] Logout button works
- [ ] Sidebar toggle works

## Dashboard (`index.html`)

### Statistics Cards
- [ ] Total Customers card - Clickable → Generates All Customers Report
- [ ] Active Policies card - Clickable → Navigates to `policies.html`
- [ ] Outstanding card - Clickable → Generates Outstanding Balance Report
- [ ] Today's Collections card - Clickable → Generates Today's Cash Statement

### Functions
- [ ] `generateAllCustomersReport()` - Works correctly
- [ ] `generateOutstandingBalanceReport()` - Works correctly
- [ ] `generateTodaysCashStatement()` - Works correctly
- [ ] Dashboard stats load correctly
- [ ] Recent customers display
- [ ] Recent policies display
- [ ] Recent payments display

## Customer Management (`customers.html`)

### Functions
- [ ] Customer list loads
- [ ] Add customer button works
- [ ] Edit customer works
- [ ] Delete customer works
- [ ] Search/filter works
- [ ] ID scanning feature (if implemented)

## Policy Management (`policies.html`)

### Functions
- [ ] Policy list loads
- [ ] Add policy button works
- [ ] Edit policy works
- [ ] View policy details works
- [ ] Search/filter works

## Payment Management (`payments.html`)

### Functions
- [ ] Payment list loads
- [ ] Record payment button works
- [ ] Payment form submits correctly
- [ ] Receipt generation works
- [ ] View receipt works

## Daily Cash Statement (`daily-cash-statement.html`)

### Functions
- [ ] Date selection works
- [ ] Generate statement button works
- [ ] Statement displays correctly
- [ ] Print button works
- [ ] PDF export works
- [ ] Logo displays on statement

## Renewal Notices

### Renewal Notices List (`renewal-notices.html`)
- [ ] Month/year selection works
- [ ] Renewal list displays
- [ ] View notice button works

### Renewal Notice (`renewal-notice.html`)
- [ ] Notice displays correctly
- [ ] Logo displays (larger size)
- [ ] Important section shows correct text
- [ ] Print button works
- [ ] PDF export works
- [ ] Company info correct

## Reports (`reports.html`)

### Cash Statement Report
- [ ] Quick buttons work (Today, Week, Month)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

### User Activity Report
- [ ] Quick buttons work (Today, Week, All Time)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

### Policy Report
- [ ] Quick buttons work (Today, Month, All)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

### Payment Report
- [ ] Quick buttons work (Today, Week, Month)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

### Customer Report
- [ ] Quick buttons work (All, Arrears, New)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

### Outstanding Balance Report
- [ ] Quick buttons work (All, Month, Week)
- [ ] Custom date range works
- [ ] Generate button works
- [ ] Report displays correctly

## Report Viewer (`report-viewer.html`)

### Functions
- [ ] Report displays correctly
- [ ] Logo displays
- [ ] Print button works
- [ ] PDF export works
- [ ] Back button works
- [ ] Borders display correctly when printing

## Receipt (`receipt.html`)

### Functions
- [ ] Receipt displays correctly
- [ ] Logo displays
- [ ] Company info correct
- [ ] Print button works
- [ ] Borders display correctly when printing

## User Management (`users.html`)

### Functions
- [ ] User list loads
- [ ] Add user button works
- [ ] Edit user works
- [ ] Delete user works
- [ ] Role assignment works

## Admin Settings (`admin-settings.html`)

### Functions
- [ ] Page loads (Admin only)
- [ ] Data export works
- [ ] Period closing works
- [ ] Settings save correctly

## API Endpoints

### Authentication
- [ ] POST `/api/login` - Works
- [ ] POST `/api/logout` - Works
- [ ] GET `/api/me` - Works

### Customers
- [ ] GET `/api/customers` - Works
- [ ] GET `/api/customers/:id` - Works
- [ ] POST `/api/customers` - Works
- [ ] PUT `/api/customers/:id` - Works
- [ ] DELETE `/api/customers/:id` - Works

### Policies
- [ ] GET `/api/policies` - Works
- [ ] GET `/api/policies/:id` - Works
- [ ] POST `/api/policies` - Works
- [ ] PUT `/api/policies/:id` - Works

### Payments
- [ ] GET `/api/payments` - Works
- [ ] GET `/api/payments/policy/:policyId` - Works
- [ ] POST `/api/payments` - Works

### Reports
- [ ] GET `/api/admin/reports/cash-statement` - Works
- [ ] GET `/api/admin/reports/users` - Works
- [ ] GET `/api/admin/reports/policies` - Works
- [ ] GET `/api/admin/reports/payments` - Works
- [ ] GET `/api/admin/reports/customers` - Works
- [ ] GET `/api/admin/reports/outstanding-balances` - Works

## Print Functionality

### All Documents
- [ ] Receipt - Prints with borders
- [ ] Renewal Notice - Prints with borders
- [ ] Report Viewer - Prints with borders
- [ ] Daily Cash Statement - Prints with borders
- [ ] All logos visible when printing
- [ ] Proper page breaks
- [ ] No content cut off

## Error Handling

### All Pages
- [ ] 401 errors redirect to login
- [ ] 403 errors show permission denied
- [ ] Network errors show user-friendly messages
- [ ] Form validation works
- [ ] Required fields enforced



