
import type { POLine, POLog } from '../types';

const vendors = [
  "Quantum Parts", "Stellar Supplies", "Nexus Components", "Apex Innovations", "Fusion Fabricators",
  "Orion Manufacturing", "Cyber Systems Inc.", "Helios Materials", "Pioneer Tech", "Vanguard Industries"
];

const today = new Date();
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const formatDateTime = (date: Date): string => date.toISOString();

const createDate = (offsetDays: number): string => {
  const date = new Date(today);
  date.setDate(today.getDate() + offsetDays);
  return formatDate(date);
};

const createDateTime = (offsetDays: number, offsetHours: number = 0): string => {
    const date = new Date(today);
    date.setDate(today.getDate() + offsetDays);
    date.setHours(today.getHours() + offsetHours);
    return formatDateTime(date);
};


// --- Original Seed Data ---
const existingPoStatusLatest: POLine[] = [
  // == Quantum Parts (High Volume, Moderate Past Due) ==
  { po_line_id: 'PO1001-1', po_number: 'PO1001', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-20), eta: createDate(-15), scheduled_ship_qty: 100, shipped_qty: 0, open_qty: 100, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-25), ack_status: 'Acknowledged', ack_date: createDateTime(-24) },
  { po_line_id: 'PO1004-1', po_number: 'PO1004', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-45), eta: createDate(-40), scheduled_ship_qty: 500, shipped_qty: 200, open_qty: 300, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACK789', creation_date: createDateTime(-50), ack_status: 'Acknowledged', ack_date: createDateTime(-49) },
  { po_line_id: 'PO1007-1', po_number: 'PO1007', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(-8), eta: createDate(-2), scheduled_ship_qty: 75, shipped_qty: 0, open_qty: 75, unscheduled_qty: 0, transit_time_days: 6, tracking_number: null, creation_date: createDateTime(-10), ack_status: 'Pending', ack_date: null }, // Pending ACK
  { po_line_id: 'PO2003-1', po_number: 'PO2003', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(2), eta: createDate(14), scheduled_ship_qty: 80, shipped_qty: 0, open_qty: 80, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-2), ack_status: 'Acknowledged', ack_date: createDateTime(-1) },
  { po_line_id: 'PO2007-1', po_number: 'PO2007', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(15), eta: createDate(20), scheduled_ship_qty: 220, shipped_qty: 0, open_qty: 220, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(10), ack_status: 'Pending', ack_date: null },
  { po_line_id: 'PO2008-1', po_number: 'PO2008', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(30), eta: createDate(35), scheduled_ship_qty: 400, shipped_qty: 0, open_qty: 400, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(28), ack_status: 'Pending', ack_date: null },
  { po_line_id: 'PO2009-1', po_number: 'PO2009', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(45), eta: createDate(50), scheduled_ship_qty: 150, shipped_qty: 0, open_qty: 150, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(40), ack_status: 'Pending', ack_date: null },
  { po_line_id: 'PO2010-1', po_number: 'PO2010', vendor: 'Quantum Parts', vendor_number: 10521, esd: createDate(60), eta: createDate(65), scheduled_ship_qty: 30, shipped_qty: 0, open_qty: 30, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(55), ack_status: 'Pending', ack_date: null },

  // == Stellar Supplies (High Volume, High Past Due & Worsening + LATE ACKs) ==
  { po_line_id: 'PO1002-1', po_number: 'PO1002', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-10), eta: createDate(-5), scheduled_ship_qty: 250, shipped_qty: 250, open_qty: 0, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACK456', creation_date: createDateTime(-15), ack_status: 'Acknowledged', ack_date: createDateTime(-13) }, // Late ACK
  { po_line_id: 'PO1008-1', po_number: 'PO1008', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-12), eta: createDate(-7), scheduled_ship_qty: 300, shipped_qty: 0, open_qty: 300, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-14), ack_status: 'Pending', ack_date: null }, // Pending > 24h
  { po_line_id: 'PO1009-1', po_number: 'PO1009', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-18), eta: createDate(-13), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-22), ack_status: 'Acknowledged', ack_date: createDateTime(-19) }, // Late ACK
  { po_line_id: 'PO1010-1', po_number: 'PO1010', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(-25), eta: createDate(-20), scheduled_ship_qty: 120, shipped_qty: 0, open_qty: 120, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-28), ack_status: 'Acknowledged', ack_date: createDateTime(-27, 12) }, // Late ACK
  { po_line_id: 'PO2005-1', po_number: 'PO2005', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(3), eta: createDate(8), scheduled_ship_qty: 60, shipped_qty: 60, open_qty: 0, unscheduled_qty: 0, transit_time_days: 5, tracking_number: 'TRACKABC', creation_date: createDateTime(0), ack_status: 'Acknowledged', ack_date: createDateTime(1) },
  { po_line_id: 'PO2011-1', po_number: 'PO2011', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(8), eta: createDate(13), scheduled_ship_qty: 500, shipped_qty: 0, open_qty: 500, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(5), ack_status: 'Pending', ack_date: null },
  { po_line_id: 'PO2012-1', po_number: 'PO2012', vendor: 'Stellar Supplies', vendor_number: 27394, esd: createDate(22), eta: createDate(27), scheduled_ship_qty: 180, shipped_qty: 0, open_qty: 180, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-2), ack_status: 'Pending', ack_date: null }, // Pending > 24h

  // == Nexus Components (Moderate Volume, High Past Due %) ==
  { po_line_id: 'PO1003-1', po_number: 'PO1003', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-30), eta: createDate(-22), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null, creation_date: createDateTime(-35), ack_status: 'Acknowledged', ack_date: createDateTime(-34) },
  { po_line_id: 'PO1011-1', po_number: 'PO1011', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-40), eta: createDate(-32), scheduled_ship_qty: 80, shipped_qty: 0, open_qty: 80, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null, creation_date: createDateTime(-42), ack_status: 'Acknowledged', ack_date: createDateTime(-41) },
  { po_line_id: 'PO1012-1', po_number: 'PO1012', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(-50), eta: createDate(-42), scheduled_ship_qty: 120, shipped_qty: 0, open_qty: 120, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null, creation_date: createDateTime(-55), ack_status: 'Acknowledged', ack_date: createDateTime(-54) },
  { po_line_id: 'PO2013-1', po_number: 'PO2013', vendor: 'Nexus Components', vendor_number: 38821, esd: createDate(5), eta: createDate(13), scheduled_ship_qty: 200, shipped_qty: 0, open_qty: 200, unscheduled_qty: 0, transit_time_days: 8, tracking_number: null, creation_date: createDateTime(2), ack_status: 'Pending', ack_date: null },

  // == Vanguard Industries (Long Past Due) ==
  { po_line_id: 'PO1005-1', po_number: 'PO1005', vendor: 'Vanguard Industries', vendor_number: 95345, esd: createDate(-95), eta: createDate(-90), scheduled_ship_qty: 100, shipped_qty: 0, open_qty: 100, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-100), ack_status: 'Acknowledged', ack_date: createDateTime(-98) }, // Late ACK
  { po_line_id: 'PO1006-1', po_number: 'PO1006', vendor: 'Vanguard Industries', vendor_number: 95345, esd: createDate(-185), eta: createDate(-180), scheduled_ship_qty: 50, shipped_qty: 0, open_qty: 50, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-190), ack_status: 'Acknowledged', ack_date: createDateTime(-188) }, // Late ACK
  
  // == Low Volume Vendors (to be filtered out) ==
  { po_line_id: 'PO2006-1', po_number: 'PO2006', vendor: 'Helios Materials', vendor_number: 84920, esd: createDate(30), eta: createDate(35), scheduled_ship_qty: 200, shipped_qty: 0, open_qty: 200, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(28), ack_status: 'Pending', ack_date: null },
  { po_line_id: 'PO3001-1', po_number: 'PO3001', vendor: 'Pioneer Tech', vendor_number: 91102, esd: createDate(-10), eta: createDate(-5), scheduled_ship_qty: 10, shipped_qty: 0, open_qty: 10, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(-12), ack_status: 'Acknowledged', ack_date: createDateTime(-11) }, // Past Due
  { po_line_id: 'PO3002-1', po_number: 'PO3002', vendor: 'Pioneer Tech', vendor_number: 91102, esd: createDate(10), eta: createDate(15), scheduled_ship_qty: 15, shipped_qty: 0, open_qty: 15, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(8), ack_status: 'Pending', ack_date: null },

  // == Other Vendors (Good standing) ==
  { po_line_id: 'PO2001-1', po_number: 'PO2001', vendor: 'Apex Innovations', vendor_number: 41098, esd: createDate(5), eta: createDate(12), scheduled_ship_qty: 300, shipped_qty: 0, open_qty: 300, unscheduled_qty: 0, transit_time_days: 7, tracking_number: null, creation_date: createDateTime(2), ack_status: 'Acknowledged', ack_date: createDateTime(2, 5) },
  { po_line_id: 'PO2002-1', po_number: 'PO2002', vendor: 'Fusion Fabricators', vendor_number: 56234, esd: createDate(10), eta: createDate(15), scheduled_ship_qty: 150, shipped_qty: 0, open_qty: 150, unscheduled_qty: 0, transit_time_days: 5, tracking_number: null, creation_date: createDateTime(8), ack_status: 'Acknowledged', ack_date: createDateTime(8, 12) },
  { po_line_id: 'PO2004-1', po_number: 'PO2004', vendor: 'Orion Manufacturing', vendor_number: 60331, esd: createDate(20), eta: createDate(30), scheduled_ship_qty: 1000, shipped_qty: 0, open_qty: 1000, unscheduled_qty: 0, transit_time_days: 10, tracking_number: null, creation_date: createDateTime(18), ack_status: 'Acknowledged', ack_date: createDateTime(19) },
];

