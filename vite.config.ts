import { defineConfig } from 'vite';

// Get repository name from environment or default
// For GitHub Pages, set GITHUB_PAGES=true and optionally REPO_NAME
const isGitHubPages = process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.REPO_NAME || 'stick-and-shift';

export default defineConfig({
  // Base path for GitHub Pages deployment
  // Change 'stick-and-shift' to your repository name if different
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
