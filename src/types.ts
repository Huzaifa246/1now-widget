export interface BranchLocation {
  id: number;
  name?: string;
  address?: string;
  location_type?: string; // "pick_up" | "drop_off" | "both"
  active?: boolean;
  removed?: boolean;
}

export interface FleetVehicle {
  id: number;
  name?: string;
  make?: string;
  model?: string;
  year?: number;
  seats?: number;
  color?: string;
  transmission_type?: string;
  fuel_type?: string;
  price?: number;
  avg_car_price_per_day?: number;
  thumbnail_photo_url?: string;
  has_bonzah_insurance?: boolean;
  active?: boolean;
  removed?: boolean;
}

export interface WidgetConfig {
  /** Company id (numeric or UUID) — scopes ALL data and the booking. Required. */
  companyId: string;
  /** 1Now API base. */
  apiUrl: string;
  /**
   * How the booking flow opens when the visitor picks a car / searches:
   *  - "page" (default): navigate to the booking app as a full NEXT PAGE
   *    (best UX; in production this is a real hosted domain, not a popup).
   *  - "modal": open the booking app in a modal iframe overlay on the host page.
   *  - "full": embed the whole booking app inline as a big iframe (for an
   *    operator with no website of their own).
   */
  mode: "page" | "modal" | "full";
  /** Base URL of the hosted booking app (Template-1Now-FE) the iframe points at. */
  bookingUrl: string;
  /** Path appended to bookingUrl (the engine results route). */
  bookingPath: string;
  /**
   * Optional specific vehicle id (data-fleet-id). When set, the widget is a
   * "book this car" entry: Search goes straight to that car's detail page
   * (maps to the booking app's `selectedCarId`) with the chosen dates/location,
   * instead of the results list.
   */
  selectedCarId: string;
  /** Id of the element to render into (else inserted after the script tag). */
  target: string;
  /** Show a live fleet preview under the bar. */
  showFleet: boolean;
  /** Open the engine in a new tab. */
  openInNewTab: boolean;
  /** Optional heading above the bar. */
  title: string;
  /** Base for relative fleet image paths. */
  imageBase: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}
