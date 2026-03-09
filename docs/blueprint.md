# **App Name**: Prayas

## Core Features:

- Local Data Storage: Store all application data including attendance logs, user credentials, and salary settings locally on the device, as specified by the user's requirements.
- Role-Based Authentication & Switching: Allow users to log in as either an Admin or Partner with role selection and logout functionality to switch profiles seamlessly for testing both roles on the same device.
- Secure User Registration: Implement unique usernames for both roles, auto-assign a permanent 6-digit referral code to Admin, and enable Partner registration using an Admin's code, unique username, and password.
- Partner Approval & Salary Configuration: Admin users can view pending partner registration requests, accept them to activate accounts, and set the base salary for each approved partner.
- Automated Payroll Calculation Logic: Automatically calculate dynamic deductions for late arrivals (>10 mins late = ₹2 per minute) and incentives for overtime (post-checkout work = ₹1 per minute).
- Flexible Check-in/Check-out & Status Display: Provide support for multiple daily check-ins/outs, calculate and display total daily active time, and use color-coded indicators (green, yellow, red lights) to reflect punctuality.
- Exportable Payroll Reports: Generate and export detailed payroll reports (Name, Date, Total Time, Base Salary, Deductions, Incentives, Net Payable) with daily, weekly, monthly, and yearly filtering options, including grand totals.

## Style Guidelines:

- Primary color: A calm and professional cyan blue (#26B3E5) to evoke reliability and clarity in managing finances and attendance.
- Background color: A very light, desaturated blue-green (#E8F5F9) for a clean and unobtrusive backdrop, enhancing readability in a light scheme.
- Accent color: A deep teal-green (#0D927E) analogous to the primary, chosen for high contrast and to draw attention to key actions or data points.
- Headline and body font: 'Inter' (grotesque-style sans-serif) for its modern, neutral, and highly readable design, ensuring clear presentation of all data.
- Utilize simple, clean, and modern icons, specifically incorporating distinct color-coded indicators (green, yellow, red circles) for attendance status as described in the requirements.
- Implement a clean, card-based layout for dashboards and reports, ensuring clear separation of information, hierarchical organization, and intuitive navigation across different roles and views.
- Incorporate subtle animations for form submissions, data filtering, and transitions between screens to provide fluid user feedback and a polished user experience.