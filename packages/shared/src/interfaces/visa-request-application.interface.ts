// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface VisaRequestApplicantInfo {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  citizenshipCountry: string;
  passportExpiryDate: Date | null;
  embassyCity: string;
  company: string;
  mailingAddress: string;
}

export interface VisaRequestApplication {
  eventId: string;
  eventName: string;
  termsAccepted: boolean;
  applicantInfo: VisaRequestApplicantInfo;
}

export interface VisaRequestApplicationResponse {
  success: boolean;
  message: string;
}
