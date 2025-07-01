## Widths and heights we need to set on <img> during render

### 1. Trimmed Post with >= 2 images (`post[trimmed] p img`)
### 2. Trimmed Reply (`reply[trimmed] p img`) 
### 3. Conversation (`conversation p img`)
- **CSS**:
	`height: 100px; max-width: 100%`
- **Width to be set**:
	`width = Math.min((natural_width / natural_height) * 100, measured_container_width)`

### 4. Trimmed Post with 1 image (`post[trimmed] p[total-images="1"] img`)
- **CSS**:
	`height: unset; max-height: 300px`
- **Height to be set**:
	`height = Math.min(measured_width * (natural_height / natural_width), 300)`
