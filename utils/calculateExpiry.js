/**
 * Calculate an expiry date given a start date and a duration in months.
 * @param {Date|string|number} startDate
 * @param {Number} durationInMonths
 * @returns {Date}
 */
const calculateExpiry = (startDate, durationInMonths) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + Number(durationInMonths));
  return date;
};

module.exports = calculateExpiry;
