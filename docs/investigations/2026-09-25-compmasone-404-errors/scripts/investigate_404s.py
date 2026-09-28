#!/usr/bin/env python3
"""
Playwright script to investigate 404 errors on https://www.compmasone.ru/
Captures network requests (404s), console errors, and takes screenshots.
"""

from playwright.sync_api import sync_playwright
import json
import time

url = 'https://www.compmasone.ru/'

# Storage for captured data
network_errors = []
console_errors = []
all_requests = []

def handle_response(response):
    """Capture all responses, especially 404s"""
    if response.status >= 400:
        error_info = {
            'url': response.url,
            'status': response.status,
            'method': response.request.method,
            'resource_type': response.request.resource_type,
            'headers': dict(response.headers),
            'timing': response.request.timing,
        }
        network_errors.append(error_info)
        print(f"[NETWORK ERROR] {response.request.method} {response.url} -> {response.status}")
    
    # Also capture all requests for analysis
    all_requests.append({
        'url': response.url,
        'status': response.status,
        'method': response.request.method,
        'resource_type': response.request.resource_type,
    })

def handle_console_message(msg):
    """Capture console messages, especially errors"""
    log_entry = {
        'type': msg.type,
        'text': msg.text,
        'location': msg.location,
    }
    if msg.type == 'error' or '404' in msg.text.lower() or 'not found' in msg.text.lower():
        console_errors.append(log_entry)
        print(f"[CONSOLE ERROR] {msg.text}")
    elif msg.type == 'warning':
        print(f"[CONSOLE WARN] {msg.text}")

def handle_request_failed(request):
    """Capture failed requests"""
    error_info = {
        'url': request.url,
        'method': request.method,
        'resource_type': request.resource_type,
        'failure': request.failure,
    }
    network_errors.append(error_info)
    print(f"[REQUEST FAILED] {request.method} {request.url} -> {request.failure}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    )
    page = context.new_page()
    
    # Set up event listeners
    page.on("response", handle_response)
    page.on("console", handle_console_message)
    page.on("requestfailed", handle_request_failed)
    
    print(f"Navigating to {url}...")
    
    try:
        # Navigate and wait for network to be idle
        page.goto(url, wait_until='networkidle', timeout=60000)
        print("Page loaded, waiting for additional requests...")
        
        # Wait a bit more for any delayed requests
        page.wait_for_timeout(5000)
        
        # Take full page screenshot
        page.screenshot(path='/tmp/compmasone_full.png', full_page=True)
        print("Screenshot saved to /tmp/compmasone_full.png")
        
        # Take viewport screenshot
        page.screenshot(path='/tmp/compmasone_viewport.png')
        print("Viewport screenshot saved to /tmp/compmasone_viewport.png")
        
        # Get page content for analysis
        content = page.content()
        with open('/tmp/compmasone_page.html', 'w') as f:
            f.write(content)
        print("Page HTML saved to /tmp/compmasone_page.html")
        
        # Try to find any error elements on the page
        error_elements = page.locator('text=/404|Not Found|Error/i').all()
        if error_elements:
            print(f"\nFound {len(error_elements)} error-related text elements on page")
            for elem in error_elements[:10]:
                try:
                    print(f"  - {elem.inner_text()[:200]}")
                except:
                    pass
        
    except Exception as e:
        print(f"Error during navigation: {e}")
        page.screenshot(path='/tmp/compmasone_error.png', full_page=True)
    
    browser.close()

# Save results
results = {
    'url': url,
    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
    'network_errors': network_errors,
    'console_errors': console_errors,
    'all_requests_summary': [
        {'url': r['url'], 'status': r['status'], 'method': r['method'], 'type': r['resource_type']}
        for r in all_requests
    ],
    'stats': {
        'total_requests': len(all_requests),
        'network_errors_count': len(network_errors),
        'console_errors_count': len(console_errors),
        'status_codes': {}
    }
}

# Count status codes
for r in all_requests:
    code = r['status']
    results['stats']['status_codes'][code] = results['stats']['status_codes'].get(code, 0) + 1

with open('/tmp/404_investigation_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n" + "="*60)
print("INVESTIGATION SUMMARY")
print("="*60)
print(f"Total requests captured: {len(all_requests)}")
print(f"Network errors (4xx/5xx): {len(network_errors)}")
print(f"Console errors: {len(console_errors)}")
print(f"\nStatus code distribution:")
for code, count in sorted(results['stats']['status_codes'].items()):
    print(f"  {code}: {count}")

print(f"\nDetailed results saved to /tmp/404_investigation_results.json")

# Print network errors details
if network_errors:
    print("\n" + "-"*60)
    print("NETWORK ERRORS (4xx/5xx):")
    print("-"*60)
    for err in network_errors:
        print(f"\n  URL: {err['url']}")
        print(f"  Method: {err['method']}")
        print(f"  Status: {err['status']}")
        print(f"  Type: {err['resource_type']}")
        if 'headers' in err:
            # Print relevant headers
            for h in ['content-type', 'cache-control', 'x-vercel-id', 'server']:
                if h in err['headers']:
                    print(f"  {h}: {err['headers'][h]}")

# Print console errors details
if console_errors:
    print("\n" + "-"*60)
    print("CONSOLE ERRORS:")
    print("-"*60)
    for err in console_errors:
        print(f"\n  Type: {err['type']}")
        print(f"  Text: {err['text']}")
        if err['location']:
            print(f"  Location: {err['location']}")