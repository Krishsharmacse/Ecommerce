export type ShopInput = {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type OpenShopRequestInput = {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type DeleteShopRequestInput = {
  shopId: string;
  reason: string;
};