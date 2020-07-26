exports.currencyToString = (currencySymbol) => {
  switch (currencySymbol) {
    case '€':
      return 'eur';
    case '$':
      return 'usd';
    case 'CA$':
      return 'cad';
    case 'AU$':
      return 'aud';
    case '£':
      return 'gbp';
    case 'NZ$':
      return 'nzd';
    default:
      return undefined;
  }
};
