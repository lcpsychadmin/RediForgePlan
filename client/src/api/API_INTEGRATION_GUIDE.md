# API Integration Layer Documentation

## Overview

The RediForge frontend API integration layer provides a complete, type-safe data fetching and state management solution using:

- **Axios**: HTTP client with JWT authentication and 401 handling
- **React Query (@tanstack/react-query)**: Server state management with automatic caching and invalidation
- **TypeScript**: Full type safety for API responses and request payloads
- **Custom Error Handling**: Normalized error handling across all endpoints

## Architecture

### File Structure

```
client/src/api/
├── client.ts                 # Axios instance with interceptors
├── errorHandler.ts           # Error parsing and utilities
├── queryClient.ts            # React Query configuration
├── types.ts                  # Complete TypeScript interfaces (400+ lines)
└── hooks/
    ├── usePrograms.ts        # Program CRUD operations
    ├── useMockCycles.ts      # Mock Cycle CRUD operations
    ├── useProjects.ts        # Project CRUD operations
    ├── useGlobalObjects.ts   # Global Object CRUD operations
    ├── useProjectObjects.ts  # Project Object CRUD operations
    ├── useDependencies.ts    # Dependency management
    ├── useTaskGroups.ts      # Task Group CRUD operations
    ├── useTasks.ts           # Task CRUD operations with optimistic updates
    ├── usePriorities.ts      # Priority and status queries
    ├── useSchedule.ts        # Schedule CRUD operations with optimistic updates
    ├── useAuditLogs.ts       # Audit log queries (admin only)
    └── index.ts              # Barrel export for all hooks
```

## Core Components

### 1. API Client (`client.ts`)

**Base Configuration**:
- Base URL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`
- Timeout: 30 seconds
- Content-Type: `application/json`

**Request Interceptor**:
- Automatically attaches JWT token from `localStorage.authToken` as `Authorization: Bearer {token}`

**Response Interceptor**:
- Handles 401 Unauthorized by clearing token and invoking logout callback
- Logs error details in development mode
- Normalizes errors through `parseApiError` utility

**Logout Callback Registration**:
```typescript
import { setLogoutCallback } from './api/client';

// In your auth context or app initialization
const { logout } = useAuth();
setLogoutCallback(logout);
```

### 2. Error Handling (`errorHandler.ts`)

Provides 8+ utility functions for error parsing and classification:

```typescript
import { parseApiError, isAuthError, isNotFoundError, formatErrorMessage } from './api/errorHandler';

// Parse any error
const apiError = parseApiError(error);

// Check error type
if (isAuthError(apiError)) { /* handle 401 */ }
if (isNotFoundError(apiError)) { /* handle 404 */ }

// Format for UI
const message = formatErrorMessage(apiError);
```

### 3. React Query Configuration (`queryClient.ts`)

**Default Query Options**:
- `retry: 1` - Retry failed requests once
- `staleTime: 30_000` - Data fresh for 30 seconds
- `refetchOnWindowFocus: false` - Don't refetch on focus
- `refetchOnMount: false` - Don't refetch on mount
- `gcTime: 5 * 60 * 1000` - Garbage collect unused queries after 5 minutes

**Default Mutation Options**:
- `retry: 1` - Retry failed mutations once

### 4. TypeScript Types (`types.ts`)

Complete interfaces for all API domains (400+ lines):

```typescript
// User & Auth
interface User { id, email, role, mfa_enabled }

// Core domains
interface Program { id, name, status, start_date, end_date, ... }
interface MockCycle { id, name, program_id, start_date, end_date, ... }
interface Project { id, name, mock_cycle_id, status, ... }

// Objects & dependencies
interface GlobalObject { id, name, description, status, category, ... }
interface ProjectObject { id, project_id, global_object_id, status, ... }
interface ObjectDependency { id, source_id, target_id, type, ... }