const existingPoStatusLog: POLog[] = [
  // Quantum Parts Logs
  { log_id: 'L1', po_number: 'PO1001', po_line_id: 'PO1001-1', change_date: createDate(-17), changed_field: 'eta', old_value: createDate(-18), new_value: createDate(-15) },
  { log_id: 'L3', po_number: 'PO1004', po_line_id: 'PO1004-1', change_date: createDate(-42), changed_field: 'shipped_qty', old_value: 0, new_value: 200 },
  { log_id: 'L4', po_number: 'PO1004', po_line_id: 'PO1004-1', change_date: createDate(-42), changed_field: 'open_qty', old_value: 500, new_value: 300 },
  { log_id: 'L8', po_number: 'PO2003', po_line_id: 'PO2003-1', change_date: createDate(-1), changed_field: 'eta', old_value: createDate(7), new_value: createDate(14) }, // Negative change

  // Stellar Supplies Logs (to trigger "worsening")
  { log_id: 'L9', po_number: 'PO1008', po_line_id: 'PO1008-1', change_date: createDate(-2), changed_field: 'eta', old_value: createDate(-9), new_value: createDate(-7) }, // Negative change
  { log_id: 'L10', po_number: 'PO1009', po_line_id: 'PO1009-1', change_date: createDate(-3), changed_field: 'eta', old_value: createDate(-15), new_value: createDate(-13) }, // Negative change
  { log_id: 'L11', po_number: 'PO1010', po_line_id: 'PO1010-1', change_date: createDate(-5), changed_field: 'eta', old_value: createDate(-22), new_value: createDate(-20) }, // Negative change

  // Other Logs
  { log_id: 'L5', po_number: 'PO1003', po_line_id: 'PO1003-1', change_date: createDate(-25), changed_field: 'eta', old_value: createDate(-28), new_value: createDate(-22) },
  { log_id: 'L6', po_number: 'PO1005', po_line_id: 'PO1005-1', change_date: createDate(-92), changed_field: 'eta', old_value: createDate(-98), new_value: createDate(-90) },
  { log_id: 'L7', po_number: 'PO1006', po_line_id: 'PO1006-1', change_date: createDate(-182), changed_field: 'eta', old_value: createDate(-188), new_value: createDate(-180) },
];


