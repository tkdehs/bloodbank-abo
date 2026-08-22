const grades = ["0", "0.5+", "1+", "2+", "3+", "4+"];
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
  { id: "a1cell", name: "A₁ cell", desc: "Anti-A 확인", group: "reverse" },
  { id: "bcell", name: "B cell", desc: "Anti-B 확인", group: "reverse" }
];

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
  const classification = classifyISDiscrepancy(r);
  const match = classification.classification === "NORMAL" ? normalCandidateResult(classification, r) : null;
  const box = document.getElementById("isResult");
  if (match) {
    box.className = "is-outcome resolved";
    box.innerHTML = `<span>RESOLVED</span><strong>IS 재검에서 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${renderCandidateSummary(classification)}<p>초기 ABO 불일치가 수기법 IS 재검에서 해소되었습니다. RhD는 별도 판정이며 기관 SOP에 따라 최종 검증·보고하세요.</p>`;
  } else {
    const frontUnexpectedRule = createUnexpectedRule(classification, "FRONT");
    const hasWeakMissing = [classification.front, classification.back].some(item => item?.hasWeakMissing);
    const hasFrontMixedField = classification.abnormalities.some(item => item.location === "FRONT" && item.type === "MIXED_FIELD");
    const fifteenMinuteLocations = [classification.front?.hasWeakMissing || hasFrontMixedField ? "FRONT" : null, classification.back?.hasWeakMissing ? "BACK" : null].filter(Boolean);
    const needsWarm25 = Boolean(frontUnexpectedRule || classification.front?.hasUnexpectedPresent);
    // 여러 abnormality가 있으면 각 후속 경로를 병렬로 유지한다.
    const needs15Min = hasWeakMissing || hasFrontMixedField;
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
      ${needsWarm25 ? `<div id="warm25Area"></div>` : ""}
      ${needs15Min ? `<div id="manual15Area"></div>` : ""}`;
    if (needsWarm25) showWarm25Form(r, frontUnexpectedRule ? {...classification, front:{...classification.front, unexpectedKeys:frontUnexpectedRule.abnormalKeys}} : classification);
    if (needs15Min) showManual15Form(r, fifteenMinuteLocations);
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
  box.innerHTML = match
    ? `<span>RESOLVED</span><strong>37℃ 방치 후 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${comparison}${rhDGuidance}<p>Cold-reactive antibody 간섭 가능성을 기록하고 기관 SOP에 따라 최종 검증하세요.</p>`
    : weakenedButPresent.length
      ? `<span>COLD ANTIBODY SUSPECTED</span><strong>37℃ 반응 후 응집이 약해졌지만 남아 있습니다.</strong>${comparison}${rhDGuidance}${remainingPathways}<p>${weakenedButPresent.map(key => tests.find(test => test.id === key)?.name).join(", ")} 반응 감소가 확인되었습니다. Cold antibody screening 검사를 진행하고, 기관 SOP에 따라 항체선별검사·자가대조·DAT를 검토하세요.</p>`
      : `<span>UNRESOLVED</span><strong>37℃ 25분 방치 후에도 불일치가 지속됩니다.</strong>${comparison}${rhDGuidance}${remainingPathways}<p>남은 abnormality가 있어 전체 상태를 UNRESOLVED로 유지합니다. ABO/RhD형을 확정하지 말고 원인별 추가검사를 진행하세요.</p>`;
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
  return `<div class="back-resolution"><small>BACK UNEXPECTED RESOLUTION</small><strong>${rule.abnormalTargets.join(", ")} unexpected reaction</strong><p>15분 방치는 시행하지 않습니다. 연전 및 과거력을 확인하고 Ab screening 검사 및 37℃ 조건 ABO 검사를 시행하세요.</p></div>`;
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
    ["Anti-D","0 또는 4+",result.actual.antiD], ["A₁ cell",result.expectedMap.a1cell,result.actual.a1cell],
    ["B cell",result.expectedMap.bcell,result.actual.bcell]
  ];
  return `<div class="comparison-box"><div class="comparison-title">Expected vs Actual · ${result.group}형 기준</div>${rows.map(([name,expected,actual]) => `<div><span>${name}</span><b>${expected}</b><em>${displayReaction(actual)}</em></div>`).join("")}</div>`;
}

function renderCandidateSummary(analysis) {
  const candidate = analysis.candidateABO;
  const tied = candidate === "CANDIDATE_AMBIGUOUS" ? `<em>동률: ${analysis.tiedCandidates.join(", ")}</em>` : "";
  return `<div class="candidate-summary"><small>Candidate ABO · 불일치 분석 기준 phenotype</small><strong>${candidate}</strong>${tied}<span>Classification · ${analysis.classification}</span><i>최종 ABO 확정 아님</i></div>${renderRhDGuidance(analysis.rhD)}`;
}

function showManual15Form(sourceResults, locations) {
  const area = document.getElementById("manual15Area");
  area.innerHTML = `<div class="manual15-form"><div class="is-form-head"><span>03</span><div><strong>Manual 15분 방치 후 결과</strong><small>15분 후 응집 성상 재판정</small></div></div>
    ${locations.includes("FRONT") ? renderManualGroup("m15", "Front Typing", "정형검사", tests.filter(test => test.group === "forward"), manualFrontGrades) : ""}
    ${locations.includes("BACK") ? renderManualGroup("m15", "Back Typing", "역형검사", tests.filter(test => test.group === "reverse"), manualBackGrades) : ""}
    <button type="button" class="is-analyze-button" id="analyze15MinButton">15분 결과 재판정 <span>→</span></button><div id="manual15Result"></div></div>`;
  document.getElementById("analyze15MinButton").addEventListener("click", () => analyzeManual15(sourceResults));
}

function analyzeManual15(sourceResults) {
  const r = Object.fromEntries(tests.map(test => {
    const selected = document.querySelector(`input[name="m15-${test.id}"]:checked`);
    if (!selected) return [test.id,sourceResults[test.id]];
    return [test.id,selected.value.startsWith("mf") ? selected.value : valueOf(selected.value)];
  }));
  const reanalysis = analyzeExpectedVsActual(r);
  const classification = reanalysis.generic;
  const match = classification.classification === "NORMAL" ? normalCandidateResult(classification, r) : null;
  const frontUnexpectedRule = match ? null : createUnexpectedRule(classification, "FRONT");
  const subtypeTargets = match ? [] : detectSubtypeTargets(classification);
  const box = document.getElementById("manual15Result");
  box.className = `is-outcome ${match ? "resolved" : "unresolved"}`;
  box.innerHTML = match
    ? `<span>RESOLVED</span><strong>15분 후 ${match.rh} ${match.type}형 정상 ABO 성상입니다.</strong>${renderCandidateSummary(classification)}${renderExpectedActual(reanalysis)}<p>RhD는 별도 판정이며 기관 SOP에 따라 최종 검증·보고하세요.</p>`
    : `<span>REANALYZED</span><strong>15분 후 결과를 Candidate ABO부터 다시 분석했습니다.</strong>${renderCandidateSummary(classification)}${renderExpectedActual(reanalysis)}${renderAbnormalityPathways(classification, "15MIN")}<p>한쪽 pathway가 해결되어도 남은 abnormality가 있어 전체 상태를 UNRESOLVED로 유지합니다.</p>${frontUnexpectedRule ? `<div id="warm25Area"></div>` : ""}${subtypeTargets.length ? `<div id="subtypeArea"></div>` : ""}`;
  if (frontUnexpectedRule) showWarm25Form(r, {...classification,front:{...classification.front,unexpectedKeys:frontUnexpectedRule.abnormalKeys}});
  if (subtypeTargets.length) showSubtypeForm(subtypeTargets, r);
}

function detectSubtypeTargets(classification) {
  if (!classification?.front || classification.candidateABO === "CANDIDATE_AMBIGUOUS") return [];
  const subgroupAbnormalities = classification.abnormalities.filter(item =>
    item.location === "FRONT" && (item.type === "EXPECTED_REACTION_WEAK/MISSING" || item.type === "MIXED_FIELD")
  );
  const candidate = classification.candidateABO;
  const aSuspected = (candidate === "A" || candidate === "AB") && subgroupAbnormalities.some(item => item.key === "antiA");
  const bSuspected = (candidate === "B" || candidate === "AB") && subgroupAbnormalities.some(item => item.key === "antiB");
  return [aSuspected ? "A" : null, bSuspected ? "B" : null].filter(Boolean);
}

function showSubtypeForm(targets, manualResult) {
  const area = document.getElementById("subtypeArea");
  const subtypeGrades = grades.map(grade => ({label:grade, value:grade}));
  const testRows = [];
  if (targets.includes("A")) testRows.push({id:"antiA1", name:"Anti-A₁", desc:"A₁ lectin"});
  testRows.push({id:"antiH", name:"Anti-H", desc:"H lectin"});
  area.innerHTML = `<div class="subtype-form"><div class="is-form-head"><span>04</span><div><strong>${targets.join("/")}형 아형검사</strong><small>Lectin 반응 성상 입력</small></div></div>
    <div class="subtype-note">${targets.includes("A") ? "Anti-A₁과 Anti-H" : "Anti-H"} 결과를 입력하세요.</div>
    <div class="is-test-list">${testRows.map(test => `<div class="is-test-row"><span>${test.name}<small>${test.desc}</small></span><div class="is-grade-options">${subtypeGrades.map((grade,i) => `<input type="radio" id="sub-${test.id}-${i}" name="sub-${test.id}" value="${grade.value}" ${i===0?"checked":""}><label for="sub-${test.id}-${i}">${grade.label}</label>`).join("")}</div></div>`).join("")}</div>
    <button type="button" class="is-analyze-button" id="analyzeSubtypeButton">아형 의심 결과 확인 <span>→</span></button><div id="subtypeResult"></div></div>`;
  document.getElementById("analyzeSubtypeButton").addEventListener("click", () => analyzeSubtype(targets, manualResult));
}

function analyzeSubtype(targets, r) {
  const antiH = valueOf(document.querySelector('input[name="sub-antiH"]:checked').value);
  const antiA1 = targets.includes("A") ? valueOf(document.querySelector('input[name="sub-antiA1"]:checked').value) : null;
  const results = [];
  const numericStrength = value => typeof value === "string" && value.startsWith("mf") ? Number(value.slice(2)) : value;
  const antiA = numericStrength(r.antiA), antiB = numericStrength(r.antiB);
  const aMF = typeof r.antiA === "string" && r.antiA.startsWith("mf");
  const bMF = typeof r.antiB === "string" && r.antiB.startsWith("mf");

  if (targets.includes("A")) {
    let suspected;
    if (antiA1 > 0) suspected = "A₁ 또는 A₁B 유사 성상";
    else if (antiH >= 2 && antiH <= 3 && antiA >= 3 && !aMF) suspected = "A₂ 또는 A₂B 아형";
    else if (antiH >= 3 && (aMF || antiA === 2)) suspected = "A₃ 계열 아형";
    else if (antiH >= 3 && antiA > 0 && antiA <= 1) suspected = "Aₓ 계열 아형";
    else if (antiH >= 3 && antiA === 0) suspected = "Ael 등 매우 약한 A 아형";
    else suspected = "A 아형 가능 — 혈청학적 패턴만으로 세부형 미확정";
    results.push({group:"A", suspected});
  }
  if (targets.includes("B")) {
    let suspected;
    if (bMF || antiB === 2) suspected = "B₃ 계열 아형";
    else if (antiB > 0 && antiB <= 1) suspected = "Bₓ 계열 아형";
    else if (antiB === 0) suspected = "Bel 등 매우 약한 B 아형";
    else suspected = "B 아형 가능 — 추가 확인 필요";
    results.push({group:"B", suspected});
  }
  const box = document.getElementById("subtypeResult");
  box.className = "subtype-outcome";
  box.innerHTML = `<span>SUSPECTED SUBGROUP</span>${results.map(item => `<strong>${item.suspected}</strong>`).join("")}<p>Anti-H 반응만으로 B 아형을 확정할 수 없습니다. Anti-A,B, 흡착·용출, 타액검사 및 ABO 유전형 검사 등 기관 SOP의 확정검사를 시행하세요.</p>`;
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
  const names = {antiA:"Anti-A",antiB:"Anti-B",a1cell:"A₁ cell",bcell:"B cell"};
  const locations = {antiA:"FRONT",antiB:"FRONT",a1cell:"BACK",bcell:"BACK"};
  const candidate = estimateCandidateABO(r);
  const rhD = analyzeRhD(r.antiD);
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

document.getElementById("analyzeButton").addEventListener("click", () => showResult(buildAnalysis(readResults())));
document.getElementById("resetButton").addEventListener("click", () => {
  document.querySelectorAll('.grade-options input[value="0"]').forEach(x => x.checked = true);
  document.querySelectorAll('.checks input').forEach(x => x.checked = false);
  document.getElementById("patientType").value = "adult";
  document.getElementById("previousType").value = "";
  document.getElementById("resultState").hidden = true;
  document.getElementById("emptyState").hidden = false;
});

renderInputs();
