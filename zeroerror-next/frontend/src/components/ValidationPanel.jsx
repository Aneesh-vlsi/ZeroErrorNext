import { ShieldCheck, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

function balancedBraces(code) {
  let depth = 0;
  for (const ch of code) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function computeChecks(hardware, softwareHtml) {
  const checks = [];

  checks.push({
    label: "Firmware Non-Empty",
    state: hardware?.code ? (hardware.code.trim().length > 10 ? "pass" : "fail") : "pending",
  });
  checks.push({
    label: "Firmware Braces Balanced",
    state: hardware?.code ? (balancedBraces(hardware.code) ? "pass" : "fail") : "pending",
  });
  checks.push({
    label: "Wiring Table Present",
    state: hardware?.code ? (hardware.wiring && hardware.wiring.includes("|") ? "pass" : "fail") : "pending",
  });
  checks.push({
    label: "No Markdown Fences Leaked",
    state: hardware?.code ? (!hardware.code.includes("```") ? "pass" : "fail") : "pending",
  });
  checks.push({
    label: "Software Self-Contained HTML",
    state: softwareHtml ? (/<html|<body|<script/i.test(softwareHtml) ? "pass" : "fail") : "pending",
  });
  checks.push({
    label: "Secure-Context Guard Injected",
    state: softwareHtml ? (softwareHtml.includes("zes-secure-guard-banner") ? "pass" : "fail") : "pending",
  });

  return checks;
}

const iconFor = { pass: CheckCircle2, fail: XCircle, pending: MinusCircle };

export default function ValidationPanel({ hardware, softwareHtml }) {
  const checks = computeChecks(hardware, softwareHtml);
  const evaluated = checks.filter((c) => c.state !== "pending");
  const passed = evaluated.filter((c) => c.state === "pass").length;
  const pct = evaluated.length ? Math.round((passed / evaluated.length) * 100) : 0;
  const anyFail = evaluated.some((c) => c.state === "fail");

  return (
    <div className="panel">
      <div className="panel-header">
        <ShieldCheck size={17} className="icon" />
        <h2>VALIDATION &amp; CHECKS</h2>
      </div>
      <div className="content-grid" style={{ gridTemplateColumns: "1fr 120px" }}>
        <div className="check-grid">
          {checks.map((c) => {
            const Icon = iconFor[c.state];
            return (
              <div key={c.label} className="check-item">
                {c.label}
                <span className={`check-status ${c.state}`}>
                  <Icon size={14} />
                  {c.state === "pending" ? "Awaiting generation" : c.state === "pass" ? "Passed" : "Failed"}
                </span>
              </div>
            );
          })}
        </div>
        <div className={`ring ${anyFail ? "red" : ""}`}>
          {evaluated.length ? `${pct}%` : "—"}
          <span className="sub">{evaluated.length ? `${passed}/${evaluated.length} passed` : "No data yet"}</span>
        </div>
      </div>
    </div>
  );
}
