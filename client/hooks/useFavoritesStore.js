import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFavorites,
  removeFavorite,
  restoreFavorite,
  getFavoriteGroups,
  createFavoriteGroup,
  renameFavoriteGroup,
  deleteFavoriteGroup,
  setFavoriteGroupMembership,
} from "../utils/storage";

// favorites + custom groups for FavoritesPanel
export function useFavoritesStore(isOpen) {
  const [favorites, setFavorites] = useState([]);
  const [groups, setGroups] = useState([]);
  const [lastRemoved, setLastRemoved] = useState(null);

  const reloadFavorites = useCallback(() => setFavorites(getFavorites()), []);
  const reloadGroups = useCallback(() => setGroups(getFavoriteGroups()), []);

  useEffect(() => {
    if (isOpen) {
      reloadFavorites();
      reloadGroups();
    } else {
      setLastRemoved(null);
    }
  }, [isOpen, reloadFavorites, reloadGroups]);

  const favoriteUrls = useMemo(
    () => new Set(favorites.map((f) => f.url)),
    [favorites],
  );

  const groupCount = useCallback(
    (group) => group.urls.filter((url) => favoriteUrls.has(url)).length,
    [favoriteUrls],
  );

  const groupedUrls = useMemo(
    () => new Set(groups.flatMap((g) => g.urls)),
    [groups],
  );

  function remove(item) {
    const index = favorites.findIndex((f) => f.url === item.url);
    removeFavorite(item.url);
    reloadFavorites();
    setLastRemoved({ item, index });
  }

  function undoRemove() {
    if (!lastRemoved) return;
    restoreFavorite(lastRemoved.item, lastRemoved.index);
    reloadFavorites();
    setLastRemoved(null);
  }

  function createGroup(name, addUrl) {
    const group = createFavoriteGroup(name);
    if (!group) return null;
    if (addUrl) setFavoriteGroupMembership(group.id, addUrl, true);
    reloadGroups();
    return group;
  }

  function toggleMembership(groupId, url, isMember) {
    setFavoriteGroupMembership(groupId, url, isMember);
    reloadGroups();
  }

  function renameGroup(groupId, name) {
    renameFavoriteGroup(groupId, name);
    reloadGroups();
  }

  function deleteGroup(groupId) {
    deleteFavoriteGroup(groupId);
    reloadGroups();
  }

  return {
    favorites,
    groups,
    lastRemoved,
    groupCount,
    groupedUrls,
    reloadFavorites,
    reloadGroups,
    remove,
    undoRemove,
    createGroup,
    toggleMembership,
    renameGroup,
    deleteGroup,
  };
}
