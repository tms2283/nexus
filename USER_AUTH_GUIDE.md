# User Authentication & Data Persistence Guide

## Overview

Timverse uses a **hybrid authentication system** that supports both anonymous visitors and authenticated users, with persistent data storage for both.

## Architecture

### 1. Authentication System

#### Anonymous Users (Cookie-Based)
- **Identifier:** `cookieId` (24-character nanoid)
- **Storage:** Browser cookie (`tv_visitor_id`)
- **Duration:** 365 days
- **Use Case:** Visitors who haven't signed in
- **Data Stored:** Visitor profiles, quiz results, basic interactions

#### Authenticated Users (OAuth)
- **Provider:** Manus OAuth
- **Identifier:** `userId` (database primary key) + `openId` (OAuth identifier)
- **Storage:** JWT session cookie (secure, httpOnly)
- **Duration:** Configurable session timeout
- **Use Case:** Users who sign in with Manus account
- **Data Stored:** Full user profile, all learning progress, preferences

### 2. Database Schema

#### Users Table
```sql
users {
  id: int (primary key)
  openId: varchar (unique OAuth identifier)
  name: text
  email: varchar
  loginMethod: varchar
  role: enum (user | admin)
  createdAt: timestamp
  updatedAt: timestamp
  lastSignedIn: timestamp
}
```

#### Data Tables (All Have userId Field)
- `lesson_progress` - Track lesson completion, time spent, attempts
- `curriculum_progress` - Track curriculum completion percentage
- `lesson_ratings` - 5-star ratings and feedback
- `lesson_questions` - Q&A on lessons
- `lesson_answers` - AI-generated answers to questions
- `lesson_feedback` - Detailed feedback on lessons
- `visitor_profiles` - Optional: visitor-specific data

### 3. Data Persistence Flow

#### For Anonymous Users
```
User Visits → Browser Cookie Created (cookieId)
                    ↓
            Data Stored with cookieId
                    ↓
            Persists for 365 days
                    ↓
            Lost if cookies cleared
```

#### For Authenticated Users
```
User Signs In (OAuth) → Session JWT Created
                    ↓
            userId Stored in JWT
                    ↓
            All Data Linked to userId
                    ↓
            Persists Indefinitely
                    ↓
            Survives Cookie Deletion
                    ↓
            Accessible Across Devices
```

### 4. Multi-User Data Isolation

#### Database Level
- All queries filter by `userId` when user is authenticated
- Anonymous queries filter by `cookieId`
- Foreign key relationships maintain data integrity

#### Application Level
- `useAuth()` hook provides authenticated user context
- `PersonalizationContext` manages user-specific data
- Session middleware validates user identity on every request

#### API Level (tRPC)
- `protectedProcedure` requires authentication
- `publicProcedure` accepts both authenticated and anonymous users
- Context includes `user` object for authorization checks

### 5. Session Management

#### Session Creation
```typescript
// User clicks "Sign In"
→ Redirects to Manus OAuth portal
→ User authenticates
→ Callback to /api/oauth/callback
→ JWT session cookie created
→ Redirect to app
```

#### Session Validation
```typescript
// Every API request
→ Extract JWT from httpOnly cookie
→ Verify signature with JWT_SECRET
→ Extract userId from token
→ Validate user exists in database
→ Inject user context into request
```

#### Session Termination
```typescript
// User clicks "Sign Out"
→ Call trpc.auth.logout mutation
→ Clear session cookie
→ Clear cached user data
→ Redirect to login
```

## Implementation Details

### Storing Authenticated User Data

```typescript
// When user completes a lesson
const completeLessonMutation = trpc.ai.completeLesson.useMutation({
  onSuccess: () => {
    // Data automatically saved to database with userId
    // Query: INSERT INTO lesson_progress (userId, lessonId, completedAt) VALUES (...)
  }
});

// In server procedure
export const completeLesson = protectedProcedure
  .input(z.object({ lessonId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // ctx.user contains authenticated user info
    // userId is automatically included in database insert
    return db.lessonProgress.create({
      userId: ctx.user.id,  // Automatically set from JWT
      lessonId: input.lessonId,
      completedAt: new Date(),
    });
  });
```

### Retrieving User-Specific Data

```typescript
// Get user's progress
const progressQuery = trpc.ai.getUserProgress.useQuery(
  { cookieId }, // Falls back to cookieId if not authenticated
  { enabled: !!cookieId }
);

// In server procedure
export const getUserProgress = publicProcedure
  .input(z.object({ cookieId: z.string() }))
  .query(async ({ ctx, input }) => {
    // If authenticated, use userId
    if (ctx.user) {
      return db.lessonProgress.findMany({
        where: { userId: ctx.user.id }
      });
    }
    // Otherwise, use cookieId
    return db.lessonProgress.findMany({
      where: { cookieId: input.cookieId }
    });
  });
```

