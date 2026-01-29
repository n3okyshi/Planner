/** @type {import('tailwindcss').Config} */
module.exports = {
  // Define exatamente onde o Tailwind deve procurar por classes para gerar o CSS
  content: [
    "./*.html",          // Arquivos HTML na raiz (index.html)
    "./js/**/*.js",      // Todos os arquivos JS dentro da estrutura de pastas
    "!./node_modules/**" // Garante exclusão explícita de dependências
  ],
  theme: {
    extend: {
      // Cores estendidas usando variáveis CSS para permitir temas dinâmicos (UI Controller)
      colors: {
        primary: 'var(--primary-color)',
      },
      // Configuração de tipografia com fallbacks nativos
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // Animações personalizadas utilizadas nas Views
      animation: {
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      // Keyframes para as animações
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}