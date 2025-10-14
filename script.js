// Unified page script for Nezha JSON tools
(function () {
  // Tabs switching
  function setupTabs() {
    var links = document.querySelectorAll('#toolTabs .nav-link');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        // nav active
        links.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        // sections active
        var target = link.getAttribute('data-target');
        document.querySelectorAll('.tab-pane').forEach(function (pane) {
          pane.classList.remove('active');
        });
        var el = document.querySelector(target);
        if (el) el.classList.add('active');
      });
    });
  }

  // Theme toggle with localStorage persistence
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    var icon = document.getElementById('themeIcon');
    var label = document.getElementById('themeLabel');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (label) label.textContent = theme === 'dark' ? '浅色' : '深色';
  }
  function getStoredTheme() {
    try { return localStorage.getItem('theme') || 'light'; } catch (e) { return 'light'; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  function setupThemeToggle() {
    var theme = getStoredTheme();
    applyTheme(theme);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = getStoredTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        setStoredTheme(next);
        applyTheme(next);
      });
    }
  }

  // Helpers
  function highlightJSON(codeId) {
    var el = document.getElementById(codeId);
    if (!el) return;
    if (window.hljs && typeof hljs.highlightBlock === 'function') {
      hljs.highlightBlock(el);
    } else if (window.hljs && typeof hljs.highlightElement === 'function') {
      hljs.highlightElement(el);
    }
  }
  function copyCode(codeId, successMsg, errorModalId, errorMsgId) {
    var ruleOutput = document.getElementById(codeId);
    if (!ruleOutput) return;
    var range = document.createRange();
    range.selectNode(ruleOutput);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      document.execCommand('copy');
      selection.removeAllRanges();
      showModal(errorModalId, errorMsgId, successMsg);
    } catch (e) {
      selection.removeAllRanges();
      showModal(errorModalId, errorMsgId, '复制失败，请手动选择复制');
    }
  }
  function showModal(modalId, msgId, message) {
    var msgEl = document.getElementById(msgId);
    if (msgEl) msgEl.textContent = message;
    if (window.$ && typeof $('#'+modalId).modal === 'function') {
      $('#'+modalId).modal('show');
    }
  }

  // JingBaoGuiZe integration (Alert Rule Generator)
  function setupJZ() {
    // Load monitoring items
    fetch('./jingbaoguize/other/data.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var select = document.getElementById('jz-monItems');
        if (!select || !data || !data.mon_items) return;
        Object.keys(data.mon_items).forEach(function (key) {
          var item = data.mon_items[key];
          var opt = document.createElement('option');
          opt.value = item.value;
          opt.textContent = item.name;
          select.appendChild(opt);
        });
      });

    // Populate timezone options
    var tzSelect = document.getElementById('jz-cycleStartTimezone');
    if (tzSelect && window.moment && moment.tz) {
      var allTimezones = moment.tz.names();
      allTimezones.sort(function (a, b) { return moment.tz(a).utcOffset() - moment.tz(b).utcOffset(); });
      tzSelect.innerHTML = allTimezones.map(function (timezone) {
        var offset = moment.tz(timezone).format('Z');
        return '<option value="' + timezone + '">UTC' + offset + ' ' + timezone + '</option>';
      }).join('');
      tzSelect.value = 'Asia/Shanghai';
    }

    // Init flatpickr for JZ
    if (window.flatpickr) {
      flatpickr('#jz-cycleStartDate', {
        defaultDate: moment().startOf('month').toDate(),
        dateFormat: 'Y-m-d',
        onChange: updateJZCycleStart
      });
      flatpickr('#jz-cycleStartTime', {
        noCalendar: true,
        enableTime: true,
        dateFormat: 'H:i',
        time_24hr: true,
        defaultDate: '00:00',
        onChange: updateJZCycleStart
      });
    }

    function updateJZCycleStart() {
      var tz = document.getElementById('jz-cycleStartTimezone').value;
      var date = document.getElementById('jz-cycleStartDate').value;
      var time = document.getElementById('jz-cycleStartTime').value;
      var formatted = moment.tz(date + ' ' + time, tz).format();
      document.getElementById('jz-cycleStart').value = formatted;
    }
    // initial
    updateJZCycleStart();

    // Prevent manual edit
    var jzCycleStart = document.getElementById('jz-cycleStart');
    if (jzCycleStart) {
      jzCycleStart.addEventListener('input', function () {
        showModal('jz-errorModal', 'jz-errorMessage', '请使用上方的时间选择器选择时间');
        updateJZCycleStart();
      });
    }

    // monItems change show/hide blocks
    var monSelect = document.getElementById('jz-monItems');
    if (monSelect) {
      monSelect.addEventListener('change', function () {
        var v = monSelect.value;
        var durationDiv = document.getElementById('jz-durationdiv');
        var flowDiv = document.getElementById('jz-flowdiv');
        var numDiv = document.getElementById('jz-numdiv');
        if (v === 'transfer_in_cycle' || v === 'transfer_out_cycle' || v === 'transfer_all_cycle') {
          if (durationDiv) durationDiv.style.display = 'none';
          if (flowDiv) flowDiv.style.display = '';
          if (numDiv) numDiv.style.display = '';
        } else if (v === 'offline') {
          if (flowDiv) flowDiv.style.display = 'none';
          if (durationDiv) durationDiv.style.display = '';
          if (numDiv) numDiv.style.display = 'none';
        } else {
          if (durationDiv) durationDiv.style.display = '';
          if (flowDiv) flowDiv.style.display = 'none';
          if (numDiv) numDiv.style.display = '';
        }
      });
    }

    // whitelist toggle
    var coverCheckbox = document.getElementById('jz-cover_checkbox');
    if (coverCheckbox) {
      coverCheckbox.addEventListener('change', function () {
        document.getElementById('jz-serveridslabel').textContent = coverCheckbox.checked ? '服务器白名单 ID (用逗号分隔):' : '服务器黑名单 ID (用逗号分隔):';
      });
    }

    // clear output
    var clearBtn = document.getElementById('jz-clearRuleBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var out = document.getElementById('jz-ruleOutput');
        if (out) out.textContent = '';
      });
    }

    // generate
    var genBtn = document.getElementById('jz-generateRuleBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        var rule = jzGenerateRule();
        if (!rule) return;
        var json = JSON.stringify(rule, null, 2);
        document.getElementById('jz-ruleOutput').textContent = json;
        highlightJSON('jz-ruleOutput');
      });
    }

    // append
    var appendBtn = document.getElementById('jz-appendRuleBtn');
    if (appendBtn) {
      appendBtn.addEventListener('click', function () {
        var newRule = jzGenerateRule();
        if (!newRule) return;
        var currentText = document.getElementById('jz-ruleOutput').textContent || '';
        var combined = [];
        if (currentText.trim() !== '') {
          try { combined = newRule.concat(JSON.parse(currentText)); } catch (e) { combined = newRule; }
        } else {
          combined = newRule;
        }
        document.getElementById('jz-ruleOutput').textContent = JSON.stringify(combined, null, 2);
        highlightJSON('jz-ruleOutput');
      });
    }

    // copy
    var copyBtn = document.getElementById('jz-copyRuleBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyCode('jz-ruleOutput', 'JSON 规则已复制到剪贴板', 'jz-errorModal', 'jz-errorMessage');
      });
    }

    // validate and build rule
    function jzValidate(monItems, cycleStart, trafficType, cycleUnit, cycleInterval, max, min, duration) {
      if (monItems === 'transfer_in_cycle' || monItems === 'transfer_out_cycle' || monItems === 'transfer_all_cycle') {
        if (!cycleStart) { showModal('jz-errorModal', 'jz-errorMessage', '请选择统计周期开始时间'); return false; }
        if (!trafficType) { showModal('jz-errorModal', 'jz-errorMessage', '请选择流量类型'); return false; }
        if (!cycleUnit) { showModal('jz-errorModal', 'jz-errorMessage', '请选择周期单位'); return false; }
        if (isNaN(cycleInterval) || cycleInterval <= 0) { showModal('jz-errorModal', 'jz-errorMessage', '请输入有效的周期间隔 (大于 0 的数字)'); return false; }
        if (isNaN(max) || max <= 0) { showModal('jz-errorModal', 'jz-errorMessage', '请输入有效的阈值上限 (大于 0 的数字)'); return false; }
      } else {
        if (!duration || isNaN(duration) || Number(duration) <= 0) { showModal('jz-errorModal', 'jz-errorMessage', '请输入有效的持续时间 (大于 0 的数字)'); return false; }
      }
      if (isNaN(min) || min < 0) { showModal('jz-errorModal', 'jz-errorMessage', '请输入有效的起始值 (大于等于 0 的数字)'); return false; }
      return true;
    }

    function jzGenerateRule() {
      var monItems = document.getElementById('jz-monItems').value;
      var serverIds = document.getElementById('jz-serverIds').value.split(',').map(function (id) { return id.trim(); });
      var cycleStart = document.getElementById('jz-cycleStart').value;
      var cover = document.getElementById('jz-cover_checkbox').checked ? 1 : 0;
      var trafficType = document.getElementById('jz-trafficType').value;
      var cycleUnit = document.getElementById('jz-cycleUnit').value;
      var min = Number(document.getElementById('jz-min').value);
      var max = Number(document.getElementById('jz-max').value);
      var cycleInterval = parseInt(document.getElementById('jz-cycleInterval').value);
      var duration = Number(document.getElementById('jz-duration').value);
      if (!jzValidate(monItems, cycleStart, trafficType, cycleUnit, cycleInterval, max, min, duration)) return null;
      var ruleObj;
      if (monItems === 'transfer_in_cycle' || monItems === 'transfer_out_cycle' || monItems === 'transfer_all_cycle') {
        ruleObj = { type: monItems, min: min, max: max, cycle_start: cycleStart, cycle_interval: cycleInterval, cycle_unit: cycleUnit };
      } else if (monItems === 'offline') {
        ruleObj = { type: monItems, duration: duration };
      } else {
        ruleObj = { type: monItems, min: min, max: max, duration: duration };
      }
      // Only include cover when whitelist is enabled
      if (cover === 1) { ruleObj.cover = 1; }

      // Always set ignore mapping to true for provided IDs
      if (!(serverIds.length === 0 || (serverIds.length === 1 && serverIds[0] === ''))) {
        ruleObj.ignore = serverIds.reduce(function (obj, id) {
          obj[id] = true;
          return obj;
        }, {});
      }
      return [ruleObj];
    }

    // timezone change
    if (tzSelect) tzSelect.addEventListener('change', updateJZCycleStart);
  }

  // LiuLiangJingGao integration (Traffic Alarm Generator)
  function setupLL() {
    // Populate timezone options
    var tzSelect = document.getElementById('ll-cycleStartTimezone');
    if (tzSelect && window.moment && moment.tz) {
      var allTimezones = moment.tz.names();
      allTimezones.sort(function (a, b) { return moment.tz(a).utcOffset() - moment.tz(b).utcOffset(); });
      tzSelect.innerHTML = allTimezones.map(function (timezone) {
        var offset = moment.tz(timezone).format('Z');
        return '<option value="' + timezone + '">UTC' + offset + ' ' + timezone + '</option>';
      }).join('');
      tzSelect.value = 'Asia/Shanghai';
    }

    // Init flatpickr for LL
    if (window.flatpickr) {
      flatpickr('#ll-cycleStartDate', {
        defaultDate: moment().startOf('month').toDate(),
        dateFormat: 'Y-m-d',
        onChange: updateLLCycleStart
      });
      flatpickr('#ll-cycleStartTime', {
        noCalendar: true,
        enableTime: true,
        dateFormat: 'H:i',
        time_24hr: true,
        defaultDate: '00:00',
        onChange: updateLLCycleStart
      });
    }

    function updateLLCycleStart() {
      var tz = document.getElementById('ll-cycleStartTimezone').value;
      var date = document.getElementById('ll-cycleStartDate').value;
      var time = document.getElementById('ll-cycleStartTime').value;
      var formatted = moment.tz(date + ' ' + time, tz).format();
      document.getElementById('ll-cycleStart').value = formatted;
      llGenerateRule();
    }
    // initial
    updateLLCycleStart();

    // Prevent manual edit
    var llCycleStart = document.getElementById('ll-cycleStart');
    if (llCycleStart) {
      llCycleStart.addEventListener('input', function () {
        showModal('ll-errorModal', 'll-errorMessage', '请使用上方的时间选择器选择时间');
        updateLLCycleStart();
      });
    }

    // generate rule on button
    var genBtn = document.getElementById('ll-generateRuleBtn');
    if (genBtn) { genBtn.addEventListener('click', llGenerateRule); }

    // copy
    var copyBtn = document.getElementById('ll-copyRuleBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyCode('ll-ruleOutput', 'JSON 规则已复制到剪贴板', 'll-errorModal', 'll-errorMessage');
      });
    }

    function llValidate(serverIds, cycleStart, trafficType, cycleUnit, cycleInterval, maxTraffic) {
      if (serverIds.length === 0 || (serverIds.length === 1 && serverIds[0] === '')) {
        showModal('ll-errorModal', 'll-errorMessage', '请输入服务器 ID');
        return false;
      }
      if (!cycleStart) { showModal('ll-errorModal', 'll-errorMessage', '请选择统计周期开始时间'); return false; }
      if (!trafficType) { showModal('ll-errorModal', 'll-errorMessage', '请选择流量类型'); return false; }
      if (!cycleUnit) { showModal('ll-errorModal', 'll-errorMessage', '请选择周期单位'); return false; }
      if (isNaN(cycleInterval) || cycleInterval <= 0) { showModal('ll-errorModal', 'll-errorMessage', '请输入有效的周期间隔 (大于 0 的数字)'); return false; }
      if (isNaN(maxTraffic) || maxTraffic <= 0) { showModal('ll-errorModal', 'll-errorMessage', '请输入有效的流量上限 (大于 0 的数字)'); return false; }
      return true;
    }

    function llGenerateRule() {
      var serverIds = document.getElementById('ll-serverIds').value.split(',').map(function (id) { return id.trim(); });
      var cycleStart = document.getElementById('ll-cycleStart').value;
      var trafficType = document.getElementById('ll-trafficType').value;
      var cycleUnit = document.getElementById('ll-cycleUnit').value;
      var cycleInterval = parseInt(document.getElementById('ll-cycleInterval').value);
      var maxTraffic = document.getElementById('ll-maxTraffic').value * document.getElementById('ll-trafficUnit').value;
      if (!llValidate(serverIds, cycleStart, trafficType, cycleUnit, cycleInterval, maxTraffic)) return;
      var rule = [{ type: trafficType, max: maxTraffic, cycle_start: cycleStart, cycle_interval: cycleInterval, cycle_unit: cycleUnit, cover: 1, ignore: serverIds.reduce(function (obj, id) { obj[id] = true; return obj; }, {}) }];
      document.getElementById('ll-ruleOutput').textContent = JSON.stringify(rule, null, 2);
      highlightJSON('ll-ruleOutput');
    }

    if (tzSelect) tzSelect.addEventListener('change', updateLLCycleStart);
  }

  // GongKaiBeiZhu integration (Public Notes JSON Generator) using Vue + Element UI
  function setupGKBZ() {
    var host = document.getElementById('gkbz-app');
    if (!host || !window.Vue || !window.ELEMENT) return;
    // Inject template
    host.innerHTML = [
      '<div id="gkbz-root">',
      '  <el-row :gutter="20">',
      '    <el-col :xs="24" :sm="12">',
      '      <el-form :model="form" label-width="100px">',
      '        <el-divider content-position="left">Billing Data Form</el-divider>',
      '        <el-form-item label="开始日期" prop="startDate">',
      '          <el-date-picker v-model="form.billingDataMod.startDate" type="datetime" placeholder="选择开始日期" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss+08:00" @visible-change="onPickerVisibleChange"></el-date-picker>',
      '        </el-form-item>',
      '        <el-form-item label="结束日期" prop="endDate">',
      '          <el-date-picker v-model="form.billingDataMod.endDate" type="datetime" placeholder="选择结束日期" format="yyyy-MM-dd HH:mm:ss" value-format="yyyy-MM-dd HH:mm:ss+08:00" :disabled="form.billingDataMod.isIndefinite" @visible-change="onPickerVisibleChange"></el-date-picker>',
      '          <el-checkbox v-model="form.billingDataMod.isIndefinite">无期限</el-checkbox>',
      '        </el-form-item>',
      '        <el-form-item label="自动续期" prop="autoRenewal">',
      '          <el-switch v-model="form.billingDataMod.autoRenewal" active-text="是" inactive-text="否" active-value="1" inactive-value="0" :disabled="isUnofficial"></el-switch>',
      '        </el-form-item>',
      '        <el-form-item label="计费周期" prop="cycle">',
      '          <el-select v-model="form.billingDataMod.cycle" placeholder="选择计费周期">',
      '            <el-option label="天(非官方)" value="天"></el-option>',
      '            <el-option label="月" value="月"></el-option>',
      '            <el-option label="季" value="季"></el-option>',
      '            <el-option label="半年" value="半年"></el-option>',
      '            <el-option label="年" value="年"></el-option>',
      '            <el-option label="1年(非官方)" value="1年"></el-option>',
      '            <el-option label="2年(非官方)" value="2年"></el-option>',
      '            <el-option label="3年(非官方)" value="3年"></el-option>',
      '            <el-option label="4年(非官方)" value="4年"></el-option>',
      '            <el-option label="5年(非官方)" value="5年"></el-option>',
      '          </el-select>',
      '        </el-form-item>',
      '        <el-form-item label="金额" prop="amount">',
      '          <el-checkbox v-model="isAmountUnitBefore">前单位<span> 例如：￥9.99</span></el-checkbox>',
      '          <el-checkbox v-model="isAmountUnitAffter">后单位<span> 例如：9.99CNY</span></el-checkbox>',
      '          <el-input v-model="form.billingDataMod.amount" placeholder="输入金额" class="input-with-select" :disabled="form.billingDataMod.isAmountFree || form.billingDataMod.isAmountPAYG">',
      '            <el-select v-model="amountBeforeUnit" slot="prepend" class="unit-select" :disabled="form.billingDataMod.isAmountFree || form.billingDataMod.isAmountPAYG" v-if="isAmountUnitBefore">',
      '              <el-option label="人民币 ￥" value="￥"></el-option>',
      '              <el-option label="美元 $" value="$"></el-option>',
      '              <el-option label="欧元 €" value="€"></el-option>',
      '              <el-option label="英镑 £" value="£"></el-option>',
      '              <el-option label="加币 C$" value="C$"></el-option>',
      '              <el-option label="日元 ¥" value="¥"></el-option>',
      '              <el-option label="港币 HK$" value="HK$"></el-option>',
      '              <el-option label="新台币 NT$" value="NT$"></el-option>',
      '              <el-option label="澳元 A$" value="A$"></el-option>',
      '              <el-option label="新加坡元 S$" value="S$"></el-option>',
      '              <el-option label="韩元 ₩" value="₩"></el-option>',
      '              <el-option label="瑞士法郎 CHF" value="CHF"></el-option>',
      '              <el-option label="印度卢比 ₹" value="₹"></el-option>',
      '              <el-option label="俄罗斯卢布 ₽" value="₽"></el-option>',
      '              <el-option label="阿联酋迪拉姆 د.إ" value="د.إ"></el-option>',
      '            </el-select>',
      '            <el-select v-model="amountAffterUnit" slot="append" class="unit-select" :disabled="form.billingDataMod.isAmountFree || form.billingDataMod.isAmountPAYG" v-if="isAmountUnitAffter">',
      '              <el-option label="人民币 CNY" value="CNY"></el-option>',
      '              <el-option label="美元 USD" value="USD"></el-option>',
      '              <el-option label="欧元 EUR" value="EUR"></el-option>',
      '              <el-option label="英镑 GBP" value="GBP"></el-option>',
      '              <el-option label="加币 CAD" value="CAD"></el-option>',
      '              <el-option label="日元 JPY" value="JPY"></el-option>',
      '              <el-option label="港币 HKD" value="HKD"></el-option>',
      '              <el-option label="新台币 TWD" value="TWD"></el-option>',
      '              <el-option label="澳元 AUD" value="AUD"></el-option>',
      '              <el-option label="新加坡元 SGD" value="SGD"></el-option>',
      '              <el-option label="韩元 KRW" value="KRW"></el-option>',
      '              <el-option label="瑞士法郎 CHF" value="CHF"></el-option>',
      '              <el-option label="印度卢比 INR" value="INR"></el-option>',
      '              <el-option label="俄罗斯卢布 RUB" value="RUB"></el-option>',
      '              <el-option label="阿联酋迪拉姆 AED" value="AED"></el-option>',
      '            </el-select>',
      '          </el-input>',
      '          <el-checkbox v-model="form.billingDataMod.isAmountFree" :disabled="form.billingDataMod.isAmountPAYG">免费</el-checkbox>',
      '          <el-checkbox v-model="form.billingDataMod.isAmountPAYG" :disabled="form.billingDataMod.isAmountFree">按量收费</el-checkbox>',
      '        </el-form-item>',
      '        <el-divider content-position="left">Plan Data Form <el-checkbox v-model="isNoPlanDataForm">不开启</el-checkbox></el-divider>',
      '        <el-form-item label="带宽" prop="bandwidth">',
      '          <el-input placeholder="输入带宽" v-model="form.planDataMod.bandwidth" class="input-with-select" :disabled="isNoPlanDataForm">',
      '            <el-select v-model="form.planDataMod.bandwidthUnit" slot="append" :disabled="isNoPlanDataForm" class="unit-select">',
      '              <el-option label="Mbps" value="Mbps"></el-option>',
      '              <el-option label="Gbps" value="Gbps"></el-option>',
      '              <el-option label="无限制" value="Unlimited"></el-option>',
      '            </el-select>',
      '          </el-input>',
      '        </el-form-item>',
      '        <el-form-item label="流量" prop="trafficVol">',
      '          <el-input placeholder="输入流量限制" v-model="form.planDataMod.trafficVol" class="input-with-select" :disabled="isNoPlanDataForm">',
      '            <el-select v-model="form.planDataMod.trafficUnit" slot="append" :disabled="isNoPlanDataForm" class="unit-select">',
      '              <el-option label="MB/月" value="MB/月"></el-option>',
      '              <el-option label="GB/月" value="GB/月"></el-option>',
      '              <el-option label="TB/月" value="TB/月"></el-option>',
      '              <el-option label="PB/月" value="PB/月"></el-option>',
      '            </el-select>',
      '          </el-input>',
      '        </el-form-item>',
      '        <el-form-item label="流量类型" prop="trafficType">',
      '          <el-select v-model="form.planDataMod.trafficType" placeholder="选择流量类型" :disabled="isNoPlanDataForm">',
      '            <el-option label="只单向上行流量计费" value="1"></el-option>',
      '            <el-option label="双向上下行流量同时计费" value="2"></el-option>',
      '            <el-option label="取入栈和出栈最大的计费 [ Max(In, Out) ]" value="3"></el-option>',
      '          </el-select>',
      '        </el-form-item>',
      '        <el-form-item label="IPv4" prop="IPv4">',
      '          <el-switch v-model="form.planDataMod.IPv4" active-text="有" inactive-text="无" active-value="1" inactive-value="0" :disabled="isNoPlanDataForm"></el-switch>',
      '        </el-form-item>',
      '        <el-form-item label="IPv6" prop="IPv6">',
      '          <el-switch v-model="form.planDataMod.IPv6" active-text="有" inactive-text="无" active-value="1" inactive-value="0" :disabled="isNoPlanDataForm"></el-switch>',
      '        </el-form-item>',
      '        <el-form-item label="网络路由" prop="networkRoute">',
      '          <el-input v-model="form.planDataMod.networkRoute" placeholder="输入网络路由,使用\',\'分割" :disabled="isNoPlanDataForm"></el-input>',
      '        </el-form-item>',
      '        <el-form-item label="额外信息" prop="extra">',
      '          <el-input v-model="form.planDataMod.extra" placeholder="输入额外信息,使用\',\'分割" :disabled="isNoPlanDataForm"></el-input>',
      '        </el-form-item>',
      '      </el-form>',
      '    </el-col>',
      '    <el-col :xs="24" :sm="12">',
      '      <el-input type="textarea" :rows="20" :value="jsonOutput" readonly></el-input>',
      '      <div style="height: 10px;"></div>',
      '      <el-button class="btn-outline-primary" type="default" @click="generateJson">生成 JSON</el-button>',
      '    </el-col>',
      '  </el-row>',
      '</div>'
    ].join('');

    new Vue({
      el: '#gkbz-root',
      data: function () {
        return {
          isNoPlanDataForm: false,
          isUnofficial: false,
          isAmountUnitBefore: true,
          isAmountUnitAffter: false,
          amountBeforeUnit: '￥',
          amountAffterUnit: 'CNY',
          form: {
            billingDataMod: {
              startDate: new Date(),
              endDate: new Date(),
              autoRenewal: '1',
              cycle: '月',
              amount: '1'
            },
            planDataMod: {
              bandwidth: '30',
              bandwidthUnit: 'Mbps',
              trafficVol: '1',
              trafficUnit: 'TB/月',
              trafficType: '1',
              IPv4: '1',
              IPv6: '1',
              networkRoute: '4837',
              extra: ''
            }
          },
          jsonOutput: ''
        };
      },
      watch: {
        isAmountUnitBefore: function (n) { if (n) this.isAmountUnitAffter = false; },
        isAmountUnitAffter: function (n) { if (n) this.isAmountUnitBefore = false; },
        'form.billingDataMod.cycle': function (n) {
          if (/\d年|天/.test(n)) {
            this.$alert('您使用的<strong>' + n + '</strong>的计费周期，并不是官方支持的参数，<br /><strong>无法自动刷新及计算规划中的账单统计报表，<br />并禁用autoRenewal及cycle字段</strong>', '温馨提示', { confirmButtonText: '确定', dangerouslyUseHTMLString: true });
            this.form.billingDataMod.autoRenewal = 0;
            this.isUnofficial = true;
          } else {
            this.isUnofficial = false;
          }
        }
      },
      methods: {
        onPickerVisibleChange: function (visible) {
          if (!visible) return;
          var self = this;
          setTimeout(function () {
            self.tweakPickerFooter();
          }, 0);
        },
        tweakPickerFooter: function () {
          var panels = document.querySelectorAll('.el-picker-panel');
          panels.forEach(function (panel) {
            var footer = panel.querySelector('.el-picker-panel__footer');
            if (!footer) return;
            var btns = footer.querySelectorAll('.el-button');
            if (btns.length) {
              var cancelBtn = btns[0];
              cancelBtn.textContent = '取消';
              cancelBtn.classList.remove('el-button--primary');
              cancelBtn.classList.remove('el-button--text');
              cancelBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                var ae = document.activeElement;
                if (ae) ae.blur();
              });
              var confirmBtn = btns[btns.length - 1];
              confirmBtn.classList.add('el-button--primary');
            }
          });
        },
        generateJson: function () {
          var jo = JSON.parse(JSON.stringify(this.form));
          if (jo.billingDataMod.isIndefinite) {
            jo.billingDataMod.endDate = '0000-00-00T23:59:59+08:00';
          }
          if (jo.planDataMod.bandwidthUnit === 'Unlimited') {
            jo.planDataMod.bandwidth = 'Unlimited';
          } else {
            jo.planDataMod.bandwidth += jo.planDataMod.bandwidthUnit;
          }
          jo.planDataMod.trafficVol += jo.planDataMod.trafficUnit;
          if (this.isAmountUnitBefore) { jo.billingDataMod.amount = this.amountBeforeUnit + jo.billingDataMod.amount; }
          if (this.isAmountUnitAffter) { jo.billingDataMod.amount += this.amountAffterUnit; }
          if (this.isUnofficial) { jo.billingDataMod.amount += '/' + jo.billingDataMod.cycle; jo.billingDataMod.cycle = ''; }
          if (jo.billingDataMod.isAmountFree) { jo.billingDataMod.amount = '0'; }
          if (jo.billingDataMod.isAmountPAYG) { jo.billingDataMod.amount = '-1'; }
          delete jo.billingDataMod.isIndefinite;
          delete jo.billingDataMod.isAmountFree;
          delete jo.billingDataMod.isAmountPAYG;
          delete jo.planDataMod.bandwidthUnit;
          delete jo.planDataMod.trafficUnit;
          if (this.isNoPlanDataForm) { delete jo.planDataMod; }
          this.jsonOutput = JSON.stringify(jo, null, 4);
        }
      }
    });
  }

  // Init all
  document.addEventListener('DOMContentLoaded', function () {
    setupTabs();
    setupThemeToggle();
    setupJZ();
    setupLL();
    setupGKBZ();
  });
})();