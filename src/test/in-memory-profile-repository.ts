import type { Profile, ProfileRepository } from "@/repositories/profile-repository";

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly byId = new Map<string, Profile>();

  seed(profile: Profile) {
    this.byId.set(profile.id, profile);
  }

  async findById(userId: string): Promise<Profile | null> {
    return this.byId.get(userId) ?? null;
  }
}
