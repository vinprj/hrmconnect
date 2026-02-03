import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FrequencyCard } from '../FrequencyCard'

describe('FrequencyCard', () => {
    it('renders LF and HF values', () => {
        render(<FrequencyCard lf={100} hf={50} />)
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('flips when info button is clicked', () => {
        render(<FrequencyCard lf={100} hf={50} />)
        const infoBtn = screen.getByLabelText('Show more information')
        fireEvent.click(infoBtn)

        const card = screen.getByText(/Frequency Domain/i).closest('.flip-card')
        expect(card).toHaveClass('flipped')
    })
})
