import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StressGauge } from '../StressGauge'

describe('StressGauge', () => {
    it('renders stress value and correct status for Normal zone', () => {
        render(<StressGauge value={100} />)
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('Normal')).toBeInTheDocument()
    })

    it('renders correct status for Recovery zone', () => {
        render(<StressGauge value={30} />)
        expect(screen.getByText('30')).toBeInTheDocument()
        expect(screen.getByText('Recovery')).toBeInTheDocument()
    })

    it('renders correct status for Elevated zone', () => {
        render(<StressGauge value={200} />)
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('Elevated')).toBeInTheDocument()
    })

    it('renders correct status for High Stress zone', () => {
        render(<StressGauge value={400} />)
        expect(screen.getByText('400')).toBeInTheDocument()
        expect(screen.getByText('High Stress')).toBeInTheDocument()
    })

    it('flips when info button is clicked', () => {
        render(<StressGauge value={100} />)
        const infoBtn = screen.getByLabelText('Show more information')
        fireEvent.click(infoBtn)

        // "Stress Index" appears on both front and back
        const card = screen.getAllByText(/Stress Index/i)[0].closest('.flip-card')
        expect(card).toHaveClass('flipped')
    })
})