// Tasks & scheduling
interface TaskGroup { id, project_id, name, description, ... }
interface Task { id, task_group_id, name, status, start_date, due_date, ... }
interface ScheduleItem { id, project_id, task_id, scheduled_date, ... }

// Reporting
interface PriorityTask { /* extends Task */ }
interface PrioritizedTasks { late, inProgress, dueThisWeek, onTrack }
interface ProjectStatus { total_tasks, complete_tasks, blocked_tasks, ... }
interface AuditLog { id, user_id, action, entity_type, entity_id, timestamp, ... }

// Request payloads
interface CreateProgramPayload { name, start_date, end_date }
interface UpdateProgramPayload { name?, status?, ... }

// Pagination
interface PaginationParams { page?, limit?, offset? }
interface ListResponse<T> { data, pagination }
```

## Usage Examples

### Basic Query Usage

```typescript
import { usePrograms, useProgram, useCreateProgram } from './api/hooks';

function MyComponent() {
  // Fetch all programs
  const { data: programs, isLoading, error } = usePrograms();

  // Fetch single program
  const { data: program } = useProgram(programId);

  // Create program
  const { mutate: createProgram } = useCreateProgram();

  return (
    <>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {programs?.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
      <button onClick={() => createProgram({ name: 'New Program' })}>
        Create
      </button>
    </>
  );
}
```

### Mutations with Cache Invalidation

```typescript
import { useUpdateTask } from './api/hooks';

function TaskEditor({ taskId, projectId }) {
  const { mutate: updateTask, isPending } = useUpdateTask(taskId, projectId);

  return (
    <form onSubmit={e => {
      e.preventDefault();
      updateTask({ name: 'Updated Name' });
    }}>
      {isPending && <span>Saving...</span>}
      <button type="submit">Save</button>
    </form>
  );
}
```

### Optimistic Updates (Tasks & Schedule)

Tasks and schedule items support optimistic updates for better UX:

```typescript
import { useUpdateTask } from './api/hooks';

function TaskStatusUpdater({ taskId, projectId }) {
  const { mutate: updateTask } = useUpdateTask(taskId, projectId);

  const handleStatusChange = (newStatus: string) => {
    // UI updates immediately while request sends to server
    updateTask({ status: newStatus });
  };

  return (
    <select onChange={e => handleStatusChange(e.target.value)}>
      <option value="not_started">Not Started</option>
      <option value="in_progress">In Progress</option>
      <option value="complete">Complete</option>
    </select>
  );
}
```

### Dependent Queries

```typescript
import { useProjects } from './api/hooks';

function ProjectList({ mockCycleId }) {
  // Only fetches when mockCycleId is truthy
  const { data: projects } = useProjects(mockCycleId);

  return projects?.map(p => <div key={p.id}>{p.name}</div>);
}
```

### Error Handling

```typescript
import { useCreateProgram } from './api/hooks';
import { isValidationError } from './api/errorHandler';

function ProgramForm() {
  const { mutate: createProgram, error } = useCreateProgram();

  if (error && isValidationError(error)) {
    return <p>Validation failed: {error.message}</p>;
  }

  return <form>...</form>;
}
```

## Authentication Flow

### 1. Initial Setup

The logout callback is registered automatically in `App.tsx`:

```typescript
// App.tsx
<QueryClientProvider client={queryClient}>
  <Router>
    <AuthProvider>
      <LogoutCallbackRegistration />  {/* Registers logout callback */}
      <AppRoutes />
    </AuthProvider>
  </Router>
</QueryClientProvider>
```

### 2. Request Flow

1. User logs in → JWT token stored in `localStorage.authToken`
2. API client request interceptor adds `Authorization: Bearer {token}`
3. All subsequent requests include the token automatically

### 3. 401 Handling

1. API returns 401 Unauthorized
2. Response interceptor triggers
3. Token cleared from localStorage
4. Logout callback invoked → user logged out
5. Redirect to login page

## Query Key Organization

All hooks use structured query keys for proper cache management:

```typescript
// Example: Programs query keys
const PROGRAM_KEYS = {
  all: ['programs'],                  // Root key
  lists: () => ['programs', 'list'],  // All program lists
  list: (filters) => [..., filters],  // Specific filter
  details: () => ['programs', 'detail'], // Details root
  detail: (id) => [..., id],          // Specific program
};

// This enables granular invalidation
queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.detail(id) });     // Just one
queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.lists() });        // All lists
queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.all });            // Everything
```

## Best Practices

### 1. Component Organization

```typescript
// ✅ Good - Hooks at component level
function MyComponent() {
  const { data } = usePrograms();
  // ...
}

