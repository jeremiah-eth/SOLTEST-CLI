import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Soltest CLI',
  description: 'A powerful command-line tool for Solidity smart contract development, testing, and deployment',
  
  // Base URL for GitHub Pages
  base: '/SOLTEST-CLI/',
  
  // Theme configuration
  themeConfig: {
    // Logo
    logo: '/logo.svg',
    
    // Navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/README' },
      { text: 'CLI Reference', link: '/CLI_REFERENCE' },
      { text: 'Examples', link: '/EXAMPLES' },
      { text: 'API', link: '/API' },
      { text: 'Plugins', link: '/PLUGINS' },
      { text: 'Troubleshooting', link: '/TROUBLESHOOTING' }
    ],
    
    // Sidebar
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/README' },
          { text: 'Installation', link: '/README#installation' },
          { text: 'Quick Start', link: '/README#quick-start' },
          { text: 'Configuration', link: '/README#configuration' }
        ]
      },
      {
        text: 'CLI Reference',
        items: [
          { text: 'Core Commands', link: '/CLI_REFERENCE#core-commands' },
          { text: 'Development Commands', link: '/CLI_REFERENCE#development-commands' },
          { text: 'Deployment Commands', link: '/CLI_REFERENCE#deployment-commands' },
          { text: 'Testing Commands', link: '/CLI_REFERENCE#testing-commands' },
          { text: 'Verification Commands', link: '/CLI_REFERENCE#verification-commands' },
          { text: 'Plugin Commands', link: '/CLI_REFERENCE#plugin-commands' },
          { text: 'Utility Commands', link: '/CLI_REFERENCE#utility-commands' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Basic ERC20 Token', link: '/EXAMPLES#basic-erc20-token-project' },
          { text: 'NFT Collection', link: '/EXAMPLES#nft-collection-with-metadata' },
          { text: 'Upgradeable Contract', link: '/EXAMPLES#upgradeable-smart-contract' },
          { text: 'Multi-Network Deployment', link: '/EXAMPLES#multi-network-deployment' },
          { text: 'Custom Plugin', link: '/EXAMPLES#custom-plugin-development' },
          { text: 'CI/CD Integration', link: '/EXAMPLES#cicd-integration' },
          { text: 'Advanced Testing', link: '/EXAMPLES#advanced-testing-scenarios' }
        ]
      },
      {
        text: 'API Documentation',
        items: [
          { text: 'Core Modules', link: '/API#core-modules' },
          { text: 'Plugin API', link: '/API#plugin-api' },
          { text: 'Configuration API', link: '/API#configuration-api' },
          { text: 'Network Management', link: '/API#network-management' },
          { text: 'Contract Operations', link: '/API#contract-operations' },
          { text: 'Testing Framework', link: '/API#testing-framework' },
          { text: 'Deployment API', link: '/API#deployment-api' },
          { text: 'Verification API', link: '/API#verification-api' },
          { text: 'Utility Functions', link: '/API#utility-functions' }
        ]
      },
      {
        text: 'Plugin Development',
        items: [
          { text: 'Plugin Architecture', link: '/PLUGINS#plugin-architecture' },
          { text: 'Creating Your First Plugin', link: '/PLUGINS#creating-your-first-plugin' },
          { text: 'Plugin Interface', link: '/PLUGINS#plugin-interface' },
          { text: 'CLI API Reference', link: '/PLUGINS#cli-api-reference' },
          { text: 'Plugin Hooks', link: '/PLUGINS#plugin-hooks' },
          { text: 'Advanced Features', link: '/PLUGINS#advanced-plugin-features' },
          { text: 'Plugin Distribution', link: '/PLUGINS#plugin-distribution' },
          { text: 'Best Practices', link: '/PLUGINS#best-practices' },
          { text: 'Troubleshooting', link: '/PLUGINS#troubleshooting' }
        ]
      },
      {
        text: 'Troubleshooting',
        items: [
          { text: 'Installation Issues', link: '/TROUBLESHOOTING#installation-issues' },
          { text: 'Configuration Problems', link: '/TROUBLESHOOTING#configuration-problems' },
          { text: 'Network Connection Issues', link: '/TROUBLESHOOTING#network-connection-issues' },
          { text: 'Compilation Errors', link: '/TROUBLESHOOTING#compilation-errors' },
          { text: 'Deployment Problems', link: '/TROUBLESHOOTING#deployment-problems' },
          { text: 'Testing Issues', link: '/TROUBLESHOOTING#testing-issues' },
          { text: 'Plugin Problems', link: '/TROUBLESHOOTING#plugin-problems' },
          { text: 'Performance Issues', link: '/TROUBLESHOOTING#performance-issues' },
          { text: 'Error Codes', link: '/TROUBLESHOOTING#error-codes' },
          { text: 'Getting Help', link: '/TROUBLESHOOTING#getting-help' }
        ]
      }
    ],
    
    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jeremiah-eth/SOLTEST-CLI' }
    ],
    
    // Footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Soltest CLI'
    },
    
    // Search
    search: {
      provider: 'local'
    },
    
    // Edit link
    editLink: {
      pattern: 'https://github.com/jeremiah-eth/SOLTEST-CLI/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    // Last updated
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },
    
    // Doc footer
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },
    
    // Outline
    outline: {
      level: [2, 3],
      label: 'On this page'
    },
    
    // Sidebar
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    darkModeSwitchLabel: 'Toggle dark mode',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme'
  },
  
  // Markdown configuration
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },
  
  // Head configuration
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#3eaf7c' }],
    ['meta', { name: 'msapplication-TileColor', content: '#3eaf7c' }]
  ],
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser'
  },
  
  // Ignore dead links
  ignoreDeadLinks: true,
  
  // Development server
  server: {
    port: 5173,
    open: true,
    host: 'localhost'
  },
  
  // Preview server
  preview: {
    port: 4173,
    open: true,
    host: 'localhost'
  }
})
