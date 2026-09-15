export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
}

/** Read-only — profiles are written by the handle_new_user() trigger
 *  at registration, never edited through this app yet (see
 *  docs/backlog.md). */
export interface ProfileRepository {
  findById(userId: string): Promise<Profile | null>;
}
