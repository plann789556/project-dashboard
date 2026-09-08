(function () {
  "use strict";

  function start() {
    var d = window.DASHBOARD_DATA;
    if (!d || !Array.isArray(d.projects)) {
      document.body.insertAdjacentHTML("afterbegin", '<div class="error-banner">ไม่พบข้อมูล Dashboard กรุณาตรวจสอบไฟล์ data.js</div>');
      return;
    }

    function $(s) { return document.querySelector(s); }
    function fmt(n) { return Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "–"; }
    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
    function actualAt(p, i) { return p.actual && p.actual[i] != null ? Number(p.actual[i]) : null; }
    function selectedMonth() { return Number($("#monthSelect").value); }
    function available(i) { return d.projects.filter(function (p) { return actualAt(p, i) !== null; }); }
    function avg(i) {
      var ps = available(i);
      if (!ps.length) return null;
      return ps.reduce(function (s, p) { return s + actualAt(p, i); }, 0) / ps.length;
    }
    function status(p, i) { return actualAt(p, i) >= 100 ? {key:"done",label:"แล้วเสร็จ"} : {key:"ongoing",label:"อยู่ระหว่างดำเนินการ"}; }

    d.months.forEach(function (m, i) {
      var o = document.createElement("option");
      o.value = i; o.textContent = m;
      $("#monthSelect").appendChild(o);
    });
    $("#monthSelect").value = d.meta.latestMonthIndex;
    $("#footerSource").textContent = "แหล่งข้อมูล: " + d.meta.source;

    function renderLineChart(i) {
      var el = $("#actualChart");
      var values = d.months.slice(0, i + 1).map(function (_, x) { return avg(x); });
      var labels = d.months.slice(0, i + 1);
      var w = 760, h = 300, left = 48, right = 18, top = 18, bottom = 42;
      var pw = w-left-right, ph=h-top-bottom;
      var pts = [];
      values.forEach(function (v, idx) {
        if (v == null) return;
        var x = left + (values.length <= 1 ? 0 : idx * pw / (values.length - 1));
        var y = top + (100 - v) * ph / 100;
        pts.push(x.toFixed(1) + "," + y.toFixed(1));
      });
      var grid = "";
      [0,20,40,60,80,100].forEach(function (v) {
        var y = top + (100-v)*ph/100;
        grid += '<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" class="grid"/><text x="'+(left-10)+'" y="'+(y+4)+'" text-anchor="end" class="axis">'+v+'%</text>';
      });
      var xlabels = "";
      labels.forEach(function (lab, idx) {
        var x = left + (labels.length <= 1 ? 0 : idx * pw / (labels.length - 1));
        xlabels += '<text x="'+x+'" y="'+(h-14)+'" text-anchor="middle" class="axis">'+lab+'</text>';
      });
      var points = "";
      values.forEach(function (v, idx) {
        if (v == null) return;
        var x = left + (values.length <= 1 ? 0 : idx * pw / (values.length - 1));
        var y = top + (100-v)*ph/100;
        points += '<circle cx="'+x+'" cy="'+y+'" r="4" class="point"><title>'+labels[idx]+': '+fmt(v)+'%</title></circle>';
      });
      var area = "";
      if (pts.length > 1) {
        area = '<polygon points="'+left+','+(top+ph)+' '+pts.join(' ')+' '+(w-right)+','+(top+ph)+'" class="area"/>';
      }
      el.innerHTML = '<svg class="line-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="แนวโน้มความก้าวหน้าเฉลี่ย">'+grid+area+'<polyline points="'+pts.join(' ')+'" class="line"/>'+points+xlabels+'</svg>';
    }

    function renderDonut(i) {
      var ps = available(i);
      var done = ps.filter(function (p) { return actualAt(p, i) >= 100; }).length;
      var ongoing = ps.length - done;
      var pct = ps.length ? done / ps.length * 100 : 0;
      $("#statusDonut").style.background = "conic-gradient(#2f80c9 0 " + pct + "%, #c84444 " + pct + "% 100%)";
      $("#donutTotal").textContent = ps.length;
    }

    function kpis(i) {
      var ps = available(i), done = ps.filter(function (p) { return actualAt(p, i) >= 100; }).length;
      $("#kpiTotal").textContent = ps.length;
      $("#kpiDone").textContent = done;
      $("#kpiOngoing").textContent = ps.length - done;
      $("#kpiActual").textContent = fmt(avg(i));
      $("#subtitle").textContent = "ปีงบประมาณ " + d.meta.fiscalYear + " · เดือนรายงาน " + d.months[i];
      $("#chartMonthChip").textContent = d.months[i];
    }

    function rows(p, sel) {
      return d.months.map(function (m, i) {
        var a = actualAt(p, i);
        if (a === null && i > sel) return "";
        return '<tr class="'+(i===sel?'selected':'')+'"><td>'+m+'</td><td>'+(a===null?'–':fmt(a)+'%')+'</td></tr>';
      }).join("");
    }

    function projects(i) {
      var q = $("#searchInput").value.trim().toLowerCase();
      var f = $("#statusFilter").value;
      var html = d.projects.map(function (p) {
        var a = actualAt(p, i);
        if (a === null) return null;
        var s = status(p, i);
        if (q && (p.name + " " + p.unit).toLowerCase().indexOf(q) === -1) return null;
        if (f && s.key !== f) return null;
        return '<article class="project-item">'+
          '<div class="project-summary" role="button" tabindex="0" aria-expanded="false">'+
            '<div><div class="project-name">'+p.id+'. '+p.name+'</div><span class="unit">'+p.unit+' · สถานะข้อมูล: '+p.officialStatus+'</span></div>'+
            '<div class="metric">'+fmt(a)+'%</div><div class="traffic '+(s.key==='done'?'blue-status':'red-status')+'">'+s.label+'</div><div class="chev">⌄</div>'+ 
          '</div>'+
          '<div class="project-detail"><div class="detail-grid"><div class="detail-meta"><h3>ข้อมูลโครงการ</h3><p><b>ตัวชี้วัด:</b> '+p.indicator+'</p><p><b>เดือนที่เลือก:</b> '+d.months[i]+'</p><p><b>ผลล่าสุด:</b> '+fmt(a)+'%</p><div class="progress-track"><i style="width:'+clamp(a,0,100)+'%"></i></div></div><div><table class="monthly-table"><thead><tr><th>เดือน</th><th>ผลความก้าวหน้า</th></tr></thead><tbody>'+rows(p,i)+'</tbody></table></div></div></div>'+ 
        '</article>';
      }).filter(Boolean).join("");
      $("#projectList").innerHTML = html || '<div class="empty">ไม่พบโครงการตามตัวกรอง</div>';
      document.querySelectorAll(".project-summary").forEach(function (el) {
        function toggle() {
          var item = el.closest(".project-item");
          var open = item.classList.toggle("open");
          el.setAttribute("aria-expanded", open ? "true" : "false");
        }
        el.addEventListener("click", toggle);
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
      });
    }

    function render() {
      var i = selectedMonth();
      kpis(i); renderLineChart(i); renderDonut(i); projects(i);
    }

    $("#monthSelect").addEventListener("change", render);
    $("#searchInput").addEventListener("input", function () { projects(selectedMonth()); });
    $("#statusFilter").addEventListener("change", function () { projects(selectedMonth()); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
