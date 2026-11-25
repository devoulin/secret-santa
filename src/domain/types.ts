/** Pula, do której należy osoba. Dorośli losują dorosłych, dzieci losują dzieci. */
export type PersonKind = 'adult' | 'child';

export interface Person {
  id: string;
  name: string;
  /** Może być pusty — wtedy wynik przekazujemy linkiem albo (dla dziecka) mailem do rodzica. */
  email: string;
  kind: PersonKind;
}

/**
 * Rodzina = gospodarstwo domowe. Osoby z tej samej rodziny nigdy nie losują siebie nawzajem
 * (dorośli = małżonkowie, dzieci = rodzeństwo).
 */
export interface Family {
  id: string;
  name: string;
  members: Person[];
}

/** giver kupuje prezent dla receiver. */
export interface Assignment {
  giverId: string;
  receiverId: string;
}

export interface StoredDraw {
  assignments: Assignment[];
  warnings: string[];
  createdAt: string;
  /** Odcisk struktury rodzin w chwili losowania — pozwala wykryć, że losowanie jest nieaktualne. */
  signature: string;
}

export interface MessageTemplate {
  subject: string;
  body: string;
  budget: string;
  eventDate: string;
}
