from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Go to the local server
            page.goto("http://localhost:8000")

            # Wait for the title to be correct
            page.wait_for_load_state("networkidle")
            title = page.title()
            print(f"Page title: {title}")

            # Check if window.model exists and has the correct storage key
            model_key = page.evaluate("window.model.STORAGE_KEY")
            print(f"Model Storage Key: {model_key}")

            if model_key == 'planner_pro_docente_2026':
                print("SUCCESS: Model loaded correctly.")
            else:
                print("FAILURE: Model not loaded correctly.")

            # Take a screenshot
            page.screenshot(path="verification/screenshot.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
