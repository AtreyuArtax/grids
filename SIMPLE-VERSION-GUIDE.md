# Simple Version Management

## 🎯 ONE PLACE TO UPDATE - That's It!

Open `index.html` and find this section at the very top:

```html
<!-- ============== VERSION CONFIGURATION ============== -->
<!-- UPDATE THESE TWO LINES TO CHANGE ALL VERSION NUMBERS -->
<script>
    window.APP_VERSION = '2025-09-22-1';      // For PWA cache updates
    window.CACHE_BUSTER = '14';               // For CSS/JS cache busting
</script>
<!-- =================================================== -->
```

**Just change those two numbers and save the file. Done!** 🎉

## How It Works

- **CSS and JS files** automatically get versioned: `style.css?v=14`, `main.js?v=14`
- **Service Worker** gets the PWA version: `/sw.js?v=2025-09-22-1`
- **No build scripts needed** - everything updates immediately!

## When to Update

- **APP_VERSION**: Change when you want to force PWA cache refresh (new features, bug fixes)  
- **CACHE_BUSTER**: Change when CSS or JS files are modified

## Examples

### Update for bug fixes:
```html
window.APP_VERSION = '2025-09-24-1';      // New PWA version
window.CACHE_BUSTER = '14';               // Keep same if CSS/JS unchanged
```

### Update for style changes:
```html
window.APP_VERSION = '2025-09-22-1';      // Keep same if no PWA changes
window.CACHE_BUSTER = '15';               // Increment for new CSS/JS
```

### Major update:
```html
window.APP_VERSION = '2025-09-24-1';      // New PWA version
window.CACHE_BUSTER = '15';               // New CSS/JS version
```

## That's It!

No more complex build processes, no more hunting through multiple files. Just edit two lines in one place and you're done! ✨