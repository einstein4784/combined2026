# Permission System Review and Updates
## Date: 2025-12-19

---

## CURRENT PERMISSIONS ANALYSIS

### Existing Permissions:
1. `create_edit_customer` - Create/edit customers
2. `create_edit_policy` - Create/edit policies
3. `receive_payment` - Record payments
4. `generate_user_report` - Generate user reports
5. `generate_cash_statements` - Generate cash statements
6. `create_edit_delete_user` - Manage users
7. `override_outstanding_balance` - Override payment validation
8. `reset_system` - Reset system data
9. `close_period` - Close financial periods
10. `view_dashboard` - View dashboard (used broadly)
11. `manage_permissions` - Manage permissions and roles
12. `approve_deletions` - Approve delete requests

### Current Admin Permissions:
- ✅ Admin has ALL permissions: `Object.keys(SYSTEM_FUNCTIONS)`

---

## IDENTIFIED GAPS AND RECOMMENDATIONS

### Missing Permissions That Should Be Added:

1. **`renew_policy`** - Renew policies
   - Currently uses: `view_dashboard`
   - Should be separate for better granularity

2. **`void_restore_receipt`** - Void/restore receipts
   - Currently uses: `manage_permissions`
   - Should be separate for better control

3. **`send_renewal_notices`** - Send renewal notices/emails
   - Currently: No explicit permission check found
   - Should be added for email sending functionality

4. **`manage_coverage_types`** - Manage coverage types
   - Currently uses: `manage_permissions`
   - Could be separate for delegation

5. **`view_reports`** - View reports (read-only)
   - Currently uses: `generate_cash_statements`
   - Should be separate for read vs. generate distinction

6. **`manage_backups`** - Create/restore backups
   - Currently uses: `manage_permissions`
   - Could be separate for delegation

---

## RECOMMENDED APPROACH

Since Admin already has all permissions, we should:
1. Add new granular permissions for better control
2. Ensure Admin automatically gets all new permissions (already handled via Object.keys)
3. Update code to use appropriate permissions
4. Keep backward compatibility where possible

---

## DECISION: Minimal Changes Approach

Given that:
- Admin already has access to everything
- The system is working
- Too many permissions can be overwhelming

**Recommendation**: Add only the most critical missing permissions:
- `renew_policy` - For policy renewals
- `void_restore_receipt` - For receipt management
- `send_renewal_notices` - For email functionality

These are distinct operations that might need separate permission control.



