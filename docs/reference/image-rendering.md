# Image Rendering Patterns and CSS Rules

This document comprehensively maps all image rendering locations and their associated CSS rules, discovered through CSSRuleList analysis of actual browser rule application.

## Image Rendering Locations

### 1. Post Content Images (`renderPost.js:430-444`)

**HTML Structure:**
```html
<post [trimmed]>
  <p img="" total-images="1">
    <img src="/image/uuid">
  </p>
</post>
```

**Applied CSS Rules:**

| Context | Selector | Properties | File |
|---------|----------|------------|------|
| **Base** | `p img` | `max-width: 100%; border-radius: var(--border-radius-md);` | `content-semantics.css` |
| **Base** | `p` | `margin-top: var(--space-sm);` | Base spacing |
| **Base** | `p` | `max-width: 100%; overflow: hidden;` | Container constraints |
| **Trimmed** | `post[trimmed] p img, reply[trimmed] p img, conversation p img` | `cursor: pointer; height: 100px;` | `posts.css:88-93` |
| **Trimmed Single** | `post[trimmed] p[img][total-images="1"]` | `width: 100%; justify-content: center;` | `posts.css:95-98` |
| **Trimmed Single** | `post[trimmed] p[img][total-images="1"] img` | `height: unset; max-height: 300px;` | `posts.css:100-103` |
| **Trimmed Multi** | `post[trimmed] p[img], reply[trimmed] p[img], conversation p[img]` | `display: inline-flex;` | `posts.css:105-109` |
| **Trimmed Multi** | `post[trimmed] p[img]+p[img], reply[trimmed] p[img]+p[img], conversation p[img]+p[img]` | `margin-left: var(--space-sm);` | `posts.css:111-115` |

**Key Behaviors:**

| Context | Layout Pattern | Height | Spacing |
|---------|---------------|--------|---------|
| **Full Posts** | Vertical stacking: separate `<p img>` blocks | Natural (max-width: 100%) | `margin-top: var(--space-sm)` between containers |
| **Trimmed Posts (Multi)** | Horizontal flexbox: `inline-flex` containers | Fixed 100px | `margin-left: var(--space-sm)` between containers, wraps when needed |
| **Trimmed Posts (Single)** | Centered container | max-height 300px (not fixed) | N/A |

**Critical Layout Difference:**
- **Full posts**: Each image in separate block container, stack vertically
- **Trimmed posts**: Images in flex containers, flow horizontally with wrapping

### 2. Reply Images (`renderReply.js:214-227`)

**HTML Structure:**
```html
<reply [trimmed]>
  <p img="">
    <img src="/image/uuid">
  </p>
</reply>
```

**Applied CSS Rules:**

| Selector | Properties | Context | File |
|----------|------------|---------|------|
| `p img` | `max-width: 100%; border-radius: var(--border-radius-md);` | Base rule | `content-semantics.css` |
| `reply>info-wrapper, reply>p` | `margin-left: var(--reply-indent); width: var(--reply-width);` | Reply indentation | `replies.css` |
| `reply[trimmed] p img` | `cursor: pointer; height: 100px;` | When reply is trimmed | `posts.css:88-93` |

**Key Behaviors:**
- **Reply indentation**: Images inherit reply indentation and width constraints
- **Trimmed replies**: Same 100px height behavior as posts
- **No total-images attribute**: Unlike posts, replies don't track image count for special styling

### 3. Message Images (`renderMessages.js`)

**HTML Structure:**
```html
<conversation>
  <p img="">
    <img src="/image/uuid">
  </p>
</conversation>
```

**Applied CSS Rules:**

| Selector | Properties | Context | File |
|----------|------------|---------|------|
| `p img` | `max-width: 100%; border-radius: var(--border-radius-md);` | Base rule | `content-semantics.css` |
| `conversation p img` | `cursor: pointer; height: 100px;` | Message context | `posts.css:88-93` |
| `conversation p[img]` | `display: inline-flex;` | Container display | `posts.css:105-109` |

**Key Behaviors:**
- **Always 100px height**: Messages always use fixed height like trimmed posts
- **Always clickable**: Cursor pointer in message context

### 4. Profile Pictures (`renderPosts.js:68-88, renderMessages.js:52-63`)

**HTML Structure:**
```html
<profile-picture [large]>
  <profile-image>
    <img src="/image/uuid">
  </profile-image>
</profile-picture>
```

**Applied CSS Rules:**

