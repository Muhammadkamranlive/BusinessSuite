const DEFAULT_TEMPLATES = [
  {
    key: "user.credentials",
    name: "User credentials (invite)",
    category: "administration",
    description: "Sent when an administrator creates a login for a new company user.",
    subject: "Your {{company_name}} BusinessSuite login",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Welcome to {{company_name}}</h2>
  <p style="line-height:1.6;color:#425466">Hi {{user_name}},</p>
  <p style="line-height:1.6;color:#425466">Your BusinessSuite workspace account is ready. Use the credentials below to sign in.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:12px">
    <tr><td style="padding:12px 16px;color:#64748b">Email</td><td style="padding:12px 16px;font-weight:600">{{user_email}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Temporary password</td><td style="padding:12px 16px;font-weight:600">{{password}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Role</td><td style="padding:12px 16px;font-weight:600">{{role_label}}</td></tr>
  </table>
  <p><a href="{{login_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Sign in</a></p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px">For security, change your password after first login.</p>
</div>`,
    text: `Welcome to {{company_name}}

Hi {{user_name}},

Email: {{user_email}}
Temporary password: {{password}}
Role: {{role_label}}

Sign in: {{login_url}}

Change your password after first login.`,
    variables: ["company_name", "user_name", "user_email", "password", "role_label", "login_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "leave.submitted",
    name: "Leave request submitted",
    category: "hrm",
    description: "Notifies managers/HR when an employee submits leave.",
    subject: "Leave request from {{employee_name}} ({{start_date}} – {{end_date}})",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Leave request submitted</h2>
  <p style="line-height:1.6;color:#425466"><strong>{{employee_name}}</strong> requested <strong>{{leave_type}}</strong> leave.</p>
  <ul style="color:#425466;line-height:1.8">
    <li>Dates: {{start_date}} → {{end_date}}</li>
    <li>Days: {{total_days}}</li>
    <li>Reason: {{reason}}</li>
  </ul>
  <p><a href="{{action_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Review leave</a></p>
</div>`,
    text: `Leave request from {{employee_name}}
Type: {{leave_type}}
Dates: {{start_date}} → {{end_date}} ({{total_days}} days)
Reason: {{reason}}
Review: {{action_url}}`,
    variables: ["employee_name", "leave_type", "start_date", "end_date", "total_days", "reason", "action_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "leave.approved",
    name: "Leave approved",
    category: "hrm",
    description: "Sent to the employee when leave is fully approved.",
    subject: "Your leave request was approved ({{start_date}} – {{end_date}})",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Leave approved</h2>
  <p style="line-height:1.6;color:#425466">Hi {{employee_name}}, your <strong>{{leave_type}}</strong> leave from <strong>{{start_date}}</strong> to <strong>{{end_date}}</strong> ({{total_days}} days) is approved.</p>
  <p style="color:#425466">Approver: {{approver_name}}</p>
</div>`,
    text: `Hi {{employee_name}}, your {{leave_type}} leave ({{start_date}} – {{end_date}}, {{total_days}} days) was approved by {{approver_name}}.`,
    variables: ["employee_name", "leave_type", "start_date", "end_date", "total_days", "approver_name"],
    is_system: true,
    is_active: true
  },
  {
    key: "leave.rejected",
    name: "Leave rejected",
    category: "hrm",
    description: "Sent to the employee when leave is rejected.",
    subject: "Your leave request was not approved",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Leave not approved</h2>
  <p style="line-height:1.6;color:#425466">Hi {{employee_name}}, your <strong>{{leave_type}}</strong> leave request ({{start_date}} – {{end_date}}) was not approved.</p>
  <p style="color:#425466">Reviewed by: {{approver_name}}</p>
</div>`,
    text: `Hi {{employee_name}}, your {{leave_type}} leave ({{start_date}} – {{end_date}}) was not approved by {{approver_name}}.`,
    variables: ["employee_name", "leave_type", "start_date", "end_date", "approver_name"],
    is_system: true,
    is_active: true
  },
  {
    key: "invoice.generated",
    name: "Invoice generated",
    category: "sales",
    description: "Sent to the customer when a sales invoice is created.",
    subject: "Invoice {{invoice_no}} from {{company_name}} — {{total_amount}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Invoice {{invoice_no}}</h2>
  <p style="line-height:1.6;color:#425466">Dear {{customer_name}},</p>
  <p style="line-height:1.6;color:#425466">{{company_name}} has issued invoice <strong>{{invoice_no}}</strong> dated {{invoice_date}}.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:12px">
    <tr><td style="padding:12px 16px;color:#64748b">Amount due</td><td style="padding:12px 16px;font-weight:700;font-size:18px">{{total_amount}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Due date</td><td style="padding:12px 16px;font-weight:600">{{due_date}}</td></tr>
  </table>
  <p><a href="{{invoice_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">View invoice</a></p>
</div>`,
    text: `Invoice {{invoice_no}} from {{company_name}}
Customer: {{customer_name}}
Amount: {{total_amount}}
Date: {{invoice_date}}
Due: {{due_date}}
View: {{invoice_url}}`,
    variables: ["company_name", "customer_name", "invoice_no", "invoice_date", "due_date", "total_amount", "invoice_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "order.approved",
    name: "Sales order approved",
    category: "sales",
    description: "Sent when a sales order is approved for fulfillment.",
    subject: "Order {{order_no}} approved — {{company_name}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Order approved</h2>
  <p style="line-height:1.6;color:#425466">Hello {{customer_name}}, sales order <strong>{{order_no}}</strong> has been approved. Total: <strong>{{total_amount}}</strong>.</p>
  <p><a href="{{order_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">View order</a></p>
</div>`,
    text: `Order {{order_no}} approved for {{customer_name}}. Total {{total_amount}}. {{order_url}}`,
    variables: ["company_name", "customer_name", "order_no", "total_amount", "order_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "survey.assigned",
    name: "Survey / form assigned",
    category: "hrm",
    description: "Sent when an HR form or survey is assigned to an employee.",
    subject: "Please complete: {{form_name}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Form assigned</h2>
  <p style="line-height:1.6;color:#425466">Hi {{employee_name}}, please complete <strong>{{form_name}}</strong> by <strong>{{due_date}}</strong>.</p>
  <p style="line-height:1.6;color:#425466">{{message}}</p>
  <p><a href="{{form_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Open form</a></p>
</div>`,
    text: `Hi {{employee_name}}, please complete {{form_name}}. Due: {{due_date}}. {{form_url}}

{{message}}`,
    variables: ["employee_name", "form_name", "due_date", "message", "form_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "generic.notification",
    name: "Generic notification",
    category: "system",
    description: "Fallback template for operational alerts.",
    subject: "{{title}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">{{title}}</h2>
  <p style="line-height:1.6;color:#425466">{{message}}</p>
  <p style="font-size:12px;color:#94a3b8">{{company_name}}</p>
</div>`,
    text: `{{title}}

{{message}}

— {{company_name}}`,
    variables: ["title", "message", "company_name"],
    is_system: true,
    is_active: true
  },
  {
    key: "security.login",
    name: "Sign-in alert",
    category: "security",
    description: "Sent on every successful login with device / browser details.",
    subject: "Sign-in alert — {{company_name}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Sign-in alert</h2>
  <p style="line-height:1.6;color:#425466">Hi {{user_name}}, a sign-in to your {{company_name}} account was detected.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8fafc;border-radius:12px">
    <tr><td style="padding:12px 16px;color:#64748b">When</td><td style="padding:12px 16px;font-weight:600">{{signed_in_at}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Device</td><td style="padding:12px 16px;font-weight:600">{{device_label}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Browser</td><td style="padding:12px 16px;font-weight:600">{{browser}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">OS</td><td style="padding:12px 16px;font-weight:600">{{os}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">Timezone</td><td style="padding:12px 16px;font-weight:600">{{timezone}}</td></tr>
    <tr><td style="padding:12px 16px;color:#64748b">New device</td><td style="padding:12px 16px;font-weight:600">{{is_new_device}}</td></tr>
  </table>
  <p style="line-height:1.6;color:#425466">If this wasn’t you, change your password immediately.</p>
  <p><a href="{{action_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Review account</a></p>
</div>`,
    text: `Sign-in alert for {{user_name}}

When: {{signed_in_at}}
Device: {{device_label}}
Browser: {{browser}}
OS: {{os}}
Timezone: {{timezone}}
New device: {{is_new_device}}

If this wasn’t you, change your password: {{action_url}}`,
    variables: [
      "company_name",
      "user_name",
      "signed_in_at",
      "device_label",
      "browser",
      "os",
      "device_type",
      "timezone",
      "language",
      "screen",
      "is_new_device",
      "action_url"
    ],
    is_system: true,
    is_active: true
  },
  {
    key: "security.password_changed",
    name: "Password changed",
    category: "security",
    description: "Sent when a user or admin changes the account password.",
    subject: "Your {{company_name}} password was changed",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Password changed</h2>
  <p style="line-height:1.6;color:#425466">Hi {{user_name}}, your password was changed by <strong>{{changed_by}}</strong> at {{changed_at}} from {{device_label}}.</p>
  <p style="line-height:1.6;color:#425466">If you did not request this, reset your password and contact an administrator.</p>
  <p><a href="{{action_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Sign in</a></p>
</div>`,
    text: `Hi {{user_name}}, your {{company_name}} password was changed by {{changed_by}} at {{changed_at}} ({{device_label}}). Sign in: {{action_url}}`,
    variables: ["company_name", "user_name", "changed_by", "changed_at", "device_label", "action_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "account.profile_updated",
    name: "Profile updated",
    category: "administration",
    description: "Sent when a user updates their profile details.",
    subject: "Profile updated — {{company_name}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Profile updated</h2>
  <p style="line-height:1.6;color:#425466">Hi {{user_name}}, your profile was updated at {{updated_at}}.</p>
  <p style="line-height:1.6;color:#425466">{{summary}}</p>
  <p><a href="{{action_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">View profile</a></p>
</div>`,
    text: `Hi {{user_name}}, profile updated at {{updated_at}}. {{summary}} {{action_url}}`,
    variables: ["company_name", "user_name", "summary", "updated_at", "action_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "account.created",
    name: "Account created",
    category: "administration",
    description: "Welcome email when a new account is created (signup).",
    subject: "Welcome to {{company_name}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Welcome, {{user_name}}</h2>
  <p style="line-height:1.6;color:#425466">Your {{company_name}} account is ready. Role: <strong>{{role_label}}</strong>.</p>
  <p><a href="{{login_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Sign in</a></p>
</div>`,
    text: `Welcome {{user_name}} to {{company_name}}. Role: {{role_label}}. Sign in: {{login_url}}`,
    variables: ["company_name", "user_name", "role_label", "login_url"],
    is_system: true,
    is_active: true
  },
  {
    key: "subscription.activated",
    name: "Subscription activated",
    category: "billing",
    description: "Sent when a company subscription becomes active.",
    subject: "Subscription activated — {{package_code}}",
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a2540">
  <h2 style="margin:0 0 12px">Subscription activated</h2>
  <p style="line-height:1.6;color:#425466">Hi {{user_name}}, plan <strong>{{package_code}}</strong> is now active for {{company_name}}.</p>
  <ul style="color:#425466;line-height:1.8">
    <li>Amount: {{amount}}</li>
    <li>Billing: {{interval}}</li>
  </ul>
  <p><a href="{{billing_url}}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">View billing</a></p>
</div>`,
    text: `Subscription {{package_code}} activated for {{company_name}}. Amount {{amount}} / {{interval}}. {{billing_url}}`,
    variables: ["company_name", "user_name", "package_code", "amount", "interval", "billing_url"],
    is_system: true,
    is_active: true
  }
];

module.exports = { DEFAULT_TEMPLATES };
