// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface TravelFundAboutMe {
  firstName: string;
  lastName: string;
  email: string;
  citizenshipCountry: string;
  profileLink: string;
  company: string;
  canReceiveFunds: string;
  travelFromCountry: string;
  openSourceInvolvement: string;
  isLgbtqia: boolean;
  isWoman: boolean;
  isPersonWithDisability: boolean;
  isDiversityOther: boolean;
  preferNotToAnswer: boolean;
  attendingForCompany: string;
  willingToBlog: string;
}

export interface TravelFundExpenses {
  airfareCost: number;
  airfareNotes: string;
  hotelCost: number;
  hotelNotes: string;
  groundTransportCost: number;
  groundTransportNotes: string;
  estimatedTotal: number;
}

export interface TravelFundApplication {
  eventId: string;
  eventName: string;
  termsAccepted: boolean;
  aboutMe: TravelFundAboutMe;
  expenses: TravelFundExpenses;
}

export interface TravelFundApplicationResponse {
  success: boolean;
  message: string;
}
