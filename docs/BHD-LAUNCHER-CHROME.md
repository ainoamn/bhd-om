# محوّل تطبيقات BHD — الشكل والتثبيت (نمط خمسات/حسوب)

> **تاريخ:** 12 نوفمبر 2026  
> **المرجع البصري:** شبكة تطبيقات حسوب على خمسات + صورة حساب جوجل دائرية في الشريط العلوي  
> **المصدر الحي:** https://id.bhd-om.com

## الشكل الموحّد

1. **صورة الحساب:** دائرة 32px، `object-fit: cover`، `referrerPolicy="no-referrer"`، تُجلب من مطالبة الهوية `picture` (غالباً `googleusercontent.com` بحجم `s96`). إن تعذّرت تُعرض الحرف الأول.
2. **زر الشبكة:** 9 نقاط 3×3 بجانب الصورة (ترتيب: الصورة ثم الشبكة — كخمسات).
3. **لوحة التطبيقات:** بطاقة بيضاء، ظل خفيف، شبكة **3 أعمدة**، كل بلاطة أيقونة مربعة مستديرة 48px + اسم عربي مختصر.
4. **المصدر:** `GET https://id.bhd-om.com/api/bhd/catalog` (لا قوائم ثابتة في المنتجات).
5. **الأداء:** سكربت واحد من الهوية، `preconnect` لأصول البرامج، صورة جوجل مضغوطة، كتالوج يُحدَّث عبر حدث `bhd-catalog`.

## التثبيت في هذا المستودع

React/Next: `components/bhd/BhdAppSwitcher.tsx` (صورة→شبكة، `googleAvatarSrc`، استبعاد `account` من البلاطات).

## التثبيت السريع (مواقع ثابتة)

```html
<link rel="stylesheet" href="https://id.bhd-om.com/bhd-launcher.css" />
<div data-bhd-launcher data-locale="ar"></div>
<script src="https://id.bhd-om.com/bhd-identity.js" defer></script>
<script src="https://id.bhd-om.com/bhd-launcher.js" defer></script>
```

## ما تغيّر هنا (12 نوفمبر 2026)

| الموقع | التغيير |
|---|---|
| **bhd-om** | تحديث `BhdAppSwitcher`: ترتيب صورة→شبكة، ضغط صورة جوجل، فلترة بلاطة الحساب |
