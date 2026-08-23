const grades = ["0", "0.5+", "1+", "2+", "3+", "4+"];
const SUBGROUP_REFERENCE_WORKUP_THRESHOLD = 88;
const manualFrontGrades = [
  {label:"0", value:"0"}, {label:"0.5+", value:"0.5+"},
  {label:"1+ (MF)", value:"mf1"}, {label:"2+ (MF)", value:"mf2"},
  {label:"3+ (MF)", value:"mf3"}, {label:"4+", value:"4+"}
];
const manualBackGrades = grades.map(grade => ({label:grade, value:grade}));
const tests = [
  { id: "antiA", name: "Anti-A", desc: "A 항원", group: "forward" },
  { id: "antiB", name: "Anti-B", desc: "B 항원", group: "forward" },
  { id: "antiD", name: "Anti-D", desc: "RhD 항원", group: "forward" },
  { id: "a1cell", name: "A cell", desc: "역형검사 시약혈구", group: "reverse" },
  { id: "bcell", name: "B cell", desc: "Anti-B 확인", group: "reverse" }
];
let initialABOResults = null;
let aboCaseHistory = {initial:null,manualIS:null,rt15:null};
const createABOCaseState = () => ({
  has_initial_forward_weak:false,
  has_manual_forward_weak:false,
  has_forward_mf:false,
  subgroup_suspected:false,
  subgroup_workup_required:false
});
let aboCaseState = createABOCaseState();

function recordABOHistory(stage, results) {
  aboCaseHistory[stage] = results ? {...results} : null;
  if (!results) return;
  const forwardValues = [results.antiA,results.antiB];
  const hasWeak = forwardValues.some(value => isMixedReaction(value) || (reactionStrength(value) > 0 && reactionStrength(value) < 4));
  const hasMF = forwardValues.some(isMixedReaction);
  if (stage === "initial") aboCaseState.has_initial_forward_weak ||= hasWeak;
  if (stage === "manualIS") aboCaseState.has_manual_forward_weak ||= hasWeak;
  aboCaseState.has_forward_mf ||= hasMF;
  aboCaseState.subgroup_suspected ||= aboCaseState.has_initial_forward_weak || aboCaseState.has_manual_forward_weak || aboCaseState.has_forward_mf;
}

const valueOf = grade => ({"0":0,"0.5+":0.5,"1+":1,"2+":2,"3+":3,"4+":4})[grade];

function renderInputs() {
  tests.forEach(test => {
    const row = document.createElement("div");
    row.className = "test-row";
    row.innerHTML = `<div class="test-name">${test.name}<small>${test.desc}</small></div><div class="grade-options">${grades.map((grade, i) => `<input type="radio" id="${test.id}-${i}" name="${test.id}" value="${grade}" ${i === 0 ? "checked" : ""}><label for="${test.id}-${i}">${grade}</label>`).join("")}</div>`;
    document.getElementById(test.group === "forward" ? "forwardTests" : "reverseTests").appendChild(row);
  });
}

function readResults() {
  return Object.fromEntries(tests.map(test => [test.id, valueOf(document.querySelector(`input[name="${test.id}"]:checked`).value)]));
}

function expectedGroup(a, b) {
  if (a && b) return "AB";
  if (a) return "A";
  if (b) return "B";
  return "O";
}

function reverseGroup(a1, b) {
  if (a1 && b) return "O";
  if (!a1 && b) return "A";
  if (a1 && !b) return "B";
  return "AB";
}

// 사용자 제공 정상 성상표: ABO 항원과 RhD 양성은 정확히 4+,
// 역형검사에서 필요한 항체 반응은 2+ 이상이어야 한다.
const normalPatterns = [
  { type:"A",  rh:"+", antiA:4, antiB:0, antiD:4, a1cell:[0,0], bcell:[2,4] },
  { type:"B",  rh:"+", antiA:0, antiB:4, antiD:4, a1cell:[2,4], bcell:[0,0] },
  { type:"O",  rh:"+", antiA:0, antiB:0, antiD:4, a1cell:[2,4], bcell:[2,4] },
  { type:"AB", rh:"+", antiA:4, antiB:4, antiD:4, a1cell:[0,0], bcell:[0,0] },
  { type:"A",  rh:"-", antiA:4, antiB:0, antiD:0, a1cell:[0,0], bcell:[2,4] },
  { type:"B",  rh:"-", antiA:0, antiB:4, antiD:0, a1cell:[2,4], bcell:[0,0] },
  { type:"O",  rh:"-", antiA:0, antiB:0, antiD:0, a1cell:[2,4], bcell:[2,4] },
  { type:"AB", rh:"-", antiA:4, antiB:4, antiD:0, a1cell:[0,0], bcell:[0,0] }
];

function findNormalPattern(r) {
  return normalPatterns.find(p =>
    r.antiA === p.antiA && r.antiB === p.antiB && r.antiD === p.antiD &&
    r.a1cell >= p.a1cell[0] && r.a1cell <= p.a1cell[1] &&
    r.bcell >= p.bcell[0] && r.bcell <= p.bcell[1]
  );
}

function findNormalABOPattern(r) {
  return normalPatterns.find(p =>
    r.antiA === p.antiA && r.antiB === p.antiB &&
    r.a1cell >= p.a1cell[0] && r.a1cell <= p.a1cell[1] &&
    r.bcell >= p.bcell[0] && r.bcell <= p.bcell[1]
  );
}

function buildAnalysis(r) {
  const pos = x => x > 0;
  const forward = expectedGroup(pos(r.antiA), pos(r.antiB));
  const reverse = reverseGroup(pos(r.a1cell), pos(r.bcell));
  const patientType = document.getElementById("patientType").value;
  const previous = document.getElementById("previousType").value;
  const histories = [...document.querySelectorAll('.checks input:checked')].map(x => x.value);
  const reverseApplicable = patientType !== "infant";
  const mismatch = forward !== reverse;
  const weakForward = (r.antiA > 0 && r.antiA < 4) || (r.antiB > 0 && r.antiB < 4);
  const weakReverse = (r.a1cell > 0 && r.a1cell < 2) || (r.bcell > 0 && r.bcell < 2);
  const weakD = r.antiD > 0 && r.antiD < 4;
  const historyMismatch = previous && previous !== forward;
  const normalPattern = findNormalPattern(r);
  const normalABOPattern = findNormalABOPattern(r);
  const aboDiscrepancy = !normalABOPattern || Boolean(historyMismatch);
  // 정상으로 정의된 Rh± A/B/O/AB 8개 성상과 정확히 일치할 때만 정상이다.
  const discrepancy = !normalPattern || historyMismatch;
  const causes = [];
  const steps = ["환자·검체 식별, 라벨, 시약 유효성, 장비/QC 및 기록 오류를 확인하고 동일 검체로 정형·역형검사를 반복합니다."];

  if (patientType === "infant") {
    causes.push("연령에 따른 역형검사 비적용");
    steps.push("생후 4개월 미만은 역형검사로 ABO를 확정하지 않습니다. 모체 유래 항체와 신생아 수혈 지침을 확인합니다.");
  }
  if (mismatch) {
    const expected = {O:{a1:true,b:true},A:{a1:false,b:true},B:{a1:true,b:false},AB:{a1:false,b:false}}[forward];
    const missingReverse = (expected.a1 && !pos(r.a1cell)) || (expected.b && !pos(r.bcell));
    const extraReverse = (!expected.a1 && pos(r.a1cell)) || (!expected.b && pos(r.bcell));
    if (missingReverse) {
      causes.push("역형 항체 약화/소실", "연령·면역저하", "혈장 희석");
      steps.push("역형검사의 혈청:혈구 비율과 시약혈구를 확인하고, 실온 반응시간 연장 또는 기관 SOP에 따른 저온 반응을 시행합니다.");
    }
    if (extraReverse) {
      causes.push("예기치 않은 항체", "한랭 자가항체", "연전형성");
      steps.push("항체선별검사와 자가대조를 시행하고, 필요 시 DAT 및 37℃에서 역형검사를 반복하여 한랭반응성 항체 간섭을 평가합니다.");
      if ((forward === "A" || forward === "AB") && pos(r.a1cell)) {
        causes.push("A₂/A₂B 및 anti-A₁ 가능");
        steps.push("A₂ cell, anti-A₁ lectin 및 필요 시 anti-H로 A 아형과 anti-A₁ 여부를 확인합니다.");
      }
    }
  }
  if (weakForward) {
    causes.push("약한 A/B 아형", "질환에 따른 항원 약화");
    steps.push("환자 적혈구를 세척하여 재검하고 anti-A,B를 추가합니다. 필요 시 anti-A₁ lectin·anti-H, 흡착/용출, 타액 분비형 검사 또는 ABO 유전형 검사를 고려합니다.");
  }
  if (weakReverse) {
    causes.push("약한 역형 반응");
    if (!steps.some(s => s.includes("반응시간 연장"))) steps.push("역형검사의 혈청:혈구 비율을 확인하고 실온 반응시간 연장 등 기관 SOP의 민감도 향상법으로 재검합니다.");
  }
  if (historyMismatch || histories.includes("transfusion") || histories.includes("transplant")) {
    causes.push("수혈/이식에 의한 두 적혈구 집단");
    steps.push("이전 혈액형, 최근 수혈제제의 ABO형, 조혈모세포 이식 공여자형과 이식 경과를 확인하고 혼합시야 반응 여부를 재관찰합니다.");
  }
  if (histories.includes("immune")) causes.push("항체 생성 저하 가능");
  if (histories.includes("pregnancy")) causes.push("임신 관련 항체 가능");
  if (weakD) {
    causes.push("약한/변이 D 가능");
    steps.push("Anti-D 결과는 ABO 불일치와 별도로 평가합니다. 다른 clone의 anti-D, 대조시험 및 기관 기준에 따른 weak D/부분 D 또는 RHD 유전형 검사를 고려합니다.");
  }
  if (!discrepancy) {
    causes.push("정형·역형 일치");
    steps.push("이전 결과와 비교하고, 기관의 ABO/RhD 확정 및 이중검체 확인 절차를 적용합니다.");
  }
  if (!normalPattern) {
    causes.unshift("정상 8개 성상 기준에서 벗어남");
  }
  if (!causes.length) causes.push("특이 불일치 패턴 없음");
  steps.push(discrepancy
    ? "불일치가 완전히 해소될 때까지 ABO/RhD형을 확정하지 말고, 긴급 수혈은 기관 SOP와 수혈의학 전문의 지시에 따라 안전한 제제를 선택합니다."
    : "정상 성상 기준을 충족했습니다. 최종 보고 전 기관 SOP에 따른 결과 검증 절차를 완료합니다.");

  return {
    forward: normalPattern ? normalPattern.type : forward,
    reverse: reverseApplicable ? reverse : "판정 제외",
    rh: normalPattern ? `Rh${normalPattern.rh}` : r.antiD === 4 ? "Rh+ 추정" : r.antiD === 0 ? "Rh− 추정" : "RhD 비정상 반응",
    finalType: normalPattern ? `Rh${normalPattern.rh} ${normalPattern.type}형` : null,
    discrepancy, aboDiscrepancy, weakD, antiDValue:r.antiD, antiDReview:r.antiD < 4, hasPreviousResult:Boolean(previous), causes:[...new Set(causes)], steps
  };
}

