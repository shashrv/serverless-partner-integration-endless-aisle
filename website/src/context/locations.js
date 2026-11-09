// Countries offered at checkout, with their subdivisions (when we offer a dropdown)
// and a postal-code rule. Add a country here to make it selectable.
const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["PR", "Puerto Rico"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const CA_PROVINCES = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

const GENERIC_POSTAL = { pattern: /^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/, hint: "3-10 letters or digits" };

export const COUNTRIES = [
  { code: "US", name: "United States", regionLabel: "State", regions: US_STATES,
    postal: { pattern: /^\d{5}(-\d{4})?$/, hint: "5 digits, e.g. 98101 or 98101-1234", label: "ZIP code" } },
  { code: "CA", name: "Canada", regionLabel: "Province / territory", regions: CA_PROVINCES,
    postal: { pattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, hint: "e.g. K1A 0B1", label: "Postal code" } },
  { code: "MX", name: "Mexico", regionLabel: "State", postal: { pattern: /^\d{5}$/, hint: "5 digits", label: "Postal code" } },
  { code: "GB", name: "United Kingdom", regionLabel: "County", postal: { pattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, hint: "e.g. SW1A 1AA", label: "Postcode" } },
  { code: "DE", name: "Germany", regionLabel: "State", postal: { pattern: /^\d{5}$/, hint: "5 digits", label: "Postal code" } },
  { code: "FR", name: "France", regionLabel: "Region", postal: { pattern: /^\d{5}$/, hint: "5 digits", label: "Postal code" } },
  { code: "IN", name: "India", regionLabel: "State", postal: { pattern: /^\d{6}$/, hint: "6 digits", label: "PIN code" } },
  { code: "JP", name: "Japan", regionLabel: "Prefecture", postal: { pattern: /^\d{3}-?\d{4}$/, hint: "e.g. 100-0001", label: "Postal code" } },
  { code: "AU", name: "Australia", regionLabel: "State / territory", postal: { pattern: /^\d{4}$/, hint: "4 digits", label: "Postcode" } },
];

export const findCountry = (code) => COUNTRIES.find((c) => c.code === code);
export const postalRule = (code) => findCountry(code)?.postal ?? { ...GENERIC_POSTAL, label: "Postal code" };
