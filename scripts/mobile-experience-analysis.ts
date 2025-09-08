#!/usr/bin/env tsx
/**
 * Mobile Experience Analysis Script
 * Task T10.1-T10.4: Mobile testing without viewport simulation
 * 
 * Analyzes mobile-specific code, CSS, and performs automated checks
 */

import fs from 'fs/promises'
import path from 'path'
import { performance } from 'perf_hooks'

interface MobileAnalysisResult {
  category: string
  feature: string
  status: 'found' | 'missing' | 'configured' | 'needs-attention'
  details: string
  file?: string
  recommendations?: string[]
}

class MobileExperienceAnalysis {
  private results: MobileAnalysisResult[] = []
  private projectRoot: string

  constructor() {
    this.projectRoot = process.cwd()
  }

  async analyzeResponsiveCSS(): Promise<void> {
    console.log('🎨 Analyzing Responsive CSS...')
    
    try {
      // Check main CSS files for mobile breakpoints
      const cssFiles = [
        'styles/globals.css',
        'styles/responsive-chat-theme.css', 
        'styles/mobile-notifications.css',
        'tailwind.config.js'
      ]

      for (const file of cssFiles) {
        try {
          const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8')
          
          // Check for mobile breakpoints
          const mobileBreakpoints = [
            /@media.*max-width.*768px/g,
            /@media.*min-width.*640px/g,
            /@media.*screen.*and.*max-width/g,
            /sm:/g, // Tailwind mobile classes
            /md:/g, // Tailwind tablet classes
            /lg:/g  // Tailwind desktop classes
          ]

          let foundBreakpoints = 0
          mobileBreakpoints.forEach(pattern => {
            const matches = content.match(pattern)
            if (matches) foundBreakpoints += matches.length
          })

          this.results.push({
            category: 'T10.1',
            feature: 'Responsive CSS',
            status: foundBreakpoints > 0 ? 'configured' : 'missing',
            details: `Found ${foundBreakpoints} responsive breakpoints in ${file}`,
            file,
            recommendations: foundBreakpoints === 0 ? [
              'Add mobile-first breakpoints',
              'Implement @media queries for <768px',
              'Use Tailwind responsive classes (sm:, md:, lg:)'
            ] : []
          })

          // Check for touch-specific CSS
          const touchFeatures = [
            /touch-action/g,
            /user-select/g,
            /-webkit-tap-highlight-color/g,
            /touch-callout/g
          ]

          let touchOptimizations = 0
          touchFeatures.forEach(pattern => {
            if (content.match(pattern)) touchOptimizations++
          })

          if (touchOptimizations > 0) {
            this.results.push({
              category: 'T10.1',
              feature: 'Touch Optimizations',
              status: 'configured',
              details: `Found ${touchOptimizations} touch-specific CSS properties in ${file}`,
              file
            })
          }

        } catch (error) {
          // File not found or inaccessible - not necessarily an error
        }
      }

    } catch (error) {
      this.results.push({
        category: 'T10.1',
        feature: 'Responsive CSS Analysis',
        status: 'needs-attention',
        details: `Error analyzing CSS: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  async analyzeMobileComponents(): Promise<void> {
    console.log('📱 Analyzing Mobile Components...')
    
    try {
      // Check for mobile-specific components
      const componentDirs = [
        'components/notifications',
        'components/chat/theming',
        'hooks'
      ]

      const mobileComponents = [
        'MobileNotificationSystem',
        'ResponsiveChatLayout',
        'useMobileNotifications',
        'use-mobile'
      ]

      for (const dir of componentDirs) {
        try {
          const dirPath = path.join(this.projectRoot, dir)
          const files = await fs.readdir(dirPath)
          
          for (const file of files) {
            const content = await fs.readFile(path.join(dirPath, file), 'utf-8')
            
            // Check for mobile-specific patterns
            const mobilePatterns = [
              /useMediaQuery/g,
              /window\.innerWidth/g,
              /matchMedia/g,
              /mobile|Mobile/g,
              /responsive|Responsive/g,
              /touch|Touch/g
            ]

            let mobileFeatures = 0
            mobilePatterns.forEach(pattern => {
              const matches = content.match(pattern)
              if (matches) mobileFeatures += matches.length
            })

            if (mobileFeatures > 0) {
              this.results.push({
                category: 'T10.1',
                feature: 'Mobile Component',
                status: 'configured',
                details: `${file} contains ${mobileFeatures} mobile-specific features`,
                file: `${dir}/${file}`
              })
            }
          }
        } catch (error) {
          // Directory not found - skip silently
        }
      }

      // Check for specific mobile components by name
      for (const componentName of mobileComponents) {
        const found = this.results.some(r => 
          r.file?.includes(componentName) || r.details.includes(componentName)
        )
        
        if (found) {
          this.results.push({
            category: 'T10.1',
            feature: 'Essential Mobile Component',
            status: 'configured',
            details: `${componentName} component found and configured`,
            recommendations: ['Test component on multiple screen sizes']
          })
        } else {
          this.results.push({
            category: 'T10.2',
            feature: 'Missing Mobile Component',
            status: 'missing',
            details: `${componentName} component not found`,
            recommendations: [
              'Consider implementing mobile-specific version',
              'Add responsive behavior to existing component'
            ]
          })
        }
      }

    } catch (error) {
      this.results.push({
        category: 'T10.1',
        feature: 'Mobile Components Analysis',
        status: 'needs-attention',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  async analyzeAccessibilityFeatures(): Promise<void> {
    console.log('♿ Analyzing Accessibility Features...')
    
    try {
      // Check for accessibility patterns in components
      const accessibilityPatterns = [
        { pattern: /aria-label/g, feature: 'ARIA Labels' },
        { pattern: /aria-describedby/g, feature: 'ARIA Descriptions' },
        { pattern: /role=/g, feature: 'ARIA Roles' },
        { pattern: /tabIndex/g, feature: 'Tab Navigation' },
        { pattern: /focus|Focus/g, feature: 'Focus Management' },
        { pattern: /alt=/g, feature: 'Image Alt Text' },
        { pattern: /sr-only|screen-reader/g, feature: 'Screen Reader Support' }
      ]

      const componentFiles = await this.getAllComponentFiles()
      
      for (const file of componentFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8')
          
          for (const { pattern, feature } of accessibilityPatterns) {
            const matches = content.match(pattern)
            if (matches && matches.length > 0) {
              this.results.push({
                category: 'T10.3',
                feature: `${feature}`,
                status: 'configured',
                details: `Found ${matches.length} instances in ${path.relative(this.projectRoot, file)}`,
                file: path.relative(this.projectRoot, file)
              })
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Check for accessibility testing tools
      const packageJsonPath = path.join(this.projectRoot, 'package.json')
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      
      const a11yTools = [
        '@axe-core/react',
        'jest-axe', 
        '@testing-library/jest-dom',
        'eslint-plugin-jsx-a11y'
      ]

      for (const tool of a11yTools) {
        const found = packageJson.dependencies?.[tool] || packageJson.devDependencies?.[tool]
        this.results.push({
          category: 'T10.3',
          feature: 'A11y Testing Tool',
          status: found ? 'configured' : 'missing',
          details: found ? `${tool} v${found} installed` : `${tool} not found`,
          recommendations: !found ? [
            `Install ${tool}`,
            'Add accessibility testing to CI/CD pipeline'
          ] : []
        })
      }

    } catch (error) {
      this.results.push({
        category: 'T10.3',
        feature: 'Accessibility Analysis',
        status: 'needs-attention',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  async analyzePerformanceOptimization(): Promise<void> {
    console.log('⚡ Analyzing Performance Optimizations...')
    
    try {
      // Check Next.js config for performance optimizations
      const nextConfigPath = path.join(this.projectRoot, 'next.config.mjs')
      const nextConfigContent = await fs.readFile(nextConfigPath, 'utf-8')
      
      const performanceFeatures = [
        { pattern: /compress/g, feature: 'Compression' },
        { pattern: /images.*optimization/g, feature: 'Image Optimization' },
        { pattern: /experimental/g, feature: 'Experimental Features' },
        { pattern: /bundle.*analyzer/g, feature: 'Bundle Analysis' },
        { pattern: /splitChunks/g, feature: 'Code Splitting' }
      ]

      for (const { pattern, feature } of performanceFeatures) {
        const found = nextConfigContent.match(pattern)
        this.results.push({
          category: 'T10.4',
          feature: `Next.js ${feature}`,
          status: found ? 'configured' : 'missing',
          details: found ? `${feature} configured in next.config.mjs` : `${feature} not configured`,
          file: 'next.config.mjs'
        })
      }

      // Check for performance monitoring
      const performanceFiles = [
        'lib/performance/metrics.ts',
        'lib/performance/monitoring.ts',
        'components/performance'
      ]

      for (const file of performanceFiles) {
        try {
          await fs.access(path.join(this.projectRoot, file))
          this.results.push({
            category: 'T10.4',
            feature: 'Performance Monitoring',
            status: 'configured',
            details: `Performance monitoring implemented in ${file}`,
            file
          })
        } catch {
          // File doesn't exist - not necessarily an error
        }
      }

      // Check for lazy loading patterns
      const componentFiles = await this.getAllComponentFiles()
      let lazyLoadingFound = 0

      for (const file of componentFiles.slice(0, 20)) { // Limit to avoid too many checks
        try {
          const content = await fs.readFile(file, 'utf-8')
          const lazyPatterns = [
            /React\.lazy/g,
            /dynamic.*import/g,
            /loading.*lazy/g,
            /Suspense/g
          ]

          for (const pattern of lazyPatterns) {
            if (content.match(pattern)) {
              lazyLoadingFound++
              break
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      this.results.push({
        category: 'T10.4',
        feature: 'Code Splitting & Lazy Loading',
        status: lazyLoadingFound > 0 ? 'configured' : 'missing',
        details: `Found lazy loading in ${lazyLoadingFound} components`,
        recommendations: lazyLoadingFound === 0 ? [
          'Implement React.lazy() for large components',
          'Add dynamic imports for heavy dependencies',
          'Use Next.js dynamic imports'
        ] : []
      })

    } catch (error) {
      this.results.push({
        category: 'T10.4',
        feature: 'Performance Analysis',
        status: 'needs-attention',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  async getAllComponentFiles(): Promise<string[]> {
    const files: string[] = []
    
    const searchDirs = ['components', 'app', 'hooks', 'lib']
    
    for (const dir of searchDirs) {
      try {
        await this.walkDirectory(path.join(this.projectRoot, dir), files)
      } catch {
        // Directory doesn't exist - skip
      }
    }
    
    return files.filter(file => 
      file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')
    )
  }

  async walkDirectory(dir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.walkDirectory(fullPath, files)
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
  }

  printResults(): void {
    console.log('\n📊 Mobile Experience Analysis Results')
    console.log('=====================================\n')

    const categories = {
      'T10.1': 'Mobile Chat UI & Responsive Design',
      'T10.2': 'Mobile Notifications', 
      'T10.3': 'Accessibility Compliance',
      'T10.4': 'Performance Optimization'
    }

    for (const [taskId, categoryName] of Object.entries(categories)) {
      const categoryResults = this.results.filter(r => r.category === taskId)
      
      if (categoryResults.length === 0) continue

      console.log(`🎯 ${taskId}: ${categoryName}`)
      console.log('-'.repeat(50))
      
      const configured = categoryResults.filter(r => r.status === 'configured').length
      const missing = categoryResults.filter(r => r.status === 'missing').length
      const needsAttention = categoryResults.filter(r => r.status === 'needs-attention').length
      
      console.log(`✅ Configured: ${configured}`)
      console.log(`❌ Missing: ${missing}`)
      console.log(`⚠️  Needs Attention: ${needsAttention}`)
      
      const successRate = categoryResults.length > 0 ? (configured / categoryResults.length) * 100 : 0
      console.log(`📈 Success Rate: ${Math.round(successRate)}%\n`)
      
      // Show detailed results
      categoryResults.forEach(result => {
        const icon = {
          'configured': '✅',
          'found': '✅',
          'missing': '❌',
          'needs-attention': '⚠️'
        }[result.status] || '❓'
        
        console.log(`${icon} ${result.feature}: ${result.details}`)
        if (result.file) console.log(`   📁 File: ${result.file}`)
        
        if (result.recommendations && result.recommendations.length > 0) {
          console.log(`   💡 Recommendations:`)
          result.recommendations.forEach(rec => console.log(`      • ${rec}`))
        }
        console.log()
      })
    }

    // Overall summary
    const totalResults = this.results.length
    const totalConfigured = this.results.filter(r => r.status === 'configured' || r.status === 'found').length
    const overallSuccess = totalResults > 0 ? (totalConfigured / totalResults) * 100 : 0

    console.log('\n🏆 OVERALL MOBILE EXPERIENCE ASSESSMENT')
    console.log('======================================')
    console.log(`📱 Total Features Analyzed: ${totalResults}`)
    console.log(`✅ Features Configured: ${totalConfigured}`)
    console.log(`📊 Overall Success Rate: ${Math.round(overallSuccess)}%`)
    
    const mobileReady = overallSuccess >= 70
    console.log(`🎯 Mobile Ready: ${mobileReady ? '✅ YES' : '❌ NEEDS IMPROVEMENT'}`)
    
    if (!mobileReady) {
      console.log('\n⚠️  Priority Improvements:')
      const missingFeatures = this.results.filter(r => r.status === 'missing' || r.status === 'needs-attention')
      missingFeatures.slice(0, 5).forEach(feature => {
        console.log(`   • ${feature.feature}: ${feature.details}`)
      })
    }
  }

  async runFullAnalysis(): Promise<void> {
    console.log('🎯 Mobile Experience Analysis Suite')
    console.log('===================================')
    console.log(`Project: ${this.projectRoot}`)
    console.log(`Analysis Time: ${new Date().toISOString()}\n`)

    const startTime = performance.now()

    try {
      await this.analyzeResponsiveCSS()
      await this.analyzeMobileComponents()
      await this.analyzeAccessibilityFeatures()  
      await this.analyzePerformanceOptimization()
      
      const endTime = performance.now()
      console.log(`\n⏱️  Analysis completed in ${Math.round(endTime - startTime)}ms`)
      
      this.printResults()

    } catch (error) {
      console.error('❌ Analysis failed:', error)
      process.exit(1)
    }
  }
}

// Run the analysis
async function main() {
  const analyzer = new MobileExperienceAnalysis()
  await analyzer.runFullAnalysis()
}

if (require.main === module) {
  main().catch(console.error)
}

export default MobileExperienceAnalysis
