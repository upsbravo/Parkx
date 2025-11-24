import { Vendor, EndUser, ParkingSpot, Message, Invoice } from './definitions';

export const vendors: Vendor[] = [
  { id: '1', name: 'InnovateCorp', status: 'Active', spotsUsed: 45, spotLimit: 50, owner: 'John Doe', email: 'john.doe@innovate.com', registrationDate: '2023-01-15' },
  { id: '2', name: 'DataSys', status: 'Active', spotsUsed: 80, spotLimit: 100, owner: 'Jane Smith', email: 'jane.smith@datasys.co', registrationDate: '2023-02-20' },
  { id: '3', name: 'CloudNet', status: 'Trial', spotsUsed: 10, spotLimit: 20, owner: 'Peter Jones', email: 'peter.jones@cloud.net', registrationDate: '2023-05-10' },
  { id: '4', name: 'SecureSoft', status: 'Pending', spotsUsed: 0, spotLimit: 30, owner: 'Mary Johnson', email: 'mary.j@securesoft.io', registrationDate: '2023-06-01' },
  { id: '5', name: 'Legacy Inc.', status: 'Inactive', spotsUsed: 25, spotLimit: 25, owner: 'David Williams', email: 'd.williams@legacy.com', registrationDate: '2022-11-05' },
];

export const endUsers: EndUser[] = [
  { id: 'u1', name: 'Alice Brown', email: 'alice.b@email.com', status: 'Active', spotId: 'A1', vehicle: 'Toyota Camry', plate: 'XYZ-1234' },
  { id: 'u2', name: 'Bob Green', email: 'bob.g@email.com', status: 'Active', spotId: 'A2', vehicle: 'Honda Civic', plate: 'ABC-5678' },
  { id: 'u3', name: 'Charlie White', email: 'charlie.w@email.com', status: 'Pending', spotId: null, vehicle: 'Ford Focus', plate: 'QWE-9101' },
  { id: 'u4', name: 'Diana Black', email: 'diana.b@email.com', status: 'Inactive', spotId: null, vehicle: 'Tesla Model 3', plate: 'TSL-1121' },
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
  { id: 'inv-001', amount: 50.00, dueDate: '2023-07-01', status: 'Paid', userName: 'Alice Brown' },
  { id: 'inv-002', amount: 50.00, dueDate: '2023-06-01', status: 'Paid', userName: 'Alice Brown' },
  { id: 'inv-003', amount: 75.00, dueDate: '2023-07-01', status: 'Pending', userName: 'Bob Green' },
  { id: 'inv-004', amount: 75.00, dueDate: '2023-06-01', status: 'Paid', userName: 'Bob Green' },
];

export const conversationForAI = `Vendor Admin (John from InnovateCorp): Hi, we're really enjoying the ParkX platform. It's streamlined our operations significantly. We're approaching our 50-spot limit and have a waitlist of new customers. We'd like to request an increase to 75 spots.
Super Admin: Hi John, that's great to hear! I'm happy to help with that. I see your account is in good standing. I've just updated your limit to 75 spots, effective immediately. You should see the change reflected on your dashboard.
Vendor Admin (John from InnovateCorp): Wow, that was fast! Thank you so much. We really appreciate the quick turnaround.
Super Admin: You're welcome! Let us know if there's anything else you need. We're here to support your growth.
Vendor Admin (John from InnovateCorp): Will do. Thanks again!`;
