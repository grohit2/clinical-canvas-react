# Mobile-Friendly Features

This document describes the mobile-friendly features implemented in the React application, including swipe-to-reveal action bars and floating action buttons.

## 1. Swipe-to-Reveal Action Bar

### Overview
The swipe-to-reveal action bar allows users to swipe left on patient cards and task cards to reveal contextual actions. This provides quick access to common operations without cluttering the UI.

### Implementation Details

#### Gesture Recognition
- **Swipe Direction**: Left-to-right swipe reveals action bar
- **Snap Threshold**: 50% of action bar width or velocity ≥ 0.5px/ms
- **Snap Behavior**: Cards automatically snap to fully open or closed position

#### Actions Available

**Patient Cards:**
1. **Labs** - Opens Patient_Report.aspx/{MRN} in browser/webview
2. **Copy MRN** - Copies Medical Record Number to clipboard with toast feedback
3. **Radiology** - Placeholder for future radiology integration

**Task Cards:**
1. **Start** - Changes task status from "open" to "in-progress"
2. **Complete** - Changes task status to "done"
3. **Cancel** - Changes task status to "cancelled"

#### Visual Design
- Each action button: 72dp wide
- Gray-100 background with colored overlays
- Icon + 12pt label layout
- Rounded right corners
- Brief flash animation on snap-open

#### Accessibility
- Full keyboard navigation support
- Screen reader compatible with proper ARIA labels
- Alternative long-press context menu for non-touch devices
- Escape key closes open action bars

#### Close Conditions
1. User taps any action button
2. User taps outside the card
3. Hardware "Back" button (Escape key on web)
4. Opening another swipeable card

### Usage Example

```tsx
import { SwipeableCard } from "@/components/ui/SwipeableCard";

const actions = [
  {
    id: "labs",
    label: "Labs",
    icon: <TestTube className="h-4 w-4" />,
    color: "bg-blue-500 hover:bg-blue-600",
    onClick: () => openLabsUrl(patient.mrn),
  },
  {
    id: "copy-mrn",
    label: "Copy MRN",
    icon: <Copy className="h-4 w-4" />,
    color: "bg-green-500 hover:bg-green-600",
    onClick: () => copyToClipboard(patient.mrn),
  },
];

<SwipeableCard actions={actions}>
  <PatientCard patient={patient} />
</SwipeableCard>
```

## 2. Floating Action Buttons (FABs)

### Overview
Floating Action Buttons provide primary actions for each screen, positioned consistently in the bottom-right corner for easy thumb access on mobile devices.

### Implementation Details

#### Placement & Behavior
- Fixed position: bottom-right corner (24px inset)
- Material Design elevation and shadows
- Hides automatically when virtual keyboard is open
- Subtle animation on scroll (scales down slightly)
- Appears after scroll to avoid footer overlap

#### Screen-Specific FABs
- **Patients List**: "Add Patient" - Opens patient creation form
- **Tasks List**: "Add Task" - Opens task creation form

#### Visual Design
- 56dp diameter (14 on Tailwind scale)
- Primary-500 background color
- White icons and text
- Elevation 3 shadow
- Smooth scale animations on interaction

#### Responsive Behavior
- Automatically detects virtual keyboard presence
- Hides when viewport height reduces significantly (mobile keyboard)
- Uses Visual Viewport API when available for better detection

### Usage Example

```tsx
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";

<FloatingActionButton
  icon={<Plus className="h-6 w-6" />}
  label="Add Patient"
  onClick={() => setShowAddForm(true)}
/>
```

## 3. Mobile Utilities

### Haptic Feedback
Simulates native mobile haptic feedback using the Vibration API:

```tsx
import { triggerHaptic } from "@/utils/mobile";

// Different vibration patterns
triggerHaptic('selection'); // Short tick (50ms)
triggerHaptic('impact');    // Medium impact (100ms)  
triggerHaptic('notification'); // Pattern [100, 50, 100]ms
```

### Clipboard Operations
Cross-browser clipboard functionality with fallbacks:

```tsx
import { copyToClipboard } from "@/utils/mobile";

const success = await copyToClipboard(text);
if (success) {
  showToast("Copied to clipboard");
}
```

### Browser Integration
Opens URLs in external browser/webview:

```tsx
import { openInBrowser } from "@/utils/mobile";

openInBrowser(`/Patient_Report.aspx/${mrn}`);
```

## 4. Toast Notifications

### Implementation
Uses Radix UI Toast primitives with custom styling for mobile feedback:

- Success variant for positive actions (green)
- Error variant for failed operations (red)
- Auto-dismiss after appropriate duration
- Positioned for mobile visibility

### Usage
```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  variant: "success",
  title: "MRN Copied",
  description: `${mrn} copied to clipboard`,
});
```

## 5. Testing

### Unit Tests
- SwipeableCard gesture recognition
- Action button click handlers
- Accessibility compliance
- Keyboard navigation

### E2E Tests (Recommended)
- Swipe gestures on different devices
- FAB positioning and hiding behavior
- Clipboard operations
- Toast notifications
- Cross-browser compatibility

### Accessibility Testing
- Screen reader compatibility
- Keyboard-only navigation
- High contrast mode support
- Touch target size compliance (≥44px)

## 6. Browser Support

### Modern Features
- Framer Motion for animations
- Visual Viewport API for keyboard detection
- Vibration API for haptic feedback
- Modern Clipboard API with fallbacks

### Fallbacks
- Legacy clipboard operations using execCommand
- CSS-only animations where JS fails
- Touch detection fallbacks
- Graceful degradation for older browsers

## 7. Performance Considerations

### Optimizations
- Lazy loading of components
- Memoized calculations in cards
- Efficient gesture handling with debouncing
- Minimal re-renders during animations

### Memory Management
- Proper cleanup of event listeners
- Animation frame cleanup
- Gesture handler disposal

## 8. Customization

### Theming
All components use CSS custom properties and can be themed:

```css
:root {
  --radius: 0.5rem;
  --primary: 222.2 84% 4.9%;
  --primary-foreground: 210 40% 98%;
}
```

### Action Configuration
Swipe actions are fully configurable per card:

```tsx
const customActions = [
  {
    id: "custom",
    label: "Custom Action", 
    icon: <CustomIcon />,
    color: "bg-purple-500",
    onClick: handleCustomAction,
  }
];
```

## 9. Migration Guide

### From Static Cards
1. Wrap existing cards with `<SwipeableCard>`
2. Define action configuration
3. Remove redundant header buttons
4. Add FABs to replace add buttons

### Before:
```tsx
<Header showAdd onAdd={showForm} />
<PatientCard patient={patient} />
```

### After:
```tsx
<Header /> {/* No add button */}
<SwipeableCard actions={patientActions}>
  <PatientCard patient={patient} />
</SwipeableCard>
<FloatingActionButton onClick={showForm} />
```

This implementation provides a comprehensive mobile-first experience while maintaining accessibility and performance standards.