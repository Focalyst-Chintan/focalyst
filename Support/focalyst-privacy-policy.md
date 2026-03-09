# Privacy Policy

**Focalyst**
**Effective Date:** March 1, 2026
**Last Updated:** March 1, 2026

This Privacy Policy describes how Focalyst ("we", "our", or "us") collects, uses, stores, and protects your personal information when you use the Focalyst web application ("the App"). By using Focalyst, you agree to the practices described in this policy.

---

## 1. Who We Are

Focalyst is a productivity application built and operated by Chintan. For any privacy-related questions, contact us at **info.chintan.shop@gmail.com**.

---

## 2. Information We Collect

### 2.1 Information You Provide Directly
- **Account information:** Your name and email address, provided when you sign up via Google OAuth or email
- **Profile information:** Your profile type (Student, Freelancer, Creator, Working Professional, Entrepreneur) selected during onboarding
- **Tasks:** Titles, due dates, priorities, and completion status of tasks you create
- **Habits:** Habit names, frequency settings, reminder times, and daily completion logs
- **Notes:** Text content and titles of notes you write in the app
- **Countdowns:** Event names and target dates you enter
- **AI chat messages:** The messages you send to the Focalyst AI assistant

### 2.2 Information Collected Automatically
- **Usage data:** Which features you use, how frequently, and at what times — used to generate your Insights and Productivity Score
- **Pomodoro session data:** Duration, number of sets, and timestamps of focus sessions
- **Device information:** Browser type, operating system, and screen size — used for responsive design and bug fixing
- **Log data:** Server logs including IP address, request timestamps, and error reports — retained for 30 days for security monitoring

### 2.3 Information We Do NOT Collect
- We do not collect your payment card details. All payment processing is handled entirely by Razorpay. We only receive a confirmation of payment status.
- We do not collect your microphone audio. Speech-to-text processing happens entirely on your device using your browser's built-in Web Speech API. No audio is ever transmitted to our servers.
- We do not collect your location data.
- We do not sell your data to advertisers or third parties.

---

## 3. How We Use Your Information

We use your information solely to:
- Provide and operate the Focalyst app
- Personalise your experience based on your profile type and usage patterns
- Generate your weekly and monthly Insights and Productivity Score
- Send you task and habit reminders if you have enabled notifications
- Process subscription payments via Razorpay
- Respond to your support requests
- Detect and fix bugs and security vulnerabilities
- Improve the app based on aggregated, anonymised usage patterns

We do not use your personal data for advertising. We do not share your data with third parties for marketing purposes.

---

## 4. AI and Gemini API

The Focalyst AI assistant is powered by the Google Gemini API. When you send a message to the AI:

- A summary of your current tasks, habits, and focus data is sent to the Gemini API along with your message so the AI can give you relevant, personalised responses
- This data is transmitted securely over HTTPS through our server — it is never sent directly from your browser to Google
- We have configured the Gemini API with zero data retention settings where available, meaning your data is not used by Google to train AI models
- AI chat logs are stored in our database for 30 days to allow conversation context, after which they are automatically deleted
- We recommend you do not share sensitive personal information (passwords, financial details, government ID numbers) in the AI chat

---

## 5. Data Storage and Security

- Your data is stored securely using **Supabase** (PostgreSQL database hosted on AWS infrastructure)
- All data is stored in a region within India or the EU, depending on our Supabase project configuration
- We enforce **Row Level Security (RLS)** on all database tables — this means our database is configured at the technical level so that each user can only access their own data, even if a bug existed in our application code
- All data is transmitted using **HTTPS encryption**
- Access to production systems is limited to authorised personnel only
- We never store your passwords — authentication is handled by Supabase Auth using industry-standard protocols

---

## 6. Data Retention

| Data Type | Retention Period |
|---|---|
| Account and profile data | Until you delete your account |
| Tasks, habits, notes, countdowns | Until you delete them or your account |
| Pomodoro and insight data | Until you delete your account |
| AI chat messages | 30 days from message date |
| Server log data | 30 days |
| Payment records | 7 years (required by Indian accounting law) |

---

## 7. Your Rights

You have the following rights regarding your personal data:

**Right to access:** You may request a copy of all data we hold about you by emailing info.chintan.shop@gmail.com.

**Right to correction:** You can edit your name and profile type directly in the app under Profile → Edit Profile.

**Right to deletion:** You can permanently delete your account and all associated data by going to Profile → Delete my account. This is irreversible. Payment records required by law are retained for the mandatory period.

**Right to data portability:** You may request an export of your data in JSON format by emailing info.chintan.shop@gmail.com. We will respond within 7 business days.

**Right to withdraw consent:** You may withdraw consent for non-essential data processing (such as AI personalisation) by contacting us. Note that withdrawing consent for core processing may limit app functionality.

---

## 8. Cookies and Local Storage

Focalyst uses browser local storage and cookies solely to:
- Maintain your login session so you do not have to sign in on every visit
- Store your UI preferences (such as selected filter chips) between sessions

We do not use advertising cookies, tracking pixels, or third-party analytics cookies.

---

## 9. Third-Party Services

We use the following third-party services to operate Focalyst. Each has their own privacy policy:

| Service | Purpose | Privacy Policy |
|---|---|---|
| **Supabase** | Database and authentication | supabase.com/privacy |
| **Google (Gemini API)** | AI assistant | policies.google.com/privacy |
| **Razorpay** | Payment processing | razorpay.com/privacy |
| **Vercel** | App hosting | vercel.com/legal/privacy-policy |

We do not use Google Analytics, Facebook Pixel, or any advertising networks.

---

## 10. Children's Privacy

Focalyst is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, please contact us at info.chintan.shop@gmail.com and we will delete it promptly.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will notify you by displaying a notice in the app and updating the "Last Updated" date at the top of this page. Your continued use of Focalyst after changes are posted constitutes your acceptance of the updated policy.

---

## 12. Contact Us

For privacy-related questions, data requests, or concerns:

**Email:** info.chintan.shop@gmail.com
**Response time:** Within 5 business days
