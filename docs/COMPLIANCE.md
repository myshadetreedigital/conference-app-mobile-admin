# Compliance pack — privacy, store declarations, submission checklist (2026-09-20)

Working documents for publishing the mobile app. **Not legal advice.** The store questionnaires change their wording from time to time, so treat the answers below as what to select, and confirm each against the live form. Applies to the conference app as built; Section 6 lists what changes for the festival guide.

## 1. What data the app handles (from the schema and code)

| Data | Where | Who can see it | Purpose | Kept until |
|---|---|---|---|---|
| Email address, password (stored hashed by Supabase Auth) | Supabase Auth | The account holder; the platform operator (dashboard) | Sign-in, password-reset code by email | Account deletion |
| First and last name | `profiles` | Own account only | Account | Account deletion |
| Saved sessions (bookmarks) | `bookmarks` | Own account only | "My schedule", clash check | Account deletion |
| **Personal contacts** the user types in (name, email, phone, notes of *other people*) | `personal_contacts` | Own account only; never shared, never shown to other users | The user's private address book | Until the user deletes them, or the account |
| Event content (schedule, speakers, sponsors, info pages, location) | content tables | Everyone (public) | The product itself | Set by the organizer |
| Password-reset emails | Resend (email provider) | The recipient | Password reset | Per provider |

**Not collected:** precise or coarse location, contacts/address book of the phone, photos or camera, microphone, advertising ID, health data, financial data, browsing history. **No analytics, advertising, crash-reporting or tracking SDKs** are in the app (checked `package.json`). No data is sold or shared for advertising.

**Third parties that process data:** Supabase (database and login; hosted region is whatever the project was created in), Resend (sends the reset-code emails), Vercel (hosts the organizer web app only), Apple and Google (app distribution).

**Account deletion:** in-app (More Info → Delete account) calls the `delete-account` edge function, which deletes the login; the profile, bookmarks and contacts are removed with it by database cascade.

## 2. Privacy policy (draft to publish at a public URL)

Fill the bracketed parts, host it on a page you control (the store forms need its URL), and link it in the app's store listing. Have someone qualified read it before publishing if the event runs under GDPR/CCPA-sensitive audiences.

---

**Privacy Policy — [App name]**
*Effective [date]*

[Legal name of the publisher] ("we") publishes [App name] (the "app"). This policy explains what the app collects and how it is used. Questions: [contact email].

**What we collect**
- **Account details:** your email address, password (stored only in scrambled form), first name and last name, when you create an account.
- **Your schedule:** the sessions you save.
- **Your contacts:** if you use the Contacts feature, the names, email addresses, phone numbers and notes you type about people you meet. These are visible only to you. We don't read them, share them or use them for anything else. Only enter details of people who are comfortable with you keeping them.

We do not collect your location, your phone's contacts, photos, or advertising identifiers, and the app contains no advertising or analytics tools.

**How we use it**
To let you sign in, keep your schedule and contacts on your account, and send you a one-time code by email when you reset your password. We don't sell your information or use it for advertising.

**Who handles it for us**
Our database and sign-in provider (Supabase) stores your data on our behalf, and our email provider (Resend) delivers password-reset emails. They may only use it to provide those services.

**How long we keep it, and deleting it**
We keep your information until you delete your account. In the app, go to More Info → Delete account. This permanently removes your account, saved schedule and contacts. You can also ask us to delete it by emailing [contact email]; we will do so within [30] days.

**Your choices and rights**
You can see and change your name, delete individual contacts, and delete your account at any time. Depending on where you live you may have further rights (to access, correct or export your data, or to object); email [contact email] and we will respond within [30] days.

**Security**
Data is sent over encrypted connections and access to it is restricted so that you can only read your own account data. No system is perfectly secure.

**Children**
The app is not directed at children under 13 [under 16 in some countries], and we don't knowingly collect their information.

**Changes**
If we change this policy we will update the date above and, for significant changes, tell you in the app.

---

## 3. Apple — App Store Connect

- **Privacy Policy URL:** the page above. **Support URL:** a page or mailto with a real contact.
- **App Privacy ("nutrition label")** — data types to declare as collected, all **linked to the user**, **not used for tracking**, purpose **App Functionality**:
  - Contact Info → **Email Address**, **Name**, **Phone Number** and **Other User Contact Info** (the contacts a user types; declare it because it is stored on the server).
  - User Content → **Other User Content** (contact notes).
  - Identifiers → **User ID** (the account id).
  - "Do you or your third-party partners use data for tracking?" → **No**. No data types under Diagnostics, Location, Usage Data, Purchases or Financial.
