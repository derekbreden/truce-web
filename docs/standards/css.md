# CSS Standards

Coding conventions for CSS development in this project.

## Property Order

Properties within each CSS rule should follow this consistent order:

1. **Position**: `position`, `top`, `right`, `bottom`, `left`, `z-index`
2. **Display & Layout**: `display`, `flex-direction`, `justify-content`, `align-items`, `flex`, `grid-*`
3. **Dimensions**: `width`, `height`, `max-width`, `min-height`, etc.
4. **Spacing**: `margin`, `padding`
5. **Borders**: `border`, `border-radius`
6. **Colors & Backgrounds**: `background`, `color`, `opacity`
7. **Typography**: `font-size`, `font-weight`, `text-align`, `line-height`
8. **Interactions**: `cursor`, `pointer-events`
9. **Animations**: `transition`, `animation`
10. **Other**: vendor prefixes, `content`, etc.

**Rationale**: Position affects document flow first, then layout determines element behavior, then size affects everything else, then spacing affects surrounding elements, then visual styling, then interactive enhancements.

## Naming Conventions

**Attributes over Classes**: Use semantic HTML attributes instead of CSS classes:
```css
/* Preferred */
[muted] { opacity: var(--opacity-muted); }
[center] { text-align: center; }

/* Avoid */
.muted { opacity: var(--opacity-muted); }
.center { text-align: center; }
```

**Custom Elements**: Use semantic element names for components:
```css
/* Component containers */
posts { display: flex; flex-direction: column; }
conversation { /* component styling */ }
notification { /* component styling */ }

/* Avoid generic divs */
.post-container { /* less semantic */ }
```

## Comment Standards

### Major Sections (3+ related rulesets)
```css
/* ================================
   SECTION NAME
   ================================ */
```

### Simple Groupings (2 related rulesets)
```css
/* Section name */
```

### Single Rulesets
No section header needed - let the selectors speak for themselves.

## Grouping Standards

1. Only group when rules are semantically related and benefit from being together
2. Avoid creating sections for isolated rulesets  
3. Prioritize natural reading flow over rigid categorization
4. Group by purpose/function, not just by selector type

## File Organization

CSS files are organized by purpose in 5 directories:
- `foundation/` - Variables, tokens, base styles
- `layout/` - Structural layout elements  
- `attributes/` - Semantic attribute definitions
- `features/` - Component-specific styling
- `interactions/` - Form and modal behaviors

Place new styles in the most specific applicable directory.