| Selector | Properties | Context | File |
|----------|------------|---------|------|
| `profile-picture profile-image, [profile-picture] profile-image` | `display: flex; justify-content: center; align-items: center; width: 40px; height: 40px; overflow: hidden; border-radius: 50%;` | Standard profile | `profiles.css:4-13` |
| `profile-picture profile-image img, [profile-picture] profile-image img` | `width: 100%; height: 100%;` | Image fill | `profiles.css:15-19` |
| `profile-picture large profile-image, [profile-picture][large] profile-image` | `width: 120px; height: 120px;` | Large profile | `profiles.css:21-25` |

**Key Behaviors:**
- **Circular clipping**: 50% border-radius creates circular images
- **Two sizes**: 40px (standard) and 120px (large)
- **Fill container**: Images stretch to fill circular container

### 5. Image Previews (`showAddNewPost.js:167-189, showAddNewReply.js, renderMessages.js`)

**HTML Structure:**
```html
<image-previews>
  <preview>
    <img src="data:image/png;base64,...">
  </preview>
</image-previews>
```

**Applied CSS Rules:**

| Context | Selector | Properties | File |
|---------|----------|------------|------|
| **Post Previews** | `image-previews` | `position: relative; display: flex; flex-direction: row; align-items: center;` | `forms.css:209-214` |
| **Post Previews** | `image-previews preview` | `position: relative; display: flex; justify-content: center; align-items: center; width: calc(25% - (15px / 4)); height: 100px; margin-right: 5px; overflow: hidden; border-radius: var(--border-radius-sm);` | `forms.css:216-226` |
| **Post Previews** | `image-previews preview img` | `max-height: 100px; max-width: 100%;` | `forms.css:270-273` |
| **Reply Previews** | `add-new[reply] image-previews` | `margin-top: -33px; width: calc(100% - 95px);` | `forms.css:228-231` |
| **Reply Previews** | `add-new[reply] image-previews preview` | `width: unset; max-width: 100%;` | `forms.css:233-236` |
| **Message Previews** | `image-previews` | Same as post previews | `forms.css` |
| **Message Previews** | `image-previews preview` | Same as post previews | `forms.css` |

**Key Behaviors:**
- **Post/Message Previews**: 25% width grid layout for up to 4 images, 100px height
- **Reply Previews**: Full width layout with negative margin positioning (`margin-top: -33px`) and width constraint (`width: calc(100% - 95px)`)
- **Unique Reply Layout**: Reply previews are positioned differently and don't use the grid system

## CSS Architecture Summary

### Image Size Control Hierarchy

1. **Base Rule**: `p img` - `max-width: 100%` (all images)
2. **Context Rules**: 
   - `post[trimmed] p img` - `height: 100px` (trimmed posts)
   - `conversation p img` - `height: 100px` (messages)  
   - `reply[trimmed] p img` - `height: 100px` (trimmed replies)
3. **Special Cases**:
   - `post[trimmed] p[img][total-images="1"] img` - `height: unset; max-height: 300px` (single image override)

### Layout Control

- **Container Display**: `post[trimmed] p[img]` - `display: inline-flex`
- **Multi-image Spacing**: `post[trimmed] p[img]+p[img]` - `margin-left: var(--space-sm)`
- **Single Image Centering**: `post[trimmed] p[img][total-images="1"]` - `width: 100%; justify-content: center`

### Critical Files

- **`posts.css:84-116`**: Primary image sizing and layout rules
- **`profiles.css:4-26`**: Profile picture circular styling
- **`forms.css:187-274`**: Image preview components
- **`content-semantics.css`**: Base `p img` rules
- **`replies.css`**: Reply indentation affecting images

## Image Dimension Implementation

### Images That Need Dimension Attributes

**Goal**: Set width/height attributes to prevent content shift when images load.

#### Fixed Height Images (100px)
- **Contexts**: `post[trimmed] p img`, `reply[trimmed] p img`, `conversation p img`
- **Calculation**: `width = (naturalWidth / naturalHeight) * 100px`
- **Implementation**: Parse stored dimensions, calculate width, set both attributes

#### Variable Height Images (max-height 300px)  
- **Context**: `post[trimmed] p[total-images="1"] img`
- **Calculation**: Scale to fit within max-height constraint
- **Implementation**: Calculate both width and height to maintain aspect ratio

#### No Dimension Setting Needed
- **Profile pictures**: Fill fixed circular containers
- **Image previews**: Upload interface with fixed sizing
- **Full post images**: Natural sizing with max-width constraint

### Implementation Pattern

```javascript
// In renderPost.js, renderReply.js, renderMessages.js
const dimensions = parseDimensions(storedDimensions)
const [width, height] = calculateRenderedDimensions(dimensions, context)
img.width = width
img.height = height
```

This prevents content shift without requiring complex layout calculations.