'use client'

import { useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Note: react-hot-toast not installed, using placeholder
// import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/theme-provider'

// Layout components
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'

// Page components
import { Dashboard } from '@/components/dashboard/dashboard'
import { FlowWorkspace } from '@/components/forms/FlowWorkspace'
import { TestResults } from '@/components/results/TestResults'
import { ChatInterface } from '@/components/testing/ChatInterface'

// UI components
import { ErrorBoundary as UIErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Hooks and utilities
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// Types
import {
  FlowiseFlow,
  TestResult,
  ConversionResult,
  AppState,
  NavigationItem,
} from '@/types'

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

// Navigation items
const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'BarChart3' },
  { id: 'flows', label: 'Flows', icon: 'GitBranch' },
  { id: 'workspace', label: 'Workspace', icon: 'Code' },
  { id: 'testing', label: 'Testing', icon: 'TestTube' },
  { id: 'results', label: 'Results', icon: 'FileCheck' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
]

// Error fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="mb-2 text-lg font-semibold text-red-600">
              Something went wrong
            </h2>
            <p className="mb-4 text-gray-600">{error.message}</p>
            <Button onClick={resetErrorBoundary} variant="outline">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main App Component
export function App() {
  const [appState, setAppState] = useLocalStorage<AppState>(
    'flowise-converter-app-state',
    {
      currentPage: 'dashboard',
      sidebarOpen: true,
      theme: 'system',
      lastActivity: new Date().toISOString(),
      preferences: {
        autoSave: true,
        showNotifications: true,
        darkMode: false,
      },
    }
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<
    'healthy' | 'warning' | 'error'
  >('healthy')

  // Initialize app and check health
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check system health
        const health = await api.health.check()
        // Map health status to local state
        const mappedStatus =
          health.status === 'healthy'
            ? 'healthy'
            : health.status === 'degraded'
              ? 'warning'
              : 'error'
        setHealthStatus(mappedStatus)

        // Update last activity
        setAppState((prev) => ({
          ...prev,
          lastActivity: new Date().toISOString(),
        }))

        setLoading(false)
      } catch (err) {
        // Don't show error for backend not being available - it's normal in dev
        console.warn('Backend health check failed (this is normal if backend is starting):', err)
        setHealthStatus('warning')
        setError(null) // Don't show error to user
        setLoading(false)
      }
    }

    initializeApp()
  }, [setAppState])

  // Handle page navigation
  const handlePageChange = (page: string) => {
    setAppState((prev) => ({
      ...prev,
      currentPage: page,
      lastActivity: new Date().toISOString(),
    }))
  }

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setAppState((prev) => ({
      ...prev,
      sidebarOpen: !prev.sidebarOpen,
    }))
  }

  // Render current page
  const renderCurrentPage = () => {
    switch (appState.currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'flows':
      case 'workspace':
        return <FlowWorkspace />
      case 'testing':
        return (
          <ChatInterface
            flow={{
              id: 'default',
              name: 'Default Flow',
              description: 'Default flow for testing',
              nodes: [],
              edges: [],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
          />
        )
      case 'results':
        return <TestResults testResults={[]} />
      case 'settings':
        return <div className="p-6">Settings page (TODO)</div>
      default:
        return <Dashboard />
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8">
          <CardContent className="flex items-center gap-4">
            <LoadingSpinner size="lg" />
            <div>
              <h2 className="text-lg font-semibold">Initializing Flowise Converter</h2>
              <p className="text-gray-600">Loading application...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 w-full"
            >
              Reload Application
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            {/* App Header */}
            <AppHeader
              onSidebarToggle={handleSidebarToggle}
              healthStatus={healthStatus}
              currentPage={appState.currentPage}
            />

            <div className="flex">
              {/* Sidebar */}
              <AppSidebar
                isOpen={appState.sidebarOpen}
                currentPage={appState.currentPage}
                navigationItems={navigationItems}
                onPageChange={handlePageChange}
              />

              {/* Main Content */}
              <main
                className={cn(
                  'flex-1 transition-all duration-300',
                  appState.sidebarOpen ? 'ml-64' : 'ml-0'
                )}
              >
                <UIErrorBoundary>
                  <div className="min-h-screen">{renderCurrentPage()}</div>
                </UIErrorBoundary>
              </main>
            </div>

            {/* Footer */}
            <AppFooter />

            {/* Toast notifications - TODO: Install react-hot-toast */}
            {/* <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            /> */}
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
