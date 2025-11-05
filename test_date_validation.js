const isValidDate = (dateString) => {
  if (!dateString || dateString.length !== 10) return false;

  const [day, month, year] = dateString.split('/');
  if (!day || !month || !year) return false;

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) return false;
  if (yearNum < 1900 || yearNum > new Date().getFullYear() - 13) return false;

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (monthNum === 2) {
    const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
    daysInMonth[1] = isLeapYear ? 29 : 28;
  }

  if (dayNum > daysInMonth[monthNum - 1]) return false;

  const date = new Date(yearNum, monthNum - 1, dayNum);
  return date.getDate() === dayNum && date.getMonth() === monthNum - 1 && date.getFullYear() === yearNum;
};

// Testes
console.log('30/02/1990 (inválida):', isValidDate('30/02/1990'));
console.log('31/04/1990 (inválida):', isValidDate('31/04/1990'));
console.log('15/08/1990 (válida):', isValidDate('15/08/1990'));
console.log('29/02/2020 (ano bissexto, válida):', isValidDate('29/02/2020'));
console.log('29/02/2021 (não bissexto, inválida):', isValidDate('29/02/2021'));
