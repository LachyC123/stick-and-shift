import { defineConfig } from 'vite';

// GitHub Pages deployment configuration
// GITHUB_PAGES env var is set by the deploy workflow
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// Repository name for GitHub Pages base path
// Change this if your repo has a different name
const repoName = 'stick-and-shift';

export default defineConfig({
  // Base path: 
  // - Production on GitHub Pages: /repo-name/
  // - Local development: /
  base: isGitHubPages ? `/${repoName}/` : '/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  
  server: {
    port: 3000,
    open: true
  },
  
  preview: {
    port: 4173,
    open: true
  }
});
