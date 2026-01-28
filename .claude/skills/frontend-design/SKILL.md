---
name: frontend-design
description: Creates distinctive, production-grade frontend interfaces with high design quality for mobile-first applications
---

# Frontend Design Skill

When working on frontend design for this project, follow these principles:

## Design Philosophy

### Mobile-First Excellence
- Design for phone screens FIRST, then scale up
- Touch targets must be at least 44px (ideally larger)
- Use swipe gestures and horizontal scrollers over dropdowns
- Fixed bottom CTAs for primary actions
- Thumb-friendly zones - important actions in lower half of screen

### Minimal Data Entry
- Tap-to-select over typing whenever possible
- Smart defaults that work 80% of the time
- Pre-populated options in horizontal scroll pickers
- One-tap actions over multi-step forms
- Autofocus on the most important field

### Gorgeous Visual Design
- Use gradients for primary actions: `bg-gradient-to-br from-emerald-400 to-emerald-600`
- Colored shadows: `shadow-emerald-500/30`, `shadow-xl`
- Large rounded corners: `rounded-2xl`, `rounded-3xl`
- Subtle animations: `transition-all duration-200`
- Tap feedback: `active:scale-95` or `active:scale-[0.98]`

## Component Patterns

### Horizontal Scroll Picker
For selecting from multiple options (dates, times, counts):
```vue
<div class="relative -mx-4">
  <div class="scroll-fade-left"></div>
  <div class="scroll-fade-right"></div>
  <div class="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
    <button
      v-for="item in items"
      @click="selected = item.value"
      class="flex-shrink-0 py-3 px-4 rounded-xl transition-all duration-200 active:scale-95"
      :class="[
        selected === item.value
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
          : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700'
      ]"
    >
      <span :class="selected === item.value ? 'text-white' : 'text-gray-900 dark:text-white'">
        {{ item.label }}
      </span>
    </button>
  </div>
</div>
```

### Selection Cards (2x2 Grid)
For selecting between 2-4 major options:
```vue
<div class="grid grid-cols-2 gap-3">
  <button
    :class="[
      'relative p-5 rounded-2xl border-2 transition-all text-left',
      isSelected
        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
    ]"
  >
    <UIcon name="i-heroicons-check-circle" class="w-8 h-8 mb-2" />
    <p class="font-semibold">Option Label</p>
  </button>
</div>
```

### Fixed Bottom CTA
For primary page actions:
```vue
<div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 dark:from-gray-950 dark:via-gray-950 to-transparent pt-8 z-40">
  <UButton
    size="xl"
    block
    class="h-20 flex flex-col items-center justify-center gap-1 text-xl font-bold rounded-2xl shadow-xl shadow-emerald-500/30 bg-gradient-to-r from-emerald-500 to-emerald-600"
  >
    <span>Primary Action</span>
    <span class="text-sm font-normal opacity-90">Supporting detail</span>
  </UButton>
</div>
```

### Avatar Pills
For displaying people/responses:
```vue
<div class="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-3 py-1">
  <span class="w-6 h-6 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center text-xs font-medium">
    {{ initials }}
  </span>
  <span class="text-sm text-emerald-700 dark:text-emerald-300">{{ name }}</span>
</div>
```

## Color Semantics

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary/Success | emerald-500/600 | emerald-400/500 |
| Danger/Decline | red-500/600 | red-400/500 |
| Warning/Maybe | amber-500/600 | amber-400/500 |
| Info/Conditional | blue-500/600 | blue-400/500 |
| Neutral | gray-200/300 | gray-700/800 |

## Typography

- **Labels**: `text-xs font-semibold text-gray-500 uppercase tracking-wider`
- **Headings**: `text-2xl font-bold text-gray-900 dark:text-white`
- **Body**: `text-sm text-gray-600 dark:text-gray-400`
- **Numbers (large)**: `text-3xl font-bold`

## Animation Guidelines

- Use `transition-all duration-200` for most interactions
- Tap feedback: `active:scale-95` (small buttons) or `active:scale-[0.98]` (large buttons)
- Hover states for desktop: `hover:scale-105` on primary CTAs
- Loading states: `animate-spin` on icons

## Nuxt UI Integration

Always use Nuxt UI components when available:
- `UButton` with `size="xl"` for touch targets
- `UInput` with `size="xl"` for form fields
- `UCard` for content containers
- `UIcon` with Heroicons (`i-heroicons-*`)
- `UDropdownMenu` for menus (not dropdowns for selection)
- `UAlert` for notifications and banners

Query the Nuxt UI MCP server for current component APIs:
- `mcp__nuxt-ui__get-component` for component docs
- `mcp__nuxt-ui__list-components` for available components

## CSS Utilities

Hide scrollbars while keeping scroll functionality:
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

Fade edges for horizontal scrollers:
```css
.scroll-fade-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1rem;
  background: linear-gradient(to right, rgb(249 250 251) 0%, transparent 100%);
  pointer-events: none;
  z-index: 10;
}
```