### Migrating Anonymous Data to Authenticated User

When a user signs in after using the app anonymously:

```typescript
// Migration procedure
export const migrateAnonymousData = protectedProcedure
  .input(z.object({ cookieId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Find all data associated with cookieId
    const anonymousProgress = await db.lessonProgress.findMany({
      where: { cookieId: input.cookieId }
    });

    // Update all records to include userId
    for (const progress of anonymousProgress) {
      await db.lessonProgress.update({
        where: { id: progress.id },
        data: { userId: ctx.user.id }
      });
    }

    return { migrated: anonymousProgress.length };
  });
```

## User Experience

### Anonymous User
1. Visits site → Cookie created automatically
2. Completes lessons → Progress saved to database with cookieId
3. Closes browser → Cookie persists (365 days)
4. Returns later → Same progress visible
5. **Problem:** Progress lost if cookies cleared or different device

### Authenticated User
1. Visits site → Clicks "Sign In"
2. Authenticates with Manus OAuth
3. Completes lessons → Progress saved with userId
4. Closes browser → Session cookie persists
5. Returns later → Same progress visible (any device)
6. **Benefit:** Permanent, cross-device, account-based storage

## Security Considerations

### Session Security
- JWT tokens stored in httpOnly cookies (not accessible to JavaScript)
- Tokens signed with `JWT_SECRET` (never exposed to client)
- Tokens include expiration time
- Tokens validated on every API request

### Data Privacy
- Each user can only access their own data
- Database queries include userId filter
- No cross-user data leakage possible
- Admin role can access all data (if needed)

### Cookie Security
- SameSite=Lax prevents CSRF attacks
- Secure flag set in production (HTTPS only)
- Path=/  restricts to entire domain
- HttpOnly flag prevents JavaScript access (for session cookies)

## Multi-User Scenarios

### Scenario 1: Two Users, Same Computer
```
User A Signs In → userId=1 → Completes Lesson 1
                              ↓
User A Signs Out
                              ↓
User B Signs In → userId=2 → Completes Lesson 1
                              ↓
Database:
  lesson_progress { userId: 1, lessonId: 1 }
  lesson_progress { userId: 2, lessonId: 1 }
```
✅ Data properly isolated by userId

### Scenario 2: One User, Multiple Devices
```
Device A (Laptop) → Sign In → userId=1 → Complete Lesson 1
Device B (Phone)  → Sign In → userId=1 → Complete Lesson 2
                              ↓
Database:
  lesson_progress { userId: 1, lessonId: 1, device: laptop }
  lesson_progress { userId: 1, lessonId: 2, device: phone }
```
✅ All progress visible on both devices

### Scenario 3: Anonymous → Authenticated
```
Anonymous User → cookieId=abc123 → Complete Lesson 1
                                   ↓
                           Sign In
                                   ↓
Authenticated User → userId=1 → Data Migrated
                                   ↓
Database:
  lesson_progress { userId: 1, lessonId: 1 }
```
✅ Previous progress preserved after login

## Configuration

### Environment Variables
```bash
JWT_SECRET=your-secret-key              # Session signing key
DATABASE_URL=mysql://...                # Database connection
OAUTH_SERVER_URL=https://api.manus.im   # OAuth provider
VITE_OAUTH_PORTAL_URL=https://...       # OAuth login portal
```

### Session Duration
Default: 7 days (configurable in OAuth settings)

### Cookie Settings
- Name: `session` (httpOnly, Secure, SameSite=Lax)
- Visitor ID: `tv_visitor_id` (365 days)

## Best Practices

### For Users
1. **Sign In** to ensure data persistence
2. **Don't clear cookies** if using anonymous mode
3. **Use same account** across devices
4. **Enable email notifications** for progress updates

### For Developers
1. **Always check authentication** before sensitive operations
2. **Filter queries by userId** when authenticated
3. **Migrate anonymous data** when user signs in
4. **Log user actions** for audit trail
5. **Validate permissions** before data access

## Troubleshooting

### "Progress Lost After Signing In"
- Anonymous data not migrated automatically
- Solution: Implement migration on first login

### "Different Progress on Different Devices"
- User not signed in on both devices
- Solution: Ensure user is authenticated on all devices

### "Can't Sign In"
- Session cookie not being set
- Solution: Check OAuth configuration and CORS settings

### "Data Visible to Other Users"
- Missing userId filter in query
- Solution: Always include `where: { userId: ctx.user.id }`

## Future Enhancements

1. **Two-Factor Authentication** - Additional security layer
2. **Social Login** - Google, GitHub, etc.
3. **Data Export** - Download user data as JSON/CSV
4. **Account Linking** - Link multiple OAuth providers
5. **Session Management** - View active sessions, remote logout
6. **Activity Log** - Track all user actions
7. **Backup & Recovery** - Automatic data backups
