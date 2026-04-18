// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface SupabaseUser {
  id: string;
  username: string;
}

export interface SupabaseUserEmail {
  email: string;
  is_verified: boolean;
}

export class SupabaseService {
  public async getUser(_username: string): Promise<SupabaseUser | null> {
    return null;
  }

  public async getUserEmails(_userId: string): Promise<SupabaseUserEmail[]> {
    return [];
  }
}
