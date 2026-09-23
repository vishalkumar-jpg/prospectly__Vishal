# Calendar OAuth Redirect URIs - Quick Reference

## ⚠️ IMPORTANT: Security & UX Best Practice

The OAuth flow now uses **frontend callback routes** instead of direct backend calls. This provides:
- ✅ Better security and control
- ✅ Improved user experience
- ✅ Proper error handling in the UI
- ✅ Visibility into the OAuth process

## Production Redirect URIs

Use these **exact** URLs when configuring OAuth apps for each provider:

### Google Calendar & Contacts
```
https://prospectly.officebeacon.net/calendar/callback/google
https://prospectly.officebeacon.net/auth/google-contacts/callback
```

**Also add to Authorized JavaScript origins:**
```
https://prospectly.officebeacon.net
```

### Microsoft Calendar & Contacts (Outlook)
```
https://prospectly.officebeacon.net/calendar/callback/microsoft
https://prospectly.officebeacon.net/auth/microsoft/callback
```

### Zoom
```
https://prospectly.officebeacon.net/calendar/callback/zoom
```

### iCloud Calendar
```
https://prospectly.officebeacon.net/calendar/callback/icloud
```

### Calendly
```
https://prospectly.officebeacon.net/calendar/callback/calendly
```

## OAuth Flow Architecture

```
1. User clicks "Connect Calendar"
   ↓
2. Frontend redirects to provider (Google, Microsoft, etc.)
   with callback = https://prospectly.officebeacon.net/calendar/callback/{provider}
   ↓
3. User authorizes on provider's consent screen
   ↓
4. Provider redirects back to frontend with authorization code
   URL: https://prospectly.officebeacon.net/calendar/callback/{provider}?code=...&state=...
   ↓
5. Frontend (CalendarCallback.tsx) receives the callback
   ↓
6. Frontend sends code to backend edge function
   Calls: supabase.functions.invoke('{provider}-calendar-oauth')
   ↓
7. Backend exchanges code for tokens (securely)
   ↓
8. Backend stores encrypted tokens in database
   ↓
9. Backend returns success to frontend
   ↓
10. Frontend shows success message and redirects to dashboard
```

## Configuration Steps

### 1. Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID (or create new)
3. Click "Edit"
4. Under **"Authorized JavaScript origins"**, add:
   - `https://prospectly.officebeacon.net`
5. Under **"Authorized redirect URIs"**, add:
   - `https://prospectly.officebeacon.net/calendar/callback/google`
   - `https://prospectly.officebeacon.net/auth/google-contacts/callback`
6. Click "Save"

### 2. Azure Portal (Microsoft)
1. Go to https://portal.azure.com/
2. Navigate to Azure Active Directory → App registrations
3. Select your app (or create new)
4. Go to "Authentication"
5. Under "Platform configurations" → "Web", add redirect URI:
   - `https://prospectly.officebeacon.net/calendar/callback/microsoft`
6. Save changes

### 3. Zoom Marketplace
1. Go to https://marketplace.zoom.us/
2. Navigate to your app → "Feature"
3. Under "OAuth Redirect URL", add:
   - `https://prospectly.officebeacon.net/calendar/callback/zoom`
4. Save

### 4. Apple Developer (iCloud)
1. Go to https://developer.apple.com/
2. Navigate to your Services ID
3. Configure "Sign in with Apple"
4. Add redirect URL:
   - `https://prospectly.officebeacon.net/calendar/callback/icloud`
5. Save

### 5. Calendly
1. Go to your Calendly Developer app
2. Under "OAuth Redirect URIs", add:
   - `https://prospectly.officebeacon.net/calendar/callback/calendly`
3. Save

## Testing Locally

For local development, you may want to also add localhost redirect URIs:

```
http://localhost:8080/calendar/callback/{provider}
```

**Note:** Most OAuth providers require HTTPS for production. Only Google and some others allow http://localhost for development.

## Required Supabase Secrets

Make sure these secrets are configured in Supabase:

- `GOOGLE_CLIENT_ID` ✅ (Already configured)
- `GOOGLE_CLIENT_SECRET` ✅ (Already configured)
- `MICROSOFT_CLIENT_ID` ⏳ (Needs to be added)
- `MICROSOFT_CLIENT_SECRET` ⏳ (Needs to be added)
- `ZOOM_CLIENT_ID` ⏳ (Needs to be added)
- `ZOOM_CLIENT_SECRET` ⏳ (Needs to be added)
- `ICLOUD_CLIENT_ID` ⏳ (Needs to be added)
- `ICLOUD_CLIENT_SECRET` ⏳ (Needs to be added)
- `CALENDLY_CLIENT_ID` ⏳ (Needs to be added)
- `CALENDLY_CLIENT_SECRET` ⏳ (Needs to be added)
- `ENCRYPTION_KEY` ✅ (Already configured - used for token encryption)

## Frontend Routes

The app has these routes configured for OAuth callbacks:

```typescript
/calendar/callback/google     → CalendarCallback.tsx
/calendar/callback/microsoft  → CalendarCallback.tsx
/calendar/callback/zoom       → CalendarCallback.tsx
/calendar/callback/icloud     → CalendarCallback.tsx
/calendar/callback/calendly   → CalendarCallback.tsx
```

## Why This Approach?

### ❌ Old Approach (Direct Backend Callback)
```
User → Provider → Supabase Edge Function → Database
```
- Less control over UX
- Harder to handle errors gracefully
- User doesn't see what's happening

### ✅ New Approach (Frontend Callback First)
```
User → Provider → Frontend → Backend → Database → Frontend
```
- Full control over user experience
- Proper error handling and messaging
- Loading states and success confirmation
- More secure (frontend validates before sending to backend)
- Industry standard OAuth pattern

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** The redirect URI in your OAuth app configuration doesn't match exactly. Make sure:
- No trailing slashes
- Exact match (case-sensitive)
- HTTPS (not HTTP) for production
- Correct provider name in URL

### Error: "invalid_client"
**Solution:** Client ID or Client Secret is incorrect. Verify secrets in Supabase.

### Error: "access_denied"
**Solution:** User declined authorization. Have them try again and accept permissions.

---

**Last Updated:** January 2025
**Project:** Prospectly (Office Beacon)
**Production URL:** https://prospectly.officebeacon.net
