export type Vendor = {
  id: string;
  name: string;
  email: string;
  status: 'Pending' | 'Active' | 'Trial' | 'Inactive';
  joinDate: string;
  trialEnds: string | null;
  spotsUsed: number;
  spotLimit: number;
};

export type EndUser = {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Pending' | 'Inactive';
  spotId: string | null;
  vehicle: string;
  plate: string;
  spotSince: string | null;
  nextBill: string | null;
};

export type ParkingSpot = {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Reserved';
  userId: string | null;
};

export type Message = {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
};

export type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  userName?: string;
  vendorName?: string;
};

export type Payout = {
  date: string;
  grossAmount: number;
  stripeFees: number;
  netPayout: number;
  status: 'Completed' | 'In Transit';
};
