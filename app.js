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
    discrepancy, weakD, causes:[...new Set(causes)], steps
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
    ${a.discrepancy ? `<div class="is-callout"><div><small>NEXT STEP · MANUAL IS</small><strong>수기법 IS로 재검하세요</strong><p>재검 후 관찰한 성상을 다시 입력해 불일치 해소 여부를 확인합니다.</p></div><button type="button" id="startIsButton">IS 재검 입력 <span>→</span></button></div>` : ""}
    <div id="isArea"></div>
    <div class="cause-box"><h3>가능성이 있는 항목</h3><div class="cause-list">${a.causes.map(c => `<span>${c}</span>`).join("")}</div></div>
    <div class="workflow"><h3>권장 확인검사 순서</h3><ol>${a.steps.map((s,i) => `<li data-step="${String(i+1).padStart(2,"0")}">${s}</li>`).join("")}</ol></div>
    <p class="warning">이 결과는 입력값 기반의 규칙형 안내이며 진단이나 최종 혈액형 판정이 아닙니다. 검사법·시약 제조사 지침·기관 SOP가 우선합니다.</p>`;
  if (a.discrepancy) document.getElementById("startIsButton").addEventListener("click", showISForm);
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
  const match = findNormalPattern(r);
  const box = document.getElementById("isResult");
  if (match) {
    box.className = "is-outcome resolved";
    box.innerHTML = `<span>RESOLVED</span><strong>IS 재검에서 Rh${match.rh} ${match.type}형 정상 성상입니다.</strong><p>초기 불일치가 수기법 IS 재검에서 해소되었습니다. 이전 결과와 비교하고 기관 SOP에 따라 최종 검증·보고하세요.</p>`;
  } else {
    const classification = classifyISDiscrepancy(r);
    const hasWeakMissing = [classification.front, classification.back].some(item => item?.hasWeakMissing);
    // IS 재검 후에도 불일치가 남으면 분류와 관계없이 15분 방치 재검으로 진행한다.
    const needs15Min = true;
    box.className = "is-outcome unresolved";
    box.dataset.frontClassification = classification.front?.label || "normal";
    box.dataset.backClassification = classification.back?.label || "normal";
    box.innerHTML = `<span>UNRESOLVED</span><strong>IS 재검에서도 불일치가 지속됩니다.</strong>
      <p>${hasWeakMissing ? "Weak/missing 반응이 확인되었습니다. Manual법으로 15분간 방치한 뒤 성상을 다시 판정하세요." : "불일치가 해소되지 않았습니다. Manual법으로 15분간 방치한 뒤 성상을 다시 판정하세요."}</p>
      ${needs15Min ? `<div id="manual15Area"></div>` : ""}`;
    if (needs15Min) showManual15Form();
  }
  box.scrollIntoView({behavior:"smooth", block:"nearest"});
}

function showManual15Form() {
  const area = document.getElementById("manual15Area");
  area.innerHTML = `<div class="manual15-form"><div class="is-form-head"><span>03</span><div><strong>Manual 15분 방치 후 결과</strong><small>15분 후 응집 성상 재판정</small></div></div>
    ${renderManualGroup("m15", "Front Typing", "정형검사", tests.filter(test => test.group === "forward"), manualFrontGrades)}
    ${renderManualGroup("m15", "Back Typing", "역형검사", tests.filter(test => test.group === "reverse"), manualBackGrades)}
    <button type="button" class="is-analyze-button" id="analyze15MinButton">15분 결과 재판정 <span>→</span></button><div id="manual15Result"></div></div>`;
  document.getElementById("analyze15MinButton").addEventListener("click", analyzeManual15);
}

function analyzeManual15() {
  const r = readManualResults("m15");
  const match = findNormalPattern(r);
  const box = document.getElementById("manual15Result");
  box.className = `is-outcome ${match ? "resolved" : "unresolved"}`;
  box.innerHTML = match
    ? `<span>RESOLVED</span><strong>15분 후 Rh${match.rh} ${match.type}형 정상 성상입니다.</strong><p>기관 SOP에 따라 최종 검증·보고하세요.</p>`
    : `<span>UNRESOLVED</span><strong>15분 방치 후에도 불일치가 지속됩니다.</strong><p>ABO/RhD형을 확정하지 말고 원인별 추가검사를 진행하세요.</p>`;
}

function classifyISDiscrepancy(r) {
  const keys = ["antiA", "antiB", "antiD", "a1cell", "bcell"];
  const frontKeys = ["antiA", "antiB", "antiD"];
  const backKeys = ["a1cell", "bcell"];
  const names = {antiA:"Anti-A", antiB:"Anti-B", antiD:"Anti-D", a1cell:"A₁ cell", bcell:"B cell"};
  const isMixed = value => typeof value === "string" && value.startsWith("mf");
  const expectedPositive = (p, key) => Array.isArray(p[key]) ? p[key][0] >= 2 : p[key] === 4;
  const observedPositive = value => isMixed(value) || value > 0;
  const normalFor = (p, key, value) => !isMixed(value) && (Array.isArray(p[key]) ? value >= p[key][0] && value <= p[key][1] : value === p[key]);
  const reference = normalPatterns.map(p => ({p, score:keys.filter(key => !normalFor(p, key, r[key])).length})).sort((a,b) => a.score - b.score)[0].p;
  const classifyGroup = (groupName, groupKeys) => {
    const mixed = [], missingWeak = [], unexpectedPresent = [];
    groupKeys.forEach(key => {
      const value = r[key];
      if (isMixed(value)) mixed.push(`${names[key]} ${value.slice(2)}+`);
      else if (expectedPositive(reference, key) && !normalFor(reference, key, value)) missingWeak.push(`${names[key]} ${value === 0 ? "소실" : "약화"}`);
      else if (!expectedPositive(reference, key) && observedPositive(value)) unexpectedPresent.push(`${names[key]} 예상 밖 양성`);
    });
    const categoryCount = [mixed.length, missingWeak.length, unexpectedPresent.length].filter(Boolean).length;
    if (!categoryCount) return null;
    const prefix = `${groupName} - `;
    if (categoryCount > 1) return {label:`${prefix}multiple abnormalities`, details:[...mixed, ...missingWeak, ...unexpectedPresent], hasWeakMissing:missingWeak.length > 0};
    if (mixed.length) return {label:`${prefix}mixed field`, details:mixed, hasWeakMissing:false};
    if (unexpectedPresent.length) return {label:`${prefix}present`, details:unexpectedPresent, hasWeakMissing:false};
    return {label:`${prefix}weak/missing`, details:missingWeak, hasWeakMissing:true};
  };

  return {
    reference:`Rh${reference.rh} ${reference.type}형`,
    front:classifyGroup("front typing", frontKeys),
    back:classifyGroup("back typing", backKeys)
  };
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
