// Converts numbers to Indian English words (e.g. 1500 -> "One Thousand Five Hundred Rupees Only")
export function numberToWordsINR(amount) {
  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertHundreds(n) {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundred = rem;

  if (crore > 0) {
    words += convertHundreds(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertHundreds(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertHundreds(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    words += convertHundreds(hundred) + " ";
  }

  const paisa = Math.round(((Number(amount) || 0) - num) * 100);
  let paisaStr = "";
  if (paisa > 0) {
    paisaStr = ` and ${convertHundreds(paisa)} Paise`;
  }

  return `${words.trim()} Rupees${paisaStr} Only`;
}
