import type { Assignment, Family, MessageTemplate, PersonKind } from './types';
import { displayFamilyName, displayName, findPerson, resolveDelivery, type Delivery } from './families';
import { buildMessage } from './message';
import { encodeReveal } from './reveal';

/** Gotowa do wysłania wiadomość dla jednego uczestnika. */
export interface OutboxItem {
  giverId: string;
  giverName: string;
  receiverName: string;
  kind: PersonKind;
  familyId: string;
  familyName: string;
  delivery: Delivery;
  subject: string;
  body: string;
  /** Kod do tajnego linku (#/odkryj/<kod>). */
  revealCode: string;
}

/** Dopisek do tematu, który pozwala rozróżnić kilka maili trafiających na ten sam adres. */
export function subjectFor(subject: string, giverName: string, sharedAddress: boolean): string {
  return sharedAddress ? `${subject} (dla: ${giverName})` : subject;
}

const addressKey = (email: string) => email.trim().toLocaleLowerCase();

/**
 * Buduje wiadomości dla wszystkich uczestników losowania.
 *
 * Gdy na jeden adres trafia kilka wiadomości (dziecko przez rodzica, para ze wspólnym mailem),
 * temat dostaje dopisek „(dla: imię)" — inaczej skrzynka pocztowa sklei je w jeden wątek
 * i nie będzie wiadomo, która jest czyja.
 */
export function buildOutbox(
  families: readonly Family[],
  assignments: readonly Assignment[],
  template: MessageTemplate,
): OutboxItem[] {
  const items: OutboxItem[] = [];
  for (const a of assignments) {
    const giver = findPerson(families, a.giverId);
    const receiver = findPerson(families, a.receiverId);
    if (!giver || !receiver) continue;
    const giverName = displayName(giver.person);
    const receiverName = displayName(receiver.person);
    const message = buildMessage(template, giverName, receiverName);
    items.push({
      giverId: a.giverId,
      giverName,
      receiverName,
      kind: giver.person.kind,
      familyId: giver.family.id,
      familyName: displayFamilyName(giver.family),
      delivery: resolveDelivery(giver),
      subject: message.subject,
      body: message.body,
      revealCode: encodeReveal({
        giver: giverName,
        receiver: receiverName,
        budget: template.budget,
        date: template.eventDate,
      }),
    });
  }

  const perAddress = new Map<string, number>();
  for (const item of items) {
    if (!item.delivery.email) continue;
    const key = addressKey(item.delivery.email);
    perAddress.set(key, (perAddress.get(key) ?? 0) + 1);
  }

  return items.map((item) => {
    const shared =
      item.delivery.viaParent !== null ||
      (item.delivery.email !== null && (perAddress.get(addressKey(item.delivery.email)) ?? 0) > 1);
    return { ...item, subject: subjectFor(item.subject, item.giverName, shared) };
  });
}