function showResult(a) {
  const status = a.discrepancy ? "ABO 불일치가 확인되었습니다" : "정형·역형이 일치합니다";
  const subtitle = a.discrepancy ? "정상 8개 성상에 해당하지 않습니다. 결과 확정 전 아래 순서로 원인을 확인하세요." : `${a.finalType} 정상 성상 기준을 충족합니다.`;
  document.getElementById("emptyState").hidden = true;
  const el = document.getElementById("resultState");
  el.hidden = false;
  el.innerHTML = `<span class="status-chip ${a.discrepancy ? "" : "ok"}"><i></i>${a.discrepancy ? "DISCREPANCY" : "CONSISTENT"}</span>
    <h2 class="result-title">${status}</h2><p class="result-subtitle">${subtitle}</p>
    <div class="type-summary"><div class="type-box"><small>${a.finalType ? "최종 패턴" : "정형검사 추정"}</small><strong>${a.finalType || `${a.forward}형 · ${a.rh}`}</strong></div><div class="type-box"><small>역형검사 추정</small><strong>${a.reverse}${a.reverse === "판정 제외" ? "" : "형"}</strong></div></div>
    ${a.antiDReview ? renderRhDGuidance({needsHistoryReview:true}, a.hasPreviousResult) : ""}
    ${a.antiDReview && !a.hasPreviousResult ? `<div class="is-callout weak-d-callout"><div><small>NEXT STEP · WEAK D TEST</small><strong>Weak D 검사를 진행하세요</strong><p>과거 결과가 없어 Weak D 확인검사가 필요합니다.${a.aboDiscrepancy ? " ABO 불일치 수기 IS 재검과 함께 진행하세요." : ""}</p></div><button type="button" id="startWeakDButton">Weak D 결과 입력 <span>→</span></button></div>` : ""}
    ${a.aboDiscrepancy ? `<div class="is-callout"><div><small>NEXT STEP · MANUAL IS</small><strong>수기법 IS로 재검하세요</strong><p>ABO 불일치 재확인을 위해 성상을 다시 입력하세요. Anti-D는 별도 경로로 평가합니다.</p></div><button type="button" id="startIsButton">IS 재검 입력 <span>→</span></button></div>` : ""}
    <div id="isArea"></div>
    <div id="weakDArea"></div>
    <div class="cause-box"><h3>가능성이 있는 항목</h3><div class="cause-list">${a.causes.map(c => `<span>${c}</span>`).join("")}</div></div>
    <div class="workflow"><h3>권장 확인검사 순서</h3><ol>${a.steps.map((s,i) => `<li data-step="${String(i+1).padStart(2,"0")}">${s}</li>`).join("")}</ol></div>
    <p class="warning">이 결과는 입력값 기반의 규칙형 안내이며 진단이나 최종 혈액형 판정이 아닙니다. 검사법·시약 제조사 지침·기관 SOP가 우선합니다.</p>`;
  if (a.aboDiscrepancy) document.getElementById("startIsButton").addEventListener("click", showISForm);
  if (a.antiDReview && !a.hasPreviousResult) document.getElementById("startWeakDButton").addEventListener("click", () => showWeakDForm(a.antiDValue));
  if (window.innerWidth < 980) document.querySelector(".result-panel").scrollIntoView({behavior:"smooth", block:"start"});
}

