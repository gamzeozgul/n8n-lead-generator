export type Lead = {
  id: number | string;
  name: string | null;
  category: string | null;
  address: string | null;
  street: string | null;
  housenumber: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  source: string | null;
};

export type DashboardResponse = {
  success: boolean;
  total?: number;
  items?: Lead[];
  error?: string;
  message?: string | string[];
};

