import { useMemo, useRef, useState } from "react";
import {
  filterFavorites,
  sortFavorites,
  groupFavorites,
} from "../../utils/favorites";
import { useFavoritesStore } from "../../hooks/useFavoritesStore";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FavoritesSidebar from "./FavoritesSidebar";
import GroupChips from "./GroupChips";
import GroupHeader from "./GroupHeader";
import FavoritesToolbar, {
  DEFAULT_VIEW,
  CLEARED_FILTERS,
  activeFilterCount,
} from "./FavoritesToolbar";
import FavoritesList from "./FavoritesList";
import FavoritesEmptyState from "./FavoritesEmptyState";
import FavoriteDetail from "./FavoriteDetail";
import FavoriteGroupPicker from "./FavoriteGroupPicker";
import GroupMembersPicker from "./GroupMembersPicker";
import AddLinkDialog from "./AddLinkDialog";
import { PlusIcon } from "../ui/icons";

export default function FavoritesPanel({ isOpen, onClose }) {
  const store = useFavoritesStore(isOpen);
  const { favorites, groups, lastRemoved, groupCount } = store;

  const [activeGroupId, setActiveGroupId] = useState(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [openItem, setOpenItem] = useState(null);
  const [pickerItem, setPickerItem] = useState(null);
  const [showMembersPicker, setShowMembersPicker] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const toolbarRef = useRef(null);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  const sections = useMemo(() => {
    const filtered = filterFavorites(favorites, {
      query: view.query,
      type: view.type,
      tier: view.tier,
      urls: activeGroup?.urls ?? null,
    });
    return groupFavorites(
      sortFavorites(filtered, view.sortField, view.sortDir),
      view.groupBy,
      view.sortDir,
    );
  }, [favorites, view, activeGroup]);

  const visibleCount = sections.reduce((n, s) => n + s.items.length, 0);
  const isFiltered = !!view.query.trim() || activeFilterCount(view) > 0;

  let emptyKind = null;
  if (favorites.length === 0) emptyKind = "none";
  else if (visibleCount === 0)
    emptyKind = activeGroup && !isFiltered ? "emptyGroup" : "noMatches";

  function updateView(patch) {
    setView((v) => ({ ...v, ...patch }));
  }

  function handleCreateAndSelect(name) {
    const group = store.createGroup(name);
    if (group) setActiveGroupId(group.id);
  }

  function handleDeleteGroup() {
    store.deleteGroup(activeGroup.id);
    setActiveGroupId(null);
  }

  function handleCloseDetail() {
    setOpenItem(null);
    store.reloadFavorites();
  }

  const groupNav = {
    groups,
    activeGroup,
    totalCount: favorites.length,
    groupCount,
    onSelect: setActiveGroupId,
    onCreate: handleCreateAndSelect,
  };

  const undoFooter = lastRemoved && (
    <>
      <p className="mr-auto text-xs text-carbon-400 truncate min-w-0">
        Removed “{lastRemoved.item.title}”
      </p>
      <Button size="sm" onClick={store.undoRemove}>
        Undo
      </Button>
    </>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        width="mdWithSidebar"
        title="Favorites"
        subtitle={`${favorites.length} saved on this device`}
        headerActions={
          <Button size="sm" onClick={() => setShowAddLink(true)}>
            <PlusIcon className="w-3.5 h-3.5" />
            Add link
          </Button>
        }
        sidebar={<FavoritesSidebar {...groupNav} />}
        footer={undoFooter}
      >
        {/* Toolbar */}
        <div ref={toolbarRef} className="sticky top-0 z-10 bg-carbon-900">
          <GroupChips {...groupNav} />

          {activeGroup && (
            <GroupHeader
              group={activeGroup}
              count={groupCount(activeGroup)}
              onAdd={() => setShowMembersPicker(true)}
              onRename={(name) => store.renameGroup(activeGroup.id, name)}
              onDelete={handleDeleteGroup}
            />
          )}

          {favorites.length > 0 && (
            <FavoritesToolbar view={view} onChange={updateView} />
          )}
        </div>

        {emptyKind ? (
          <FavoritesEmptyState
            kind={emptyKind}
            onAddFavorites={() => setShowMembersPicker(true)}
            onClearFilters={() => updateView(CLEARED_FILTERS)}
          />
        ) : (
          <FavoritesList
            sections={sections}
            toolbarRef={toolbarRef}
            resetKey={`${activeGroupId}:${JSON.stringify(view)}`}
            groups={groups}
            activeGroup={activeGroup}
            groupedUrls={store.groupedUrls}
            showTopic={view.groupBy !== "topic"}
            onOpen={setOpenItem}
            onRemove={store.remove}
            onPickGroups={setPickerItem}
          />
        )}
      </Modal>

      {openItem && (
        <FavoriteDetail item={openItem} onClose={handleCloseDetail} />
      )}

      {showMembersPicker && activeGroup && (
        <GroupMembersPicker
          group={activeGroup}
          favorites={favorites}
          onToggle={store.toggleMembership}
          onClose={() => setShowMembersPicker(false)}
        />
      )}

      {showAddLink && (
        <AddLinkDialog
          onSaved={() => {
            setShowAddLink(false);
            store.reloadFavorites();
          }}
          onClose={() => setShowAddLink(false)}
        />
      )}

      {pickerItem && (
        <FavoriteGroupPicker
          item={pickerItem}
          groups={groups}
          onToggle={store.toggleMembership}
          onCreate={store.createGroup}
          onClose={() => setPickerItem(null)}
        />
      )}
    </>
  );
}
