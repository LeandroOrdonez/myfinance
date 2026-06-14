import { formatPrivateAmount, PRIVACY_MASK } from './formatPrivateAmount';

const eurFormatter = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

describe('PRIVACY_MASK', () => {
  it('is the bullet string', () => {
    expect(PRIVACY_MASK).toBe('•••••');
  });
});

describe('formatPrivateAmount', () => {
  describe('when privacyMode is false', () => {
    it('returns the formatter result for a positive amount', () => {
      expect(formatPrivateAmount(1234.56, false, eurFormatter)).toBe(
        eurFormatter(1234.56)
      );
    });

    it('returns the formatter result for a negative amount', () => {
      expect(formatPrivateAmount(-500, false, eurFormatter)).toBe(
        eurFormatter(-500)
      );
    });

    it('returns the formatter result for zero', () => {
      expect(formatPrivateAmount(0, false, eurFormatter)).toBe(eurFormatter(0));
    });

    it('returns the formatter result for a large amount', () => {
      expect(formatPrivateAmount(1_000_000, false, eurFormatter)).toBe(
        eurFormatter(1_000_000)
      );
    });
  });

  describe('when privacyMode is true', () => {
    it('returns PRIVACY_MASK for a positive amount', () => {
      expect(formatPrivateAmount(1234.56, true, eurFormatter)).toBe(PRIVACY_MASK);
    });

    it('returns PRIVACY_MASK for a negative amount', () => {
      expect(formatPrivateAmount(-500, true, eurFormatter)).toBe(PRIVACY_MASK);
    });

    it('returns PRIVACY_MASK for zero', () => {
      expect(formatPrivateAmount(0, true, eurFormatter)).toBe(PRIVACY_MASK);
    });

    it('returns PRIVACY_MASK for a large amount', () => {
      expect(formatPrivateAmount(1_000_000, true, eurFormatter)).toBe(PRIVACY_MASK);
    });

    it('never calls the formatter when privacyMode is true', () => {
      const formatter = jest.fn(() => '€1.00');
      formatPrivateAmount(1, true, formatter);
      expect(formatter).not.toHaveBeenCalled();
    });
  });
});
