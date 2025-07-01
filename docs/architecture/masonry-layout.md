# Image Dimension Setting for Content Stability

Preventing content shift by setting image dimensions based on stored data.

## Current Goal

**Set image width/height attributes to prevent content shift when images load.**

We have image dimensions stored for all images. The next step is to calculate the actual rendered width/height and set those values on `<img>` elements so there's no layout shift when images finish loading.

## Stored Image Data

**Database**: `image_dimensions` column contains comma-separated dimensions: `"1024,100,512,512,..."`
**Processing**: Images processed to max 1024px on longest side via `imageToPng()`

## Image Contexts That Need Dimensions

### 1. Trimmed Posts (`post[trimmed] p img`)
- **CSS**: `height: 100px` fixed height
- **Width calculation**: `width = (naturalWidth / naturalHeight) * 100`
- **Implementation**: Calculate width from stored dimensions, set both width and height attributes

### 2. Trimmed Replies (`reply[trimmed] p img`) 
- **CSS**: `height: 100px` fixed height (same as posts)
- **Width calculation**: Same as posts
- **Implementation**: Same as posts

### 3. Single Images (`post[trimmed] p[total-images="1"] img`)
- **CSS**: `height: unset; max-height: 300px`
- **Width calculation**: Maintain aspect ratio, scale to fit max-height
- **Implementation**: Calculate both width and height to fit within max-height constraint

### 4. Message Images (`conversation p img`)
- **CSS**: `height: 100px` fixed height
- **Width calculation**: Same as trimmed posts
- **Implementation**: Same as trimmed posts

### 5. Profile Pictures
- **CSS**: Fixed circular containers (40px or 120px)
- **Implementation**: Images fill container, no dimension calculation needed

## Implementation Approach

### Simple Strategy
1. **Parse stored dimensions** from database
2. **Calculate rendered dimensions** based on CSS context
3. **Set width/height attributes** on `<img>` elements during rendering
4. **Let CSS handle the rest** - no layout calculations needed

### Calculation Examples

```javascript
// For 100px height contexts (trimmed posts/replies/messages)
const [naturalWidth, naturalHeight] = storedDimensions
const renderedWidth = (naturalWidth / naturalHeight) * 100
const renderedHeight = 100

// For single images with max-height 300px
const maxHeight = 300
const scale = Math.min(1, maxHeight / naturalHeight)
const renderedWidth = naturalWidth * scale  
const renderedHeight = naturalHeight * scale
```

### Benefits
- **No content shift** when images load
- **Simple implementation** - just set attributes during rendering
- **No complex calculations** about wrapping or layout
- **Works with existing CSS** - let CSS handle positioning/flow

## Next Steps

1. **Add dimension calculation** to image rendering functions
2. **Set width/height attributes** on all `<img>` elements
3. **Test that content remains stable** during image loading
4. **Verify responsive behavior** still works correctly

This approach solves the content shift problem without requiring complex masonry layout calculations.