// Constantes para integração WooCommerce
export interface PlanMapping {
  product_id: number;
  plan_name: string;
  sites_limit: number;
  monthly_articles: number;
  monthly_ideas: number;
  price: number;
}

export const PLAN_MAPPINGS: PlanMapping[] = [
  {
    product_id: 1873,
    plan_name: '1 Site',
    sites_limit: 1,
    monthly_articles: 100,
    monthly_ideas: 50,
    price: 97
  },
  {
    product_id: 3379,
    plan_name: '5 Sites',
    sites_limit: 5,
    monthly_articles: 500,
    monthly_ideas: 250,
    price: 197
  },
  {
    product_id: 1971,
    plan_name: '20 Sites',
    sites_limit: 20,
    monthly_articles: 2000,
    monthly_ideas: 1000,
    price: 497
  },
  {
    product_id: 1972,
    plan_name: 'Sites Ilimitados',
    sites_limit: -1,
    monthly_articles: -1,
    monthly_ideas: -1,
    price: 997
  }
];

export interface WooCommerceOrder {
  id: number;
  customer_email: string;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  total: string;
  line_items: {
    id: number;
    product_id: number;
    name: string;
    quantity: number;
    total: string;
  }[];
  date_created: string;
  date_paid?: string;
}