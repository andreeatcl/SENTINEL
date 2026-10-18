import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import CountryPicker from "../CountryPicker";
import { Input, Eyebrow } from "../ui/Field";
import { Pill } from "../ui/FilterAccordion";
import { CloseIcon, PlusIcon } from "../ui/icons";
import { useKeywordOverrides } from "../../hooks/useKeywordOverrides";
import {
  MAX_COUNTRY_KEYWORDS,
  getCountryKeywordOptions,
  getDefaultCountryKeywords,
  getCustomizedCountries,
  hasCustomKeywords,
  normalizeCountryKey as keyOf,
  saveCountryKeywords,
} from "../../utils/queryBuilder";

const GDELT_KEYWORD_COUNT = 12;
const MAX_KEYWORD_LENGTH = 40;

function sameList(a, b) {
  return a.length === b.length && a.every((k, i) => keyOf(k) === keyOf(b[i]));
}

function KeywordChip({ keyword, custom, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full border text-xs ${
        custom
          ? "border-signal-green/50 bg-signal-green/10 text-signal-green"
          : "border-carbon-700 bg-carbon-850 text-carbon-200"
      }`}
    >
      <span className="max-w-[14rem] truncate">{keyword}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${keyword}`}
        className="w-6 h-6 inline-flex items-center justify-center rounded-full text-carbon-400 hover:bg-carbon-700 hover:text-white transition-colors"
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </span>
  );
}

export default function KeywordsModal({ isOpen, initialCountry, onClose }) {
  const [country, setCountry] = useState(null);
  const [draft, setDraft] = useState([]);
  const [input, setInput] = useState("");
  const [hint, setHint] = useState("");
  const overrides = useKeywordOverrides();

  const saved = useMemo(
    () => (country ? getCountryKeywordOptions(country) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [country, overrides],
  );
  const defaults = useMemo(
    () => (country ? getDefaultCountryKeywords(country) : []),
    [country],
  );
  const defaultKeys = useMemo(() => new Set(defaults.map(keyOf)), [defaults]);
  const customized = useMemo(
    () => getCustomizedCountries().sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overrides],
  );

  useEffect(() => {
    if (!isOpen || !initialCountry) return;
    setCountry(initialCountry);
    setDraft(getCountryKeywordOptions(initialCountry));
  }, [isOpen, initialCountry]);

  const dirty = !sameList(draft, saved);
  const isDefault = sameList(draft, defaults);
  const atLimit = draft.length >= MAX_COUNTRY_KEYWORDS;

  function confirmDiscard() {
    return !dirty || window.confirm("Discard your unsaved keyword changes?");
  }

  function selectCountry(name) {
    if (name === country || !confirmDiscard()) return;
    setCountry(name);
    setDraft(getCountryKeywordOptions(name));
    setInput("");
    setHint("");
  }

  function handleClose() {
    if (!confirmDiscard()) return;
    setCountry(null);
    setDraft([]);
    setInput("");
    setHint("");
    onClose();
  }

  function addKeyword(e) {
    e.preventDefault();
    const keyword = input.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (!keyword) return;
    if (!keyOf(keyword)) {
      setHint("Keywords need at least one Latin letter or number.");
      return;
    }
    if (draft.some((k) => keyOf(k) === keyOf(keyword))) {
      setHint(`“${keyword}” is already in the list.`);
      return;
    }
    setDraft((d) => [...d, keyword]);
    setInput("");
    setHint("");
  }

  function save() {
    saveCountryKeywords(country, draft);
    setDraft(getCountryKeywordOptions(country));
    setHint("");
  }

  const footer = country && (
    <>
      {!isDefault && (
        <Button
          variant="ghost"
          className="mr-auto"
          onClick={() => setDraft(defaults)}
          title="Restores the original list. Save to apply."
        >
          Reset to defaults
        </Button>
      )}
      {dirty && (
        <Button variant="ghost" onClick={() => setDraft(saved)}>
          Discard
        </Button>
      )}
      <Button variant="primary" onClick={save} disabled={!dirty}>
        {dirty ? "Save" : "Saved"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Country keywords"
      subtitle={
        <CountryPicker
          value={country}
          onSelect={selectCountry}
          placement="down"
          className="h-8 w-64 max-w-full"
        />
      }
      footer={footer}
    >
      {!country ? (
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-carbon-400 leading-relaxed">
            Pick a country to see the keywords its searches use. Your edits are
            saved on this device and apply everywhere in the app.
          </p>
          {customized.length > 0 && (
            <div>
              <Eyebrow className="mb-2">Customized</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {customized.map((name) => (
                  <Pill key={name} onClick={() => selectCountry(name)}>
                    {name}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>
              Keywords
              {hasCustomKeywords(country) && (
                <span className="normal-case tracking-normal text-carbon-400">
                  {" "}
                  · customized
                </span>
              )}
            </Eyebrow>
            <span
              className={`text-2xs font-mono ${atLimit ? "text-signal-amber" : "text-carbon-500"}`}
            >
              {draft.length} / {MAX_COUNTRY_KEYWORDS}
            </span>
          </div>

          {draft.length === 0 ? (
            <div className="text-sm text-carbon-500 border border-dashed border-carbon-700 rounded-lg px-3 py-3">
              No keywords. Searches for {country} will use the country name
              only.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {draft.map((keyword) => (
                <KeywordChip
                  key={keyOf(keyword)}
                  keyword={keyword}
                  custom={!defaultKeys.has(keyOf(keyword))}
                  onRemove={() =>
                    setDraft((d) => d.filter((k) => k !== keyword))
                  }
                />
              ))}
            </div>
          )}

          <form onSubmit={addKeyword} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHint("");
              }}
              maxLength={MAX_KEYWORD_LENGTH}
              disabled={atLimit}
              placeholder={atLimit ? "Keyword limit reached" : "Add a keyword…"}
              aria-label="New keyword"
              className="flex-1 max-sm:!text-base"
            />
            <Button type="submit" disabled={atLimit || !input.trim()}>
              <PlusIcon className="w-3.5 h-3.5" />
              Add
            </Button>
          </form>
        </div>
      )}
    </Modal>
  );
}
