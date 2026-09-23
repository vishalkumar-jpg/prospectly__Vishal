# LogRocket Integration Guide

LogRocket has been successfully integrated into the Prospectly application for session replay, error tracking, and performance monitoring.

## 🚀 Quick Start

### 1. Get Your LogRocket App ID

1. Sign up or log in at [LogRocket](https://app.logrocket.com/)
2. Create a new project or select an existing one
3. Go to **Settings** → **Project Settings**
4. Copy your **App ID** (format: `xxxxx/your-app-name`)

### 2. Configure Environment Variables

Add the following to your `.env` file in the `client` directory:

```bash
VITE_LOGROCKET_APP_ID=xxxxx/your-app-name
VITE_LOGROCKET_ENABLED=true
```

**Important:**

- Set `VITE_LOGROCKET_ENABLED=false` in development to avoid recording dev sessions
- Set `VITE_LOGROCKET_ENABLED=true` in production to enable session tracking

### 3. Restart the Development Server

After adding the environment variables, restart your dev server:

```bash
cd client
npm run dev
# or
bun run dev
```

## 📋 Features Implemented

### ✅ Session Replay

- Records user interactions, clicks, and navigation
- Captures DOM changes and user inputs (sanitized)
- Helps reproduce bugs exactly as users experienced them

### ✅ Error Tracking

- Automatic capture of JavaScript errors
- React Error Boundary integration
- Stack traces and component trees
- Console logs included in sessions

### ✅ User Identification

- Automatically identifies users on login
- Tracks user email, name, and role
- Links sessions to specific users

### ✅ Network Monitoring

- Records all API requests and responses
- Automatic sanitization of sensitive data:
  - Authorization headers
  - Passwords
  - Tokens
  - API keys

### ✅ Performance Metrics

- Page load times
- API response times
- Resource loading performance

## 🔒 Privacy & Security

The integration includes automatic sanitization of sensitive data:

### Request Sanitization

- Authorization headers removed
- Password fields redacted
- API keys hidden
- Tokens masked

### Response Sanitization

- Access tokens redacted
- Refresh tokens hidden
- API keys masked

### Input Sanitization

- Input fields automatically sanitized
- Text content sanitized
- Sensitive form data protected

## 📊 Usage Examples

### Track Custom Events

```typescript
import { logRocketService } from "@/lib/logrocket";

// Track a custom event
logRocketService.track("Feature Used", {
  featureName: "Export Contacts",
  timestamp: new Date().toISOString(),
});
```

### Capture Exceptions

```typescript
import { logRocketService } from "@/lib/logrocket";

try {
  // Your code
} catch (error) {
  logRocketService.captureException(error, {
    context: "Import Contacts",
    userId: user.id,
  });
}
```

### Add Session Data

```typescript
import { logRocketService } from "@/lib/logrocket";

// Add custom data to the session
logRocketService.addSessionData("subscription_tier", "premium");
logRocketService.addSessionData("feature_flags", { newUI: true });
```

### Get Session URL

```typescript
import { logRocketService } from "@/lib/logrocket";

// Get the current session URL for support tickets
logRocketService.getSessionURL((sessionURL) => {
  console.log("Share this URL with support:", sessionURL);
});
```

## 🛠️ Components

### LogRocket Service (`/src/lib/logrocket.ts`)

Central service for all LogRocket operations:

- `init()` - Initialize LogRocket
- `identify(userId, traits)` - Identify users
- `track(event, properties)` - Track custom events
- `captureException(error, data)` - Capture errors
- `getSessionURL(callback)` - Get session URL

### Error Boundary (`/src/components/ErrorBoundary.tsx`)

React Error Boundary that:

- Catches React component errors
- Reports errors to LogRocket
- Shows user-friendly error UI
- Provides session URL for debugging

### Integration Points

1. **main.tsx** - LogRocket initialized before React renders
2. **AuthContext.tsx** - User identification on login
3. **App.tsx** - Error Boundary wraps entire app

## 🔍 Viewing Sessions

1. Log in to [LogRocket Dashboard](https://app.logrocket.com/)
2. Select your project
3. View sessions in the **Sessions** tab
4. Filter by:
   - User email
   - Error events
   - Custom events
   - Date range

## 🎯 Best Practices

### Development

- Keep `VITE_LOGROCKET_ENABLED=false` in development
- Test LogRocket in staging environment first

### Production

- Enable LogRocket: `VITE_LOGROCKET_ENABLED=true`
- Monitor session volume (LogRocket has usage limits)
- Review sanitization rules regularly

### Privacy

- Never log sensitive user data
- Review recorded sessions for PII
- Update sanitization rules as needed
- Comply with GDPR/privacy regulations

## 📈 Monitoring Tips

### Track Important Events

```typescript
// User actions
logRocketService.track("Contact Imported");
logRocketService.track("Introduction Sent");
logRocketService.track("Payment Processed");

// Feature usage
logRocketService.track("Feature Accessed", {
  feature: "Prospect Hub",
  timestamp: Date.now(),
});
```

### Error Context

```typescript
try {
  await importContacts(file);
} catch (error) {
  logRocketService.captureException(error, {
    fileName: file.name,
    fileSize: file.size,
    action: "import_contacts",
  });
}
```

## 🆘 Troubleshooting

### LogRocket Not Recording

1. Check environment variables are set correctly
2. Verify `VITE_LOGROCKET_ENABLED=true`
3. Check browser console for initialization errors
4. Ensure App ID format is correct: `xxxxx/app-name`

### Sessions Not Showing Users

- Verify user identification is called after login
- Check user ID and email are being passed correctly
- Look for errors in browser console

### Network Requests Not Captured

- LogRocket captures XHR and Fetch requests automatically
- Check if requests are being blocked by CORS
- Verify sanitization rules aren't too aggressive

## 📚 Additional Resources

- [LogRocket Documentation](https://docs.logrocket.com/)
- [LogRocket React Guide](https://docs.logrocket.com/docs/react)
- [Privacy & Security](https://docs.logrocket.com/docs/privacy-security)
- [API Reference](https://docs.logrocket.com/reference)

## 🔄 Updates & Maintenance

To update LogRocket:

```bash
cd client
npm update logrocket
# or
bun update logrocket
```

Check for breaking changes in the [changelog](https://github.com/LogRocket/logrocket-js/releases).

---

**Need Help?** Contact the development team or refer to the [LogRocket Support](https://logrocket.com/support).
