import { render, screen, fireEvent } from '@testing-library/react';
import { RespirationCard } from '../RespirationCard';
import { describe, it, expect } from 'vitest';

describe('RespirationCard', () => {
    it('renders with initial rate', () => {
        render(<RespirationCard rate={15} />);
        expect(screen.getByText('Respiration')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('Br/Min')).toBeInTheDocument();
        expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('renders placeholder when rate is 0', () => {
        render(<RespirationCard rate={0} />);
        expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('displays correct status for different rates', () => {
        const { rerender } = render(<RespirationCard rate={10} />);
        expect(screen.getByText('Slow / Relaxed')).toBeInTheDocument();

        rerender(<RespirationCard rate={25} />);
        expect(screen.getByText('Fast / Active')).toBeInTheDocument();
    });

    it('flips when info button is clicked', () => {
        render(<RespirationCard rate={15} />);
        const infoBtn = screen.getByLabelText('Show more information');

        fireEvent.click(infoBtn);
        expect(screen.getByText('Respiration Rate')).toBeInTheDocument();
        expect(screen.getByText(/Estimated from Heart Rate Variability/i)).toBeInTheDocument();
    });
});
