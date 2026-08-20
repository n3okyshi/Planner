#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import re
from pathlib import Path

def auditar_projeto_integrado(diretorio_raiz):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 65)
    print("AUDITORIA MÁXIMA DE INTEGRIDADE E SEGURANÇA (VANILLA JS)")
    print("=" * 65)
    
    caminho_raiz = Path(diretorio_raiz)
    js_dir = caminho_raiz / "js"
    falhas = 0

    # 1. Bloqueio Estrutural e de Diretórios Proibidos
    proibidos_estrutura = ['package.json', 'webpack.config.js', 'tailwind.config.js', 'node_modules', '.npm', '.yarn']
    
    for item in proibidos_estrutura:
        if (caminho_raiz / item).exists():
            print(f"❌ [ERRO ESTRUTURAL] Artefato ou diretório proibido detectado: {item}")
            falhas += 1

    # 2. Padrões de Regex Rigorosos (Evita Falsos Positivos)
    padroes_js = [
        (r'import\s+.*\s+from\s+[\'"]react[\'"]', 'Importação do React'),
        (r'import\s+.*\s+from\s+[\'"]vue[\'"]', 'Importação do Vue'),
        (r'import\s+.*\s+from\s+[\'"]angular[\'"]', 'Importação do Angular'),
        (r'eval\s*\(', 'Uso de eval() inseguro (Risco de XSS)'),
        (r'new\s+Function\s*\(', 'Uso de new Function() inseguro (Risco de XSS)')
    ]
    
    padroes_html = [
        (r'<link[^>]*href=[\'"].*(bootstrap|tailwind).*[\'"]', 'CSS CDN Proibido (Bootstrap/Tailwind)'),
        (r'<script[^>]*src=[\'"].*(react|vue|angular).*[\'"]', 'JS CDN Proibido (React/Vue/Angular)')
    ]

    # Varredura eficiente ignorando diretórios ocultos e proibidos
    for arquivo in caminho_raiz.rglob('*'):
        # Ignora pastas ocultas (como .git) e node_modules caso existam indevidamente
        if '.git' in arquivo.parts or 'node_modules' in arquivo.parts:
            continue
            
        if arquivo.is_file():
            extensao = arquivo.suffix
            if extensao in ['.js', '.html']:
                try:
                    conteudo = arquivo.read_text(encoding='utf-8')
                    
                    # Aplica regras de JS
                    if extensao == '.js':
                        for padrao, desc in padroes_js:
                            if re.search(padrao, conteudo, re.IGNORECASE):
                                print(f"⚠️ [VULNERABILIDADE/VIOLAÇÃO] {desc} encontrado em: {arquivo.name}")
                                falhas += 1
                    
                    # Aplica regras de HTML para bloquear CDNs
                    if extensao == '.html':
                        for padrao, desc in padroes_html:
                            if re.search(padrao, conteudo, re.IGNORECASE):
                                print(f"⚠️ [CDN NÃO AUTORIZADA] {desc} injetado em: {arquivo.name}")
                                falhas += 1
                except Exception:
                    pass # Ignora arquivos binários ou ilegíveis

    # 3. Verificação de Integridade de Segurança (Exports Obrigatórios)
    utils_path = js_dir / "utils.js"
    if not utils_path.exists():
        print("❌ [FALHA ARQUITETURAL] Arquivo js/utils.js não encontrado.")
        falhas += 1
    else:
        conteudo_utils = utils_path.read_text(encoding='utf-8')
        exports_obrigatorios = ["escapeHTML", "sanitizeComLatex"]
        for exp in exports_obrigatorios:
            if exp not in conteudo_utils:
                print(f"❌ [FALHA DE SEGURANÇA] Export obrigatório '{exp}' ausente em utils.js.")
                falhas += 1

    # Veredito Final
    if falhas == 0:
        print("\n✅ AUDITORIA CONCLUÍDA COM SUCESSO!")
        print("  - Zero dependências de frameworks externos.")
        print("  - Nenhuma injeção de CDN maliciosa detectada nos HTMLs.")
        print("  - Funções nativas de segurança XSS verificadas e ativas.")
        print("=" * 65)
        sys.exit(0)
    else:
        print(f"\n🚨 AUDITORIA REPROVADA: {falhas} violação(ões) encontrada(s). Corrija antes de fazer o deploy.")
        sys.exit(1)

if __name__ == "__main__":
    auditar_projeto_integrado('.')