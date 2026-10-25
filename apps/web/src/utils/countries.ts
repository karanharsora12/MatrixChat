export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
}

export const COUNTRIES: CountryCode[] = [
  { name: 'United States', code: 'US', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44' },
  { name: 'India', code: 'IN', dialCode: '+91' },
  { name: 'Canada', code: 'CA', dialCode: '+1' },
  { name: 'Australia', code: 'AU', dialCode: '+61' },
  { name: 'Germany', code: 'DE', dialCode: '+49' },
  { name: 'France', code: 'FR', dialCode: '+33' },
  { name: 'Japan', code: 'JP', dialCode: '+81' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971' },
  { name: 'Singapore', code: 'SG', dialCode: '+65' },
  { name: 'Brazil', code: 'BR', dialCode: '+55' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31' },
  { name: 'Spain', code: 'ES', dialCode: '+34' },
  { name: 'Italy', code: 'IT', dialCode: '+39' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41' },
];
