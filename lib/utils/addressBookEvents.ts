/** حدث موحّد لإعادة تحميل دفتر العناوين بعد حفظ من «حسابي» أو المستخدمين أو المزامنة */
export const ADDRESS_BOOK_UPDATED_EVENT = 'bhd-address-book-updated';

export function emitAddressBookUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADDRESS_BOOK_UPDATED_EVENT));
  }
}
