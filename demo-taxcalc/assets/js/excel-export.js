(function (root) {
  'use strict';

  function numberCell(value, formula, format) {
    const cell = { t: 'n', v: Number(value) || 0 };
    if (formula) cell.f = formula;
    if (format) cell.z = format;
    return cell;
  }

  function inputValueCell(value, format) {
    if (typeof value !== 'number') return value;
    return numberCell(value, null, format || '#,##0.00');
  }

  function buildWorkbook(XLSX, options) {
    if (!XLSX?.utils) throw new Error('XLSX module is required');
    const result = options.result;
    const companyName = options.companyName || 'Не указано';
    const comparisonRows = [[
      'Налоговый режим', 'Статус', 'Чистая прибыль, руб.', 'Налоги, руб.', 'Нагрузка',
      'Выручка без НДС, руб.', 'Принимаемые расходы, руб.', 'Налоговая база, руб.',
      'Основной налог, руб.', 'НДС к уплате, руб.', 'НДФЛ с ФОТ, руб.',
      'Страховые взносы, руб.', 'Взносы ИП, руб.', 'Дивиденды, руб.',
      'НДФЛ с дивидендов, руб.', 'Прибыль до основного налога, руб.',
      'Корректировка чистой прибыли, руб.', 'Имущественные налоги, руб.',
      'Фиксированный взнос ИП, руб.', 'Дополнительный взнос ИП, руб.', 'Выручка всего, руб.',
    ]];

    result.regimes.forEach((item, index) => {
      const row = index + 2;
      const adjustment = item.sourceAnomalyDoubleDepreciation
        ? (item.managementProfit || 0) - (item.mainTax || 0) - (item.netProfit || 0)
        : 0;
      comparisonRows.push([
        item.name,
        item.status.label,
        numberCell(item.netProfit, `P${row}-I${row}-Q${row}`, '#,##0.00'),
        numberCell(item.totalTaxes, `SUM(I${row}:L${row},O${row},R${row}:T${row})`, '#,##0.00'),
        numberCell(item.taxBurden, `IFERROR(D${row}/U${row},0)`, '0.0%'),
        numberCell(item.revenueNet, null, '#,##0.00'),
        numberCell(item.taxExpenses, null, '#,##0.00'),
        numberCell(item.taxBase, null, '#,##0.00'),
        numberCell(item.mainTax, null, '#,##0.00'),
        numberCell(item.vatPayable, null, '#,##0.00'),
        numberCell(item.payrollNdfl, null, '#,##0.00'),
        numberCell(item.payrollContributions, null, '#,##0.00'),
        numberCell((item.fixedContribution || 0) + (item.additionalContribution || 0), `S${row}+T${row}`, '#,##0.00'),
        numberCell(item.dividends, null, '#,##0.00'),
        numberCell(item.dividendTax, null, '#,##0.00'),
        numberCell(item.managementProfit, null, '#,##0.00'),
        numberCell(adjustment, null, '#,##0.00'),
        numberCell(item.propertyTaxes, null, '#,##0.00'),
        numberCell(item.fixedContribution, null, '#,##0.00'),
        numberCell(item.additionalContribution, null, '#,##0.00'),
        numberCell(item.revenue, null, '#,##0.00'),
      ]);
    });

    const workbook = XLSX.utils.book_new();
    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonRows);
    comparisonSheet['!cols'] = [{ wch: 36 }, { wch: 25 }, ...Array(19).fill({ wch: 19 })];
    comparisonSheet['!autofilter'] = { ref: `A1:U${comparisonRows.length}` };

    const inputRows = [
      ['Название компании', companyName],
      ['Модель', options.modelName],
      ['Год законодательства', options.year],
      [],
      ['Показатель', 'Значение'],
      ...(options.inputRows || []).map(([label, value, format]) => [label, inputValueCell(value, format)]),
    ];
    const inputSheet = XLSX.utils.aoa_to_sheet(inputRows);
    inputSheet['!cols'] = [{ wch: 54 }, { wch: 28 }];

    const best = result.best;
    const bestIndex = best ? result.regimes.findIndex((item) => item.id === best.id) : -1;
    const bestRow = bestIndex + 2;
    const summaryRows = [
      ['Налоговый расчет'],
      ['Название компании', companyName],
      ['Модель', options.modelName],
      ['Год законодательства', options.year],
      [],
      ['Лучший допустимый режим', best ? { t: 's', v: best.name, f: `'Сравнение режимов'!A${bestRow}` } : 'Нет допустимого режима'],
      ['Чистая прибыль, руб.', best ? numberCell(best.netProfit, `'Сравнение режимов'!C${bestRow}`, '#,##0.00') : numberCell(0, null, '#,##0.00')],
      ['Налоги, руб.', best ? numberCell(best.totalTaxes, `'Сравнение режимов'!D${bestRow}`, '#,##0.00') : numberCell(0, null, '#,##0.00')],
      ['Налоговая нагрузка', best ? numberCell(best.taxBurden, `'Сравнение режимов'!E${bestRow}`, '0.0%') : numberCell(0, null, '0.0%')],
      ['Статус', best ? { t: 's', v: best.status.label, f: `'Сравнение режимов'!B${bestRow}` } : 'Нет допустимого режима'],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 34 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Итог');
    XLSX.utils.book_append_sheet(workbook, inputSheet, 'Исходные данные');
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Сравнение режимов');
    return workbook;
  }

  const api = { buildWorkbook };
  root.TaxExcelExport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
