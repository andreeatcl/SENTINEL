import { useMemo } from "react";
import { Eyebrow } from "../ui/Field";
import Pager, { usePaged } from "../ui/Pager";
import FavoriteRow from "./FavoriteRow";

const PAGE_SIZE = 12;

export default function FavoritesList({
  sections,
  resetKey,
  groups,
  activeGroup,
  groupedUrls,
  showTopic,
  onOpen,
  onRemove,
  onPickGroups,
}) {
  // url -> names of the custom groups it's in (except for the active group)
  const groupNamesByUrl = useMemo(() => {
    const map = new Map();
    for (const group of groups) {
      if (group.id === activeGroup?.id) continue;
      for (const url of group.urls) {
        map.set(url, [...(map.get(url) || []), group.name]);
      }
    }
    return map;
  }, [groups, activeGroup]);

  // paged across the whole list
  const flat = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item) => ({ section, item })),
      ),
    [sections],
  );
  const paged = usePaged(flat, resetKey, PAGE_SIZE);
  const pageSections = [];
  for (const { section, item } of paged.visible) {
    const last = pageSections[pageSections.length - 1];
    if (last?.section === section) last.items.push(item);
    else pageSections.push({ section, items: [item] });
  }

  return (
    <>
      <Pager paged={paged} className="px-5" />
      {pageSections.map(({ section, items }) => (
        <section key={section.key}>
          {section.label && (
            <div className="flex items-center justify-between px-5 pt-4 pb-1.5 border-b border-carbon-800">
              <Eyebrow>{section.label}</Eyebrow>
              <span className="text-2xs text-carbon-500">
                {section.items.length}
              </span>
            </div>
          )}
          {items.map((item) => (
            <FavoriteRow
              key={item.url}
              item={item}
              showTopic={showTopic}
              inGroup={groupedUrls.has(item.url)}
              groupNames={groupNamesByUrl.get(item.url) || []}
              onOpen={() => onOpen(item)}
              onRemove={() => onRemove(item)}
              onPickGroups={() => onPickGroups(item)}
            />
          ))}
        </section>
      ))}
      <Pager paged={paged} className="px-5" />
    </>
  );
}
