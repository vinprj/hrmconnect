import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
    it('renders label and value correctly', () => {
        render(<StatCard label="Heart Rate" value={75} unit="BPM" />)
        // Label appears on front and back
        expect(screen.getAllByText(/Heart Rate/i)[0]).toBeInTheDocument()
        expect(screen.getByText('75')).toBeInTheDocument()
        expect(screen.getByText(/BPM/i)).toBeInTheDocument()
    })

    it('flips to show description when info button is clicked', () => {
        const description = "Test Description"
        render(<StatCard label="Test" value={100} description={description} />)

        expect(screen.getByText(new RegExp(description, 'i'))).toBeInTheDocument()

        const infoBtn = screen.getByLabelText('Show more information')
        fireEvent.click(infoBtn)

        // Check if the card has the 'flipped' class
        const card = screen.getAllByText(/Test/i)[0].closest('.flip-card')
        expect(card).toHaveClass('flipped')
    })

    it('flips back when close button is clicked', () => {
        render(<StatCard label="Test" value={100} />)

        const infoBtn = screen.getByLabelText('Show more information')
        fireEvent.click(infoBtn)

        const closeBtn = screen.getByLabelText('Close information')
        fireEvent.click(closeBtn)

        const card = screen.getAllByText(/Test/i)[0].closest('.flip-card')
        expect(card).not.toHaveClass('flipped')
    })
})