function showISForm() {
  const area = document.getElementById("isArea");
  area.innerHTML = `<div class="is-form"><div class="is-form-head"><span>02</span><div><strong>수기법 IS 결과</strong><small>Immediate Spin 재검 성상</small></div></div>
    ${renderManualGroup("is", "Front Typing", "정형검사", tests.filter(test => test.group === "forward"), manualFrontGrades)}
    ${renderManualGroup("is", "Back Typing", "역형검사", tests.filter(test => test.group === "reverse"), manualBackGrades)}
    <button type="button" class="is-analyze-button" id="analyzeIsButton">IS 결과 재판정 <span>→</span></button>
    <div id="isResult"></div></div>`;
  document.getElementById("startIsButton").hidden = true;
  document.getElementById("analyzeIsButton").addEventListener("click", analyzeIS);
  area.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function weakDGradeSelect(name, label) {
  return `<label class="weak-d-select"><span>${label}</span><select name="${name}">${grades.map(grade => `<option value="${grade}">${grade}</option>`).join("")}</select></label>`;
}

function showWeakDForm(antiDValue) {
  const includePlate = antiDValue >= 0.5;
  const methods = includePlate ? ["Plate법","Tube법","IAT"] : ["Tube법","IAT"];
  const area = document.getElementById("weakDArea");
  area.innerHTML = `<div class="is-form weak-d-form"><div class="is-form-head"><span>02</span><div><strong>Weak D 검사 결과</strong><small>과거 결과가 없는 Anti-D 4+ 미만 검체</small></div></div>
    <div class="weak-d-section"><h3>Testing for Weak D</h3><div class="weak-d-table ${includePlate ? "four-columns" : "three-columns"}" role="table" aria-label="Weak D 검사 결과">
      <div class="weak-d-head">Anti-D Reagents</div>${methods.map(method => `<div class="weak-d-head">${method}</div>`).join("")}
      ${["Ortho","SHIDIA","Control"].map(reagent => `<div class="weak-d-reagent">${reagent}</div>${methods.map(method => weakDGradeSelect(`weakd-${reagent.toLowerCase()}-${method === "Plate법" ? "plate" : method === "Tube법" ? "tube" : "iat"}`, method)).join("")}`).join("")}
    </div></div>
    <div class="weak-d-section"><h3>Rh Subtyping</h3><div class="rh-subtyping-grid">${["Anti-C","Anti-E","Anti-c","Anti-e"].map((reagent, index) => weakDGradeSelect(`rh-sub-${index}`, reagent)).join("")}</div></div>
    <div class="weak-d-section"><h3>DAT 검사 결과</h3><div class="dat-options">${["Negative","Weak positive","Positive"].map((result, index) => `<input type="radio" id="dat-${index}" name="dat-result" value="${result}" ${index === 0 ? "checked" : ""}><label for="dat-${index}">${result}</label>`).join("")}</div></div>
    <button type="button" class="is-analyze-button" id="saveWeakDButton">Weak D 검사 결과 확인 <span>→</span></button><div id="weakDResult"></div></div>`;
  document.getElementById("startWeakDButton").hidden = true;
  document.getElementById("saveWeakDButton").addEventListener("click", () => summarizeWeakDResults(includePlate));
  area.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function summarizeWeakDResults(includePlate) {
  const value = name => document.querySelector(`[name="${name}"]`).value;
  const methodKeys = includePlate ? ["plate","tube","iat"] : ["tube","iat"];
  const strength = (reagent, method) => valueOf(value(`weakd-${reagent}-${method}`));
  const reagentResults = reagent => Object.fromEntries(methodKeys.map(method => [method,strength(reagent,method)]));
  const ortho = reagentResults("ortho");
  const shidia = reagentResults("shidia");
  const control = reagentResults("control");
  const controlValid = methodKeys.every(method => control[method] === 0);
  const antiDAnyPositive = methodKeys.some(method => ortho[method] > 0 || shidia[method] > 0);
  const antiDAllNegative = !antiDAnyPositive;
  const reagentDiscrepant = methodKeys.some(method => (ortho[method] > 0) !== (shidia[method] > 0));
  const directKeys = includePlate ? ["plate","tube"] : ["tube"];
  const iatEnhanced = [ortho,shidia].some(result => result.iat > 0 && result.iat > Math.max(...directKeys.map(method => result[method])));
  const tableRows = ["ortho","shidia","control"].map(reagent => `${reagent.toUpperCase()}: ${includePlate ? `Plate ${value(`weakd-${reagent}-plate`)} / ` : ""}Tube ${value(`weakd-${reagent}-tube`)} / IAT ${value(`weakd-${reagent}-iat`)}`);
  const rhNames = ["C","E","c","e"];
  const rhStrengths = rhNames.map((name,index) => ({name,value:value(`rh-sub-${index}`),positive:value(`rh-sub-${index}`) !== "0"}));
  const rhPhenotype = rhStrengths.map(item => `${item.name}${item.positive ? "+" : "−"}`).join(" ");
  const rhResults = rhStrengths.map(item => `Anti-${item.name} ${item.value}`);
  const cOrEPositive = value("rh-sub-0") !== "0" || value("rh-sub-1") !== "0";
  const needsDelOpinion = controlValid && !reagentDiscrepant && antiDAllNegative && cOrEPositive;
  const dat = document.querySelector('[name="dat-result"]:checked').value;
  const datPositive = dat === "Weak positive" || dat === "Positive";
  const needsZZAP = datPositive;
  const validity = controlValid ? "VALID · Control 모두 음성" : "INVALID / INTERFERENCE CHECK REQUIRED · Control 양성";
  let antiDInterpretation;
  let possibleInterpretation;
  if (!controlValid) {
    antiDInterpretation = "자동 확정 보류";
    possibleInterpretation = "검사 유효성 또는 간섭 확인 필요";
  } else if (reagentDiscrepant) {
    antiDInterpretation = "DISCREPANT RhD REACTION";
    possibleInterpretation = "ORTHO와 SHIDIA 반응이 불일치하여 자동 확정할 수 없습니다.";
  } else if (antiDAnyPositive) {
    antiDInterpretation = "D antigen detected";
    possibleInterpretation = iatEnhanced ? "Serologic weak D phenotype 가능성" : "Anti-D 반응 확인";
  } else {
    antiDInterpretation = "Weak D not detected";
    possibleInterpretation = needsDelOpinion ? "Weak D not detected. DEL phenotype은 배제되지 않으며 기관 기준에 따른 추가 확인이 필요할 수 있습니다." : "유효한 Anti-D 검사에서 반응이 검출되지 않았습니다.";
  }
  const nextActions = [];
  if (!controlValid) nextActions.push("Control 양성 원인과 검사 간섭을 확인하고 기관 SOP에 따라 결과를 처리하세요.");
  if (reagentDiscrepant) nextActions.push("ORTHO와 SHIDIA 불일치 원인을 확인하고 자동 확정하지 마세요.");
  if (antiDAnyPositive) nextActions.push("Tube법으로 15분 방치 후 결과를 확인하세요.");
  if (needsZZAP) nextActions.push("DAT가 양성이므로 ZZAP 처리 후 확인하는 것을 권장합니다.");
  if (needsDelOpinion) nextActions.push("DEL형을 배제할 수 없으므로 Weak D opinion을 입력하세요.");
  nextActions.push("혈청학적 결과만으로 molecular weak D type 또는 partial D subtype을 확정하지 마세요.");
  nextActions.push("필요 시 기관 SOP에 따른 추가 검사 또는 RHD genotyping을 검토하세요.");
  const box = document.getElementById("weakDResult");
  box.className = "is-outcome unresolved";
  box.innerHTML = `<span>WEAK D AUTO INTERPRETATION</span><strong>Weak D 자동 해석 결과</strong><div class="weak-d-interpretation">
    <section><small>01 · 검사 유효성</small><b>${validity}</b><p>${tableRows.join(" · ")}</p></section>
    <section><small>02 · Anti-D 해석</small><b>${antiDInterpretation}</b><p>ORTHO와 SHIDIA의 ${includePlate ? "Plate / Tube / IAT" : "Tube / IAT"} 반응을 비교했습니다.</p></section>
    <section><small>03 · Rh phenotype</small><b>${rhPhenotype}</b><p>${rhResults.join(" · ")}</p></section>
    <section><small>04 · DAT</small><b>${dat || "미시행"}</b>${datPositive ? "<p>DAT 양성이므로 결과 해석에 주의가 필요합니다.</p>" : ""}</section>
    <section><small>05 · 가능한 해석</small><b>${possibleInterpretation}</b></section>
    <section><small>06 · 다음 확인사항</small><ul>${nextActions.map(action => `<li>${action}</li>`).join("")}</ul></section>
  </div><p>결과 해석과 RhD 확정은 시약 제조사 지침 및 기관 SOP에 따라 수행하세요.</p>`;
}

function renderManualGroup(prefix, title, subtitle, groupTests, manualGrades) {
  return `<div class="is-typing-group"><div class="is-group-label"><strong>${title}</strong><small>${subtitle}</small></div><div class="is-test-list">${groupTests.map(test => `<div class="is-test-row"><span>${test.name}</span><div class="is-grade-options">${manualGrades.map((grade, i) => `<input type="radio" id="${prefix}-${test.id}-${i}" name="${prefix}-${test.id}" value="${grade.value}" ${i === 0 ? "checked" : ""}><label for="${prefix}-${test.id}-${i}">${grade.label}</label>`).join("")}</div></div>`).join("")}</div></div>`;
}

function readManualResults(prefix) {
  return Object.fromEntries(tests.map(test => {
    const raw = document.querySelector(`input[name="${prefix}-${test.id}"]:checked`).value;
    return [test.id, raw.startsWith("mf") ? raw : valueOf(raw)];
  }));
}

function analyzeIS() {
  const r = readManualResults("is");
  recordABOHistory("manualIS", r);
  const consistency = checkResultConsistency(initialABOResults, r);
  if (consistency.flag) {
    const box = document.getElementById("isResult");
    box.className = "is-outcome consistency-check";
    box.innerHTML = `<span>RESULT_CONSISTENCY_CHECK</span><strong>⚠️ 초기 ABO 결과와 IS 결과의 패턴 차이가 큽니다. 검체 및 입력값을 다시 확인해주세요.</strong>
      <div class="consistency-comparison"><div><small>초기 장비 ABO phenotype</small><b>${consistency.initialPhenotype}-like</b></div><div><small>IS manual phenotype</small><b>${consistency.isPhenotype}-like</b></div></div>
      <p>이 단계는 ABO형을 자동 수정하거나 분석을 종료하지 않습니다. 검체·전사·입력값을 확인한 뒤 계속 진행하세요.</p>
      <button type="button" class="is-analyze-button" id="confirmConsistencyButton">결과 확인 완료 / 계속 분석 <span>→</span></button>`;
    document.getElementById("confirmConsistencyButton").addEventListener("click", () => continueISAnalysis(r));
    box.scrollIntoView({behavior:"smooth", block:"nearest"});
    return;
  }
  continueISAnalysis(r);
}

function continueISAnalysis(r) {
  const classification = classifyISDiscrepancy(r);
  const subtypeAssessment = assessSubgroupHistory(classification);
  if (classification.frontBackConflict) {
    const box = document.getElementById("isResult");
    box.className = "is-outcome unresolved";
    box.dataset.classification = classification.classification;
    box.dataset.analysis = JSON.stringify(classification);
    box.innerHTML = `<span>FRONT_BACK_CONFLICT</span><strong>정형과 역형이 서로 다른 ABO phenotype을 강하게 지지합니다.</strong>
      ${renderConflictSummary(classification)}
      ${renderHistoricalEvidence(classification)}
      <p>이 flag는 cold interference 확정이 아닙니다. 가능성을 우선 확인하기 위해 37℃ 조건 ABO 재검을 권장하며, Ab screening·자가대조 등 unexpected antibody 확인을 함께 검토하세요.</p>
      <div id="warm25Area"></div>${subtypeAssessment.suspected ? `<div id="subtypeArea">${renderSubgroupStatus(subtypeAssessment,"is-conflict")}</div>` : ""}`;
    showWarm25Form(r, classification);
    bindSubtypeWorkup(subtypeAssessment, r, "is-conflict");
    box.scrollIntoView({behavior:"smooth", block:"nearest"});
    return;
  }
  const match = classification.classification === "NORMAL" ? normalCandidateResult(classification, r) : null;
  const box = document.getElementById("isResult");
  if (match && !subtypeAssessment.suspected) {
    box.className = "is-outcome resolved";
    box.innerHTML = `<span>RESOLVED</span><strong>IS 재검에서 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${renderCandidateSummary(classification)}<p>초기 ABO 불일치가 수기법 IS 재검에서 해소되었습니다. RhD는 별도 판정이며 기관 SOP에 따라 최종 검증·보고하세요.</p>`;
  } else if (match) {
    box.className = "is-outcome unresolved";
    box.innerHTML = `<span>SUBGROUP_SUSPECTED</span><strong>IS 결과가 정상 패턴이어도 이전 forward abnormality 이력을 유지합니다.</strong>${renderCandidateSummary(classification)}<p>현재 active ABO discrepancy는 해소되었지만 subgroup 가능성은 별도 flag로 보존합니다.</p><div id="subtypeArea">${renderSubgroupStatus(subtypeAssessment,"is-normal")}</div>`;
    bindSubtypeWorkup(subtypeAssessment, r, "is-normal");
  } else {
    const frontUnexpectedRule = createUnexpectedRule(classification, "FRONT");
    const backUnexpectedRule = createUnexpectedRule(classification, "BACK");
    const needsWarm25 = Boolean(frontUnexpectedRule || classification.front?.hasUnexpectedPresent);
    const needs15Min = needs15MinuteIncubation(classification);
    box.className = "is-outcome unresolved";
    box.dataset.candidateAbo = classification.candidateABO;
    box.dataset.classification = classification.classification;
    box.dataset.location = classification.location || "";
    box.dataset.analysis = JSON.stringify({candidateABO:classification.candidateABO,classification:classification.classification,location:classification.location,abnormalities:classification.abnormalities,rhD:classification.rhD});
    box.dataset.frontClassification = frontUnexpectedRule?.classification || classification.front?.label || "normal";
    box.dataset.backClassification = classification.back?.label || "normal";
    box.dataset.suspectedCause = frontUnexpectedRule?.suspectedCause || "";
    box.innerHTML = `<span>UNRESOLVED</span><strong>IS 재검에서도 불일치가 지속됩니다.</strong>
      <p>발견된 abnormality마다 독립된 resolution pathway를 병렬로 진행하세요. 모든 이상이 해결된 경우에만 RESOLVED로 재평가합니다.</p>
      ${renderCandidateSummary(classification)}
      ${renderAbnormalityPathways(classification)}
      ${renderHistoricalEvidence(classification)}
      ${backUnexpectedRule ? renderBackUnexpectedResolution(backUnexpectedRule) : ""}
      ${subtypeAssessment.suspected ? `<div id="subtypeArea">${renderSubgroupStatus(subtypeAssessment,"is-active")}</div>` : ""}
      ${needsWarm25 ? `<div id="warm25Area"></div>` : ""}
      ${needs15Min ? `<div id="manual15Area"></div>` : ""}
      `;
    if (needsWarm25) showWarm25Form(r, frontUnexpectedRule ? {...classification, front:{...classification.front, unexpectedKeys:frontUnexpectedRule.abnormalKeys}} : classification);
    if (needs15Min) showManual15Form(r);
    bindSubtypeWorkup(subtypeAssessment, r, "is-active");
  }
  box.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function showWarm25Form(sourceIS, sourceClassification) {
  const area = document.getElementById("warm25Area");
  area.innerHTML = `<div class="manual15-form warm25-form"><div class="is-form-head"><span>03</span><div><strong>37℃ 25분 방치 후 결과</strong><small>Cold antibody 확인 재검</small></div></div>
    ${renderManualGroup("w25", "Front Typing", "정형검사", tests.filter(test => test.group === "forward"), manualFrontGrades)}
    ${renderManualGroup("w25", "Back Typing", "역형검사", tests.filter(test => test.group === "reverse"), manualBackGrades)}
    <button type="button" class="is-analyze-button" id="analyzeWarm25Button">37℃ 결과 재판정 <span>→</span></button><div id="warm25Result"></div></div>`;
  document.getElementById("analyzeWarm25Button").addEventListener("click", () => analyzeWarm25(sourceIS, sourceClassification));
}

function analyzeWarm25(sourceIS, sourceClassification) {
  const r = readManualResults("w25");
  const reanalysis = analyzeExpectedVsActual(r);
  const match = reanalysis.normalPattern;
  const strength = value => typeof value === "string" && value.startsWith("mf") ? Number(value.slice(2)) : value;
  const unexpectedKeys = sourceClassification.front?.unexpectedKeys || [];
  const weakenedButPresent = unexpectedKeys.filter(key => strength(r[key]) > 0 && strength(r[key]) < strength(sourceIS[key]));
  const box = document.getElementById("warm25Result");
  box.className = `is-outcome ${match ? "resolved" : "unresolved"}`;
  const comparison = renderExpectedActual(reanalysis);
  const rhDGuidance = renderRhDGuidance(reanalysis.generic.rhD);
  const remainingPathways = renderAbnormalityPathways(reanalysis.generic, "WARM37");
  box.innerHTML = reanalysis.generic.frontBackConflict
    ? `<span>UNRESOLVED · FRONT_BACK_CONFLICT</span><strong>37℃ 조건에서도 정형–역형 conflict가 지속됩니다.</strong>${renderConflictSummary(reanalysis.generic)}${rhDGuidance}<p>Cold interference로 확정하지 말고 ABO 확정을 보류한 채 기관 SOP에 따른 추가 원인 검사를 진행하세요.</p>`
    : match
    ? `<span>RESOLVED</span><strong>37℃ 방치 후 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${renderCandidateSummary(reanalysis.generic)}${comparison}<p>IS 대비 37℃에서 conflict가 해소된 pattern입니다. Cold-reactive interference 가능성은 확정이 아닌 확인 대상으로 기록하고 기관 SOP에 따라 최종 검증하세요.</p>`
    : weakenedButPresent.length
      ? `<span>COLD ANTIBODY SUSPECTED</span><strong>37℃ 반응 후 응집이 약해졌지만 남아 있습니다.</strong>${renderCandidateSummary(reanalysis.generic)}${comparison}${remainingPathways}<p>${weakenedButPresent.map(key => tests.find(test => test.id === key)?.name).join(", ")} 반응 감소가 확인되었습니다. Cold antibody screening 검사를 진행하고, 기관 SOP에 따라 항체선별검사·자가대조·DAT를 검토하세요.</p>`
      : `<span>UNRESOLVED</span><strong>37℃ 25분 방치 후에도 불일치가 지속됩니다.</strong>${renderCandidateSummary(reanalysis.generic)}${comparison}${remainingPathways}<p>새 37℃ 결과로 Candidate ABO, Expected vs Actual 및 discrepancy classification을 다시 계산했습니다. 남은 abnormality가 있어 전체 상태를 UNRESOLVED로 유지합니다.</p>`;
}

function needs15MinuteIncubation(analysis) {
  // Trigger 위치와 관계없이 시행 시에는 Front/Back 전체 ABO를 재판독한다.
  // Back unexpected reaction은 trigger가 아니며 기존 전용 pathway로 보낸다.
  return analysis.abnormalities.some(item =>
    (item.location === "FRONT" && ["EXPECTED_REACTION_WEAK/MISSING", "MIXED_FIELD"].includes(item.type)) ||
    (item.location === "BACK" && item.type === "EXPECTED_REACTION_WEAK/MISSING")
  );
}

function createUnexpectedRule(analysis, location) {
  if (analysis.candidateABO === "CANDIDATE_AMBIGUOUS") return null;
  const abnormalities = analysis.abnormalities.filter(item => item.location === location && item.type === "UNEXPECTED_REACTION_PRESENT");
  if (!abnormalities.length) return null;
  return {
    classification:"UNEXPECTED_REACTION_PRESENT",
    location,
    abnormalKeys:abnormalities.map(item => item.key),
    abnormalTargets:abnormalities.map(item => item.target),
    suspectedCause:location === "FRONT" ? "Cold interference 의심" : "Unexpected antibody 또는 cold interference 의심",
    nextAction:location === "FRONT" ? "37℃ 조건 ABO 재검" : "연전 및 과거력 확인, Ab screening 검사 및 37℃ 조건 ABO 검사",
    expectedGroup:analysis.candidateABO
  };
}

function analyzeExpectedVsActual(r) {
  const generic = classifyISDiscrepancy(r);
  const frontUnexpected = createUnexpectedRule(generic, "FRONT");
  const group = generic.candidateABO === "CANDIDATE_AMBIGUOUS" ? null : generic.candidateABO;
  const normalPattern = generic.classification === "NORMAL" ? normalCandidateResult(generic, r) : null;
  return {normalPattern, frontUnexpected, generic, group, expectedMap:generic.expectedPattern, actual:r};
}

function renderBackUnexpectedResolution(rule) {
  return `<div class="back-resolution"><small>BACK UNEXPECTED REACTION PATHWAY</small><strong>${rule.abnormalTargets.join(", ")} · UNEXPECTED_REACTION_PRESENT</strong><p>Expected 0인 cell의 반응이므로 15분 방치는 시행하지 않습니다. 연전 및 과거력을 확인하고 Ab screening 검사를 시행하며, 필요 시 37℃ 조건 ABO 재검을 진행하세요.</p></div>`;
}

function renderAbnormalityPathways(analysis, completedPathway = null) {
  if (!analysis?.abnormalities?.length) return "";
  return `<div class="parallel-pathways"><div class="parallel-pathways-head"><small>INDEPENDENT RESOLUTION PATHWAYS</small><strong>${analysis.abnormalities.length}개 abnormality를 각각 추적합니다.</strong></div>${analysis.abnormalities.map((item,index) => {
    let suspected = "원인별 추가 확인 필요";
    let action = "기관 SOP에 따른 원인별 resolution을 진행하세요.";
    const subgroupAction = item.key === "antiA" && (analysis.candidateABO === "A" || analysis.candidateABO === "AB")
      ? "A₁ lectin과 H 검사를 진행하세요."
      : item.key === "antiB" && (analysis.candidateABO === "B" || analysis.candidateABO === "AB")
        ? "H 검사를 진행하세요."
        : "원인별 추가검사를 진행하세요.";
    if (item.type === "MIXED_FIELD") {
      suspected = "서로 다른 적혈구 집단 또는 항원 발현 차이 가능";
      action = item.location === "FRONT" ? (completedPathway === "15MIN" ? `15분 후에도 MF가 지속됩니다. 수혈·이식력과 혼합 적혈구 집단 가능성을 계속 확인하고 ${subgroupAction}` : "15분 방치 후 전체 성상을 재입력해 재판정하세요. 수혈·이식력과 혼합 적혈구 집단 가능성을 함께 확인하세요.") : "혼합 반응의 재현성과 시약혈구·검체 상태를 확인하세요.";
    } else if (item.type === "EXPECTED_REACTION_WEAK/MISSING") {
      suspected = "Expected reaction 약화 또는 소실";
      action = completedPathway === "15MIN" && item.location === "FRONT" ? `15분 후에도 Front reaction이 정상 기준에 도달하지 않았습니다. ${subgroupAction}` : completedPathway === "15MIN" ? "15분 방치가 완료되었습니다. 남은 이상에 대한 원인별 추가검사를 진행하세요." : "Manual법 15분 방치 후 전체 성상을 재입력해 재판정하세요.";
    } else if (item.type === "UNEXPECTED_REACTION_PRESENT" && item.location === "FRONT") {
      suspected = "Cold interference 가능성 — 확정 아님";
      action = completedPathway === "WARM37" ? "37℃ 조건 ABO 검사가 완료되었습니다. 항체선별검사·자가대조·DAT 등 남은 원인을 확인하세요." : "15분 방치 없이 37℃ 조건 ABO 검사를 진행하세요.";
    } else if (item.type === "UNEXPECTED_REACTION_PRESENT" && item.location === "BACK") {
      suspected = "Unexpected antibody 또는 cold interference 가능성";
      action = completedPathway === "WARM37" ? "37℃ 조건 ABO 검사가 완료되었습니다. 연전 및 과거력을 확인하고 Ab screening 검사를 진행하세요." : "15분 방치 없이 연전 및 과거력 확인, Ab screening 검사 및 37℃ 조건 ABO 검사를 진행하세요.";
    }
    return `<article class="pathway-card"><small>ABNORMALITY ${index + 1}</small><dl><div><dt>Classification</dt><dd>${item.type}</dd></div><div><dt>Location</dt><dd>${item.location}</dd></div><div><dt>Target</dt><dd>${item.target}</dd></div><div><dt>Expected / Actual</dt><dd>${item.expected} / ${item.actual}</dd></div><div><dt>Suspected Cause</dt><dd>${suspected}</dd></div><div><dt>Resolution Pathway</dt><dd>${action}</dd></div></dl></article>`;
  }).join("")}</div>`;
}

function displayReaction(value) {
  if (typeof value === "string" && value.startsWith("mf")) return `${value.slice(2)}+(MF)`;
  return value === 0 ? "0" : `${value}+`;
}

function renderDecisionSummary(rule, showNextAction = true) {
  return `<dl class="decision-summary"><div><dt>Classification</dt><dd>${rule.classification}</dd></div><div><dt>Location</dt><dd>${rule.location}</dd></div><div><dt>Abnormal targets</dt><dd>${rule.abnormalTargets.join(", ")}</dd></div><div><dt>Suspected Cause</dt><dd>${rule.suspectedCause}</dd></div>${showNextAction ? `<div><dt>Next Action</dt><dd>${rule.nextAction}</dd></div>` : ""}</dl>`;
}

function renderExpectedActual(result) {
  if (!result.expectedMap) return "";
  const rows = [
    ["Anti-A",result.expectedMap.antiA,result.actual.antiA], ["Anti-B",result.expectedMap.antiB,result.actual.antiB],
    ["Anti-D","0 또는 4+",result.actual.antiD], ["A cell",result.expectedMap.a1cell,result.actual.a1cell],
    ["B cell",result.expectedMap.bcell,result.actual.bcell]
  ];
  return `<div class="comparison-box"><div class="comparison-title">Expected vs Actual · ${result.group}형 기준</div>${rows.map(([name,expected,actual]) => `<div><span>${name}</span><b>${expected}</b><em>${displayReaction(actual)}</em></div>`).join("")}</div>`;
}

function renderCandidateSummary(analysis) {
  const candidate = analysis.candidateABO;
  const tied = candidate === "CANDIDATE_AMBIGUOUS" ? `<em>동률: ${analysis.tiedCandidates.join(", ")}</em>` : "";
  return `<div class="candidate-summary"><small>Candidate ABO · 불일치 분석 기준 phenotype</small><strong>${candidate}</strong>${tied}<span>Classification · ${analysis.classification}</span><i>최종 ABO 확정 아님</i></div>${renderRhDGuidance(analysis.rhD)}`;
}

function renderHistoricalEvidence(analysis) {
  const data = window.aboHistoricalData;
  if (!data) return "";
  const keys = new Set();
  if (analysis.frontBackConflict) ["UNEXPECTED_ALLOANTIBODY","AUTOANTIBODY","COLD_REACTIVE","ROULEAUX"].forEach(key => keys.add(key));
  (analysis.abnormalities || []).forEach(item => {
    if (item.location === "FRONT" && (item.type === "EXPECTED_REACTION_WEAK/MISSING" || item.type === "MIXED_FIELD")) {
      keys.add("SUBGROUP");
      keys.add("BMT/TRANSPLANT");
    }
    if (item.location === "BACK" && item.type === "EXPECTED_REACTION_WEAK/MISSING") keys.add("WEAK_REVERSE");
    if (item.type === "UNEXPECTED_REACTION_PRESENT") {
      keys.add("UNEXPECTED_ALLOANTIBODY");
      keys.add("AUTOANTIBODY");
      keys.add("COLD_REACTIVE");
      if (item.location === "BACK") keys.add("ROULEAUX");
    }
  });
  const labels = {
    SUBGROUP:"ABO subgroup/항원 약화",UNEXPECTED_ALLOANTIBODY:"Unexpected alloantibody",AUTOANTIBODY:"Autoantibody",
    WEAK_REVERSE:"Weak reverse reaction","BMT/TRANSPLANT":"BMT/이식 관련",COLD_REACTIVE:"Cold-reactive",ROULEAUX:"Rouleaux"
  };
  const items = [...keys].map(key => ({key,label:labels[key],count:data.contexts[key]})).filter(item => Number.isFinite(item.count));
  if (!items.length) return "";
  return `<div class="historical-evidence"><small>DE-IDENTIFIED HISTORICAL CONTEXT · 2021–2026</small><strong>현재 pattern과 함께 검토할 과거 자료 범주</strong><div>${items.map(item => `<span>${item.label}<b>${item.count} rows</b></span>`).join("")}</div><p>총 ${data.totalRows}건의 비식별 자료에서 관찰된 중복 가능 범주입니다. 빈도는 진단확률이나 원인 확정값이 아니며 Candidate ABO·discrepancy classification 계산에는 사용하지 않습니다.</p></div>`;
}

function renderConflictSummary(analysis) {
  return `<div class="conflict-summary"><small>FRONT–BACK PHENOTYPE ASSESSMENT</small><dl>
    <div><dt>Flag</dt><dd>FRONT_BACK_CONFLICT</dd></div>
    <div><dt>Front phenotype</dt><dd>${analysis.frontPhenotype}-like</dd></div>
    <div><dt>Back phenotype</dt><dd>${analysis.backPhenotype}-like</dd></div>
    <div><dt>Candidate ABO</dt><dd>확정 보류</dd></div>
    <div><dt>Final ABO</dt><dd>확정 보류</dd></div>
  </dl></div>`;
}

function showManual15Form(sourceResults) {
  const area = document.getElementById("manual15Area");
  area.innerHTML = `<div class="manual15-form"><div class="is-form-head"><span>03</span><div><strong>Manual 15분 방치 후 결과</strong><small>15분 후 응집 성상 재판정</small></div></div>
    ${renderManualGroup("m15", "Front Typing", "정형검사 · 전체 재판독", tests.filter(test => test.group === "forward"), manualFrontGrades)}
    ${renderManualGroup("m15", "Back Typing", "역형검사 · 전체 재판독", tests.filter(test => test.group === "reverse"), manualBackGrades)}
    <button type="button" class="is-analyze-button" id="analyze15MinButton">15분 결과 재판정 <span>→</span></button><div id="manual15Result"></div></div>`;
  document.getElementById("analyze15MinButton").addEventListener("click", () => analyzeManual15(sourceResults));
}

function analyzeManual15(sourceResults) {
  const r = Object.fromEntries(tests.map(test => {
    const selected = document.querySelector(`input[name="m15-${test.id}"]:checked`);
    if (!selected) return [test.id,sourceResults[test.id]];
    return [test.id,selected.value.startsWith("mf") ? selected.value : valueOf(selected.value)];
  }));
  recordABOHistory("rt15", r);
  const reanalysis = analyzeExpectedVsActual(r);
  const classification = reanalysis.generic;
  const match = classification.classification === "NORMAL" ? normalCandidateResult(classification, r) : null;
  const subtypeAssessment = assessSubgroupHistory(classification);
  const frontUnexpectedRule = match ? null : createUnexpectedRule(classification, "FRONT");
  const reactionChanges = render15MinuteComparison(sourceResults, r);
  const box = document.getElementById("manual15Result");
  const subgroupHistoryPersists = subtypeAssessment.suspected;
  box.className = `is-outcome ${match && !subgroupHistoryPersists ? "resolved" : "unresolved"}`;
  box.innerHTML = match && !subgroupHistoryPersists
    ? `<span>RESOLVED</span><strong>15분 후 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${reactionChanges}${renderCandidateSummary(classification)}${renderExpectedActual(reanalysis)}<p>RhD는 별도 판정이며 기관 SOP에 따라 최종 검증·보고하세요.</p>`
    : `<span>${match ? "SUBGROUP_SUSPECTED" : "REANALYZED"}</span><strong>${match ? "15분 후 반응이 정상화되어도 이전 forward abnormality 이력을 유지합니다." : "15분 후 ABO 전체 결과를 Candidate ABO부터 다시 분석했습니다."}</strong>${reactionChanges}${renderCandidateSummary(classification)}${renderExpectedActual(reanalysis)}${match ? "" : renderAbnormalityPathways(classification, "15MIN")}<p>${match ? "현재 active ABO discrepancy는 해소되었지만 subgroup suspicion은 별도 상태로 보존합니다." : "현재 active discrepancy를 유지하면서 과거 단계의 subgroup suspicion을 별도로 관리합니다."}</p>${subtypeAssessment.suspected ? `<div id="subtypeArea-rt15">${renderSubgroupStatus(subtypeAssessment,"rt15")}</div>` : ""}${frontUnexpectedRule ? `<div id="warm25Area"></div>` : ""}`;
  if (frontUnexpectedRule) showWarm25Form(r, {...classification,front:{...classification.front,unexpectedKeys:frontUnexpectedRule.abnormalKeys}});
  bindSubtypeWorkup(subtypeAssessment, r, "rt15");
}

function assessSubgroupHistory(currentClassification = null) {
  const stageLabels = {initial:"Initial VISION",manualIS:"Manual IS",rt15:"RT 15분"};
  const orderedStages = ["initial","manualIS","rt15"].filter(stage => aboCaseHistory[stage]);
  const targets = new Set();
  const evidence = [];
  const addEvidence = (stage, key, type, detail) => {
    const target = key === "antiA" ? "A" : key === "antiB" ? "B" : null;
    if (target) targets.add(target);
    const id = `${stage}|${key}|${type}|${detail}`;
    if (!evidence.some(item => item.id === id)) evidence.push({id,stage:stageLabels[stage] || stage,key,type,detail,target});
  };

  orderedStages.forEach(stage => {
    const result = aboCaseHistory[stage];
    ["antiA","antiB"].forEach(key => {
      const strength = reactionStrength(result[key]);
      if (isMixedReaction(result[key])) addEvidence(stage,key,"MIXED_FIELD",`${displayReaction(result[key])} 관찰`);
      else if (strength > 0 && strength < 4) addEvidence(stage,key,"WEAK_FORWARD_REACTION",`${displayReaction(result[key])} 관찰`);
    });
    const stageClassification = stage === "rt15" && currentClassification ? currentClassification : classifyISDiscrepancy(result);
    (stageClassification.abnormalities || []).filter(item => item.location === "FRONT").forEach(item => {
      if (["EXPECTED_REACTION_WEAK/MISSING","MIXED_FIELD","UNEXPECTED_REACTION_PRESENT"].includes(item.type)) {
        addEvidence(stage,item.key,item.type,`expected ${item.expected}, actual ${item.actual}`);
      }
    });
  });

  for (let index = 1; index < orderedStages.length; index++) {
    const beforeStage = orderedStages[index - 1], afterStage = orderedStages[index];
    const before = aboCaseHistory[beforeStage], after = aboCaseHistory[afterStage];
    ["antiA","antiB"].forEach(key => {
      const beforeStrength = reactionStrength(before[key]), afterStrength = reactionStrength(after[key]);
      if (beforeStrength > 0 && afterStrength === 0) addEvidence(afterStage,key,"REACTION_LOST",`${stageLabels[beforeStage]} ${displayReaction(before[key])} → ${stageLabels[afterStage]} 0`);
    });
  }

  const initial = aboCaseHistory.initial, manualIS = aboCaseHistory.manualIS;
  if (initial && manualIS) {
    const initialFront = expectedGroup(reactionStrength(initial.antiA) > 0,reactionStrength(initial.antiB) > 0);
    const manualFront = expectedGroup(reactionStrength(manualIS.antiA) > 0,reactionStrength(manualIS.antiB) > 0);
    if (initialFront !== manualFront) {
      ["antiA","antiB"].filter(key => reactionStrength(initial[key]) !== reactionStrength(manualIS[key])).forEach(key =>
        addEvidence("manualIS",key,"VISION_IS_MISMATCH",`${initialFront}-like → ${manualFront}-like`)
      );
    }
  }

  if (aboCaseHistory.rt15 && currentClassification?.classification !== "NORMAL") {
    const inferred = currentClassification.candidateABO;
    if (!targets.size && ["A","AB"].includes(inferred)) targets.add("A");
    if (!targets.size && ["B","AB"].includes(inferred)) targets.add("B");
    evidence.push({id:"rt15|overall|UNEXPLAINED",stage:stageLabels.rt15,key:"ABO 전체",type:"UNEXPLAINED_15MIN_PATTERN",detail:"하나의 정상 ABO pattern으로 명확히 설명되지 않음",target:null});
  }

  const initialWeakReaction = Object.fromEntries(["antiA","antiB"].map(key => {
    const value = initial?.[key], strength = value == null ? 0 : reactionStrength(value);
    return [key,Boolean(isMixedReaction(value) || (strength > 0 && strength < 4))];
  }));
  const manualReproduction = Object.fromEntries(["antiA","antiB"].map(key => {
    const value = manualIS?.[key], strength = value == null ? 0 : reactionStrength(value);
    return [key,Boolean(initialWeakReaction[key] && (isMixedReaction(value) || (strength > 0 && strength < 4)))];
  }));
  const mixedField = Object.fromEntries(orderedStages.map(stage => [stage,{antiA:isMixedReaction(aboCaseHistory[stage].antiA),antiB:isMixedReaction(aboCaseHistory[stage].antiB)}]));
  const incubationChanges = aboCaseHistory.manualIS && aboCaseHistory.rt15 ? Object.fromEntries(["antiA","antiB"].map(key => [key,classifyReactionChange(aboCaseHistory.manualIS[key],aboCaseHistory.rt15[key])])) : null;

  const latestStage = orderedStages[orderedStages.length - 1];
  const latest = latestStage ? aboCaseHistory[latestStage] : null;
  const targetList = [...targets];
  const referenceGroups = targetList.length > 1 ? ["AB",...targetList] : targetList;
  const referenceMatches = latest && referenceGroups.length ? findSubgroupReferenceMatches(referenceGroups,{
    antiA:latest.antiA,antiB:latest.antiB,antiAB:null,antiA1:null,antiH:null,a1Cell:latest.a1cell,a2Cell:null,bCell:latest.bcell
  }) : [];
  const commonPhenotypes = new Set(["A1","B","A1B"]);
  const meaningfulReference = referenceMatches.find(match => !commonPhenotypes.has(match.phenotype) && match.similarity >= SUBGROUP_REFERENCE_WORKUP_THRESHOLD) || null;

  const workupReasons = [];
  ["antiA","antiB"].forEach(key => {
    const value = manualIS?.[key], strength = value == null ? 0 : reactionStrength(value);
    if (manualReproduction[key]) workupReasons.push(`${key === "antiA" ? "Anti-A" : "Anti-B"} weak reaction이 Manual IS에서 재현됨`);
    if (initialWeakReaction[key] && isMixedReaction(value)) workupReasons.push(`${key === "antiA" ? "Anti-A" : "Anti-B"} Mixed Field가 Manual IS에서도 지속됨`);
    if (!initialWeakReaction[key] && (isMixedReaction(value) || (strength > 0 && strength < 4))) workupReasons.push(`${key === "antiA" ? "Anti-A" : "Anti-B"} 비정상 반응이 Manual IS에서 확인됨`);
  });
  if (meaningfulReference) workupReasons.push(`현재 pattern이 ${meaningfulReference.phenotype} reference와 ${meaningfulReference.similarity}% 유사함`);

  if (aboCaseState.has_manual_forward_weak && !workupReasons.length) workupReasons.push("Manual IS에서 forward weak/MF 반응 이력이 확인됨");
  const suspected = aboCaseState.subgroup_suspected || evidence.some(item => ["antiA","antiB"].includes(item.key));
  aboCaseState.subgroup_suspected ||= suspected;
  const currentWorkupRequired = suspected && workupReasons.length > 0;
  aboCaseState.subgroup_workup_required ||= currentWorkupRequired;
  const workupRequired = aboCaseState.subgroup_workup_required;
  const rt15Values = aboCaseHistory.rt15 ? [aboCaseHistory.rt15.antiA,aboCaseHistory.rt15.antiB] : [];
  const rt15Reproduced = rt15Values.some(value => isMixedReaction(value) || (reactionStrength(value) > 0 && reactionStrength(value) < 4));
  const unreproducedThroughLatest = Boolean(aboCaseHistory.manualIS) && !aboCaseState.has_manual_forward_weak && (!aboCaseHistory.rt15 || !rt15Reproduced);
  const activeDiscrepancy = Boolean(currentClassification && currentClassification.classification !== "NORMAL");
  const initialSignalUnexplained = aboCaseState.has_initial_forward_weak && unreproducedThroughLatest;
  const optionalWorkupAvailable = suspected && !workupRequired && unreproducedThroughLatest && (activeDiscrepancy || initialSignalUnexplained);
  const historicalSupport = suspected && Number.isFinite(window.aboHistoricalData?.contexts?.SUBGROUP) ? window.aboHistoricalData.contexts.SUBGROUP : null;
  const features = {initialWeakReaction,manualReproduction,incubationChanges,mixedField,discrepancyLocation:currentClassification?.location || null,subgroupSuspicionHistory:evidence.map(item => ({stage:item.stage,target:item.key,type:item.type,detail:item.detail}))};
  const assessment = {
    status:workupRequired ? "SUBGROUP_WORKUP_REQUIRED" : suspected ? "SUBGROUP_SUSPECTED" : null,
    suspected,workupRequired,optionalWorkupAvailable,targets:targetList,evidence,workupReasons:[...new Set(workupReasons)],meaningfulReference,referenceMatches,historicalSupport,
    caseState:{...aboCaseState},
    features,
    stages:orderedStages.map(stage => ({stage:stageLabels[stage],results:{...aboCaseHistory[stage]}}))
  };
  aboCaseHistory.features = {...features};
  aboCaseHistory.subgroupSuspicion = {status:assessment.status,optionalWorkupAvailable,caseState:{...aboCaseState},targets:[...targetList],workupReasons:[...assessment.workupReasons],history:[...features.subgroupSuspicionHistory]};
  return assessment;
}

function renderSubgroupHistory(assessment) {
  if (!assessment?.evidence.length) return "";
  return `<div class="subgroup-history"><small>CASE HISTORY · INITIAL → IS → RT 15분</small><strong>이전 단계의 forward abnormality 유지</strong>${assessment.evidence.map(item => `<div><b>${item.stage}</b><span>${item.key === "antiA" ? "Anti-A" : item.key === "antiB" ? "Anti-B" : item.key}</span><em>${item.type}</em><p>${item.detail}</p></div>`).join("")}${assessment.historicalSupport ? `<p>검증된 비식별 case data의 subgroup/항원 약화 범주 ${assessment.historicalSupport}건은 보조적 맥락으로만 사용합니다.</p>` : ""}</div>`;
}

function renderSubgroupStatus(assessment, scope) {
  if (!assessment?.suspected) return "";
  const canEnterWorkup = assessment.workupRequired || assessment.optionalWorkupAvailable;
  const initialTargets = [assessment.features.initialWeakReaction.antiA ? "A" : null,assessment.features.initialWeakReaction.antiB ? "B" : null].filter(Boolean);
  const reproduced = Object.values(assessment.features.manualReproduction).some(Boolean);
  const message = initialTargets.length && !reproduced
    ? `초기 장비에서 약한 ${initialTargets.join("/")} 항원 반응이 관찰되었으나 수기검사에서 재현되지 않았습니다. ${initialTargets.join("/")} subgroup 가능성은 완전히 배제하지 않습니다.`
    : "초기 또는 반복검사에서 subgroup 가능성을 시사하는 forward typing abnormality가 확인되었습니다.";
  return `<div class="subgroup-status ${assessment.workupRequired ? "required" : "suspected"}"><small>${assessment.status}</small><strong>${assessment.workupRequired ? "아형검사 확인 필요" : "아형 가능성 있음"}</strong><p>${message}</p>${renderSubgroupHistory(assessment)}${assessment.workupRequired ? `<div class="subgroup-workup-reasons"><b>Workup trigger</b><ul>${assessment.workupReasons.map(reason => `<li>${reason}</li>`).join("")}</ul></div>` : `<p><b>현재 active discrepancy를 우선 재분류하며, 아형검사를 자동으로 강제하지 않습니다. 검사자가 임상적으로 필요하다고 판단하면 선택하여 진행할 수 있습니다.</b></p>`}${canEnterWorkup ? `<button type="button" class="is-analyze-button" id="startSubtypeWorkupButton-${scope}">아형검사 진행 <span>→</span></button><div id="subtypeFormArea-${scope}"></div>` : ""}</div>`;
}

function bindSubtypeWorkup(assessment, manualResult, scope) {
  if (!assessment || (!assessment.workupRequired && !assessment.optionalWorkupAvailable)) return;
  const button = document.getElementById(`startSubtypeWorkupButton-${scope}`);
  if (!button) return;
  button.addEventListener("click", () => {
    button.hidden = true;
    showSubtypeForm(assessment.targets, manualResult, assessment, scope);
  });
}

function showSubtypeForm(targets, manualResult, assessment = null, scope = "default") {
  const area = document.getElementById(`subtypeFormArea-${scope}`) || document.getElementById("subtypeArea");
  const subtypeGrades = grades.map(grade => ({label:grade, value:grade}));
  const testRows = [
    {id:"antiA1", name:"Anti-A₁", desc:"A₁ lectin", grades:subtypeGrades},
    {id:"antiH", name:"Anti-H", desc:"H lectin", grades:subtypeGrades}
  ];
  area.innerHTML = `<div class="subtype-form"><div class="is-form-head"><span>04</span><div><strong>${targets.join("/")}형 아형검사</strong><small>검사실 SOP 선택 추가검사</small></div></div>
    <div class="subtype-note">Reference table과 검사 workflow를 분리합니다. 현재 아형검사 입력은 Anti-A₁과 Anti-H만 시행하며, reference의 나머지 항목을 자동 요구하지 않습니다.</div>
    <div class="is-test-list">${testRows.map(test => `<div class="is-test-row"><span>${test.name}<small>${test.desc}</small></span><div class="is-grade-options">${test.grades.map((grade,i) => `<input type="radio" id="sub-${scope}-${test.id}-${i}" name="sub-${scope}-${test.id}" value="${grade.value}" ${i===0?"checked":""}><label for="sub-${scope}-${test.id}-${i}">${grade.label}</label>`).join("")}</div></div>`).join("")}</div>
    <button type="button" class="is-analyze-button" id="analyzeSubtypeButton-${scope}">아형 의심 결과 확인 <span>→</span></button><div id="subtypeResult-${scope}"></div></div>`;
  document.getElementById(`analyzeSubtypeButton-${scope}`).addEventListener("click", () => analyzeSubtype(targets, manualResult, scope));
}

function analyzeSubtype(targets, r, scope) {
  const antiH = valueOf(document.querySelector(`input[name="sub-${scope}-antiH"]:checked`).value);
  const antiA1 = valueOf(document.querySelector(`input[name="sub-${scope}-antiA1"]:checked`).value);
  const numericStrength = value => typeof value === "string" && value.startsWith("mf") ? Number(value.slice(2)) : value;
  const antiA = numericStrength(r.antiA), antiB = numericStrength(r.antiB);
  const observations = {antiA:r.antiA,antiB:r.antiB,antiAB:null,antiA1,antiH,a1Cell:null,a2Cell:null,bCell:r.bcell};
  const referenceGroups = antiA > 0 && antiB > 0 ? ["AB"] : targets;
  const matches = findSubgroupReferenceMatches(referenceGroups, observations);
  const box = document.getElementById(`subtypeResult-${scope}`);
  box.className = "subtype-outcome";
  box.innerHTML = `<span>SUSPECTED SUBGROUP · REFERENCE SIMILARITY</span><strong>${matches.length ? "현재 확보된 결과와 유사한 subgroup reference 후보" : "비교 가능한 subgroup reference 후보 없음"}</strong>${matches.length ? `<div class="subgroup-match-list">${matches.map((match,index) => `<article><small>REFERENCE ${index+1} · ${match.group}</small><b>${match.phenotype}</b><em>Similarity ${match.similarity}%</em><p>${match.remarks.join(" · ")}</p></article>`).join("")}</div>` : ""}<div class="subtype-evidence"><b>Anti-A₁ ${displayReaction(antiA1)}</b><b>Anti-H ${displayReaction(antiH)}</b></div><p>Reference table은 subgroup 후보 비교와 해석을 위한 내부 참고자료이며 추가검사 항목을 자동 생성하지 않습니다. 실제 검사 순서와 최종 판정은 검사실 SOP와 검증된 case data를 우선하고, 환자의 이상 패턴에 따라 필요한 확인검사를 선택하세요.</p>`;
}

function parseReferenceReaction(expected) {
  if (expected == null) return null;
  const mf = expected.includes("(MF)");
  const numbers = expected.match(/[0-4](?:\.5)?/g).map(Number);
  return {min:numbers[0],max:numbers[1] ?? numbers[0],mf};
}

function findSubgroupReferenceMatches(groups, observations) {
  const reference = window.aboSubgroupReference;
  if (!reference) return [];
  return reference.phenotypes.filter(item => groups.includes(item.group)).map(item => {
    let penalty = 0, compared = 0;
    reference.fields.forEach(field => {
      const expected = parseReferenceReaction(item.expected[field]);
      const actual = observations[field];
      if (!expected || actual == null) return;
      const strength = reactionStrength(actual);
      const actualMF = isMixedReaction(actual);
      penalty += strength < expected.min ? expected.min - strength : strength > expected.max ? strength - expected.max : 0;
      if (expected.mf !== actualMF) penalty += expected.mf ? 1 : 0.5;
      compared++;
    });
    const similarity = compared ? Math.max(0,Math.round(100-(penalty/(compared*4))*100)) : 0;
    return {...item,similarity,compared};
  }).filter(item => item.compared >= 4).sort((a,b) => b.similarity-a.similarity || a.phenotype.localeCompare(b.phenotype)).slice(0,3);
}

const aboExpectedPatterns = {
  A:{antiA:{positive:true,min:4,label:"4+"},antiB:{positive:false,label:"0"},a1cell:{positive:false,label:"0"},bcell:{positive:true,min:2,label:"≥2+"}},
  B:{antiA:{positive:false,label:"0"},antiB:{positive:true,min:4,label:"4+"},a1cell:{positive:true,min:2,label:"≥2+"},bcell:{positive:false,label:"0"}},
  AB:{antiA:{positive:true,min:4,label:"4+"},antiB:{positive:true,min:4,label:"4+"},a1cell:{positive:false,label:"0"},bcell:{positive:false,label:"0"}},
  O:{antiA:{positive:false,label:"0"},antiB:{positive:false,label:"0"},a1cell:{positive:true,min:2,label:"≥2+"},bcell:{positive:true,min:2,label:"≥2+"}}
};

function reactionStrength(value) {
  return typeof value === "string" && value.startsWith("mf") ? Number(value.slice(2)) : value;
}

function isMixedReaction(value) {
  return typeof value === "string" && value.startsWith("mf");
}

function estimateCandidateABO(r) {
  const keys = ["antiA","antiB","a1cell","bcell"];
  const scores = Object.entries(aboExpectedPatterns).map(([type,pattern]) => {
    let directionErrors = 0, strengthErrors = 0, reactionDistance = 0;
    keys.forEach(key => {
      const expected = pattern[key];
      const actualStrength = reactionStrength(r[key]);
      const actualPositive = actualStrength > 0;
      if (expected.positive !== actualPositive) directionErrors += 1;
      else if (expected.positive && (actualStrength < expected.min || isMixedReaction(r[key]))) strengthErrors += 1;
      else if (!expected.positive && isMixedReaction(r[key])) strengthErrors += 1;
      reactionDistance += expected.positive ? Math.max(0, expected.min - actualStrength) : actualStrength;
    });
    return {type,directionErrors,strengthErrors,reactionDistance};
  }).sort((a,b) => a.directionErrors-b.directionErrors || a.strengthErrors-b.strengthErrors || a.reactionDistance-b.reactionDistance);
  const best = scores[0];
  const ties = scores.filter(score => score.directionErrors === best.directionErrors && score.strengthErrors === best.strengthErrors && score.reactionDistance === best.reactionDistance);
  return {candidateABO:ties.length === 1 ? best.type : "CANDIDATE_AMBIGUOUS", scores, tiedCandidates:ties.map(item => item.type)};
}

function classifyReactionChange(before, after) {
  const beforeMF = isMixedReaction(before), afterMF = isMixedReaction(after);
  const beforeStrength = reactionStrength(before), afterStrength = reactionStrength(after);
  if (beforeMF && afterMF) return beforeStrength === afterStrength ? "Mixed Field 지속" : `Mixed Field 변화 (${beforeStrength}+→${afterStrength}+)`;
  if (beforeMF !== afterMF) {
    if (afterStrength === 0) return "반응 소실 (MF 소실)";
    return beforeMF ? "Mixed Field 변화 (MF→균일 반응)" : "Mixed Field 변화 (균일 반응→MF)";
  }
  if (beforeStrength === afterStrength) return "변화 없음";
  if (beforeStrength === 0 && afterStrength > 0) return "새로운 반응 발생";
  if (beforeStrength > 0 && afterStrength === 0) return "반응 소실";
  return afterStrength > beforeStrength ? "반응 강도 증가" : "반응 강도 감소";
}

function render15MinuteComparison(before, after) {
  const names = {antiA:"Anti-A",antiB:"Anti-B",antiD:"Anti-D",a1cell:"A cell",bcell:"B cell"};
  const rows = ["antiA","antiB","antiD","a1cell","bcell"].map(key => ({
    name:names[key],before:displayReaction(before[key]),after:displayReaction(after[key]),change:classifyReactionChange(before[key],after[key])
  }));
  return `<div class="reaction-change-table"><div class="reaction-change-title">IS vs 15분 · ABO 전체 반응 변화</div><div class="reaction-change-row head"><span>항목</span><b>IS</b><b>15분</b><em>변화</em></div>${rows.map(row => `<div class="reaction-change-row"><span>${row.name}</span><b>${row.before}</b><b>${row.after}</b><em>${row.change}</em></div>`).join("")}</div>`;
}

// Front와 Back이 각각 정상 판정 강도를 충족하면서 서로 다른 phenotype을
// 지지할 때만 conflict로 본다. 약한 반응이나 MF는 기존 discrepancy 로직으로 보낸다.
function detectFrontBackConflict(r) {
  const frontClear = [r.antiA,r.antiB].every(value => !isMixedReaction(value) && (reactionStrength(value) === 0 || reactionStrength(value) === 4));
  const backClear = [r.a1cell,r.bcell].every(value => !isMixedReaction(value) && (reactionStrength(value) === 0 || reactionStrength(value) >= 2));
  const frontHasPositiveEvidence = reactionStrength(r.antiA) > 0 || reactionStrength(r.antiB) > 0;
  const backHasPositiveEvidence = reactionStrength(r.a1cell) > 0 || reactionStrength(r.bcell) > 0;
  // 양쪽 모두 실제 양성 반응 증거가 있어야 강한 phenotype conflict로 본다.
  // 한쪽이 모두 0인 경우는 해당 반응의 weak/missing 경로로 평가한다.
  if (!frontClear || !backClear || !frontHasPositiveEvidence || !backHasPositiveEvidence) return null;
  const frontPhenotype = expectedGroup(reactionStrength(r.antiA) > 0, reactionStrength(r.antiB) > 0);
  const backPhenotype = reverseGroup(reactionStrength(r.a1cell) > 0, reactionStrength(r.bcell) > 0);
  return frontPhenotype === backPhenotype ? null : {frontPhenotype,backPhenotype};
}

function clearConcordantPhenotype(r) {
  if (!r) return null;
  const frontClear = [r.antiA,r.antiB].every(value => !isMixedReaction(value) && (reactionStrength(value) === 0 || reactionStrength(value) === 4));
  const backClear = [r.a1cell,r.bcell].every(value => !isMixedReaction(value) && (reactionStrength(value) === 0 || reactionStrength(value) >= 2));
  if (!frontClear || !backClear) return null;
  const front = expectedGroup(reactionStrength(r.antiA) > 0, reactionStrength(r.antiB) > 0);
  const back = reverseGroup(reactionStrength(r.a1cell) > 0, reactionStrength(r.bcell) > 0);
  return front === back ? front : null;
}

function checkResultConsistency(initial, manualIS) {
  const initialPhenotype = clearConcordantPhenotype(initial);
  const isPhenotype = clearConcordantPhenotype(manualIS);
  return {flag:Boolean(initialPhenotype && isPhenotype && initialPhenotype !== isPhenotype),initialPhenotype,isPhenotype};
}

function analyzeRhD(value) {
  if (value === 4) return {status:"NORMAL",label:"Rh+",needsHistoryReview:false};
  if (value === 0) return {status:"NORMAL",label:"Rh−",needsHistoryReview:true};
  return {status:"ABNORMAL",label:`RhD 약/비정상 반응 ${displayReaction(value)}`,needsHistoryReview:true};
}

function renderRhDGuidance(rhD, hasPreviousResult = null) {
  if (!rhD?.needsHistoryReview) return "";
  const followUp = hasPreviousResult === false ? " 과거 결과가 없으므로 Weak D 검사를 진행하세요." : "";
  return `<div class="rhd-guidance"><small>ANTI-D RESULT REVIEW</small><strong>Anti-D 결과가 4+ 미만입니다.</strong><p>과거 검사 결과와 과거 수혈력을 확인하세요.${followUp}</p></div>`;
}

function normalCandidateResult(analysis, r) {
  return {type:analysis.candidateABO,rh:analyzeRhD(r.antiD).label};
}

function classifyISDiscrepancy(r) {
  const names = {antiA:"Anti-A",antiB:"Anti-B",a1cell:"A cell",bcell:"B cell"};
  const locations = {antiA:"FRONT",antiB:"FRONT",a1cell:"BACK",bcell:"BACK"};
  const candidate = estimateCandidateABO(r);
  const rhD = analyzeRhD(r.antiD);
  const conflict = detectFrontBackConflict(r);
  if (conflict) {
    return {
      candidateABO:"확정 보류",tiedCandidates:[],scores:candidate.scores,
      classification:"FRONT_BACK_CONFLICT",location:"FRONT + BACK",abnormalities:[],
      front:null,back:null,expectedPattern:null,rhD,frontBackConflict:true,
      frontPhenotype:conflict.frontPhenotype,backPhenotype:conflict.backPhenotype,
      reference:null
    };
  }
  if (candidate.candidateABO === "CANDIDATE_AMBIGUOUS") {
    return {candidateABO:candidate.candidateABO,tiedCandidates:candidate.tiedCandidates,scores:candidate.scores,classification:"CANDIDATE_AMBIGUOUS",location:null,abnormalities:[],front:null,back:null,expectedPattern:null,rhD};
  }

  const pattern = aboExpectedPatterns[candidate.candidateABO];
  const abnormalities = [];
  ["antiA","antiB","a1cell","bcell"].forEach(key => {
    const expected = pattern[key];
    const actual = r[key];
    const strength = reactionStrength(actual);
    let type = null;
    if (isMixedReaction(actual)) type = "MIXED_FIELD";
    else if (!expected.positive && strength > 0) type = "UNEXPECTED_REACTION_PRESENT";
    else if (expected.positive && strength === 0) type = "EXPECTED_REACTION_WEAK/MISSING";
    else if (expected.positive && strength < expected.min) type = "EXPECTED_REACTION_WEAK/MISSING";
    if (type) abnormalities.push({key,target:names[key],location:locations[key],type,expected:expected.label,actual:displayReaction(actual)});
  });

  const types = [...new Set(abnormalities.map(item => item.type))];
  const classification = !abnormalities.length ? "NORMAL" : types.length > 1 ? "MULTIPLE_ABNORMALITIES" : types[0];
  const makeGroup = location => {
    const items = abnormalities.filter(item => item.location === location);
    if (!items.length) return null;
    const groupTypes = [...new Set(items.map(item => item.type))];
    const labelType = groupTypes.length > 1 ? "multiple abnormalities" : groupTypes[0] === "EXPECTED_REACTION_WEAK/MISSING" ? "weak/missing" : groupTypes[0] === "UNEXPECTED_REACTION_PRESENT" ? "present" : "mixed field";
    return {label:`${location.toLowerCase()} typing - ${labelType}`,details:items.map(item => `${item.target}: expected ${item.expected}, actual ${item.actual}`),hasWeakMissing:items.some(item => item.type === "EXPECTED_REACTION_WEAK/MISSING"),hasUnexpectedPresent:items.some(item => item.type === "UNEXPECTED_REACTION_PRESENT"),unexpectedKeys:items.filter(item => item.type === "UNEXPECTED_REACTION_PRESENT").map(item => item.key)};
  };
  const expectedPattern = {antiA:pattern.antiA.label,antiB:pattern.antiB.label,a1cell:pattern.a1cell.label,bcell:pattern.bcell.label};
  return {candidateABO:candidate.candidateABO,tiedCandidates:[],scores:candidate.scores,classification,location:[...new Set(abnormalities.map(item => item.location))].join(" + ") || null,abnormalities,front:makeGroup("FRONT"),back:makeGroup("BACK"),expectedPattern,rhD,reference:`${candidate.candidateABO}형`};
}

document.getElementById("analyzeButton").addEventListener("click", () => {
  initialABOResults = readResults();
  aboCaseHistory = {initial:null,manualIS:null,rt15:null};
  aboCaseState = createABOCaseState();
  recordABOHistory("initial", initialABOResults);
  showResult(buildAnalysis(initialABOResults));
});
document.getElementById("resetButton").addEventListener("click", () => {
  document.querySelectorAll('.grade-options input[value="0"]').forEach(x => x.checked = true);
  document.querySelectorAll('.checks input').forEach(x => x.checked = false);
  document.getElementById("patientType").value = "adult";
  document.getElementById("previousType").value = "";
  initialABOResults = null;
  aboCaseHistory = {initial:null,manualIS:null,rt15:null};
  aboCaseState = createABOCaseState();
  document.getElementById("resultState").hidden = true;
  document.getElementById("emptyState").hidden = false;
});

renderInputs();
