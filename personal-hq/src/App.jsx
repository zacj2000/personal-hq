import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "email", label: "Email", icon: "✉️", color: "#4F8EF7", connected: false },
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "#0A66C2", connected: false },
  { id: "whatsapp", label: "WhatsApp", icon: "💬", color: "#25D366", connected: false },
];

const MOCK_MESSAGES = {
  email: [
    { id: 1, from: "James Harrington", subject: "Driver Agreement – Wedding June", preview: "Hi Zac, just checking if the agreement is confirmed...", time: "9:42am", unread: true },
    { id: 2, from: "Oxford Brookes Registry", subject: "Resit Exam Schedule", preview: "Please find attached your resit timetable for...", time: "Yesterday", unread: true },
    { id: 3, from: "Ryanair Customer Relations", subject: "Re: Denied Boarding Complaint", preview: "Thank you for your complaint. We are reviewing...", time: "2 days ago", unread: false },
  ],
  linkedin: [
    { id: 4, from: "Sarah Mitchell", subject: "Connection Request", preview: "Hi Zac, I came across your profile and would love to connect — I work in estate management...", time: "1hr ago", unread: true },
    { id: 5, from: "PropTech Network", subject: "New post in your feed", preview: "The future of residential estate management — AI tools every agent should know...", time: "3hr ago", unread: false },
  ],
  whatsapp: [
    { id: 6, from: "Mum 👩‍👧", subject: "Birthday Party", preview: "Have you sorted the venue yet? What about Fernhill Farm?", time: "11:20am", unread: true },
    { id: 7, from: "Tom 🎉", subject: "Birthday", preview: "Bro 200 people confirmed, need the date ASAP", time: "10:15am", unread: true },
    { id: 8, from: "Client – Gloucester Wedding", subject: "Driver", preview: "Just to confirm the pickup is 10am on Saturday", time: "Yesterday", unread: false },
  ],
};

const SEED_TARGETS = [
  { id: 1, company: "Savills", role: "Graduate / Work Experience", sector: "Agency & Advisory", location: "London / Oxford", contact: "Graduate Recruitment Team", email: "graduates@savills.com", why: "Top-5 UK commercial agency, strong graduate scheme with direct route into commercial property work", status: "not_sent" },
  { id: 2, company: "CBRE", role: "Work Experience – Commercial", sector: "Global Real Estate Services", location: "London", contact: "Early Careers Team", email: "uk.graduates@cbre.com", why: "Largest commercial property firm globally — excellent LinkedIn signal and brand name", status: "not_sent" },
  { id: 3, company: "Knight Frank", role: "Work Placement", sector: "Agency & Advisory", location: "London / Regional", contact: "Graduate Recruitment", email: "graduates@knightfrank.com", why: "Strong private commercial portfolio, well-regarded for placing Oxford Brookes students", status: "not_sent" },
  { id: 4, company: "JLL", role: "Work Experience", sector: "Commercial Real Estate", location: "London / Birmingham", contact: "Early Careers", email: "ukcareers@jll.com", why: "Global firm with strong UK commercial presence — great for RICS pathway and LinkedIn credibility", status: "not_sent" },
  { id: 5, company: "Lambert Smith Hampton", role: "Summer Placement", sector: "Commercial Agency", location: "Oxford / Midlands", contact: "HR Team", email: "info@lsh.co.uk", why: "Strong regional presence near Oxford Brookes — more likely to take students for shorter placements", status: "not_sent" },
  { id: 6, company: "Colliers International", role: "Work Experience", sector: "Commercial Property", location: "London", contact: "Graduate Team", email: "uk.graduates@colliers.com", why: "Up-and-coming rival to CBRE/JLL — great if you want a slightly less corporate experience", status: "not_sent" },
];

const STATUS_META = {
  not_sent:  { label: "Not Sent",  color: "#8B8FA8", bg: "#23262F" },
  sent:      { label: "Sent",      color: "#4F8EF7", bg: "#1E2D50" },
  replied:   { label: "Replied",   color: "#34D399", bg: "#0F2D22" },
  rejected:  { label: "No Reply",  color: "#EF4444", bg: "#2D1515" },
  follow_up: { label: "Follow-up", color: "#FBBF24", bg: "#2D2410" },
};

