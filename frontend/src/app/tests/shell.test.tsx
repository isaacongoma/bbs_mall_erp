import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/core/auth/authStore'
import { registerModule } from '@/core/modules/registry'
import { createTestRouter } from '../router'

vi.mock('../shell', () => ({ UserMenu: () => <div data-testid="user-menu" /> }))

function Page({ label }: { label: string }) {
  return <div data-testid="page">{label}</div>
}

beforeAll(() => {
  registerModule({
    id: 'shell-test',
    label: 'Shell Test',
    routes: [
      { name: 'Start', path: '/' },
      { name: 'Reports', path: '/reports', component: async () => ({ default: () => <Page label="reports" /> }) },
      { name: 'Secret', path: '/secret', component: async () => ({ default: () => <Page label="secret" /> }) },
      {
        name: 'Detail',
        path: '/items/:itemId',
        component: async () => ({ default: () => <Page label="detail" /> }),
      },
    ],
    navigation: [{ id: 'Reports', label: 'Reports', to: { name: 'Reports' }, section: 'Analytics', sectionOrder: 1 }],
    guards: [
      ({ to }) => {
        if (to.name === 'Start') return { name: 'Reports' }
        if (to.name === 'Secret') return { name: 'Detail', params: { itemId: 7 } }
        return null
      },
    ],
  })
})

beforeEach(() => {
  useAuthStore.setState({ access: null, refresh: null })
})

describe('app shell', () => {
  it('renders the login form when signed out and skips guards', async () => {
    render(<RouterProvider router={createTestRouter(['/secret'])} />)
    expect(await screen.findByText('Sign in to BBS MALL ERP')).toBeInTheDocument()
    expect(screen.queryByTestId('page')).not.toBeInTheDocument()
  })

  it('runs module guards and redirects named routes when signed in', async () => {
    useAuthStore.setState({ access: 'token', refresh: null })
    render(<RouterProvider router={createTestRouter(['/'])} />)
    expect(await screen.findByText('reports')).toBeInTheDocument()
  })

  it('redirects with params and renders the destination inside the layout', async () => {
    useAuthStore.setState({ access: 'token', refresh: null })
    const router = createTestRouter(['/secret'])
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(screen.getByText('detail')).toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/items/7')
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })

  it('lists module navigation under its section in the sidebar', async () => {
    useAuthStore.setState({ access: 'token', refresh: null })
    render(<RouterProvider router={createTestRouter(['/reports'])} />)
    expect(await screen.findByText('Analytics')).toBeInTheDocument()
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0)
  })
})
