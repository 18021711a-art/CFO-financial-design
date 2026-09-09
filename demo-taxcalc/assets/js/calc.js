(function (root) {
  'use strict';

  const taxRules = root.TaxRules;
  if (!taxRules) throw new Error('TaxRules must be loaded before calc.js');

  const baseDefaults = Object.freeze({
    organization: 'ООО',
    employees: 5,
    vatReliefEligible: false,
    revenueGross: 19_000_000,
    undocumentedRevenue: 1_000_000,
    salary: 2_600_000,
    payrollNdflRate: 0.13,
    payrollContributionRate: 0.302,
    contractorsValid: 600_000,
    contractorsOther: 1_000_000,
    costVat22: 2_776_000,
    costVat10: 1_000,
    costVat7: 333,
    costVat5: 5_555,
    costNoVat: 1_944_000,
    costRate: 0.32,
    costShareVat22: 0.70,
    costShareVat10: 0.20,
    costShareVat7: 0,
    costShareVat5: 0,
    costShareNoVat: 0.10,
    opexVat22: 405_720,
    opexVat10: 55_555,
    opexVat7: 77_777,
    opexVat5: 3_333,
    opexNoVat: 446_680,
    nonTaxDeductible: 1_000_000,
    taxOptimizationExpense: 1_360_000,
    propertyTaxes: 30_000,
    otherBelowOperating: 100,
    interest: 2_000,
    depreciation: 360_000,
    assetPurchase: 500_000,
    patentBase: 3_000_000,
    patentCost: 0,
    patentEligible: false,
    usnIncomeRate: 0.06,
    usnDrRate: 0.15,
    dividendShare: 0.30,
    dividendNdflRate: 0.15,
    safeVatDeductionShare: 0.89,
    opexComment: '',
  });

  const marketplaceDefaults = Object.freeze({
    organization: 'ИП',
    employees: 5,
    vatReliefEligible: false,
    wbRevenue: 1_000_000,
    wbDiscountRate: 0.25,
    wbLogisticsRate: 0.50,
    wbCommissionRate: 1.00,
    wbOtherRate: 0.20,
    wbPromotionRate: 0.20,
    wbAcquiringRate: 0.015,
    ozonRevenue: 10_000_000,
    ozonDiscountRate: 0.35,
    ozonLogisticsRate: 0.05,
    ozonCommissionRate: 0.05,
    ozonOtherRate: 0.05,
    ozonPromotionRate: 0.02,
    ozonAcquiringRate: 0.015,
    mp3Revenue: 10_000_000,
    mp3DiscountRate: 0.05,
    mp3LogisticsRate: 0.05,
    mp3CommissionRate: 0.07,
    mp3OtherRate: 0.05,
    mp3PromotionRate: 0.05,
    mp3AcquiringRate: 0.015,
    customPlatforms: [],
    undocumentedRevenue: 1_000_000,
    salary: 1_440_000,
    payrollNdflRate: 0.13,
    payrollContributionRate: 0.302,
    contractorsValid: 1_000_000,
    contractorsOther: 0,
    costVat22: 777_600,
    costVat10: 1_000,
    costVat5: 333,
    costVat7: 5_555,
    costNoVat: 194_400,
    costRate: 0.32,
    costShareVat22: 0.70,
    costShareVat10: 0.20,
    costShareVat7: 0,
    costShareVat5: 0,
    costShareNoVat: 0.10,
    opexVat22: 405_720,
    opexVat10: 55_555,
    opexVat5: 77_777,
    opexVat7: 3_333,
    opexNoVat: 446_680,
    nonTaxDeductible: 1_000_000,
    taxOptimizationExpense: 3_600_000,
    propertyTaxes: 30_000,
    otherBelowOperating: 100,
    interest: 2_000,
    depreciation: 36_000,
    assetPurchase: 500_000,
    usnIncomeRate: 0.06,
    usnDrRate: 0.15,
    dividendShare: 0.30,
    dividendNdflRate: 0.15,
    safeVatDeductionShare: 0.89,
    opexComment: '',
  });

  function getBaseRegimes(rules) { return [
    { id: 'osno', name: `ОСНО - НДС ${rules.vatStandard * 100}%`, tax: 'osno', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'osno-relief', name: 'ОСНО - льгота по НДС', tax: 'osno', vatRate: 0, vatDeduction: false, relief: true },
    { id: 'usn-income-0', name: 'УСН «Доходы» - без НДС', tax: 'usnIncome', vatRate: 0 },
    { id: 'patent-income', name: 'Патент + УСН «Доходы» - без НДС', tax: 'usnIncome', vatRate: 0, patent: true },
    { id: 'usn-income-5', name: 'УСН «Доходы» + НДС 5%', tax: 'usnIncome', vatRate: 0.05 },
    { id: 'usn-income-7', name: 'УСН «Доходы» + НДС 7%', tax: 'usnIncome', vatRate: 0.07 },
    { id: 'usn-income-standard', name: `УСН «Доходы» + НДС ${rules.vatStandard * 100}%`, tax: 'usnIncome', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'usn-dr-0', name: 'УСН «Доходы минус расходы» - без НДС', tax: 'usnDr', vatRate: 0 },
    { id: 'patent-dr', name: 'Патент + УСН «Доходы минус расходы» - без НДС', tax: 'usnDr', vatRate: 0, patent: true },
    { id: 'usn-dr-5', name: 'УСН «Доходы минус расходы» + НДС 5%', tax: 'usnDr', vatRate: 0.05 },
    { id: 'usn-dr-7', name: 'УСН «Доходы минус расходы» + НДС 7%', tax: 'usnDr', vatRate: 0.07 },
    { id: 'usn-dr-standard', name: `УСН «Доходы минус расходы» + НДС ${rules.vatStandard * 100}%`, tax: 'usnDr', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'auto-income', name: 'АвтоУСН «Доходы» - 8%', tax: 'autoIncome', vatRate: 0 },
    { id: 'auto-dr', name: 'АвтоУСН «Доходы минус расходы» - 20%', tax: 'autoDr', vatRate: 0 },
  ]; }

  function getMarketplaceRegimes(rules) { return [
    { id: 'osno', name: `ОСНО - НДС ${rules.vatStandard * 100}%`, tax: 'osno', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'osno-relief', name: 'ОСНО - льгота по НДС', tax: 'osno', vatRate: 0, vatDeduction: false, relief: true },
    { id: 'usn-income-0', name: 'УСН «Доходы» - без НДС', tax: 'usnIncome', vatRate: 0 },
    { id: 'usn-income-5', name: 'УСН «Доходы» + НДС 5%', tax: 'usnIncome', vatRate: 0.05 },
    { id: 'usn-income-7', name: 'УСН «Доходы» + НДС 7%', tax: 'usnIncome', vatRate: 0.07 },
    { id: 'usn-income-standard', name: `УСН «Доходы» + НДС ${rules.vatStandard * 100}%`, tax: 'usnIncome', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'usn-dr-0', name: 'УСН «Доходы минус расходы» - без НДС', tax: 'usnDr', vatRate: 0 },
    { id: 'usn-dr-5', name: 'УСН «Доходы минус расходы» + НДС 5%', tax: 'usnDr', vatRate: 0.05 },
    { id: 'usn-dr-7', name: 'УСН «Доходы минус расходы» + НДС 7%', tax: 'usnDr', vatRate: 0.07 },
    { id: 'usn-dr-standard', name: `УСН «Доходы минус расходы» + НДС ${rules.vatStandard * 100}%`, tax: 'usnDr', vatRate: rules.vatStandard, vatDeduction: true },
    { id: 'auto-income', name: 'АвтоУСН «Доходы» - 8%', tax: 'autoIncome', vatRate: 0 },
    { id: 'auto-dr', name: 'АвтоУСН «Доходы минус расходы» - 20%', tax: 'autoDr', vatRate: 0 },
  ]; }

  function n(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function withDefaults(defaults, input) {
    return Object.assign({}, defaults, input || {});
  }

  function netOfVat(gross, rate, deductVat) {
    gross = n(gross);
    rate = n(rate);
    return deductVat && rate > 0 ? gross - (gross * rate) / (1 + rate) : gross;
  }

  function sum(values) {
    return values.reduce((total, value) => total + n(value), 0);
  }

  function costAmounts(input, revenueGross) {
    const total = n(revenueGross) * n(input.costRate);
    return {
      vatStandard: total * n(input.costShareVat22), vat10: total * n(input.costShareVat10),
      vat7: total * n(input.costShareVat7), vat5: total * n(input.costShareVat5),
      noVat: total * n(input.costShareNoVat), total,
    };
  }

  function progressiveNdfl(base) {
    base = Math.max(n(base), 0);
    if (base <= 2_400_000) return base * 0.13;
    if (base <= 5_000_000) return 312_000 + (base - 2_400_000) * 0.15;
    if (base <= 20_000_000) return 702_000 + (base - 5_000_000) * 0.18;
    if (base <= 50_000_000) return 3_402_000 + (base - 20_000_000) * 0.20;
    return 9_402_000 + (base - 50_000_000) * 0.22;
  }

  function ipAdditionalContribution(base, organization, autoUsn, rules) {
    if (organization !== 'ИП' || autoUsn) return 0;
    return Math.min(Math.max(n(base) - 300_000, 0) * 0.01, rules.ipAdditionalContributionMax);
  }

  function usnIncomeTax(base, rate, fixed, additional, payrollContributions, employees) {
    const grossTax = Math.max(n(base), 0) * n(rate);
    const deduction = n(fixed) + n(additional) + (n(employees) > 0 ? n(payrollContributions) : 0);
    if (n(employees) > 0) return Math.max(grossTax - deduction, grossTax / 2);
    return Math.max(grossTax - deduction, 0);
  }

  function payrollContributionAmount(input, autoUsn, rules) {
    if (autoUsn) return n(input.employees) > 0 ? n(rules.autoUsnAccidentContribution) : 0;
    return n(input.salary) * n(input.payrollContributionRate);
  }

  function regimeStatus(regime, revenue, employees, patentEligible, vatReliefEligible, rules) {
    const messages = [];
    if (regime.relief && !vatReliefEligible) messages.push('подтвердите право на льготу по НДС');
    if (regime.tax === 'autoIncome' || regime.tax === 'autoDr') {
      if (n(employees) > rules.autoUsnMaxEmployees) messages.push('превышена численность АвтоУСН');
      if (n(revenue) > rules.autoUsnMaxRevenue) messages.push('превышен лимит АвтоУСН');
    } else if (regime.tax !== 'osno') {
      if (n(employees) > rules.usnMaxEmployees) messages.push('превышена численность УСН');
      if (n(revenue) > rules.usnMaxRevenue) messages.push('превышен лимит УСН');
    }

    if (regime.patent && (n(revenue) > rules.patentMaxRevenue || n(employees) > rules.patentMaxEmployees)) {
      messages.push('ПСН и освобождение от НДС недоступны');
    } else if (regime.tax === 'usnIncome' || regime.tax === 'usnDr') {
      if (regime.vatRate === 0 && n(revenue) > rules.usnVatExemption) messages.push('НДС обязателен');
      if (regime.vatRate === 0.05 && n(revenue) > rules.usnVat5Max) {
        messages.push('превышен предел НДС 5%');
      }
      // Ставки 7% и общеустановленная ставка НДС остаются доступными в сравнении,
      // если компания уже применяет их. Общие лимиты самой УСН проверяются выше.
    }
    return { ok: messages.length === 0, label: messages.length ? messages.join('; ') : 'ОК' };
  }

  function baseExpenseLines(input, deductVat, fixedContribution, additionalContribution, autoUsn, rules) {
    const costParts = costAmounts(input, input.revenueGross, rules);
    const cost = sum([
      netOfVat(costParts.vatStandard, rules.vatStandard, deductVat),
      netOfVat(costParts.vat10, 0.10, deductVat), netOfVat(costParts.vat7, 0.07, deductVat),
      netOfVat(costParts.vat5, 0.05, deductVat), costParts.noVat,
    ]);
    const opex = sum([
      netOfVat(input.opexVat22, rules.vatStandard, deductVat),
      netOfVat(input.opexVat10, 0.10, deductVat),
      netOfVat(input.opexVat7, 0.07, deductVat),
      netOfVat(input.opexVat5, 0.05, deductVat),
      input.opexNoVat,
    ]);
    return {
      salary: n(input.salary),
      payrollContributions: payrollContributionAmount(input, autoUsn, rules),
      contractorsValid: n(input.contractorsValid),
      contractorsOther: n(input.contractorsOther),
      cost,
      opex,
      nonTaxDeductible: n(input.nonTaxDeductible),
      taxOptimizationExpense: n(input.taxOptimizationExpense),
      propertyTaxes: n(input.propertyTaxes),
      otherBelowOperating: n(input.otherBelowOperating),
      interest: n(input.interest),
      fixedContribution: n(fixedContribution),
      additionalContribution: n(additionalContribution),
      depreciation: n(input.depreciation),
      assetPurchase: netOfVat(input.assetPurchase, rules.vatStandard, deductVat),
    };
  }

  function calculateBaseRegime(input, regime, rules) {
    const deductVat = Boolean(regime.vatDeduction);
    const outputVat = n(input.revenueGross) * n(regime.vatRate) / (1 + n(regime.vatRate));
    const revenueNet = n(input.revenueGross) - outputVat;
    const totalRevenue = revenueNet + n(input.undocumentedRevenue);
    const fixedContribution = input.organization === 'ИП' && totalRevenue > 0 && !regime.tax.startsWith('auto') ? rules.ipFixedContribution : 0;

    const autoUsn = regime.tax.startsWith('auto');
    const provisional = baseExpenseLines(input, deductVat, fixedContribution, 0, autoUsn, rules);
    let ipBase = revenueNet;
    if (regime.tax === 'osno') {
      ipBase -= sum([provisional.salary, provisional.payrollContributions, provisional.contractorsValid,
        provisional.cost, provisional.opex, provisional.taxOptimizationExpense, provisional.propertyTaxes,
        provisional.otherBelowOperating, provisional.interest, provisional.depreciation]);
    } else if (regime.tax === 'usnDr' && !regime.patent) {
      ipBase -= sum([provisional.salary, provisional.payrollContributions, provisional.contractorsValid,
        provisional.cost, provisional.opex, provisional.taxOptimizationExpense, provisional.propertyTaxes,
        provisional.otherBelowOperating, provisional.interest, provisional.fixedContribution, provisional.assetPurchase]);
    } else if (regime.patent) {
      ipBase = n(input.patentBase);
    }
    const additionalContribution = ipAdditionalContribution(ipBase, input.organization, regime.tax.startsWith('auto'), rules);
    const expenses = baseExpenseLines(input, deductVat, fixedContribution, additionalContribution, autoUsn, rules);

    const managementExpenses = sum([expenses.salary, expenses.payrollContributions, expenses.contractorsValid,
      expenses.contractorsOther, expenses.cost, expenses.opex, expenses.nonTaxDeductible, expenses.propertyTaxes,
      expenses.otherBelowOperating, expenses.interest, expenses.fixedContribution, expenses.additionalContribution,
      expenses.depreciation]);
    const managementProfit = totalRevenue - managementExpenses;

    const taxDeductibleCommon = sum([expenses.salary, expenses.payrollContributions, expenses.contractorsValid,
      expenses.cost, expenses.opex, expenses.taxOptimizationExpense, expenses.propertyTaxes,
      expenses.otherBelowOperating, expenses.interest, expenses.fixedContribution, expenses.additionalContribution]);
    let taxExpenses = 0;
    if (regime.tax === 'osno') taxExpenses = taxDeductibleCommon + expenses.depreciation;
    if (regime.tax === 'usnDr' || regime.tax === 'autoDr') taxExpenses = taxDeductibleCommon + expenses.assetPurchase;
    const taxBase = revenueNet - taxExpenses;

    const payrollNdfl = n(input.salary) * n(input.payrollNdflRate);
    let mainTax = 0;
    let mainTaxName = '';
    if (regime.tax === 'osno') {
      mainTaxName = input.organization === 'ООО' ? 'Налог на прибыль' : 'НДФЛ предпринимателя';
      mainTax = input.organization === 'ООО' ? Math.max(taxBase, 0) * rules.profitTax : progressiveNdfl(taxBase);
    } else if (regime.patent && input.patentEligible) {
      mainTaxName = 'Патент';
      mainTax = n(input.patentCost);
    } else if (regime.tax === 'usnIncome') {
      mainTaxName = 'УСН «Доходы»';
      mainTax = usnIncomeTax(taxBase, input.usnIncomeRate, fixedContribution, additionalContribution,
        expenses.payrollContributions, input.employees);
    } else if (regime.tax === 'usnDr') {
      mainTaxName = 'УСН «Доходы минус расходы»';
      mainTax = Math.max(Math.max(taxBase, 0) * n(input.usnDrRate), revenueNet * 0.01);
    } else if (regime.tax === 'autoIncome') {
      mainTaxName = 'АвтоУСН «Доходы»';
      mainTax = Math.max(taxBase, 0) * rules.autoUsnIncomeRate;
    } else if (regime.tax === 'autoDr') {
      mainTaxName = 'АвтоУСН «Доходы минус расходы»';
      mainTax = Math.max(Math.max(taxBase, 0) * rules.autoUsnDrRate, revenueNet * rules.autoUsnMinimumRate);
    }

    const costParts = costAmounts(input, input.revenueGross, rules);
    const inputVat = deductVat ? sum([
      costParts.vatStandard - netOfVat(costParts.vatStandard, rules.vatStandard, true),
      costParts.vat10 - netOfVat(costParts.vat10, 0.10, true),
      costParts.vat7 - netOfVat(costParts.vat7, 0.07, true),
      costParts.vat5 - netOfVat(costParts.vat5, 0.05, true),
      n(input.opexVat22) - netOfVat(input.opexVat22, rules.vatStandard, true),
      n(input.opexVat10) - netOfVat(input.opexVat10, 0.10, true),
      n(input.opexVat7) - netOfVat(input.opexVat7, 0.07, true),
      n(input.opexVat5) - netOfVat(input.opexVat5, 0.05, true),
      n(input.assetPurchase) - netOfVat(input.assetPurchase, rules.vatStandard, true),
    ]) : 0;
    const vatPayable = outputVat - inputVat;
    const netProfit = managementProfit - mainTax;
    const dividends = netProfit > 0 ? netProfit * n(input.dividendShare) : 0;
    const dividendTax = input.organization === 'ООО' ? dividends * n(input.dividendNdflRate) : 0;
    const payrollContributionTax = expenses.payrollContributions;
    const totalTaxes = sum([payrollNdfl, payrollContributionTax, input.propertyTaxes, mainTax,
      fixedContribution, additionalContribution, vatPayable, dividendTax]);
    const status = regimeStatus(regime, totalRevenue, input.employees, input.patentEligible, input.vatReliefEligible, rules);

    return {
      id: regime.id, name: regime.name, status, revenue: totalRevenue, revenueNet, managementProfit, taxExpenses,
      taxBase, mainTax, mainTaxName, outputVat, inputVat, vatPayable, netProfit, dividends,
      dividendTax, fixedContribution, additionalContribution, payrollNdfl,
      payrollContributions: payrollContributionTax, propertyTaxes: n(input.propertyTaxes), totalTaxes,
      taxBurden: totalRevenue ? totalTaxes / totalRevenue : 0,
      vatDeductionShare: outputVat ? inputVat / outputVat : 0,
      vatRisk: deductVat && outputVat > 0 && inputVat / outputVat > n(input.safeVatDeductionShare),
    };
  }

  function calculateBase(input) {
    input = withDefaults(baseDefaults, input);
    const rules = taxRules.getRules(input.year || taxRules.defaultYear);
    const regimes = getBaseRegimes(rules).map((regime) => calculateBaseRegime(input, regime, rules));
    return summarize('base', input, regimes, rules);
  }

  function marketplaceRows(input) {
    const fixed = [
      marketplaceRow(input, 'wb', 'Wildberries', 'wb'),
      marketplaceRow(input, 'ozon', 'Ozon', 'ozon'),
      marketplaceRow(input, 'mp3', 'Яндекс Маркет', 'yandex'),
    ];
    const custom = Array.isArray(input.customPlatforms) ? input.customPlatforms : [];
    const migratedLegacy = custom.length === 0 && (n(input.mp4Revenue) > 0 || (input.mp4Name && input.mp4Name !== 'Маркетплейс 4'))
      ? [{
        id: 'legacy-mp4', name: input.mp4Name || 'Другая площадка', revenue: input.mp4Revenue,
        discountRate: input.mp4DiscountRate, logisticsRate: input.mp4LogisticsRate,
        commissionRate: input.mp4CommissionRate, otherRate: input.mp4OtherRate,
        promotionRate: input.mp4PromotionRate, acquiringRate: input.mp4AcquiringRate,
      }]
      : [];
    return fixed.concat(custom.concat(migratedLegacy).map((row, index) => marketplaceRowFromObject(row, index)));
  }

  function marketplaceRow(input, key, name, policy) {
    return enrichMarketplaceRow({
      key, name, policy, revenue: n(input[`${key}Revenue`]), discountRate: n(input[`${key}DiscountRate`]),
      logisticsRate: n(input[`${key}LogisticsRate`]), commissionRate: n(input[`${key}CommissionRate`]),
      otherRate: n(input[`${key}OtherRate`]), promotionRate: n(input[`${key}PromotionRate`]),
      acquiringRate: n(input[`${key}AcquiringRate`]),
    });
  }

  function marketplaceRowFromObject(source, index) {
    const policy = ['wb', 'ozon', 'yandex', 'other'].includes(source.type) ? source.type : 'other';
    const standardName = { wb: 'Wildberries', ozon: 'Ozon', yandex: 'Яндекс Маркет' }[policy];
    return enrichMarketplaceRow({
      key: `custom_${source.id || index}`, name: policy === 'other' ? source.name || `Новая площадка ${index + 1}` : standardName, policy,
      revenue: n(source.revenue), discountRate: n(source.discountRate), logisticsRate: n(source.logisticsRate),
      commissionRate: n(source.commissionRate), otherRate: n(source.otherRate),
      promotionRate: n(source.promotionRate), acquiringRate: n(source.acquiringRate),
    });
  }

  function enrichMarketplaceRow(row) {
    const serviceKeys = ['logistics', 'commission', 'other', 'promotion', 'acquiring'];
    serviceKeys.forEach((key) => { row[key] = row.revenue * row[`${key}Rate`]; });
    row.discount = row.revenue * row.discountRate;
    const policy = {
      wb: { eligible: ['logistics', 'commission', 'other'], minimumRate: 0, label: 'скидка уменьшает логистику, комиссию и прочие услуги' },
      ozon: { eligible: ['logistics', 'commission', 'other', 'promotion'], minimumRate: 0.01, label: 'баллы уменьшают услуги, минимальный остаток расходов 1%' },
      yandex: { eligible: ['commission'], minimumRate: 0.01, label: 'баллы уменьшают комиссию, минимальный остаток комиссии 1%' },
      other: { eligible: serviceKeys, minimumRate: 0, label: 'баллы уменьшают все услуги' },
    }[row.policy];
    row.policyLabel = policy.label;
    row.eligibleExpense = sum(policy.eligible.map((key) => row[key]));
    row.minimumExpense = row.eligibleExpense * policy.minimumRate;
    row.usableDiscount = Math.min(row.discount, Math.max(row.eligibleExpense - row.minimumExpense, 0));
    row.excessDiscount = Math.max(row.discount - row.usableDiscount, 0);
    row.adjustedRevenue = row.revenue - row.discount + row.excessDiscount;
    const reductionShare = row.eligibleExpense ? row.usableDiscount / row.eligibleExpense : 0;
    serviceKeys.forEach((key) => {
      row[`recognized${key[0].toUpperCase()}${key.slice(1)}`] = policy.eligible.includes(key) ? row[key] * (1 - reductionShare) : row[key];
    });
    row.recognizedVatServices = sum(['Logistics', 'Commission', 'Other', 'Promotion'].map((key) => row[`recognized${key}`]));
    row.recognizedNoVatServices = row.recognizedAcquiring;
    row.recognizedServices = row.recognizedVatServices + row.recognizedNoVatServices;
    return row;
  }

  function marketplaceExpenseLines(input, deductVat, revenueGross, fixedContribution, additionalContribution, autoUsn, rules, platforms) {
    const standardVat = rules.vatStandard;
    const marketplaceGross = sum(platforms.map((row) => row.recognizedVatServices));
    const marketplaceVat = deductVat ? marketplaceGross / (1 + standardVat) : marketplaceGross;
    // Все услуги площадок, включая эквайринг без НДС, уже рассчитаны в карточках МП.
    // Старое сохраненное поле marketplaceCostsNoVat намеренно не учитывается.
    const marketplaceNoVat = sum(platforms.map((row) => row.recognizedNoVatServices));

    const costParts = costAmounts(input, revenueGross, rules);
    const cost = sum([
      netOfVat(costParts.vatStandard, standardVat, deductVat), netOfVat(costParts.vat10, 0.10, deductVat),
      netOfVat(costParts.vat5, 0.05, deductVat), netOfVat(costParts.vat7, 0.07, deductVat), costParts.noVat,
    ]);
    const opex = sum([
      netOfVat(input.opexVat22, standardVat, deductVat),
      netOfVat(input.opexVat10, 0.10, deductVat), netOfVat(input.opexVat5, 0.05, deductVat),
      netOfVat(input.opexVat7, 0.07, deductVat), input.opexNoVat,
    ]);
    return {
      salary: n(input.salary),
      payrollContributions: payrollContributionAmount(input, autoUsn, rules),
      contractorsValid: n(input.contractorsValid), contractorsOther: n(input.contractorsOther),
      marketplaceVat, marketplaceGross, marketplaceNoVat, platforms, cost, opex,
      nonTaxDeductible: n(input.nonTaxDeductible), taxOptimizationExpense: n(input.taxOptimizationExpense),
      propertyTaxes: n(input.propertyTaxes), otherBelowOperating: n(input.otherBelowOperating),
      interest: n(input.interest), fixedContribution: n(fixedContribution),
      additionalContribution: n(additionalContribution), depreciation: n(input.depreciation),
      assetPurchase: netOfVat(input.assetPurchase, rules.vatStandard, deductVat),
    };
  }

  function calculateMarketplaceRegime(input, regime, rules) {
    const deductVat = Boolean(regime.vatDeduction);
    const platforms = marketplaceRows(input);
    const revenueGross = sum(platforms.map((row) => row.adjustedRevenue));
    const outputVat = revenueGross * n(regime.vatRate) / (1 + n(regime.vatRate));
    const revenueNet = revenueGross - outputVat;
    const totalRevenue = revenueNet + n(input.undocumentedRevenue);
    const fixedContribution = input.organization === 'ИП' && totalRevenue > 0 && !regime.tax.startsWith('auto') ? rules.ipFixedContribution : 0;
    const autoUsn = regime.tax.startsWith('auto');
    const provisional = marketplaceExpenseLines(input, deductVat, revenueGross, fixedContribution, 0, autoUsn, rules, platforms);

    let ipBase = revenueNet;
    if (regime.tax === 'osno') {
      ipBase -= sum([provisional.salary, provisional.payrollContributions, provisional.contractorsValid,
        provisional.marketplaceVat, provisional.marketplaceNoVat, provisional.cost, provisional.opex,
        provisional.taxOptimizationExpense, provisional.propertyTaxes, provisional.otherBelowOperating,
        provisional.interest, provisional.depreciation]);
    } else if (regime.tax === 'usnDr') {
      ipBase -= sum([provisional.salary, provisional.payrollContributions, provisional.contractorsValid,
        provisional.marketplaceVat, provisional.marketplaceNoVat, provisional.cost, provisional.opex,
        provisional.taxOptimizationExpense, provisional.propertyTaxes, provisional.otherBelowOperating,
        provisional.interest, provisional.fixedContribution, provisional.assetPurchase]);
    }
    const additionalContribution = ipAdditionalContribution(ipBase, input.organization, regime.tax.startsWith('auto'), rules);
    const expenses = marketplaceExpenseLines(input, deductVat, revenueGross, fixedContribution, additionalContribution, autoUsn, rules, platforms);
    const managementExpenses = sum([expenses.salary, expenses.payrollContributions, expenses.contractorsValid,
      expenses.contractorsOther, expenses.marketplaceVat, expenses.marketplaceNoVat, expenses.cost, expenses.opex,
      expenses.nonTaxDeductible, expenses.propertyTaxes, expenses.otherBelowOperating, expenses.interest,
      expenses.fixedContribution, expenses.additionalContribution, expenses.depreciation]);
    const managementProfit = totalRevenue - managementExpenses;

    const taxDeductibleCommon = sum([expenses.salary, expenses.payrollContributions, expenses.contractorsValid,
      expenses.marketplaceVat, expenses.marketplaceNoVat, expenses.cost, expenses.opex,
      expenses.taxOptimizationExpense, expenses.propertyTaxes, expenses.otherBelowOperating, expenses.interest,
      expenses.fixedContribution, expenses.additionalContribution]);
    let taxExpenses = 0;
    if (regime.tax === 'osno') taxExpenses = taxDeductibleCommon + expenses.depreciation;
    if (regime.tax === 'usnDr' || regime.tax === 'autoDr') taxExpenses = taxDeductibleCommon + expenses.assetPurchase;
    const taxBase = revenueNet - taxExpenses;

    let mainTax = 0;
    let mainTaxName = '';
    if (regime.tax === 'osno') {
      mainTaxName = input.organization === 'ООО' ? 'Налог на прибыль' : 'НДФЛ предпринимателя';
      mainTax = input.organization === 'ООО' ? Math.max(taxBase, 0) * rules.profitTax : progressiveNdfl(taxBase);
    } else if (regime.tax === 'usnIncome') {
      mainTaxName = 'УСН «Доходы»';
      mainTax = usnIncomeTax(taxBase, input.usnIncomeRate, fixedContribution, additionalContribution,
        expenses.payrollContributions, input.employees);
    } else if (regime.tax === 'usnDr') {
      mainTaxName = 'УСН «Доходы минус расходы»';
      mainTax = Math.max(Math.max(taxBase, 0) * n(input.usnDrRate), revenueNet * 0.01);
    } else if (regime.tax === 'autoIncome') {
      mainTaxName = 'АвтоУСН «Доходы»';
      mainTax = Math.max(taxBase, 0) * rules.autoUsnIncomeRate;
    } else if (regime.tax === 'autoDr') {
      mainTaxName = 'АвтоУСН «Доходы минус расходы»';
      mainTax = Math.max(Math.max(taxBase, 0) * rules.autoUsnDrRate, revenueNet * rules.autoUsnMinimumRate);
    }

    const costParts = costAmounts(input, revenueGross, rules);
    const baseInputVat = deductVat ? sum([
      costParts.vatStandard - netOfVat(costParts.vatStandard, rules.vatStandard, true),
      costParts.vat10 - netOfVat(costParts.vat10, 0.10, true),
      costParts.vat5 - netOfVat(costParts.vat5, 0.05, true),
      costParts.vat7 - netOfVat(costParts.vat7, 0.07, true),
      n(input.opexVat22) - netOfVat(input.opexVat22, rules.vatStandard, true),
      n(input.opexVat10) - netOfVat(input.opexVat10, 0.10, true),
      n(input.opexVat5) - netOfVat(input.opexVat5, 0.05, true),
      n(input.opexVat7) - netOfVat(input.opexVat7, 0.07, true),
      n(input.assetPurchase) - netOfVat(input.assetPurchase, rules.vatStandard, true),
    ]) : 0;
    const marketplaceInputVat = deductVat ? expenses.marketplaceGross - expenses.marketplaceVat : 0;
    const inputVat = baseInputVat + marketplaceInputVat;
    const vatPayable = outputVat - inputVat;
    const netProfit = managementProfit - mainTax;
    const dividends = netProfit > 0 ? netProfit * n(input.dividendShare) : 0;
    const dividendTax = input.organization === 'ООО' ? dividends * n(input.dividendNdflRate) : 0;
    const payrollNdfl = n(input.salary) * n(input.payrollNdflRate);
    const totalTaxes = sum([payrollNdfl, expenses.payrollContributions, input.propertyTaxes, mainTax,
      fixedContribution, additionalContribution, vatPayable, dividendTax]);
    const status = regimeStatus(regime, totalRevenue, input.employees, false, input.vatReliefEligible, rules);

    return {
      id: regime.id, name: regime.name, status, revenue: totalRevenue, revenueNet, managementProfit, taxExpenses,
      taxBase, mainTax, mainTaxName, outputVat, inputVat, vatPayable, netProfit, dividends,
      dividendTax, fixedContribution, additionalContribution, payrollNdfl,
      payrollContributions: expenses.payrollContributions, propertyTaxes: n(input.propertyTaxes), totalTaxes,
      taxBurden: totalRevenue ? totalTaxes / totalRevenue : 0,
      vatDeductionShare: outputVat ? inputVat / outputVat : 0,
      vatRisk: deductVat && outputVat > 0 && inputVat / outputVat > n(input.safeVatDeductionShare),
      marketplaceBreakdown: platforms,
    };
  }

  function calculateMarketplace(input) {
    input = withDefaults(marketplaceDefaults, input);
    const rules = taxRules.getRules(input.year || taxRules.defaultYear);
    const regimes = getMarketplaceRegimes(rules).map((regime) => calculateMarketplaceRegime(input, regime, rules));
    return summarize('marketplace', input, regimes, rules);
  }

  function summarize(model, input, regimes, rules) {
    const allowed = regimes.filter((item) => item.status.ok && Number.isFinite(item.netProfit));
    const best = allowed.reduce((current, item) => !current || item.netProfit > current.netProfit ? item : current, null);
    return { model, year: rules.year, rules, input, regimes, best };
  }

  root.TaxCalculator = {
    taxRules,
    baseDefaults,
    marketplaceDefaults,
    getBaseRegimes,
    getMarketplaceRegimes,
    marketplaceRows,
    costAmounts,
    calculateBase,
    calculateMarketplace,
    progressiveNdfl,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
