export const DEFAULT_LANGUAGE = 'en';
export const VI_LANGUAGE = 'vi';

export const LIST_COLLECTIONS: Collection[] = [
  { id: 'all', title: 'ALL', url: 'all', child: [] },
  // { id: "xuan-len-di", title: "XUAN_LEN_DI", url: "xuan-len-di", child: [] },
  {
    id: ['coffee', 'cold-brew', 'coffee-highlight', 'coffee-vietnam'],
    title: 'COFFEE',
    url: 'coffee',
    child: [
      {
        id: 'coffee-highlight',
        title: 'COFFEE_HIGHLIGHT',
        url: 'coffee-highlight',
      },
      { id: 'coffee-vietnam', title: 'COFFEE_VIETNAM', url: 'coffee-vietnam' },
      { id: 'coffee-may', title: 'COFFEE_MAY', url: 'coffee-may' },
      { id: 'coffee-cold-brew', title: 'COLD_BREW', url: 'cold-brew' },
    ],
  },
  {
    id: ['tra-trai-cay-sua', 'tra-trai-cay'],
    title: 'TEA',
    url: 'tra-trai-cay-sua',
    child: [{ id: 'tra-trai-cay', title: 'TRA_TRAI_CAY', url: 'tra-trai-cay' }],
  },
  {
    id: ['cloud', 'cloud-fee', 'cloudtea-mochi'],
    title: 'CLOUD',
    url: 'cloud',
    child: [
      { id: 'cloudfee', title: 'CLOUD_FEE', url: 'cloud-fee' },
      { id: 'cloudtea-mochi', title: 'CLOUDTEA_MOCHI', url: 'cloudtea-mochi' },
    ],
  },
  { id: ['hi-tea'], title: 'HI_TEA_HEALTHY', url: 'hi-tea', child: [] },
  {
    id: ['tra-xanh-tay-bac', 'cloud-fee', 'thuc-uong-khac'],
    title: 'GREEN_TEA',
    url: 'tra-xanh-tay-bac',
    child: [
      {
        id: 'tra-xanh-tay-bac',
        title: 'TRA_XANH_TAY_BAC',
        url: 'tra-xanh-tay-bac',
      },
      { id: 'chocolate', title: 'CHOCOLATE', url: 'thuc-uong-khac' },
    ],
  },
  { id: 'frosty', title: 'FROSTY_TEA', url: 'frosty', child: [] },
  { id: 'snack', title: 'SNACK', url: 'snack', child: [] },
];

export const LIST_NAVBAR: MenuItem[] = [
  { id: 'home', title: 'HOME', url: '', child: [] },
  { id: 'about', title: 'ABOUT', url: 'about', child: [] },
  { id: 'services', title: 'SERVICES', url: 'services', child: [] },
  {
    id: 'events',
    title: 'EVENTS',
    url: 'events',
    child: [{ id: 'home', title: 'HOME', url: '' }],
  },
  {
    id: 'collections',
    title: 'MENU',
    url: 'collections/all',
    child: [...LIST_COLLECTIONS],
  },
  { id: 'contact', title: 'CONTACT', url: 'pages/contact', child: [] },
];

export interface MenuItem<T = string> {
  id: T;
  title: string;
  url: string;
  show?: boolean;
  child?: Collection[];
}
// type Collection = Omit<MenuItem<string | string[]>, "child">;
interface Collection<T = string | string[]> extends MenuItem<T> {}

export const COLLECTIONS: { category: string; title: string; items: any[] }[] = [
  {
    category: 'coffee-highlight',
    title: 'COFFEE_HIGHLIGHT',
    items: [
      {
        image:
          'https://product.hstatic.net/1000075078/product/1697442235_cloudfee-hanh-nhan-nuong_8282f6c2cf4d49bba2dfbe70cb7dbede_large.jpg',
        url: 'products/coffee-highlight',
        title: 'Cloud Fee Hạnh Nhân nướng',
        price: '49000',
      },
      {
        image:
          'https://product.hstatic.net/1000075078/product/1697442235_cloudfee-hanh-nhan-nuong_8282f6c2cf4d49bba2dfbe70cb7dbede_large.jpg',
        url: 'products/coffee-highlight',
        title: 'Cloud Fee Hạnh Nhân nướng',
        price: '49000',
      },
    ],
  },
  {
    category: 'coffee-vietnam',
    title: 'COFFEE_VIETNAM',
    items: [
      {
        image:
          'https://product.hstatic.net/1000075078/product/1686716532_dd-suada_c180c6187e644babbac7019a2070231e_large.jpg',
        url: 'products/duong-den-sua-da',
        title: 'Đường đen sữa đá',
        price: '49000',
      },
      {
        image:
          'https://product.hstatic.net/1000075078/product/1686716532_dd-suada_c180c6187e644babbac7019a2070231e_large.jpg',
        url: 'products/duong-den-sua-da',
        title: 'Đường đen sữa đá',
        price: '49000',
      },
    ],
  },
  {
    category: 'coffee-may',
    title: 'COFFEE_MAY',
    items: [
      {
        image:
          'https://product.hstatic.net/1000075078/product/1686716532_dd-suada_c180c6187e644babbac7019a2070231e_large.jpg',
        url: 'products/duong-den-sua-da',
        title: 'Đường đen sữa đá',
        price: '49000',
      },
      {
        image:
          'https://product.hstatic.net/1000075078/product/1686716532_dd-suada_c180c6187e644babbac7019a2070231e_large.jpg',
        url: 'products/duong-den-sua-da',
        title: 'Đường đen sữa đá',
        price: '49000',
      },
    ],
  },
  {
    category: 'cold-brew',
    title: 'COLDBREW',
    items: [
      {
        image:
          'https://product.hstatic.net/1000075078/product/1675329120_coldbrew-pbt_127e09b0000c4027992bc3168899a656_large.jpg',
        url: 'product/cold-brew',
        title: 'Cold Brew Phúc Bồn Tử',
      },
    ],
  },
  {
    category: 'tra-xanh-tay-bac',
    title: 'TRA_XANH_TAY_BAC',
    items: [
      {
        image:
          'https://product.hstatic.net/1000075078/product/1697450388_tx-latte_ef8fdb94fb2a4691b0cc909188b77829_large.jpg',
        url: 'product/tra-xanh-tay-bac',
        title: 'Trà Xanh Tây Bắc',
      },
    ],
  },
];

export const DEFAULT_CURRENCY: string = 'USD';
export const VI_CURRENCY: string = 'VND';
export const EXCHANGE_RATE_VN_USD: number = 25000;
export const LOCALE_STRING_VN: string = 'vi-VN';
export const LOCALE_STRING_US: string = 'en-US';
