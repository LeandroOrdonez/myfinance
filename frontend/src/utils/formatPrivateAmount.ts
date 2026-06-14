export const PRIVACY_MASK = '•••••';

export function formatPrivateAmount(
  amount: number,
  privacyMode: boolean,
  formatter: (n: number) => string
): string {
  return privacyMode ? PRIVACY_MASK : formatter(amount);
}
