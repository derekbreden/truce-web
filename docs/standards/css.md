# CSS Standards

## CSS Architecture Overview

This project uses a semantic attribute-driven CSS architecture organized in 5 hierarchical layers:

1. **Foundation** (`foundation/`): Design tokens, fonts, animations - base system variables
2. **Layout** (`layout/`): Document structure, header, footer, navigation - global positioning
3. **Attributes** (`attributes/`): Semantic modifiers - reusable behaviors via `[attribute]` selectors
4. **Features** (`features/`): Component styling - posts, conversations, notifications
5. **Interactions** (`interactions/`): Forms, modals, actions - user interface controls

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

## Semantic Attribute System

**Core Philosophy**: Attributes replace complex CSS class hierarchies with self-documenting, semantic modifiers.

### Visual State Attributes (`visual-states.css`)
- `[muted]` - Reduces opacity to `var(--opacity-muted)` for secondary content
- `[faint]` - Same as muted, used for disabled/inactive elements  
- `[disabled]` - Muted opacity for form controls and buttons
- `[active]` - Used for selected/current state indication
- `[unread]` - Styling for unread notifications and messages

### Layout Utility Attributes (`layout-utilities.css`)
- `[center]` - Text alignment + flexbox centering (`text-align: center; justify-content: center; align-items: center`)
- `[right]` - Flex container with `justify-content: flex-end`
- `[ellipsis]` - Text truncation with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- `[full-width]` - Absolute positioning with `left: 0; right: 0`
- `[flex-column]` - Vertical flex layout (`display: flex; flex-direction: column`)
- `[big]` - Primary action button styling with success colors

### Content Semantic Attributes (`content-semantics.css`)
- `[quote]` - Quote blocks with left border and background
- `[notice]` - Small text size for disclaimers and help text
- `[bold]` - Font weight 600 for emphasis
- `[italic]` - Italic text styling
- `[hr]` - Horizontal rule with border-bottom
- `[img]` - Image container with border-radius and sizing

### Interactive State Attributes (`interactive-states.css`)
- `[confirm]` - Confirmation modal styling
- `[info]` - Info message boxes with blue theming
- `[error]` - Error message boxes with red theming  
- `[close]` - Close button behaviors
- `[more]` - Expandable content indicators
- `[favorited]` - Favorited state with heart color styling
- `[trimmed]` - Collapsed content display mode

## Custom Element Architecture

**Non-standard HTML elements** serve as semantic containers with specific styling:

### Core Content Elements (`features/posts.css`, `conversations.css`)
```css
posts { display: flex; flex-direction: column; }
post { padding-bottom: 21px; position: relative; }
reply { /* styling in component-patterns.css */ }
message { margin: var(--space-md); display: flex; flex-direction: column; }
conversation { /* border and padding from component-patterns.css */ }
```

### UI Control Elements (`interactions/modals.css`, `forms.css`)
```css
modal { position: fixed; /* complex positioning and theming */ }
modal-bg { position: absolute; /* overlay background */ }
button-wrapper { display: flex; justify-content: space-between; }
add-new { display: flex; flex-direction: column; /* form container */ }
```

### Layout Structure Elements (`layout/base.css`)
```css
main-content-wrapper { /* primary layout container with animations */ }
main-content { /* content area with max-width and padding */ }
```

## Design Token System

Comprehensive variable system in `foundation/design-tokens.css`:

### Color System (`design-tokens.css`)
- **Semantic Functions**: `light-dark()` for automatic theme switching
- **Core Brand**: `--color-black`, `--color-white`, grayscale system
- **UI States**: Success, info, error with light/dark variants
- **Text Hierarchy**: Primary, secondary, inverted text colors
- **Border Weights**: Standard, medium, strong border colors

### Spacing Scale (`design-tokens.css`)
- **Standard Scale**: `--space-3xs` (1px) through `--space-lg` (40px)
- **Reply System**: `--reply-indent` (50px), `--reply-width` (calculated)
- **List Alignment**: Base indent (17px) and reply-aligned (67px)

### Icon Size System (`design-tokens.css`)
**Consistent visual weights** across interface:
- `--icon-xs` (14px) - Message info
- `--icon-sm` (16px) - Edit buttons  
- `--icon-md` (18px) - Post author topics
- `--icon-lg` (22px) - Reply authors
- `--icon-xl` (26px) - H2 users, modal buttons
- `--icon-xxl` (30px) - Modals, settings
- `--icon-menu` (36px) - Menu links
- `--icon-footer` (34px) - Footer icons

### Typography Scale (`design-tokens.css`)
- `--font-size-xs` (.714rem) - Timestamps
- `--font-size-sm` (.786rem) - Small text, notices  
- `--font-size-base` (1rem) - Body text
- `--font-size-lg` (1.286rem) - Large headings

## Client Integration Patterns

**Flint.js Template Syntax** directly uses CSS selectors in element creation:

```javascript
// Template mode with semantic attributes
const $modal = $(
  `
  modal-wrapper
    modal[confirm]
      $1
      button-wrapper
        button[confirm][close] Yes, I am sure
        button[cancel][close][alt] Cancel
    modal-bg[full-width]
  `,
  [message]
)
```

**Real Usage Examples** from client code:
- `time-ago[muted]` - Muted timestamp display (`renderMessages.js`)
- `message-preview[ellipsis]` - Truncated message previews (`renderConversations.js`)
- `p[notice][center]` - Centered disclaimer text (`loadingPage.js`)
- `detail[favorites][favorited=$1]` - Dynamic favorite state (`renderPost.js`)

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

## Performance Considerations

- **Z-index Layering**: Systematic layering system (`design-tokens.css`)
- **Design Tokens**: Single source of truth prevents style duplication  
- **Semantic Attributes**: Reusable modifiers reduce CSS bloat
- **Custom Elements**: Avoid deep nesting and complex selectors