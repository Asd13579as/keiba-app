import { useState, useEffect, useRef } from "react";

// ===== ダミーデータ =====
const RACES = [
  { id: 1, name: "東京11R 日本ダービー", course: "東京 芝2400m", grade: "GI" },
  { id: 2, name: "京都11R 菊花賞", course: "京都 芝3000m", grade: "GI" },
  { id: 3, name: "阪神11R 宝塚記念", course: "阪神 芝2200m", grade: "GI" },
  { id: 4, name: "中山11R 有馬記念", course: "中山 芝2500m", grade: "GI" },
];

const INITIAL_HORSES = [
  { id: 1, gate: 1, name: "ゴールドエクスプレス", style: "逃げ", jockey: "武豊", weight: 486, handicap: 57, last5: [1,2,1,3,1], agari: 33.2, odds: 4.5, color: "#e8c84a" },
  { id: 2, gate: 2, name: "シルバーアロー", style: "先行", jockey: "川田将雅", weight: 492, handicap: 57, last5: [2,1,3,2,2], agari: 33.8, odds: 6.2, color: "#aaaaaa" },
  { id: 3, gate: 3, name: "ダイヤモンドランナー", style: "差し", jockey: "福永祐一", weight: 478, handicap: 57, last5: [1,3,2,1,4], agari: 32.9, odds: 3.1, color: "#88ddff" },
  { id: 4, gate: 4, name: "クリムゾンフレア", style: "追込", jockey: "岩田康誠", weight: 502, handicap: 57, last5: [4,2,3,1,2], agari: 32.5, odds: 8.7, color: "#ff7766" },
  { id: 5, gate: 5, name: "エメラルドウィング", style: "先行", jockey: "横山武史", weight: 466, handicap: 55, last5: [3,4,2,3,1], agari: 34.1, odds: 12.3, color: "#66dd88" },
  { id: 6, gate: 6, name: "ロイヤルサンダー", style: "差し", jockey: "松山弘平", weight: 510, handicap: 57, last5: [2,1,4,2,3], agari: 33.4, odds: 15.0, color: "#cc88ff" },
  { id: 7, gate: 7, name: "ブルーオーシャン", style: "先行", jockey: "戸崎圭太", weight: 488, handicap: 57, last5: [5,3,1,4,2], agari: 33.7, odds: 18.5, color: "#4488ff" },
  { id: 8, gate: 8, name: "ファイアストーム", style: "追込", jockey: "C.ルメール", weight: 476, handicap: 57, last5: [3,2,2,1,3], agari: 32.3, odds: 5.5, color: "#ff9944" },
];

const STYLE_ORDER = { "逃げ": 0, "先行": 1, "差し": 2, "追込": 3 };
const STYLE_COLORS = { "逃げ": "#ef4444", "先行": "#f59e0b", "差し": "#3b82f6", "追込": "#8b5cf6" };
const BABA_EFFECT = { "良": 0, "稍重": 0.5, "重": 1.2, "不良": 2.0 };

const FEATURES = [
  { key: "agari", label: "上り3F", weight: 80, importance: 85 },
  { key: "gate", label: "枠順", weight: 55, importance: 60 },
  { key: "style", label: "脚質", weight: 75, importance: 78 },
  { key: "baba", label: "馬場状態", weight: 65, importance: 70 },
  { key: "last5", label: "近5走成績", weight: 70, importance: 72 },
  { key: "odds", label: "オッズ", weight: 50, importance: 55 },
  { key: "jockey", label: "騎手", weight: 60, importance: 63 },
  { key: "weight", label: "馬体重", weight: 30, importance: 35 },
];

