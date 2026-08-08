import { Boxes, FileCode2, CheckCircle2, ShieldAlert } from "lucide-react";

export default function StatCards({ artifacts, checksPassed, checksTotal, errors }) {
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="label">ARTIFACTS</div>
        <div className="num">{artifacts.length}</div>
        <div className="sub"><FileCode2 size={12} style={{ verticalAlign: "-2px" }} /> Generated this session</div>
      </div>
      <div className="stat-card">
        <div className="label">CHECKS</div>
        <div className="num">{checksTotal ? `${checksPassed}/${checksTotal}` : "—"}</div>
        <div className="sub"><CheckCircle2 size={12} style={{ verticalAlign: "-2px" }} /> Passed</div>
      </div>
      <div className="stat-card">
        <div className="label">ERRORS</div>
        <div className="num" style={{ color: errors > 0 ? "var(--red)" : "var(--text)" }}>{errors}</div>
        <div className="sub"><ShieldAlert size={12} style={{ verticalAlign: "-2px" }} /> This session</div>
      </div>
      <div className="stat-card">
        <div className="label">PROJECT</div>
        <div className="num" style={{ fontSize: 17 }}>ZeroError Silicon</div>
        <div className="sub"><Boxes size={12} style={{ verticalAlign: "-2px" }} /> SIH2026 build</div>
      </div>
    </div>
  );
}