// ❌ Avoid - Calling hooks conditionally
function MyComponent() {
  const shouldFetch = /* ... */;
  if (shouldFetch) {
    const { data } = usePrograms(); // Bad!
  }
}
```

### 2. Dependency Lists

```typescript
// ✅ Good - Only fetch when dependencies change
const { data } = useProjects(mockCycleId);

// ✅ Good - Debounce search queries
const { data } = useGlobalObjects(
  throttle({ search: term }, 500)
);
```

### 3. Error UI Patterns

```typescript
// ✅ Good - Show specific error message
if (error) {
  return <Alert severity="error">{error.message}</Alert>;
}

// ✅ Good - Fallback for missing data
return <>{programs ?? <Skeleton />}</>;
```

### 4. Loading States

```typescript
// ✅ Good - Use loading state
if (isLoading) return <Skeleton />;
if (error) return <Error />;
return <Content data={data} />;

// ✅ Good - Use isFetching for background updates
{isFetching && <p>Updating...</p>}
```

## Environment Configuration

Set `VITE_API_URL` in `.env`:

```
# .env
VITE_API_URL=http://localhost:5000
```

Default: `http://localhost:5000`

## Migration from Old Hooks

If you have existing hooks, gradually migrate to new ones:

```typescript
// Old hook pattern
async function getPrograms() {
  return await apiClient.get('/programs');
}

// New hook pattern
import { usePrograms } from './api/hooks';

function Component() {
  const { data: programs } = usePrograms();
}
```

## Debugging

### Enable React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### API Error Logging

In development mode, all API errors are logged:

```
[API Error] {
  status: 400,
  message: "Invalid request",
  url: "/api/programs"
}
```

### Check Cache State

```typescript
// In browser console
// View all cached queries
queryClient.getQueryCache().getAll()

// Manually invalidate
queryClient.invalidateQueries({ queryKey: ['programs'] })
```

## Performance Tips

1. **Use React Query DevTools** - Visualize cache state and query timing
2. **Enable stale-while-revalidate** - Data updates in background without blocking UI
3. **Implement pagination** - Load data in chunks for large lists
4. **Use `enabled` flag** - Skip queries until dependencies are ready
5. **Prefetch data** - Load data before user needs it

```typescript
const { prefetchQuery } = useQueryClient();

// Prefetch on hover
onMouseEnter={() => prefetchQuery({
  queryKey: ['programs', id],
  queryFn: () => useProgram(id)
})}
```

## Troubleshooting

### "Query not found in cache" error

**Cause**: Trying to use a query result before it's been fetched

**Solution**: Check `enabled` flag or wait for `isLoading` to be false

### Token not being sent

**Cause**: Token not in localStorage or key name is wrong

**Solution**: Verify token stored as `localStorage.authToken`

### 401 not triggering logout

**Cause**: Logout callback not registered

**Solution**: Ensure `LogoutCallbackRegistration` component is in render tree

### Stale data after mutation

**Cause**: Cache not invalidated

**Solution**: Check mutation `onSuccess` includes `queryClient.invalidateQueries()`

## Related Documentation

- [React Query Docs](https://tanstack.com/query/latest)
- [Axios Docs](https://axios-http.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Material-UI Integration: See `THEME_DOCUMENTATION.md`
