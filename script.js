const d = dashboardData;
const $ = s => document.querySelector(s);
const fmt = n => Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "–";
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

function planAt(project, i){ return project.plan?.[i] ?? d.standardPlan[i]; }
function actualAt(project, i){ return project.actual?.[i] ?? null; }
function statusFor(actual, plan){
  if(actual === null || actual === undefined) return {key:"none",label:"ไม่มีข้อมูล",delta:null};
  const delta = actual - plan;
  if(delta >= -5) return {key:"green",label:"ปกติ",delta};
  if(delta >= -15) return {key:"amber",label:"เฝ้าระวัง",delta};
  return {key:"red",label:"ล่าช้า",delta};
}
function selectedMonth(){ return Number($("#monthSelect").value); }
function availableProjects(i){ return d.projects.filter(p => actualAt(p,i) !== null); }
function avgAt(i, type){
  const ps = availableProjects(i); if(!ps.length) return null;
  return ps.reduce((s,p)=>s+(type==="actual"?actualAt(p,i):planAt(p,i)),0)/ps.length;
}

const monthSelect = $("#monthSelect");
d.months.forEach((m,i)=>{const o=document.createElement("option");o.value=i;o.textContent=m;monthSelect.appendChild(o)});
monthSelect.value=d.meta.latestMonthIndex;
$("#planNote").textContent=d.meta.planNote;
$("#footerSource").textContent=`แหล่งข้อมูล: ${d.meta.source}`;

let planActualChart, statusChart;
function buildCharts(i){
  const labels=d.months.slice(0,i+1);
  const plans=labels.map((_,x)=>avgAt(x,"plan"));
  const actuals=labels.map((_,x)=>avgAt(x,"actual"));
  if(planActualChart) planActualChart.destroy();
  planActualChart=new Chart($("#planActualChart"),{type:"line",data:{labels,datasets:[
    {label:"แผนสะสมเฉลี่ย (%)",data:plans,borderColor:"#c5a058",backgroundColor:"#c5a05818",borderDash:[6,4],pointRadius:2,tension:.25},
    {label:"ผลสะสมเฉลี่ย (%)",data:actuals,borderColor:"#2f80c9",backgroundColor:"#2f80c916",fill:true,pointRadius:3,tension:.25}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom"}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+"%"}}}}});

  const ps=availableProjects(i), counts={green:0,amber:0,red:0};
  ps.forEach(p=>{const s=statusFor(actualAt(p,i),planAt(p,i)); if(counts[s.key]!==undefined) counts[s.key]++});
  if(statusChart) statusChart.destroy();
  statusChart=new Chart($("#statusChart"),{type:"doughnut",data:{labels:["ปกติ","เฝ้าระวัง","ล่าช้า"],datasets:[{data:[counts.green,counts.amber,counts.red],backgroundColor:["#2f80c9","#c8a44d","#c84444"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{display:false}}}});
}

function renderKpis(i){
  const ps=availableProjects(i), plan=avgAt(i,"plan"), actual=avgAt(i,"actual"), variance=actual-plan;
  $("#kpiTotal").textContent=ps.length;
  $("#kpiPlan").textContent=fmt(plan);
  $("#kpiActual").textContent=fmt(actual);
  $("#kpiVariance").textContent=(variance>=0?"+":"")+fmt(variance);
  const vc=$("#varianceCard");vc.classList.remove("positive","warning","negative");vc.classList.add(variance>=0?"positive":variance>=-10?"warning":"negative");
  const counts={green:0,amber:0,red:0};let done=0;
  ps.forEach(p=>{const a=actualAt(p,i),s=statusFor(a,planAt(p,i));if(counts[s.key]!==undefined)counts[s.key]++;if(a>=100)done++});
  $("#greenCount").textContent=counts.green;$("#amberCount").textContent=counts.amber;$("#redCount").textContent=counts.red;$("#doneCount").textContent=done;
  $("#subtitle").textContent=`ปีงบประมาณ ${d.meta.fiscalYear} · เดือนรายงาน ${d.months[i]}`;
  $("#chartMonthChip").textContent=d.months[i];
}

function monthlyRows(p, selected){
  return d.months.map((m,i)=>{
    const a=actualAt(p,i), plan=planAt(p,i); if(a===null && i>selected) return "";
    const s=statusFor(a,plan), delta=s.delta;
    return `<tr class="${i===selected?'selected':''}"><td>${m}${i===selected?'<span class="mini-status '+s.key+'"></span>':''}</td><td>${fmt(plan)}%</td><td>${a===null?'–':fmt(a)+'%'}</td><td>${delta===null?'–':(delta>=0?'+':'')+fmt(delta)}</td></tr>`;
  }).join("");
}

function renderProjects(i){
  const q=$("#searchInput").value.trim().toLowerCase(), f=$("#statusFilter").value;
  const html=d.projects.map(p=>{
    const a=actualAt(p,i); if(a===null) return null;
    const plan=planAt(p,i), s=statusFor(a,plan), delta=s.delta;
    if(q && !(p.name+" "+p.unit).toLowerCase().includes(q)) return null;
    if(f && s.key!==f) return null;
    return `<article class="project-item" data-id="${p.id}">
      <div class="project-summary" role="button" tabindex="0" aria-expanded="false">
        <div><div class="project-name">${p.id}. ${p.name}</div><span class="unit">${p.unit} · สถานะเดิม: ${p.officialStatus}</span></div>
        <div class="metric">${fmt(plan)}%</div>
        <div class="metric">${fmt(a)}%</div>
        <div class="metric variance ${delta>=0?'pos':'neg'}">${delta>=0?'+':''}${fmt(delta)}</div>
        <div class="traffic ${s.key}">${s.label}</div>
        <div class="chev">⌄</div>
      </div>
      <div class="project-detail">
        <div class="detail-grid">
          <div class="detail-meta"><h3>ข้อมูลโครงการ</h3><p><b>ตัวชี้วัด:</b> ${p.indicator}</p><p><b>เดือนที่เลือก:</b> ${d.months[i]}</p><p><b>ผลล่าสุด:</b> ${fmt(a)}% / แผน ${fmt(plan)}%</p><div class="progress-track"><i style="width:${clamp(a,0,100)}%"></i></div><p>ส่วนต่าง <b class="variance ${delta>=0?'pos':'neg'}">${delta>=0?'+':''}${fmt(delta)}</b> จุดร้อยละ</p></div>
          <div><table class="monthly-table"><thead><tr><th>เดือน</th><th>แผน</th><th>ผล</th><th>ส่วนต่าง</th></tr></thead><tbody>${monthlyRows(p,i)}</tbody></table></div>
        </div>
      </div>
    </article>`;
  }).filter(Boolean).join("");
  $("#projectList").innerHTML=html || '<div style="padding:24px;color:#748078;text-align:center">ไม่พบโครงการตามตัวกรอง</div>';
  document.querySelectorAll(".project-summary").forEach(el=>{
    const toggle=()=>{const item=el.closest(".project-item"),open=item.classList.toggle("open");el.setAttribute("aria-expanded",open)};
    el.addEventListener("click",toggle);el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}});
  });
}

function renderAll(){const i=selectedMonth();renderKpis(i);buildCharts(i);renderProjects(i)}
monthSelect.addEventListener("change",renderAll);$("#yearSelect").addEventListener("change",renderAll);$("#searchInput").addEventListener("input",()=>renderProjects(selectedMonth()));$("#statusFilter").addEventListener("change",()=>renderProjects(selectedMonth()));
renderAll();
