"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  useId,
  useMemo,
  useState,
} from "react";
import type { PhoneCountryOption } from "@/lib/phone-number";

type PhoneCountryPickerProps = {
  countries: readonly PhoneCountryOption[];
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("fr");
}

function formatCountry(country: PhoneCountryOption) {
  return `${country.flag} +${country.callingCode} · ${country.name}`;
}

export default function PhoneCountryPicker({
  countries,
}: PhoneCountryPickerProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("FR");
  const selectedCountry = countries.find(
    (country) => country.code === selectedCountryCode,
  );
  const filteredCountries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return countries;
    }

    const callingCodeQuery = normalizedQuery.replace(/^\+/, "");

    return countries.filter((country) => {
      const normalizedName = normalizeSearch(country.name);

      return (
        normalizedName.includes(normalizedQuery) ||
        country.code.toLocaleLowerCase("fr").startsWith(normalizedQuery) ||
        country.callingCode.startsWith(callingCodeQuery)
      );
    });
  }, [countries, query]);
  const activeCountry = filteredCountries[activeIndex];

  if (!selectedCountry) {
    throw new Error("France is missing from the phone country options.");
  }

  function closePicker() {
    setActiveIndex(0);
    setIsOpen(false);
    setQuery("");
  }

  function openPicker() {
    setActiveIndex(0);
    setIsOpen(true);
    setQuery("");
  }

  function selectCountry(country: PhoneCountryOption) {
    setSelectedCountryCode(country.code);
    closePicker();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      closePicker();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      !isOpen &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key.length === 1
    ) {
      event.preventDefault();
      setActiveIndex(0);
      setIsOpen(true);
      setQuery(event.key);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        Math.min(currentIndex + 1, Math.max(filteredCountries.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (event.key === "Enter" && isOpen && activeCountry) {
      event.preventDefault();
      selectCountry(activeCountry);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key === "Tab") {
      closePicker();
    }
  }

  return (
    <div className="product-phone-country-picker" onBlur={handleBlur}>
      <input
        aria-activedescendant={
          isOpen && activeCountry
            ? `${listboxId}-${activeCountry.code}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Indicatif du pays"
        aria-required="true"
        autoComplete="off"
        onChange={(event) => {
          setActiveIndex(0);
          setIsOpen(true);
          setQuery(event.target.value);
        }}
        onClick={() => {
          if (!isOpen) {
            openPicker();
          }
        }}
        onFocus={() => {
          if (!isOpen) {
            openPicker();
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher un pays"
        role="combobox"
        spellCheck={false}
        type="search"
        value={isOpen ? query : formatCountry(selectedCountry)}
      />
      <input
        autoComplete="tel-country-code"
        name="phoneCountry"
        type="hidden"
        value={selectedCountry.code}
      />

      {isOpen ? (
        <ul
          aria-label="Pays disponibles"
          className="product-phone-country-list"
          id={listboxId}
          role="listbox"
        >
          {filteredCountries.length ? (
            filteredCountries.map((country, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={country.code} role="presentation">
                  <button
                    aria-selected={country.code === selectedCountry.code}
                    className={`product-phone-country-option${
                      isActive ? " product-phone-country-option-active" : ""
                    }`}
                    id={`${listboxId}-${country.code}`}
                    onClick={() => selectCountry(country)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span aria-hidden="true">{country.flag}</span>
                    <span>{country.name}</span>
                    <span>+{country.callingCode}</span>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="product-phone-country-empty" role="presentation">
              Aucun pays trouvé
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
