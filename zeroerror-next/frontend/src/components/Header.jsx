import { Bell, User, FolderKanban, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function Header({ apiOnline, notifCount, onOpenActivity }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-stat">
        SYSTEM STATUS
        <span className="value">
          <span className={`dot ${apiOnline ? "" : "off"}`} />
          {apiOnline ? "OPERATIONAL" : "BACKEND OFFLINE"}
        </span>
      </div>
      <div className="topbar-stat">
        AI ENGINE
        <span className="value"><span className="dot" />ACTIVE</span>
      </div>
      <div className="topbar-stat">
        <User size={14} />
        <span className="value">Engineer</span>
      </div>
      <div className="topbar-stat">
        <FolderKanban size={14} />
        <span className="value">ZeroError Silicon</span>
      </div>
      <div className="topbar-stat">
        <Clock size={14} />
        <span className="value">{now.toLocaleTimeString()}</span>
      </div>

      <div className="spacer" />

      <button className="icon-btn" onClick={onOpenActivity} title="Notifications / Activity Log">
        <Bell size={16} />
        {notifCount > 0 && <span className="badge-count">{notifCount}</span>}
      </button>
      <div className="avatar">E</div>
    </div>
  );
}
