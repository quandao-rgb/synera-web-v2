export function unitName(unit: string) {
  return (
    (
      { THUNG: 'Thùng', CHAI: 'Chai', LOC: 'Lốc', HOP: 'Hộp', GOI: 'Gói' } as Record<string, string>
    )[unit] || unit
  );
}
/** Catalog illustrations stored locally; provenance: public/assets/npp-products/sources.json. */
export function productImage(name: string) {
  const key = name.trim().normalize('NFC').toLocaleLowerCase('vi');
  const images: Record<string, string> = {
    'sữa tươi nguyên chất': 'milk.png',
    'bánh quy yến mạch': 'cookies.png',
    'trà xanh thanh mát': 'tea.jpg',
    'nước ép cam tươi': 'orange.jpg',
    'nước khoáng thiên nhiên': 'water.png',
    'sữa đậu nành ít đường': 'soy.jpg',
    'bánh gạo giòn': 'rice.jpg',
    'nước ép táo nguyên chất': 'apple.jpg',
    'trà chanh thanh mát': 'lemon-tea.jpg',
    'nước khoáng thiên nhiên 350ml': 'water-350.jpg',
    'nước khoáng có ga 500ml': 'sparkling-water.jpg',
  };
  const file = key.includes('hạnh nhân') ? 'almond.jpg' : images[key];
  return file ? `/assets/npp-products/${file}` : '';
}
