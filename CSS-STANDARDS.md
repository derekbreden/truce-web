# CSS Organization Standards

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