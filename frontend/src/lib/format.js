/**
 * Formatting helpers for results.
 */

/**
 * Split a group order (a string of decimal digits, possibly hundreds of them)
 * into what to display:
 *   { text: '3,251,404,800' }                         for moderate orders
 *   { mantissa: '1.85', exponent: 129, exact: '…' }   beyond 24 digits
 */
export function formatOrder(order) {
    const digits = String(order);
    if (!/^\d+$/.test(digits)) return { text: digits };
    if (digits.length <= 24) {
        return { text: digits.replace(/\B(?=(\d{3})+$)/g, ',') };
    }
    return {
        mantissa: `${digits[0]}.${digits.slice(1, 3)}`,
        exponent: digits.length - 1,
        exact: digits,
    };
}
