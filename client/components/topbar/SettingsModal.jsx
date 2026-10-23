import Modal from "../ui/Modal";
import { PageTabs } from "../notes/OverviewParts";
import ApiKeysSection from "../settings/ApiKeysSection";
import BackupSection from "../settings/BackupSection";
import MutedSourcesSection from "../settings/MutedSourcesSection";

const TABS = [
  { id: "keys", label: "API keys" },
  { id: "backup", label: "Backup" },
  { id: "muted", label: "Muted sources" },
];

export default function SettingsModal({ tab, onTabChange, onClose }) {
  return (
    <Modal
      isOpen={!!tab}
      onClose={onClose}
      title="Settings"
      subtitle="Stored only on this device"
    >
      <PageTabs page={tab} onChange={onTabChange} pages={TABS} />
      {tab === "keys" && <ApiKeysSection />}
      {tab === "backup" && <BackupSection />}
      {tab === "muted" && <MutedSourcesSection />}
    </Modal>
  );
}
