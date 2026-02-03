import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TutorialModal } from '../TutorialModal'

describe('TutorialModal', () => {
    it('does not render when isOpen is false', () => {
        render(<TutorialModal isOpen={false} onClose={() => { }} />)
        expect(screen.queryByText('Understanding Your Heart Metrics')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true', () => {
        render(<TutorialModal isOpen={true} onClose={() => { }} />)
        expect(screen.getByText('Understanding Your Heart Metrics')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn()
        render(<TutorialModal isOpen={true} onClose={onClose} />)

        // There are two close buttons (X and "Got it!")
        // Let's find the X button by aria-label
        const closeBtn = screen.getByLabelText('Close tutorial')
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when "Got it!" button is clicked', () => {
        const onClose = vi.fn()
        render(<TutorialModal isOpen={true} onClose={onClose} />)

        const gotItBtn = screen.getByText('Got it!')
        fireEvent.click(gotItBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
