import { useState } from "react";
import { useMutedDomains } from "../../hooks/useMutedDomains";
import { isMutedDomain } from "../../utils/articleFilters";
import { muteDomain, normalizeDomain, unmuteDomain } from "../../utils/storage";
import Button from "../ui/Button";
import { Input } from "../ui/Field";

export default function MutedSourcesSection() {
  const mutedDomains = useMutedDomains();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const sorted = [...mutedDomains].sort();

  function handleSubmit(e) {
    e.preventDefault();
    const domain = normalizeDomain(input);
    if (!domain.includes("."))
      return setError("That doesn't look like a domain.");
    if (isMutedDomain(`https://${domain}`, mutedDomains))
      return setError(`${domain} is already muted.`);
    muteDomain(domain);
    setInput("");
    setError("");
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <p className="text-sm text-carbon-400 leading-relaxed">
        Articles from these sources are hidden everywhere. Muting a domain also
        hides its subdomains.
      </p>

      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder="example.com or a link to an article"
            className="flex-1"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={!input.trim()}>
            Mute
          </Button>
        </div>
        {error && <p className="text-xs text-signal-red">{error}</p>}
      </form>

      {sorted.length ? (
        <ul className="divide-y divide-carbon-800 border-t border-carbon-800">
          {sorted.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-sm text-carbon-200 font-mono truncate">
                {domain}
              </span>
              <button
                type="button"
                onClick={() => unmuteDomain(domain)}
                className="text-xs text-carbon-400 hover:text-white transition-colors shrink-0"
              >
                Unmute
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-carbon-500">
          Nothing muted yet. Type a domain above, or use "Mute this source" on
          an article.
        </p>
      )}
    </div>
  );
}
