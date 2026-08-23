// DiaMed ABO Identification Chart에서 ABO subgroup 관련 행만 구조화한 참고 지식입니다.
// 확정 진단, Candidate ABO 계산, discrepancy classification에는 사용하지 않습니다.
window.aboSubgroupReference = Object.freeze({
  sourceScope: "DiaMed Bloodgroup ABO Identification Chart · subgroup rows only",
  usagePolicy: "Reference similarity only. Laboratory SOP and validated local case data take priority.",
  fields: ["antiA","antiB","antiAB","antiA1","antiH","a1Cell","a2Cell","bCell"],
  phenotypes: [
    {group:"A", phenotype:"A1", expected:{antiA:"4",antiB:"0",antiAB:"4",antiA1:"4",antiH:"0",a1Cell:"0",a2Cell:"0",bCell:"4"}, remarks:["Common A1 pattern"]},
    {group:"A", phenotype:"Aint", expected:{antiA:"4",antiB:"0",antiAB:"4",antiA1:"2",antiH:"3",a1Cell:"0",a2Cell:"0",bCell:"4"}, remarks:["Intermediate A1/A2-like lectin pattern"]},
    {group:"A", phenotype:"A2", expected:{antiA:"4",antiB:"0",antiAB:"4",antiA1:"0",antiH:"3",a1Cell:"0",a2Cell:"0",bCell:"4"}, remarks:["Anti-A1 may rarely be present", "If serum reacts with A1 but not A2 cells, evaluate anti-A1"]},
    {group:"A", phenotype:"A3", expected:{antiA:"2(MF)",antiB:"0",antiAB:"2(MF)",antiA1:"0",antiH:"3-4",a1Cell:"0-0.5",a2Cell:"0",bCell:"4"}, remarks:["Mixed-field/double-cell-population pattern", "Approximately 60–70% agglutinated cells in the chart"]},
    {group:"A", phenotype:"Ax", expected:{antiA:"0-1",antiB:"0",antiAB:"0.5-2",antiA1:"0",antiH:"4",a1Cell:"0.5-2",a2Cell:"0",bCell:"4"}, remarks:["Anti-A1 can be present", "Adsorption–elution may be required"]},
    {group:"A", phenotype:"Aend", expected:{antiA:"1(MF)",antiB:"0",antiAB:"1(MF)",antiA1:"0",antiH:"4",a1Cell:"0-0.5",a2Cell:"0",bCell:"4"}, remarks:["Very weak A expression", "Adsorption–elution may be required"]},
    {group:"A", phenotype:"Am", expected:{antiA:"0-1",antiB:"0",antiAB:"0-1",antiA1:"0",antiH:"4",a1Cell:"0-2",a2Cell:"0",bCell:"4"}, remarks:["Weak/nonreactive routine antisera possible", "Adsorption–elution and saliva testing recommended"]},
    {group:"A", phenotype:"Ay", expected:{antiA:"0",antiB:"0",antiAB:"0",antiA1:"0",antiH:"4",a1Cell:"0",a2Cell:"0",bCell:"4"}, remarks:["Very weak A substance", "Adsorption–elution may be strongly positive"]},
    {group:"A", phenotype:"Ael", expected:{antiA:"0",antiB:"0",antiAB:"0",antiA1:"0",antiH:"4",a1Cell:"2",a2Cell:"0-1",bCell:"4"}, remarks:["Anti-A1 may be present", "Adsorption–elution with anti-IgG AHG may be needed"]},

    {group:"B", phenotype:"B", expected:{antiA:"0",antiB:"4",antiAB:"4",antiA1:null,antiH:"0",a1Cell:"4",a2Cell:"3",bCell:"0"}, remarks:["Common B pattern"]},
    {group:"B", phenotype:"B3", expected:{antiA:"0",antiB:"2(MF)",antiAB:"2(MF)",antiA1:null,antiH:"4",a1Cell:"4",a2Cell:"3",bCell:"0"}, remarks:["Mixed-field/double-cell-population pattern", "Approximately 60–70% agglutinated cells in the chart"]},
    {group:"B", phenotype:"Bx", expected:{antiA:"0",antiB:"0-1",antiAB:"0.5-2",antiA1:null,antiH:"4",a1Cell:"4",a2Cell:"3",bCell:"0-1"}, remarks:["Anti-B may be present in serum", "Adsorption–elution and saliva testing recommended"]},
    {group:"B", phenotype:"Bm", expected:{antiA:"0",antiB:"0-1",antiAB:"0-1",antiA1:null,antiH:"4",a1Cell:"4",a2Cell:"3",bCell:"0"}, remarks:["Very weak B expression", "Adsorption–elution may be strongly positive"]},
    {group:"B", phenotype:"Other B subgroup", expected:{antiA:"0",antiB:"0-2",antiAB:"0-2",antiA1:null,antiH:"3-4",a1Cell:"3-4",a2Cell:"2-4",bCell:"0-1"}, remarks:["Use as a broad reference only", "Consider adsorption–elution, saliva testing and ABO genotyping"]},

    {group:"AB", phenotype:"A1B", expected:{antiA:"4",antiB:"4",antiAB:"4",antiA1:"4",antiH:"0",a1Cell:"0",a2Cell:"0",bCell:"0"}, remarks:["Common A1B pattern"]},
    {group:"AB", phenotype:"A2B", expected:{antiA:"4",antiB:"4",antiAB:"4",antiA1:"0",antiH:"0",a1Cell:"0",a2Cell:"0",bCell:"0"}, remarks:["Anti-A1 may occur in a subset"]},
    {group:"AB", phenotype:"A3B", expected:{antiA:"2(MF)",antiB:"4",antiAB:"4",antiA1:"0",antiH:"0",a1Cell:"0-0.5",a2Cell:"0",bCell:"0"}, remarks:["A-component mixed-field pattern", "Anti-A1 may rarely be present"]},
    {group:"AB", phenotype:"AxB", expected:{antiA:"0-1",antiB:"4",antiAB:"4",antiA1:"0",antiH:"0",a1Cell:"0.5-2",a2Cell:"0",bCell:"0"}, remarks:["Anti-A1 is often present"]},
    {group:"AB", phenotype:"cis-AB", expected:{antiA:"4",antiB:"2(MF)",antiAB:"4",antiA1:"0",antiH:"2",a1Cell:"0",a2Cell:"0",bCell:"0-1"}, remarks:["H antigen may be present", "Confirm with family study and ABO genotyping"]}
  ]
});
