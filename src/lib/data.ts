import { Vendor, EndUser, ParkingSpot, Message, Invoice, Payout } from './definitions';

export const vendors: Vendor[] = [
  { id: '1', name: 'InnovateCorp', email: 'contact@innovate.com', status: 'Active', joinDate: '2023-01-15', trialEnds: null, spotsUsed: 45, spotLimit: 50 },
  { id: '2', name: 'DataSys', email: 'admin@datasys.co', status: 'Active', joinDate: '2023-02-20', trialEnds: null, spotsUsed: 80, spotLimit: 100 },
  { id: '3', name: 'CloudNet', email: 'support@cloud.net', status: 'Trial', joinDate: '2023-05-10', trialEnds: '2023-06-10', spotsUsed: 10, spotLimit: 20 },
  { id: '4', name: 'SecureSoft', email: 'onboarding@securesoft.io', status: 'Pending', joinDate: '2023-06-01', trialEnds: null, spotsUsed: 0, spotLimit: 30 },
  { id: '5', name: 'Legacy Inc.', email: 'accounts@legacy.com', status: 'Inactive', joinDate: '2022-11-05', trialEnds: null, spotsUsed: 25, spotLimit: 25 },
];

export const endUsers: EndUser[] = [
  { id: 'u1', name: 'Alice Brown', email: 'alice.b@email.com', status: 'Active', spotId: 'A1', vehicle: 'Toyota Camry', plate: 'XYZ-1234', spotSince: '2023-01-20', nextBill: '2023-07-20' },
  { id: 'u2', name: 'Bob Green', email: 'bob.g@email.com', status: 'Active', spotId: 'A2', vehicle: 'Honda Civic', plate: 'ABC-5678', spotSince: '2023-02-15', nextBill: '2023-07-15' },
  { id: 'u3', name: 'Charlie White', email: 'charlie.w@email.com', status: 'Pending', spotId: null, vehicle: 'Ford Focus', plate: 'QWE-9101', spotSince: null, nextBill: null },
  { id: 'u4', name: 'Diana Black', email: 'diana.b@email.com', status: 'Inactive', spotId: null, vehicle: 'Tesla Model 3', plate: 'TSL-1121', spotSince: '2022-10-10', nextBill: null },
  { id: 'u5', name: 'Evan Gray', email: 'evan.g@email.com', status: 'Active', spotId: 'B5', vehicle: 'Nissan Leaf', plate: 'EV-2024', spotSince: '2023-05-01', nextBill: '2023-08-01' },
];

export const parkingSpots: ParkingSpot[] = [
  { id: 'A1', name: 'Spot A1', status: 'Occupied', userId: 'u1' },
  { id: 'A2', name: 'Spot A2', status: 'Occupied', userId: 'u2' },
  { id: 'A3', name: 'Spot A3', status: 'Available', userId: null },
  { id: 'A4', name: 'Spot A4', status: 'Available', userId: null },
  { id: 'B1', name: 'Spot B1', status: 'Reserved', userId: 'u3' },
];

export const adminVendorMessages: Message[] = [
    { id: 'msg1', sender: 'InnovateCorp (Vendor)', recipient: 'Super Admin', subject: 'Request for more spots', body: 'We are nearing our spot limit. Can we increase our capacity to 75 spots?', timestamp: '2023-06-10T10:00:00Z', read: false },
    { id: 'msg2', sender: 'Super Admin', recipient: 'InnovateCorp (Vendor)', subject: 'Re: Request for more spots', body: 'Your request has been approved. Your spot limit is now 75. Please check your dashboard.', timestamp: '2023-06-10T11:30:00Z', read: true },
    { id: 'msg3', sender: 'CloudNet (Vendor)', recipient: 'Super Admin', subject: 'Billing question', body: 'I have a question about my last invoice. Can you please clarify the "Platform Fee" line item?', timestamp: '2023-06-09T14:20:00Z', read: true },
];

export const vendorUserMessages: Message[] = [
    { id: 'msg-vu1', sender: 'Alice Brown (End User)', recipient: 'Vendor Admin', subject: 'Parking Spot Issue', body: 'There is a vehicle in my assigned spot (A1). What should I do?', timestamp: '2023-06-11T08:00:00Z', read: false },
    { id: 'msg-vu2', sender: 'Vendor Admin', recipient: 'Alice Brown (End User)', subject: 'Re: Parking Spot Issue', body: 'Apologies for the inconvenience. Please park in spot B5 for today. We will resolve the issue.', timestamp: '2023-06-11T08:15:00Z', read: true },
];

export const userInvoices: Invoice[] = [
  { id: 'inv-u001', amount: 50.00, dueDate: '2023-07-01', status: 'Paid', userName: 'Alice Brown' },
  { id: 'inv-u002', amount: 50.00, dueDate: '2023-06-01', status: 'Paid', userName: 'Alice Brown' },
  { id: 'inv-u003', amount: 75.00, dueDate: '2023-07-01', status: 'Pending', userName: 'Bob Green' },
  { id: 'inv-u004', amount: 75.00, dueDate: '2023-06-01', status: 'Paid', userName: 'Bob Green' },
];

export const vendorInvoices: Invoice[] = [
  { id: 'inv-v001', amount: 500.00, dueDate: '2023-07-01', status: 'Paid', vendorName: 'InnovateCorp' },
  { id: 'inv-v002', amount: 800.00, dueDate: '2023-07-01', status: 'Pending', vendorName: 'DataSys' },
  { id: 'inv-v003', amount: 200.00, dueDate: '2023-06-15', status: 'Overdue', vendorName: 'CloudNet' },
  { id: 'inv-v004', amount: 500.00, dueDate: '2023-06-01', status: 'Paid', vendorName: 'InnovateCorp' },
  { id: 'inv-v005', amount: 800.00, dueDate: '2023-06-01', status: 'Paid', vendorName: 'DataSys' },
];

export const payouts: Payout[] = [
    { date: '2025-10-25', grossAmount: 2450.00, stripeFees: 71.35, netPayout: 2378.65, status: 'Completed' },
    { date: '2025-09-25', grossAmount: 2200.00, stripeFees: 64.10, netPayout: 2135.90, status: 'Completed' },
    { date: '2025-08-25', grossAmount: 2300.00, stripeFees: 67.00, netPayout: 2233.00, status: 'Completed' },
    { date: '2025-07-25', grossAmount: 1500.00, stripeFees: 43.80, netPayout: 1456.20, status: 'In Transit' },
];

export const conversationForAI = `Vendor Admin (John from InnovateCorp): Hi, we're really enjoying the ParkX platform. It's streamlined our operations significantly. We're approaching our 50-spot limit and have a waitlist of new customers. We'd like to request an increase to 75 spots.
Super Admin: Hi John, that's great to hear! I'm happy to help with that. I see your account is in good standing. I've just updated your limit to 75 spots, effective immediately. You should see the change reflected on your dashboard.
Vendor Admin (John from InnovateCorp): Wow, that was fast! Thank you so much. We really appreciate the quick turnaround.
Super Admin: You're welcome! Let us know if there's anything else you need. We're here to support your growth.
Vendor Admin (John from InnovateCorp): Will do. Thanks again!`;
