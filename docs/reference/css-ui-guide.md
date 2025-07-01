# CSS-UI Reference Guide

This reference documents the custom HTML elements and semantic attributes used throughout the application. It serves as a quick lookup for understanding the CSS selector patterns.

## When to Regenerate

This guide should be regenerated when comprehensive CSS mapping is needed by:
1. Reading all CSS files in `client/css/` directory
2. Extracting custom element selectors (non-standard HTML elements)
3. Documenting semantic attribute patterns
4. Mapping component hierarchies and relationships

## Current Quick Reference

### Common Semantic Attributes
- `[center]` - Center alignment and flexbox centering
- `[ellipsis]` - Text truncation with ellipsis
- `[muted]` - Reduced opacity for secondary content
- `[right]` - Right-aligned flex container
- `[full-width]` - Full-width positioning
- `[flex-column]` - Vertical flex layout

### Common Custom Elements
- `posts` - Post container
- `post` - Individual post
- `reply` - Reply to post
- `conversation` - Conversation item
- `message` - Individual message
- `modal` - Modal dialog
- `menu` - Navigation menu

### Interactive States
- `[trimmed]` - Collapsed/expandable content
- `[favorited]` - Favorited state styling
- `[active]` - Active/selected state
- `[disabled]` - Disabled state
- `[unread]` - Unread indicator

## Usage

**For development**: Use this as a quick reference for existing patterns. When in doubt, search the CSS files directly.

**For comprehensive mapping**: This stub should be replaced with a complete analysis of all CSS selectors when detailed documentation is needed.