import { render, screen } from '@testing-library/react'
import { LoginCard } from './LoginCard'
import { vi } from 'vitest'

// Mock useTranslation
vi.mock('@/stores/settingsStore', () => ({
    useTranslation: () => ({
        subtitle: 'Test Subtitle',
        or: 'OR',
        loginDescription: 'Test Description',
        copyright: 'Test Copyright',
        privacy: 'Privacy',
        terms: 'Terms',
        api: 'API',
    }),
}))

// Mock OAuthButtons
vi.mock('./OAuthButtons', () => ({
    OAuthButtons: () => <div data-testid="oauth-buttons">OAuth Buttons</div>,
}))

describe('LoginCard', () => {
    it('renders correctly', () => {
        render(<LoginCard />)
        expect(screen.getByText('Gerege')).toBeDefined()
        expect(screen.getByText('Test Subtitle')).toBeDefined()
        expect(screen.getByTestId('oauth-buttons')).toBeDefined()
    })

    it('displays error message when provided', () => {
        render(<LoginCard error="Invalid credentials" />)
        expect(screen.getByText('Invalid credentials')).toBeDefined()
    })
})
