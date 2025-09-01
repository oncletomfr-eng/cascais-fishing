/**
 * Design System Demo Page - Showcasing the new Cascais Fishing Design System
 * Demonstrates Instructure UI patterns integrated with Shadcn/Tailwind
 */

'use client'

import React, { useState } from 'react'
import { 
  useDesignSystem, 
  useThemeSwitcher,
  Button
} from '@/lib/design-system'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default function DesignSystemDemo() {
  const { theme, accessibility } = useDesignSystem()
  const { toggleTheme, isLight } = useThemeSwitcher()
  const [loading, setLoading] = useState(false)

  const handleLoadingTest = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-display-1 text-ocean-blue">
            Cascais Fishing Design System
          </h1>
          <p className="text-body-large text-muted-foreground max-w-2xl mx-auto">
            A comprehensive design system following Instructure UI patterns, 
            integrated with Shadcn components and Tailwind CSS.
          </p>
          
          {/* Theme Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Label htmlFor="theme-toggle">Dark Mode</Label>
            <Switch
              id="theme-toggle"
              checked={!isLight}
              onCheckedChange={toggleTheme}
            />
            <Badge variant={isLight ? "default" : "secondary"}>
              {theme.key} theme
            </Badge>
          </div>
        </div>

        {/* Theme Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">Current Theme Information</CardTitle>
            <CardDescription>Active theme details and accessibility settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-heading-4 mb-2">Theme Details</h4>
                <ul className="space-y-1 text-body-small">
                  <li><strong>Name:</strong> {theme.key}</li>
                  <li><strong>Description:</strong> {theme.description}</li>
                  <li><strong>Primary Font:</strong> {theme.typography.fontFamily.primary}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-heading-4 mb-2">Brand Colors</h4>
                <div className="flex gap-2">
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: theme.colors.brand.oceanBlue }}
                    title="Ocean Blue"
                  />
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: theme.colors.brand.sunsetOrange }}
                    title="Sunset Orange"
                  />
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: theme.colors.brand.seaFoam }}
                    title="Sea Foam"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-heading-4 mb-2">Accessibility</h4>
                <ul className="space-y-1 text-body-small">
                  <li><strong>High Contrast:</strong> {accessibility.highContrast ? 'Yes' : 'No'}</li>
                  <li><strong>Reduced Motion:</strong> {accessibility.reducedMotion ? 'Yes' : 'No'}</li>
                  <li><strong>Focus Visible:</strong> {accessibility.focusVisible ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Scale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">Typography Scale</CardTitle>
            <CardDescription>Responsive typography following 8px grid system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-display-1">Display 1 - Hero Headlines</div>
            <div className="text-display-2">Display 2 - Section Headers</div>
            <div className="text-heading-1">Heading 1 - Main Titles</div>
            <div className="text-heading-2">Heading 2 - Section Titles</div>
            <div className="text-heading-3">Heading 3 - Subsection Titles</div>
            <div className="text-heading-4">Heading 4 - Component Titles</div>
            <div className="text-body-large">Body Large - Prominent content</div>
            <div className="text-body">Body - Regular paragraph text</div>
            <div className="text-body-small">Body Small - Secondary information</div>
            <div className="text-caption">Caption - Metadata and hints</div>
          </CardContent>
        </Card>

        {/* Enhanced Button Components */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">Enhanced Button Components</CardTitle>
            <CardDescription>Buttons following Instructure UI theming patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Button Variants */}
              <div>
                <h4 className="text-heading-4 mb-4">Variants</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="destructive">Destructive Button</Button>
                  </div>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h4 className="text-heading-4 mb-4">Sizes</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Button size="small">Small</Button>
                    <Button size="medium">Medium</Button>
                    <Button size="large">Large</Button>
                  </div>
                </div>
              </div>

              {/* Button States */}
              <div>
                <h4 className="text-heading-4 mb-4">States</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Button disabled>Disabled</Button>
                    <Button loading={loading} onClick={handleLoadingTest}>
                      {loading ? 'Loading...' : 'Test Loading'}
                    </Button>
                  </div>
                  <div>
                    <Button fullWidth>Full Width Button</Button>
                  </div>
                </div>
              </div>

              {/* Button with Icons */}
              <div>
                <h4 className="text-heading-4 mb-4">With Icons</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Button 
                      leftIcon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      }
                    >
                      Left Icon
                    </Button>
                    <Button 
                      rightIcon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                      }
                    >
                      Right Icon
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Components Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">Form Components</CardTitle>
            <CardDescription>Enhanced form components with design system integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    className="focus-ring" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    className="focus-ring"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your full name"
                    className="focus-ring"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="Enter your phone"
                    className="focus-ring"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">Color Palette</CardTitle>
            <CardDescription>Brand colors and semantic color system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Brand Colors */}
              <div>
                <h4 className="text-heading-4 mb-3">Brand Colors</h4>
                <div className="space-y-2">
                  {Object.entries(theme.colors.brand).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-body-small">
                        <div className="font-medium">{name}</div>
                        <div className="text-muted-foreground">{color}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* UI Colors */}
              <div>
                <h4 className="text-heading-4 mb-3">UI Colors</h4>
                <div className="space-y-2">
                  {Object.entries(theme.colors.UI).slice(0, 6).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-body-small">
                        <div className="font-medium">{name.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-muted-foreground">{color}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contrast Colors */}
              <div>
                <h4 className="text-heading-4 mb-3">Contrast Colors</h4>
                <div className="space-y-2">
                  {Object.entries(theme.colors.contrasts).slice(0, 6).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <div className="text-body-small">
                        <div className="font-medium">{name}</div>
                        <div className="text-muted-foreground">{color}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSS Variables Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-2">CSS Variables Integration</CardTitle>
            <CardDescription>Dynamic CSS variables injected by the theme system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-body-small font-medium mb-2">Brand Ocean Blue</div>
                <div 
                  className="h-16 rounded border"
                  style={{ backgroundColor: 'var(--color-brand-oceanBlue)' }}
                />
                <code className="text-caption">var(--color-brand-oceanBlue)</code>
              </div>
              
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-body-small font-medium mb-2">Brand Sunset Orange</div>
                <div 
                  className="h-16 rounded border"
                  style={{ backgroundColor: 'var(--color-brand-sunsetOrange)' }}
                />
                <code className="text-caption">var(--color-brand-sunsetOrange)</code>
              </div>
              
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-body-small font-medium mb-2">Brand Sea Foam</div>
                <div 
                  className="h-16 rounded border"
                  style={{ backgroundColor: 'var(--color-brand-seaFoam)' }}
                />
                <code className="text-caption">var(--color-brand-seaFoam)</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8 border-t">
          <p className="text-body-small text-muted-foreground">
            Cascais Fishing Design System v1.0.0 | Built with Instructure UI patterns + Shadcn + Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  )
}
