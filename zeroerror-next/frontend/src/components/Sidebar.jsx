import {
  LayoutDashboard, Cpu, Code2, Boxes, ScrollText, Settings, Zap,
} from "lucide-react";

const NAV = [
  { section: "ENGINEERING", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "hardware", label: "Hardware Design", icon: Cpu },
    { id: "software", label: "Software Design", icon: Code2 },
  ]},
  { section: "PROJECT", items: [
    { id: "artifacts", label: "Artifacts", icon: Boxes },
    { id: "activity", label: "Activity Log", icon: ScrollText },
    { id: "settings", label: "Settings", icon: Settings },
  ]},
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Zap size={18} /></div>
        <div className="brand-text">
          <div className="title">ZeroError</div>
          <div className="subtitle">AI ENGINEERING PLATFORM</div>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.section}>
          <div className="nav-section-label">{group.section}</div>
          {group.items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${active === id ? "active" : ""}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        ZEROERROR v2.0.0
        <br />© 2026 All rights reserved
      </div>
    </aside>
  );
}
