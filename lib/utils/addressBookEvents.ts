/** حدث موحّد لإعادة تحميل دفتر العناوين بعد حفظ من «حسابي» أو المستخدمين أو المزامنة */
export const ADDRESS_BOOK_UPDATED_EVENT = 'bhd-address-book-updated';

/** يتغيّر دائماً عند emit — يُسمع عبر `storage` في التبويبات الأخرى (CustomEvent لا يعبر التبويبات) */
export const ADDRESS_BOOK_REVISION_KEY = 'bhd_address_book_revision';

export function emitAddressBookUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADDRESS_BOOK_UPDATED_EVENT));
    try {
      localStorage.setItem(ADDRESS_BOOK_REVISION_KEY, String(Date.now()));
    } catch {
      /* تخزين معطّل أو وضع خاص */
    }
  }
}
