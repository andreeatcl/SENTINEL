import { useEffect, useMemo, useState } from "react";
import { buildTopicQuery, quoteKeyword } from "../../utils/queryBuilder";
import KeywordGrid from "./KeywordGrid";
import KeywordOperatorControls from "./KeywordOperatorControls";
import CustomTermInput from "./CustomTermInput";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Eyebrow } from "../ui/Field";

export default function KeywordQueryModal({
  isOpen,
  countryName,
  availableKeywords,
  initialState,
  onApply,
  onClose,
}) {
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState("OR");
  const [customTerms, setCustomTerms] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [customOperator, setCustomOperator] = useState("OR");
  const [combineOperator, setCombineOperator] = useState("OR");
  const [includeCountryInQuery, setIncludeCountryInQuery] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const state = initialState || {};
    const available = new Set(availableKeywords || []);
    const selected = state.selectedKeywords || [];
    setSelectedKeywords(selected.filter((k) => available.has(k)));
    setCustomTerms([
      ...selected.filter((k) => !available.has(k)),
      ...(state.customTerms || []),
    ]);
    setCustomInput("");
    setSelectedOperator(state.selectedOperator || "OR");
    setCustomOperator(state.customOperator || "OR");
    setCombineOperator(state.combineOperator || "OR");
    setIncludeCountryInQuery(state.includeCountry !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sortedKeywords = useMemo(
    () => [...(availableKeywords || [])].sort((a, b) => a.localeCompare(b)),
    [availableKeywords],
  );

  function toggleKeyword(keyword) {
    setSelectedKeywords((current) =>
      current.includes(keyword)
        ? current.filter((item) => item !== keyword)
        : [...current, keyword],
    );
  }

  function addCustomTerm() {
    const next = customInput.trim();
    // SINGLE words only
    if (!next || /\s/.test(next)) {
      return;
    }

    const existsInCountry = selectedKeywords.some(
      (item) => item.toLowerCase() === next.toLowerCase(),
    );
    const existsInCustom = customTerms.some(
      (item) => item.toLowerCase() === next.toLowerCase(),
    );

    if (!existsInCountry && !existsInCustom) {
      setCustomTerms((current) => [...current, next]);
    }

    setCustomInput("");
  }

  function removeCustomTerm(term) {
    setCustomTerms((current) => current.filter((item) => item !== term));
  }

  function selectAllKeywords() {
    setSelectedKeywords(sortedKeywords);
  }

  function deselectAllKeywords() {
    setSelectedKeywords([]);
  }

  // merging independent keyword groups using OR/AND operators
  const expression = useMemo(() => {
    const selectedExpr = selectedKeywords
      .map((keyword) => quoteKeyword(keyword))
      .join(` ${selectedOperator} `);
    const customExpr = customTerms
      .map((keyword) => quoteKeyword(keyword))
      .join(` ${customOperator} `);
    if (selectedExpr && customExpr) {
      return `(${selectedExpr}) ${combineOperator} (${customExpr})`;
    }
    return selectedExpr || customExpr;
  }, [
    selectedKeywords,
    customTerms,
    selectedOperator,
    customOperator,
    combineOperator,
  ]);

  const canApply = includeCountryInQuery || !!expression;
  const previewQuery = canApply
    ? buildTopicQuery(countryName || "", expression, true, {
        includeCountry: includeCountryInQuery,
        overrideCountryKeywords: true,
      })
    : "";

  function handleApply() {
    if (!canApply) return;

    onApply({
      expression,
      queryOptions: {
        includeCountry: includeCountryInQuery,
        overrideCountryKeywords: true,
        gdeltTerms: [...selectedKeywords, ...customTerms],
        builder: {
          selectedKeywords,
          customTerms,
          selectedOperator,
          customOperator,
          combineOperator,
          includeCountry: includeCountryInQuery,
        },
      },
    });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="lg"
      zIndex="z-[2100]"
      title="Keyword query builder"
      subtitle={`${countryName} · pick keywords and combine them with boolean logic`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply} disabled={!canApply}>
            Apply query
          </Button>
        </>
      }
    >
      <KeywordOperatorControls
        includeCountryInQuery={includeCountryInQuery}
        onToggleIncludeCountry={() =>
          setIncludeCountryInQuery((current) => !current)
        }
        selectedOperator={selectedOperator}
        onSelectedOperatorChange={setSelectedOperator}
        customOperator={customOperator}
        onCustomOperatorChange={setCustomOperator}
        combineOperator={combineOperator}
        onCombineOperatorChange={setCombineOperator}
      />

      <div className="p-5 space-y-6">
        <KeywordGrid
          keywords={sortedKeywords}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={toggleKeyword}
          onSelectAll={selectAllKeywords}
          onDeselectAll={deselectAllKeywords}
        />

        <CustomTermInput
          customInput={customInput}
          onCustomInputChange={setCustomInput}
          onAddTerm={addCustomTerm}
          customTerms={customTerms}
          onRemoveTerm={removeCustomTerm}
        />
      </div>

      <div className="sticky bottom-0 px-5 py-3 border-t border-carbon-800 bg-carbon-900">
        <Eyebrow className="mb-1.5">Query preview</Eyebrow>
        {previewQuery ? (
          <p className="text-xs font-mono text-carbon-200 break-words max-h-20 overflow-y-auto">
            {previewQuery}
          </p>
        ) : (
          <p className="text-xs text-carbon-500">
            Pick a keyword or include the country name.
          </p>
        )}
      </div>
    </Modal>
  );
}
