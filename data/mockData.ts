import type { POLine, POLog } from '../types';

const vendors = [
  "Quantum Parts", "Stellar Supplies", "Nexus Components", "Apex Innovations", "Fusion Fabricators",
  "Orion Manufacturing", "Cyber Systems Inc.", "Helios Materials", "Pioneer Tech", "Vanguard Industries"
];

const today = new Date();
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const createDate = (offsetDays: number): string => {
  const date = new Date(today);
  date.setDate(today.getDate() + offsetDays);
  return formatDate(date);
};

export const openPoStatusLatest: POLine[] = [
  // == Quantum Parts (High Volume, Moderate Past Due) ==
  { po_line_id: 'PO1001-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-20), eta: createDate(-15), scheduled_ship_qty: 100, shipped_qty: 0, open_qty: 100, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO1004-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-45), eta: createDate(-40), scheduled_ship_qty: 500, shipped_qty: 200, open_qty: 300, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACK789' },
  { po_line_id: 'PO1007-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-8), eta: createDate(-2), scheduled_ship_qty: 75, shipped_qty: 0, open_qty: 75, unscheduled_qty: 0, transit_time_days: 6, tracking_number: null },
  { po_line_id: 'PO2003-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(2), eta: createDate(14), scheduled_ship_qty: 80, shipped_qty: 0, open_qty: 80, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2007-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(15), eta: createDate(20), scheduled_ship_qty: 220, shipped_qty: 0, open_qty: 220, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2008-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(30), eta: createDate(35), scheduled_ship_qty: 400, shipped_qty: 0, open_qty: 400, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2009-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(45), eta: createDate(50), scheduled_ship_qty: 150, shipped_qty: 0, open_qty: 150, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2010-1', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(60), eta: createDate(65), scheduled_ship_qty: 30, shipped_qty: 0, open_qty: 30, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },

  // == Stellar Supplies (High Volume, High Past Due & Worsening) ==
  { po_line_id: 'PO1002-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-10), eta: createDate(-5), scheduled_ship_qty: 250, shipped_qty: 250, open_qty: 0, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACK456' },
  { po_line_id: 'PO1008-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-12), eta: createDate(-7), scheduled_ship_qty: 300, shipped_qty: 0, open_qty: 300, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO1009-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-18), eta: createDate(-13), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO1010-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-25), eta: createDate(-20), scheduled_ship_qty: 120, shipped_qty: 0, open_qty: 120, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2005-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(3), eta: createDate(8), scheduled_ship_qty: 60, shipped_qty: 60, open_qty: 0, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACKABC' },
  { po_line_id: 'PO2011-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(8), eta: createDate(13), scheduled_ship_qty: 500, shipped_qty: 0, open_qty: 500, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2012-1', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(22), eta: createDate(27), scheduled_ship_qty: 180, shipped_qty: 0, open_qty: 180, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },

  // == Nexus Components (Moderate Volume, High Past Due %) ==
  { po_line_id: 'PO1003-1', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-30), eta: createDate(-22), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null },
  { po_line_id: 'PO1011-1', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-40), eta: createDate(-32), scheduled_ship_qty: 80, shipped_qty: 0, open_qty: 80, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null },
  { po_line_id: 'PO1012-1', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-50), eta: createDate(-42), scheduled_ship_qty: 120, shipped_qty: 0, open_qty: 120, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null },
  { po_line_id: 'PO2013-1', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(5), eta: createDate(13), scheduled_ship_qty: 200, shipped_qty: 0, open_qty: 200, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null },

  // == Vanguard Industries (Long Past Due) ==
  { po_line_id: 'PO1005-1', vendor: 'Vanguard Industries', vendor_number: 95345, esd: createDate(-95), eta: createDate(-90), scheduled_ship_qty: 100, shipped_qty: 0, open_qty: 100, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO1006-1', vendor: 'Vanguard Industries', vendor_number: 95345, esd: createDate(-185), eta: createDate(-180), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  
  // == Low Volume Vendors (to be filtered out) ==
  { po_line_id: 'PO2006-1', vendor: 'Helios Materials', vendor_number: 84920, esd: createDate(30), eta: createDate(35), scheduled_ship_qty: 200, shipped_qty: 0, open_qty: 200, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO3001-1', vendor: 'Pioneer Tech', vendor_number: 91102, esd: createDate(-10), eta: createDate(-5), scheduled_ship_qty: 10, shipped_qty: 0, open_qty: 10, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null }, // Past Due
  { po_line_id: 'PO3002-1', vendor: 'Pioneer Tech', vendor_number: 91102, esd: createDate(10), eta: createDate(15), scheduled_ship_qty: 15, shipped_qty: 0, open_qty: 15, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },

  // == Other Vendors (Good standing) ==
  { po_line_id: 'PO2001-1', vendor: 'Apex Innovations', vendor_number: 41098, esd: createDate(5), eta: createDate(12), scheduled_ship_qty: 300, shipped_qty: 0, open_qty: 300, unscheduled_qty: 0, transit_time_days: 7, tracking_number: null },
  { po_line_id: 'PO2002-1', vendor: 'Fusion Fabricators', vendor_number: 56234, esd: createDate(10), eta: createDate(15), scheduled_ship_qty: 150, shipped_qty: 0, open_qty: 150, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null },
  { po_line_id: 'PO2004-1', vendor: 'Orion Manufacturing', vendor_number: 60331, esd: createDate(20), eta: createDate(30), scheduled_ship_qty: 1000, shipped_qty: 0, open_qty: 1000, unscheduled_qty: 0, transit_time_days: 10, tracking_number: null },
];

export const openPoStatusLog: POLog[] = [
  // Quantum Parts Logs
  { log_id: 'L1', po_line_id: 'PO1001-1', change_date: createDate(-17), changed_field: 'eta', old_value: createDate(-18), new_value: createDate(-15) },
  { log_id: 'L3', po_line_id: 'PO1004-1', change_date: createDate(-42), changed_field: 'shipped_qty', old_value: 0, new_value: 200 },
  { log_id: 'L4', po_line_id: 'PO1004-1', change_date: createDate(-42), changed_field: 'open_qty', old_value: 500, new_value: 300 },
  { log_id: 'L8', po_line_id: 'PO2003-1', change_date: createDate(-1), changed_field: 'eta', old_value: createDate(7), new_value: createDate(14) }, // Negative change

  // Stellar Supplies Logs (to trigger "worsening")
  { log_id: 'L9', po_line_id: 'PO1008-1', change_date: createDate(-2), changed_field: 'eta', old_value: createDate(-9), new_value: createDate(-7) }, // Negative change
  { log_id: 'L10', po_line_id: 'PO1009-1', change_date: createDate(-3), changed_field: 'eta', old_value: createDate(-15), new_value: createDate(-13) }, // Negative change
  { log_id: 'L11', po_line_id: 'PO1010-1', change_date: createDate(-5), changed_field: 'eta', old_value: createDate(-22), new_value: createDate(-20) }, // Negative change

  // Other Logs
  { log_id: 'L5', po_line_id: 'PO1003-1', change_date: createDate(-25), changed_field: 'eta', old_value: createDate(-28), new_value: createDate(-22) },
  { log_id: 'L6', po_line_id: 'PO1005-1', change_date: createDate(-92), changed_field: 'eta', old_value: createDate(-98), new_value: createDate(-90) },
  { log_id: 'L7', po_line_id: 'PO1006-1', change_date: createDate(-182), changed_field: 'eta', old_value: createDate(-188), new_value: createDate(-180) },
];