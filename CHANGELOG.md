# Changelog

## Latest Updates

### Fixed Issues
1. **Logout Button**: Fixed logout functionality by making `handleLogout` globally accessible via `window.handleLogout`
2. **Menu Cleanup**: Removed all unnecessary menu items, keeping only:
   - Dashboard
   - Customers
   - Policies
   - Payments
   - Daily Cash Statement
   - User Management

### New Features
1. **ID Scanning**: Added OCR-based ID scanning feature using Tesseract.js
   - Upload or take a photo of an ID card
   - Automatically extracts and fills in:
     - First Name, Middle Name, Last Name
     - ID Number
     - Email Address
     - Contact Number
     - Sex/Gender
     - Address
   - Shows preview of uploaded ID image
   - Uses OCR (Optical Character Recognition) to read text from ID images

### Technical Details

#### ID Scanning Implementation
- Uses Tesseract.js library (loaded via CDN)
- Supports common ID card formats
- Parses extracted text using pattern matching for:
  - Names (capitalized words)
  - ID numbers (6-20 digits)
  - Email addresses
  - Phone numbers
  - Gender indicators
  - Address information

#### Menu Structure
The menu now only shows essential I&C Insurance features:
- Dashboard: Overview statistics
- Customers: Customer management with ID scanning
- Policies: Policy management
- Payments: Payment processing
- Daily Cash Statement: Financial reports
- User Management: User and role management

### Usage

#### ID Scanning
1. Click "Add Customer" button
2. Click "Scan ID" button next to ID Number field
3. Select an image file or take a photo
4. Wait for OCR processing (shows progress)
5. Review auto-filled information
6. Complete any missing fields manually
7. Save customer

#### Logout
- Click on user avatar in top-right corner
- Click "Logout" from dropdown menu
- System will log out and redirect to login page



