// DRAG-AND-DROP SCHEDULING IMPLEMENTATION GUIDE
// RediForge Planning App

// ====================================================
// OVERVIEW
// ====================================================
/*
This document outlines the complete drag-and-drop scheduling implementation
using @dnd-kit for the RediForge planning app.

The system allows users to drag schedule items across a week-view grid,
with optimistic updates and proper error handling.
*/

// ====================================================
// ARCHITECTURE
// ====================================================

/*
COMPONENT HIERARCHY:
====================

SchedulePage
├── DraggableScheduleGrid (DndContext wrapper)
│   ├── WeekHeader (displays day labels)
│   └── Grid (7-column layout for days)
│       └── DroppableScheduleCell[] (one per day)
│           ├── SortableContext
│           └── DraggableScheduleItem[]
│               └── ScheduleItem (MUI Chip display)

DATA FLOW:
==========

1. User drags item from source day to target day
   ↓
2. DragEndEvent triggered in DndContext
   ↓
3. Extract target date from drop event
   ↓
4. Call updateScheduleItem mutation
   ↓
5. Optimistic update: Item moves in cache immediately
   ↓
6. Backend request: PATCH /schedule/{id}
   ↓
7. On Success: Refetch list for consistency
   On Error: Rollback cache, show error snackbar
*/

// ====================================================
// KEY COMPONENTS
// ====================================================

/*
1. DraggableScheduleGrid.tsx
   Purpose: Main container with DnD context
   Props:
     - items: ScheduleItem[]
     - weekStart: Date
     - projectId: string
   Features:
     - DndContext setup with sensors
     - Drag overlay for preview
     - Error/success notifications
     - Loading state handling

2. DraggableScheduleItem.tsx
   Purpose: Draggable wrapper for schedule items
   Uses: useDraggable hook from @dnd-kit
   Features:
     - Item-level drag state
     - CSS transforms for smooth animation
     - Visual feedback (opacity, cursor)

3. DroppableScheduleCell.tsx
   Purpose: Day column drop target
   Uses: useDroppable hook from @dnd-kit
   Features:
     - Drop zone with visual feedback
     - Highlight on dragover
     - Dashed border when accepting items
     - Loading state opacity

4. SchedulePage.tsx (Updated)
   Purpose: Page container for schedule
   Changes:
     - Replaced ScheduleGrid with DraggableScheduleGrid
     - Removed old mutation hook usage
     - Simplified props passing
*/

// ====================================================
// MUTATIONS & OPTIMISTIC UPDATES
// ====================================================

/*
useUpdateScheduleItemInProject(projectId)
=====================================

Purpose:
  Project-scoped mutation for drag-and-drop operations
  Provides optimistic updates at the list level

Payload:
  { id: string; scheduledDate: string }

Optimistic Update Flow:
  1. onMutate: 
     - Cancel pending queries
     - Snapshot previous list state
     - Update cache with new scheduledDate
  2. Backend request sent (PATCH /schedule/{id})
  3. onSuccess:
     - Set updated item in detail cache
     - Invalidate list to force refetch (ensures consistency)
  4. onError:
     - Rollback cache to previous state
     - Item reverts to original day

Result:
  User sees item move immediately (optimistic)
  If error occurs, automatic rollback without user action
*/

// ====================================================
// DND-KIT CONFIGURATION
// ====================================================

/*
Sensors:
  - PointerSensor (8px threshold to activate)
    Prevents accidental drags from clicks
  - KeyboardSensor for keyboard navigation

Collision Detection:
  - closestCenter: Drop activates on closest drop target
    Simple and predictable for grid layout

Drag Overlay:
  - Displays drag preview above all other elements
  - Uses semi-transparent rendering
  - Follows cursor during drag

Drop Detection:
  - Drop target keyed by ISO date (YYYY-MM-DD)
  - Validates drop target is a valid day
  - Prevents dropping on same day
*/

// ====================================================
// USER INTERACTIONS
// ====================================================

/*
DRAG SEQUENCE:
==============

1. User hovers over ScheduleItem
   → Cursor changes to "grab"
   → Item shows hover state

2. User clicks and starts dragging
   → Cursor changes to "grabbing"
   → Item opacity reduces to 0.5
   → Drag preview appears above cursor

3. User drags over target day
   → DroppableScheduleCell highlights:
     - Dashed border
     - Light background color
   → Visual feedback shows valid drop zone

4. User releases mouse on target day
   → onDragEnd triggered
   → Mutation called with new date
   → Item appears in new day immediately (optimistic)

5. Backend updates
   → Success: Snackbar "Schedule updated successfully"
   → Error: Snackbar "Failed to update schedule. Changes reverted."
            Item reverts to original day
*/

