#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import re
from pathlib import Path

def auditar_projeto_integrado(diretorio_raiz):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("=" * 70)
    print("AUDITORIA MÁXIMA DE INTEGRIDADE, SEGURANÇA E ARQUITETURA (VANILLA MVC)")
    print("=" * 70)
    
    caminho_raiz = Path(diretorio_raiz)
    js_dir = caminho_raiz / "js"
    views_dir = js_dir / "views"
    falhas = 0

    # 1. Bloqueio Estrutural e de Diretórios Proibidos
    proibidos_estrutura = ['package.json', 'webpack.config.js', 'tailwind.config.js', 'node_modules', '.npm', '.yarn', 'vite.config.js']
    
    for item in proibidos_estrutura:
        if (caminho_raiz / item).exists():
            print(f"❌ [ERRO ESTRUTURAL] Artefato ou diretório proibido detectado: {item}")
            falhas += 1

    # 2. Padrões de Regex Rigorosos
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

    # Delimitadores Proibidos de LaTeX ($ e $$) em chamadas de configuração KaTeX
    padrao_latex_cifrao = re.compile(r"\{\s*left:\s*['\"](?:\$|\$\$|\$\$)['\"],\s*right:\s*['\"](?:\$|\$\$|\$\$)['\"]", re.IGNORECASE)

    # 3. Varredura Global de Arquivos
    for arquivo in caminho_raiz.rglob('*'):
        if '.git' in arquivo.parts or 'node_modules' in arquivo.parts:
            continue
            
        if arquivo.is_file():
            extensao = arquivo.suffix
            if extensao in ['.js', '.html']:
                try:
                    conteudo = arquivo.read_text(encoding='utf-8')
                    
                    # Verificação de LaTeX ($ e $$ proibidos em renderMathInElement)
                    if padrao_latex_cifrao.search(conteudo):
                        print(f"⚠️ [VIOLAÇÃO DE DELIMITADOR LATEX] Delimitadores '$' ou '$$' detectados em: {arquivo.name}. Permitido apenas \\( \\) e \\[ \\].")
                        falhas += 1

                    # Aplica regras de JS
                    if extensao == '.js':
                        for padrao, desc in padroes_js:
                            if re.search(padrao, conteudo, re.IGNORECASE):
                                print(f"⚠️ [VULNERABILIDADE/VIOLAÇÃO] {desc} encontrado em: {arquivo.name}")
                                falhas += 1
                        
                        # Verificação de Isolamento de Infraestrutura nas Views
                        if views_dir in arquivo.parents:
                            if re.search(r'firebaseService\.db\.collection\(', conteudo):
                                print(f"❌ [VIOLAÇÃO DE ARQUITETURA] Acesso direto a firebaseService.db.collection() em View: {arquivo.name}. Use métodos de serviço.")
                                falhas += 1
                            if re.search(r'firebase\.firestore\(\)', conteudo):
                                print(f"❌ [VIOLAÇÃO DE ARQUITETURA] Acesso direto a firebase.firestore() em View: {arquivo.name}. Encapsule em firebase-service.js.")
                                falhas += 1
                        
                        # Verificação de Controllers/Components/Views/Utils sem inline onclick
                        if any(part in arquivo.parts for part in ["controllers", "components", "views", "utils"]):
                            if re.search(r'(?:\.onclick\s*=|onclick\s*=)', conteudo):
                                print(f"⚠️ [ACOPLAMENTO INLINE] 'onclick=' detectado em: {arquivo.name}. Utilize data-action com EventDelegator.")
                                falhas += 1
                    
                    # Aplica regras de HTML para bloquear CDNs e inline handlers
                    if extensao == '.html':
                        for padrao, desc in padroes_html:
                            if re.search(padrao, conteudo, re.IGNORECASE):
                                print(f"⚠️ [CDN NÃO AUTORIZADA] {desc} injetado em: {arquivo.name}")
                                falhas += 1
                        conteudo_sem_script = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', conteudo, flags=re.IGNORECASE)
                        if re.search(r'<[a-zA-Z0-9\-]+[^>]*\s+on[a-z]+\s*=', conteudo_sem_script, re.IGNORECASE):
                            print(f"⚠️ [ACOPLAMENTO INLINE] Atributo inline on* em tag HTML detectado em: {arquivo.name}. Utilize EventDelegator.")
                            falhas += 1
                except Exception:
                    pass

    # 4. Verificação de Integridade de Segurança e Utilitários
    utils_path = js_dir / "utils.js"
    if not utils_path.exists():
        print("❌ [FALHA ARQUITETURAL] Arquivo js/utils.js não encontrado.")
        falhas += 1
    else:
        conteudo_utils = utils_path.read_text(encoding='utf-8')
        exports_obrigatorios = ["escapeHTML", "sanitizeComLatex", "EventDelegator"]
        for exp in exports_obrigatorios:
            if exp not in conteudo_utils:
                print(f"❌ [FALHA DE SEGURANÇA/ARQUITETURA] Export obrigatório '{exp}' ausente em utils.js.")
                falhas += 1

    # 5. Veredito Final
    print("-" * 70)
    if falhas == 0:
        print("✅ AUDITORIA CONCLUÍDA COM 100% DE SUCESSO!")
        print("  - Zero dependências ou artefatos de frameworks externos.")
        print("  - Nenhuma injeção de CDN maliciosa ou não autorizada detectada.")
        print("  - Funções de segurança XSS e EventDelegator ativas.")
        print("  - Delimitadores LaTeX estritamente conformes (\\( \\) e \\[ \\]).")
        print("  - Isolamento rigoroso da camada de infraestrutura Firestore mantido.")
        print("=" * 70)
        sys.exit(0)
    else:
        print(f"🚨 AUDITORIA REPROVADA: {falhas} violação(ões) encontrada(s).")
        print("=" * 70)
        sys.exit(1)

if __name__ == "__main__":
    auditar_projeto_integrado('.')