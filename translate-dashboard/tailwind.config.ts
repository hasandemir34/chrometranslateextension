import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // HTML elementinin .dark sınıfı olup olmadığına bakılır
  theme: {
    extend: {
      colors: {
        // Tema renkleri (isteğe bağlı)
      },
    },
  },
  plugins: [],
}
export default config