// --- Data Generation Logic ---

/** Helper to generate a realistic set of PO lines and logs for a vendor */
const generateVendorLines = (vendorName: string, vendorNumber: number, count: number, poStart: number): { lines: POLine[], logs: POLog[] } => {
  const lines: POLine[] = [];
  const logs: POLog[] = [];
  let poCounter = poStart;
  const logIdStart = Math.floor(Math.random() * 10000);

  for (let i = 0; i < count; i++) {
    const po_number = `PO${poCounter++}`;
    const po_line_id = `${po_number}-1`;

    const creationDateOffset = -(Math.floor(Math.random() * 60));
    const creation_date = createDateTime(creationDateOffset);

    const isPastDue = Math.random() < 0.25; // 25% chance of being past due
    const etaOffsetDays = isPastDue 
      ? -(Math.floor(Math.random() * 45) + 1)
      : (Math.floor(Math.random() * 90) + 1);
    const eta = createDate(etaOffsetDays);
    const esd = createDate(etaOffsetDays - (Math.floor(Math.random() * 10) + 5));
    
    // Simulate ACK status
    const isAcked = Math.random() < 0.8; // 80% are acknowledged
    let ack_status: 'Acknowledged' | 'Pending' = 'Pending';
    let ack_date: string | null = null;
    if (isAcked) {
        ack_status = 'Acknowledged';
        const ackHoursAfterCreation = Math.random() < 0.7 ? (Math.random() * 20 + 2) : (Math.random() * 48 + 25); // 70% chance of timely ACK
        const ackDateObj = new Date(creation_date);
        ackDateObj.setHours(ackDateObj.getHours() + ackHoursAfterCreation);
        ack_date = formatDateTime(ackDateObj);
    } else {
        // For pending, check if it's already late
        const hoursSinceCreation = (new Date().getTime() - new Date(creation_date).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation < 0) { // If creation date is in future, it must be pending
            ack_status = 'Pending';
            ack_date = null;
        }
    }


    const scheduled_ship_qty = Math.floor(Math.random() * 400) + 20;
    const hasShipped = Math.random() < 0.4;
    const shipped_qty = hasShipped ? Math.floor(Math.random() * scheduled_ship_qty) : 0;
    const open_qty = scheduled_ship_qty - shipped_qty;

    lines.push({
      po_line_id, po_number, vendor: vendorName, vendor_number: vendorNumber, esd, eta,
      scheduled_ship_qty, shipped_qty, open_qty, unscheduled_qty: 0,
      transit_time_days: Math.floor(Math.random() * 10) + 5,
      tracking_number: hasShipped && shipped_qty > 0 ? `TRACK${poCounter}` : null,
      creation_date, ack_status, ack_date,
    });

    // Add some change logs, especially negative ones
    if (Math.random() < 0.15) { // 15% chance of having a negative change log
      const changeDateOffset = -(Math.floor(Math.random() * 6) + 1); // within last 7 days
      const oldEtaOffset = etaOffsetDays - (Math.floor(Math.random() * 5) + 2);
      logs.push({
        log_id: `L${logIdStart + i}`,
        po_number,
        po_line_id,
        change_date: createDate(changeDateOffset),
        changed_field: 'eta',
        old_value: createDate(oldEtaOffset),
        new_value: eta,
      });
    }
  }
  return { lines, logs };
};

