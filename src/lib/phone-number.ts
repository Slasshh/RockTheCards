import parsePhoneNumber, {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  type CountryCode,
} from "libphonenumber-js";

export type PhoneCountryOption = {
  callingCode: string;
  code: CountryCode;
  flag: string;
  name: string;
};

export type NormalizedPhoneNumber = {
  country: CountryCode;
  countryCallingCode: string;
  formattedInternational: string;
  number: string;
};

const countryNames = new Intl.DisplayNames(["fr"], { type: "region" });
const countryNameCollator = new Intl.Collator("fr");

export function getCountryFlag(countryCode: CountryCode) {
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

function getCountryName(countryCode: CountryCode) {
  return countryNames.of(countryCode) ?? countryCode;
}

export const PHONE_COUNTRY_OPTIONS: readonly PhoneCountryOption[] =
  getCountries()
    .map((code) => ({
      callingCode: getCountryCallingCode(code),
      code,
      flag: getCountryFlag(code),
      name: getCountryName(code),
    }))
    .sort((left, right) => {
      if (left.code === right.code) {
        return 0;
      }

      if (left.code === "FR") {
        return -1;
      }

      if (right.code === "FR") {
        return 1;
      }

      return countryNameCollator.compare(left.name, right.name);
    });

function normalizeParsedPhoneNumber(
  parsedPhoneNumber: ReturnType<typeof parsePhoneNumber>,
): NormalizedPhoneNumber | null {
  if (!parsedPhoneNumber?.country || !parsedPhoneNumber.isValid()) {
    return null;
  }

  return {
    country: parsedPhoneNumber.country,
    countryCallingCode: parsedPhoneNumber.countryCallingCode,
    formattedInternational: parsedPhoneNumber.formatInternational(),
    number: String(parsedPhoneNumber.number),
  };
}

export function parseCustomerPhoneNumber(
  value: string,
  countryCode: string,
) {
  const trimmedValue = value.trim();

  if (!trimmedValue || !isSupportedCountry(countryCode)) {
    return null;
  }

  return normalizeParsedPhoneNumber(
    parsePhoneNumber(trimmedValue, {
      defaultCountry: countryCode,
      extract: false,
    }),
  );
}

export function parseInternationalPhoneNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return normalizeParsedPhoneNumber(
    parsePhoneNumber(trimmedValue, { extract: false }),
  );
}

export function formatPhoneNumberForDiscord(value: string) {
  const phoneNumber = parseInternationalPhoneNumber(value);

  if (!phoneNumber) {
    return "Numéro invalide";
  }

  return `${getCountryFlag(phoneNumber.country)} ${getCountryName(
    phoneNumber.country,
  )} · +${phoneNumber.countryCallingCode}\n${phoneNumber.formattedInternational}`;
}
