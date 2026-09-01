#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import re
from pathlib import Path

def run_deep_audit():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    root = Path(".")
    js_dir = root / "js"
    views_dir = js_dir / "views"
    controllers_dir = js_dir / "controllers"
    models_dir = js_dir / "models"
    services_dir = js_dir / "services"
    components_dir = js_dir / "components"
    css_dir = root / "css"
    sw_file = root / "sw.js"

    print("=" * 80)
    print("VARREDURA HOLISTICA DE ARQUITETURA, REATIVIDADE, SEGURANCA E CSS")
    print("=" * 80)

    # 1. Auditoria de Service Worker (PWA Offline-First)
    print("\n--- 1. AUDITORIA DE SERVICE WORKER (sw.js) ---")
    if sw_file.exists():
        sw_content = sw_file.read_text(encoding="utf-8")
        match = re.search(r'ASSETS_TO_CACHE\s*=\s*\[(.*?)\];', sw_content, re.DOTALL)
        if match:
            raw_list = match.group(1)
            assets = re.findall(r'[\'\"](\./[^\'\"]+)[\'\"]', raw_list)
            missing = []
            for a in assets:
                clean_path = a.replace('./', '')
                if not clean_path:
                    clean_path = '.'
                p = root / clean_path
                if not p.exists():
                    missing.append(a)
            if missing:
                print(f"[ERRO PWA] {len(missing)} arquivo(s) listados em ASSETS_TO_CACHE NAO EXISTEM no disco:")
                for m in missing:
                    print(f"   -> {m}")
            else:
                print(f"[OK] Todos os {len(assets)} assets locais do sw.js existem fisicamente.")
        else:
            print("[WARN] ASSETS_TO_CACHE nao encontrado no sw.js")

    # 2. Auditoria de Imports Quebrados em JS
    print("\n--- 2. AUDITORIA DE IMPORTACOES (ES Modules) ---")
    all_js = list(js_dir.rglob("*.js"))
    broken_imports = []
    for jf in all_js:
        content = jf.read_text(encoding="utf-8")
        imports = re.findall(r'from\s+[\'"](\.[^\'"]+)[\'"]', content)
        for imp in imports:
            target_path = (jf.parent / imp).resolve()
            if not target_path.exists():
                broken_imports.append((jf.name, imp))
    if broken_imports:
        print(f"[ERRO IMPORT] {len(broken_imports)} import(s) quebrados detectados:")
        for source, imp in broken_imports:
            print(f"   -> Em {source}: '{imp}' nao existe!")
    else:
        print(f"[OK] Zero importacoes quebradas nos {len(all_js)} arquivos JS.")

    # 3. Auditoria de Views
    print("\n--- 3. AUDITORIA DE VIEWS (js/views/) ---")
    views = sorted(list(views_dir.glob("*.js")))
    for v in views:
        content = v.read_text(encoding="utf-8")
        has_destroy = bool(re.search(r'\b(?:destroy|onLeave)\s*\(\s*\)', content))
        inline_events = re.findall(r'\s+on(?:click|change|input|submit|keydown|keyup)\s*=', content, re.I)
        cross_view_render = [m for m in re.findall(r'(?:window\.\w+View|\b\w+View)\.render\b', content) if not m.startswith(v.stem)]
        doc_frags = len(re.findall(r'createDocumentFragment', content))
        firestore_direct = re.findall(r'firebase\.(?:firestore|auth)\(\)|firebaseService\.db\b', content)
        model_sub = len(re.findall(r'model\.on\(', content))
        
        status = []
        if not has_destroy:
            status.append("SEM destroy/onLeave")
        if inline_events:
            status.append(f"{len(inline_events)} inline on*")
        if cross_view_render:
            status.append(f"{len(cross_view_render)} cross View.render")
        if firestore_direct:
            status.append(f"{len(firestore_direct)} DIRECT FIRESTORE")
            
        status_str = ", ".join(status) if status else "OK (Conforme)"
        flag = "[WARN]" if status else "[OK]  "
        print(f"{flag} {v.name:25} | {status_str:40} | docFrag:{doc_frags} | model.on:{model_sub}")

    # 4. Auditoria de Controllers
    print("\n--- 4. AUDITORIA DE CONTROLLERS (js/controllers/ e js/controller.js) ---")
    ctrl_files = sorted(list(controllers_dir.glob("*.js"))) + [js_dir / "controller.js"]
    for c in ctrl_files:
        if not c.exists(): continue
        content = c.read_text(encoding="utf-8")
        window_view_access = re.findall(r'window\.\w+View\b', content)
        firestore_direct = re.findall(r'firebase\.(?:firestore|auth)\(\)|firebaseService\.db\b', content)
        flag = "[WARN]" if window_view_access or firestore_direct else "[OK]  "
        status_c = []
        if window_view_access: status_c.append(f"{len(window_view_access)} window.*View")
        if firestore_direct: status_c.append(f"{len(firestore_direct)} DIRECT FIRESTORE")
        status_str = ", ".join(status_c) if status_c else "OK (Conforme)"
        print(f"{flag} {c.name:28} | {status_str}")

    # 5. Auditoria de Models e Servicos
    print("\n--- 5. AUDITORIA DE MODELS E SERVICOS ---")
    model_files = sorted(list(models_dir.glob("*.js"))) + [js_dir / "model.js"]
    for m in model_files:
        if not m.exists(): continue
        content = m.read_text(encoding="utf-8")
        direct_view_render = re.findall(r'(?:window\.\w+View|\b\w+View)\.render\b', content)
        flag = "[WARN]" if direct_view_render else "[OK]  "
        status_m = f"{len(direct_view_render)} direct View.render (VIOLACAO MVC)" if direct_view_render else "OK (100% Reativo via model.emit)"
        print(f"{flag} {m.name:28} | {status_m}")

    # 6. Auditoria de CSS (BEM, Custom Properties, Escopo)
    print("\n--- 6. AUDITORIA DE CSS (css/) ---")
    css_files = sorted(list(css_dir.glob("*.css")))
    for cf in css_files:
        content = cf.read_text(encoding="utf-8")
        lines = len(content.splitlines())
        var_uses = len(re.findall(r'var\(--', content))
        important_count = len(re.findall(r'!important', content))
        print(f"[*] {cf.name:20} | Linhas: {lines:5} | Usos var(): {var_uses:4} | !important: {important_count:3}")

    print("\n" + "=" * 80)

if __name__ == "__main__":
    run_deep_audit()
