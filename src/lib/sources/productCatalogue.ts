/**
 * Product catalogue used to generate realistic simulated listings when a
 * retailer adapter has no live API connected yet (see retailerAdapter.ts).
 * Not tied to any single retailer — every configured source draws from the
 * same catalogue with its own price bias, so simulated cross-retailer price
 * comparison still looks realistic.
 */

export interface CatalogueProductDef {
  title: string;
  brand: string;
  category: string;
  marketAnchor: number; // ZAR, roughly what this item "should" cost
  condition?: 'new' | 'refurbished' | 'used';
}

export const PRODUCT_CATALOGUE: CatalogueProductDef[] = [
  { title: 'Samsung Galaxy S26 Ultra 256GB Titanium Black Dual-Sim', brand: 'Samsung', category: 'Smartphones', marketAnchor: 24999 },
  { title: 'Samsung Galaxy S26 Ultra 512GB Titanium Black Dual-Sim', brand: 'Samsung', category: 'Smartphones', marketAnchor: 28999 },
  { title: 'Apple iPhone 17 256GB Blue Dual-Sim', brand: 'Apple', category: 'Smartphones', marketAnchor: 26999 },
  { title: 'Apple iPhone 17 Pro Max 256GB Natural Titanium Dual-Sim', brand: 'Apple', category: 'Smartphones', marketAnchor: 34999 },
  { title: 'Apple iPhone 16 128GB Black Dual-Sim Refurbished', brand: 'Apple', category: 'Smartphones', marketAnchor: 15999, condition: 'refurbished' },
  { title: 'Apple iPad Air 11-inch 128GB Wi-Fi Starlight', brand: 'Apple', category: 'Tablets', marketAnchor: 15999 },
  { title: 'Apple iPad Air 11-inch 128GB Wi-Fi + Cellular Starlight', brand: 'Apple', category: 'Tablets', marketAnchor: 19999 },
  { title: 'Apple MacBook Air 13-inch M4 256GB Midnight', brand: 'Apple', category: 'Laptops', marketAnchor: 24999 },
  { title: 'Dell XPS 13 Plus 512GB 16GB RAM Platinum', brand: 'Dell', category: 'Laptops', marketAnchor: 32999 },
  { title: 'Lenovo Legion Pro 5 16GB RAM 1TB RTX4070', brand: 'Lenovo', category: 'Laptops', marketAnchor: 39999 },
  { title: 'Sony PlayStation 5 Slim 1TB Disc Edition', brand: 'Sony', category: 'Gaming', marketAnchor: 14999 },
  { title: 'Microsoft Xbox Series X 1TB', brand: 'Microsoft', category: 'Gaming', marketAnchor: 13999 },
  { title: 'Nintendo Switch 2 OLED 256GB', brand: 'Nintendo', category: 'Gaming', marketAnchor: 9999 },
  { title: 'Samsung 65-inch Neo QLED 4K QN90 Smart TV', brand: 'Samsung', category: 'TVs', marketAnchor: 27999 },
  { title: 'LG 55-inch OLED C4 4K Smart TV', brand: 'LG', category: 'TVs', marketAnchor: 21999 },
  { title: 'Sony WH-1000XM6 Wireless Noise Cancelling Headphones Black', brand: 'Sony', category: 'Audio', marketAnchor: 7999 },
  { title: 'Apple AirPods Pro 3 White', brand: 'Apple', category: 'Audio', marketAnchor: 6499 },
  { title: 'Dyson V15 Detect Cordless Vacuum', brand: 'Dyson', category: 'Appliances', marketAnchor: 13999 },
  { title: 'Dyson Airwrap Multi-Styler Complete', brand: 'Dyson', category: 'Appliances', marketAnchor: 9999 },
  { title: 'Apple Watch Series 11 45mm GPS Midnight', brand: 'Apple', category: 'Wearables', marketAnchor: 8999 },
  { title: 'Samsung Galaxy Watch 8 44mm Silver Bluetooth', brand: 'Samsung', category: 'Wearables', marketAnchor: 6499 },
  { title: 'Bosch Series 6 8kg Front Loader Washing Machine', brand: 'Bosch', category: 'Appliances', marketAnchor: 12999 },
];
