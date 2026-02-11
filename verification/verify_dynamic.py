import os
from playwright.sync_api import sync_playwright

def verify(page):
    cwd = os.getcwd()
    page.goto(f"file://{cwd}/index.html")
    page.wait_for_load_state("networkidle")

    # Wait for global model to be exposed
    page.wait_for_function("() => window.model !== undefined")

    # Inject dummy class
    page.evaluate("""
        window.model.state.turmas.push({
            id: '123',
            nome: 'Turma Teste',
            nivel: 'Fundamental',
            serie: '6º Ano',
            identificador: 'A',
            alunos: []
        });
        window.controller.navigate('dia');
    """)

    page.wait_for_timeout(1000)

    # Check for buttons
    mic_btn = page.locator("#btn-mic-plan-metodologia")
    if mic_btn.is_visible():
        print("Microphone button found!")
    else:
        print("Microphone button NOT found.")

    page.screenshot(path="verification/diario_with_class.png")
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
