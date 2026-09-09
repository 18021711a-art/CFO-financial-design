(function () {
  'use strict';

  const C = window.TaxCalculator;
  const R = window.TaxRules;
  const form = document.getElementById('calculatorForm');
  const resultsBody = document.getElementById('resultsBody');
  const bestSummary = document.getElementById('bestSummary');
  const details = document.getElementById('details');
  const formTitle = document.getElementById('formTitle');
  const yearSelect = document.getElementById('yearSelect');
  const requestedModel = new URLSearchParams(location.search).get('model');
  let model = ['base', 'marketplace'].includes(requestedModel) ? requestedModel : localStorage.getItem('tax-calculator:model') || 'base';
  let year = Number(localStorage.getItem('tax-calculator:year')) || R.defaultYear;
  let selectedRegime = null;

  const commonSections = [
    { title: 'Профиль и ставки', fields: [
      ['organization', 'Форма бизнеса', 'select', ['ИП', 'ООО']],
      ['employees', 'Сотрудники, чел.', 'number'],
      ['vatReliefEligible', 'Сфера деятельности подпадает под льготу по НДС', 'checkbox'],
      ['usnIncomeRate', 'Ставка УСН «Доходы», %', 'percent'],
      ['usnDrRate', 'Ставка УСН «Доходы минус расходы», %', 'percent'],
      ['dividendShare', 'Доля прибыли на дивиденды, %', 'percent'],
      ['dividendNdflRate', 'НДФЛ с дивидендов, %', 'percent'],
    ]},
  ];

  const baseSections = commonSections.concat([
    { title: 'Доходы', fields: [
      ['revenueGross', 'Выручка с НДС, руб.', 'money'],
      ['undocumentedRevenue', 'Необлагаемая выручка без документов, руб.', 'money'],
    ]},
    { title: 'Команда', fields: [
      ['salary', 'Зарплата с НДФЛ, руб.', 'money'],
      ['payrollNdflRate', 'Расчетная ставка НДФЛ с ФОТ, %', 'percent'],
      ['payrollContributionRate', 'Страховые взносы с ФОТ, %', 'percent'],
      ['contractorsValid', 'ИП и самозанятые, руб.', 'money'],
      ['contractorsOther', 'Прочие внештатные, руб.', 'money'],
    ]},
    costSection(),
    { title: 'Операционные расходы', fields: vatCostFields('opex', 'Расходы').concat([
      ['nonTaxDeductible', 'Без документов, руб.', 'money'],
      ['taxOptimizationExpense', 'Не в управленческом учете, руб.', 'money'],
      ['opexComment', 'Комментарий к операционным расходам', 'textarea'],
    ])},
    { title: 'Прочие расходы', fields: [
      ['propertyTaxes', 'Имущественные налоги, руб.', 'money'],
      ['otherBelowOperating', 'Прочие ниже операционной прибыли, руб.', 'money'],
      ['interest', 'Проценты по кредитам, руб.', 'money'],
      ['depreciation', 'Амортизация, руб.', 'money'],
      ['assetPurchase', 'Приобретение ОС с НДС, руб.', 'money'],
    ]},
    { title: 'Патент', fields: [
      ['patentEligible', 'Условия патента выполнены', 'checkbox'],
      ['patentCost', 'Стоимость патента, руб.', 'money'],
      ['patentBase', 'База для взноса ИП 1%, руб.', 'money'],
    ]},
  ]);

  const marketplaceSections = commonSections.concat([
    platformSection('Wildberries', 'wb'),
    platformSection('Ozon', 'ozon'),
    platformSection('Яндекс Маркет', 'mp3'),
    { addPlatform: true },
    { title: 'Прочие доходы площадок', fields: [
      ['undocumentedRevenue', 'Необлагаемая выручка без документов, руб.', 'money'],
    ]},
    { title: 'Команда', fields: [
      ['salary', 'Зарплата с НДФЛ, руб.', 'money'],
      ['payrollNdflRate', 'Расчетная ставка НДФЛ с ФОТ, %', 'percent'],
      ['payrollContributionRate', 'Страховые взносы с ФОТ, %', 'percent'],
      ['contractorsValid', 'ИП и самозанятые, руб.', 'money'],
      ['contractorsOther', 'Прочие внештатные, руб.', 'money'],
    ]},
    costSection(),
    { title: 'Операционные расходы', fields: [
      ...vatCostFields('opex', 'Расходы'),
      ['nonTaxDeductible', 'Без документов, руб.', 'money'],
      ['taxOptimizationExpense', 'Не в управленческом учете, руб.', 'money'],
      ['opexComment', 'Название расхода и другая информация', 'textarea'],
    ]},
    { title: 'Прочие расходы', fields: [
      ['propertyTaxes', 'Имущественные налоги, руб.', 'money'], ['otherBelowOperating', 'Прочие ниже операционной прибыли, руб.', 'money'],
      ['interest', 'Проценты по кредитам, руб.', 'money'], ['depreciation', 'Амортизация, руб.', 'money'],
      ['assetPurchase', 'Приобретение ОС с НДС, руб.', 'money'],
    ]},
  ]);

  function platformSection(title, prefix, editableName, customId, values) {
    const fields = [];
    if (customId) fields.push([`${prefix}Type`, 'Правило площадки', 'select', ['Другая площадка', 'Wildberries', 'Ozon', 'Яндекс Маркет']]);
    if (editableName) fields.push([`${prefix}Name`, 'Название площадки', 'text']);
    fields.push(
      [`${prefix}Revenue`, 'Выручка до скидок, руб.', 'money'],
      [`${prefix}DiscountRate`, 'Скидки / баллы, %', 'percent', { platform: prefix, amount: 'discount' }],
      [`${prefix}LogisticsRate`, 'Логистика, %', 'percent', { platform: prefix, amount: 'logistics' }],
      [`${prefix}CommissionRate`, 'Комиссия, %', 'percent', { platform: prefix, amount: 'commission' }],
      [`${prefix}OtherRate`, 'Прочие услуги, %', 'percent', { platform: prefix, amount: 'other' }],
      [`${prefix}PromotionRate`, 'Продвижение, %', 'percent', { platform: prefix, amount: 'promotion' }],
      [`${prefix}AcquiringRate`, 'Эквайринг, %', 'percent', { platform: prefix, amount: 'acquiring' }],
      [prefix, 'Расчет баллов и расходов', 'pointsSummary'],
    );
    if (customId) fields.push([customId, 'Удалить площадку', 'removePlatform']);
    return { title, fields, platform: true, prefix, editableName, customId, values };
  }

  function customPlatformSection(platform, index) {
    const id = String(platform.id || index).replace(/[^a-zA-Z0-9_-]/g, '');
    const prefix = `custom_${id}`;
    const values = {
      [`${prefix}Type`]: { wb: 'Wildberries', ozon: 'Ozon', yandex: 'Яндекс Маркет', other: 'Другая площадка' }[platform.type || 'other'],
      [`${prefix}Name`]: platform.name || '', [`${prefix}Revenue`]: platform.revenue || 0,
      [`${prefix}DiscountRate`]: platform.discountRate || 0, [`${prefix}LogisticsRate`]: platform.logisticsRate || 0,
      [`${prefix}CommissionRate`]: platform.commissionRate || 0, [`${prefix}OtherRate`]: platform.otherRate || 0,
      [`${prefix}PromotionRate`]: platform.promotionRate || 0, [`${prefix}AcquiringRate`]: platform.acquiringRate || 0,
    };
    return platformSection(platform.name || `Новая площадка ${index + 1}`, prefix, true, id, values);
  }

  function vatCostFields(prefix, label) {
    return [
      [`${prefix}Vat22`, `${label} с НДС {VAT}%, руб.`, 'money'],
      [`${prefix}Vat10`, `${label} с НДС 10%, руб.`, 'money'],
      [`${prefix}Vat7`, `${label} с НДС 7%, руб.`, 'money'],
      [`${prefix}Vat5`, `${label} с НДС 5%, руб.`, 'money'],
      [`${prefix}NoVat`, `${label} без НДС, руб.`, 'money'],
    ];
  }

  function costSection() {
    return { title: 'Себестоимость', costSection: true, fields: [
      ['costRate', 'Себестоимость от выручки с НДС, %', 'percent'],
      ['costShareVat22', 'Доля себестоимости с НДС {VAT}%', 'costShare', { vatRate: 'standard' }],
      ['costShareVat10', 'Доля себестоимости с НДС 10%', 'costShare', { vatRate: 0.10 }],
      ['costShareVat7', 'Доля себестоимости с НДС 7%', 'costShare', { vatRate: 0.07 }],
      ['costShareVat5', 'Доля себестоимости с НДС 5%', 'costShare', { vatRate: 0.05 }],
      ['costShareNoVat', 'Доля себестоимости без НДС, %', 'costShare', { vatRate: 0 }],
      ['costSummary', 'Расчет себестоимости', 'costSummary'],
    ]};
  }

  function storageKey() { return `tax-calculator:${model}:${year}`; }
  function defaults() { return model === 'base' ? C.baseDefaults : C.marketplaceDefaults; }
  function zeroState() {
    const state = {};
    Object.entries(defaults()).forEach(([key, value]) => {
      if (typeof value === 'number') state[key] = 0;
      else if (typeof value === 'boolean') state[key] = false;
      else if (Array.isArray(value)) state[key] = [];
      else if (key === 'opexComment') state[key] = '';
      else state[key] = value;
    });
    state.customPlatforms = [];
    state.year = year;
    return state;
  }
  function sections() { return model === 'base' ? baseSections : marketplaceSections; }
  function loadState() {
    try {
      const current = localStorage.getItem(storageKey());
      const legacy = year === 2026 ? localStorage.getItem(`tax-calculator:${model}`) : null;
      const state = Object.assign({}, defaults(), JSON.parse(current || legacy || '{}'), { year });
      if (!Array.isArray(state.customPlatforms)) state.customPlatforms = [];
      if (model === 'marketplace' && state.customPlatforms.length === 0 && (Number(state.mp4Revenue) > 0 || (state.mp4Name && state.mp4Name !== 'Маркетплейс 4'))) {
        state.customPlatforms.push({
          id: 'legacy4', name: state.mp4Name || 'Другая площадка', revenue: Number(state.mp4Revenue) || 0,
          discountRate: Number(state.mp4DiscountRate) || 0, logisticsRate: Number(state.mp4LogisticsRate) || 0,
          commissionRate: Number(state.mp4CommissionRate) || 0, otherRate: Number(state.mp4OtherRate) || 0,
          promotionRate: Number(state.mp4PromotionRate) || 0, acquiringRate: Number(state.mp4AcquiringRate) || 0,
        });
      }
      return state;
    }
    catch (_) { return Object.assign({}, defaults()); }
  }

  function renderForm() {
    const state = loadState();
    const expanded = sections().flatMap((section) => section.addPlatform
      ? [...(state.customPlatforms || []).map(customPlatformSection), section]
      : [section]);
    form.innerHTML = expanded.map((section) => renderSection(section, state)).join('');
    formTitle.textContent = model === 'base' ? 'Исходные данные: базовый бизнес' : 'Исходные данные: маркетплейсы';
  }

  function renderSection(section, state) {
    if (section.addPlatform) return `<div class="add-platform"><button type="button" class="button add-platform-button" data-add-platform>+ Добавить маркетплейс</button><p>Для новой площадки баллы уменьшают все услуги. Превышение увеличивает налоговую выручку.</p></div>`;
    const sectionState = Object.assign({}, state, section.values || {});
    const fields = `<div class="fields">${section.fields.map((field) => renderField(field, sectionState)).join('')}</div>`;
    if (!section.platform) return `<div class="input-section${section.costSection ? ' cost-section' : ''}"><h3>${section.title}</h3>${fields}</div>`;
    const title = section.editableName ? sectionState[`${section.prefix}Name`] || section.title : section.title;
    const open = Number(sectionState[`${section.prefix}Revenue`] || 0) > 0 ? ' open' : '';
    const custom = section.customId ? ` data-custom-platform="${section.customId}"` : '';
    return `<details class="input-section platform-section" data-platform-section="${section.prefix}"${custom}${open}>
      <summary><span data-platform-title="${section.prefix}">${escapeHtml(title)}</span><small>нажмите, чтобы свернуть или открыть</small></summary>
      ${fields}
    </details>`;
  }

  function renderField([key, label, type, options], state) {
    label = label.replace('{VAT}', String(R.getRules(year).vatStandard * 100));
    if (type === 'pointsSummary') {
      return `<div class="points-summary span-2" data-points-summary="${key}"></div>`;
    }
    if (type === 'costSummary') {
      return `<div class="cost-summary span-2" data-cost-summary></div>`;
    }
    if (type === 'removePlatform') {
      return `<div class="remove-platform span-2"><button type="button" data-remove-platform="${key}">Удалить эту площадку</button></div>`;
    }
    if (type === 'textarea') {
      return `<div class="field span-2"><label for="${key}">${label}</label><textarea id="${key}" name="${key}" rows="3" placeholder="Например: аренда склада, ПО, консультации">${escapeHtml(state[key] || '')}</textarea></div>`;
    }
    if (type === 'text') {
      return `<div class="field span-2"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="text" value="${escapeHtml(state[key] || '')}"></div>`;
    }
    if (type === 'select') {
      return `<div class="field"><label for="${key}">${label}</label><select id="${key}" name="${key}">${options.map((option) => `<option ${state[key] === option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>`;
    }
    if (type === 'checkbox') {
      return `<div class="field checkbox span-2"><input id="${key}" name="${key}" type="checkbox" ${state[key] ? 'checked' : ''}><label for="${key}">${label}</label></div>`;
    }
    const isPercent = type === 'percent' || type === 'costShare';
    const value = isPercent ? Number((Number(state[key] || 0) * 100).toFixed(4)) : formatInputNumber(state[key]);
    const step = isPercent ? '0.01' : '1';
    const inputType = isPercent || type === 'number' ? 'number' : 'text';
    const inputMode = type === 'money' ? ' inputmode="decimal" data-money="true"' : isPercent ? ' data-percent="true"' : '';
    const amount = options?.platform
      ? `<output class="field-amount" data-platform-amount="${options.platform}:${options.amount}">Сумма: <strong>0 ₽</strong></output>`
      : '';
    const costAmount = type === 'costShare' ? `<output class="field-amount" data-cost-amount="${key}">Сумма: <strong>0 ₽</strong></output>` : '';
    return `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="${inputType}" min="0" step="${step}"${inputMode} value="${value}">${amount}${costAmount}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function formatInputNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(number) : '';
  }

  function parseInputNumber(value) {
    return Number(String(value).replace(/[\s\u00A0\u202F]/g, '').replace(',', '.')) || 0;
  }

  function readForm() {
    const data = {};
    for (const [key, value] of new FormData(form).entries()) {
      const input = form.elements[key];
      data[key] = input.dataset.money === 'true' ? parseInputNumber(value) : input.type === 'number' ? Number(value) : value;
    }
    form.querySelectorAll('input[type="checkbox"]').forEach((input) => { data[input.name] = input.checked; });
    form.querySelectorAll('[data-percent="true"]').forEach((input) => { data[input.name] = Number(data[input.name]) / 100; });
    data.customPlatforms = Array.from(form.querySelectorAll('[data-custom-platform]')).map((section) => {
      const id = section.dataset.customPlatform;
      const prefix = `custom_${id}`;
      const platform = {
        id, type: { Wildberries: 'wb', Ozon: 'ozon', 'Яндекс Маркет': 'yandex', 'Другая площадка': 'other' }[data[`${prefix}Type`]] || 'other',
        name: data[`${prefix}Name`] || '', revenue: data[`${prefix}Revenue`] || 0,
        discountRate: data[`${prefix}DiscountRate`] || 0, logisticsRate: data[`${prefix}LogisticsRate`] || 0,
        commissionRate: data[`${prefix}CommissionRate`] || 0, otherRate: data[`${prefix}OtherRate`] || 0,
        promotionRate: data[`${prefix}PromotionRate`] || 0, acquiringRate: data[`${prefix}AcquiringRate`] || 0,
      };
      Object.keys(data).filter((key) => key.startsWith(`${prefix}`)).forEach((key) => delete data[key]);
      return platform;
    });
    data.year = year;
    return data;
  }

  function calculate(data) { return model === 'base' ? C.calculateBase(data) : C.calculateMarketplace(data); }
  function money(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(value || 0)) + ' ₽'; }
  function percent(value) { return new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 }).format(value || 0); }

  function recalculate() {
    const data = readForm();
    localStorage.setItem(storageKey(), JSON.stringify(data));
    const result = calculate(data);
    renderPlatformTotals(data);
    renderCostTotals(data);
    if (!selectedRegime || !result.regimes.some((item) => item.id === selectedRegime)) selectedRegime = result.best ? result.best.id : result.regimes[0].id;
    renderResults(result);
  }

  function revenueForCost(data) {
    if (model === 'base') return Number(data.revenueGross) || 0;
    return C.marketplaceRows(data).reduce((total, row) => total + row.adjustedRevenue, 0);
  }

  function renderCostTotals(data) {
    const grossRevenue = revenueForCost(data);
    const total = grossRevenue * Number(data.costRate || 0);
    const shares = ['costShareVat22', 'costShareVat10', 'costShareVat7', 'costShareVat5', 'costShareNoVat'];
    const shareTotal = shares.reduce((sum, key) => sum + Number(data[key] || 0), 0);
    shares.forEach((key) => {
      const target = form.querySelector(`[data-cost-amount="${key}"] strong`);
      if (target) target.textContent = money(total * Number(data[key] || 0));
    });
    const summary = form.querySelector('[data-cost-summary]');
    if (summary) summary.innerHTML = `<span><small>выручка с НДС</small><strong>${money(grossRevenue)}</strong></span><span><small>себестоимость всего</small><strong>${money(total)}</strong></span><span class="${Math.abs(shareTotal - 1) < 0.0001 ? 'share-ok' : 'share-error'}"><small>сумма долей</small><strong>${percent(shareTotal)}</strong></span>${Math.abs(shareTotal - 1) < 0.0001 ? '' : '<p>Распределите ровно 100%. Сейчас нераспределенная часть не включается в расчет.</p>'}`;
  }

  function renderPlatformTotals(data) {
    if (model !== 'marketplace') return;
    C.marketplaceRows(data).forEach((row) => {
      ['discount', 'logistics', 'commission', 'other', 'promotion', 'acquiring'].forEach((key) => {
        const target = form.querySelector(`[data-platform-amount="${row.key}:${key}"] strong`);
        if (target) target.textContent = money(row[key]);
      });
      const title = form.querySelector(`[data-platform-title="${row.key}"]`);
      if (title) title.textContent = row.name;
      const summary = form.querySelector(`[data-points-summary="${row.key}"]`);
      if (summary) summary.innerHTML = `
        <span><small>правило</small><strong>${row.policyLabel}</strong></span>
        <span><small>баллы / скидки</small><strong>${money(row.discount)}</strong></span>
        <span><small>зачтено в расходах</small><strong>${money(row.usableDiscount)}</strong></span>
        <span><small>превышение в доход</small><strong>${money(row.excessDiscount)}</strong></span>
        <span><small>услуги после зачета</small><strong>${money(row.recognizedServices)}</strong></span>
        <span><small>выручка для налога с НДС</small><strong>${money(row.adjustedRevenue)}</strong></span>`;
    });
  }

  function renderResults(result) {
    const best = result.best;
    bestSummary.innerHTML = best ? `
      <div class="metric primary"><span>лучший допустимый режим</span><strong>${best.name}</strong><small>${best.status.label}</small></div>
      <div class="metric"><span>чистая прибыль</span><strong>${money(best.netProfit)}</strong></div>
      <div class="metric"><span>налоги</span><strong>${money(best.totalTaxes)}</strong></div>
      <div class="metric"><span>нагрузка</span><strong>${percent(best.taxBurden)}</strong></div>` :
      '<div class="metric primary"><span>результат</span><strong>Нет допустимого режима</strong></div>';

    resultsBody.innerHTML = result.regimes.map((item) => `
      <tr data-id="${item.id}" class="${best && item.id === best.id ? 'is-best' : ''}">
        <td>${item.name}</td>
        <td><span class="status ${item.status.ok ? 'ok' : 'bad'}">${item.status.label}</span></td>
        <td>${money(item.netProfit)}</td><td>${money(item.totalTaxes)}</td><td>${percent(item.taxBurden)}</td>
      </tr>`).join('');
    resultsBody.querySelectorAll('tr').forEach((row) => row.addEventListener('click', () => {
      selectedRegime = row.dataset.id;
      renderDetails(result.regimes.find((item) => item.id === selectedRegime));
    }));
    renderDetails(result.regimes.find((item) => item.id === selectedRegime) || best || result.regimes[0]);
  }

  function renderDetails(item) {
    if (!item) return;
    const rows = [
      ['Выручка без НДС', money(item.revenueNet)], ['Прибыль до основного налога', money(item.managementProfit)],
      ['Чистая прибыль', money(item.netProfit)], ['Доходы для налоговой базы', money(item.revenueNet)],
      ['Принимаемые расходы', money(item.taxExpenses || 0)],
      ['Налоговая база', money(item.taxBase)], [item.mainTaxName || 'Основной налог', money(item.mainTax)],
      ['НДС к уплате', money(item.vatPayable)], ['НДФЛ с ФОТ', money(item.payrollNdfl)],
      ['Страховые взносы', money(item.payrollContributions)], ['Взносы ИП', money(item.fixedContribution + item.additionalContribution)],
      ['Дивиденды', money(item.dividends)], ['НДФЛ с дивидендов', money(item.dividendTax)],
      ['Общая налоговая нагрузка', percent(item.taxBurden)], ['Доля вычетов НДС', percent(item.vatDeductionShare)],
    ];
    const marketplaceBridge = item.marketplaceBreakdown ? `<div class="marketplace-bridge"><h4>Расчет выручки после зачета баллов</h4><div class="bridge-table">
      <div class="bridge-row bridge-head"><span>площадка</span><span>до скидки</span><span>скидки / баллы</span><span>зачтено</span><span>превышение</span><span>для налога с НДС</span></div>
      ${item.marketplaceBreakdown.map((row) => `<div class="bridge-row"><strong>${escapeHtml(row.name)}</strong><span>${money(row.revenue)}</span><span>${money(row.discount)}</span><span>${money(row.usableDiscount)}</span><span>${money(row.excessDiscount)}</span><span>${money(row.adjustedRevenue)}</span></div>`).join('')}
      </div><p>Налоговая база: доходы без НДС ${money(item.revenueNet)} минус принимаемые расходы ${money(item.taxExpenses || 0)} = ${money(item.taxBase)}.</p></div>` : '';
    const autoUsnDisclaimer = ['auto-income', 'auto-dr'].includes(item.id) ? `<aside class="auto-usn-disclaimer" aria-label="Ограничения расчета АвтоУСН">
      <h4>Важно: ограничения расчета АвтоУСН</h4>
      <ul>
        <li>АвтоУСН рассчитывается по месяцам. Калькулятор использует годовые данные, поэтому показывает предварительную оценку. Для точного результата нужен расчет по каждому из 12 месяцев.</li>
        <li>НДФЛ рассчитывается по общей ставке от всего фонда оплаты труда. Прогрессивная шкала по каждому сотруднику в этой версии не применяется.</li>
        <li>Автоматически проверяются только лимит дохода и численность работников. Перед применением режима нужно отдельно проверить остаточную стоимость основных средств до 150 млн руб., счета в уполномоченных банках, безналичную выплату зарплаты, запрещенные виды деятельности и остальные условия части 2 статьи 3 Федерального закона № 17-ФЗ.</li>
        <li>Для АвтоУСН «Доходы минус расходы» калькулятор предполагает, что введенные принимаемые расходы соответствуют требованиям закона и подтверждены через банк, ККТ или личный кабинет налогоплательщика.</li>
      </ul>
      <p>Источник: <a href="https://www.nalog.gov.ru/rn77/taxation/taxes/autotax_system/" target="_blank" rel="noopener noreferrer">ФНС России - АвтоУСН</a>.</p>
    </aside>` : '';
    details.innerHTML = `<h3>${item.name}</h3>${marketplaceBridge}<div class="details-grid">${rows.map(([label, value]) => `<div class="detail"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
      ${item.vatRisk ? '<div class="detail-warning">Доля вычетов НДС выше заданного безопасного ориентира. Это не автоматический признак нарушения, но требует проверки документов.</div>' : ''}
      ${autoUsnDisclaimer}`;
  }

  function switchModel(next) {
    model = next;
    selectedRegime = null;
    localStorage.setItem('tax-calculator:model', model);
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.model === model));
    renderForm();
    recalculate();
  }

  function renderYears() {
    yearSelect.innerHTML = Object.values(R.years).map((rules) => {
      const disabled = rules.status !== 'verified' ? ' disabled' : '';
      const label = rules.status === 'verified' ? String(rules.year) : `${rules.year} - ожидаются параметры`;
      return `<option value="${rules.year}"${disabled}${rules.year === year ? ' selected' : ''}>${label}</option>`;
    }).join('');
  }

  function renderSources() {
    const rules = R.getRules(year);
    const compactMoney = (value) => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value) + ' ₽';
    document.getElementById('sourcesNote').textContent = `Федеральные параметры ${year} года сверены по официальным материалам. Региональные ставки УСН, льготы и стоимость патента вводятся вручную.`;
    document.getElementById('sourcesList').innerHTML = rules.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.title}</a></li>`).join('') +
      '<li><a href="https://www.nalog.gov.ru/service/mp/" target="_blank" rel="noreferrer">ФНС: выбор режима налогообложения</a></li>';
    document.getElementById('rulesSnapshot').innerHTML = [
      ['Основной НДС', `${rules.vatStandard * 100}%`],
      ['Освобождение УСН от НДС', compactMoney(rules.usnVatExemption)],
      ['Переход на НДС 7%', `свыше ${compactMoney(rules.usnVat5Max)}`],
      ['Предельный доход УСН', compactMoney(rules.usnMaxRevenue)],
      ['Предельный доход ПСН', compactMoney(rules.patentMaxRevenue)],
      ['Предельный доход АвтоУСН', compactMoney(rules.autoUsnMaxRevenue)],
      ['Фиксированный взнос ИП', compactMoney(rules.ipFixedContribution)],
      ['Максимальный взнос ИП 1%', compactMoney(rules.ipAdditionalContributionMax)],
      ['Налог на прибыль', `${rules.profitTax * 100}%`],
    ].map(([label, value]) => `<div class="rule-chip"><span>${label}</span><strong>${value}</strong></div>`).join('');
    document.getElementById('verificationNote').textContent = `параметры ${year} года проверены ${rules.checkedAt.split('-').reverse().join('.')}`;
  }

  function switchYear(nextYear) {
    const candidate = R.years[Number(nextYear)];
    if (!candidate || candidate.status !== 'verified') return;
    year = Number(nextYear);
    selectedRegime = null;
    localStorage.setItem('tax-calculator:year', String(year));
    renderYears();
    renderSources();
    renderForm();
    recalculate();
  }

  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => switchModel(tab.dataset.model)));
  yearSelect.addEventListener('change', () => switchYear(yearSelect.value));
  form.addEventListener('input', recalculate);
  form.addEventListener('change', recalculate);
  form.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add-platform]');
    const remove = event.target.closest('[data-remove-platform]');
    if (!add && !remove) return;
    const data = readForm();
    if (add) {
      const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
      data.customPlatforms.push({ id, type: 'other', name: '', revenue: 0, discountRate: 0, logisticsRate: 0, commissionRate: 0, otherRate: 0, promotionRate: 0, acquiringRate: 0 });
      localStorage.setItem(storageKey(), JSON.stringify(data));
      renderForm();
      form.querySelector(`[data-custom-platform="${id}"]`)?.setAttribute('open', '');
      recalculate();
    } else {
      data.customPlatforms = data.customPlatforms.filter((item) => item.id !== remove.dataset.removePlatform);
      localStorage.setItem(storageKey(), JSON.stringify(data));
      renderForm();
      recalculate();
    }
  });
  document.getElementById('resetButton').addEventListener('click', () => {
    localStorage.setItem(storageKey(), JSON.stringify(zeroState()));
    selectedRegime = null;
    renderForm();
    recalculate();
  });
  document.getElementById('printButton').addEventListener('click', () => window.print());
  document.getElementById('downloadButton').addEventListener('click', downloadSnapshot);
  document.getElementById('excelButton').addEventListener('click', exportExcel);
  const instructionDialog = document.getElementById('instructionDialog');
  document.getElementById('instructionButton').addEventListener('click', () => instructionDialog.showModal());
  document.getElementById('instructionClose').addEventListener('click', () => instructionDialog.close());
  instructionDialog.addEventListener('click', (event) => {
    if (event.target === instructionDialog) instructionDialog.close();
  });

  form.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const isNumeric = input.dataset.money === 'true' || input.type === 'number';
    if (isNumeric && parseInputNumber(input.value) === 0) input.value = '';
  });

  form.addEventListener('focusout', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const isNumeric = input.dataset.money === 'true' || input.type === 'number';
    if (isNumeric && input.value.trim() === '') input.value = '0';
    if (input.dataset.money === 'true') input.value = formatInputNumber(parseInputNumber(input.value));
  });

  function exportExcel() {
    if (!window.XLSX || !window.TaxExcelExport) {
      window.alert('Не удалось загрузить модуль Excel. Проверьте, что папка vendor находится рядом с файлом index.html.');
      return;
    }

    const data = readForm();
    const result = calculate(data);
    const companyName = document.getElementById('companyName').value.trim();
    const modelName = model === 'base' ? 'Базовый бизнес' : 'Маркетплейсы';
    const inputRows = [];

    form.querySelectorAll('input, select, textarea').forEach((control) => {
      if (!control.name || control.type === 'hidden') return;
      const label = control.labels?.[0]?.textContent.trim() || control.name;
      let value;
      if (control.type === 'checkbox') value = control.checked ? 'Да' : 'Нет';
      else if (control.dataset.money === 'true') value = parseInputNumber(control.value);
      else if (control.dataset.percent === 'true') value = (Number(control.value) || 0) / 100;
      else if (control.type === 'number') value = Number(control.value) || 0;
      else value = control.value;
      inputRows.push([label, value, control.dataset.percent === 'true' ? '0.00%' : null]);
    });

    const workbook = window.TaxExcelExport.buildWorkbook(window.XLSX, { companyName, modelName, year, inputRows, result });
    const stamp = new Date().toISOString().slice(0, 10);
    const safeCompany = (companyName || 'Компания').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60);
    window.XLSX.writeFile(workbook, `${safeCompany} - налоговый расчет ${year} - ${stamp}.xlsx`, { compression: true });
  }

  function downloadSnapshot() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('input, select, textarea').forEach((control, index) => {
      const source = document.querySelectorAll('input, select, textarea')[index];
      if (!source) return;
      if (control.tagName === 'TEXTAREA') control.textContent = source.value;
      else if (control.tagName === 'SELECT') Array.from(control.options).forEach((option, i) => option.toggleAttribute('selected', i === source.selectedIndex));
      else { control.setAttribute('value', source.value); control.toggleAttribute('checked', source.checked); }
    });
    clone.querySelectorAll('script').forEach((node) => node.remove());
    clone.querySelector('.toolbar')?.remove();
    const css = Array.from(document.styleSheets).flatMap((sheet) => {
      try { return Array.from(sheet.cssRules).map((rule) => rule.cssText); } catch (_) { return []; }
    }).join('\n');
    clone.querySelector('link[rel="stylesheet"]')?.remove();
    const style = document.createElement('style');
    style.textContent = css + '\ninput,select,textarea{pointer-events:none}';
    clone.querySelector('head').appendChild(style);
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob(['<!doctype html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Налоговый-калькулятор-${year}-${stamp}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  renderYears();
  renderSources();
  switchModel(model);
})();
