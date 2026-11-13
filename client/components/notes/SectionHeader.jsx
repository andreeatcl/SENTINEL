import { Eyebrow } from "../ui/Field";

export default function SectionHeader({ label, count, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-1.5 border-b border-carbon-800">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-carbon-500">{count}</span>
        {action}
      </div>
    </div>
  );
}