const ZAC_SYSTEM = `You are the AI Personal Assistant for Zac, a 21-year-old student at Oxford Brookes University studying Real Estate & Estate Management. Zac is ambitious, friendly, and professional. Key facts:
- Degree: BSc Real Estate / Estate Management at Oxford Brookes University (2nd year)
- He has significant availability for work experience alongside his studies
- Goal: secure commercial property work experience to build his LinkedIn and CV
- He also runs a small private driver/childcare business on the side
- He is direct, personable, and not stiff — he wants emails that sound human, not template-y
Always write in first person as Zac. Keep things concise and punchy.`;

// ─── API HELPER — calls our secure Netlify function ──────────────────────────

async function callClaude(messages, systemPrompt) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt || ZAC_SYSTEM,
      messages,
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "Something went wrong. Please try again.";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PersonalHQ() {
  const [activeTab, setActiveTab] = useState("outreach");
  const [activePlatform, setActivePlatform] = useState("email");
  const [platforms, setPlatforms] = useState(PLATFORMS);

  const [goals, setGoals] = useState([
    { id: 1, text: "Land commercial property work experience at a top firm", category: "career", progress: 10 },
    { id: 2, text: "Build LinkedIn to 300+ connections with property professionals", category: "career", progress: 20 },
    { id: 3, text: "Pass Oxford Brookes resits and secure my degree", category: "academic", progress: 25 },
    { id: 4, text: "Book venue and finalise 21st birthday party", category: "personal", progress: 60 },
  ]);
  const [newGoal, setNewGoal] = useState("");
  const [newGoalCat, setNewGoalCat] = useState("career");
  const [goalPlans, setGoalPlans] = useState({});
  const [loadingGoalPlan, setLoadingGoalPlan] = useState(null);

  const [targets, setTargets] = useState(SEED_TARGETS);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [editingDraft, setEditingDraft] = useState("");
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTarget, setNewTarget] = useState({ company: "", role: "", sector: "", location: "", contact: "", email: "", why: "" });
  const [copiedId, setCopiedId] = useState(null);

  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hey Zac 👋 I'm your Personal HQ brain. I know you're targeting commercial property work experience — want me to suggest who to email next, help draft something, or plan your outreach strategy?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const unreadCount = (p) => MOCK_MESSAGES[p]?.filter(m => m.unread).length || 0;
  const totalUnread = Object.keys(MOCK_MESSAGES).reduce((a, p) => a + unreadCount(p), 0);
  const toggleConnect = (id) => setPlatforms(prev => prev.map(p => p.id === id ? { ...p, connected: !p.connected } : p));
  const sentCount = targets.filter(t => t.status !== "not_sent").length;
  const repliedCount = targets.filter(t => t.status === "replied").length;

  const catColor = { career: "#4F8EF7", academic: "#A78BFA", personal: "#34D399", business: "#FB923C" };
  const catLabel = { career: "Career", academic: "Academic", personal: "Personal", business: "Business" };

  const generateDraft = async (target) => {
    setSelectedTarget(target);
    setDraftEmail("");
    setEditingDraft("");
    setLoadingDraft(true);
    const prompt = `Write a cold email from Zac to ${target.contact} at ${target.company} asking for work experience.

Company: ${target.company}
Sector: ${target.sector}
Location: ${target.location}
Why this firm: ${target.why}

Requirements:
- Subject line on the first line, prefixed with "Subject: "
- Then a blank line, then the email body
- Mention Zac is studying Real Estate & Estate Management at Oxford Brookes University
- Mention he has genuine availability and flexibility to fit around the firm
- Say he's keen to build real-world commercial property experience
- Mention he wants to grow his professional network in the industry
- Keep it under 180 words — punchy and human, not a template
- End with a clear low-pressure ask (a call, quick chat, or visit)
- Sign off as: Zac`;
    const result = await callClaude([{ role: "user", content: prompt }], ZAC_SYSTEM);
    setDraftEmail(result);
    setEditingDraft(result);
    setLoadingDraft(false);
  };

  const markStatus = (id, status) => setTargets(prev => prev.map(t => t.id === id ? { ...t, status } : t));

  const copyEmail = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addTarget = () => {
    if (!newTarget.company.trim()) return;
    setTargets(prev => [...prev, { ...newTarget, id: Date.now(), status: "not_sent" }]);
    setNewTarget({ company: "", role: "", sector: "", location: "", contact: "", email: "", why: "" });
    setShowAddTarget(false);
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals(prev => [...prev, { id: Date.now(), text: newGoal, category: newGoalCat, progress: 0 }]);
    setNewGoal("");
  };

  const handleGoalPlan = async (goal) => {
    setLoadingGoalPlan(goal.id);
    const result = await callClaude(
      [{ role: "user", content: `Give me a concrete 5-step action plan for: "${goal.text}". Short, specific, actionable. Numbered list only.` }],
      ZAC_SYSTEM
    );
    setGoalPlans(prev => ({ ...prev, [goal.id]: result }));
    setLoadingGoalPlan(null);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || loadingChat) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...chatHistory, userMsg];
    setChatHistory(updated);
    setChatInput("");
    setLoadingChat(true);

    const outreachCtx = targets.map(t => `- ${t.company} (${t.status})`).join("\n");
    const goalsCtx = goals.map(g => `- ${g.text} (${g.progress}%)`).join("\n");
    const sys = `${ZAC_SYSTEM}\n\nCurrent outreach pipeline:\n${outreachCtx}\n\nCurrent goals:\n${goalsCtx}\n\nBe direct, practical, and mate-like. Help with outreach, drafts, strategy, LinkedIn tips. Keep it tight.`;

    const result = await callClaude(updated.map(m => ({ role: m.role, content: m.content })), sys);
    setChatHistory(prev => [...prev, { role: "assistant", content: result }]);
    setLoadingChat(false);
  };

  // ─── STYLES ───────────────────────────────────────────────────────────────

  const CARD = { background: "#16181F", borderRadius: 14, border: "1px solid #23262F", padding: "20px 24px" };
  const INPUT_S = { background: "#0F1117", border: "1px solid #23262F", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
  const BTN = (bg = "#4F8EF7") => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" });
  const TAB = (active) => ({ background: active ? "#4F8EF7" : "transparent", color: active ? "#fff" : "#8B8FA8", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer", position: "relative", whiteSpace: "nowrap" });

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: "#0F1117", minHeight: "100vh", color: "#E8EAF0" }}>

      {/* NAV */}
      <div style={{ background: "#16181F", borderBottom: "1px solid #23262F", padding: "0 16px", display: "flex", alignItems: "center", gap: "4px", height: "52px", overflowX: "auto" }}>
        <span style={{ fontSize: "17px", fontWeight: 800, color: "#fff", marginRight: "12px", whiteSpace: "nowrap" }}>⚡ Personal HQ</span>
        {["outreach", "dashboard", "inbox", "goals", "brain"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={TAB(activeTab === tab)}>
            {tab === "inbox" && totalUnread > 0 && (
              <span style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 13, height: 13, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{totalUnread}</span>
            )}
            {{ outreach: "📬 Outreach", dashboard: "Dashboard", inbox: "Inbox", goals: "Goals", brain: "🧠 Brain" }[tab]}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 14px" }}>

        {/* ── OUTREACH ─────────────────────────────────────── */}
        {activeTab === "outreach" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📬 Work Experience Outreach</h2>
                <p style={{ margin: "4px 0 0", color: "#8B8FA8", fontSize: 13 }}>AI-drafted cold emails to commercial property firms — personalised, one click.</p>
              </div>
              <button onClick={() => setShowAddTarget(v => !v)} style={BTN("#23262F")}>+ Add Company</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "14px 0" }}>
              {[
                { label: "Target Firms", val: targets.length, color: "#8B8FA8" },
                { label: "Contacted", val: sentCount, color: "#4F8EF7" },
                { label: "Replies", val: repliedCount, color: "#34D399" },
                { label: "To Do", val: targets.filter(t => t.status === "not_sent").length, color: "#FBBF24" },
              ].map(s => (
                <div key={s.label} style={{ ...CARD, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {showAddTarget && (
              <div style={{ ...CARD, marginBottom: 14 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Add a Company</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["company", "Company name *"], ["role", "Role / type"], ["sector", "Sector"], ["location", "Location"], ["contact", "Contact name/title"], ["email", "Email address"]].map(([k, ph]) => (
                    <input key={k} placeholder={ph} value={newTarget[k]} onChange={e => setNewTarget(p => ({ ...p, [k]: e.target.value }))} style={INPUT_S} />
                  ))}
                  <input placeholder="Why this firm (AI will use this to personalise your email)" value={newTarget.why} onChange={e => setNewTarget(p => ({ ...p, why: e.target.value }))} style={{ ...INPUT_S, gridColumn: "1/-1" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={addTarget} style={BTN()}>Add</button>
                  <button onClick={() => setShowAddTarget(false)} style={BTN("#23262F")}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {targets.map(target => {
                const sm = STATUS_META[target.status];
                const isSelected = selectedTarget?.id === target.id;
                return (
                  <div key={target.id} style={{ ...CARD, border: isSelected ? "1px solid #4F8EF7" : "1px solid #23262F" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{target.company}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: sm.color, background: sm.bg, borderRadius: 99, padding: "2px 8px" }}>{sm.label}</span>
                          <span style={{ fontSize: 11, color: "#8B8FA8" }}>{target.sector}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#8B8FA8", marginTop: 3 }}>
                          {target.role} · {target.location} · <span style={{ color: "#4F8EF7" }}>{target.contact}</span>
                          {target.email && <span style={{ color: "#8B8FA8" }}> · {target.email}</span>}
                        </div>
                      </div>
                      <button onClick={() => generateDraft(target)} style={{ ...BTN(), fontSize: 12, padding: "6px 12px", marginLeft: 10, flexShrink: 0 }}>
                        {loadingDraft && isSelected ? "Drafting..." : "✍️ Draft Email"}
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: "#8B8FA8", marginBottom: 10, padding: "7px 10px", background: "#0F1117", borderRadius: 7 }}>
                      💡 {target.why}
                    </div>

                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {Object.entries(STATUS_META).map(([key, meta]) => (
                        <button key={key} onClick={() => markStatus(target.id, key)} style={{
                          background: target.status === key ? meta.bg : "#0F1117",
                          color: target.status === key ? meta.color : "#8B8FA8",
                          border: `1px solid ${target.status === key ? meta.color : "#23262F"}`,
                          borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer"
                        }}>{meta.label}</button>
                      ))}
                    </div>

                    {isSelected && (loadingDraft || editingDraft) && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: "#4F8EF7", fontWeight: 700, marginBottom: 6 }}>✉️ Your draft — edit freely before sending</div>
                        {loadingDraft ? (
                          <div style={{ background: "#0F1117", borderRadius: 10, padding: 12, color: "#8B8FA8", fontSize: 13 }}>Writing your personalised email...</div>
                        ) : (
                          <>
                            <textarea value={editingDraft} onChange={e => setEditingDraft(e.target.value)} rows={11}
                              style={{ ...INPUT_S, borderRadius: 10, resize: "vertical", lineHeight: 1.7, fontSize: 13, fontFamily: "inherit" }} />
                            <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                              <button onClick={() => copyEmail(editingDraft, target.id)} style={BTN()}>
                                {copiedId === target.id ? "✅ Copied!" : "📋 Copy"}
                              </button>
                              {target.email && (
                                <a href={`mailto:${target.email}?subject=${encodeURIComponent((editingDraft.match(/Subject: (.+)/) || [])[1] || "Work Experience Enquiry")}&body=${encodeURIComponent(editingDraft.split("\n").slice(2).join("\n"))}`}
                                  style={{ ...BTN("#0A66C2"), textDecoration: "none", display: "inline-block" }}>
                                  📤 Open in Mail
                                </a>
                              )}
                              <button onClick={() => markStatus(target.id, "sent")} style={BTN("#34D399")}>✓ Mark Sent</button>
                              <button onClick={() => generateDraft(target)} style={BTN("#23262F")}>🔄 Regenerate</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ ...CARD, marginTop: 16, borderColor: "#0A66C244", background: "#0A0E1A" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: "#4F8EF7" }}>💼 LinkedIn tip — do this after every email you send</div>
              <p style={{ margin: 0, fontSize: 13, color: "#8B8FA8", lineHeight: 1.7 }}>Find a graduate surveyor or associate at that firm on LinkedIn and send: <span style={{ color: "#C0C3D0" }}>"Hi [name], I've just reached out to [firm] about work experience — I'm studying Real Estate at Oxford Brookes and would love to connect with people in commercial property."</span> Doubles your visibility and gets you inside the firm before you hear back.</p>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Good morning, Zac 👋</h2>
            <p style={{ color: "#8B8FA8", marginBottom: 18, fontSize: 13 }}>Here's what's happening across your world.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {platforms.map(p => (
                <div key={p.id} style={{ ...CARD, display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", border: `1px solid ${p.connected ? p.color + "44" : "#23262F"}` }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
                    {p.connected ? <div style={{ fontSize: 11, color: "#34D399" }}>● Connected · {unreadCount(p.id)} unread</div>
                      : <div style={{ fontSize: 11, color: "#8B8FA8" }}>Not connected</div>}
                  </div>
                  <button onClick={() => toggleConnect(p.id)} style={{ ...BTN(p.connected ? "#23262F" : p.color), fontSize: 11, padding: "4px 10px" }}>
                    {p.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>🎯 Goals</span>
                  <button onClick={() => setActiveTab("goals")} style={{ background: "none", border: "none", color: "#4F8EF7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>View all →</button>
                </div>
                {goals.map(g => (
                  <div key={g.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{g.text}</span>
                      <span style={{ fontSize: 11, color: catColor[g.category], fontWeight: 700, marginLeft: 8 }}>{g.progress}%</span>
                    </div>
                    <div style={{ background: "#23262F", borderRadius: 99, height: 5 }}>
                      <div style={{ width: `${g.progress}%`, background: catColor[g.category], height: 5, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>📬 Outreach Pipeline</span>
                  <button onClick={() => setActiveTab("outreach")} style={{ background: "none", border: "none", color: "#4F8EF7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Open →</button>
                </div>
                {Object.entries(STATUS_META).map(([key, meta]) => {
                  const count = targets.filter(t => t.status === key).length;
                  return count > 0 ? (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#C0C3D0" }}>{meta.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ background: "#23262F", borderRadius: 99, height: 5, width: 70 }}>
                          <div style={{ width: `${(count / targets.length) * 100}%`, background: meta.color, height: 5, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, color: meta.color, fontWeight: 700, width: 14 }}>{count}</span>
                      </div>
                    </div>
                  ) : null;
                })}
                <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 6 }}>{targets.length} firms · {sentCount} contacted · {repliedCount} replied</div>
              </div>
            </div>
          </div>
        )}

        {/* ── INBOX ────────────────────────────────────────── */}
        {activeTab === "inbox" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>📬 Unified Inbox</h2>
            <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
              {platforms.map(p => (
                <button key={p.id} onClick={() => setActivePlatform(p.id)} style={{
                  background: activePlatform === p.id ? p.color : "#16181F",
                  color: activePlatform === p.id ? "#fff" : "#8B8FA8",
                  border: `1px solid ${activePlatform === p.id ? p.color : "#23262F"}`,
                  borderRadius: 99, padding: "5px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {p.icon} {p.label}
                  {unreadCount(p.id) > 0 && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 99, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{unreadCount(p.id)}</span>}
                </button>
              ))}
            </div>
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              {(MOCK_MESSAGES[activePlatform] || []).map((msg, i) => (
                <div key={msg.id} style={{ padding: "13px 18px", borderBottom: i < MOCK_MESSAGES[activePlatform].length - 1 ? "1px solid #23262F" : "none", background: msg.unread ? "#1A1D26" : "transparent", display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 99, background: platforms.find(p => p.id === activePlatform)?.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                    {platforms.find(p => p.id === activePlatform)?.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: msg.unread ? 700 : 500, fontSize: 13 }}>{msg.from}</span>
                      <span style={{ fontSize: 11, color: "#8B8FA8" }}>{msg.time}</span>
                    </div>
                    <div style={{ fontWeight: msg.unread ? 700 : 400, fontSize: 12, color: msg.unread ? "#fff" : "#C0C3D0", marginTop: 2 }}>{msg.subject}</div>
                    <div style={{ fontSize: 11, color: "#8B8FA8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.preview}</div>
                  </div>
                  {msg.unread && <div style={{ width: 7, height: 7, borderRadius: 99, background: "#4F8EF7", flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))}
            </div>
            <p style={{ color: "#8B8FA8", fontSize: 12, marginTop: 10, textAlign: "center" }}>🔌 Connect your accounts to see real messages here</p>
          </div>
        )}

        {/* ── GOALS ────────────────────────────────────────── */}
        {activeTab === "goals" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 5 }}>🎯 Your Goals</h2>
            <p style={{ color: "#8B8FA8", fontSize: 13, marginBottom: 16 }}>Set goals and get a real AI action plan to hit them.</p>
            <div style={{ ...CARD, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()} placeholder="Add a new goal..." style={{ ...INPUT_S, flex: 1, minWidth: 180 }} />
                <select value={newGoalCat} onChange={e => setNewGoalCat(e.target.value)} style={{ ...INPUT_S, width: "auto" }}>
                  <option value="career">Career</option>
                  <option value="academic">Academic</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
                <button onClick={addGoal} style={BTN()}>Add</button>
              </div>
            </div>
            {goals.map(g => (
              <div key={g.id} style={{ ...CARD, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: catColor[g.category], background: catColor[g.category] + "22", borderRadius: 99, padding: "2px 8px" }}>{catLabel[g.category]}</span>
                    <p style={{ margin: "5px 0 0", fontWeight: 700, fontSize: 14 }}>{g.text}</p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: catColor[g.category], marginLeft: 10 }}>{g.progress}%</span>
                </div>
                <div style={{ background: "#23262F", borderRadius: 99, height: 6, marginBottom: 10 }}>
                  <div style={{ width: `${g.progress}%`, background: catColor[g.category], height: 6, borderRadius: 99 }} />
                </div>
                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <input type="range" min={0} max={100} value={g.progress} onChange={e => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, progress: +e.target.value } : x))} style={{ flex: 1, accentColor: catColor[g.category] }} />
                  <button onClick={() => handleGoalPlan(g)} style={{ ...BTN(), fontSize: 12, padding: "5px 11px", whiteSpace: "nowrap" }}>
                    {loadingGoalPlan === g.id ? "Planning..." : "🧠 Get Plan"}
                  </button>
                </div>
                {goalPlans[g.id] && (
                  <div style={{ background: "#0F1117", borderRadius: 9, padding: "11px 13px", marginTop: 10, fontSize: 13, lineHeight: 1.7, color: "#C0C3D0", whiteSpace: "pre-wrap" }}>{goalPlans[g.id]}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── BRAIN ────────────────────────────────────────── */}
        {activeTab === "brain" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
            <div style={{ ...CARD, padding: 0, display: "flex", flexDirection: "column", height: "74vh" }}>
              <div style={{ padding: "13px 18px", borderBottom: "1px solid #23262F" }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>🧠 Your AI Brain</span>
                <span style={{ fontSize: 12, color: "#8B8FA8", marginLeft: 8 }}>strategist · writer · PA</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "13px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
                {chatHistory.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "83%", padding: "9px 13px", borderRadius: 11, background: msg.role === "user" ? "#4F8EF7" : "#23262F", color: "#fff", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loadingChat && (
                  <div style={{ display: "flex" }}>
                    <div style={{ background: "#23262F", borderRadius: 11, padding: "9px 13px", color: "#8B8FA8", fontSize: 13 }}>Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: "11px 13px", borderTop: "1px solid #23262F", display: "flex", gap: 7 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()} placeholder="Draft, plan, strategise..." style={{ ...INPUT_S, flex: 1 }} />
                <button onClick={handleChat} disabled={loadingChat} style={{ ...BTN(loadingChat ? "#23262F" : "#4F8EF7"), padding: "10px 16px" }}>→</button>
              </div>
            </div>

            <div style={{ ...CARD, padding: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚡ Quick Prompts</div>
              {[
                { label: "Who should I email next?", prompt: "Based on my outreach pipeline, who should I email next and why?" },
                { label: "LinkedIn post idea", prompt: "Give me a punchy LinkedIn post idea about being a Real Estate student at Oxford Brookes looking to get into commercial property" },
                { label: "Cold email tips", prompt: "Give me 3 quick tips to make my cold emails to commercial property firms more likely to get a reply" },
                { label: "Follow-up email", prompt: "Write a short follow-up email for 10 days after reaching out to a commercial property firm with no reply" },
                { label: "LinkedIn connection message", prompt: "Write a short LinkedIn connection request to a graduate surveyor at Savills, mentioning I'm a Real Estate student at Oxford Brookes looking for work experience" },
                { label: "Weekly plan", prompt: "Give me a focused weekly plan to make progress on landing commercial property work experience" },
                { label: "What to say on a call", prompt: "If a firm calls me back about work experience, what should I say? Give me a quick cheat sheet" },
              ].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q.prompt)} style={{ display: "block", width: "100%", textAlign: "left", background: "#0F1117", border: "1px solid #23262F", borderRadius: 7, padding: "8px 10px", marginBottom: 6, color: "#C0C3D0", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#4F8EF7"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#23262F"}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