// ===== メインアプリ =====
export default function KeibaApp() {
  const [selectedRace, setSelectedRace] = useState(RACES[0]);
  const [baba, setBaba] = useState("良");
  const [horses, setHorses] = useState(INITIAL_HORSES);
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [resultInput, setResultInput] = useState({ first: "", second: "", third: "", time: "" });
  const [savedResults, setSavedResults] = useState([]);
  const [features, setFeatures] = useState(FEATURES);
  const [activeTab, setActiveTab] = useState("horses");
  const [editingHorse, setEditingHorse] = useState(null);
  const [animStep, setAnimStep] = useState(0);
  const animRef = useRef(null);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimProgress(0);
    setSimResult(null);
    setAnimStep(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        const result = calcSimResult();
        setSimResult(result);
        setIsSimulating(false);
        setSimProgress(100);
        startAnim();
      }
      setSimProgress(Math.min(progress, 100));
    }, 120);
  };

  const startAnim = () => {
    let step = 0;
    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= 10) clearInterval(animRef.current);
    }, 180);
  };

  const calcSimResult = () => {
    const babaBonus = BABA_EFFECT[baba];
    const scored = horses.map(h => {
      const avgLast5 = h.last5.reduce((a, b) => a + b, 0) / h.last5.length;
      const styleScore = (4 - STYLE_ORDER[h.style]) * 10;
      const agariScore = (36 - h.agari) * features.find(f => f.key === "agari").weight / 5;
      const babaScore = (h.style === "差し" || h.style === "追込") ? babaBonus * 8 : -babaBonus * 5;
      const gateScore = (9 - h.gate) * features.find(f => f.key === "gate").weight / 15;
      const last5Score = (6 - avgLast5) * features.find(f => f.key === "last5").weight / 8;
      const noise = (Math.random() - 0.5) * 20;
      const total = agariScore + styleScore * 0.4 + babaScore + gateScore + last5Score + noise;
      return { ...h, score: total };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map((h, i) => ({
      ...h,
      rank: i + 1,
      gap: i === 0 ? "---" : `+${((scored[0].score - h.score) * 0.003 + 0.1 * i).toFixed(1)}秒`,
    }));
  };

  const saveResult = () => {
    if (!resultInput.first || !simResult) return;
    const firstHorse = horses.find(h => h.name.includes(resultInput.first) || String(h.gate) === resultInput.first);
    const predicted1st = simResult[0];
    const hit = firstHorse && predicted1st && firstHorse.id === predicted1st.id;

    // 馬場状態による重み更新
    const updatedFeatures = features.map(f => {
      let delta = 0;
      if (!hit) {
        if (f.key === "baba" && (baba === "稍重" || baba === "重" || baba === "不良")) delta = 4;
        if (f.key === "style") delta = 3;
        if (f.key === "agari") delta = 2;
        if (f.key === "weight") delta = -2;
      }
      return {
        ...f,
        importance: Math.min(100, Math.max(10, f.importance + delta + (Math.random() - 0.5) * 3)),
        weight: Math.min(100, Math.max(10, f.weight + delta * 0.5)),
      };
    });
    setFeatures(updatedFeatures);

    setSavedResults(prev => [...prev, {
      race: selectedRace.name,
      baba,
      input: resultInput,
      predicted: simResult.slice(0, 3).map(h => h.name),
      hit,
      time: new Date().toLocaleTimeString("ja-JP"),
    }]);
    setResultInput({ first: "", second: "", third: "", time: "" });
  };

  const updateHorse = (id, field, value) => {
    setHorses(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const getStyleBadge = (style) => {
    const colors = { "逃げ": "bg-red-600", "先行": "bg-amber-500", "差し": "bg-blue-500", "追込": "bg-purple-600" };
    return colors[style] || "bg-gray-500";
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: "#0d2318", minHeight: "100vh", color: "#f0edd8" }}>
      {/* ヘッダー */}
      <Header
        races={RACES}
        selectedRace={selectedRace}
        setSelectedRace={setSelectedRace}
        baba={baba}
        setBaba={setBaba}
      />

      {/* メイン3カラム */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr 300px", gap: "12px", padding: "12px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* 左：出馬表 */}
        <LeftPanel
          horses={horses}
          updateHorse={updateHorse}
          editingHorse={editingHorse}
          setEditingHorse={setEditingHorse}
          getStyleBadge={getStyleBadge}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* 中央：シミュレーター */}
        <CenterPanel
          horses={horses}
          simResult={simResult}
          isSimulating={isSimulating}
          simProgress={simProgress}
          runSimulation={runSimulation}
          animStep={animStep}
          baba={baba}
          getStyleBadge={getStyleBadge}
          selectedRace={selectedRace}
        />

        {/* 右：フィードバック＆研究 */}
        <RightPanel
          simResult={simResult}
          resultInput={resultInput}
          setResultInput={setResultInput}
          saveResult={saveResult}
          savedResults={savedResults}
          features={features}
          setFeatures={setFeatures}
          horses={horses}
        />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d2318; }
        ::-webkit-scrollbar-thumb { background: #2d6a4f; border-radius: 3px; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: #2d6a4f; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #c9a227; cursor: pointer; }
        .gold-border { border: 1px solid #c9a22740; }
        .panel { background: #122b1f; border-radius: 10px; border: 1px solid #1e4d32; }
        .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #c9a227; text-transform: uppercase; }
        .btn-gold { background: linear-gradient(135deg, #c9a227, #e8c84a); color: #0d2318; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-ghost { background: transparent; border: 1px solid #2d6a4f; color: #a0c8a0; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 12px; }
        .btn-ghost:hover { border-color: #c9a227; color: #c9a227; }
        .tab-btn { background: transparent; border: none; cursor: pointer; padding: 6px 12px; font-size: 12px; font-weight: 600; transition: all 0.2s; border-bottom: 2px solid transparent; color: #6b9c7a; }
        .tab-btn.active { color: #c9a227; border-bottom-color: #c9a227; }
        .input-dark { background: #0d2318; border: 1px solid #2d6a4f; border-radius: 6px; color: #f0edd8; padding: 6px 10px; font-size: 13px; width: 100%; outline: none; }
        .input-dark:focus { border-color: #c9a227; }
        .rank-badge { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .anim-horse { transition: all 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// ===== ヘッダー =====
function Header({ races, selectedRace, setSelectedRace, baba, setBaba }) {
  return (
    <div style={{ background: "linear-gradient(90deg, #0a1f14 0%, #1b4d3e 50%, #0a1f14 100%)", borderBottom: "2px solid #c9a22760", padding: "10px 16px" }}>
      <div style={{ maxWidth: "1600px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {/* ロゴ */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "linear-gradient(135deg, #c9a227, #e8c84a)", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🏇</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#e8c84a", letterSpacing: "0.05em" }}>KEIBA ANALYZER</div>
            <div style={{ fontSize: "10px", color: "#6b9c7a", letterSpacing: "0.1em" }}>競馬予想・展開シミュレーター</div>
          </div>
        </div>

        <div style={{ width: "1px", height: "36px", background: "#2d6a4f" }} />

        {/* レース選択 */}
        <div>
          <div style={{ fontSize: "10px", color: "#6b9c7a", marginBottom: "2px" }}>レース選択</div>
          <select
            value={selectedRace.id}
            onChange={e => setSelectedRace(races.find(r => r.id === Number(e.target.value)))}
            style={{ background: "#0d2318", border: "1px solid #2d6a4f", color: "#f0edd8", borderRadius: "6px", padding: "5px 10px", fontSize: "13px", outline: "none" }}
          >
            {races.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* コース */}
        <div style={{ background: "#0d231880", padding: "5px 12px", borderRadius: "6px", border: "1px solid #2d6a4f" }}>
          <span style={{ fontSize: "10px", color: "#6b9c7a" }}>コース　</span>
          <span style={{ fontSize: "13px", color: "#c9a227", fontWeight: "600" }}>{selectedRace.course}</span>
          <span style={{ marginLeft: "8px", fontSize: "10px", background: "#c9a22720", color: "#c9a227", padding: "1px 6px", borderRadius: "4px", border: "1px solid #c9a22750" }}>{selectedRace.grade}</span>
        </div>

        {/* 馬場状態 */}
        <div>
          <div style={{ fontSize: "10px", color: "#6b9c7a", marginBottom: "2px" }}>馬場状態</div>
          <div style={{ display: "flex", gap: "4px" }}>
            {["良", "稍重", "重", "不良"].map(b => (
              <button
                key={b}
                onClick={() => setBaba(b)}
                style={{
                  padding: "4px 10px", borderRadius: "5px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "none",
                  background: baba === b ? "linear-gradient(135deg, #c9a227, #e8c84a)" : "#1e4d3240",
                  color: baba === b ? "#0d2318" : "#6b9c7a",
                  transition: "all 0.2s"
                }}
              >{b}</button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#3d7a55", textAlign: "right" }}>
          <div>※ダミーデータによるデモ動作</div>
          <div style={{ color: "#2d6a4f" }}>実データはJRA/netkeibaと連携想定</div>
        </div>
      </div>
    </div>
  );
}

// ===== 左パネル：出馬表 =====
function LeftPanel({ horses, updateHorse, editingHorse, setEditingHorse, getStyleBadge, activeTab, setActiveTab }) {
  return (
    <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 110px)" }}>
      <div style={{ padding: "10px 12px 0", borderBottom: "1px solid #1e4d32" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span className="section-title">📋 出馬表</span>
          <span style={{ fontSize: "10px", color: "#3d7a55" }}>全{horses.length}頭</span>
        </div>
        <div style={{ display: "flex" }}>
          <button className={`tab-btn ${activeTab === "horses" ? "active" : ""}`} onClick={() => setActiveTab("horses")}>出馬・脚質</button>
          <button className={`tab-btn ${activeTab === "stats" ? "active" : ""}`} onClick={() => setActiveTab("stats")}>過去5走</button>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {activeTab === "horses" ? (
          <HorseTable horses={horses} updateHorse={updateHorse} editingHorse={editingHorse} setEditingHorse={setEditingHorse} getStyleBadge={getStyleBadge} />
        ) : (
          <StatsTable horses={horses} />
        )}
      </div>
    </div>
  );
}

function HorseTable({ horses, updateHorse, editingHorse, setEditingHorse, getStyleBadge }) {
  return (
    <div style={{ padding: "4px 0" }}>
      {horses.map(h => (
        <div key={h.id} style={{ borderBottom: "1px solid #1a3d28", padding: "6px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            {/* 枠 */}
            <div style={{ width: "20px", height: "20px", background: h.color + "33", border: `2px solid ${h.color}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: h.color, flexShrink: 0 }}>
              {h.gate}
            </div>
            {/* 馬名 */}
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#f0edd8", flex: 1 }}>{h.name}</div>
            {/* 脚質 */}
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", color: "white", background: STYLE_COLORS[h.style], fontWeight: "600" }}>{h.style}</span>
            {/* 編集ボタン */}
            <button
              onClick={() => setEditingHorse(editingHorse === h.id ? null : h.id)}
              className="btn-ghost"
              style={{ padding: "2px 6px", fontSize: "10px" }}
            >✏️</button>
          </div>

          <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#6b9c7a", paddingLeft: "26px" }}>
            <span>🏇 {h.jockey}</span>
            <span>⚖️ {h.weight}kg</span>
            <span>⬆️ {h.agari}秒</span>
            <span style={{ color: "#c9a227" }}>📊 {h.odds}倍</span>
          </div>

          {editingHorse === h.id && (
            <div style={{ marginTop: "6px", paddingLeft: "26px", background: "#0d231880", borderRadius: "6px", padding: "8px" }}>
              <div style={{ fontSize: "10px", color: "#6b9c7a", marginBottom: "6px" }}>パラメータ調整</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#6b9c7a" }}>上り3F</div>
                  <input type="number" value={h.agari} step="0.1" min="31" max="38"
                    onChange={e => updateHorse(h.id, "agari", parseFloat(e.target.value))}
                    className="input-dark" style={{ padding: "4px 6px", fontSize: "12px" }} />
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#6b9c7a" }}>脚質</div>
                  <select value={h.style} onChange={e => updateHorse(h.id, "style", e.target.value)}
                    className="input-dark" style={{ padding: "4px 6px", fontSize: "12px" }}>
                    {["逃げ", "先行", "差し", "追込"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatsTable({ horses }) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 90px 50px", gap: "6px", padding: "6px 10px", fontSize: "10px", color: "#3d7a55", borderBottom: "1px solid #1e4d32" }}>
        <span>枠</span><span>馬名</span><span>近5走</span><span>上り3F</span>
      </div>
      {horses.map(h => (
        <div key={h.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 90px 50px", gap: "6px", padding: "6px 10px", borderBottom: "1px solid #1a3d28", alignItems: "center" }}>
          <div style={{ width: "18px", height: "18px", background: h.color + "33", border: `1.5px solid ${h.color}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: h.color }}>
            {h.gate}
          </div>
          <span style={{ fontSize: "11px", color: "#d4d0b8" }}>{h.name}</span>
          <div style={{ display: "flex", gap: "2px" }}>
            {h.last5.map((r, i) => (
              <div key={i} style={{
                width: "14px", height: "14px", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: "700",
                background: r === 1 ? "#c9a22730" : r <= 3 ? "#1e4d3240" : "#3d0a0a30",
                color: r === 1 ? "#c9a227" : r <= 3 ? "#6b9c7a" : "#7a3d3d"
              }}>{r}</div>
            ))}
          </div>
          <span style={{ fontSize: "11px", color: "#88bbaa", textAlign: "center" }}>{h.agari}</span>
        </div>
      ))}
    </div>
  );
}

// ===== 中央パネル：シミュレーター =====
function CenterPanel({ horses, simResult, isSimulating, simProgress, runSimulation, animStep, baba, getStyleBadge, selectedRace }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* コースビジュアライザー */}
      <div className="panel" style={{ padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span className="section-title">🏟️ 展開シミュレーター</span>
          <button
            className="btn-gold"
            onClick={runSimulation}
            disabled={isSimulating}
            style={{ padding: "8px 20px", fontSize: "13px", opacity: isSimulating ? 0.7 : 1 }}
          >
            {isSimulating ? `シミュレーション中... ${Math.round(simProgress)}%` : "▶ 予想シミュレーションを実行"}
          </button>
        </div>

        {isSimulating && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ background: "#0d2318", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #c9a227, #e8c84a)", width: `${simProgress}%`, transition: "width 0.15s", borderRadius: "4px" }} />
            </div>
          </div>
        )}

        {/* コース図 */}
        <CourseVisualizer horses={horses} simResult={simResult} animStep={animStep} selectedRace={selectedRace} />
      </div>

      {/* 予測結果 */}
      {simResult && (
        <div className="panel" style={{ padding: "14px" }}>
          <div style={{ marginBottom: "10px" }}>
            <span className="section-title">🏆 AI予測着順</span>
            <span style={{ fontSize: "10px", color: "#3d7a55", marginLeft: "8px" }}>馬場: {baba} / {selectedRace.course}</span>
          </div>
          <PredictionResult simResult={simResult} />
        </div>
      )}

      {/* 脚質分布 */}
      <div className="panel" style={{ padding: "14px" }}>
        <div style={{ marginBottom: "8px" }}>
          <span className="section-title">📊 脚質・オッズ分布</span>
        </div>
        <StyleDistribution horses={horses} simResult={simResult} />
      </div>
    </div>
  );
}

function CourseVisualizer({ horses, simResult, animStep, selectedRace }) {
  const stages = ["スタート", "3コーナー", "4コーナー", "直線入口", "ゴール"];
  const currentStage = Math.min(Math.floor(animStep / 2), stages.length - 1);

  const sortedForDisplay = simResult
    ? [...simResult].sort((a, b) => STYLE_ORDER[a.style] - STYLE_ORDER[b.style])
    : [...horses].sort((a, b) => STYLE_ORDER[a.style] - STYLE_ORDER[b.style]);

  return (
    <div style={{ background: "#0a1f14", borderRadius: "8px", padding: "12px", border: "1px solid #1e4d32" }}>
      {/* コース情報バー */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px", overflowX: "auto" }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: i <= currentStage && simResult ? "#c9a227" : "#2d6a4f",
              transition: "all 0.3s"
            }} />
            <span style={{ fontSize: "10px", color: i <= currentStage && simResult ? "#c9a227" : "#3d7a55" }}>{s}</span>
            {i < stages.length - 1 && <div style={{ width: "20px", height: "1px", background: "#2d6a4f" }} />}
          </div>
        ))}
      </div>

      {/* 馬のポジション表示 */}
      <div style={{ position: "relative", height: "160px", background: "linear-gradient(180deg, #0a3020 0%, #1b5e40 40%, #0f4030 100%)", borderRadius: "6px", overflow: "hidden" }}>
        {/* 芝のライン */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${25 + i * 30}px`, height: "1px", background: "#ffffff08" }} />
        ))}

        {/* ゴールライン */}
        {simResult && (
          <div style={{ position: "absolute", right: "16px", top: 0, bottom: 0, width: "2px", background: "#c9a22760", borderRight: "2px dashed #c9a22760" }}>
            <span style={{ position: "absolute", top: "4px", right: "4px", fontSize: "9px", color: "#c9a227" }}>GOAL</span>
          </div>
        )}

        {sortedForDisplay.slice(0, 8).map((h, i) => {
          const baseX = simResult
            ? Math.min(88, 20 + (animStep / 10) * 68 - (h.rank - 1) * 5)
            : 15;
          const x = `${baseX}%`;
          const y = 12 + i * 18;
          return (
            <div key={h.id} className="anim-horse" style={{
              position: "absolute", left: x, top: `${y}px`,
              transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: "4px"
            }}>
              <div style={{
                width: "28px", height: "14px", borderRadius: "7px",
                background: h.color + "cc",
                border: `1.5px solid ${h.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: "700", color: "#0d2318",
                boxShadow: simResult && h.rank === 1 ? `0 0 8px ${h.color}` : "none",
              }}>
                {h.gate}枠
              </div>
              {simResult && h.rank <= 3 && (
                <div style={{ fontSize: "9px", color: h.rank === 1 ? "#c9a227" : "#aaa", fontWeight: "700" }}>
                  {h.rank === 1 ? "🥇" : h.rank === 2 ? "🥈" : "🥉"}
                </div>
              )}
            </div>
          );
        })}

        {!simResult && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#2d6a4f", fontSize: "13px" }}>
            「シミュレーションを実行」ボタンで展開予測を開始
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
        {["逃げ", "先行", "差し", "追込"].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: STYLE_COLORS[s] }} />
            <span style={{ fontSize: "10px", color: "#6b9c7a" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionResult({ simResult }) {
  const top3 = simResult.slice(0, 3);
  const rest = simResult.slice(3);

  const rankColors = ["#c9a227", "#aaaaaa", "#cd7f32"];
  const rankBg = ["#c9a22720", "#aaaaaa20", "#cd7f3220"];

  return (
    <div>
      {/* 1〜3着 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        {top3.map((h, i) => (
          <div key={h.id} style={{ background: rankBg[i], border: `1px solid ${rankColors[i]}40`, borderRadius: "8px", padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: rankColors[i], fontWeight: "700", marginBottom: "4px" }}>{i + 1}着予測</div>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: h.color + "33", border: `2px solid ${h.color}`, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: h.color }}>
              {h.gate}
            </div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#f0edd8", marginBottom: "2px" }}>{h.name}</div>
            <div style={{ fontSize: "10px", color: rankColors[i] }}>{h.gap}</div>
            <div style={{ fontSize: "10px", color: "#3d7a55", marginTop: "2px" }}>{h.odds}倍</div>
          </div>
        ))}
      </div>

      {/* 4着以下 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {rest.map(h => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#0d231840", borderRadius: "5px" }}>
            <span style={{ fontSize: "10px", color: "#3d7a55", width: "16px" }}>{h.rank}着</span>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: h.color + "33", border: `1px solid ${h.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: h.color }}>{h.gate}</div>
            <span style={{ fontSize: "11px", color: "#a0a080", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
            <span style={{ fontSize: "10px", color: "#3d7a55" }}>{h.gap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleDistribution({ horses, simResult }) {
  const styleCounts = { "逃げ": 0, "先行": 0, "差し": 0, "追込": 0 };
  horses.forEach(h => { if (styleCounts[h.style] !== undefined) styleCounts[h.style]++; });
  const max = Math.max(...Object.values(styleCounts));

  return (
    <div style={{ display: "flex", gap: "16px" }}>
      {/* 脚質分布 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#3d7a55", marginBottom: "6px" }}>脚質内訳</div>
        {Object.entries(styleCounts).map(([style, count]) => (
          <div key={style} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
            <span style={{ fontSize: "10px", color: STYLE_COLORS[style], width: "28px" }}>{style}</span>
            <div style={{ flex: 1, background: "#0d2318", borderRadius: "3px", height: "8px" }}>
              <div style={{ height: "100%", background: STYLE_COLORS[style] + "aa", borderRadius: "3px", width: `${(count / max) * 100}%`, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#6b9c7a" }}>{count}頭</span>
          </div>
        ))}
      </div>

      {/* オッズ分布 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "10px", color: "#3d7a55", marginBottom: "6px" }}>オッズ分布（低→高）</div>
        {[...horses].sort((a, b) => a.odds - b.odds).slice(0, 5).map(h => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", color: h.color, width: "14px" }}>{h.gate}</span>
            <div style={{ flex: 1, background: "#0d2318", borderRadius: "3px", height: "7px" }}>
              <div style={{ height: "100%", background: h.color + "88", borderRadius: "3px", width: `${(1 / h.odds) * 300}%`, maxWidth: "100%" }} />
            </div>
            <span style={{ fontSize: "10px", color: "#c9a227" }}>{h.odds}倍</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== 右パネル：フィードバック＆研究 =====
function RightPanel({ simResult, resultInput, setResultInput, saveResult, savedResults, features, setFeatures, horses }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>
      {/* 結果入力 */}
      <div className="panel" style={{ padding: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <span className="section-title">📝 実際のレース結果を入力</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {["first", "second", "third"].map((k, i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: ["#c9a227", "#aaaaaa", "#cd7f32"][i], width: "28px", fontWeight: "700" }}>{i + 1}着</span>
              <input
                placeholder="馬名または枠番"
                value={resultInput[k]}
                onChange={e => setResultInput(prev => ({ ...prev, [k]: e.target.value }))}
                className="input-dark"
                style={{ fontSize: "12px", padding: "5px 8px" }}
              />
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#6b9c7a", width: "28px" }}>タイム</span>
            <input
              placeholder="例: 2:24.5"
              value={resultInput.time}
              onChange={e => setResultInput(prev => ({ ...prev, time: e.target.value }))}
              className="input-dark"
              style={{ fontSize: "12px", padding: "5px 8px" }}
            />
          </div>
          <button
            className="btn-gold"
            onClick={saveResult}
            disabled={!simResult || !resultInput.first}
            style={{ padding: "8px", fontSize: "12px", opacity: (!simResult || !resultInput.first) ? 0.5 : 1, marginTop: "4px" }}
          >
            💾 結果を保存＆学習更新
          </button>
        </div>

        {/* 履歴 */}
        {savedResults.length > 0 && (
          <div style={{ marginTop: "10px", borderTop: "1px solid #1e4d32", paddingTop: "8px" }}>
            <div style={{ fontSize: "10px", color: "#3d7a55", marginBottom: "4px" }}>保存済み結果（{savedResults.length}件）</div>
            {savedResults.slice(-3).reverse().map((r, i) => (
              <div key={i} style={{ background: r.hit ? "#0d3a1a" : "#3a0d0d", border: `1px solid ${r.hit ? "#2d6a4f" : "#6a2d2d"}`, borderRadius: "5px", padding: "6px 8px", marginBottom: "4px", fontSize: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#a0c8a0" }}>{r.race.replace("R ", "R\n")}</span>
                  <span style={{ color: r.hit ? "#4ade80" : "#f87171" }}>{r.hit ? "✅ 的中" : "❌ 外れ"}</span>
                </div>
                <div style={{ color: "#6b9c7a", marginTop: "2px" }}>予測: {r.predicted.join(" → ")} | {r.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 要素重要度ダッシュボード */}
      <div className="panel" style={{ padding: "12px" }}>
        <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="section-title">🔬 要素重要度研究</span>
          <span style={{ fontSize: "9px", color: "#3d7a55" }}>結果入力で自動更新</span>
        </div>

        <FeatureDashboard features={features} setFeatures={setFeatures} />
      </div>

      {/* 重みチューニング */}
      <div className="panel" style={{ padding: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <span className="section-title">🎛️ 予測重みチューニング</span>
        </div>
        <WeightTuner features={features} setFeatures={setFeatures} />
      </div>
    </div>
  );
}

function FeatureDashboard({ features }) {
  const sorted = [...features].sort((a, b) => b.importance - a.importance);

  return (
    <div>
      {sorted.map((f, i) => {
        const stars = Math.round(f.importance / 20);
        return (
          <div key={f.key} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: i < 3 ? "#c9a227" : "#a0c8a0" }}>{f.label}</span>
                <span style={{ fontSize: "10px", color: "#c9a22780" }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
              </div>
              <span style={{ fontSize: "10px", color: i < 3 ? "#c9a227" : "#6b9c7a", fontWeight: i < 3 ? "700" : "400" }}>
                {Math.round(f.importance)}%
              </span>
            </div>
            <div style={{ background: "#0d2318", borderRadius: "3px", height: "6px" }}>
              <div style={{
                height: "100%",
                background: i < 3 ? "linear-gradient(90deg, #c9a227, #e8c84a)" : "#2d6a4f",
                borderRadius: "3px",
                width: `${f.importance}%`,
                transition: "width 0.8s ease-out"
              }} />
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: "10px", background: "#0d231840", borderRadius: "6px", padding: "8px", fontSize: "10px" }}>
        <div style={{ color: "#c9a227", fontWeight: "700", marginBottom: "4px" }}>📈 相関が高い要素</div>
        <div style={{ color: "#6b9c7a" }}>{sorted.slice(0, 3).map(f => f.label).join("・")}</div>
        <div style={{ color: "#7a3d3d", fontWeight: "700", marginTop: "6px", marginBottom: "4px" }}>📉 相関が低い要素</div>
        <div style={{ color: "#6b5555" }}>{sorted.slice(-2).map(f => f.label).join("・")}</div>
      </div>
    </div>
  );
}

function WeightTuner({ features, setFeatures }) {
  const updateWeight = (key, val) => {
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, weight: val } : f));
  };

  return (
    <div>
      {features.map(f => (
        <div key={f.key} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
            <span style={{ fontSize: "11px", color: "#a0c8a0" }}>{f.label}</span>
            <span style={{ fontSize: "11px", color: "#c9a227", fontWeight: "700", width: "30px", textAlign: "right" }}>{f.weight}</span>
          </div>
          <input
            type="range" min="0" max="100" value={f.weight}
            onChange={e => updateWeight(f.key, Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      ))}
      <div style={{ fontSize: "10px", color: "#3d7a55", marginTop: "4px" }}>
        ※ スライダーを動かすと次回シミュレーションに反映されます
      </div>
    </div>
  );
}
