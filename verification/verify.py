import os
from playwright.sync_api import sync_playwright

def verify(page):
    # Load index.html
    cwd = os.getcwd()
    page.goto(f"file://{cwd}/index.html")

    # Wait for the page to load
    page.wait_for_load_state("networkidle")

    # Check for dashboard (default view)
    page.screenshot(path="verification/dashboard.png")
    print("Dashboard screenshot taken.")

    # Navigate to Diario
    page.click("#nav-dia")
    page.wait_for_timeout(1000) # Wait for view transition

    # Check for Microphone buttons
    mic_btn = page.locator("#btn-mic-plan-metodologia")
    if mic_btn.is_visible():
        print("Microphone button found!")
    else:
        print("Microphone button NOT found.")

    page.screenshot(path="verification/diario.png")
    print("Diario screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
