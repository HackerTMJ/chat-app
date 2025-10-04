# 🎨 Animation System Documentation

## Overview
Comprehensive animation system for smooth, polished user experience throughout the entire application.

---

## 🎯 Animation Philosophy

- **Performance First**: All animations use GPU-accelerated properties (transform, opacity)
- **Smooth Timing**: Cubic bezier curves for natural motion
- **Consistent Duration**: 200-400ms for most interactions
- **Accessibility**: Respects `prefers-reduced-motion`

---

## 📦 Available Animations

### 1. **Message Animations**

#### Message Entrance
```tsx
<div className="message-enter">
  {/* Message content */}
</div>
```
- Slides in from bottom with scale effect
- Duration: 300ms
- Timing: Bounce curve

### 2. **Modal Animations**

#### Modal Backdrop
```tsx
<div className="modal-backdrop-enter">
  {/* Backdrop overlay */}
</div>
```

#### Modal Content
```tsx
<div className="modal-content-enter">
  {/* Modal content */}
</div>
```

#### Exit Animations
- `modal-backdrop-exit` - Fade out backdrop
- `modal-content-exit` - Slide down content

### 3. **Button Animations**

#### Hover Lift Effect
```tsx
<button className="btn-primary">
  {/* Button automatically has hover effect */}
</button>
```
- Lifts 1px on hover
- Adds shadow
- Smooth active state

### 4. **Page Transitions**

#### Page Entrance
```tsx
<div className="page-enter">
  {/* Page content */}
</div>
```

#### Slide Entrance
```tsx
<div className="page-slide-enter">
  {/* Page content */}
</div>
```

### 5. **Loading States**

#### Skeleton Loader
```tsx
<div className="skeleton-loader h-4 w-full rounded">
  {/* Shimmer effect automatically applied */}
</div>
```

### 6. **Interactive Elements**

#### Scale Bounce (for actions like likes, reactions)
```tsx
<button onClick={handleLike} className="scale-bounce">
  ❤️
</button>
```

---

## 🎨 Tailwind Animation Classes

### Fade Animations
- `animate-fade-in` - Simple fade in
- `animate-fade-in-up` - Fade in from bottom
- `animate-fade-in-down` - Fade in from top

### Slide Animations
- `animate-slide-in-right` - Slide from left to right
- `animate-slide-in-left` - Slide from right to left
- `animate-slide-up` - Slide up with scale

### Other Effects
- `animate-scale-in` - Scale in from 90%
- `animate-bounce-soft` - Gentle bounce
- `animate-shimmer` - Shimmer effect for loading
- `animate-pulse-soft` - Gentle pulse
- `animate-spin-smooth` - Smooth rotation

### Usage Example
```tsx
<div className="animate-fade-in-up">
  <h1>Welcome!</h1>
</div>
```

---

## 🎯 Component-Specific Animations

### Room List Items
```tsx
<div className="room-item">
  {/* Automatically animates on hover:
      - Slides right 4px
      - Adds shadow
      - Changes background
  */}
</div>
```

### Message Bubbles
```tsx
<div className="message-bubble-other">
  {/* Hover effects:
      - Lifts 1px
      - Adds shadow
      - Changes background
  */}
</div>
```

### Cards
```tsx
<div className="card">
  {/* Hover effects:
      - Lifts 2px
      - Increases shadow
  */}
</div>
```

### Input Fields
```tsx
<input className="chat-input" />
{/* Focus effects:
    - Lifts 1px
    - Adds focus ring
    - Smooth border color change
*/}
```

---

## ⚙️ Custom Timing Functions

### Available in Tailwind
- `ease-smooth` - Standard smooth curve: `cubic-bezier(0.4, 0, 0.2, 1)`
- `ease-bounce` - Spring-like bounce: `cubic-bezier(0.16, 1, 0.3, 1)`
- `ease-theme` - For theme transitions: `ease-in-out`

### Usage
```tsx
<div className="transition-all duration-300 ease-bounce">
  Smooth animation
</div>
```

---

## 📱 Responsive Animations

### Mobile Sidebar
```css
/* Automatically smooth on mobile */
.chat-sidebar {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 🎭 Advanced Animations

### Typing Indicator
```tsx
<div className="flex gap-1">
  <div className="typing-dot typing-dot-1" />
  <div className="typing-dot typing-dot-2" />
  <div className="typing-dot typing-dot-3" />
</div>
```

### Staggered Fade In
```tsx
<div className="fade-in-delay-1">First item</div>
<div className="fade-in-delay-2">Second item</div>
<div className="fade-in-delay-3">Third item</div>
```

---

## 🚀 Performance Best Practices

### ✅ DO
- Use `transform` and `opacity` for animations
- Keep duration under 400ms for interactions
- Use `will-change` sparingly for complex animations
- Test on mobile devices

### ❌ DON'T
- Animate `width`, `height`, `top`, `left` (causes layout)
- Use long durations (>600ms) for frequent interactions
- Animate too many elements simultaneously
- Forget to test with reduced motion settings

---

## 🎨 Global Smooth Transitions

All elements have smooth transitions enabled by default:
```css
* {
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 🔧 Customization

### Adding New Animations

1. **Add to globals.css**:
```css
@keyframes myAnimation {
  from { /* start state */ }
  to { /* end state */ }
}

.my-animation {
  animation: myAnimation 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

2. **Add to tailwind.config.ts**:
```typescript
animation: {
  'my-animation': 'myAnimation 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
},
keyframes: {
  myAnimation: {
    from: { /* start state */ },
    to: { /* end state */ },
  },
},
```

---

## 📊 Animation Hierarchy

1. **Critical** (0-200ms): Button clicks, input focus
2. **Important** (200-300ms): Modals, messages, cards
3. **Nice-to-have** (300-400ms): Page transitions, side effects
4. **Background** (400ms+): Ambient animations, loaders

---

## 🎯 Testing Checklist

- [ ] All buttons have smooth hover states
- [ ] Modals animate in/out smoothly
- [ ] Messages slide in when sent
- [ ] Room list items animate on hover
- [ ] Input fields lift on focus
- [ ] Cards lift on hover
- [ ] Mobile sidebar slides smoothly
- [ ] No layout shifts during animations
- [ ] Smooth on 60fps devices
- [ ] Works with dark mode transitions

---

## 🐛 Troubleshooting

### Animation Not Working?
1. Check if class is correctly applied
2. Verify no conflicting styles
3. Check browser DevTools for CSS issues
4. Ensure Tailwind config is properly loaded

### Animation Too Slow/Fast?
Adjust duration in globals.css or Tailwind config:
```css
/* Faster */
animation-duration: 0.2s;

/* Slower */
animation-duration: 0.4s;
```

### Animation Causing Jank?
1. Use Chrome DevTools Performance tab
2. Check for layout thrashing
3. Ensure using transform/opacity only
4. Consider using `will-change` cautiously

---

## 📚 Resources

- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [CSS Triggers](https://csstriggers.com/) - What causes layout/paint
- [Cubic Bezier Generator](https://cubic-bezier.com/) - Create custom timing
- [Animation Performance](https://web.dev/animations-guide/) - Best practices

---

**Last Updated**: 2025-01-04
**Status**: ✅ Production Ready
