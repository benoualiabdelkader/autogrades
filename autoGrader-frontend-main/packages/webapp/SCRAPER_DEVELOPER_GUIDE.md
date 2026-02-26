# Web Scraper - Developer Guide

## Architecture Overview

### Components Structure

```
src/
├── pages/
│   ├── web-scraper/
│   │   └── index.tsx          # Main page
│   └── api/
│       └── scraper.ts         # API endpoint
└── components/
    ├── ScraperInterface.tsx   # Main UI component
    ├── ScraperStats.tsx       # Statistics display
    └── DataPreview.tsx        # Tabbed data viewer
```

## Component Details

### 1. ScraperInterface.tsx
Main component handling all scraping logic and UI.

**State Management:**
- `url`: Target URL
- `selector`: CSS selector for advanced scraping
- `scrapeType`: Type of scraping (basic/advanced/screenshot)
- `data`: Scraped results
- `history`: Local storage history
- `advancedOptions`: Browser configuration
- `multiPageUrls`: Multiple URLs for batch scraping

**Key Functions:**
- `handleScrape()`: Main scraping function
- `exportData(format)`: Export to JSON/CSV/TXT
- `saveToHistory()`: Save to localStorage
- `loadFromHistory()`: Load previous scrape

### 2. ScraperStats.tsx
Displays visual statistics cards.

**Props:**
- `data`: Scraped data object

**Displays:**
- Title presence
- Content length
- Links count
- Images count
- Elements count

### 3. DataPreview.tsx
Tabbed interface for viewing scraped data.

**Features:**
- Tab navigation (Content/Links/Images/Metadata)
- Search functionality for links and images
- Copy to clipboard
- Image preview with error handling

### 4. API Endpoint (/api/scraper.ts)

**Request:**
```typescript
{
  url: string;
  selector?: string;
  type: 'basic' | 'advanced' | 'screenshot';
  options?: {
    waitForSelector?: string;
    timeout?: number;
    userAgent?: string;
    viewport?: { width: number; height: number };
    javascript?: boolean;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    title?: string;
    content?: string;
    links?: string[];
    images?: string[];
    metadata?: any;
    screenshot?: string;
    elements?: any[];
  };
  error?: string;
}
```

## Scraping Types

### Basic Scraping
Extracts:
- Page title
- Body text content (first 5000 chars)
- All links (href attributes)
- All images (src attributes)
- Meta tags (description, keywords, author)

### Advanced Scraping
With selector:
- Extracts specific elements matching CSS selector
- Returns text and HTML for each element

Without selector:
- Same as basic + headings (h1, h2, h3)

### Screenshot
- Full page screenshot
- Returns base64 encoded PNG

## Advanced Options

### Timeout
Default: 30000ms (30 seconds)
Controls maximum wait time for page load.

### Wait For Selector
Waits for specific element to appear before scraping.
Example: `.content`, `#main-article`

### JavaScript
Default: enabled
Toggle JavaScript execution in browser.

### User Agent
Default: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Custom user agent string.

### Viewport
Default: 1920x1080
Browser window size.

## Local Storage

### History Storage
Key: `scraper-history`
Format: Array of HistoryItem objects
Max items: 20 (FIFO)

```typescript
interface HistoryItem {
  id: string;
  url: string;
  type: string;
  timestamp: string;
  data: ScrapedData;
}
```

## Export Formats

### JSON
Complete data export with all fields.

### CSV
Links only, format:
```
Type,Value
Link,https://example.com
Link,https://example.com/page2
```

### TXT
Title and content only:
```
Title: Page Title

Content:
Page content text...
```

## Multi-Page Scraping

Input: Multiple URLs (one per line)
Process: Sequential scraping
Output: Array of results with URL reference

```typescript
{
  multiPage: true,
  results: [
    { url: "...", title: "...", ... },
    { url: "...", title: "...", ... }
  ],
  timestamp: "..."
}
```

## Error Handling

### Common Errors
- Invalid URL
- Timeout
- Network error
- Selector not found
- JavaScript disabled on dynamic site

### Error Display
Red alert box with error message in Arabic.

## Performance Considerations

### Timeout Configuration
- Short timeout (10s): Fast sites
- Medium timeout (30s): Default
- Long timeout (60s): Slow/heavy sites

### Multi-Page Limits
Recommended: Max 10 URLs per batch
Reason: Sequential processing, browser memory

### Screenshot Size
Full page screenshots can be large (>5MB)
Consider viewport size for optimization.

## Security Notes

⚠️ **Important:**
- Always validate URLs
- Respect robots.txt
- Rate limiting recommended
- User agent identification
- CORS considerations

## Testing

### Manual Testing
1. Basic scraping: https://example.com
2. Advanced with selector: `.content`
3. Screenshot: Any public site
4. Multi-page: 3-5 URLs

### Edge Cases
- Empty pages
- 404 errors
- Redirect chains
- JavaScript-heavy sites
- Protected content

## Future Enhancements

### Planned Features
- [ ] Rate limiting
- [ ] Proxy support
- [ ] Authentication handling
- [ ] Scheduled scraping
- [ ] Database storage
- [ ] Excel export
- [ ] API key authentication
- [ ] Webhook notifications

### Performance Improvements
- [ ] Parallel multi-page scraping
- [ ] Browser instance pooling
- [ ] Result caching
- [ ] Incremental loading

## Troubleshooting

### Issue: Timeout errors
**Solution:** Increase timeout in advanced options

### Issue: No content extracted
**Solution:** Check if JavaScript is needed, enable it

### Issue: Selector returns nothing
**Solution:** Verify selector in browser DevTools first

### Issue: Screenshot too large
**Solution:** Reduce viewport size or use selective screenshot

## API Usage Examples

### cURL Example
```bash
curl -X POST http://localhost:3000/api/scraper \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "type": "basic"
  }'
```

### JavaScript Fetch Example
```javascript
const response = await fetch('/api/scraper', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    type: 'advanced',
    selector: '.article',
    options: {
      timeout: 30000,
      javascript: true
    }
  })
});

const result = await response.json();
console.log(result.data);
```

## Contributing

When adding new features:
1. Update TypeScript interfaces
2. Add error handling
3. Update README files
4. Test all scraping types
5. Consider performance impact

## License & Legal

This tool is for educational purposes.
Always respect:
- Website terms of service
- robots.txt directives
- Rate limits
- Copyright laws
- Privacy regulations