// ====================================================
// ERROR HANDLING
// ====================================================

/*
Error Scenarios:
================

1. Network Error
   - onError callback invoked
   - Cache rolled back automatically
   - Error snackbar displayed
   - User can retry by dragging again

2. Invalid Drop Target
   - Drag ends with no valid drop target
   - No mutation triggered
   - Item returns to source day

3. Same-Day Drop
   - Drop target same as source
   - Mutation prevented (no-op)
   - No cache update, no notification

4. Backend Validation Error
   - Server returns error response
   - onError callback handles it
   - Cache rolled back
   - Error message displayed in snackbar
*/

// ====================================================
// PERFORMANCE OPTIMIZATIONS
// ====================================================

/*
1. Pointer Sensor Threshold (8px)
   - Prevents accidental drags from clicks
   - Requires deliberate movement to activate

2. CSS Transforms
   - Uses transform: translate() instead of position changes
   - Better performance, no layout thrashing
   - Smooth 60fps animations

3. SortableContext Per Day
   - Scopes draggable items to their day
   - Improves collision detection efficiency
   - Reduces computation during drag

4. Optimistic Updates
   - UI responds immediately
   - Better perceived performance
   - Automatic rollback on error

5. Cache Invalidation Strategy
   - Snapshot on mutate for rollback
   - Refetch on success for consistency
   - Detail-level updates for specific items
*/

// ====================================================
// TESTING CHECKLIST
// ====================================================

/*
Happy Path:
  ☐ Load schedule with items
  ☐ Drag item to different day
  ☐ Verify item appears in new day
  ☐ Verify success snackbar shows
  ☐ Refresh page - item persists

Error Handling:
  ☐ Simulate network error
  ☐ Drag item to different day
  ☐ Verify error snackbar shows
  ☐ Verify item reverts to original day
  ☐ Verify cache rolled back

Edge Cases:
  ☐ Drag to same day - no mutation
  ☐ Drag to edge of grid - valid drop
  ☐ Rapid consecutive drags - handle queue
  ☐ Multiple items same day - preserve order
  ☐ Keyboard navigation - Tab/Arrow keys work

Accessibility:
  ☐ Keyboard users can drag items
  ☐ Screen readers announce drop zones
  ☐ Focus visible during navigation
  ☐ ARIA attributes properly set
*/

// ====================================================
// API INTEGRATION
// ====================================================

/*
Backend Endpoint:
  PATCH /schedule/{id}
  Payload: { scheduledDate: "YYYY-MM-DD" }
  Response: { data: ScheduleItem }

Cache Keys:
  - List: ['schedule', 'list', projectId]
  - Detail: ['schedule', 'detail', scheduleItemId]

Query Client Setup:
  - staleTime: 30 seconds
  - gcTime: 5 minutes
  - Automatic invalidation on mutation success
*/

// ====================================================
// STYLING & THEMING
// ====================================================

/*
Colors:
  - Primary highlight: theme.palette.primary.main
  - Today background: ${primary.main}12 (12% opacity)
  - Hover background: ${primary.main}08 (8% opacity)
  - Drag-over background: ${primary.main}20 (20% opacity)
  - Dashed border on drag-over

Transitions:
  - 250ms (short duration) for hover effects
  - No transition during drag for immediate feedback
  - CSS transform handles animation smoothly

Spacing:
  - 1.5 (12px) padding in cells
  - 1 (8px) gap between items
  - 1.25 (10px) border-radius
*/

// ====================================================
// BROWSER SUPPORT
// ====================================================

/*
Requirements:
  - ES2020+ (for nullish coalescing, optional chaining)
  - CSS Transforms support
  - Pointer Events support (or fallback to Mouse Events)

Tested:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
*/

// ====================================================
// FUTURE ENHANCEMENTS
// ====================================================

/*
1. Multi-day spans
   - Allow items to span multiple days
   - Resize handles on item edges
   - Update both start and end dates

2. Batch operations
   - Select multiple items
   - Drag all selected items to new date
   - Atomic mutation for consistency

3. Time-based scheduling
   - Add time slots within each day
   - Drag items to specific times
   - Show time range in item chip

4. Drag constraints
   - Prevent dragging to past dates
   - Respect resource availability
   - Business logic validation

5. Bulk actions
   - Copy items to multiple days
   - Move all items in a group
   - Duplicate item to new dates

6. Undo/Redo
   - Keep mutation history
   - Undo last drag operation
   - Redo reversed operations
*/

export {};
