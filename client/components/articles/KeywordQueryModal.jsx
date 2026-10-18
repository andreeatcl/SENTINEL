import { useEffect, useMemo, useState } from "react";
import { quoteKeyword } from "../../utils/queryBuilder";
import KeywordGrid from "./KeywordGrid";
import KeywordOperatorControls from "./KeywordOperatorControls";
import CustomTermInput from "./CustomTermInput";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function KeywordQueryModal({
  isOpen,
  countryName,
  availableKeywords,
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
    setSelectedKeywords([]);
    setCustomTerms([]);
    setCustomInput("");
    setSelectedOperator("OR");
    setCustomOperator("OR");
    setCombineOperator("OR");
    setIncludeCountryInQuery(true);
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
  function handleApply() {
    const selectedExpr = selectedKeywords
      .map((keyword) => quoteKeyword(keyword))
      .join(` ${selectedOperator} `);
    const customExpr = customTerms
      .map((keyword) => quoteKeyword(keyword))
      .join(` ${customOperator} `);

    let expression = "";
    if (selectedExpr && customExpr) {
      expression = `(${selectedExpr}) ${combineOperator} (${customExpr})`;
    } else {
      expression = selectedExpr || customExpr;
    }

    if (!includeCountryInQuery && !expression) {
      return;
    }

    onApply({
      expression,
      queryOptions: {
        includeCountry: includeCountryInQuery,
        overrideCountryKeywords: true,
        gdeltTerms: [...selectedKeywords, ...customTerms],
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
          <Button variant="primary" onClick={handleApply}>
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
    </Modal>
  );
}
