import { useState } from "react";
import Modal from "../ui/Modal";
import Button, { IconButton } from "../ui/Button";
import { Eyebrow, Input, Select } from "../ui/Field";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
} from "../ui/icons";
import SectionHeader from "./SectionHeader";
import { useKeyPeople } from "../../hooks/useKeyPeople";
import { useGridColumns } from "../../hooks/useGridColumns";
import {
  KEY_PEOPLE_CATEGORIES,
  hasDefaultKeyPeople,
  hideLiveKeyPerson,
  keyPeopleCategoryLabel,
  keyPersonQuery,
  moveKeyPerson,
  newKeyPersonId,
  resetKeyPeople,
  saveKeyPeople,
} from "../../utils/keyPeople";
import { timeAgo } from "../../utils/newsApi";

const PREVIEW_COUNTS = { 1: 4, 2: 6, 3: 10 };

const CHIP =
  "shrink-0 max-w-full h-7 px-3 inline-flex items-center gap-1.5 rounded-full border border-carbon-700 text-xs font-medium text-carbon-200 hover:border-carbon-500 hover:text-white transition-colors";

function PersonChip({ entry, onSearch }) {
  return (
    <button
      type="button"
      onClick={() => onSearch(entry)}
      title={`Search news for ${keyPersonQuery(entry)}`}
      className={CHIP}
    >
      <span className="truncate">{entry.name}</span>
      {entry.role && (
        <span className="text-carbon-500 truncate">· {entry.role}</span>
      )}
    </button>
  );
}

function EntryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [category, setCategory] = useState(initial?.category ?? "government");
  const [query, setQuery] = useState(initial?.query ?? "");

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const entry = { name: name.trim(), role: role.trim(), category };
    if (query.trim()) entry.query = query.trim();
    onSave(entry);
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 my-1 rounded-md border border-carbon-700 bg-carbon-850"
    >
      <label className="block">
        <Eyebrow className="mb-1.5">Name</Eyebrow>
        <Input
          autoFocus
          placeholder="e.g. Donald Tusk"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </label>
      <label className="block">
        <Eyebrow className="mb-1.5">Role</Eyebrow>
        <Input
          placeholder="e.g. PM, Party"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full"
        />
      </label>
      <label className="block">
        <Eyebrow className="mb-1.5">Category</Eyebrow>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {KEY_PEOPLE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <Eyebrow className="mb-1.5">Search as (optional)</Eyebrow>
        <Input
          placeholder="Defaults to the name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </label>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          type="submit"
          disabled={!name.trim()}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EntryMeta({ entry, className = "" }) {
  const parts = [entry.role, keyPeopleCategoryLabel(entry.category)];
  return (
    <p className={`text-xs text-carbon-500 ${className}`}>
      {parts.filter(Boolean).join(" · ")}
    </p>
  );
}

function EditableRow({ entry, isFirst, isLast, onMove, onEdit, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-carbon-100 truncate">{entry.name}</p>
        <EntryMeta entry={entry} className="truncate" />
      </div>
      {onMove && (
        <>
          <IconButton
            size="sm"
            label="Move up"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            label="Move down"
            onClick={() => onMove(1)}
            disabled={isLast}
            className="disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </IconButton>
        </>
      )}
      <IconButton size="sm" label={`Edit ${entry.name}`} onClick={onEdit}>
        <PencilIcon className="w-3.5 h-3.5" />
      </IconButton>
      <IconButton
        size="sm"
        label={`Remove ${entry.name}`}
        onClick={onRemove}
        className="hover:text-signal-red"
      >
        <CloseIcon className="w-3.5 h-3.5" />
      </IconButton>
    </div>
  );
}

function LiveStatus({ officeholders }) {
  const { code, result, loading, error, refresh } = officeholders;
  if (!code && !loading && !error) return null;

  let text = "Heads of state & government from Wikidata";
  if (loading) text += " · loading…";
  else if (error) text = error;
  else if (result?.fetchedAt) text += ` · updated ${timeAgo(result.fetchedAt)}`;

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2 border-b border-carbon-800">
      <p className="text-xs text-carbon-500">{text}</p>
      <Button
        size="sm"
        variant="ghost"
        onClick={refresh}
        disabled={loading}
        className="-mr-2 shrink-0"
      >
        {error ? "Retry" : "Refresh"}
      </Button>
    </div>
  );
}

