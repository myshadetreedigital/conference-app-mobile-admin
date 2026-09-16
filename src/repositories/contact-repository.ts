export interface Contact {
  id: string;
  ownerId: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface NewContact {
  ownerId: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface UpdateContactData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

/**
 * Personal address book: an attendee's own record of someone they
 * met at an event. Private to the owner — see
 * docs/PRODUCT-DECISIONS.md's MVP feature scope. Not a shared or
 * public attendee directory, and not admin-visible; there is no
 * admin UI for this in the admin app on purpose.
 */
export interface ContactRepository {
  listByOwnerAndEvent(ownerId: string, eventId: string): Promise<Contact[]>;
  create(data: NewContact): Promise<Contact>;
  update(contactId: string, data: UpdateContactData): Promise<void>;
  delete(contactId: string): Promise<void>;
}
