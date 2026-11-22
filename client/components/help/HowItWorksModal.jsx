import { Fragment, useState } from "react";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import { PageTabs } from "../notes/OverviewParts";
import {
  BanIcon,
  CheckIcon,
  FolderIcon,
  NoteIcon,
  PencilIcon,
  SearchIcon,
  StarIcon,
} from "../ui/icons";
import { TONE_DOT_CLASS, TONE_LABELS } from "../../utils/eventTone";

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "feeds", label: "Feeds" },
  { id: "tools", label: "Tools" },
  { id: "privacy", label: "Privacy" },
];

function Intro({ children }) {
  return <p className="text-sm text-carbon-400 leading-relaxed">{children}</p>;
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-2xs font-semibold uppercase tracking-wider text-carbon-500">
      {children}
    </h3>
  );
}

function Steps({ steps }) {
  return (
    <ol className="space-y-0">
      {steps.map(({ title, text }, i) => (
        <li key={title} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="w-6 h-6 rounded-full border border-accent/50 bg-accent/15 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className="w-px flex-1 bg-carbon-700 my-1" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-carbon-400 leading-relaxed mt-0.5">
              {text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ icon, title, children }) {
  return (
    <li className="flex gap-3 py-2.5">
      <span className="w-7 h-7 rounded-lg bg-carbon-800 border border-carbon-700 text-carbon-300 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-carbon-400 leading-relaxed mt-0.5">
          {children}
        </p>
      </div>
    </li>
  );
}

function Rows({ children }) {
  return (
    <ul className="divide-y divide-carbon-800 border-y border-carbon-800">
      {children}
    </ul>
  );
}

function FeedComparison({ columns, rows }) {
  return (
    <div className="grid grid-cols-2 gap-x-2.5 rounded-lg border border-carbon-800 bg-carbon-900/60 p-3">
      {columns.map((title) => (
        <p key={title} className="text-sm font-semibold text-white mb-1">
          {title}
        </p>
      ))}
      {rows.map(([label, ...values]) => (
        <Fragment key={label}>
          <p className="col-span-2 mt-1.5 text-2xs uppercase tracking-wider text-carbon-500">
            {label}
          </p>
          {values.map((value, i) => (
            <p key={i} className="text-xs text-carbon-200 leading-snug">
              {value}
            </p>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function BasicsTab() {
  return (
    <div className="px-5 py-5 space-y-5">
      <Intro>
        SENTINEL shows what's happening in a country: news articles, live events
        on the map, and your own notes, all in one place.
      </Intro>
      <Steps
        steps={[
          {
            title: "Pick a country",
            text: "Tap it on the map, or use the country list at the bottom.",
          },
          {
            title: "Browse the three tabs",
            text: "Notes (yours), Events (the last 48 hours) and Articles (news coverage).",
          },
          {
            title: "Tap anything for details",
            text: "Opening an item marks it as read. You can star it, add a note or open the original page.",
          },
        ]}
      />
      <div className="space-y-2">
        <SectionTitle>On the map</SectionTitle>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2.5 text-xs text-carbon-300">
            <span className="w-3 h-3 rounded-sm bg-accent shrink-0" />
            The country you picked
          </li>
          {Object.entries(TONE_LABELS).map(([tone, label]) => (
            <li
              key={tone}
              className="flex items-center gap-2.5 text-xs text-carbon-300"
            >
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${TONE_DOT_CLASS[tone]}`}
              />
              {label} event
            </li>
          ))}
        </ul>
        <p className="text-xs text-carbon-500 leading-relaxed">
          Dots from the last 5 countries you looked at stay on the map.
        </p>
      </div>
      <div className="space-y-2">
        <SectionTitle>Search bar</SectionTitle>
        <p className="text-xs text-carbon-400 leading-relaxed">
          Search any topic worldwide, not tied to a country. This uses the
          Articles feed.
        </p>
      </div>
    </div>
  );
}

const TRUST_ROWS = [
  [
    "positive",
    "Trusted",
    "Established outlets with a good track record. Ranked a bit higher.",
  ],
  [
    "negative",
    "State media",
    "Controlled or funded by a government. Ranked lower.",
  ],
  ["negative", "Unreliable", "Known for misleading content. Ranked lower."],
];

function FeedsTab() {
  return (
    <div className="px-5 py-5 space-y-5">
      <Intro>
        Two feeds that complement each other: Events are fresh but short,
        Articles are complete but a day behind.
      </Intro>
      <FeedComparison
        columns={["Events", "Articles"]}
        rows={[
          [
            "What",
            "Things that happened: protests, talks, arrests, attacks…",
            "News articles about the country or your search",
          ],
          ["From", "GDELT, which scans news sites worldwide", "NewsAPI"],
          ["Fresh", "New every 15 minutes", "About a day behind"],
          ["Covers", "The last 48 hours", "Up to 30 days"],
          ["Needs", "Nothing, it's free", "Your API key (100 searches a day)"],
        ]}
      />
      <p className="text-xs text-carbon-500 leading-relaxed">
        Events load a few at a time. Tap Load more to see the rest.
      </p>
      <div className="space-y-2">
        <SectionTitle>Source labels</SectionTitle>
        <ul className="space-y-2">
          {TRUST_ROWS.map(([tone, label, text]) => (
            <li key={label} className="flex items-start gap-2.5">
              <span className="w-[5.5rem] shrink-0 pt-px">
                <Badge tone={tone}>{label}</Badge>
              </span>
              <span className="text-xs text-carbon-400 leading-relaxed">
                {text}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-carbon-500 leading-relaxed">
          Sources without a label are simply unrated. Filters let you put
          trusted or state media first.
        </p>
      </div>
    </div>
  );
}

const ICON = "w-4 h-4";

function ToolsTab() {
  return (
    <div className="px-5 py-5 space-y-4">
      <Intro>Everything you can do besides reading.</Intro>
      <Rows>
        <Row icon={<NoteIcon className={ICON} />} title="Notes">
          Write about a country, keep a list of key people, or add a note to any
          article or event. All notes are in the menu under Notes.
        </Row>
        <Row icon={<StarIcon className={ICON} />} title="Favorites">
          Star articles and events to keep them, even after they're gone from
          the feed. Sort them into groups.
        </Row>
        <Row icon={<FolderIcon className={ICON} />} title="Saved searches">
          Save search keeps a search exactly as it is, so you can run it again
          later with fresh results. Find them under Saved.
        </Row>
        <Row icon={<PencilIcon className={ICON} />} title="Keywords">
          Each country has a list of words used to find its articles. Change
          them under Keywords in the menu.
        </Row>
        <Row icon={<BanIcon className={ICON} />} title="Muted sources">
          Hide a website you don't want to see. Mute it from an article, or
          manage the list in Settings.
        </Row>
        <Row icon={<CheckIcon className={ICON} />} title="Hide read">
          Items you've opened count as read for 30 days. Tick Hide read to only
          see new ones.
        </Row>
        <Row icon={<SearchIcon className={ICON} />} title="Filters">
          Narrow by time, type of event, tone or source. Some apply right away,
          others when you tap Search.
        </Row>
      </Rows>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="px-5 py-5 space-y-4">
      <Intro>
        No accounts, no tracking. Your things never leave this phone.
      </Intro>
      <Rows>
        <Row icon={<CheckIcon className={ICON} />} title="Stored on this phone">
          Notes, favorites, saved searches, keywords and your API key are kept
          only on this device. Nobody else can see them.
        </Row>
        <Row icon={<FolderIcon className={ICON} />} title="Back up regularly">
          Settings → Backup saves everything to a file. Use it to move to a new
          phone or recover after clearing Safari data.
        </Row>
        <Row
          icon={<span className="w-2.5 h-2.5 rounded-full bg-signal-amber" />}
          title="Backup reminder"
        >
          Settings in the menu turns amber after 5 days without a backup, and
          red after 7.
        </Row>
      </Rows>
    </div>
  );
}

export default function HowItWorksModal({ isOpen, onClose }) {
  const [tab, setTab] = useState("basics");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How it works"
      subtitle="A quick tour of SENTINEL"
    >
      <PageTabs page={tab} onChange={setTab} pages={TABS} />
      {tab === "basics" && <BasicsTab />}
      {tab === "feeds" && <FeedsTab />}
      {tab === "tools" && <ToolsTab />}
      {tab === "privacy" && <PrivacyTab />}
    </Modal>
  );
}