function KeyPeopleModal({
  country,
  live,
  list,
  customized,
  hiddenCount,
  officeholders,
  startEditing,
  onSearch,
  onClose,
}) {
  const entries = [...live, ...list];
  const [editing, setEditing] = useState(startEditing);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(startEditing && entries.length === 0);

  function save(next) {
    if (!saveKeyPeople(country, next)) {
      window.alert("Couldn't save. Your browser storage may be full.");
    }
  }

  function saveEdit(entry, patch) {
    if (entry.live) {
      // an edited officeholder becomes the user's own entry
      hideLiveKeyPerson(country, entry.wikidataId);
      save([{ id: newKeyPersonId(), ...patch }, ...list]);
    } else {
      save(list.map((e) => (e.id === entry.id ? { id: e.id, ...patch } : e)));
    }
    setEditingId(null);
  }

  function remove(entry) {
    if (entry.live) hideLiveKeyPerson(country, entry.wikidataId);
    else save(list.filter((e) => e.id !== entry.id));
  }

  function handleReset() {
    if (window.confirm(`Reset ${country}'s list to the defaults?`)) {
      resetKeyPeople(country);
      setEditingId(null);
    }
  }

  const canReset =
    (customized && hasDefaultKeyPeople(country)) || hiddenCount > 0;

  const footer = editing ? (
    <>
      {canReset && (
        <Button
          size="sm"
          variant="danger"
          className="mr-auto"
          onClick={handleReset}
        >
          Reset to defaults
        </Button>
      )}
      <Button
        size="sm"
        onClick={() => {
          setEditingId(null);
          setAdding(true);
        }}
        disabled={adding}
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Add
      </Button>
    </>
  ) : null;

  return (
    <Modal
      title="Key people & groups"
      subtitle={country}
      onClose={onClose}
      footer={footer}
      headerActions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(!editing);
            setEditingId(null);
            setAdding(false);
          }}
        >
          {editing ? "Done" : "Edit"}
        </Button>
      }
    >
      <LiveStatus officeholders={officeholders} />

      {entries.length === 0 && !adding && (
        <p className="px-5 py-4 text-sm text-carbon-500">
          Nothing listed for {country}.
        </p>
      )}

      {entries.length > 0 && (
        <ul className={editing ? "px-5 py-2" : "px-3 py-2"}>
          {entries.map((entry) => {
            const i = list.indexOf(entry);
            return (
              <li key={entry.id}>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => onSearch(entry)}
                    className="w-full px-2 py-2 rounded-md text-left hover:bg-carbon-800 transition-colors"
                  >
                    <span className="block text-sm text-carbon-100">
                      {entry.name}
                    </span>
                    <EntryMeta entry={entry} />
                  </button>
                ) : editingId === entry.id ? (
                  <EntryForm
                    initial={entry}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) => saveEdit(entry, patch)}
                  />
                ) : (
                  <EditableRow
                    entry={entry}
                    isFirst={i === 0}
                    isLast={i === list.length - 1}
                    onMove={
                      entry.live
                        ? null
                        : (dir) => save(moveKeyPerson(list, entry.id, dir))
                    }
                    onEdit={() => {
                      setAdding(false);
                      setEditingId(entry.id);
                    }}
                    onRemove={() => remove(entry)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="px-5 py-3">
          <EntryForm
            onCancel={() => setAdding(false)}
            onSave={(entry) => {
              save([...list, { id: newKeyPersonId(), ...entry }]);
              setAdding(false);
            }}
          />
        </div>
      )}
    </Modal>
  );
}

export default function KeyPeopleSection({ country, onSearch }) {
  const { live, list, customized, hiddenCount, officeholders } =
    useKeyPeople(country);
  const entries = [...live, ...list];
  const [modal, setModal] = useState(null);
  const previewCount = PREVIEW_COUNTS[useGridColumns()];

  function search(entry) {
    setModal(null);
    onSearch({ topic: keyPersonQuery(entry), raw: true });
  }

  return (
    <>
      <SectionHeader
        label="Key people & groups"
        count={entries.length}
        action={
          <IconButton
            size="sm"
            label="Edit key people & groups"
            onClick={() => setModal("edit")}
            className="-my-1.5 -mr-1.5"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </IconButton>
        }
      />

      {entries.length === 0 ? (
        <p className="px-4 py-4 text-xs text-carbon-500 leading-relaxed">
          {officeholders.loading
            ? "Loading…"
            : `No key people or groups listed for ${country} yet.`}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          {entries.slice(0, previewCount).map((entry) => (
            <PersonChip key={entry.id} entry={entry} onSearch={search} />
          ))}
          {entries.length > previewCount && (
            <button
              type="button"
              onClick={() => setModal("view")}
              className={CHIP}
            >
              All {entries.length} →
            </button>
          )}
        </div>
      )}

      {modal && (
        <KeyPeopleModal
          country={country}
          live={live}
          list={list}
          customized={customized}
          hiddenCount={hiddenCount}
          officeholders={officeholders}
          startEditing={modal === "edit"}
          onSearch={search}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
