(function (root) {
  'use strict';

  const RULES = {
    2025: {
      year: 2025,
      status: 'verified',
      checkedAt: '2026-08-13',
      vatStandard: 0.20,
      usnVatExemption: 60_000_000,
      usnVat5Max: 250_000_000,
      usnMaxRevenue: 450_000_000,
      usnMaxEmployees: 130,
      patentMaxRevenue: 60_000_000,
      patentMaxEmployees: 15,
      autoUsnMaxRevenue: 60_000_000,
      autoUsnMaxEmployees: 5,
      autoUsnIncomeRate: 0.08,
      autoUsnDrRate: 0.20,
      autoUsnMinimumRate: 0.03,
      autoUsnAccidentContribution: 2_750,
      ipFixedContribution: 53_658,
      ipAdditionalContributionMax: 300_888,
      profitTax: 0.25,
      sources: [
        { title: 'ФНС: налоги 2025', url: 'https://www.nalog.gov.ru/rn60/promo/new2025/' },
        { title: 'ФНС: НДС при УСН', url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/nds_usn/' },
        { title: 'ФНС: взносы ИП за 2025 год', url: 'https://www.nalog.gov.ru/rn25/ifns/r25_16/info/15819741/' },
        { title: 'ФНС: АвтоУСН', url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/autotax_system/' },
      ],
    },
    2026: {
      year: 2026,
      status: 'verified',
      checkedAt: '2026-08-13',
      vatStandard: 0.22,
      usnVatExemption: 20_000_000,
      usnVat5Max: 272_500_000,
      usnMaxRevenue: 490_500_000,
      usnMaxEmployees: 130,
      patentMaxRevenue: 20_000_000,
      patentMaxEmployees: 15,
      autoUsnMaxRevenue: 60_000_000,
      autoUsnMaxEmployees: 5,
      autoUsnIncomeRate: 0.08,
      autoUsnDrRate: 0.20,
      autoUsnMinimumRate: 0.03,
      autoUsnAccidentContribution: 2_959,
      ipFixedContribution: 57_390,
      ipAdditionalContributionMax: 321_818,
      profitTax: 0.25,
      sources: [
        { title: 'ФНС: налоги 2026', url: 'https://www.nalog.gov.ru/new2026/' },
        { title: 'ФНС: НДС при УСН', url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/nds_usn/' },
        { title: 'ФНС: калькулятор страховых взносов', url: 'https://www.nalog.gov.ru/rn77/service/ops/?y=2026' },
        { title: 'ФНС: АвтоУСН', url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/autotax_system/' },
        { title: 'ФНС: взносы на травматизм при АвтоУСН за 2026 год', url: 'https://www.nalog.gov.ru/rn38/news/activities_fts/16593406/' },
      ],
    },
    2027: {
      year: 2027,
      status: 'pending',
      note: 'Часть норм уже принята, но полный набор индексируемых параметров еще не подтвержден.',
      known: {
        usnVatExemption: 15_000_000,
        patentMaxRevenue: 15_000_000,
      },
      sources: [
        { title: 'ФНС: НДС при УСН', url: 'https://www.nalog.gov.ru/rn77/taxation/taxes/nds_usn/' },
        { title: 'ФНС: налоги 2026 и будущие пороги ПСН', url: 'https://www.nalog.gov.ru/new2026/' },
      ],
    },
  };

  function getRules(year) {
    const rules = RULES[Number(year)];
    if (!rules || rules.status !== 'verified') {
      throw new Error(`Нет полного подтвержденного набора налоговых правил за ${year} год`);
    }
    return rules;
  }

  root.TaxRules = Object.freeze({
    defaultYear: 2026,
    years: Object.freeze(RULES),
    verifiedYears: Object.freeze(Object.keys(RULES).filter((year) => RULES[year].status === 'verified').map(Number)),
    getRules,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