- **Account deletion (guideline 5.1.1(v)):** met, in-app and easy to find. Mention its location in the review notes.
- **Sign in with Apple (4.8):** not required; the app offers no third-party or social login.
- **Export compliance:** the app uses only standard HTTPS. `ITSAppUsesNonExemptEncryption: false` is set in `app.config.ts`, so the encryption question is skipped.
- **App Review notes:** the app needs an account to save things; give the reviewer a working demo login (create one for the review, keep its password out of this repo) and say where Delete account is. If browsing without sign-in is added (festival), say so.
- **Age rating questionnaire:** the conference app has no objectionable content, no user-to-user messaging, no web browsing inside the app, no gambling, no unrestricted web access → expected **4+**. Links open in the system browser.
- **Screenshots** (required sizes for iPhone 6.9"/6.7" and 6.5" or per current App Store Connect) and a **1024×1024 icon without transparency**, app name, subtitle, description, keywords, category (Events or Productivity), copyright.
- **Bundle ID** `com.myshadetreedigital.conferenceapp` is **permanent once published**; the app name is still the placeholder "Conference App" (both in `app.config.ts`). Set the real name and identifiers before the first build.

## 4. Google Play

- **Data safety form:** same inventory as above. Collected: Personal info (Name, Email address, Phone number), User ID, "Other user-generated content" (contact notes). All **not shared** with third parties (Supabase and Resend are service providers acting on our behalf, which Google treats as not "sharing"), purpose **App functionality / Account management**. Data **encrypted in transit: Yes**. **Users can request deletion: Yes.**
- **Account deletion requirement:** Google requires the in-app path (present) **and a web URL** where a user can request deletion without the app. Simplest: a section on the privacy policy page ("email [contact email] from your account address") and enter that URL in Play Console → App content → Data deletion.
- **Content rating (IARC questionnaire):** answer honestly; expect the lowest rating (Everyone).
- **Target audience:** 18+ or general, not children. **Ads:** none. **App access:** provide a demo login for reviewers, as for Apple.
- **Package name** `com.myshadetreedigital.conferenceapp`, same permanence warning.
- A personal Play account created after Nov 2023 must run a **closed test (12 testers for 14 days)** before requesting production access. An organization account is exempt. Check which type you have **now**; it can dominate the schedule.

## 5. Build and submission checklist

Blocked on the owner:
1. Apple Developer Program account (individual is quick; organization needs a D-U-N-S number) and, for Android, a Google Play Developer account.
2. Publisher legal name, contact email and a URL to host the privacy policy.
3. Final app name, bundle identifier / package name, icon (1024×1024, no transparency; plus Android adaptive icon layers), splash, store screenshots.
4. A demo account for reviewers.

Then:
5. Run `eas init`, install EAS CLI, and create the project (the `eas.json` in the repo is a stock skeleton).
6. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_EVENT_ID` as EAS environment variables (the `.env.local` file is not used by cloud builds).
7. Build production (`eas build --platform ios`), upload to App Store Connect with `eas submit`, test through TestFlight on a real device (**confirm session times show in the event's zone and the conflict check behaves**).
8. Fill in the sections above, submit for review.

Also check in the Supabase dashboard the items in `SECURITY-REVIEW-2026-09.md` ("Things only the owner can check"), and apply migration `0022`.

## 6. What changes for the festival guide

- **Age rating:** nightlife and alcohol references (parties, bars, drink icons) push the Apple rating up (expect **17+**/"Frequent/Intense Alcohol, Tobacco or Drug Use or References" if the content shows bars and parties heavily); answer the questionnaire from the real listings. On Google, answer the IARC questionnaire the same way. No sign-in is *required* for adult content by either store; it's the rating that governs.
- **Signed-out browsing:** the review notes must say what needs an account (saving), so the reviewer isn't blocked. Apple's rule (5.1.1) prefers exactly this design.
- **Organizer profiles are public** (all fields, by decision), so the onboarding form must tell organizers their contact details will be published, and the privacy policy should say organizer information is published in the app by the platform operator.
- **No user-generated content** is shown to other users (only the owner publishes), so guideline 1.2 (report/block controls) is not triggered. If that changes, it is.
- **Personal contacts** may or may not survive into the festival product; if removed, drop the row from the data inventory and the Apple/Google declarations.
- **New identifiers:** own bundle ID / package name, name, icon, privacy policy URL, developer listing, Supabase and Vercel projects.