const vendorData = [
  { name: "Quantum Parts", number: 10521, poStart: 4000 },
  { name: "Stellar Supplies", number: 27394, poStart: 4100 },
  { name: "Nexus Components", number: 38821, poStart: 4200 },
  { name: "Apex Innovations", number: 41098, poStart: 4300 },
  { name: "Fusion Fabricators", number: 56234, poStart: 4400 },
  { name: "Orion Manufacturing", number: 60331, poStart: 4500 },
  { name: "Cyber Systems Inc.", number: 72155, poStart: 4600 },
  { name: "Helios Materials", number: 84920, poStart: 4700 },
  { name: "Pioneer Tech", number: 91102, poStart: 4800 },
  { name: "Vanguard Industries", number: 95345, poStart: 4900 },
];

let generatedLines: POLine[] = [];
let generatedLogs: POLog[] = [];

vendorData.forEach(vendor => {
  const existingLinesCount = existingPoStatusLatest.filter(l => l.vendor === vendor.name).length;
  const linesToAdd = Math.max(0, 30 - existingLinesCount);
  if (linesToAdd > 0) {
    const { lines, logs } = generateVendorLines(vendor.name, vendor.number, linesToAdd, vendor.poStart);
    generatedLines = [...generatedLines, ...lines];
    generatedLogs = [...generatedLogs, ...logs];
  }
});

// For Stellar Supplies, add more negative logs and late ACKs to ensure it remains "worsening"
const { lines: stellarExtraLines } = generateVendorLines("Stellar Supplies", 27394, 5, 4150);
const stellarNegativeLogs: POLog[] = stellarExtraLines.map((line, index) => {
    const etaDate = new Date(line.eta);
    const oldEtaDate = new Date(etaDate);
    oldEtaDate.setDate(etaDate.getDate() - (Math.floor(Math.random() * 5) + 3));
    const changeDate = new Date();
    changeDate.setDate(changeDate.getDate() - (Math.floor(Math.random() * 6) + 1));
    
    // Make sure some of these are also pending > 24h
    line.creation_date = createDateTime(-2);
    line.ack_status = 'Pending';
    line.ack_date = null;

    return {
        log_id: `L-S-NEG-${index}`,
        po_number: line.po_number,
        po_line_id: line.po_line_id,
        change_date: formatDate(changeDate),
        changed_field: 'eta',
        old_value: formatDate(oldEtaDate),
        new_value: line.eta,
    };
});

generatedLines.push(...stellarExtraLines);
generatedLogs.push(...stellarNegativeLogs);


// --- Final Exported Data ---
export const openPoStatusLatest: POLine[] = [...existingPoStatusLatest, ...generatedLines];
export const openPoStatusLog: POLog[] = [...existingPoStatusLog, ...generatedLogs];