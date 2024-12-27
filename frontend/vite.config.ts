import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
        '@': path.resolve(__dirname, './src')
      },
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  },
  server: {
    port: 3000,
    open: true
  }
})
