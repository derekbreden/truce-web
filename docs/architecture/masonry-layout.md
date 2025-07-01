# Masonry Layout Implementation Analysis

Analysis of the specific challenges and requirements for implementing masonry layout in feed contexts.

## Masonry Target Contexts

### 1. Main Posts Feed (`/posts`)
- **Content**: Trimmed posts only
- **Current Layout**: Vertical list with wrapping multi-image posts
- **Masonry Goal**: Distribute posts across columns based on content height

### 2. Favorites Page (`/favorites`) 
- **Content**: Mixed trimmed posts and trimmed replies
- **Current Layout**: Vertical list, already has alternating column CSS on topic pages
- **Masonry Goal**: Distribute mixed content across columns
- **Complexity**: Posts and replies have different indentation/width

### 3. Topic Pages (`/topic/*`)
- **Content**: Trimmed posts only
- **Current Layout**: Already uses alternating column layout
- **Masonry Goal**: May already be solved, need to verify

## Critical Problems to Solve

### Problem 1: Multi-Image Height Calculation

**Current Behavior**: 
- Images forced to 100px height in trimmed contexts
- Width calculated from aspect ratio: `width = (naturalWidth / naturalHeight) * 100`
- Very wide images (1024×100) become 1024px wide
- Very tall images (100×1024) become ~10px wide
- Images wrap to new rows when total width exceeds container

**What We Need**:
- Calculate total content height when images wrap
- Determine row count and spacing between rows
- Account for `margin-top: var(--space-sm)` between image containers

**What We Know**:
- Stored dimensions in `image_dimensions` column: "1024,100,512,512,..."
- Images processed to max 1024px on longest side via `imageToPng()`
- CSS: `height: 100px` on images, `margin-left: var(--space-sm)` between containers

**What We Don't Know**:
- Exact container width for wrap calculations
- Space between wrapped rows
- How margins/padding affect total height

### Problem 2: Mixed Content Heights (Favorites Page)

**Current Behavior**:
- Posts and replies mixed in single feed
- Different indentation: `reply>p` has `margin-left: var(--reply-indent); width: var(--reply-width)`
- Both use same trimmed image rules

**What We Need**:
- Height calculation for both post and reply content
- Account for reply indentation reducing available width
- Handle different content widths in same masonry layout

**What We Know**:
- Both posts and replies use `post[trimmed] p img` and `reply[trimmed] p img` → `height: 100px`
- Reply containers have width constraints

**What We Don't Know**:
- Exact reply indentation values
- How width differences affect image wrapping
- Whether replies need separate masonry calculation

### Problem 3: Text Content Height

**Current Behavior**:
- Text content trimmed to ~500 characters on favorites page
- Unknown height calculation for text blocks

**What We Need**:
- Reliable text height calculation
- Account for line breaks, padding, margins
- Handle text + image combinations

**What We Know**:
- Text trimming happens in `renderReply.js` and `renderPost.js`
- Uses `characters_used < 500` limit

**What We Don't Know**:
- Line height calculations
- Text container CSS that affects height
- Font size and spacing variations

### Problem 4: Container Width Detection

**What We Need**:
- Accurate container width for image wrapping calculations
- Account for different contexts (posts vs replies)
- Handle responsive width changes

**What We Don't Know**:
- How to reliably detect container width
- Whether width changes require recalculation
- Mobile vs desktop width differences

## Technical Approach Questions

### Height Calculation Strategy
1. **Static Analysis**: Calculate heights from stored dimensions + CSS rules
2. **Runtime Measurement**: Render content and measure actual heights
3. **Hybrid**: Static calculation with runtime verification

### Image Processing Pipeline
1. **When**: Calculate heights during feed rendering vs pre-calculate
2. **Where**: Client-side calculation vs server-side preparation
3. **Caching**: Store calculated heights vs recalculate each time

### Layout Distribution
1. **Algorithm**: Simple alternating vs height-based optimal distribution
2. **Reflow**: How to handle dynamic content loading (infinite scroll)
3. **Responsive**: How to handle width changes

## Evidence Needed

### Container Measurements
- Exact pixel widths for post and reply containers
- Margin/padding values that affect available width
- How `var(--space-sm)` resolves to pixel values

### Image Wrapping Behavior  
- Precise wrap points for different aspect ratios
- Row heights with wrapped images
- Spacing between wrapped rows

### Text Height Patterns
- Actual rendered heights for different text lengths
- Line height and font size values
- Padding/margin around text blocks

### Performance Constraints
- How many items need height calculation
- Acceptable calculation time for feed rendering
- Memory usage for storing calculated heights